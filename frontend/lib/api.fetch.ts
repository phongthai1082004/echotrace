const BASE = process.env.NEXT_PUBLIC_BACKEND_URL;

export async function apiFetch<T>(
  path: string,
  token: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.message || json.errors || "request failed");
  return json.data as T;
}
