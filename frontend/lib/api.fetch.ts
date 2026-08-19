const BASE = process.env.NEXT_PUBLIC_BACKEND_URL;

export async function apiFetch<T = any>(
  path: string,
  token?: string,
  options?: RequestInit & { raw?: boolean },
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

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
