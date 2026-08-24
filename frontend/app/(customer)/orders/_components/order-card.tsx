"use client";

import Image from "next/image";
import { useTranslation } from "react-i18next";
import { card, cardHover } from "@/lib/styles";
import { statusMeta, type Order } from "../_lib/mock-orders";

export function OrderCard({ order, onOpen }: { order: Order; onOpen: (o: Order) => void }) {
  const { t } = useTranslation();
  const m = statusMeta[order.status];

  return (
    <div
      onClick={() => onOpen(order)}
      className={`shrink-0 w-72 group cursor-pointer ${card} ${cardHover} overflow-hidden`}
    >
      <div className="aspect-[4/3] bg-[#e8e6e0] overflow-hidden relative">
        <div className="grid grid-cols-2 h-full">
          {order.items.slice(0, 2).map((item) => (
            <div key={item.id} className="relative overflow-hidden">
              <Image src={item.coverUrl ?? ""} alt={item.bookTitle} fill sizes="80px" className="object-cover" />
            </div>
          ))}
          {order.items.length === 1 && (
            <div className="flex items-center justify-center bg-[#e8e6e0]">
              <span className="font-mono text-[8px] font-bold text-[#999]">
                {t("customer.orders.more", { count: order.items.length - 1 })}
              </span>
            </div>
          )}
        </div>
        <div className="absolute top-3 left-3">
          <span
            className="font-mono text-[9px] font-bold tracking-widest uppercase px-2 py-1 rounded-md"
            style={{ background: m.bg, color: m.text }}
          >
            {t(`customer.orders.statuses.${m.label}`)}
          </span>
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
          <p className="font-mono text-[9px] font-bold text-[#999]">{order.date}</p>
        </div>
        <h3 className="text-base font-bold leading-tight mb-1">
          {order.items.map((i) => i.bookTitle).join(", ")}
        </h3>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-[9px] font-bold text-[#666]">
            {order.items.reduce((s, i) => s + i.pages, 0)} {t("customer.orders.pages")}
          </span>
          <span className="text-[#222]">·</span>
          <span className="font-mono text-[9px] font-bold text-[#666]">
            {t("customer.orders.itemsCount", { count: order.items.length })}
          </span>
          <span className="text-[#222]">·</span>
          <span className="font-mono text-[9px] font-bold text-[#666]">
            {order.paymentMethod === "DEPOSIT" ? t("customer.orders.deposit") : t("customer.orders.fullPayment")}
          </span>
        </div>
      </div>
    </div>
  );
}
