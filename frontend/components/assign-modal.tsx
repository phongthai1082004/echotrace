"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { NeoSelect } from "@/components/neo-select";
import { Modal } from "@/components/ui/modal";
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
    <Modal
      open
      onClose={onClose}
      title={t("admin.dispatch.assignTitle")}
      widthClass="w-[440px] max-w-[92vw]"
      zClass="z-[60]"
      actions={[
        {
          label: t("admin.dispatch.assignConfirm"),
          onClick: () => onSubmit(rows.filter((r) => r.supplierId > 0)),
          primary: true,
        },
      ]}
    >
      <div className="flex-1 overflow-y-auto space-y-3 max-h-[70vh] py-1">
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
              <NeoSelect
                value={String(rows[i].supplierId)}
                onChange={(v) => set(i, { supplierId: Number(v) })}
                placeholder={t("admin.dispatch.pickSupplier")}
                className="flex-1"
                options={suppliers.map((s) => ({ value: String(s.id), label: s.name }))}
              />
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
    </Modal>
  );
}
