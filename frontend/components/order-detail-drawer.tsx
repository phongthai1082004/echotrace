"use client";

import { useTranslation } from "react-i18next";
import { CloseButton } from "@/components/ui/close-button";
import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import type { ReactNode } from "react";
import { infoBox, neoBtn, chip } from "@/lib/styles";
import type { OrderDTO, OrderStatus } from "@/lib/order.dto";
import { STATUS_META, mockTimeline, formatCurrency } from "@/lib/order-status";
import { OrderItems } from "@/components/order-items";
import { OrderAdminActions } from "@/components/order-admin-actions";
import { ReturnRequestModal } from "@/components/return-request-modal";

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
  onReportDefect,
  onMarkDefective,
  onResolveDefect,
  onClose,
}: {
  order: OrderDTO;
  variant?: "user" | "admin";
  onUpdateStatus?: (id: number, status: OrderStatus) => void;
  onEvent?: (type: string, payload?: any) => Promise<void> | void;
  suppliers?: { id: number; name: string }[];
  onRequestPaymentLink?: (id: number) => Promise<{ qrCode?: string; checkoutUrl?: string }>;
  onCancelOrder?: (id: number) => Promise<{ refunded: boolean; amount: number }>;
  onRequestReturn?: (id: number, body: { reason?: string; items?: { index: number; quantity: number; defect: string }[] }) => Promise<void>;
  onApproveReturn?: (id: number, body: { fault: "self" | "supplier" }) => Promise<void>;
  onMarkReshipped?: (id: number) => Promise<void>;
  onReportDefect?: (id: number) => Promise<void> | void;
  onMarkDefective?: (id: number) => Promise<void> | void;
  onResolveDefect?: (id: number) => Promise<void> | void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const admin = variant === "admin";
  const meta = STATUS_META(t);
  const m = meta[order.status];
  const remaining = Math.max(0, order.totalAmount - order.paidAmount);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
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
              <span className={chip} style={{ background: m.color, color: m.text }}>
                {m.label}
              </span>
              {order.returnState && order.returnState !== "none" && (
                <span className={`${chip} ml-2`} style={{ background: "#FDE68A", color: "#222" }}>
                  {t(`customer.orders.return.${order.returnState}`)}
                </span>
              )}
              {order.defectState && order.defectState !== "none" && (
                <span className={`${chip} ml-2`} style={{ background: "#FCA5A5", color: "#222" }}>
                  {t(`customer.orders.defect.${order.defectState}`)}
                </span>
              )}
            </div>

            <Timeline steps={mockTimeline(order.status, order.createdAt)} t={t} />
          </div>

          {/* ── Items ── */}
          <OrderItems order={order} admin={admin} onEvent={onEvent} />

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
                <Field label={t("admin.dispatch.orderShippingFee")} value={formatCurrency(order.orderShippingFee ?? 0)} />
                <Field label={t("admin.dispatch.supplierShippingFee")} value={formatCurrency(order.supplierShippingFee ?? 0)} />
                <Field label={t("admin.dispatch.created")} value={new Date(order.createdAt).toLocaleDateString()} />
                <Field label={t("admin.dispatch.updated")} value={new Date(order.updatedAt).toLocaleDateString()} />
              </div>
            </div>
          )}
        </div>

        {/* Footer — admin actions */}
        {admin && onEvent && (
          <OrderAdminActions
            order={order}
            suppliers={suppliers}
            onEvent={onEvent}
            onApproveReturn={onApproveReturn}
            onMarkReshipped={onMarkReshipped}
            onMarkDefective={onMarkDefective}
            onResolveDefect={onResolveDefect}
          />
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

        {/* Footer — user report defect (after delivered) */}
        {!admin &&
          order.status === "delivered" &&
          (!order.defectState || order.defectState === "none") &&
          onReportDefect && (
            <div className="px-6 py-4 shrink-0 border-t-[3px] border-[#222]">
              <button onClick={() => onReportDefect(order.id)} className={`${neoBtn} w-full py-3`}>
                {t("customer.orders.reportDefect")}
              </button>
            </div>
          )}
      </div>

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

      <ReturnRequestModal open={returnOpen} order={order} onRequestReturn={onRequestReturn} onClose={() => setReturnOpen(false)} />
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
          <div key={step.labelKey} className="flex items-start gap-3">
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
