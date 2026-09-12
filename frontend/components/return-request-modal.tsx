"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { neoBtn, input } from "@/lib/styles";
import type { OrderDTO } from "@/lib/order.dto";

// ponytail: extracted from the order-detail-drawer god-component (A2).
// Owns the user return-request modal + its local state.
export function ReturnRequestModal({
  open,
  order,
  onRequestReturn,
  onClose,
}: {
  open: boolean;
  order: OrderDTO;
  onRequestReturn?: (id: number, body: { reason?: string; items?: { index: number; quantity: number; defect: string }[] }) => Promise<void>;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const items: any[] = order.orderItems ?? [];
  const [returnItems, setReturnItems] = useState<{ index: number; quantity: number; defect: string }[]>([]);
  const [returnReason, setReturnReason] = useState("");
  const [returnBusy, setReturnBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-6">
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
                    onChange={(e) => {
                      setError(null);
                      setReturnItems((prev) =>
                        e.target.checked
                          ? [...prev, { index: i, quantity: it.quantity ?? 1, defect: "" }]
                          : prev.filter((r) => r.index !== i),
                      );
                    }}
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
                        className={`${input} !w-16 !py-1 !text-xs`}
                      />
                    </div>
                    <input
                      type="text"
                      value={sel.defect}
                      onChange={(e) => setReturnItems((prev) => prev.map((r) => (r.index === i ? { ...r, defect: e.target.value } : r)))}
                      placeholder={t("customer.orders.return.defectPlaceholder")}
                      className={input}
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
          className={`${input} mb-4`}
          rows={2}
        />
        {error && <p className="font-mono text-[10px] font-bold text-[#B54843] mb-2">{error}</p>}
        <div className="flex gap-2">
          <button onClick={onClose} className={`${neoBtn} flex-1 py-2.5`}>
            {t("customer.orders.cancel")}
          </button>
          <button
            onClick={async () => {
              if (returnItems.length === 0) {
                setError(t("customer.orders.return.selectOne"));
                return;
              }
              setError(null);
              setReturnBusy(true);
              try {
                await onRequestReturn?.(order.id, { reason: returnReason, items: returnItems });
                onClose();
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
  );
}
