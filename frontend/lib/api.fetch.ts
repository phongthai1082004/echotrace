const PROXY = "/api/proxy";

// Track refresh in-flight to avoid race conditions
let refreshPromise: Promise<void> | null = null;

async function handleTokenRefresh() {
  if (refreshPromise) return refreshPromise;
  
  refreshPromise = (async () => {
    try {
      // Client-side: call the proxy to refresh via session JWT
      const res = await fetch(`${PROXY}?path=${encodeURIComponent("/api/auth/refresh")}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error("Refresh failed");
      // Server will have updated the JWT cookie
    } finally {
      refreshPromise = null;
    }
  })();
  
  return refreshPromise;
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

  // 401 from the proxy: attempt one refresh, then try again
  if (!isServer && res.status === 401) {
    try {
      await handleTokenRefresh();
      // Retry the original request after refresh
      res = await fetch(url, { ...options, headers });
    } catch {
      // Refresh failed → sign out
      import("next-auth/react").then((m) => m.signOut({ callbackUrl: "/" })).catch(() => {});
      throw new Error("Session expired. Please sign in again.");
    }
  }

  // Second 401 or immediate 401 on other routes → sign out
  if (!isServer && res.status === 401) {
    import("next-auth/react").then((m) => m.signOut({ callbackUrl: "/" })).catch(() => {});
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
