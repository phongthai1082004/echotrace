import { apiFetch } from "@/lib/api.fetch";
import { getPageContext } from "@/lib/page-context";
import type { SupplierResponse } from "@/models/supplier/supplier.list";
import { SuppliersClient } from "./_components/suppliers-client";

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
    }
  }

  return <SuppliersClient initialSuppliers={initialSuppliers} initialNextCursor={initialNextCursor} />;
}
