import { SupplierForm } from "../_components/supplier-form";

export default async function SupplierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SupplierForm supplierId={Number(id)} creating={false} />;
}
