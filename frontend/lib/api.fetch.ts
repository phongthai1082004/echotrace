const PROXY = "/api/proxy";

export async function apiFetch<T = any>(
  path: string,
  token?: string,
  options?: RequestInit & { raw?: boolean; signal?: AbortSignal },
): Promise<T> {
  const isServer = typeof window === "undefined";
  const base = isServer
    ? process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_BACKEND_URL
    : PROXY;
  // Client calls go through the same-origin proxy, which injects the bearer
  // token from the httpOnly session cookie. The token is never exposed to JS.
  const url = isServer ? `${base}${path}` : `${PROXY}?path=${encodeURIComponent(path)}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string>),
  };
  // Only server-side calls attach the token directly; client relies on the proxy.
  if (isServer && token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(url, { ...options, headers });

  // Client 401 from the proxy means the session is gone → sign out centrally.
  // Replaces the removed global fetch monkeypatch in Providers (A5).
  if (!isServer && res.status === 401) {
    import("next-auth/react").then((m) => m.signOut({ callbackUrl: "/" })).catch(() => {});
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
