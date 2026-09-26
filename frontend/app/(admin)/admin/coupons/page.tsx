import { apiFetch } from "@/lib/api.fetch";
import { getPageContext } from "@/lib/page-context";
import { CouponsClient } from "./_components/coupons-client";
import type { Coupon } from "./_hooks/use-coupons";

export default async function AdminCouponsPage() {
  const { token } = await getPageContext();

  let initialCoupons: Coupon[] | undefined;
  if (token) {
    try {
      initialCoupons = (await apiFetch<Coupon[]>("/api/admin/coupons", token)) ?? [];
    } catch {
    }
  }

  return <CouponsClient initialCoupons={initialCoupons} />;
}
