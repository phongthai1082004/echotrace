"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { neoBtnPrimary, neoBtn, neoBtnDanger, input } from "@/lib/styles";
import { AssignModal } from "@/components/assign-modal";
import type { OrderDTO } from "@/lib/order.dto";

// ponytail: extracted from the order-detail-drawer god-component (A2).
// Owns the admin-only footer actions + the assign modal + its local state.
export function OrderAdminActions({
  order,
  suppliers = [],
  onEvent,
  onApproveReturn,
  onMarkReshipped,
  onMarkDefective,
  onResolveDefect,
}: {
  order: OrderDTO;
  suppliers?: { id: number; name: string }[];
  onEvent?: (type: string, payload?: any) => Promise<void> | void;
  onApproveReturn?: (id: number, body: { fault: "self" | "supplier" }) => Promise<void>;
  onMarkReshipped?: (id: number) => Promise<void>;
  onMarkDefective?: (id: number) => Promise<void> | void;
  onResolveDefect?: (id: number) => Promise<void> | void;
}) {
  const { t } = useTranslation();
  const items: any[] = order.orderItems ?? [];
  const [assignOpen, setAssignOpen] = useState(false);
  const [fault, setFault] = useState<"self" | "supplier">("self");
  const [returnApproveBusy, setReturnApproveBusy] = useState(false);
  const [reshippedBusy, setReshippedBusy] = useState(false);
  const [exported, setExported] = useState(false);

  const canAssign =
    !order.supplierId &&
    (order.status === "paid" || order.status === "partially_paid") &&
    order.paidAmount > 0;
  const refundable =
    (order.status === "paid" || order.status === "partially_paid") && order.paidAmount > 0;

  // ponytail: export thật (tải .txt hoá đơn) thay vì alert placeholder.
  const exportInvoice = () => {
    const lines = [
      `INVOICE ${order.orderCode ?? "#" + order.id}`,
      `Customer: ${order.name || order.user?.name || "?"}`,
      `Date: ${new Date(order.createdAt).toLocaleString()}`,
      "",
      ...items.map((it: any) => `• ${it.title} x${it.quantity} — ${Number(it.price ?? 0).toLocaleString("vi-VN")}₫`),
      "",
      `Total: ${order.totalAmount.toLocaleString("vi-VN")}₫`,
      `Paid:  ${order.paidAmount.toLocaleString("vi-VN")}₫`,
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoice-${order.orderCode ?? order.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setExported(true);
    setTimeout(() => setExported(false), 2000);
  };

  return (
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
            const canReconcile = pendingItems.length > 0 && pendingItems.every((it) => it.costPrice != null && Number(it.costPrice) > 0);
            if (pendingItems.length === 0) return null;
            return (
              <>
                <button onClick={() => onEvent?.("reconcile_supplier")} disabled={!canReconcile} className={`${neoBtn} py-2.5 disabled:opacity-40`}>
                  {t("admin.dispatch.reconcileSupplier")}
                </button>
                {!canReconcile && (
                  <p className="col-span-2 font-mono text-[9px] font-bold text-[#B54843]">{t("admin.dispatch.reconcileNeedCost")}</p>
                )}
              </>
            );
          })()}
        {order.status === "processing" && order.supplierId && (
          <button onClick={() => onEvent?.("ship")} className={`${neoBtn} py-2.5`}>
            {t("admin.dispatch.ship")}
          </button>
        )}
        {order.status === "shipping" && (
          <button onClick={() => onEvent?.("deliver")} className={`${neoBtnPrimary} py-2.5`}>
            {t("admin.dispatch.deliver")}
          </button>
        )}
        {order.status === "delivered" && order.paymentType === "half-payment" && !order.codReconciledAt && (
          <button onClick={() => onEvent?.("reconcile_cod")} className={`${neoBtn} py-2.5`}>
            {t("admin.dispatch.reconcileCod")}
          </button>
        )}
        {refundable && (
          <button onClick={() => onEvent?.("refund")} className={`${neoBtnDanger} py-2.5`}>
            {t("admin.dispatch.refund")}
          </button>
        )}
        {order.status === "pending_refund" && (
          <button onClick={() => onEvent?.("reconcile_refund")} className={`${neoBtn} py-2.5`}>
            {t("admin.dispatch.reconcileRefund")}
          </button>
        )}
        {order.status === "delivered" && (!order.defectState || order.defectState === "none") && onMarkDefective && (
          <button onClick={() => onMarkDefective(order.id)} className={`${neoBtn} py-2.5`}>
            {t("admin.dispatch.markDefective")}
          </button>
        )}
        {order.defectState === "reported" && onResolveDefect && (
          <button onClick={() => onResolveDefect(order.id)} className={`${neoBtnPrimary} py-2.5`}>
            {t("admin.dispatch.resolveDefect")}
          </button>
        )}
      </div>

      {order.returnState === "requested" && onApproveReturn && (
        <div className="p-3 border-2 border-[#222] rounded bg-white/40 space-y-2">
          <p className="font-mono text-[9px] font-bold tracking-widest uppercase text-[#666]">{t("admin.dispatch.returnApproveTitle")}</p>
          <select
            value={fault}
            onChange={(e) => setFault(e.target.value as "self" | "supplier")}
            className={input}
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

      <button onClick={exportInvoice} className={`${neoBtnPrimary} w-full py-3`}>
        {t("admin.dispatch.exportInvoice")}
      </button>
      {exported && (
        <p className="font-mono text-[9px] font-bold text-[#5A8F4A] text-center">{t("admin.dispatch.invoiceExported")}</p>
      )}

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
    </div>
  );
}
