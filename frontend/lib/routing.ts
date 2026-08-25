export function roleHome(role?: string | null): string {
  if (role === "admin") return "/admin/analytics";
  if (role === "user") return "/explore";
  return "/en";
}
