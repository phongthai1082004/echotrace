"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSession } from "next-auth/react";
import { DiscountModal } from "@/components/discount-modal";
import { fetchPrintCatalog, PrintCatalog } from "@/lib/print-catalog";
import { label, card, neoBtnPrimary, neoBtn, labelSm } from "@/lib/styles";
import { paperSizeLabel } from "@/features/studio-canvas/types";
import { useCart } from "./hooks/use-cart";
import { useCheckoutForm } from "./hooks/use-checkout-form";
import { priceText } from "./_lib/utils";
import { StepHeader, type CheckoutStep } from "./components/step-header";
import { OrderSummary } from "./components/order-summary";
import { CartStep } from "./components/cart-step";
import { EditOptionsModal } from "./components/edit-options-modal";
import { DeliveryStep } from "./components/delivery-step";
import { DeliverySidebar } from "./components/delivery-sidebar";
import { PaymentStep } from "./components/payment-step";
import { ConfirmStep } from "./components/confirm-step";
import { apiFetch } from "@/lib/api.fetch";

export default function CheckoutPage() {
  const { t, i18n } = useTranslation();
  const { data: session } = useSession();
  const token = (session as any)?.accessToken;

  const [step, setStep] = useState<CheckoutStep>("cart");
  const [paymentMethod, setPaymentMethod] = useState<"full" | "half">("full");
  const [showDiscount, setShowDiscount] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [catalog, setCatalog] = useState<PrintCatalog | null>(null);

  const cart = useCart(token, paymentMethod);
  const { form, setField } = useCheckoutForm(token);
  const {
    items,
    selectedItems,
    selected,
    selectedCount,
    toggleItem,
    toggleAll,
    loaded,
    couponCode,
    setCouponCode,
    recalc,
    changeQty,
    deleteItem,
    saveItemOptions,
  } = cart;

  useEffect(() => {
    if (!token) return;
    fetchPrintCatalog(token)
      .then(setCatalog)
      .catch(() => {});
  }, [token]);

  const optionLabel = (code: string, key: "covers" | "papers"): string => {
    const o = (catalog?.[key] ?? []).find((x) => x.code === code);
    if (!o) return code;
    const lang = (i18n.language || "en").slice(0, 2);
    return o.name[lang] || o.name.en || o.name.vi || code;
  };
  const optionList = (key: "covers" | "papers") =>
    (catalog?.[key] ?? []).map((o) => ({ value: o.code, label: optionLabel(o.code, key) }));

  const describeItem = (item: any): string =>
    `${optionLabel(item.cover, "covers") || item.cover} · ${optionLabel(item.paper, "papers") || item.paper} · ${item.pages} trang · ${paperSizeLabel(item.paperSize || "", (i18n.language || "en").slice(0, 2) as "vi" | "en" | "es")}`;

  const payNow = cart.total == null ? null : paymentMethod === "half" ? Math.round((cart.total * 50) / 100) : cart.total;
  const deduction = cart.total == null ? null : paymentMethod === "full" ? 0 : payNow;
  const editing = editingIndex != null ? items[editingIndex] : null;

  const createOrder = async() => {
    apiFetch("/api/user/create-order", token, {
      method: "POST",
      body: JSON.stringify({
        items: items.map((book) => ({
          bookId: book.bookId,
          quantity: book.quantity,
          cover: book.cover,
          paper: book.paper,
          paperSize: book.paperSize,
        })),
        ...form,
        paymentMethod,
        couponCode
      })
    });
  }

  return (
    <div className="min-h-screen pt-15">
      <StepHeader step={step} />

      {step === "confirm" ? (
        <ConfirmStep form={form} />
      ) : (
        <div className="px-8 max-[1600px]:px-6 max-[1440px]:px-5 max-[1280px]:px-4 lg:px-16 py-10 max-[1600px]:py-8 max-[1440px]:py-6 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-10 max-[1600px]:gap-8 max-[1440px]:gap-6">
          {!loaded ? (
            <>
              <CheckoutSkeletonCards />
              <CheckoutSkeletonSummary />
            </>
          ) : (
            <>
              <div>
                {step === "cart" && (
                  <CartStep
                    items={items}
                    selected={selected}
                    selectedCount={selectedCount}
                    onToggleItem={toggleItem}
                    onToggleAll={toggleAll}
                    describe={describeItem}
                    onChangeQty={changeQty}
                    onDelete={deleteItem}
                    onEdit={setEditingIndex}
                  />
                )}
                {step === "delivery" && <DeliveryStep form={form} setField={setField} />}
                {step === "payment" && <PaymentStep items={selectedItems} describe={describeItem} />}
              </div>

              {step === "cart" && (
                <OrderSummary
                  items={selectedItems}
                  subtotalText={priceText(cart.subtotal, t("customer.checkout.unknown"))}
                  totalText={priceText(cart.total, t("customer.checkout.unknown"))}
                  describe={describeItem}
                >
                  <div className="flex flex-col gap-2 pt-4 border-t-[3px] border-[#222] mt-4">
                    <button
                      disabled={cart.missingAny}
                      onClick={async () => {
                        if (cart.missingAny) return;
                        if (!(await recalc())) return; // server chặn (thiếu option...) → đã toast, ở lại
                        setStep("delivery");
                      }}
                      className={`${neoBtnPrimary} w-full py-3 disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                      {t("customer.checkout.continueDelivery")}
                    </button>
                    <button onClick={() => window.history.back()} className={`${neoBtn} ${labelSm} w-full py-3`}>
                      {t("customer.checkout.back")}
                    </button>
                  </div>
                </OrderSummary>
              )}

              {step === "delivery" && (
                <DeliverySidebar
                  items={selectedItems}
                  describe={describeItem}
                  subtotalText={priceText(cart.subtotal, t("customer.checkout.unknown"))}
                  totalText={priceText(cart.total, t("customer.checkout.unknown"))}
                  discountText={cart.discountAmount ? priceText(cart.discountAmount, t("customer.checkout.unknown")) : undefined}
                  payNowText={priceText(payNow, t("customer.checkout.unknown"))}
                  paymentMethod={paymentMethod}
                  onPaymentMethodChange={setPaymentMethod}
                  couponCode={couponCode}
                  onShowDiscount={() => setShowDiscount(true)}
                  onContinue={async () => {
                    if (!(await recalc())) return;
                    setStep("payment");
                  }}
                  onBack={() => setStep("cart")}
                  continueDisabled={cart.missingAny}
                />
              )}

              {step === "payment" && (
                <div className={`${card} overflow-hidden`}>
                  <div className="px-5 py-4 border-b-[3px] border-[#222]">
                    <p className={`${label} text-[#666]`}>{t("customer.checkout.paymentTitle")}</p>
                  </div>
                  <div className="p-4">
                    <PaymentQr />
                    <div className="space-y-2 pt-4 border-t-[3px] border-[#222]">
                      <TotalRow labelKey="customer.checkout.subtotal" value={priceText(cart.subtotal, t("customer.checkout.unknown"))} />
                      <TotalRow
                        labelKey="customer.checkout.discount"
                        value={`−${priceText(cart.discountAmount, t("customer.checkout.unknown"))}`}
                        valueClass="text-[#B54843]"
                      />
                    </div>
                    <div className="space-y-2 pt-4 pb-2 mt-2 border-t-[3px] border-[#222]">
                      <TotalRow labelKey="customer.checkout.total" value={priceText(cart.total, t("customer.checkout.unknown"))} />
                      <TotalRow
                        labelKey="customer.checkout.paymentMethod"
                        value={`−${priceText(deduction, t("customer.checkout.unknown"))}`}
                        valueClass="text-[#B54843]"
                      />
                    </div>
                    <div className="bg-[#222] text-white rounded-[10px] px-4 py-3 flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold uppercase tracking-widest opacity-70">
                        {t("customer.checkout.payNow")}
                      </span>
                      <span className="text-xl font-bold">{priceText(payNow, t("customer.checkout.unknown"))}</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <DiscountModal
        open={showDiscount}
        onClose={() => setShowDiscount(false)}
        appliedCode={couponCode}
        apply={async (code) => {
          const q = await recalc(code);
          if (q && q.coupon) {
            setCouponCode(code);
            return { ok: true, amount: q.discount };
          }
          setCouponCode(null);
          return { ok: false, amount: 0 };
        }}
        remove={() => {
          setCouponCode(null);
          recalc(null);
        }}
      />

      {editing && (
        <EditOptionsModal
          item={editing}
          optionLabel={optionLabel}
          optionList={optionList}
          onClose={() => setEditingIndex(null)}
          onSave={saveItemOptions}
        />
      )}
    </div>
  );
}

function TotalRow({ labelKey, value, valueClass = "" }: { labelKey: string; value: string; valueClass?: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex justify-between gap-4 py-1.5">
      <span className="font-mono text-[10px] uppercase tracking-widest text-[#666]">{t(labelKey)}</span>
      <span className={`text-sm font-bold text-right ${valueClass}`}>{value}</span>
    </div>
  );
}

function PaymentQr() {
  return (
    <div className="mb-4 bg-white rounded-[10px] border-[3px] border-[#222] shadow-[2px_2px_0_#222] flex justify-center p-3">
      <div className="w-48 h-48 bg-[#222] flex items-center justify-center rounded-[7px]">
        <svg width="144" height="144" viewBox="0 0 160 160">
          {Array.from({ length: 20 }).map((_, row) =>
            Array.from({ length: 20 }).map((_, col) => {
              const on = (row * 7 + col * 11 + row * col) % 3 !== 0;
              return on ? (
                <rect key={`${row}-${col}`} x={col * 8} y={row * 8} width={7} height={7} fill="#FDFBF7" />
              ) : null;
            }),
          )}
          {[
            [0, 0],
            [0, 120],
            [120, 0],
          ].map(([x, y], i) => (
            <g key={i}>
              <rect x={x} y={y} width={32} height={32} fill="#FDFBF7" />
              <rect x={x + 4} y={y + 4} width={24} height={24} fill="#1a1a1a" />
              <rect x={x + 10} y={y + 10} width={12} height={12} fill="#FDFBF7" />
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

function CheckoutSkeletonCards() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 2 }).map((_, i) => (
        <div
          key={i}
          className="flex items-start gap-4 p-4 bg-[#FFF7D6] rounded-[10px] border-[3px] border-[#222]/10 overflow-hidden animate-pulse"
        >
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
  );
}

function CheckoutSkeletonSummary() {
  return (
    <div className="rounded-[10px] border-[3px] border-[#222]/10 overflow-hidden animate-pulse">
      <div className="p-4 space-y-3">
        <div className="h-3 bg-[#e8e6e0]/50 rounded w-24" />
        <div className="h-4 bg-[#e8e6e0]/50 rounded w-full" />
        <div className="h-4 bg-[#e8e6e0]/50 rounded w-full" />
        <div className="h-10 bg-[#e8e6e0]/50 rounded w-full" />
      </div>
    </div>
  );
}
