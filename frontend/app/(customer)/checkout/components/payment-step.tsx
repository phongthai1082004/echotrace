"use client";

import { useTranslation } from "react-i18next";
import { itemThumb, itemPrice, priceText } from "../_lib/utils";

export function PaymentStep({ items, describe }: { items: any[]; describe: (item: any) => string }) {
  const { t } = useTranslation();
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">{t("customer.checkout.paymentTitle")}</h2>
      <div className="space-y-4">
        {items.map((item, i) => (
          <div
            key={i}
            className="flex items-center gap-4 p-4 bg-[#FFF7D6] rounded-[10px] border-[3px] border-[#222] shadow-[2px_2px_0_#222]"
          >
            <div className="w-16 h-20 bg-[#e8e6e0] rounded-[10px] border-[3px] border-[#222] shrink-0 overflow-hidden">
              {itemThumb(item) && <img src={itemThumb(item)!} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-lg font-bold leading-tight">{item.title}</p>
              <p className="font-mono text-[10px] text-[#999] mt-1">{describe(item)}</p>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <p className="font-mono text-sm font-bold">{priceText(itemPrice(item), t("customer.checkout.unknown"))}</p>
              <span className="font-mono text-[10px] font-bold text-[#999]">x{item.quantity || 1}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
