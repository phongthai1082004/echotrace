export type SearchTarget = "all" | "name" | "email" | "phone";

// ponytail: heuristic, not NLP. Covers the 3 admin list columns; anything ambiguous searches all fields.
export function detectSearchTarget(q: string): SearchTarget {
  const t = q.trim();
  if (!t) return "all";
  if (t.includes("@")) return "email";
  if (/^[\d\s+()-.]+$/.test(t)) return "phone";
  if (/^[\p{L}\s.'-]+$/u.test(t)) return "name";
  return "all";
}