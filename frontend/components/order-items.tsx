"use client";

import Image from "next/image";
import { useTranslation } from "react-i18next";
import { infoBox, chip } from "@/lib/styles";
import type { OrderDTO } from "@/lib/order.dto";

// ponytail: extracted from the order-detail-drawer god-component (A2).
export function OrderItems({
  order,
  admin,
  onEvent,
}: {
  order: OrderDTO;
  admin: boolean;
  onEvent?: (type: string, payload?: any) => Promise<void> | void;
}) {
  const { t } = useTranslation();
  const items: any[] = order.orderItems ?? [];
  return (
    <div className="px-6 py-5 border-b-[3px] border-[#222]">
      <p className="font-mono text-[9px] font-bold tracking-widest uppercase mb-4 text-[#666]">{t("customer.orders.items")}</p>
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={item.bookId ?? i} className={`flex gap-3 p-3 ${infoBox}`}>
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
                {item.sku && <span className="font-mono text-[8px] font-bold text-[#999]">{item.sku}</span>}
              </div>
              <div className="flex items-center justify-between mt-1.5">
                <span className="font-mono text-[9px] font-bold text-[#666]">x{item.quantity}</span>
                {item.price != null && <span className="font-mono text-[10px] font-bold">{item.price.toLocaleString("vi-VN")}₫</span>}
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
  );
}
