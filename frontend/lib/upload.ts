"use client";

import { apiFetch } from "@/lib/api.fetch";

interface UploadTicket {
  token: string;
  folder: string;
  expiry: number;
  uploadUrl: string;
}

/**
 * Upload file lên Cloudflare R2 qua worker `cloudfarer2`.
 *
 * Giống cơ chế signed upload (token bảo vệ):
 * - Backend ký token = HMAC(folder:expiry) qua `/api/get-upload-signature`.
 * - Browser upload thẳng lên worker; worker tính lại token và chỉ nhận khi khớp + còn hạn.
 * - Folder được buộc vào token nên user không thể upload lên folder khác.
 */
export async function uploadToR2(
  file: File,
  type: "avatar" | "gallery" | "sticker" | "book-thumb",
  accessToken: string,
): Promise<{ url: string; publicId: string }> {
  const ticket = await apiFetch<UploadTicket>(`/api/get-upload-signature?type=${type}`, accessToken);

  const res = await fetch(ticket.uploadUrl, {
    method: "POST",
    body: file,
    headers: {
      "Content-Type": file.type || "application/octet-stream",
      "X-Echotrace-Token": ticket.token,
      "X-Echotrace-Folder": ticket.folder,
      "X-Echotrace-Expiry": String(ticket.expiry),
    },
  });
  if (!res.ok) throw new Error(`R2 upload failed: ${res.status}`);

  const data = await res.json();
  return { url: data.url as string, publicId: data.publicId as string };
}
