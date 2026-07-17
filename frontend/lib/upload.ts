"use client";

interface SignatureData {
  signature: string;
  timestamp: number;
  folder: string;
  public_id?: string;
  api_key: string;
  cloud_name: string;
}

/**
 * Upload ảnh lên Cloudinary theo cơ chế Signed Upload
 *
 * Các tham số trong signature:
 * - timestamp      : thời gian Unix (giây) — chống replay attack
 * - folder         : thư mục đích trên Cloudinary
 * - public_id      : (chỉ avatar) tên file cố định theo userId, cho phép ghi đè
 * - overwrite      : (chỉ avatar) = true → ảnh mới ghi đè ảnh cũ
 *
 * Khi upload, frontend gửi LẠI CHÍNH XÁC các tham số đã ký + file.
 * Cloudinary tính lại signature từ các params + secret, nếu khớp → hợp lệ.
 */
export async function uploadToCloudinary(
  file: File,
  type: "avatar" | "gallery" | "sticker" | "background",
  accessToken: string
): Promise<{ url: string; publicId: string }> {
  // Bước A: Lấy chữ ký từ backend
  const sigRes = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/get-upload-signature?type=${type}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!sigRes.ok) throw new Error("Failed to get upload signature");
  const sigData = (await sigRes.json()).data as SignatureData;

  // Bước C: Upload thẳng lên Cloudinary
  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", sigData.api_key);
  formData.append("timestamp", String(sigData.timestamp));
  formData.append("folder", sigData.folder);
  formData.append("signature", sigData.signature);
  if (sigData.public_id) {
    formData.append("public_id", sigData.public_id);
    formData.append("overwrite", "true");
  }

  const uploadRes = await fetch(
    `https://api.cloudinary.com/v1_1/${sigData.cloud_name}/image/upload`,
    { method: "POST", body: formData }
  );
  if (!uploadRes.ok) throw new Error("Cloudinary upload failed");

  const uploadData = await uploadRes.json();
  return { url: uploadData.secure_url as string, publicId: uploadData.public_id as string };
}
