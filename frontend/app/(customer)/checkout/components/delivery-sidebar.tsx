"use client";

import { useTranslation } from "react-i18next";
import { Tag } from "lucide-react";
import { neoBtn, neoBtnPrimary, labelSm } from "@/lib/styles";
import { OrderSummary } from "./order-summary";

export function DeliverySidebar({
  items,
  describe,
  subtotalText,
  totalText,
  discountText,
  payNowText,
  paymentMethod,
  onPaymentMethodChange,
  couponCode,
  onShowDiscount,
  onContinue,
  onBack,
  continueDisabled,
}: {
  items: any[];
  describe: (item: any) => string;
  subtotalText: string;
  totalText: string;
  discountText?: string;
  payNowText: string;
  paymentMethod: "full" | "half";
  onPaymentMethodChange: (m: "full" | "half") => void;
  couponCode: string | null;
  onShowDiscount: () => void;
  onContinue: () => void;
  onBack: () => void;
  continueDisabled?: boolean;
}) {
  const { t } = useTranslation();
  const radio = (value: "full" | "half", labelKey: string) => (
    <label
      className={`flex items-center gap-3 p-3 rounded-lg border-[3px] border-[#222] shadow-[2px_2px_0_#222] cursor-pointer transition-[transform,box-shadow] hover:translate-x-px hover:translate-y-px hover:shadow-[1px_1px_0_#222] ${paymentMethod === value ? "bg-[#222]" : "bg-white"}`}
    >
      <input
        type="radio"
        name="paymentMethod"
        value={value}
        checked={paymentMethod === value}
        onChange={() => onPaymentMethodChange(value)}
        className="sr-only"
      />
      <span
        className={`w-4 h-4 rounded-full border-[3px] flex items-center justify-center shrink-0 ${paymentMethod === value ? "border-white" : "border-[#222]"}`}
      >
        {paymentMethod === value && <span className="w-2 h-2 rounded-full bg-white" />}
      </span>
      <span className={`font-bold text-sm ${paymentMethod === value ? "text-white" : "text-[#222]"}`}>
        {t(labelKey)}
      </span>
    </label>
  );

  return (
    <OrderSummary items={items} subtotalText={subtotalText} totalText={totalText} discountText={discountText} describe={describe}>
      <div className="pt-4 mt-4 border-t-[3px] border-[#222]">
        <div className="flex justify-between">
          <span className="font-mono text-[10px] uppercase tracking-widest text-[#666]">
            {t("customer.checkout.paymentMethod")}
          </span>
          <span className="font-mono text-xs font-bold text-[#B54843]">
            −{paymentMethod === "half" ? payNowText : "₫0"}
          </span>
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="font-mono text-[10px] uppercase tracking-widest text-[#666]">
            {t("customer.checkout.payNow")}
          </span>
          <span className="text-lg font-bold">{payNowText}</span>
        </div>
      </div>
      <div className="pt-2 border-t-[2px] border-[#222]">
        <button
          onClick={onShowDiscount}
          className="flex items-center gap-1.5 font-mono text-[10px] font-semibold tracking-widest uppercase py-1 text-[#999] hover:text-[#222] transition-colors"
        >
          <Tag size={11} />
          {couponCode ? t("customer.checkout.changeCode") : t("customer.checkout.haveDiscount")}
        </button>
      </div>
      <div className="pt-4 mt-4 border-t-[3px] border-[#222]">
        <p className={`${labelSm} block mb-3 text-[#666]`}>{t("customer.checkout.paymentMethod")}</p>
        <div className="flex flex-col gap-2">
          {radio("full", "customer.checkout.paymentFull")}
          {radio("half", "customer.checkout.paymentHalf")}
        </div>
        <p className="font-mono text-[10px] text-[#B54843] mt-2">{t("customer.checkout.paymentHalfNote")}</p>
      </div>
      <div className="flex flex-col gap-2 pt-4 border-t-[3px] border-[#222] mt-4">
        <button
          onClick={onContinue}
          disabled={continueDisabled}
          className={`${neoBtnPrimary} w-full py-3 disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          {t("customer.checkout.continuePayment")}
        </button>
        <button onClick={onBack} className={`${neoBtn} ${labelSm} w-full py-3`}>
          {t("customer.checkout.back")}
        </button>
      </div>
    </OrderSummary>
  );
}
