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

// ponytail: short-circuit — if it's already a compliant JPEG, skip re-encode (no generation loss, faster).
async function normalizeToJpeg(
  file: File,
  cfg: { maxSide: number; minBytes: number; maxBytes: number },
): Promise<Normalized> {
  const bmp = await decodeImage(file);
  const withinSize =
    file.type === "image/jpeg" && file.size >= cfg.minBytes && file.size <= cfg.maxBytes;
  const withinDim = Math.max(bmp.width, bmp.height) <= cfg.maxSide;
  if (withinSize && withinDim) {
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
  const { blob, width, height } = await normalizeToJpeg(file, cfg);

  const ticket = await apiFetch<UploadTicket>(`/api/get-upload-signature?type=${type}`, accessToken);

  const res = await fetch(ticket.uploadUrl, {
    method: "POST",
    body: blob,
    headers: {
      "Content-Type": "image/jpeg",
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
