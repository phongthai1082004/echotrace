"use client";

import React, { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { label, card, neoBtnPrimary } from "@/lib/styles";
import { AdminHeader } from "@/components/admin-header";
import { AdminSearch } from "@/components/admin-search";
import { AdminFilterTabs } from "@/components/admin-filter-tabs";
import { ResponsiveTable } from "@/components/responsive-table";
import { Supplier } from "@/models/supplier/supplier";
import { SupplierResponse } from "@/models/supplier/supplier.list";
import { TableSkeletonRow } from "@/components/ui/loading-skeleton";
import { EmptyStateMinimal } from "@/components/ui/empty-state";
import { Eye } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { useApiQuery } from "@hooks";
import { isAuthenticatedSession } from "@/types/auth";

const colWidths = ["1.75fr", "1.25fr", "1fr", "100px", "100px", "100px", "80px", "60px"];
const gridCols = colWidths.join(" ");

export default function AdminSuppliersPage() {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const isAuthenticated = isAuthenticatedSession(session);

  // Use state for search and filter with useState-like hook management
  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState<string>("all");

  // Build URL with query parameters
  const queryUrl = useMemo(() => {
    if (!isAuthenticated) return "";
    const params = new URLSearchParams();
    if (filter !== "all") params.set("status", filter);
    if (search) params.set("search", search);
    return `/api/admin/suppliers?${params.toString()}`;
  }, [isAuthenticated, filter, search]);

  // Fetch suppliers with useApiQuery
  const { data: response, loading } = useApiQuery<SupplierResponse>(
    queryUrl,
    isAuthenticated ? session.accessToken : undefined,
    {
      enabled: isAuthenticated && !!queryUrl,
    }
  );

  const suppliers = response?.items ?? [];

  return (
    <div className="h-screen flex flex-col">
      <AdminHeader label={t("admin.suppliers.label")} title={t("admin.suppliers.title")}>
        <div className="flex items-center gap-3">
          <AdminSearch value={search} onChange={setSearch} placeholder={t("admin.suppliers.searchPlaceholder")} />
          <Link href="/admin/suppliers/new" suppressHydrationWarning
            className={`${neoBtnPrimary} font-mono text-[9px] font-bold tracking-widest uppercase px-4 py-2.5 shrink-0`}>
            {t("admin.suppliers.createBtn")}
          </Link>
        </div>
      </AdminHeader>

      <div className="flex-1 flex flex-col px-8 max-[1600px]:px-6 max-[1440px]:px-5 max-[1280px]:px-4 py-6 max-[1600px]:py-5 max-[1440px]:py-4 max-[1280px]:py-3 gap-6 min-h-0 overflow-hidden">
        <AdminFilterTabs
          tabs={[
            { key: "all", label: t("admin.filterTabs.all") },
            { key: "active", label: t("admin.filterTabs.active") },
            { key: "banned", label: t("admin.filterTabs.banned") },
          ]}
          selected={filter}
          onChange={(k) => setFilter(k)}
        />

        <div className={`${card} flex-1 flex flex-col min-h-0`}>
          {loading ? (
            <div className="shrink-0 border-b-[3px] border-[#222]">
              {Array.from({ length: 8 }).map((_, i) => (
                <TableSkeletonRow key={i} columns={colWidths.length} animated />
              ))}
            </div>
          ) : (
            <ResponsiveTable
              header={
                <div className="grid shrink-0 border-b-[3px] border-[#222]" style={{ gridTemplateColumns: gridCols }}>
                  {[t("admin.suppliers.name"), t("admin.suppliers.email"), t("admin.suppliers.contact"), t("admin.suppliers.totalDebt"), t("admin.suppliers.overdueDebt"), t("admin.suppliers.monthDebt"), t("admin.suppliers.status"), t("common.action")].map((h) => (
                    <div key={h} className={`px-2 py-3 ${label} text-[#666] whitespace-nowrap`}>{h}</div>
                  ))}
                </div>
              }
              gridCols={gridCols}
            >
              {suppliers.length === 0 ? (
                <EmptyStateMinimal
                  title={t("admin.suppliers.noSuppliers")}
                  description={t("admin.suppliers.createFirstSupplier")}
                />
              ) : (
                suppliers.map((s: Supplier) => (
                  <Link key={s.id} href={`/admin/suppliers/${s.id}`}
                    className="grid hover:bg-[#e8e6e0] transition-colors border-b-[2px] border-[#222]/10 items-center py-3"
                    style={{ gridTemplateColumns: gridCols }}>
                    <div className="px-2 text-sm font-bold whitespace-nowrap min-w-0 truncate">{s.name}</div>
                    <div className="px-2 text-sm font-bold whitespace-nowrap min-w-0 truncate">{s.email}</div>
                    <div className="px-2 text-sm font-bold whitespace-nowrap min-w-0 truncate">{s.contact}</div>
                    <div className="px-2 font-mono text-[11px] font-bold text-[#22C55E] whitespace-nowrap">{s.totalDebt ? `₫${s.totalDebt.toLocaleString()}` : "—"}</div>
                    <div className="px-2 font-mono text-[11px] font-bold text-[#B54843] whitespace-nowrap">{s.overdueDebt ? `₫${s.overdueDebt.toLocaleString()}` : "—"}</div>
                    <div className="px-2 font-mono text-[11px] font-bold text-[#D97706] whitespace-nowrap">{s.monthDebt ? `₫${s.monthDebt.toLocaleString()}` : "—"}</div>
                    <div className="px-2 whitespace-nowrap"><StatusBadge status={s.banned ? "banned" : "active"} /></div>
                    <div className="px-2">
                      <span className="inline-flex p-1.5 text-[#222]"><Eye size={14} /></span>
                    </div>
                  </Link>
                ))
              )}
            </ResponsiveTable>
          )}
        </div>
      </div>
    </div>
  );
}