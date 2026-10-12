const PROXY = "/api/proxy";

// ponytail: single-flight — nhiều 401 cùng lúc chỉ refresh 1 lần rồi retry chung
let refreshInflight: Promise<unknown> | null = null;
function refreshSessionOnce() {
  return (refreshInflight ??= import("next-auth/react")
    .then((m) => m.getSession())
    .finally(() => (refreshInflight = null)));
}

// RT chết thật (refresh không cứu được) mới về đây: sign out rồi đá về /auth.
function expireSession() {
  // ponytail: chặn redirect lặp khi đã ở /auth
  if (window.location.pathname.includes("/auth")) return;
  import("next-auth/react")
    .then(async (m) => {
      await m.signOut({ redirect: false });
      // and a stale cookie is exactly how the UI silently reset to English.
      const { withLang, langFromCookie } = await import("@/lib/routing");
      window.location.href = withLang("/auth?error=expired", langFromCookie());
    })
    .catch(() => {});
}

export async function apiFetch<T = any>(
  path: string,
  token?: string,
  options?: RequestInit & { raw?: boolean; signal?: AbortSignal },
): Promise<T> {
  const isServer = typeof window === "undefined";
  const base = isServer
    ? process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_BACKEND_URL
    : PROXY;

  // Add language code to API path for client requests
  const apiPath = !isServer && !/^\/(en|es|vi)/.test(path) ? `/vi${path}` : path;

  // Client calls go through the same-origin proxy, which injects the bearer
  // token from the httpOnly session cookie. The token is never exposed to JS.
  const url = isServer ? `${base}${path}` : `${PROXY}?path=${encodeURIComponent(apiPath)}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string>),
  };
  // Only server-side calls attach the token directly; client relies on the proxy.
  if (isServer && token) headers["Authorization"] = `Bearer ${token}`;

  let res = await fetch(url, { ...options, headers });

  // 401 → refresh lười 1 lần rồi retry; vẫn 401 = RT chết → logout
  if (!isServer && res.status === 401) {
    try { await refreshSessionOnce(); } catch {}
    res = await fetch(url, { ...options, headers });
  }

  // Still 401 → refresh token is dead (expired/revoked) → sign out → /auth
  if (!isServer && res.status === 401) {
    expireSession();
    throw new Error("Session expired. Please sign in again.");
  }

  if (options?.raw) return res as any;

  const json = await res.json();
  if (!res.ok) {
    let msg = json.message || "request failed";
    if (json.errors && typeof json.errors === "object") {
      const details = Object.entries(json.errors)
        .map(([k, v]) => `• ${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
        .join("\n");
      if (details) msg += `\n${details}`;
    }
    throw new Error(msg);
  }
  return json.data as T;
}
