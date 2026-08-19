"use client";

import { useState } from "react";
import { X, Search, ArrowUpDown, Check, ChevronRight, Eye } from "lucide-react";
import { useTranslation } from "react-i18next";
import { label, labelSm, card, neoBtn, neoBtnPrimary, input } from "@/lib/styles";
import { AdminHeader } from "@/components/admin-header";
import { AdminSearch } from "@/components/admin-search";
import { AdminPagination } from "@/components/admin-pagination";
import { ResponsiveTable } from "@/components/responsive-table";
import { StatusBadge } from "@/components/status-badge";
import type { OrderStatus, Order } from "@/lib/mock-dispatch";
import { dispatchSuppliers, allOrders, unassignedOrders } from "@/lib/mock-dispatch";

function STATUS_META(t: (k: string) => string): Record<OrderStatus, { label: string; color: string; text: string }> {
  return {
    pending: { label: t("admin.dispatch.filterPending"), color: "#FFF7D6", text: "#222" },
    printing: { label: t("admin.dispatch.filterPrinting"), color: "#FFD93D", text: "#222" },
    "quality-check": { label: t("admin.dispatch.filterQualityCheck"), color: "#9CB8A8", text: "#222" },
    shipped: { label: t("admin.dispatch.filterShipped"), color: "#5A8F4A", text: "#fff" },
  };
}

function formatCurrency(n: number) {
  return "$" + n.toLocaleString("en-US");
}

// ── Component ──────────────────────────────────────────────

