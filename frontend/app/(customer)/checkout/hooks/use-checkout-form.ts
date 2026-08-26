"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api.fetch";

export type CheckoutForm = { name: string; 
  phone: string; 
  address: string; 
  city: string; 
  note: string 
};

export function useCheckoutForm(token?: string) {
  const [form, setForm] = useState<CheckoutForm>(
    { 
      name: "", 
      phone: "", 
      address: "", 
      city: "", 
      note: "" 
    }
  );

  useEffect(() => {
    if (!token) return;
    apiFetch<any>("/api/user/profile", token)
      .then((u) => {
        if (u)
          setForm((f) => ({
            ...f,
            name: u.name || "",
            phone: u.phone || "",
            address: u.address || "",
            city: u.city || "",
          }));
      })
      .catch(() => {});
  }, [token]);

  const setField = (key: keyof CheckoutForm, value: string) => setForm((f) => ({ ...f, [key]: value }));

  return { form, setField };
}

// ponytail: validate thông tin khách ở frontend (backend cũng validate) — trả map field → i18n key
export function validateCheckoutForm(form: CheckoutForm): Partial<Record<keyof CheckoutForm, string>> {
  const errors: Partial<Record<keyof CheckoutForm, string>> = {};
  const name = (form.name ?? '').trim();
  const phone = (form.phone ?? '').trim().replace(/[\s.-]/g, '').replace(/^\+84/, '0');
  const address = (form.address ?? '').trim();
  const city = (form.city ?? '').trim();
  if (name.length < 2) errors.name = 'customer.checkout.errorName';
  if (!/^0\d{8,10}$/.test(phone)) errors.phone = 'customer.checkout.errorPhone';
  if (address.length < 5) errors.address = 'customer.checkout.errorAddress';
  if (city.length < 2) errors.city = 'customer.checkout.errorCity';
  return errors;
}
