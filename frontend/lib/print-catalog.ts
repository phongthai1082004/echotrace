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

// Catalog global PrintOption — dùng chung cho checkout/studio-topbar.
// ponytail: gọi lại mỗi lần thêm/đổi (không cache client), catalog hiện đọc từ
// /user/suppliers/options — thay bằng endpoint riêng khi tách pricing.
export async function fetchPrintCatalog(token: string): Promise<PrintCatalog> {
  const d = await apiFetch<any>("/api/user/suppliers/options", token);
  return {
    covers: d?.covers ?? [],
    papers: d?.papers ?? [],
    sizes: d?.sizes ?? [],
  };
}

export function priceForCode(list: PrintCatalogEntry[], code: string): number | null {
  const o = list.find((x) => x.code === code);
  return o?.price ?? null;
}