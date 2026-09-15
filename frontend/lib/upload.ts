"use client";

import { apiFetch } from "@/lib/api.fetch";

interface UploadTicket {
  token: string;
  folder: string;
  expiry: number;
  uploadUrl: string;
}

// ponytail: per-type caps. gallery = print source (2–4MB, high res); others kept small.
const TYPE_CONFIG: Record<
  string,
  { maxSide: number; minBytes: number; maxBytes: number }
> = {
  gallery: { maxSide: 4000, minBytes: 2 * 1024 * 1024, maxBytes: 4 * 1024 * 1024 },
  "book-thumb": { maxSide: 1200, minBytes: 0, maxBytes: 400 * 1024 },
  avatar: { maxSide: 512, minBytes: 0, maxBytes: 150 * 1024 },
  sticker: { maxSide: 1024, minBytes: 0, maxBytes: 500 * 1024 },
};

type UploadType = keyof typeof TYPE_CONFIG;

// ponytail: HEIC (iPhone) can't decode via createImageBitmap; lazy-load heic2any only on failure.
async function decodeImage(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file);
  } catch {
    const { default: heic2any } = await import("heic2any");
    const converted = await heic2any({ blob: file, toType: "image/png" });
    const png = (Array.isArray(converted) ? converted[0] : converted) as Blob;
    return await createImageBitmap(png);
  }
}

interface Normalized {
  blob: Blob;
  width: number;
  height: number;
}

// ponytail: stickers keep alpha (PNG/WebP); photos flatten to JPEG (print has no transparency).
const KEEP_ALPHA_TYPES: ReadonlySet<string> = new Set(["sticker"]);

// ponytail: short-circuit — if it's already a compliant JPEG, skip re-encode (no generation loss, faster).
async function normalizeImage(
  file: File,
  cfg: { maxSide: number; minBytes: number; maxBytes: number },
  keepAlpha: boolean,
): Promise<Normalized> {
  const bmp = await decodeImage(file);
  const withinDim = (w: number, h: number) => Math.max(w, h) <= cfg.maxSide;
  if (keepAlpha) {
    const isAlphaType = file.type === "image/png" || file.type === "image/webp";
    if (isAlphaType && file.size <= cfg.maxBytes && withinDim(bmp.width, bmp.height)) {
      const w = bmp.width;
      const h = bmp.height;
      bmp.close?.();
      return { blob: file, width: w, height: h };
    }
    // ponytail: PNG has no quality knob — shrink dimensions until it fits maxBytes.
    let scale = Math.min(1, cfg.maxSide / Math.max(bmp.width, bmp.height));
    for (let i = 0; i < 6; i++) {
      const w = Math.max(1, Math.round(bmp.width * scale));
      const h = Math.max(1, Math.round(bmp.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d")!.drawImage(bmp, 0, 0, w, h);
      const blob = await canvasToPng(canvas);
      if (blob.size <= cfg.maxBytes || scale <= 0.2) {
        bmp.close?.();
        return { blob, width: w, height: h };
      }
      scale *= 0.85;
    }
    bmp.close?.();
    throw new Error("sticker too large even after downscale");
  }
  const withinSize =
    file.type === "image/jpeg" && file.size >= cfg.minBytes && file.size <= cfg.maxBytes;
  if (withinSize && withinDim(bmp.width, bmp.height)) {
    bmp.close?.();
    return { blob: file, width: bmp.width, height: bmp.height };
  }

  const scale = Math.min(1, cfg.maxSide / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff"; // flatten alpha on white (print has no transparency)
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close?.();

  // ponytail: binary-search quality to hit the size band; never upscale for the floor.
  let lo = 0.7;
  let hi = 0.97;
  let q = 0.92;
  let blob = await canvasToJpeg(canvas, q);
  for (let i = 0; i < 6; i++) {
    if (blob.size <= cfg.maxBytes && blob.size >= cfg.minBytes) break;
    if (blob.size > cfg.maxBytes) {
      hi = q;
      q = (lo + q) / 2;
    } else {
      lo = q;
      q = (q + hi) / 2;
    }
    blob = await canvasToJpeg(canvas, q);
  }
  return { blob, width: w, height: h };
}

function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("canvas.toBlob failed"))), "image/png");
  });
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("canvas.toBlob failed"))),
      "image/jpeg",
      quality,
    );
  });
}

export async function uploadToR2(
  file: File,
  type: UploadType,
  accessToken: string,
): Promise<{ url: string; publicId: string; thumbUrl?: string }> {
  const cfg = TYPE_CONFIG[type];
  const { blob, width, height } = await normalizeImage(file, cfg, KEEP_ALPHA_TYPES.has(type));

  const ticket = await apiFetch<UploadTicket>(`/api/get-upload-signature?type=${type}`, accessToken);

  const res = await fetch(ticket.uploadUrl, {
    method: "POST",
    body: blob,
    headers: {
      "Content-Type": blob.type || "image/jpeg",
      "X-Echotrace-Token": ticket.token,
      "X-Echotrace-Folder": ticket.folder,
      "X-Echotrace-Expiry": String(ticket.expiry),
    },
  });
  if (!res.ok) throw new Error(`R2 upload failed: ${res.status}`);

  const data = await res.json();
  return {
    url: data.url as string,
    publicId: data.publicId as string,
    thumbUrl: data.thumbUrl as string | undefined,
  };
}
