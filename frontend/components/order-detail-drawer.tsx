"use client";

import { useTranslation } from "react-i18next";
import { CloseButton } from "@/components/ui/close-button";
import Image from "next/image";
import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import type { ReactNode } from "react";
import { infoBox, neoBtnPrimary, neoBtn, neoBtnDanger, chip } from "@/lib/styles";
import type { OrderDTO, OrderStatus } from "@/lib/order.dto";
import { STATUS_META, mockTimeline, formatCurrency } from "@/lib/order-status";
import { AssignModal } from "@/components/assign-modal";

function Field({ label: k, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="font-mono text-[9px] font-bold mb-0.5 text-[#999]">{k}</p>
      <p className="text-sm font-bold break-words">{value || "—"}</p>
    </div>
  );
}

function Row({ label: k, value, valueClass = "" }: { label: string; value: ReactNode; valueClass?: string }) {
  return (
    <div className="flex justify-between">
      <span className="font-mono text-[10px] font-bold text-[#666]">{k}</span>
      <span className={`font-mono text-[10px] font-bold ${valueClass}`}>{value}</span>
    </div>
  );
}

/**
 * Drawer chi tiết đơn — dùng chung user (variant="user") và admin dispatch (variant="admin").
 * Design base theo trang orders của customer; admin bật thêm status editing,
 * supplier/shipping, tracking, userId/email, export invoice.
 */
