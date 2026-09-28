import { apiFetch } from "@/lib/api.fetch";

export interface PrintCatalogEntry {
  code: string;
  name: Record<string, string>;
  price?: number | null;
  width?: number | null;
  height?: number | null;
}

export interface PrintCatalog {
  covers: PrintCatalogEntry[];
  papers: PrintCatalogEntry[];
  sizes: PrintCatalogEntry[];
}

export async function fetchPrintCatalog(token: string): Promise<PrintCatalog> {
  const d = await apiFetch<any>("/api/user/suppliers/options", token);
  return {
    covers: d?.covers ?? [],
    papers: d?.papers ?? [],
    sizes: d?.sizes ?? [],
  };
}