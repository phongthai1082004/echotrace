
interface Env extends _Env_WithSecrets {}

interface _Env_WithSecrets {
  R2: R2Bucket;
  IMAGES: ImagesBinding;
  UPLOAD_SECRET: string;
  ADMIN_TOKEN: string;
}

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; 

const JSON_HEADERS = { "content-type": "application/json" };

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function corsHeaders(): Record<string, string> {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,DELETE,OPTIONS",
    "access-control-allow-headers": "Content-Type, X-Echotrace-Token, X-Echotrace-Folder, X-Echotrace-Expiry, Authorization",
  };
}

async function hmacHex(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function bearerToken(request: Request): string | null {
  const h = request.headers.get("Authorization") ?? "";
  return h.startsWith("Bearer ") ? h.slice(7) : null;
}

function detectUploadMime(b: Uint8Array): string | null {
  const ascii = (start: number, len: number) => String.fromCharCode(...b.slice(start, start + len));
  // ponytail: PDF đầu bằng "%PDF-". Cho phép upload file PDF (in ấn) qua worker.
  if (b.length >= 5 && ascii(0, 5) === "%PDF-") return "application/pdf";
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 4 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b.length >= 3 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return "image/gif";
  if (b.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP") return "image/webp";
  if (b.length >= 12 && ascii(4, 4) === "ftyp") {
    const brand = ascii(8, 4);
    if (/^(heic|heix|hevc|mif1|msf1)/.test(brand)) return "image/heic";
  }
  return null;
}

async function handleUpload(request: Request, env: Env): Promise<Response> {
  const token = request.headers.get("X-Echotrace-Token") ?? "";
  const folder = request.headers.get("X-Echotrace-Folder") ?? "";
  const expiry = request.headers.get("X-Echotrace-Expiry") ?? "";

  if (!token || !folder || !expiry) return json({ error: "missing headers" }, 400);
  if (!folder.startsWith("echotrace/")) return json({ error: "invalid folder" }, 400);

  const exp = Number(expiry);
  if (!Number.isFinite(exp) || exp <= Date.now() / 1000) return json({ error: "token expired" }, 401);

  const expected = await hmacHex(env.UPLOAD_SECRET, `${folder}:${expiry}`);
  if (!safeEqual(token, expected)) return json({ error: "invalid token" }, 401);

  const body = await request.arrayBuffer();
  if (body.byteLength === 0) return json({ error: "empty body" }, 400);
  if (body.byteLength > MAX_UPLOAD_BYTES) return json({ error: "file too large" }, 413);

  const mime = detectUploadMime(new Uint8Array(body.slice(0, 12)));
  if (!mime) return json({ error: "unsupported file type" }, 415);

  const key = `${folder}/${crypto.randomUUID()}`;
  await env.R2.put(key, body, {
    // contentType từ kết quả magic-byte, KHÔNG tin header client gửi lên
    httpMetadata: { contentType: mime },
  });

  const url = new URL(request.url);
  url.pathname = `/${key}`;
  url.search = "";
  // ponytail: thumbnail = on-the-fly Cloudflare Images transform (w_800), reuses handleGet; no extra R2 storage.
  const thumbUrl = `${url.origin}/w_800/${key}`;
  return json({ url: url.toString(), publicId: key, thumbUrl }, 201);
}

async function pickFormat(request: Request): Promise<"image/avif" | "image/webp" | "image/jpeg"> {
  const accept = request.headers.get("Accept") ?? "";
  if (accept.includes("image/avif")) return "image/avif";
  if (accept.includes("image/webp")) return "image/webp";
  return "image/jpeg";
}

async function handleGet(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  let path = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
  if (!path) return json({ error: "not found" }, 404);

  let width: number | null = null;
  const wm = path.match(/^w_(\d+)\/(.+)$/);
  if (wm) {
    width = parseInt(wm[1], 10);
    path = wm[2];
  }

  const object = await env.R2.get(path);
  if (!object) return json({ error: "not found" }, 404);

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("Etag", object.httpEtag ?? "");
  headers.set("access-control-allow-origin", "*");
  // ponytail: key là UUID không bao giờ ghi đè -> original cache vĩnh viễn an toàn,
  // delete thi URL chet 404 (browser khong co co che xoa cache tu xa);
  // rieng ban transform (cung key, noi dung phai sinh) moi can TTL ngang de het hanh trong ngay
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  if (request.method === "HEAD") return new Response(null, { headers });

  const stream = object.body;
  if (stream && width && width > 0 && width <= 4000 && env.IMAGES) {
    try {
      const transformed = (
        await env.IMAGES.input(stream)
          .transform({ width })
          .output({ format: await pickFormat(request) })
      ).response();
      headers.set("Cache-Control", "public, max-age=86400, stale-while-revalidate=86400");
      return new Response(transformed.body, { headers });
    } catch {
      // ponytail: fall back to original if transform fails (e.g. unsupported input)
      // — giữ Cache-Control immutable mặc định vì đây là byte gốc
      const retry = await env.R2.get(path);
      if (retry) return new Response(retry.body, { headers });
    }
  }
  return new Response(stream, { headers });
}

async function handleDelete(request: Request, env: Env): Promise<Response> {
  if (bearerToken(request) !== env.ADMIN_TOKEN) return json({ error: "unauthorized" }, 401);
  const body = (await request.json().catch(() => null)) as { publicId?: string } | null;
  const publicId = body?.publicId;
  if (typeof publicId !== "string" || !publicId) return json({ error: "missing publicId" }, 400);
  await env.R2.delete(publicId);
  return json({ ok: true });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }
    try {
      let res: Response;
      if (request.method === "POST") res = await handleUpload(request, env);
      else if (request.method === "GET" || request.method === "HEAD") res = await handleGet(request, env);
      else if (request.method === "DELETE") res = await handleDelete(request, env);
      else return json({ error: "method not allowed" }, 405);
      for (const [k, v] of Object.entries(corsHeaders())) res.headers.set(k, v);
      return res;
    } catch (err) {
      console.error("unhandled", err);
      return json({ error: "internal error" }, 500);
    }
  },
} satisfies ExportedHandler<Env>;