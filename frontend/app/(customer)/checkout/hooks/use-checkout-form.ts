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
