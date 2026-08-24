"use client";

import { useId } from "react";
import { useTranslation } from "react-i18next";
import { labelSm, input } from "@/lib/styles";
import type { CheckoutForm } from "../hooks/use-checkout-form";

// autocomplete hints theo chuẩn HTML — hỗ trợ password manager/autofill.
const AUTOCOMPLETE: Partial<Record<keyof CheckoutForm, string>> = {
  name: "name",
  phone: "tel",
  address: "street-address",
  city: "address-level2",
};

export function DeliveryStep({
  form,
  setField,
}: {
  form: CheckoutForm;
  setField: (key: keyof CheckoutForm, value: string) => void;
}) {
  const { t } = useTranslation();
  const idName = useId();
  const idPhone = useId();
  const idAddress = useId();
  const idCity = useId();
  const idNote = useId();
  const ids: Record<keyof CheckoutForm, string> = {
    name: idName,
    phone: idPhone,
    address: idAddress,
    city: idCity,
    note: idNote,
  };

  const renderField = (labelKey: string, key: keyof CheckoutForm, type = "text", placeholderKey = "") => (
    <div key={key} className="flex-1">
      <label htmlFor={ids[key]} className={`${labelSm} block mb-1.5 text-[#666]`}>
        {t(labelKey)}
      </label>
      <input
        id={ids[key]}
        type={type}
        value={form[key]}
        onChange={(e) => setField(key, e.target.value)}
        placeholder={t(placeholderKey)}
        autoComplete={AUTOCOMPLETE[key]}
        className={input}
      />
    </div>
  );

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">{t("customer.checkout.deliveryTitle")}</h2>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {renderField("customer.checkout.fullName", "name", "text", "customer.checkout.namePlaceholder")}
          {renderField("customer.checkout.phoneNumber", "phone", "tel", "customer.checkout.phonePlaceholder")}
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          {renderField("customer.checkout.streetAddress", "address", "text", "customer.checkout.addressPlaceholder")}
          {renderField("customer.checkout.cityProvince", "city", "text", "customer.checkout.cityPlaceholder")}
        </div>
        <div>
          <label htmlFor={idNote} className={`${labelSm} block mb-1.5 text-[#666]`}>
            {t("customer.checkout.noteOptional")}
          </label>
          <textarea
            id={idNote}
            value={form.note}
            onChange={(e) => setField("note", e.target.value)}
            placeholder={t("customer.checkout.notePlaceholder")}
            className={`${input} resize-none h-24`}
          />
        </div>
      </div>
    </div>
  );
}
