// Single source of truth for role-based home paths (admin → admin, user → user, guest → /en).
export function roleHome(role?: string | null): string {
  if (role === "admin") return "/admin/analytics";
  if (role === "user") return "/explore";
  return "/en";
}
