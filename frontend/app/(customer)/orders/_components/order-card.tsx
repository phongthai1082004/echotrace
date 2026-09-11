"use client";

import Image from "next/image";
import { useTranslation } from "react-i18next";
import { card, cardHover } from "@/lib/styles";
import { StatusBadge } from "@/components/status-badge";
import type { OrderDTO } from "@/lib/order.dto";

export function OrderCard({ order, onOpen }: { order: OrderDTO; onOpen: (o: OrderDTO) => void }) {
  const { t } = useTranslation();
  const items = order.orderItems ?? [];

  return (
    <div
      onClick={() => onOpen(order)}
      className={`shrink-0 w-60 sm:w-72 group cursor-pointer ${card} ${cardHover} overflow-hidden`}
    >
      <div className="aspect-[4/3] bg-[#e8e6e0] overflow-hidden relative">
        <div className="grid grid-cols-2 h-full">
          {items.slice(0, 2).map((item, i) => (
            <div key={item.bookId ?? i} className="relative overflow-hidden">
              {item.thumbnailUrl ? (
                <Image src={item.thumbnailUrl} alt={item.title} fill sizes="80px" className="object-cover" />
              ) : null}
            </div>
          ))}
          {items.length === 1 && (
            <div className="flex items-center justify-center bg-[#e8e6e0]">
              <span className="font-mono text-[8px] font-bold text-[#999]">
                {t("customer.orders.more", { count: 0 })}
              </span>
            </div>
          )}
        </div>
        <div className="absolute top-3 left-3">
          <StatusBadge status={order.status} />
        </div>
        <div className="absolute bottom-3 right-3">
          <span className="font-mono text-[9px] font-bold text-white bg-[#222]/70 px-2 py-0.5 rounded-md">
            {order.totalAmount.toLocaleString()}₫
          </span>
        </div>
      </div>
      <div className="p-4 border-t-[3px] border-[#222]">
        <div className="flex items-center justify-between mb-2">
          <p className="font-mono text-[9px] font-bold tracking-widest uppercase text-[#999]">{order.orderCode}</p>
          <p className="font-mono text-[9px] font-bold text-[#999]">{new Date(order.createdAt).toLocaleDateString()}</p>
        </div>
        <h3 className="text-base font-bold leading-tight mb-1">
          {items.map((i) => i.title).join(", ")}
        </h3>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-[9px] font-bold text-[#666]">
            {(items.reduce((s, i) => s + (i.pages ?? 0), 0))} {t("customer.orders.pages")}
          </span>
          <span className="text-[#222]">·</span>
          <span className="font-mono text-[9px] font-bold text-[#666]">
            {t("customer.orders.itemsCount", { count: items.length })}
          </span>
          <span className="text-[#222]">·</span>
          <span className="font-mono text-[9px] font-bold text-[#666]">
            {order.paymentType === "half-payment" ? t("customer.orders.deposit") : t("customer.orders.fullPayment")}
          </span>
        </div>
      </div>
    </div>
  );
}