export function OrderDetailDrawer({
  order,
  variant = "user",
  onUpdateStatus,
  onEvent,
  suppliers = [],
  onRequestPaymentLink,
  onCancelOrder,
  onRequestReturn,
  onApproveReturn,
  onMarkReshipped,
  onClose,
}: {
  order: OrderDTO;
  variant?: "user" | "admin";
  onUpdateStatus?: (id: number, status: OrderStatus) => void;
  onEvent?: (type: string, payload?: any) => Promise<void> | void;
  suppliers?: { id: number; name: string }[];
  onRequestPaymentLink?: (id: number) => Promise<{ qrCode?: string; checkoutUrl?: string }>;
  onCancelOrder?: (id: number) => Promise<{ refunded: boolean; amount: number }>;
  onRequestReturn?: (id: number, body: { reason?: string; items?: { index: number; quantity: number; defect?: string }[] }) => Promise<void>;
  onApproveReturn?: (id: number, body: { fault: "self" | "supplier" }) => Promise<void>;
  onMarkReshipped?: (id: number) => Promise<void>;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const admin = variant === "admin";
  const meta = STATUS_META(t);
  const m = meta[order.status];
  const items = order.orderItems ?? [];
  const remaining = Math.max(0, order.totalAmount - order.paidAmount);
  const [assignOpen, setAssignOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  // ponytail: mỗi item lỗi: chọn + số quyển + mô tả. index theo orderItems.
  const [returnItems, setReturnItems] = useState<{ index: number; quantity: number; defect: string }[]>([]);
  const [returnBusy, setReturnBusy] = useState(false);
  const [fault, setFault] = useState<"self" | "supplier">("self");
  const [returnApproveBusy, setReturnApproveBusy] = useState(false);
  const [reshippedBusy, setReshippedBusy] = useState(false);
  const canAssign = admin && !order.supplierId && (order.status === "paid" || order.status === "partially_paid") && order.paidAmount > 0;
  const cancellable = !admin && ["pending_payment", "paid", "partially_paid", "processing", "shipping"].includes(order.status);
  const refundable = (order.status === "paid" || order.status === "partially_paid") && order.paidAmount > 0;
  const [payLink, setPayLink] = useState<{ qrCode?: string; checkoutUrl?: string } | null>(null);
  const [loadingLink, setLoadingLink] = useState(false);
  useEffect(() => {
    setPayLink(null);
  }, [order.id]);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
      <div
        className={`fixed right-0 bottom-0 z-50 bg-[#F8F2E5] flex flex-col overflow-hidden border-t-[3px] border-l-[3px] border-[#222] w-full sm:w-[420px] ${
          admin ? "top-0" : "top-15"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 shrink-0 border-b-[3px] border-[#222]">
          <div className="min-w-0">
            <p className="font-mono text-[9px] font-bold tracking-widest uppercase mb-1 text-[#666]">
              {order.orderCode ?? `#${order.id}`}
            </p>
            <h2 className="text-xl font-bold truncate">
              {admin ? order.name || order.user?.name || "—" : t("customer.orders.orderDetails")}
            </h2>
          </div>
          <CloseButton onClick={onClose} size={16} className="shrink-0" />
        </div>

        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
          {/* ── Status + timeline ── */}
          <div className="px-6 py-5 border-b-[3px] border-[#222]">
            <div className={`flex items-center ${admin ? "justify-start gap-2 flex-wrap" : "justify-between"} mb-4`}>
              <p className="font-mono text-[9px] font-bold tracking-widest uppercase text-[#666]">
                {t("customer.orders.status")}
              </p>
              <span
                className={chip}
                style={{ background: m.color, color: m.text }}
              >
                {m.label}
              </span>
              {order.returnState && order.returnState !== "none" && (
                <span className={`${chip} ml-2`} style={{ background: "#FDE68A", color: "#222" }}>
                  {t(`customer.orders.return.${order.returnState}`)}
                </span>
              )}
            </div>

			<Timeline steps={mockTimeline(order.status, order.createdAt)} t={t} />
          </div>

          {/* ── Items ── */}
          <div className="px-6 py-5 border-b-[3px] border-[#222]">
            <p className="font-mono text-[9px] font-bold tracking-widest uppercase mb-4 text-[#666]">
              {t("customer.orders.items")}
            </p>
            <div className="space-y-3">
              {items.map((item, i) => (
                <div key={i} className={`flex gap-3 p-3 ${infoBox}`}>
                  <div className="w-14 h-18 rounded-md overflow-hidden bg-[#e8e6e0] shrink-0 border-2 border-[#222] shadow-[2px_2px_0_#222]">
                    {item.thumbnailUrl ? (
                      <Image src={item.thumbnailUrl} alt={item.title} width={56} height={72} className="object-cover" />
                    ) : null}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold mb-1">{item.title}</p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {item.cover && <span className={chip}>{item.cover}</span>}
                      {item.paper && <span className={chip}>{item.paper}</span>}
                      {item.paperSize && <span className={chip}>{item.paperSize}</span>}
                      {item.sku && (
                        <span className="font-mono text-[8px] font-bold text-[#999]">{item.sku}</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="font-mono text-[9px] font-bold text-[#666]">x{item.quantity}</span>
                      {item.price != null && (
                        <span className="font-mono text-[10px] font-bold">{item.price.toLocaleString("vi-VN")}₫</span>
                      )}
                    </div>
                    {admin && (
                      <div className="mt-1.5 font-mono text-[8px] font-bold text-[#999] flex flex-wrap items-center gap-2">
                        {item.supplierId != null && <span>SUP #{item.supplierId}</span>}
                        {item.costPrice != null && <span>COST {item.costPrice.toLocaleString("vi-VN")}₫</span>}
                        {item.reconciledAt && <span className="text-[#22C55E]">✓ paid</span>}
                        {item.deliveredAt && <span className="text-[#22C55E]">✓ giao</span>}
                        {order.status === "shipping" && !item.deliveredAt && onEvent && (
                          <button
                            onClick={() => onEvent("deliver", { itemIndices: [i] })}
                            className="border-2 border-[#222] rounded px-2 py-0.5 hover:bg-[#222] hover:text-white"
                          >
                            {t("admin.dispatch.deliverItem")}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Pay QR (pending, customer) ── */}
          {!admin && order.status === "pending_payment" && (order.qrCode || onRequestPaymentLink) && (
            <div className="px-6 py-5 border-b-[3px] border-[#222]">
              <p className="font-mono text-[9px] font-bold tracking-widest uppercase mb-3 text-[#666]">
                {t("customer.orders.payNow")}
              </p>
              <div className="flex flex-col items-center gap-3">
                {payLink?.qrCode || order.qrCode ? (
                  <>
                    <div className="p-3 bg-white border-2 border-[#222] shadow-[3px_3px_0_#222]">
                      <QRCodeSVG value={payLink?.qrCode ?? order.qrCode ?? ""} size={180} level="M" />
                    </div>
                  </>
                ) : (
                  <button
                    type="button"
                    className={neoBtn}
                    disabled={loadingLink}
                    onClick={async () => {
                      if (!onRequestPaymentLink) return;
                      setLoadingLink(true);
                      try {
                        const r = await onRequestPaymentLink(order.id);
                        setPayLink(r);
                      } finally {
                        setLoadingLink(false);
                      }
                    }}
                  >
                    {loadingLink ? "..." : t("customer.orders.genLink")}
                  </button>
                )}
                <p className="font-mono text-[8px] text-[#999] text-center">{t("customer.orders.payExpire")}</p>
              </div>
            </div>
          )}

          {/* ── Payment ── */}
          <div className="px-6 py-5 border-b-[3px] border-[#222]">
            <p className="font-mono text-[9px] font-bold tracking-widest uppercase mb-3 text-[#666]">
              {t("customer.orders.payment")}
            </p>
            <div className="space-y-2">
              <Row label={t("customer.orders.subtotal")} value={formatCurrency(order.subTotal)} />
              {order.discountAmount > 0 && (
                <Row
                  label={
                    order.couponCode ? `${t("customer.orders.discount")} (${order.couponCode})` : t("customer.orders.discount")
                  }
                  value={`-${formatCurrency(order.discountAmount)}`}
                  valueClass="text-[#5A8F4A]"
                />
              )}
              <div className="flex justify-between pt-2 border-t-[2px] border-[#222]">
                <span className="font-mono text-[10px] font-bold">{t("customer.orders.total")}</span>
                <span className="font-mono text-[12px] font-bold">{formatCurrency(order.totalAmount)}</span>
              </div>
              <Row label={t("customer.orders.paid")} value={formatCurrency(order.paidAmount)} valueClass="text-[#5A8F4A]" />
              {remaining > 0 && (
                <Row label={t("customer.orders.remaining")} value={formatCurrency(remaining)} valueClass="text-[#B54843]" />
              )}
              {admin && (
                <>
                  <Row label={t("admin.dispatch.deposit")} value={formatCurrency(order.depositAmount)} />
                  <Row
                    label={t("admin.dispatch.method")}
                    value={order.paymentType === "half-payment" ? t("admin.dispatch.payHalf") : t("admin.dispatch.payFull")}
                  />
                </>
              )}
            </div>
          </div>

          {/* ── Delivery ── */}
          <div className="px-6 py-5 border-b-[3px] border-[#222]">
            <p className="font-mono text-[9px] font-bold tracking-widest uppercase mb-3 text-[#666]">
              {t("customer.orders.delivery")}
            </p>
            <div className={admin ? "grid grid-cols-2 gap-x-4 gap-y-3" : "space-y-2"}>
              {[
                ["name", order.name],
                ["phone", order.phone],
                ...(admin
                  ? ([
                      ["email", order.user?.email],
                      ["userId", `#${order.userId}`],
                      ["trackingCode", order.trackingCode],
                    ] as [string, string | undefined][])
                  : []),
                ["address", order.address],
                ["city", order.city],
              ].map(([k, v]) =>
                admin ? (
                  <Field key={k} label={t(`admin.dispatch.${k}`)} value={v} />
                ) : (
                  <div key={k} className="flex justify-between">
                    <span className="font-mono text-[9px] font-bold text-[#999]">{t(`customer.orders.${k}`)}</span>
                    <span className="text-sm font-bold text-right">{v}</span>
                  </div>
                ),
              )}
            </div>
            {order.note && (
              <div className={`mt-3 p-3 ${infoBox}`}>
                <p className="font-mono text-[9px] font-bold mb-1 text-[#999]">{t("customer.orders.note")}</p>
                <p className="text-sm font-bold">{order.note}</p>
              </div>
            )}
          </div>

          {/* ── Supplier & shipping (admin only) ── */}
          {admin && (
            <div className="px-6 py-5 border-b-[3px] border-[#222]">
              <p className="font-mono text-[9px] font-bold tracking-widest uppercase mb-4 text-[#666]">
                {t("admin.dispatch.shipping")}
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                <Field label={t("admin.dispatch.supplierDetail")} value={order.supplier?.name} />
                <Field label={t("admin.dispatch.supplierContact")} value={order.supplier?.contact} />
                <Field
                  label={t("admin.dispatch.orderShippingFee")}
                  value={formatCurrency(order.orderShippingFee ?? 0)}
                />
                <Field
                  label={t("admin.dispatch.supplierShippingFee")}
                  value={formatCurrency(order.supplierShippingFee ?? 0)}
                />
                <Field label={t("admin.dispatch.created")} value={new Date(order.createdAt).toLocaleDateString()} />
                <Field label={t("admin.dispatch.updated")} value={new Date(order.updatedAt).toLocaleDateString()} />
              </div>
            </div>
          )}
        </div>

        {/* Footer — admin actions */}
        {admin && onEvent && (
          <div className="px-6 py-4 shrink-0 border-t-[3px] border-[#222] space-y-2">
            <div className="grid grid-cols-2 gap-2">
              {canAssign && (
                <button onClick={() => setAssignOpen(true)} className={`${neoBtnPrimary} py-2.5`}>
                  {t("admin.dispatch.assign")}
                </button>
              )}
              {(order.status === "processing" || order.status === "shipping") &&
                (() => {
                  const pendingItems = items.filter((it) => it.supplierId != null && !it.reconciledAt);
                  const canReconcile =
                    pendingItems.length > 0 &&
                    pendingItems.every((it) => it.costPrice != null && Number(it.costPrice) > 0);
                  if (pendingItems.length === 0) return null;
                  return (
                    <>
                      <button
                        onClick={() => onEvent("reconcile_supplier")}
                        disabled={!canReconcile}
                        className={`${neoBtn} py-2.5 disabled:opacity-40`}
                      >
                        {t("admin.dispatch.reconcileSupplier")}
                      </button>
                      {!canReconcile && (
                        <p className="col-span-2 font-mono text-[9px] font-bold text-[#B54843]">
                          {t("admin.dispatch.reconcileNeedCost")}
                        </p>
                      )}
                    </>
                  );
                })()}
              {order.status === "processing" && order.supplierId && (
                <button onClick={() => onEvent("ship")} className={`${neoBtn} py-2.5`}>
                  {t("admin.dispatch.ship")}
                </button>
              )}
              {order.status === "shipping" && (
                <button onClick={() => onEvent("deliver")} className={`${neoBtnPrimary} py-2.5`}>
                  {t("admin.dispatch.deliver")}
                </button>
              )}
              {order.status === "delivered" && order.paymentType === "half-payment" && !order.codReconciledAt && (
                <button onClick={() => onEvent("reconcile_cod")} className={`${neoBtn} py-2.5`}>
                  {t("admin.dispatch.reconcileCod")}
                </button>
              )}
              {refundable && (
                <button onClick={() => onEvent("refund")} className={`${neoBtnDanger} py-2.5`}>
                  {t("admin.dispatch.refund")}
                </button>
              )}
              {order.status === "refunding" && (
                <button onClick={() => onEvent("reconcile_refund")} className={`${neoBtn} py-2.5`}>
                  {t("admin.dispatch.reconcileRefund")}
                </button>
              )}
            </div>

            {order.returnState === "requested" && onApproveReturn && (
              <div className="p-3 border-2 border-[#222] rounded bg-white/40 space-y-2">
                <p className="font-mono text-[9px] font-bold tracking-widest uppercase text-[#666]">
                  {t("admin.dispatch.returnApproveTitle")}
                </p>
                <select
                  value={fault}
                  onChange={(e) => setFault(e.target.value as "self" | "supplier")}
                  className="w-full border-2 border-[#222] rounded px-2 py-1.5 text-xs font-bold bg-white"
                >
                  <option value="self">{t("admin.dispatch.returnFaultSelf")}</option>
                  <option value="supplier">{t("admin.dispatch.returnFaultSupplier")}</option>
                </select>
                <button
                  onClick={async () => {
                    setReturnApproveBusy(true);
                    try {
                      await onApproveReturn(order.id, { fault });
                    } finally {
                      setReturnApproveBusy(false);
                    }
                  }}
                  disabled={returnApproveBusy}
                  className={`${neoBtnPrimary} w-full py-2.5 disabled:opacity-50`}
                >
                  {returnApproveBusy ? "..." : t("admin.dispatch.returnApprove")}
                </button>
              </div>
            )}

            {order.returnState === "reshipping" && onMarkReshipped && (
              <button
                onClick={async () => {
                  setReshippedBusy(true);
                  try {
                    await onMarkReshipped(order.id);
                  } finally {
                    setReshippedBusy(false);
                  }
                }}
                disabled={reshippedBusy}
                className={`${neoBtnPrimary} w-full py-2.5 disabled:opacity-50`}
              >
                {reshippedBusy ? "..." : t("admin.dispatch.markReshipped")}
              </button>
            )}

            <button onClick={() => alert(t("admin.dispatch.invoiceExported"))} className={`${neoBtnPrimary} w-full py-3`}>
              {t("admin.dispatch.exportInvoice")}
            </button>
          </div>
        )}

        {/* Footer — user cancel */}
        {!admin && cancellable && onCancelOrder && (
          <div className="px-6 py-4 shrink-0 border-t-[3px] border-[#222]">
            <button
              onClick={() => setCancelOpen(true)}
              className="w-full py-3 border-2 border-[#B54843] text-[#B54843] font-bold rounded hover:bg-[#B54843]/10"
            >
              {t("customer.orders.cancelOrder")}
            </button>
          </div>
        )}

        {/* Footer — user return request */}
        {!admin &&
          (order.status === "delivered" || order.status === "shipping") &&
          (!order.returnState || order.returnState === "none") &&
          onRequestReturn && (
            <div className="px-6 py-4 shrink-0 border-t-[3px] border-[#222]">
              <button onClick={() => setReturnOpen(true)} className={`${neoBtn} w-full py-3`}>
                {t("customer.orders.requestReturn")}
              </button>
            </div>
          )}
      </div>

      {assignOpen && (
        <AssignModal
          order={order}
          suppliers={suppliers}
          onClose={() => setAssignOpen(false)}
          onSubmit={(rows) => {
            setAssignOpen(false);
            onEvent?.("assign", { items: rows });
          }}
        />
      )}

      {cancelOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-6"
          onClick={() => setCancelOpen(false)}
        >
          <div
            className="bg-[#F8F2E5] border-[3px] border-[#222] shadow-[4px_4px_0_#222] rounded-[10px] w-full max-w-[320px] p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-bold mb-1">{t("customer.orders.confirmCancel")}</p>
            <p className="font-mono text-[10px] text-[#666] mb-4">
              {refundable ? t("customer.orders.cancelRefundHint") : t("customer.orders.cancelNoRefundHint")}
            </p>
            <div className="flex gap-2">
              <button onClick={() => setCancelOpen(false)} className={`${neoBtn} flex-1 py-2.5`}>
                {t("customer.orders.cancel")}
              </button>
              <button
                onClick={async () => {
                  setCancelOpen(false);
                  await onCancelOrder?.(order.id);
                }}
                className="flex-1 py-2.5 border-2 border-[#B54843] text-[#B54843] font-bold rounded hover:bg-[#B54843]/10"
              >
                {t("customer.orders.confirm")}
              </button>
            </div>
          </div>
        </div>
      )}

      {returnOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-6"
          onClick={() => setReturnOpen(false)}
        >
          <div
            className="bg-[#F8F2E5] border-[3px] border-[#222] shadow-[4px_4px_0_#222] rounded-[10px] w-full max-w-[340px] p-5 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-bold mb-1">{t("customer.orders.requestReturn")}</p>
            <p className="font-mono text-[10px] text-[#666] mb-3">{t("customer.orders.return.hint")}</p>
            <div className="space-y-2 mb-3">
              {items.map((it, i) => {
                const sel = returnItems.find((r) => r.index === i);
                return (
                  <div key={i} className="border-2 border-[#222] rounded p-2 bg-white">
                    <label className="flex items-center gap-2 font-bold text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!sel}
                        onChange={(e) =>
                          setReturnItems((prev) =>
                            e.target.checked
                              ? [...prev, { index: i, quantity: it.quantity ?? 1, defect: "" }]
                              : prev.filter((r) => r.index !== i),
                          )
                        }
                      />
                      <span className="truncate">{it.title}</span>
                    </label>
                    {sel && (
                      <div className="mt-2 flex flex-col gap-2 pl-6">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold text-[#666]">{t("customer.orders.return.qty")}</span>
                          <input
                            type="number"
                            min={1}
                            max={it.quantity ?? 1}
                            value={sel.quantity}
                            onChange={(e) =>
                              setReturnItems((prev) =>
                                prev.map((r) => (r.index === i ? { ...r, quantity: Math.max(1, Number(e.target.value) || 1) } : r)),
                              )
                            }
                            className="w-16 border-2 border-[#222] rounded px-2 py-1 text-xs font-bold bg-white"
                          />
                        </div>
                        <input
                          type="text"
                          value={sel.defect}
                          onChange={(e) =>
                            setReturnItems((prev) => prev.map((r) => (r.index === i ? { ...r, defect: e.target.value } : r)))
                          }
                          placeholder={t("customer.orders.return.defectPlaceholder")}
                          className="w-full border-2 border-[#222] rounded px-2 py-1 text-xs bg-white"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <textarea
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              placeholder={t("customer.orders.return.reasonPlaceholder")}
              className="w-full border-2 border-[#222] rounded px-2 py-1.5 text-xs mb-4 bg-white"
              rows={2}
            />
            <div className="flex gap-2">
              <button onClick={() => setReturnOpen(false)} className={`${neoBtn} flex-1 py-2.5`}>
                {t("customer.orders.cancel")}
              </button>
              <button
                onClick={async () => {
                  if (returnItems.length === 0) {
                    alert(t("customer.orders.return.selectOne"));
                    return;
                  }
                  setReturnBusy(true);
                  try {
                    await onRequestReturn?.(order.id, { reason: returnReason, items: returnItems });
                    setReturnOpen(false);
                  } finally {
                    setReturnBusy(false);
                  }
                }}
                disabled={returnBusy}
                className={`flex-1 py-2.5 border-2 border-[#222] font-bold rounded hover:bg-[#222] hover:text-white disabled:opacity-50`}
              >
                {returnBusy ? "..." : t("customer.orders.return.submit")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Timeline({
  steps,
  t,
}: {
  steps: { labelKey: string; date: string; done: boolean }[];
  t: (k: string) => string;
}) {
  return (
    <div className="relative">
      <div className="absolute left-[5px] top-1 bottom-1 w-[3px] bg-[#222]/15 rounded-full" />
      <div className="space-y-3">
        {steps.map((step, i) => (
          <div key={i} className="flex items-start gap-3">
            <div
              className="shrink-0 w-3 h-3 rounded-full mt-1 relative z-10"
              style={{ background: step.done ? "#222" : "#FFF7D6", border: "3px solid #222" }}
            />
            <div className={step.done ? "" : "opacity-40"}>
              <p className="text-sm font-bold">{t(step.labelKey)}</p>
              {step.date && <p className="font-mono text-[9px] font-bold text-[#999] mt-0.5">{step.date}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
