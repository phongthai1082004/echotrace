"use client";

import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { CloseButton } from "@/components/ui/close-button";
import { label, neoBtnPrimary, infoBox } from "@/lib/styles";
import type { Order, OrderStatus } from "@/lib/mock-dispatch";
import { totalCopies, remainingAmount, dispatchSuppliers } from "@/lib/mock-dispatch";
import { STATUS_META, formatCurrency } from "../_lib/utils";

function Field({ label: k, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="font-mono text-[9px] font-bold mb-0.5 text-[#999]">{k}</p>
      <p className="text-sm font-bold break-words">{value || "—"}</p>
    </div>
  );
}

export function OrderDetailDrawer({
  order,
  onUpdateStatus,
  onClose,
}: {
  order: Order;
  onUpdateStatus: (id: string, status: OrderStatus) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const statusMeta = STATUS_META(t);
  const supplier = dispatchSuppliers.find((s) => s.id === order.supplierId);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" />
      <div
        className="fixed top-0 right-0 bottom-0 z-50 bg-[#F8F2E5] flex flex-col overflow-hidden border-l-[3px] border-[#222]"
        style={{ width: 400 }}
      >
        {}
        <div className="flex items-center justify-between px-6 py-5 shrink-0 border-b-[3px] border-[#222]">
          <div>
            <p className={`${label} mb-1 text-[#666]`}>{order.id}</p>
            <h2 className="text-xl font-bold truncate max-w-[280px]">{order.customer || "—"}</h2>
            <p className={`${label} mt-1 text-[#999]`}>
              {t("admin.dispatch.orderSummary", {
                books: order.items.length,
                copies: totalCopies(order),
              })}
            </p>
          </div>
          <CloseButton onClick={onClose} />
        </div>

        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
          {/* ── 1. Books ── */}
          <div className="px-6 py-5 border-b-[3px] border-[#222]">
            <h3 className="text-sm text-[#666] mb-4">{t("admin.dispatch.books")}</h3>
            <div className="space-y-2">
              {order.items.map((item, i) => (
                <div key={i} className="border-2 border-[#222]/10 rounded-lg px-3.5 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-bold leading-snug min-w-0">{item.title}</p>
                    <span className="shrink-0 font-mono text-[10px] font-bold bg-[#FFF7D6] border-2 border-[#222] rounded-full px-2 py-0.5">
                      ×{item.quantity}
                    </span>
                  </div>
                  <p className="font-mono text-[9px] font-bold text-[#999] mt-1">
                    {item.pages}
                    {t("admin.dispatch.pp")} &middot;{" "}
                    {item.cover === "hardcover" ? t("admin.dispatch.hardcover") : t("admin.dispatch.softcover")}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* ── 2. Status ── */}
          <div className="px-6 py-5 border-b-[3px] border-[#222]">
            <h3 className="text-sm text-[#666] mb-3">{t("admin.dispatch.status")}</h3>
            <div className="flex gap-2 flex-wrap">
              {(Object.keys(statusMeta) as OrderStatus[]).map((s) => {
                const active = order.status === s;
                const m = statusMeta[s];
                return (
                  <button
                    key={s}
                    onClick={() => onUpdateStatus(order.id, s)}
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

            {order.timeline.length > 0 && (
              <>
                <h3 className="text-sm text-[#666] mt-5 mb-4">{t("admin.dispatch.timeline")}</h3>
                <div className="relative">
                  <div className="absolute left-[5px] top-2 bottom-2 w-[3px] bg-[#222]/20 rounded-full" />
                  <div className="space-y-4">
                    {order.timeline.map((tl, i) => (
                      <div key={i} className="flex items-start gap-4">
                        <div
                          className="shrink-0 w-3 h-3 rounded-full mt-1 relative z-10"
                          style={{
                            background: i === order.timeline.length - 1 ? "#222" : "#FFF7D6",
                            border: "3px solid #222",
                          }}
                        />
                        <div>
                          <p className="text-sm font-bold">{tl.label}</p>
                          <p className="font-mono text-[9px] font-bold mt-0.5 text-[#999]">{tl.date}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ── 3. Customer & delivery ── */}
          <div className="px-6 py-5 border-b-[3px] border-[#222]">
            <h3 className="text-sm text-[#666] mb-4">{t("admin.dispatch.delivery")}</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <Field label={t("admin.dispatch.userId")} value={`#${order.userId}`} />
              <Field label={t("admin.dispatch.name")} value={order.customer} />
              <Field label={t("admin.dispatch.email")} value={order.email} />
              <Field label={t("admin.dispatch.phone")} value={order.phone} />
              <div className="col-span-2">
                <Field
                  label={t("admin.dispatch.address")}
                  value={[order.address, order.city].filter(Boolean).join(", ")}
                />
              </div>
              <Field label={t("admin.dispatch.trackingCode")} value={order.trackingCode} />
            </div>
          </div>

          {/* ── 4. Payment ── */}
          <div className="px-6 py-5 border-b-[3px] border-[#222]">
            <h3 className="text-sm text-[#666] mb-4">{t("admin.dispatch.payment")}</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <Field label={t("admin.dispatch.subtotal")} value={formatCurrency(order.subTotal)} />
              <Field label={t("admin.dispatch.discount")} value={formatCurrency(order.discountAmount)} />
              <Field
                label={t("admin.dispatch.coupon")}
                value={order.couponCode ? `${order.couponCode} (-${formatCurrency(order.discountAmount)})` : null}
              />
              <Field label={t("admin.dispatch.total")} value={formatCurrency(order.totalAmount)} />
              <Field label={t("admin.dispatch.deposit")} value={formatCurrency(order.depositAmount)} />
              <Field label={t("admin.dispatch.paid")} value={formatCurrency(order.paidAmount)} />
              <Field label={t("admin.dispatch.remaining")} value={formatCurrency(remainingAmount(order))} />
              <Field
                label={t("admin.dispatch.method")}
                value={
                  order.paymentType === "HALF" ? t("admin.dispatch.payHalf") : t("admin.dispatch.payFull")
                }
              />
              <div className="col-span-2">
                <Field
                  label={t("admin.dispatch.paymentStatus")}
                  value={
                    order.paymentStatus === "PAID"
                      ? t("statusBadge.paid")
                      : order.paymentStatus === "PARTIAL"
                        ? t("statusBadge.partial")
                        : t("statusBadge.unpaid")
                  }
                />
              </div>
            </div>
          </div>

          {/* ── 5. Shipping & supplier ── */}
          <div className="px-6 py-5 border-b-[3px] border-[#222]">
            <h3 className="text-sm text-[#666] mb-4">{t("admin.dispatch.shipping")}</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <Field label={t("admin.dispatch.supplierDetail")} value={supplier?.name} />
              <Field label={t("admin.dispatch.orderShippingFee")} value={formatCurrency(order.orderShippingFee ?? 0)} />
              <Field
                label={t("admin.dispatch.supplierShippingFee")}
                value={formatCurrency(order.supplierShippingFee ?? 0)}
              />
              <Field label={t("admin.dispatch.created")} value={order.date} />
              <Field label={t("admin.dispatch.updated")} value={order.updatedAt} />
            </div>
          </div>

          {/* ── 6. Note ── */}
          {order.notes && (
            <div className="px-6 py-5">
              <div className={`p-3 ${infoBox}`}>
                <p className="font-mono text-[9px] font-bold mb-1 text-[#999]">{t("admin.dispatch.note")}</p>
                <p className="text-sm font-bold">{order.notes}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer — single action */}
        <div className="px-6 py-4 shrink-0 border-t-[3px] border-[#222]">
          <button onClick={() => alert(t("admin.dispatch.invoiceExported"))} className={`${neoBtnPrimary} w-full py-3`}>
            {t("admin.dispatch.exportInvoice")}
          </button>
        </div>
      </div>
    </>
  );
}
