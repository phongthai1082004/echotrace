export function roleHome(role?: string | null): string {
  if (role === "admin") return "/admin/analytics";
  if (role === "user") return "/explore";
  return "/vi";
}

export const SUPPORTED_LANGS = ["en", "vi", "es"] as const;
export type SupportedLang = (typeof SUPPORTED_LANGS)[number];

// ponytail: full-reload navigations (window.location, signOut callbackUrl) bypass
// the cookie redirect, so prefix the lang explicitly — otherwise they land on
// bare paths and any stale cookie silently resets the UI language.
export function langFromPath(pathname?: string | null): SupportedLang {
  const seg = (pathname || "").split("/")[1];
  return (SUPPORTED_LANGS as readonly string[]).includes(seg) ? (seg as SupportedLang) : "vi";
}

export function withLang(path: string, lang?: string | null): string {
  const l = lang && (SUPPORTED_LANGS as readonly string[]).includes(lang) ? lang : "vi";
  if (path === "/") return `/${l}`;
  return `/${l}${path.startsWith("/") ? path : `/${path}`}`;
}

export function langFromCookie(): SupportedLang {
  if (typeof document === "undefined") return "vi";
  const m = document.cookie.match(/(?:^|;\s*)i18nextLng=([a-z]{2})/i)?.[1]?.toLowerCase();
  return (SUPPORTED_LANGS as readonly string[]).includes(m || "") ? (m as SupportedLang) : "vi";
}
