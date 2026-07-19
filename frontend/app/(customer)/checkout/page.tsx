"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { DiscountModal } from "@/components/discount-modal";
import { Tag } from "lucide-react";
import { label, labelSm, card, neoBtnPrimary, neoBtn } from "@/lib/styles";

export default function CheckoutPage() {
  const { t } = useTranslation();
  const [step, setStep] = useState<"cart" | "delivery" | "payment" | "confirm">("cart");
  const [form, setForm] = useState({ name: "", phone: "", address: "", city: "", note: "" });
  const [discount, setDiscount] = useState<{ amount: number } | null>(null);
  const [showDiscount, setShowDiscount] = useState(false);

  const subtotal = 0;
  const shipping = 50000;
  const discountAmount = discount?.amount ?? 0;
  const total = Math.max(0, subtotal + shipping - discountAmount);

  const field = (labelKey: string, key: keyof typeof form, type = "text", placeholderKey = "") => (
    <div key={key}>
      <label className={`${labelSm} block mb-1.5 text-[#666]`}>{t(labelKey)}</label>
      <input type={type} value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} placeholder={t(placeholderKey)}
        className="w-full bg-[#FFF7D6] text-sm font-bold rounded-lg px-3 py-2.5 border-2 border-[#222] shadow-[2px_2px_0_#222] placeholder:text-[#999] focus:outline-none focus:translate-x-px focus:translate-y-px focus:shadow-[1px_1px_0_#222] transition-all" />
    </div>
  );

  return (
    <div className="min-h-screen pt-15">
      <div className="px-8 max-[1600px]:px-6 max-[1440px]:px-5 max-[1280px]:px-4 lg:px-16 py-10 max-[1600px]:py-8 max-[1440px]:py-6 border-b-[3px] border-[#222]">
        <p className={`${label} mb-1 text-[#666]`}>{t("customer.checkout.label")}</p>
        <h1 className="text-3xl lg:text-4xl font-bold">{t("customer.checkout.title")}</h1>
        <div className="flex items-center gap-4 mt-6">
          {(["cart", "delivery", "payment", "confirm"] as const).map((s, i) => (
            <div key={s} className="flex items-center gap-3">
              <div className="flex items-center gap-2" style={{ opacity: step === s ? 1 : 0.3 }}>
                <span className={`font-mono text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-md ${step === s ? "bg-[#222] text-white" : "border-2 border-[#222]"}`}>{i + 1}</span>
                <span className="font-mono text-[10px] font-bold tracking-widest uppercase hidden sm:block">{t(`customer.checkout.${s}`)}</span>
              </div>
              {i < 3 && <div className="w-6 h-[3px] bg-[#222]/20 rounded-full" />}
            </div>
          ))}
        </div>
      </div>

      <div className="px-8 max-[1600px]:px-6 max-[1440px]:px-5 max-[1280px]:px-4 lg:px-16 py-10 max-[1600px]:py-8 max-[1440px]:py-6 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-10 max-[1600px]:gap-8 max-[1440px]:gap-6">
        <div>
          {step === "cart" && (
            <div className="py-16 text-center">
              <p className="text-2xl font-bold mb-2">{t("customer.checkout.emptyTitle")}</p>
              <p className="font-mono text-[10px] font-bold tracking-widest uppercase text-[#999]">{t("customer.checkout.emptyDesc")}</p>
            </div>
          )}

          {step === "delivery" && (
            <div className="space-y-6 max-w-lg">
              <h2 className="text-2xl font-bold">{t("customer.checkout.deliveryTitle")}</h2>
              {field("customer.checkout.fullName", "name", "text", "customer.checkout.namePlaceholder")}
              {field("customer.checkout.phoneNumber", "phone", "tel", "customer.checkout.phonePlaceholder")}
              {field("customer.checkout.streetAddress", "address", "text", "customer.checkout.addressPlaceholder")}
              {field("customer.checkout.cityProvince", "city", "text", "customer.checkout.cityPlaceholder")}
              {field("customer.checkout.noteOptional", "note", "text", "customer.checkout.notePlaceholder")}
              <div className="flex gap-3 pt-1">
                <button onClick={() => setStep("cart")} className={`${neoBtn} ${labelSm} px-5 py-3`}>{t("customer.checkout.back")}</button>
                <button onClick={() => setStep("payment")} disabled={!form.name || !form.phone || !form.address || !form.city}
                  className={`${neoBtnPrimary} px-8 py-3 disabled:opacity-40`}>
                  {t("customer.checkout.continuePayment")}
                </button>
              </div>
            </div>
          )}

          {step === "payment" && (
            <div className="max-w-sm">
              <h2 className="text-2xl font-bold mb-5">{t("customer.checkout.paymentTitle")}</h2>
              <div className="p-4 mb-4 bg-white rounded-[10px] border-[3px] border-[#222] shadow-[4px_4px_0_#222]">
                <div className="w-44 h-44 mx-auto bg-[#222] flex items-center justify-center rounded-lg">
                  <svg width="128" height="128" viewBox="0 0 160 160">
                    {Array.from({ length: 20 }).map((_, row) => Array.from({ length: 20 }).map((_, col) => {
                      const on = ((row * 7 + col * 11 + row * col) % 3) !== 0;
                      return on ? <rect key={`${row}-${col}`} x={col * 8} y={row * 8} width={7} height={7} fill="#FDFBF7" /> : null;
                    }))}
                    {[[0,0],[0,120],[120,0]].map(([x,y],i) => (
                      <g key={i}>
                        <rect x={x} y={y} width={32} height={32} fill="#FDFBF7"/>
                        <rect x={x+4} y={y+4} width={24} height={24} fill="#1a1a1a"/>
                        <rect x={x+10} y={y+10} width={12} height={12} fill="#FDFBF7"/>
                      </g>
                    ))}
                  </svg>
                </div>
              </div>
               <p className={`${label} text-center mb-2 text-[#666]`}>{t("customer.checkout.scanInstruction")}</p>
              <p className="text-2xl font-bold text-center mb-5">₫{total.toLocaleString()}</p>
              <div className="space-y-2 mb-5 pt-4 border-t-[3px] border-[#222]">
                {[["customer.checkout.recipient", form.name], ["customer.checkout.phoneNumber", form.phone], ["customer.checkout.addressShort", `${form.address}, ${form.city}`]].map(([k,v]) => (
                  <div key={k} className="flex justify-between gap-4">
                    <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-[#666]">{t(k)}</span>
                    <span className="text-sm font-bold text-right">{v}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep("delivery")} className={`${neoBtn} ${labelSm} px-4 py-3`}>{t("customer.checkout.back")}</button>
                <button onClick={() => setStep("confirm")}
                  className={`${neoBtnPrimary} flex-1 py-3`}>{t("customer.checkout.confirmPayment")}</button>
              </div>
            </div>
          )}

          {step === "confirm" && (
            <div className="max-w-md py-8">
              <p className={`${label} mb-3 text-[#666]`}>{t("customer.checkout.orderConfirmed")}</p>
              <h2 className="text-4xl lg:text-5xl font-bold mb-3">TC-{Math.floor(Math.random() * 9000 + 1000)}</h2>
              <p className="text-sm leading-relaxed mb-6 text-[#666]">{t("customer.checkout.thankYou", { name: form.name })}</p>
              <div className={`p-4 mb-8 ${card}`}>
                {[["customer.checkout.fullName", form.name], ["customer.checkout.phoneNumber", form.phone], ["customer.checkout.shipTo", `${form.address}, ${form.city}`], ["customer.checkout.estimated", t("customer.checkout.estimatedDays")]].map(([k,v]) => (
                  <div key={k} className="flex justify-between py-1.5 border-b-[2px] border-[#222] last:border-b-0">
                    <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-[#666]">{t(k)}</span>
                    <span className="text-sm font-bold">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {step !== "confirm" && (
          <div>
            <div className={`${card} overflow-hidden`}>
              <div className="px-5 py-4 border-b-[3px] border-[#222]">
                <p className={`${label} text-[#666]`}>{t("customer.checkout.orderSummary")}</p>
              </div>
              <div className="px-5 pb-4 space-y-2 pt-3">
                <div className="flex justify-between">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#666]">Subtotal</span>
                  <span className="font-mono text-[10px] font-bold">₫{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#666]">{t("customer.checkout.shipping")}</span>
                  <span className="font-mono text-[10px] font-bold">₫{shipping.toLocaleString()}</span>
                </div>
                {discount && (
                  <div className="flex justify-between">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#5A8F4A]">{t("customer.checkout.payment")}</span>
                    <span className="font-mono text-[10px] font-bold text-[#5A8F4A]">-₫{discountAmount.toLocaleString()}</span>
                  </div>
                )}
                <div className="pt-2 border-t-[2px] border-[#222]">
                  <button onClick={() => setShowDiscount(true)}
                    className="flex items-center gap-1.5 font-mono text-[9px] font-bold tracking-widest uppercase py-1 text-[#999] hover:text-[#222] transition-colors">
                    <Tag size={11} />
                    {discount ? t("customer.checkout.changeCode") : t("customer.checkout.haveDiscount")}
                  </button>
                </div>
                <div className="flex justify-between pt-2 border-t-[3px] border-[#222]">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-widest">Total</span>
                  <span className="text-xl font-bold">₫{total.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <DiscountModal open={showDiscount} onClose={() => setShowDiscount(false)} subtotal={subtotal} />
    </div>
  );
}
