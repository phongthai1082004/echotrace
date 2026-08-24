"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { neoBtnPrimary } from "@/lib/styles";
import { AdminHeader } from "@/components/admin-header";
import { AdminSearch } from "@/components/admin-search";
import { AdminFilterTabs } from "@/components/admin-filter-tabs";
import { Coupon } from "./_hooks/use-coupons";
import { useCoupons } from "./_hooks/use-coupons";
import { CouponsTable } from "./_components/coupons-table";
import { CouponDrawer } from "./_components/coupon-drawer";

export default function AdminCouponsPage() {
  const { t } = useTranslation();
  const { filtered, loading, search, setSearch, filter, setFilter, saving, create, deactivate } = useCoupons();

  const [selected, setSelected] = useState<Coupon | null>(null);

  return (
    <div className="h-screen flex flex-col">
      <AdminHeader label={t("admin.coupons.label")} title={t("admin.coupons.title")}>
        <div className="flex items-center gap-3">
          <AdminSearch value={search} onChange={setSearch} placeholder={t("admin.coupons.searchPlaceholder")} />
          <button
            suppressHydrationWarning
            onClick={() => setSelected({ id: 0 } as Coupon)}
            className={`${neoBtnPrimary} font-mono text-[9px] font-bold tracking-widest uppercase px-4 py-2.5 shrink-0`}
          >
            {t("admin.coupons.createBtn")}
          </button>
        </div>
      </AdminHeader>

      <div className="flex-1 flex flex-col px-8 max-[1600px]:px-6 max-[1440px]:px-5 max-[1280px]:px-4 py-6 max-[1600px]:py-5 max-[1440px]:py-4 max-[1280px]:py-3 gap-6 min-h-0 overflow-hidden">
        <AdminFilterTabs
          tabs={[
            { key: "all", label: t("admin.filterTabs.all") },
            { key: "active", label: t("admin.coupons.active") },
            { key: "inactive", label: t("admin.coupons.inactive") },
          ]}
          selected={filter}
          onChange={(k) => setFilter(k)}
        />

        <CouponsTable filtered={filtered} loading={loading} onOpen={setSelected} />
      </div>

      {selected && (
        <CouponDrawer
          coupon={selected}
          saving={saving}
          onCreate={async (form) => {
            const ok = await create(form);
            if (ok) setSelected(null);
            return ok;
          }}
          onDeactivate={deactivate}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
