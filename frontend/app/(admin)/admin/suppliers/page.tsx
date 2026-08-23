"use client";

import { useMemo, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { card, neoBtn, neoBtnPrimary } from "@/lib/styles";
import { AdminHeader } from "@/components/admin-header";
import { AdminSearch } from "@/components/admin-search";
import { AdminFilterTabs } from "@/components/admin-filter-tabs";
import { AdminPagination } from "@/components/admin-pagination";
import { AdminList } from "@/components/admin-list";
import { Supplier } from "@/models/supplier/supplier";
import { SupplierResponse } from "@/models/supplier/supplier.list";
import { EmptyStateMinimal } from "@/components/ui/empty-state";
import { Eye } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { useApiQuery, useDebounce } from "@hooks";
import { isAuthenticatedSession } from "@/types/auth";
import { detectSearchTarget } from "@/lib/search-detector";

export default function AdminSuppliersPage() {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const isAuthenticated = isAuthenticatedSession(session);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 1000);
  const [filter, setFilter] = useState<string>("all");
  const [cursor, setCursor] = useState<number | null>(null);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [cursorStack, setCursorStack] = useState<number[]>([]);

  // Build URL with query parameters
  const queryUrl = useMemo(() => {
    if (!isAuthenticated) return "";
    const params = new URLSearchParams();
    if (filter !== "all") params.set("status", filter);
    if (debouncedSearch) {
      params.set("search", debouncedSearch);
      params.set("field", detectSearchTarget(debouncedSearch));
    }
    if (cursor) params.set("cursor", String(cursor));
    params.set("limit", "20");
    return `/api/admin/suppliers?${params.toString()}`;
  }, [isAuthenticated, filter, debouncedSearch, cursor]);

  // Fetch suppliers with useApiQuery
  const { data: response, loading } = useApiQuery<SupplierResponse>(
    queryUrl,
    isAuthenticated ? session.accessToken : undefined,
    {
      enabled: isAuthenticated && !!queryUrl,
      onSuccess: (data) => setNextCursor(data.nextCursor ?? null),
    },
  );

  // Reset pagination whenever search/filter changes
  useEffect(() => {
    setCursor(null);
    setCursorStack([]);
  }, [debouncedSearch, filter]);

  const suppliers = response?.items ?? [];

  const handleNext = () => {
    if (!nextCursor) return;
    setCursorStack((prev) => (cursor ? [...prev, cursor] : prev));
    setCursor(nextCursor);
  };

  const handlePrevious = () => {
    const stack = [...cursorStack];
    const prevCursor = stack.pop() ?? null;
    setCursor(prevCursor);
    setCursorStack(stack);
  };

  return (
    <div className="h-screen flex flex-col">
      <AdminHeader label={t("admin.suppliers.label")} title={t("admin.suppliers.title")}>
        <div className="flex items-center gap-3">
          <AdminSearch value={search} onChange={setSearch} placeholder={t("admin.suppliers.searchPlaceholder")} />
          <Link
            href="/admin/suppliers/new"
            suppressHydrationWarning
            className={`${neoBtnPrimary} font-mono text-[9px] font-bold tracking-widest uppercase px-4 py-2.5 shrink-0`}
          >
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
          <AdminList
            columns={[
              { key: "name", label: t("admin.suppliers.name"), width: "1.5fr" },
              { key: "email", label: t("admin.suppliers.email"), width: "1fr" },
              { key: "contact", label: t("admin.suppliers.contact"), width: "0.8fr" },
              { key: "totalDebt", label: t("admin.suppliers.totalDebt"), width: "110px" },
              { key: "overdueDebt", label: t("admin.suppliers.overdueDebt"), width: "110px" },
              { key: "monthDebt", label: t("admin.suppliers.monthDebt"), width: "110px" },
              { key: "status", label: t("admin.suppliers.status"), width: "90px", align: "center" },
              { key: "action", label: t("common.action"), width: "80px", align: "center" },
            ]}
            data={suppliers}
            loading={loading}
            rowKey={(s) => s.id}
            rowHref={(s) => `/admin/suppliers/${s.id}`}
            empty={
              <EmptyStateMinimal
                title={t("admin.suppliers.noSuppliers")}
                description={t("admin.suppliers.createFirstSupplier")}
              />
            }
            footer={
              <AdminPagination
                hasNext={nextCursor !== null}
                hasPrevious={cursorStack.length > 0}
                onNext={handleNext}
                onPrevious={handlePrevious}
              />
            }
            renderRow={(s: Supplier) => (
              <>
                <div className="px-2 text-sm font-bold whitespace-nowrap min-w-0 truncate">{s.name}</div>
                <div className="px-2 text-sm font-bold whitespace-nowrap min-w-0 truncate">{s.email}</div>
                <div className="px-2 text-sm font-bold whitespace-nowrap min-w-0 truncate">{s.contact}</div>
                <div className="px-2 font-mono text-[11px] font-bold text-[#22C55E] whitespace-nowrap">
                  {s.totalDebt ? `₫${s.totalDebt.toLocaleString()}` : "—"}
                </div>
                <div className="px-2 font-mono text-[11px] font-bold text-[#B54843] whitespace-nowrap">
                  {s.overdueDebt ? `₫${s.overdueDebt.toLocaleString()}` : "—"}
                </div>
                <div className="px-2 font-mono text-[11px] font-bold text-[#D97706] whitespace-nowrap">
                  {s.monthDebt ? `₫${s.monthDebt.toLocaleString()}` : "—"}
                </div>
                <div className="px-2 flex justify-center whitespace-nowrap">
                  <StatusBadge status={s.banned ? "banned" : "active"} />
                </div>
                <div className="px-2 flex justify-center">
                  <button className={`${neoBtn} p-1.5`}>
                    <Eye size={14} />
                  </button>
                </div>
              </>
            )}
          />
        </div>
      </div>
    </div>
  );
}
