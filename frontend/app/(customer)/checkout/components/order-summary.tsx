"use client";

import { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { label, card } from "@/lib/styles";
import { itemPrice } from "../_lib/utils";

export function OrderSummary({
  items,
  subtotalText,
  totalText,
  discountText,
  describe,
  children,
}: {
  items: any[];
  subtotalText: string;
  totalText: string;
  discountText?: string;
  describe: (item: any) => string;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div className={`${card} overflow-hidden`}>
      <div className="px-5 py-4 border-b-[3px] border-[#222]">
        <p className={`${label} text-[#666]`}>{t("customer.checkout.orderSummary")}</p>
      </div>
      <div className="px-5 pb-4 pt-3">
        {items.length > 0 && (
          <div className="space-y-3 mb-4 pb-4 border-b-[3px] border-[#222]">
            {items.map((item, i) => (
              <div key={i} className="flex justify-between items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold leading-tight truncate">{item.title}</p>
                  <p className="font-mono text-[10px] text-[#999] truncate">{describe(item)}</p>
                </div>
                <span className="font-mono text-xs font-bold shrink-0">x{item.quantity || 1}</span>
                <span className="font-mono text-xs font-bold shrink-0">
                  {(() => {
                    const p = itemPrice(item);
                    return p == null || isNaN(p)
                      ? t("customer.checkout.unknown")
                      : `₫${(p * (item.quantity || 1)).toLocaleString()}`;
                  })()}
                </span>
              </div>
            ))}
          </div>
        )}
        <div className="space-y-2.5">
          <div className="flex justify-between">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#666]">
              {t("customer.checkout.subtotal")}
            </span>
            <span className="font-mono text-sm font-bold">{subtotalText}</span>
          </div>

          {discountText && (
            <div className="flex justify-between">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#666]">
                {t("customer.checkout.discount")}
              </span>
              <span className="font-mono text-sm font-bold text-[#B54843]">−{discountText}</span>
            </div>
          )}

          <div className="flex justify-between pt-2 border-t-[3px] border-[#222]">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest">
              {t("customer.checkout.total")}
            </span>
            <span className="text-lg font-bold">{totalText}</span>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
