"use client";

import { useState, useEffect, useRef, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useSession } from "next-auth/react";
import { DiscountModal } from "@/components/discount-modal";
import { NeoSelect } from "@/components/neo-select";
import { useToast } from "@/components/toast";
import { Tag } from "lucide-react";
import { apiFetch } from "@/lib/api.fetch";
import { label, labelSm, card, neoBtnPrimary, neoBtn } from "@/lib/styles";
import { paperSizeLabel } from "@/features/studio-canvas/types";

function itemThumb(item: any): string | null {
  return item.thumbnailUrl ?? item.coverUrl ?? null;
}

const syncCart = (token: string, items: any[]) => {
  apiFetch("/api/cart", token, { method: "PUT", body: JSON.stringify({ items: JSON.stringify(items) }) }).catch(() => {});
};

function OrderSummary({ items, subtotalText, totalText, describe, children }: {
  items: any[]; subtotalText: string; totalText: string;
  describe: (item: any, index: number) => string;
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
                    <p className="font-mono text-[10px] text-[#999] truncate">{describe(item, i)}</p>
                  </div>
                <span className="font-mono text-[10px] font-bold shrink-0">x{item.quantity || 1}</span>
                <span className="font-mono text-[10px] font-bold shrink-0">{item.price == null || isNaN(item.price) ? "unknown" : `₫${(item.price * (item.quantity || 1)).toLocaleString()}`}</span>
              </div>
            ))}
          </div>
        )}
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#666]">{t("customer.checkout.subtotal")}</span>
            <span className="font-mono text-[10px] font-bold">{subtotalText}</span>
          </div>

          <div className="flex justify-between pt-2 border-t-[3px] border-[#222]">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest">{t("customer.checkout.total")}</span>
            <span className="text-xl font-bold">{totalText}</span>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  const { t, i18n } = useTranslation();
  const { data: session } = useSession();
  const token = (session as any)?.accessToken;
  const [items, setItems] = useState<any[]>([]);
  const [avail, setAvail] = useState<Record<number, { suppliers: any[] }>>({});
  const [loaded, setLoaded] = useState(false);
  const [step, setStep] = useState<"cart" | "delivery" | "payment" | "confirm">("cart");
  const [form, setForm] = useState({ name: "", phone: "", address: "", city: "", note: "" });
  const [paymentMethod, setPaymentMethod] = useState<"full" | "half">("full");
  const [discount, setDiscount] = useState<{ amount: number } | null>(null);
  const [showDiscount, setShowDiscount] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ cover: "", paper: "" });
  const [sizeSuppliers, setSizeSuppliers] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();
  const debounceTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  const debouncedSyncCart = (token: string, next: any[], idx: number) => {
    clearTimeout(debounceTimers.current[idx]);
    debounceTimers.current[idx] = setTimeout(() => syncCart(token, next), 400);
  };

  // Fetch suppliers matching the item's paperSize + paper + cover.
  const loadAvailability = async (index: number) => {
    const it = items[index];
    if (!it || !token) return;
    try {
      const q = new URLSearchParams({ paperSize: it.paperSize || "", paper: it.paper || "", cover: it.cover || "" }).toString();
      const data = await apiFetch<any>(`/api/user/suppliers/availability?${q}`, token);
      const suppliers: any[] = data?.suppliers ?? [];
      setAvail((a) => ({ ...a, [index]: { suppliers } }));
    } catch {
      setAvail((a) => ({ ...a, [index]: { suppliers: [] } }));
    }
  };

  const optionLabel = (list: any[], code: string): string => {
    const o = list.find((x) => x.code === code);
    if (!o) return code;
    const lang = (i18n.language || "en").slice(0, 2);
    return o.name?.[lang] || o.name?.en || o.name?.vi || code;
  };

  const optionList = (list: any[]) => list.map((o) => ({ value: o.code, label: o.name?.[(i18n.language || "en").slice(0, 2)] || o.name?.en || o.name?.vi || o.code, desc: o.description?.[(i18n.language || "en").slice(0, 2)] || o.description?.en || "" }));

  const describeItem = (item: any, index: number): string => {
    const s = avail[index]?.suppliers ?? [];
    const covers = optionList(s.flatMap((x) => x.coverOptions ?? []));
    const papers = optionList(s.flatMap((x) => x.paperOptions ?? []));
    return `${optionLabel(covers, item.cover) || item.cover} · ${optionLabel(papers, item.paper) || item.paper} · ${item.pages} trang · ${paperSizeLabel(item.paperSize || "", (i18n.language || "en").slice(0, 2) as "vi" | "en" | "es")}`;
  };

  const unavailable = items.some((_, i) => (avail[i]?.suppliers ?? []).length === 0);

  // Open the edit modal and load every supplier that supports the item's paper size.
  const openEdit = async (item: any, index: number) => {
    setEditForm({ cover: item.cover || "", paper: item.paper || "" });
    setEditingIndex(index);
    setSizeSuppliers([]);
    if (!token) return;
    try {
      const q = new URLSearchParams({ paperSize: item.paperSize || "" }).toString();
      const data = await apiFetch<any>(`/api/user/suppliers/availability?${q}`, token);
      setSizeSuppliers(data?.suppliers ?? []);
      await loadPriceOptions(item, { cover: item.cover || "", paper: item.paper || "" });
    } catch {
      setSizeSuppliers([]);
    }
  };

  const [priceOptions, setPriceOptions] = useState<{ papers: any[]; covers: any[] }>({ papers: [], covers: [] });

  // Intersection (Phương án C): only show paper/cover combos some supplier actually has.
  const loadPriceOptions = async (item: any, form: { cover: string; paper: string }) => {
    if (!token) return;
    try {
      const q = new URLSearchParams({ paperSize: item.paperSize || "", cover: form.cover || "", paper: form.paper || "" }).toString();
      const data = await apiFetch<any>(`/api/user/suppliers/price-options?${q}`, token);
      setPriceOptions({ papers: data?.papers ?? [], covers: data?.covers ?? [] });
    } catch {
      setPriceOptions({ papers: [], covers: [] });
    }
  };

  useEffect(() => {
    if (!token) return;
    apiFetch<any>("/api/cart", token)
      .then((d) => {
        const parsed: any[] = d?.parsedItems ?? [];
        setItems(parsed);
        setLoaded(true);
        parsed.forEach((_, i) => loadAvailability(i));
      })
      .catch(() => setLoaded(true));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    apiFetch<any>("/api/user/profile", token)
      .then((u) => {
        if (u) setForm((f) => ({ ...f, name: u.name || "", phone: u.phone || "", address: u.address || "", city: u.city || "" }));
      })
      .catch(() => {});
  }, [token]);

  const subtotal = items.reduce((sum, i) => sum + (i.price || 0) * (i.quantity || 1), 0);
  const discountAmount = discount?.amount ?? 0;
  const total = Math.max(0, subtotal - discountAmount);
  // ponytail: pricing not wired yet, show "unknown" until the order side is built.
  const priceText = (v: number | null | undefined) => (v == null || isNaN(v)) ? "unknown" : `₫${v.toLocaleString()}`;

  const steps = ["cart", "delivery", "payment", "confirm"] as const;

  const renderField = (labelKey: string, key: keyof typeof form, type = "text", placeholderKey = "") => (
    <div key={key} className="flex-1">
      <label className={`${labelSm} block mb-1.5 text-[#666]`}>{t(labelKey)}</label>
      <input type={type} value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} placeholder={t(placeholderKey)}
        className="w-full bg-[#FFF7D6] text-sm font-bold rounded-lg px-3 py-2.5 border-2 border-[#222] shadow-[2px_2px_0_#222] placeholder:text-[#999] focus:outline-none focus:translate-x-px focus:translate-y-px focus:shadow-[1px_1px_0_#222] transition-all" />
    </div>
  );

  const confirmSection = (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-md">
        <p className={`${label} mb-3 text-[#666]`}>{t("customer.checkout.orderConfirmed")}</p>
        <h2 className="text-5xl lg:text-6xl font-bold mb-3">TC-{Math.floor(Math.random() * 9000 + 1000)}</h2>
        <p className="text-sm leading-relaxed mb-6 text-[#666]">{t("customer.checkout.thankYou", { name: form.name })}</p>
        <div className={`p-4 ${card}`}>
          {[["customer.checkout.fullName", form.name], ["customer.checkout.phoneNumber", form.phone], ["customer.checkout.shipTo", `${form.address}, ${form.city}`], ["customer.checkout.estimated", t("customer.checkout.estimatedDays")]].map(([k, v]) => (
            <div key={k} className="flex justify-between py-1.5 border-b-[2px] border-[#222] last:border-b-0">
                        <span className="font-mono text-[10px] uppercase tracking-widest text-[#666]">{t(k)}</span>
              <span className="text-sm font-bold">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pt-15">
      <div className="px-8 max-[1600px]:px-6 max-[1440px]:px-5 max-[1280px]:px-4 lg:px-16 py-10 max-[1600px]:py-8 max-[1440px]:py-6 border-b-[3px] border-[#222]">
        <p className={`${label} mb-1 text-[#666]`}>{t("customer.checkout.label")}</p>
        <h1 className="text-3xl lg:text-4xl font-bold">{t("customer.checkout.title")}</h1>
        <div className="flex items-center gap-4 mt-6">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-3">
              <div className="flex items-center gap-2" style={{ opacity: step === s ? 1 : 0.3 }}>
                <span className={`font-mono text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-md ${step === s ? "bg-[#222] text-white" : "border-2 border-[#222]"}`}>{i + 1}</span>
                <span className="font-mono text-[10px] font-bold tracking-widest uppercase hidden sm:block">{t(`customer.checkout.${s}`)}</span>
              </div>
              {i < steps.length - 1 && <div className="w-6 h-[3px] bg-[#222]/20 rounded-full" />}
            </div>
          ))}
        </div>
      </div>

      {step === "confirm" ? confirmSection : (
        <div className="px-8 max-[1600px]:px-6 max-[1440px]:px-5 max-[1280px]:px-4 lg:px-16 py-10 max-[1600px]:py-8 max-[1440px]:py-6 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-10 max-[1600px]:gap-8 max-[1440px]:gap-6">
          {!loaded ? (
            <>
              <div className="space-y-4">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-4 p-4 bg-[#FFF7D6] rounded-[10px] border-[3px] border-[#222]/10 overflow-hidden animate-pulse">
                    <div className="w-16 h-20 bg-[#e8e6e0]/50 rounded-[10px]" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-[#e8e6e0]/50 rounded w-3/4" />
                      <div className="h-3 bg-[#e8e6e0]/50 rounded w-1/2" />
                      <div className="flex gap-1.5 mt-2">
                        <div className="w-6 h-6 bg-[#e8e6e0]/50 rounded border-2 border-[#222]/10" />
                        <div className="w-5 h-6 bg-[#e8e6e0]/50 rounded" />
                        <div className="w-6 h-6 bg-[#e8e6e0]/50 rounded border-2 border-[#222]/10" />
                      </div>
                    </div>
                    <div className="h-4 bg-[#e8e6e0]/50 rounded w-16 self-center" />
                  </div>
                ))}
              </div>
              <div className="rounded-[10px] border-[3px] border-[#222]/10 overflow-hidden animate-pulse">
                <div className="p-4 space-y-3">
                  <div className="h-3 bg-[#e8e6e0]/50 rounded w-24" />
                  <div className="h-4 bg-[#e8e6e0]/50 rounded w-full" />
                  <div className="h-4 bg-[#e8e6e0]/50 rounded w-full" />
                  <div className="h-10 bg-[#e8e6e0]/50 rounded w-full" />
                </div>
              </div>
            </>
          ) : (<>
          <div>
            {step === "cart" && (
              <div>
                {items.length === 0 ? (
                  <div className="py-16 text-center">
                    <p className="text-2xl font-bold mb-2">{t("customer.checkout.emptyTitle")}</p>
                    <p className="font-mono text-[10px] font-bold tracking-widest uppercase text-[#999]">{t("customer.checkout.emptyDesc")}</p>
                  </div>
                ) : (<>
                  <h2 className="text-2xl font-bold mb-3">{t("customer.checkout.orderList")}</h2>
                  <p className="font-mono text-[10px] font-semibold text-[#999] mb-3 tracking-widest uppercase">{t("customer.checkout.cartItemHint")}</p>
                  <div className="space-y-4">
                    {items.map((item, i) => (
                      <div key={i} className="relative flex items-start gap-4 p-4 bg-[#FFF7D6] rounded-[10px] border-[3px] border-[#222] shadow-[2px_2px_0_#222] cursor-pointer transition-[transform,box-shadow] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#222]" onClick={() => openEdit(item, i)}>
                        <button onClick={(e) => {
                          e.stopPropagation();
                          const next = items.filter((_: any, idx: number) => idx !== i);
                          setItems(next); syncCart(token, next);
                        }} className="absolute -top-3 -right-3 w-6 h-6 rounded-full border-2 border-[#B54843] bg-[#FFF7D6] text-[#B54843] font-mono text-[11px] font-bold flex items-center justify-center hover:bg-[#B54843] hover:text-white transition-colors z-10">✕</button>
                        <div className="w-16 h-20 bg-[#e8e6e0] rounded-[10px] border-[3px] border-[#222] shrink-0 overflow-hidden">
                          {itemThumb(item) && <img src={itemThumb(item)!} alt="" className="w-full h-full object-cover" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-lg font-bold leading-tight">{item.title}</p>
                          <p className="font-mono text-[10px] text-[#999] mt-1">{describeItem(item, i)}</p>
                          {avail[i] && (avail[i].suppliers ?? []).length === 0 && (
                            <p className="font-mono text-[10px] text-[#B54843] mt-1">{t("customer.checkout.noSupplier")}</p>
                          )}
                          <div className="flex items-center gap-1 mt-2">
                            <button onClick={(e) => { e.stopPropagation();
                              if ((item.quantity || 1) <= 1) { showToast(t("customer.checkout.minQuantity"), "error"); return; }
                              const next = items.map((it: any, idx: number) => idx === i ? { ...it, quantity: (it.quantity || 1) - 1 } : it);
                              setItems(next); debouncedSyncCart(token, next, i);
                            }} className={`${neoBtn} w-6 h-6 rounded font-mono text-xs font-bold flex items-center justify-center`}>−</button>
                            <span className="font-mono text-xs font-bold w-5 text-center">{item.quantity || 1}</span>
                            <button onClick={(e) => { e.stopPropagation();
                              const next = items.map((it: any, idx: number) => idx === i ? { ...it, quantity: (it.quantity || 1) + 1 } : it);
                              setItems(next); debouncedSyncCart(token, next, i);
                            }} className={`${neoBtn} w-6 h-6 rounded font-mono text-xs font-bold flex items-center justify-center`}>+</button>
                          </div>
                        </div>
                        <p className="font-mono text-sm font-bold shrink-0 self-center">{priceText(item.price)}</p>
                      </div>
                    ))}
                  </div>
                </>)}
              </div>
            )}

            {step === "delivery" && (
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
                    <label className={`${labelSm} block mb-1.5 text-[#666]`}>{t("customer.checkout.noteOptional")}</label>
                    <textarea value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} placeholder={t("customer.checkout.notePlaceholder")}
                      className="w-full bg-[#FFF7D6] text-sm font-bold rounded-lg px-3 py-2.5 border-2 border-[#222] shadow-[2px_2px_0_#222] placeholder:text-[#999] focus:outline-none focus:translate-x-px focus:translate-y-px focus:shadow-[1px_1px_0_#222] transition-all resize-none h-24" />
                  </div>


                </div>
              </div>
            )}

            {step === "payment" && (
              <div>
                <h2 className="text-2xl font-bold mb-6">{t("customer.checkout.paymentTitle")}</h2>
                <div className="space-y-4">
                  {items.map((item, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 bg-[#FFF7D6] rounded-[10px] border-[3px] border-[#222] shadow-[2px_2px_0_#222]">
                      <div className="w-16 h-20 bg-[#e8e6e0] rounded-[10px] border-[3px] border-[#222] shrink-0 overflow-hidden">
                          {itemThumb(item) && <img src={itemThumb(item)!} alt="" className="w-full h-full object-cover" />}
                        </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-lg font-bold leading-tight">{item.title}</p>
                        <p className="font-mono text-[10px] text-[#999] mt-1">{describeItem(item, i)}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <p className="font-mono text-sm font-bold">{priceText(item.price)}</p>
                        <span className="font-mono text-[10px] font-bold text-[#999]">x{item.quantity || 1}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {step === "cart" && (
            <OrderSummary items={items} subtotalText={priceText(subtotal)} totalText={priceText(total)} describe={describeItem}>
              <div className="flex flex-col gap-2 pt-4 border-t-[3px] border-[#222] mt-4">
                <button onClick={() => setStep("delivery")} disabled={unavailable} className={`${neoBtnPrimary} w-full py-3 disabled:opacity-40`}>{t("customer.checkout.continueDelivery")}</button>
                {unavailable && <p className="font-mono text-[10px] text-[#B54843]">{t("customer.checkout.noSupplier")}</p>}
                <button onClick={() => window.history.back()} className={`${neoBtn} ${labelSm} w-full py-3`}>{t("customer.checkout.back")}</button>
              </div>
            </OrderSummary>
          )}

          {step === "delivery" && (
            <OrderSummary items={items} subtotalText={priceText(subtotal)} totalText={priceText(total)} describe={describeItem}>
              <div className="pt-2 border-t-[2px] border-[#222]">
                <button onClick={() => setShowDiscount(true)}
                  className="flex items-center gap-1.5 font-mono text-[10px] font-semibold tracking-widest uppercase py-1 text-[#999] hover:text-[#222] transition-colors">
                  <Tag size={11} />
                  {discount ? t("customer.checkout.changeCode") : t("customer.checkout.haveDiscount")}
                </button>
              </div>
              <div className="pt-4 mt-4 border-t-[3px] border-[#222]">
                <p className={`${labelSm} block mb-3 text-[#666]`}>{t("customer.checkout.paymentMethod")}</p>
                <div className="flex flex-col gap-2">
                  <label className={`flex items-center gap-3 p-3 rounded-lg border-[3px] border-[#222] shadow-[2px_2px_0_#222] cursor-pointer transition-[transform,box-shadow] hover:translate-x-px hover:translate-y-px hover:shadow-[1px_1px_0_#222] ${paymentMethod === "full" ? "bg-[#222]" : "bg-white"}`}>
                    <input type="radio" name="paymentMethod" value="full" checked={paymentMethod === "full"} onChange={() => setPaymentMethod("full")} className="sr-only" />
                    <span className={`w-4 h-4 rounded-full border-[3px] flex items-center justify-center shrink-0 ${paymentMethod === "full" ? "border-white" : "border-[#222]"}`}>{paymentMethod === "full" && <span className="w-2 h-2 rounded-full bg-white" />}</span>
                    <span className={`font-bold text-sm ${paymentMethod === "full" ? "text-white" : "text-[#222]"}`}>{t("customer.checkout.paymentFull")}</span>
                  </label>
                  <label className={`flex items-center gap-3 p-3 rounded-lg border-[3px] border-[#222] shadow-[2px_2px_0_#222] cursor-pointer transition-[transform,box-shadow] hover:translate-x-px hover:translate-y-px hover:shadow-[1px_1px_0_#222] ${paymentMethod === "half" ? "bg-[#222]" : "bg-white"}`}>
                    <input type="radio" name="paymentMethod" value="half" checked={paymentMethod === "half"} onChange={() => setPaymentMethod("half")} className="sr-only" />
                    <span className={`w-4 h-4 rounded-full border-[3px] flex items-center justify-center shrink-0 ${paymentMethod === "half" ? "border-white" : "border-[#222]"}`}>{paymentMethod === "half" && <span className="w-2 h-2 rounded-full bg-white" />}</span>
                    <span className={`font-bold text-sm ${paymentMethod === "half" ? "text-white" : "text-[#222]"}`}>{t("customer.checkout.paymentHalf")}</span>
                  </label>
                </div>
                <p className="font-mono text-[10px] text-[#B54843] mt-2">{t("customer.checkout.paymentHalfNote")}</p>
              </div>
              <div className="flex flex-col gap-2 pt-4 border-t-[3px] border-[#222] mt-4">
                <button onClick={() => setStep("payment")} className={`${neoBtnPrimary} w-full py-3`}>{t("customer.checkout.continuePayment")}</button>
                <button onClick={() => setStep("cart")} className={`${neoBtn} ${labelSm} w-full py-3`}>{t("customer.checkout.back")}</button>
              </div>
            </OrderSummary>
          )}

          {step === "payment" && (
            <div>
              <div className={`${card} overflow-hidden`}>
                <div className="px-5 py-4 border-b-[3px] border-[#222]">
                  <p className={`${label} text-[#666]`}>{t("customer.checkout.paymentTitle")}</p>
                </div>
                <div className="p-4">
                  <div className="mb-4 bg-white rounded-[10px] border-[3px] border-[#222] shadow-[2px_2px_0_#222] flex justify-center p-3">
                    <div className="w-48 h-48 bg-[#222] flex items-center justify-center rounded-[7px]">
                      <svg width="144" height="144" viewBox="0 0 160 160">
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
                  <p className={`${labelSm} text-center mb-1 text-[#666]`}>{t("customer.checkout.scanInstruction")}</p>
                  <p className="text-xl font-bold text-center mb-4">{priceText(total)}</p>
                  <div className="space-y-2 mb-4 pt-4 border-t-[3px] border-[#222]">
                    {[["customer.checkout.recipient", form.name], ["customer.checkout.phoneNumber", form.phone], ["customer.checkout.addressShort", `${form.address}, ${form.city}`]].map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-4 py-1.5">
              <span className="font-mono text-[10px] uppercase tracking-widest text-[#666]">{t(k)}</span>
                        <span className="text-sm font-bold text-right">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          </>)}
        </div>
      )}

      <DiscountModal open={showDiscount} onClose={() => setShowDiscount(false)} subtotal={subtotal} />

      {editingIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setEditingIndex(null)}>
          <div className="w-full max-w-md mx-4 bg-[#FFF7D6] rounded-[10px] border-[3px] border-[#222] shadow-[4px_4px_0_#222] p-6" onClick={(e) => e.stopPropagation()}>
            <p className="text-lg font-bold mb-5">{t("customer.checkout.editOptions")}</p>

            <div className="space-y-5">
              <div>
                <label className="font-mono text-[10px] font-semibold tracking-widest uppercase text-[#666] mb-2 block">Cover</label>
                <NeoSelect options={optionList(priceOptions.covers)} value={editForm.cover} onChange={(v) => {
                  setEditForm((f) => ({ ...f, cover: v }));
                  loadPriceOptions(items[editingIndex], { cover: v, paper: editForm.paper });
                }} />
                <p className="font-mono text-[10px] text-[#999] mt-1.5">{optionLabel(priceOptions.covers, editForm.cover) || "\u00A0"}</p>
              </div>

              <div>
                <label className="font-mono text-[10px] font-semibold tracking-widest uppercase text-[#666] mb-2 block">Paper</label>
                <NeoSelect options={optionList(priceOptions.papers)} value={editForm.paper} onChange={(v) => {
                  setEditForm((f) => ({ ...f, paper: v }));
                  loadPriceOptions(items[editingIndex], { cover: editForm.cover, paper: v });
                }} />
                <p className="font-mono text-[10px] text-[#999] mt-1.5">{optionLabel(priceOptions.papers, editForm.paper) || "\u00A0"}</p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditingIndex(null)} className={`${neoBtn} ${labelSm} flex-1 py-3`}>{t("customer.checkout.cancel")}</button>
              <button disabled={saving} onClick={async () => {
                const it = items[editingIndex];
                if (!it) return;
                setSaving(true);
                try {
                  const next = items.map((x: any, idx: number) => idx === editingIndex ? { ...x, cover: editForm.cover, paper: editForm.paper } : x);
                  setItems(next); syncCart(token, next);
                  setEditingIndex(null);
                } finally { setSaving(false); }
              }} className={`${neoBtnPrimary} flex-1 py-3`}>{saving ? "..." : t("customer.checkout.save")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
