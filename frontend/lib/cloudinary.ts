export function cloudinaryUrl(url?: string | null, tx?: string): string {
  if (!url || !url.includes("res.cloudinary.com")) return url ?? "";
  return url.replace("/image/upload/", `/image/upload/${tx ?? "f_auto,q_auto"}/`);
}
