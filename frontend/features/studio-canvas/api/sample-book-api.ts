import { apiFetch } from "@/lib/api.fetch";
import type { StudioAPI } from "./studio-api";
import { makeBookSave } from "./customer-api";

export const sampleBookAPI: StudioAPI = {
  save: makeBookSave("/api/admin/sample-books", "", "name", { includeKind: true }),
  beaconPath: (bookId) => `/vi/api/admin/sample-books/${bookId}`,
  beaconTitleField: "name",
  async load(bookId, token) {
    const res = await apiFetch<Response>(`/api/admin/sample-books/${bookId}`, token, { raw: true });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },
};