export default function DispatchPage() {
  const { t } = useTranslation();
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [page, setPage] = useState(0);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignSearch, setAssignSearch] = useState("");
  const [assignChecked, setAssignChecked] = useState<Set<string>>(new Set());
  const perPage = 6;

  const filteredOrders = allOrders
    .filter((o) => !selectedSupplierId || o.supplierId === selectedSupplierId)
    .filter((o) => {
      const q = search.toLowerCase();
      return (
        !q ||
        o.id.toLowerCase().includes(q) ||
        o.customer.toLowerCase().includes(q) ||
        o.product.toLowerCase().includes(q)
      );
    })
    .filter((o) => statusFilter === "all" || o.status === statusFilter);

  const totalPages = Math.ceil(filteredOrders.length / perPage);
  const paged = filteredOrders.slice(page * perPage, (page + 1) * perPage);
  const selectedSupplier = selectedSupplierId ? dispatchSuppliers.find((s) => s.id === selectedSupplierId) : null;

  const statusMeta = STATUS_META(t);
  const counts = (["all", "pending", "printing", "quality-check", "shipped"] as const).map((s) => ({
    key: s,
    count: s === "all" ? allOrders.length : allOrders.filter((o) => o.status === s).length,
  }));

  const updateStatus = (id: string, status: OrderStatus) => {
    const o = allOrders.find((o) => o.id === id);
    if (o) o.status = status;
    setSelectedOrder((prev) => (prev?.id === id ? { ...prev, status } : prev));
  };

  const assignFiltered = unassignedOrders.filter((o) => {
    const q = assignSearch.toLowerCase();
    return !q || o.id.toLowerCase().includes(q) || o.product.toLowerCase().includes(q);
  });

  const toggleAssign = (id: string) => {
    setAssignChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="h-screen flex flex-col">
      <AdminHeader label={t("admin.dispatch.label")} title={t("admin.dispatch.title")}>
        <AdminSearch value={search} onChange={setSearch} placeholder={t("admin.dispatch.searchPlaceholder")} />
      </AdminHeader>

      <div className="flex-1 flex overflow-hidden">
        {/* ── LEFT PANEL: Suppliers ── */}
        <div className="w-[200px] shrink-0 border-r-[3px] border-[#222] overflow-y-auto bg-[#FFF7D6]/40 flex flex-col">
          <button
            onClick={() => {
              setSelectedSupplierId(null);
              setPage(0);
            }}
            className={`w-full text-left px-5 py-3.5 border-b-2 border-[#222]/10 font-bold text-sm transition-colors flex items-center justify-between ${
              selectedSupplierId === null ? "bg-[#FFF7D6]" : "hover:bg-[#FFF7D6]/60 text-[#444]"
            }`}
          >
            <span>{t("admin.dispatch.allOrders")}</span>
            <span className="font-mono text-[10px] text-[#999]">{allOrders.length}</span>
          </button>
          <div className="flex-1 overflow-y-auto">
            {dispatchSuppliers.map((s) => {
              const active = s.id === selectedSupplierId;
              return (
                <button
                  key={s.id}
                  onClick={() => {
                    setSelectedSupplierId(s.id);
                    setPage(0);
                  }}
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
          {selectedSupplier && (
            <div className="px-6 py-4 border-b-[3px] border-[#222] bg-[#FFF7D6]/60 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-base font-bold">{selectedSupplier.name}</p>
                  <p className={`${label} text-[#999] mt-0.5`}>
                    {selectedSupplier.contact} &middot; {selectedSupplier.email}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`${card} px-3 py-1.5`}>
                    <p className={`${label} text-[#999]`}>{t("admin.dispatch.debt")}</p>
                    <p className="text-sm font-bold">{formatCurrency(selectedSupplier.totalDebt)}</p>
                  </div>
                  <div className={`${card} px-3 py-1.5 ${selectedSupplier.overdueDebt > 0 ? "" : "opacity-50"}`}>
                    <p className={`${label} text-[#999]`}>{t("admin.dispatch.overdue")}</p>
                    <p className="text-sm font-bold text-[#B54843]">{formatCurrency(selectedSupplier.overdueDebt)}</p>
                  </div>
                  <div className={`${card} px-3 py-1.5`}>
                    <p className={`${label} text-[#999]`}>{t("admin.dispatch.mtd")}</p>
                    <p className="text-sm font-bold">{formatCurrency(selectedSupplier.monthDebt)}</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setAssignChecked(new Set());
                  setAssignSearch("");
                  setShowAssignModal(true);
                }}
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
                {counts.map(({ key, count }) => (
                  <button
                    key={key}
                    onClick={() => {
                      setStatusFilter(key as OrderStatus | "all");
                      setPage(0);
                    }}
                    className={`font-mono text-[8px] font-bold tracking-widest uppercase px-2 py-1 ${statusFilter === key ? neoBtnPrimary : neoBtn}`}
                  >
                    {key === "all"
                      ? t("admin.dispatch.filterAll")
                      : t(
                          `admin.dispatch.filter${key.replace(/-./g, (m) => m[1].toUpperCase()).replace(/^./, (m) => m.toUpperCase())}`,
                        )}{" "}
                    <span className={statusFilter === key ? "text-white/60" : "text-[#999]"}>({count})</span>
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
              <ResponsiveTable
                header={
                  <div
                    className="grid shrink-0 border-b-[3px] border-[#222]"
                    style={{ gridTemplateColumns: "110px 0.5fr 1fr 100px 120px 150px 120px" }}
                  >
                    {[
                      t("admin.dispatch.orderId"),
                      t("admin.dispatch.customer"),
                      t("admin.dispatch.product"),
                      t("admin.dispatch.amount"),
                      t("admin.dispatch.status"),
                      t("admin.dispatch.date"),
                      t("common.action"),
                    ].map((h) => (
                      <div key={h} className={`px-3 py-3 ${label} text-[#666] whitespace-nowrap`}>
                        {h}
                      </div>
                    ))}
                  </div>
                }
                gridCols={"110px 1fr 1fr 100px 120px 150px 80px"}
              >
                {paged.length === 0 ? (
                  <div className="flex items-center justify-center py-10">
                    <p className="font-bold text-[#999]">{t("admin.dispatch.noOrders")}</p>
                  </div>
                ) : (
                  paged.map((order) => (
                    <div
                      key={order.id}
                      className="grid hover:bg-[#FFF7D6]/60 transition-colors border-b-2 border-[#222]/10 items-center py-3"
                      style={{ gridTemplateColumns: "110px 0.5fr 1fr 100px 120px 150px 120px" }}
                    >
                      <div className="px-3 font-mono text-[10px] font-bold text-[#3B82F6] whitespace-nowrap">
                        {order.id}
                      </div>
                      <div className="px-3 text-sm font-bold whitespace-nowrap min-w-0 truncate">{order.customer}</div>
                      <div className="px-3 text-sm font-bold whitespace-nowrap min-w-0 truncate">{order.product}</div>
                      <div className="px-3 font-mono text-[10px] font-bold whitespace-nowrap">
                        {formatCurrency(order.amount)}
                      </div>
                      <div className="px-3">
                        <StatusBadge status={order.status} />
                      </div>
                      <div className="px-3 text-sm font-bold whitespace-nowrap min-w-0 truncate">{order.date}</div>
                      <div className="px-2">
                        <button onClick={() => setSelectedOrder(order)} className={`${neoBtn} p-1.5`}>
                          <Eye size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </ResponsiveTable>
              <AdminPagination
                hasNext={page < totalPages - 1}
                hasPrevious={page > 0}
                onNext={() => setPage((p) => p + 1)}
                onPrevious={() => setPage((p) => p - 1)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── ORDER DETAIL SLIDE-OVER ── */}
      {selectedOrder && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" />
          <div
            className="fixed top-0 right-0 bottom-0 z-50 bg-[#F8F2E5] flex flex-col overflow-hidden border-l-[3px] border-[#222]"
            style={{ width: 400 }}
          >
            <div className="flex items-center justify-between px-6 py-5 shrink-0 border-b-[3px] border-[#222]">
              <div>
                <p className={`${label} mb-1 text-[#666]`}>{selectedOrder.id}</p>
                <h2 className="text-xl font-bold truncate max-w-[280px]">{selectedOrder.product}</h2>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 hover:bg-[#e8e6e0] rounded-lg border-2 border-[#222] hover:translate-x-px hover:translate-y-[1px] transition-[transform,background-color]"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
              <div className="px-6 py-5 border-b-[3px] border-[#222]">
                <h3 className="text-sm text-[#666] mb-3">{t("admin.dispatch.status")}</h3>
                <div className="flex gap-2 flex-wrap">
                  {(Object.keys(statusMeta) as OrderStatus[]).map((s) => {
                    const active = selectedOrder.status === s;
                    const m = statusMeta[s];
                    return (
                      <button
                        key={s}
                        onClick={() => updateStatus(selectedOrder.id, s)}
                        className={`font-mono text-[9px] font-bold tracking-widest uppercase leading-none transition-[opacity,border-color] rounded-[6px] px-2.5 py-1.5 border-2 ${
                          active
                            ? "border-[#222] shadow-[2px_2px_0_#222] opacity-100"
                            : "border-transparent opacity-40 hover:opacity-70"
                        }`}
                        style={{ background: m.color, color: m.text }}
                      >
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="px-6 py-5 border-b-[3px] border-[#222]">
                <h3 className="text-sm text-[#666] mb-4">{t("admin.dispatch.customerInfo")}</h3>
                <div className="space-y-3">
                  {[
                    [t("admin.dispatch.name"), selectedOrder.customer],
                    [t("admin.dispatch.email"), selectedOrder.email],
                    [t("admin.dispatch.phone"), selectedOrder.phone],
                    [t("admin.dispatch.address"), selectedOrder.address],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <p className="font-mono text-[9px] font-bold mb-0.5 text-[#999]">{k}</p>
                      <p className="text-sm font-bold">{v || "—"}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="px-6 py-5 border-b-[3px] border-[#222]">
                <h3 className="text-sm text-[#666] mb-4">{t("admin.dispatch.orderDetails")}</h3>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    [t("admin.dispatch.pages"), `${selectedOrder.pages}${t("admin.dispatch.pp")}`],
                    [t("admin.dispatch.cover"), selectedOrder.cover],
                    [t("admin.dispatch.amount"), formatCurrency(selectedOrder.amount)],
                    [t("admin.dispatch.date"), selectedOrder.date],
                    [
                      t("admin.dispatch.supplierDetail"),
                      dispatchSuppliers.find((s) => s.id === selectedOrder.supplierId)?.name || "—",
                    ],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <p className="font-mono text-[9px] font-bold mb-0.5 text-[#999]">{k}</p>
                      <p className="font-mono text-[10px] font-bold capitalize">{v}</p>
                    </div>
                  ))}
                </div>
                {selectedOrder.notes && (
                  <div className="mt-4 p-3 bg-[#FFF7D6] rounded-lg border-2 border-[#222] shadow-[2px_2px_0_#222]">
                    <p className="font-mono text-[9px] font-bold mb-1 text-[#999]">{t("admin.dispatch.note")}</p>
                    <p className="text-sm font-bold">{selectedOrder.notes}</p>
                  </div>
                )}
              </div>

              <div className="px-6 py-5">
                <h3 className="text-sm text-[#666] mb-4">{t("admin.dispatch.timeline")}</h3>
                <div className="relative">
                  <div className="absolute left-[5px] top-2 bottom-2 w-[3px] bg-[#222]/20 rounded-full" />
                  <div className="space-y-4">
                    {selectedOrder.timeline.map((t, i) => (
                      <div key={i} className="flex items-start gap-4">
                        <div
                          className="shrink-0 w-3 h-3 rounded-full mt-1 relative z-10"
                          style={{
                            background: i === selectedOrder.timeline.length - 1 ? "#222" : "#FFF7D6",
                            border: "3px solid #222",
                          }}
                        />
                        <div>
                          <p className="text-sm font-bold">{t.label}</p>
                          <p className="font-mono text-[9px] font-bold mt-0.5 text-[#999]">{t.date}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 flex gap-3 shrink-0 border-t-[3px] border-[#222]">
              <button className={`${neoBtn} ${labelSm} py-3 px-4 shrink-0`}>{t("admin.dispatch.printLabel")}</button>
              <button className={`${neoBtn} ${labelSm} flex-1 py-3`}>{t("admin.dispatch.viewJournal")}</button>
              <button
                onClick={() => updateStatus(selectedOrder.id, "shipped")}
                className={`${neoBtnPrimary} flex-1 py-3`}
              >
                {t("admin.dispatch.markShipped")}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── ASSIGN ORDERS MODAL ── */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center">
          <div className={`${card} w-[520px] max-h-[80vh] flex flex-col`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b-[3px] border-[#222]">
              <div>
                <p className="font-bold text-sm">{t("admin.dispatch.assignOrders")}</p>
                <p className={`${label} text-[#999] mt-0.5`}>
                  {assignChecked.size} {t("admin.dispatch.selected", { count: assignChecked.size })}
                </p>
              </div>
              <button onClick={() => setShowAssignModal(false)} className="p-1 hover:opacity-60">
                <X size={16} />
              </button>
            </div>
            <div className="px-6 py-3 border-b-2 border-[#222]/10">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999]" />
                <input
                  type="text"
                  value={assignSearch}
                  onChange={(e) => setAssignSearch(e.target.value)}
                  placeholder={t("admin.dispatch.assignSearch")}
                  className={`${input} pl-9 py-2 text-xs`}
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-3 space-y-1 min-h-0">
              {assignFiltered.length === 0 ? (
                <p className="text-center py-8 text-[#999] font-bold">{t("admin.dispatch.noResults")}</p>
              ) : (
                assignFiltered.map((o) => {
                  const isChecked = assignChecked.has(o.id);
                  return (
                    <label
                      key={o.id}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                        isChecked ? "bg-[#222] text-white" : "hover:bg-[#FFF7D6]"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                          isChecked ? "bg-white border-white" : "border-[#222]"
                        }`}
                      >
                        {isChecked && <Check size={10} className="text-[#222]" />}
                      </div>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleAssign(o.id)}
                        className="hidden"
                      />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold ${isChecked ? "text-white" : "text-[#222]"}`}>{o.product}</p>
                        <p className={`font-mono text-[10px] ${isChecked ? "text-white/60" : "text-[#999]"}`}>
                          {o.id} &middot; {formatCurrency(o.amount)}
                        </p>
                      </div>
                      <StatusBadge status={o.status} />
                    </label>
                  );
                })
              )}
            </div>
            <div className="px-6 py-4 border-t-[3px] border-[#222]">
              <button
                disabled={assignChecked.size === 0}
                onClick={() => {
                  alert(
                    t("admin.dispatch.assignSuccess", {
                      count: assignChecked.size,
                      name: selectedSupplier?.name || t("admin.dispatch.supplier"),
                    }),
                  );
                  setShowAssignModal(false);
                }}
                className={`${neoBtnPrimary} w-full flex items-center justify-center gap-2 ${
                  assignChecked.size === 0 ? "opacity-40 pointer-events-none" : ""
                }`}
              >
                <Check size={14} />
                {t("admin.dispatch.confirmAssignment", { count: assignChecked.size })}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
