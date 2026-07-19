export function cloudinaryUrl(url?: string | null, tx?: string, width?: number): string {
  if (!url || !url.includes("res.cloudinary.com")) return url ?? "";
  const wt = width ? `w_${width},c_scale` : "";
  const txStr = [tx ?? "f_auto,q_auto:best", wt].filter(Boolean).join(",");
  return url.replace("/image/upload/", `/image/upload/${txStr}/`);
}
