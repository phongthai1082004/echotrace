"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
const QRCodeSVG = dynamic(() => import("qrcode.react").then((m) => m.QRCodeSVG), {
  ssr: false,
  loading: () => <div style={{ width: 192, height: 192 }} />,
});
import { apiFetch } from "@/lib/api.fetch";
import { useToast } from "@/components/toast";
import { useVerifyPoll } from "@/hooks/use-verify-poll";
import { DiscountModal } from "@/components/discount-modal";
import { fetchPrintCatalog, PrintCatalog } from "@/lib/print-catalog";
import { label, card, neoBtnPrimary, neoBtn, labelSm } from "@/lib/styles";
import { PaymentPlan } from "@echotrace/shared";
import { paperSizeLabel } from "@/features/studio-canvas/types";
import { useCart } from "./hooks/use-cart";
import { useCheckoutForm, validateCheckoutForm } from "./hooks/use-checkout-form";
import { priceText } from "./_lib/utils";
import { StepHeader, type CheckoutStep } from "./components/step-header";
import { trackEvent } from "@/lib/analytics";
import { CheckoutSkeletonCards, CheckoutSkeletonSummary } from "@/components/skeleton";
import { OrderSummary } from "./components/order-summary";
import { CartStep } from "./components/cart-step";
import { EditOptionsModal } from "./components/edit-options-modal";
import { DeliveryStep } from "./components/delivery-step";
import { DeliverySidebar } from "./components/delivery-sidebar";
import { PaymentStep } from "./components/payment-step";

