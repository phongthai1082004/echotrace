"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { label, card, neoBtn, neoBtnPrimary } from "@/lib/styles";
import { AdminHeader } from "@/components/admin-header";
import { AdminSearch } from "@/components/admin-search";
import type { OrderStatus } from "@/lib/mock-dispatch";
import { dispatchSuppliers, allOrders, unassignedOrders } from "@/lib/mock-dispatch";
import { useDispatch } from "./_hooks/use-dispatch";
import { DispatchTable } from "./_components/dispatch-table";
import { OrderDetailDrawer } from "./_components/order-detail-drawer";
import { AssignModal } from "./_components/assign-modal";
import { formatCurrency } from "./_lib/utils";

export default function DispatchPage() {
  const { t } = useTranslation();
  const d = useDispatch();
  const [showAssignModal, setShowAssignModal] = useState(false);

  return (
    <div className="h-screen flex flex-col">
      <AdminHeader label={t("admin.dispatch.label")} title={t("admin.dispatch.title")}>
        <AdminSearch value={d.search} onChange={d.setSearch} placeholder={t("admin.dispatch.searchPlaceholder")} />
      </AdminHeader>

      <div className="flex-1 flex overflow-hidden">
        {/* ── LEFT PANEL: Suppliers ── */}
        <div className="w-[200px] shrink-0 border-r-[3px] border-[#222] overflow-y-auto bg-[#FFF7D6]/40 flex flex-col">
          <button
            onClick={() => d.selectSupplier(null)}
            className={`w-full text-left px-5 py-3.5 border-b-2 border-[#222]/10 font-bold text-sm transition-colors flex items-center justify-between ${
              d.selectedSupplierId === null ? "bg-[#FFF7D6]" : "hover:bg-[#FFF7D6]/60 text-[#444]"
            }`}
          >
            <span>{t("admin.dispatch.allOrders")}</span>
            <span className="font-mono text-[10px] text-[#999]">{allOrders.length}</span>
          </button>
          <div className="flex-1 overflow-y-auto">
            {dispatchSuppliers.map((s) => {
              const active = s.id === d.selectedSupplierId;
              return (
                <button
                  key={s.id}
                  onClick={() => d.selectSupplier(s.id)}
                  className={`w-full text-left px-5 py-3.5 border-b-2 border-[#222]/10 transition-colors ${
                    active ? "bg-[#FFF7D6]" : "hover:bg-[#FFF7D6]/60"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className={`text-sm font-bold ${active ? "" : "text-[#444]"}`}>{s.name}</p>
                    <ChevronRight size={13} className={active ? "text-[#222]" : "text-[#999]"} />
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono text-[9px] font-bold text-[#3B82F6] bg-[#3B82F6]/10 px-1.5 py-0.5 rounded">
                      {s.activeOrders} {t("admin.dispatch.active")}
                    </span>
                    <span
                      className={`font-mono text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        s.overdueDebt > 0 ? "text-[#B54843] bg-[#B54843]/10" : "text-[#22C55E] bg-[#22C55E]/10"
                      }`}
                    >
                      {formatCurrency(s.totalDebt)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── RIGHT PANEL: Orders ── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Supplier detail strip */}
          {d.selectedSupplier && (
            <div className="px-6 py-4 border-b-[3px] border-[#222] bg-[#FFF7D6]/60 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-base font-bold">{d.selectedSupplier.name}</p>
                  <p className={`${label} text-[#999] mt-0.5`}>
                    {d.selectedSupplier.contact} &middot; {d.selectedSupplier.email}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`${card} px-3 py-1.5`}>
                    <p className={`${label} text-[#999]`}>{t("admin.dispatch.debt")}</p>
                    <p className="text-sm font-bold">{formatCurrency(d.selectedSupplier.totalDebt)}</p>
                  </div>
                  <div className={`${card} px-3 py-1.5 ${d.selectedSupplier.overdueDebt > 0 ? "" : "opacity-50"}`}>
                    <p className={`${label} text-[#999]`}>{t("admin.dispatch.overdue")}</p>
                    <p className="text-sm font-bold text-[#B54843]">{formatCurrency(d.selectedSupplier.overdueDebt)}</p>
                  </div>
                  <div className={`${card} px-3 py-1.5`}>
                    <p className={`${label} text-[#999]`}>{t("admin.dispatch.mtd")}</p>
                    <p className="text-sm font-bold">{formatCurrency(d.selectedSupplier.monthDebt)}</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowAssignModal(true)}
                className={`${neoBtnPrimary} font-mono text-[9px] font-bold tracking-widest uppercase px-4 py-2.5 shrink-0`}
              >
                {t("admin.dispatch.assignOrders")}
              </button>
            </div>
          )}

          {/* Filters bar */}
          <div className={`${card} mx-6 mt-4 mb-3 p-3 shrink-0`}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex gap-2 flex-wrap">
                {d.counts.map(({ key, count }) => (
                  <button
                    key={key}
                    onClick={() => {
                      d.setStatusFilter(key as OrderStatus | "all");
                      d.setPage(0);
                    }}
                    className={`font-mono text-[8px] font-bold tracking-widest uppercase px-2 py-1 ${d.statusFilter === key ? neoBtnPrimary : neoBtn}`}
                  >
                    {d.statusLabel(key)}{" "}
                    <span className={d.statusFilter === key ? "text-white/60" : "text-[#999]"}>({count})</span>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3 text-xs shrink-0">
                <span className="text-[#222] font-bold">{t("admin.dispatch.orders", { count: allOrders.length })}</span>
                <span className="w-[2px] h-3 bg-[#222] rounded-full" />
                <span className="text-[#222] font-bold">
                  {t("admin.dispatch.suppliers", { count: dispatchSuppliers.length })}
                </span>
                <span className="w-[2px] h-3 bg-[#222] rounded-full" />
                <span className="text-[#222] font-bold">
                  {t("admin.dispatch.unassigned", { count: unassignedOrders.length })}
                </span>
              </div>
            </div>
          </div>

          {/* Orders table */}
          <div className="flex-1 mx-6 mb-4 min-h-0 flex flex-col">
            <div className={`${card} flex-1 flex flex-col min-h-0 overflow-hidden`}>
              <DispatchTable
                paged={d.paged}
                page={d.page}
                totalPages={d.totalPages}
                setPage={d.setPage}
                onOpen={d.setSelectedOrder}
              />
            </div>
          </div>
        </div>
      </div>

      {d.selectedOrder && (
        <OrderDetailDrawer
          order={d.selectedOrder}
          onUpdateStatus={d.updateStatus}
          onClose={() => d.setSelectedOrder(null)}
        />
      )}

      {showAssignModal && (
        <AssignModal
          supplierName={d.selectedSupplier?.name || ""}
          onClose={() => setShowAssignModal(false)}
        />
      )}
    </div>
  );
}
