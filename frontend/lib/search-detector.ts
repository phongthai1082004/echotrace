export type SearchTarget = "all" | "name" | "email" | "phone";

export function detectSearchTarget(q: string): SearchTarget {
  const t = q.trim();
  if (!t) return "all";
  if (t.includes("@")) return "email";
  if (/^[\d\s+()-.]+$/.test(t)) return "phone";
  if (/^[\p{L}\s.'-]+$/u.test(t)) return "name";
  return "all";
}