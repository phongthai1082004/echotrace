"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { label, card } from "@/lib/styles";
import type { CheckoutForm } from "../hooks/use-checkout-form";

export function ConfirmStep({ form }: { form: CheckoutForm }) {
  const { t } = useTranslation();
  const [orderCode] = useState(() => `TC-${Math.floor(Math.random() * 9000 + 1000)}`);
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-md">
        <p className={`${label} mb-3 text-[#666]`}>{t("customer.checkout.orderConfirmed")}</p>
        <h2 className="text-5xl lg:text-6xl font-bold mb-3">{orderCode}</h2>
        <p className="text-sm leading-relaxed mb-6 text-[#666]">
          {t("customer.checkout.thankYou", { name: form.name })}
        </p>
        <div className={`p-4 ${card}`}>
          {[
            ["customer.checkout.fullName", form.name],
            ["customer.checkout.phoneNumber", form.phone],
            ["customer.checkout.shipTo", `${form.address}, ${form.city}`],
            ["customer.checkout.estimated", t("customer.checkout.estimatedDays")],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between py-1.5 border-b-[2px] border-[#222] last:border-b-0">
              <span className="font-mono text-[10px] uppercase tracking-widest text-[#666]">{t(k)}</span>
              <span className="text-sm font-bold">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
