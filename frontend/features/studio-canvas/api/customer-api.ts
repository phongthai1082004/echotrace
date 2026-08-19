import { apiFetch } from "@/lib/api.fetch";
import type { StudioAPI } from "./studio-api";

export function makeBookSave(
  base: string,
  updateSuffix: string,
  titleField: "title" | "name",
  opts?: { includeKind?: boolean },
) {
  return async (token: string, bookId: number | null, payload: Record<string, unknown>) => {
    try {
      const { [titleField]: title, paperHeight, paperWidth, kind, ...content } = payload;
      const body: Record<string, unknown> = { content, [titleField]: title };
      if (paperHeight !== undefined && paperHeight !== null) body.paperHeight = paperHeight;
      if (paperWidth !== undefined && paperWidth !== null) body.paperWidth = paperWidth;
      if (opts?.includeKind && kind !== undefined) body.kind = kind;
      const res = await apiFetch<Response>(bookId ? `${base}/${bookId}${updateSuffix}` : base, token, {
        method: bookId ? "PATCH" : "POST",
        body: JSON.stringify(body),
        raw: true,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        return { ok: false, error: `${res.status} ${text.slice(0, 200)}`, id: bookId ?? undefined };
      }
      if (!bookId) {
        const json = await res.json();
        return { ok: true, id: json?.data?.id };
      }
      return { ok: true, id: bookId };
    } catch (err) {
      return { ok: false, error: String(err), id: bookId ?? undefined };
    }
  };
}

export const customerAPI: StudioAPI = {
  save: makeBookSave("/api/books", "/pages", "title"),
  async load(bookId) {
    const res = await fetch(`/api/books/${bookId}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },
};