export default function CheckoutPage() {
  const { t, i18n } = useTranslation();
  const { data: session } = useSession();
  const router = useRouter();
  const token = (session as any)?.accessToken;

  const [step, setStep] = useState<CheckoutStep>("cart");
  const [paymentMethod, setPaymentMethod] = useState<PaymentPlan>(PaymentPlan.FULL);
  const [showDiscount, setShowDiscount] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [orderInfo, setOrderInfo] = useState<any>(null);
  const { showToast } = useToast();
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
    trackEvent("begin_checkout");
    fetchPrintCatalog(token)
      .then(setCatalog)
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    `${optionLabel(item.cover, "covers") || item.cover} Â· ${optionLabel(item.paper, "papers") || item.paper} Â· ${item.pages} trang Â· ${paperSizeLabel(item.paperSize || "", (i18n.language || "en").slice(0, 2) as "vi" | "en" | "es")}`;

  const payNow = cart.total == null ? null : paymentMethod === PaymentPlan.HALF ? Math.round((cart.total * 50) / 100) : cart.total;
  const deduction = cart.total == null ? null : paymentMethod === PaymentPlan.FULL ? 0 : payNow;
  const editing = editingIndex != null ? items[editingIndex] : null;
  const formErrors = validateCheckoutForm(form);

  // Táº¡o Ä‘Æ¡n: chá»‘t sá»‘ láº§n cuá»‘i â†’ POST /orders vá»›i Idempotency-Key chá»‘ng double-submit
  // â†’ PayOS tráº£ checkoutUrl, redirect sang trang thanh toÃ¡n.
  const placeOrder = async () => {
    if (placing) return;
    setPlacing(true);
    try {
      if (Object.keys(validateCheckoutForm(form)).length) {
        showToast(t("customer.checkout.fixErrors"), "error");
        setPlacing(false);
        return;
      }
      const quote = await recalc();
      if (!quote) return; // server cháº·n (thiáº¿u option...) â€” Ä‘Ã£ toast
      const order = await apiFetch<any>("/api/orders", token, {
        method: "POST",
        headers: { "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({
          items: selectedItems.map((i) => ({
            bookId: i.bookId,
            quantity: i.quantity,
            cover: i.cover,
            paper: i.paper,
            paperSize: i.paperSize,
          })),
          name: form.name,
          phone: form.phone,
          address: form.address,
          city: form.city,
          note: form.note,
          paymentMethod,
          couponCode,
        }),
      });
      if (order?.checkoutUrl) {
        setOrderInfo(order); // hiá»‡n QR, poll tráº¡ng thÃ¡i â†’ webhook/verify xÃ¡c nháº­n xong nháº£y /orders
      } else {
        router.push("/orders");
      }
    } catch (e: any) {
      showToast(e?.message || t("customer.checkout.placeOrderFailed"), "error");
    } finally {
      setPlacing(false);
    }
  };

  // Poll trạng thái đơn mỗi 12s + skip khi tab ẩn — gọi verify (hỏi PayOS trực tiếp) vì webhook localhost không nhận được
  const orderId = orderInfo?.orderId;
  const pollVerify = useVerifyPoll(token);
  useEffect(() => {
    if (!orderId) return;
    return pollVerify(orderId, "pending_payment", (s) => {
      setOrderInfo((prev: any) => ({ ...prev, status: s }));
      showToast(t("customer.checkout.paymentSuccess"), "success");
      router.push("/orders");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, token]);

  return (
    <div className="min-h-screen pt-15">
      <StepHeader step={step} />

      <div className="px-4 sm:px-8 max-[1600px]:px-6 max-[1440px]:px-5 max-[1280px]:px-4 lg:px-16 py-6 sm:py-10 max-[1600px]:py-8 max-[1440px]:py-6 grid grid-cols-1 md:grid-cols-[1fr_300px] lg:grid-cols-[1fr_360px] gap-6 sm:gap-10 max-[1600px]:gap-8 max-[1440px]:gap-6">
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
                {step === "delivery" &&                   <DeliveryStep form={form} setField={setField} errors={formErrors} />}
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
                        if (!(await recalc())) return; // server cháº·n (thiáº¿u option...) â†’ Ä‘Ã£ toast, á»Ÿ láº¡i
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
                    if (Object.keys(validateCheckoutForm(form)).length) {
                      showToast(t("customer.checkout.fixErrors"), "error");
                      return;
                    }
                    if (!(await recalc())) return;
                    setStep("payment");
                  }}
                  onBack={() => setStep("cart")}
                  continueDisabled={cart.missingAny}
                />
              )}

              {step === "payment" && !orderInfo && (
                <div className={`${card} overflow-hidden`}>
                  <div className="px-5 py-4 border-b-[3px] border-[#222]">
                    <p className={`${label} text-[#666]`}>{t("customer.checkout.paymentTitle")}</p>
                  </div>
                  <div className="p-4">
                    <div className="space-y-2 pt-1">
                      <TotalRow labelKey="customer.checkout.subtotal" value={priceText(cart.subtotal, t("customer.checkout.unknown"))} />
                      <TotalRow
                        labelKey="customer.checkout.discount"
                        value={`âˆ’${priceText(cart.discountAmount, t("customer.checkout.unknown"))}`}
                        valueClass="text-[#B54843]"
                      />
                    </div>
                    <div className="space-y-2 pt-4 pb-2 mt-2 border-t-[3px] border-[#222]">
                      <TotalRow labelKey="customer.checkout.total" value={priceText(cart.total, t("customer.checkout.unknown"))} />
                      <TotalRow
                        labelKey="customer.checkout.paymentMethod"
                        value={`âˆ’${priceText(deduction, t("customer.checkout.unknown"))}`}
                        valueClass="text-[#B54843]"
                      />
                    </div>
                    <div className="bg-[#222] text-white rounded-[10px] px-4 py-3 flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold uppercase tracking-widest opacity-70">
                        {t("customer.checkout.payNow")}
                      </span>
                      <span className="text-xl font-bold">{priceText(payNow, t("customer.checkout.unknown"))}</span>
                    </div>
                    <button
                      disabled={placing || cart.missingAny}
                      onClick={placeOrder}
                      className={`${neoBtnPrimary} w-full mt-4 py-3.5 disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                      {placing ? t("customer.checkout.placing") : t("customer.checkout.placeOrder")}
                    </button>
                  </div>
                </div>
              )}

              {step === "payment" && orderInfo && (
                <div className={`${card} overflow-hidden`}>
                  <div className="px-5 py-4 border-b-[3px] border-[#222]">
                    <p className={`${label} text-[#666]`}>{t("customer.checkout.paymentTitle")}</p>
                  </div>
                  <div className="p-4">
                    {/* QR tháº­t tá»« PayOS (qrCode lÃ  chuá»—i EMV/VietQR â†’ render báº±ng qrcode.react) */}
                    <div className="bg-white rounded-[10px] border-[3px] border-[#222] shadow-[2px_2px_0_#222] flex justify-center p-3">
                      {orderInfo.qrCode ? (
                        <QRCodeSVG value={orderInfo.qrCode} size={192} level="M" />
                      ) : (
                        <div className="w-48 h-48 bg-[#e8e6e0]/60 animate-pulse" />
                      )}
                    </div>
                    <p className="font-mono text-[9px] font-bold tracking-widest uppercase text-[#999] text-center mt-2">
                      {t("customer.checkout.scanToPay")}
                    </p>

                    <div className="space-y-2 pt-4 mt-4 border-t-[3px] border-[#222]">
                      <TotalRow labelKey="customer.checkout.orderCodeLabel" value={orderInfo.orderCode ?? "â€”"} />
                      <TotalRow labelKey="customer.checkout.total" value={priceText(orderInfo.total, t("customer.checkout.unknown"))} />
                    </div>

                    <div className="bg-[#222] text-white rounded-[10px] px-4 py-3 flex items-center justify-between mt-2">
                      <span className="font-mono text-[10px] font-bold uppercase tracking-widest opacity-70">
                        {t("customer.checkout.payNow")}
                      </span>
                      <span className="text-xl font-bold">{priceText(orderInfo.payNow, t("customer.checkout.unknown"))}</span>
                    </div>

                    <p className="font-mono text-[10px] uppercase tracking-widest text-[#999] text-center mt-4 animate-pulse">
                      {t("customer.checkout.waitingPayment")}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
      </div>

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
