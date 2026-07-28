import type { StudioAPI } from "./studio-api";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

export const customerAPI: StudioAPI = {
  async save(token, bookId, payload) {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    try {
      if (bookId) {
        const res = await fetch(`${BACKEND}/api/books/${bookId}/pages`, {
          method: "PATCH", headers,
          body: JSON.stringify({ content: payload, title: payload.title }),
        });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          return { ok: false, error: `${res.status} ${text.slice(0, 200)}`, id: bookId };
        }
        return { ok: true, id: bookId };
      }
      const res = await fetch(`${BACKEND}/api/books`, {
        method: "POST", headers,
        body: JSON.stringify({ content: payload, title: payload.title }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        return { ok: false, error: `${res.status} ${text.slice(0, 200)}` };
      }
      const json = await res.json();
      return { ok: true, id: json?.data?.id };
    } catch (err) {
      return { ok: false, error: String(err), id: bookId ?? undefined };
    }
  },

  async load(bookId) {
    const res = await fetch(`/api/books/${bookId}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },
};
