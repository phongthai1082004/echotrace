import { apiFetch } from "@/lib/api.fetch";
import { getPageContext } from "@/lib/page-context";
import type { SupplierResponse } from "@/models/supplier/supplier.list";
import { SuppliersClient } from "./_components/suppliers-client";

// ponytail: page server — rows đầu render sẵn, khỏi fetch sau session ở client.
export default async function AdminSuppliersPage() {
  const { token } = await getPageContext();

  let initialSuppliers: SupplierResponse["items"] | undefined;
  let initialNextCursor: number | null | undefined;
  if (token) {
    try {
      const d = await apiFetch<SupplierResponse>("/api/admin/suppliers?limit=20", token);
      initialSuppliers = d?.items ?? [];
      initialNextCursor = d?.nextCursor ?? null;
    } catch {
      // ponytail: để undefined cho island fetch lại qua proxy, đừng gán [] (kẹt trống).
    }
  }

  return <SuppliersClient initialSuppliers={initialSuppliers} initialNextCursor={initialNextCursor} />;
}
