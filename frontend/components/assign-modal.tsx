"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CloseButton } from "@/components/ui/close-button";
import { neoBtnPrimary, chip, input } from "@/lib/styles";
import type { OrderDTO } from "@/lib/order.dto";

export function AssignModal({
  order,
  suppliers,
  onClose,
  onSubmit,
}: {
  order: OrderDTO;
  suppliers: { id: number; name: string }[];
  onClose: () => void;
  onSubmit: (items: { itemIndex: number; supplierId: number; costPrice: number }[]) => void;
}) {
  const { t } = useTranslation();
  const items = order.orderItems ?? [];
  const [rows, setRows] = useState(
    items.map((it, i) => ({
      itemIndex: i,
      supplierId: it.supplierId ?? 0,
      costPrice: it.costPrice ?? 0,
    })),
  );

  const set = (i: number, patch: Partial<{ supplierId: number; costPrice: number }>) =>
    setRows((cur) => cur.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/40" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] w-[440px] max-w-[92vw] max-h-[85vh] overflow-hidden bg-[#F8F2E5] border-[3px] border-[#222] rounded-xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b-[3px] border-[#222] shrink-0">
          <h3 className="text-lg font-bold">{t("admin.dispatch.assignTitle")}</h3>
          <CloseButton onClick={onClose} size={16} />
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {items.map((it, i) => (
            <div key={i} className="p-3 border-2 border-[#222] rounded-lg bg-[#FFF7D6]/40">
              <p className="text-sm font-bold mb-1">{it.title}</p>
              <div className="flex items-center gap-1.5 flex-wrap mb-2">
                {it.cover && <span className={chip}>{it.cover}</span>}
                {it.paper && <span className={chip}>{it.paper}</span>}
                {it.paperSize && <span className={chip}>{it.paperSize}</span>}
                {it.sku && <span className="font-mono text-[8px] font-bold text-[#999]">{it.sku}</span>}
              </div>
              <div className="flex gap-2">
                <select
                  value={rows[i].supplierId}
                  onChange={(e) => set(i, { supplierId: Number(e.target.value) })}
                  className={`${input} flex-1 cursor-pointer`}
                >
                  <option value={0}>{t("admin.dispatch.pickSupplier")}</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={0}
                  value={rows[i].costPrice}
                  onChange={(e) => set(i, { costPrice: Number(e.target.value) })}
                  placeholder={t("admin.dispatch.costPrice")}
                  className={`${input} w-28`}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 py-4 border-t-[3px] border-[#222] shrink-0">
          <button
            onClick={() => onSubmit(rows.filter((r) => r.supplierId > 0))}
            className={`${neoBtnPrimary} w-full py-3`}
          >
            {t("admin.dispatch.assignConfirm")}
          </button>
        </div>
      </div>
    </>
  );
}
