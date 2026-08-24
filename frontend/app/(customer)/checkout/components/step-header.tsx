"use client";

import { useTranslation } from "react-i18next";
import { label } from "@/lib/styles";

const steps = ["cart", "delivery", "payment", "confirm"] as const;
export type CheckoutStep = (typeof steps)[number];

export function StepHeader({ step }: { step: CheckoutStep }) {
  const { t } = useTranslation();
  return (
    <div className="px-8 max-[1600px]:px-6 max-[1440px]:px-5 max-[1280px]:px-4 lg:px-16 py-10 max-[1600px]:py-8 max-[1440px]:py-6 border-b-[3px] border-[#222]">
      <p className={`${label} mb-1 text-[#666]`}>{t("customer.checkout.label")}</p>
      <h1 className="text-3xl lg:text-4xl font-bold">{t("customer.checkout.title")}</h1>
      <div className="flex items-center gap-4 mt-6">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-3">
            <div className="flex items-center gap-2" style={{ opacity: step === s ? 1 : 0.3 }}>
              <span
                className={`font-mono text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-md ${step === s ? "bg-[#222] text-white" : "border-2 border-[#222]"}`}
              >
                {i + 1}
              </span>
              <span className="font-mono text-[10px] font-bold tracking-widest uppercase hidden sm:block">
                {t(`customer.checkout.${s}`)}
              </span>
            </div>
            {i < steps.length - 1 && <div className="w-6 h-[3px] bg-[#222]/20 rounded-full" />}
          </div>
        ))}
      </div>
    </div>
  );
}
