"use client";

import { useTranslation } from "react-i18next";
import { DiscountType, MinOrderType } from "@echotrace/shared";
import { card } from "@/lib/styles";
import { AdminList } from "@/components/admin-list";
import { StatusBadge } from "@/components/status-badge";
import { Coupon } from "../_hooks/use-coupons";

export function CouponsTable({
  filtered,
  loading,
  onOpen,
}: {
  filtered: Coupon[];
  loading: boolean;
  onOpen: (c: Coupon) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className={`${card} flex-1 flex flex-col min-h-0`}>
      <AdminList
        columns={[
          { key: "code", label: t("admin.coupons.code"), width: "1fr" },
          { key: "value", label: t("admin.coupons.value"), width: "90px" },
          { key: "used", label: t("admin.coupons.used"), width: "90px" },
          { key: "minOrder", label: t("admin.coupons.minOrder"), width: "90px" },
          { key: "expiresAt", label: t("admin.coupons.expiresAt"), width: "110px" },
          { key: "status", label: t("admin.coupons.status"), width: "90px", align: "center" },
        ]}
        data={filtered}
        loading={loading}
        rowKey={(c) => c.id}
        onRowClick={onOpen}
        empty={
          <div className="flex items-center justify-center py-10">
            <p className="text-lg font-bold">{t("admin.coupons.empty")}</p>
          </div>
        }
        renderRow={(c) => (
          <>
            <div className="px-2 text-sm font-bold font-mono whitespace-nowrap">{c.code}</div>
            <div className="px-2 text-sm font-bold whitespace-nowrap">
              {c.discountType?.toLowerCase() === DiscountType.PERCENTAGE
                ? `${c.discountValue}%`
                : `₫${c.discountValue.toLocaleString()}`}
            </div>
            <div className="px-2 font-mono text-[11px] font-bold whitespace-nowrap">
              {c.usedCount}/{c.maxUsageCount || "∞"}
            </div>
            <div className="px-2 font-mono text-[11px] font-bold whitespace-nowrap">
              {c.minOrderType?.toLowerCase() === MinOrderType.QUANTITY ? "×" : "₫"}
              {c.minOrderAmount.toLocaleString()}
            </div>
            <div className="px-2 font-mono text-[11px] font-bold whitespace-nowrap">
              {c.expiresAt ? c.expiresAt.slice(0, 10) : "∞"}
            </div>
            <div className="px-2 flex justify-center whitespace-nowrap">
              <StatusBadge
                status={c.isActive ? "active" : "default"}
                label={c.isActive ? t("admin.coupons.active") : t("admin.coupons.inactive")}
              />
            </div>
          </>
        )}
      />
    </div>
  );
}
