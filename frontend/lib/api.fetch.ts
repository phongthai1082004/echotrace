const PROXY = "/api/proxy";

// ponytail: the real token refresh happens inside the NextAuth jwt callback — every
// proxy request calls getToken(), which rotates an expired access token automatically.
// Here we only retry once (fresh cookie) and hard-fail to /auth when it's still 401.
function expireSession() {
  import("next-auth/react")
    .then(async (m) => {
      await m.signOut({ redirect: false });
      window.location.href = "/auth?error=expired";
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
  let apiPath = path;
  if (!isServer && !path.startsWith("/en") && !path.startsWith("/es") && !path.startsWith("/vi")) {
    apiPath = `/en${path}`;
  }

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

  // 401 → the proxy's getToken() may have just rotated the access token; retry once
  if (!isServer && res.status === 401) {
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
