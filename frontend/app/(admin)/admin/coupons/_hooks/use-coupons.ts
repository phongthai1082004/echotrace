"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api.fetch";
import { useToast } from "@/components/toast";
import { useDebounce } from "@hooks";
import { CouponDTO, DiscountType, MinOrderType } from "@echotrace/shared";

export type Coupon = CouponDTO;

export interface CouponForm {
  code: string;
  discountType: string;
  discountValue: number;
  minOrderAmount: number;
  minOrderType: string;
  maxDiscountAmount: number;
  maxUsageCount: number;
  isActive: boolean;
  expiresAt: string;
}

export const TYPE_OPTIONS = [DiscountType.PERCENTAGE, DiscountType.FIXED] as const;
export const MIN_ORDER_OPTIONS = [MinOrderType.VALUE, MinOrderType.QUANTITY] as const;

export function defaultForm(): CouponForm {
  return {
    code: "",
    discountType: DiscountType.PERCENTAGE,
    discountValue: 0,
    minOrderAmount: 0,
    minOrderType: MinOrderType.VALUE,
    maxDiscountAmount: 0,
    maxUsageCount: 0,
    isActive: true,
    expiresAt: "",
  };
}

export function couponToForm(c: Coupon): CouponForm {
  return {
    code: c.code,
    discountType: c.discountType?.toLowerCase(),
    discountValue: c.discountValue,
    minOrderAmount: c.minOrderAmount,
    minOrderType: c.minOrderType?.toLowerCase(),
    maxDiscountAmount: c.maxDiscountAmount ?? 0,
    maxUsageCount: c.maxUsageCount,
    isActive: c.isActive,
    expiresAt: c.expiresAt?.slice(0, 10) ?? "",
  };
}

export function useCoupons(initialCoupons?: Coupon[]) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { data: session } = useSession();
  const token = (session as any)?.accessToken;

  // ponytail: có initial từ server thì khỏi fetch lại lần đầu.
  const [coupons, setCoupons] = useState<Coupon[]>(initialCoupons ?? []);
  const [loading, setLoading] = useState(initialCoupons === undefined);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [filter, setFilter] = useState("all");
  const [saving, setSaving] = useState(false);

  const fetchCoupons = async () => {
    if (!token) return;
    try {
      const data = await apiFetch<Coupon[]>("/api/admin/coupons", token);
      setCoupons(data ?? []);
    } catch {
      showToast(t("admin.coupons.fetchFailed"), "error");
    }
  };

  useEffect(() => {
    if (!token || initialCoupons !== undefined) return;
    setLoading(true);
    fetchCoupons().finally(() => setLoading(false));
  }, [token]);

  const filtered = coupons.filter((c) => {
    const q = debouncedSearch.toLowerCase();
    return (
      (!q || c.code.toLowerCase().includes(q)) && (filter === "all" || (filter === "active" ? c.isActive : !c.isActive))
    );
  });

  const create = async (form: CouponForm): Promise<boolean> => {
    setSaving(true);
    try {
      await apiFetch("/api/admin/coupons", token, { method: "POST", body: JSON.stringify(form) });
      showToast(t("admin.coupons.created"), "success");
      await fetchCoupons();
      return true;
    } catch (e: any) {
      showToast(e.message || t("admin.coupons.createFailed"), "error");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async (c: Coupon): Promise<boolean> => {
    try {
      await apiFetch(`/api/admin/coupons/${c.id}/deactivate`, token, { method: "PATCH" });
      setCoupons((s) => s.map((x) => (x.id === c.id ? { ...x, isActive: false } : x)));
      showToast(t("admin.coupons.deactivated"), "success");
      return true;
    } catch {
      showToast(t("admin.coupons.deactivateFailed"), "error");
      return false;
    }
  };

  return { filtered, loading, search, setSearch, filter, setFilter, saving, create, deactivate };
}
