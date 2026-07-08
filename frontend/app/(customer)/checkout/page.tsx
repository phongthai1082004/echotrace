"use client";

import { useState } from "react";
import { DiscountModal } from "@/components/discount-modal";
import { Tag } from "lucide-react";

export default function CheckoutPage() {
  const [step, setStep] = useState<"cart" | "delivery" | "payment" | "confirm">("cart");
  const [form, setForm] = useState({ name: "", phone: "", address: "", city: "", note: "" });
  const [discount, setDiscount] = useState<{ amount: number } | null>(null);
  const [showDiscount, setShowDiscount] = useState(false);

  const subtotal = 0;
  const shipping = 50000;
  const discountAmount = discount?.amount ?? 0;
  const total = Math.max(0, subtotal + shipping - discountAmount);

  const field = (label: string, key: keyof typeof form, type = "text", placeholder = "") => (
    <div key={key}>
      <label className="font-['JetBrains_Mono'] text-[10px] tracking-widest uppercase block mb-1.5" style={{ color: "rgba(26,26,26,0.45)" }}>{label}</label>
      <input type={type} value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} placeholder={placeholder}
        className="w-full bg-transparent font-['Inter'] text-sm text-[#1a1a1a] pb-2 placeholder:text-[#1a1a1a]/25 focus:outline-none"
        style={{ borderBottom: "0.5px solid #dbdad6" }} />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FDFBF7] pt-15">
      <div className="px-8 lg:px-16 py-10" style={{ borderBottom: "0.5px solid #dbdad6" }}>
        <p className="font-['JetBrains_Mono'] text-[9px] tracking-widest uppercase mb-1" style={{ color: "rgba(26,26,26,0.38)" }}>Checkout</p>
        <h1 className="font-['Playfair_Display'] text-3xl lg:text-4xl text-[#1a1a1a]">Your Cart</h1>
        <div className="flex items-center gap-4 mt-6">
          {(["cart", "delivery", "payment", "confirm"] as const).map((s, i) => (
            <div key={s} className="flex items-center gap-3">
              <div className="flex items-center gap-2" style={{ opacity: step === s ? 1 : 0.3 }}>
                <span className="font-['JetBrains_Mono'] text-[10px] w-5 h-5 flex items-center justify-center" style={{ border: "0.5px solid currentColor" }}>{i + 1}</span>
                <span className="font-['JetBrains_Mono'] text-[10px] tracking-widest uppercase hidden sm:block">{s === "cart" ? "Cart" : s === "delivery" ? "Delivery" : s === "payment" ? "Payment" : "Done"}</span>
              </div>
              {i < 3 && <div className="w-6 h-px bg-[#dbdad6]" />}
            </div>
          ))}
        </div>
      </div>

      <div className="px-8 lg:px-16 py-10 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-10">
        <div>
          {step === "cart" && (
            <div className="py-16 text-center">
              <p className="font-['Playfair_Display'] text-2xl text-[#1a1a1a] mb-2">Your cart is empty</p>
              <p className="font-['JetBrains_Mono'] text-[10px] tracking-widest uppercase" style={{ color: "rgba(26,26,26,0.35)" }}>Save a journal from Studio to get started</p>
            </div>
          )}

          {step === "delivery" && (
            <div className="space-y-6 max-w-lg">
              <h2 className="font-['Playfair_Display'] text-2xl text-[#1a1a1a]">Delivery Details</h2>
              {field("Full Name", "name", "text", "Recipient name")}
              {field("Phone Number", "phone", "tel", "+84 …")}
              {field("Street Address", "address", "text", "House number, street…")}
              {field("City / Province", "city", "text", "Hà Nội, TP. HCM…")}
              {field("Note (optional)", "note", "text", "Special instructions…")}
              <div className="flex gap-3 pt-1">
                <button onClick={() => setStep("cart")} className="font-['JetBrains_Mono'] text-[10px] tracking-widest uppercase px-5 py-3 hover:bg-[#f5f3ef]" style={{ border: "0.5px solid #dbdad6" }}>← Back</button>
                <button onClick={() => setStep("payment")} disabled={!form.name || !form.phone || !form.address || !form.city}
                  className="font-['JetBrains_Mono'] text-[10px] tracking-widest uppercase px-8 py-3 bg-[#0D1F1A] text-[#FDFBF7] hover:bg-[#1a1a1a] disabled:opacity-40">
                  Continue to Payment →
                </button>
              </div>
            </div>
          )}

          {step === "payment" && (
            <div className="max-w-sm">
              <h2 className="font-['Playfair_Display'] text-2xl text-[#1a1a1a] mb-5">Payment</h2>
              <div className="p-4 mb-4" style={{ border: "0.5px solid #dbdad6" }}>
                <div className="w-44 h-44 mx-auto bg-[#1a1a1a] flex items-center justify-center">
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
              <p className="font-['JetBrains_Mono'] text-[9px] tracking-widest uppercase text-center mb-2" style={{ color: "rgba(26,26,26,0.4)" }}>Scan with banking app · PayOS</p>
              <p className="font-['Playfair_Display'] text-2xl text-[#1a1a1a] text-center mb-5">₫{total.toLocaleString()}</p>
              <div className="space-y-2 mb-5" style={{ borderTop: "0.5px solid #dbdad6", paddingTop: "1rem" }}>
                {[["Recipient", form.name], ["Phone", form.phone], ["Address", `${form.address}, ${form.city}`]].map(([k,v]) => (
                  <div key={k} className="flex justify-between gap-4">
                    <span className="font-['JetBrains_Mono'] text-[9px] uppercase tracking-widest" style={{ color: "rgba(26,26,26,0.4)" }}>{k}</span>
                    <span className="font-['Inter'] text-sm text-[#1a1a1a] text-right">{v}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep("delivery")} className="font-['JetBrains_Mono'] text-[10px] tracking-widest uppercase px-4 py-3 hover:bg-[#f5f3ef]" style={{ border: "0.5px solid #dbdad6" }}>← Back</button>
                <button onClick={() => setStep("confirm")}
                  className="flex-1 font-['JetBrains_Mono'] text-[10px] tracking-widest uppercase py-3 bg-[#0D1F1A] text-[#FDFBF7] hover:bg-[#1a1a1a]">Confirm Payment ✓</button>
              </div>
            </div>
          )}

          {step === "confirm" && (
            <div className="max-w-md py-8">
              <p className="font-['JetBrains_Mono'] text-[9px] tracking-widest uppercase mb-3" style={{ color: "rgba(26,26,26,0.38)" }}>Order Confirmed</p>
              <h2 className="font-['Playfair_Display'] text-4xl lg:text-5xl text-[#1a1a1a] mb-3">TC-{Math.floor(Math.random() * 9000 + 1000)}</h2>
              <p className="font-['Inter'] text-sm leading-relaxed mb-6" style={{ color: "rgba(26,26,26,0.55)" }}>Thank you, {form.name}.</p>
              <div className="p-4 mb-8" style={{ background: "#f5f3ef", border: "0.5px solid #dbdad6" }}>
                {[["Name", form.name], ["Phone", form.phone], ["Ship to", `${form.address}, ${form.city}`], ["Estimated", "7 working days"]].map(([k,v]) => (
                  <div key={k} className="flex justify-between py-1.5" style={{ borderBottom: "0.5px solid #dbdad6" }}>
                    <span className="font-['JetBrains_Mono'] text-[9px] uppercase tracking-widest" style={{ color: "rgba(26,26,26,0.4)" }}>{k}</span>
                    <span className="font-['Inter'] text-sm text-[#1a1a1a]">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {step !== "confirm" && (
          <div>
            <div style={{ border: "0.5px solid #dbdad6" }}>
              <div className="px-5 py-4" style={{ borderBottom: "0.5px solid #dbdad6" }}>
                <p className="font-['JetBrains_Mono'] text-[9px] tracking-widest uppercase" style={{ color: "rgba(26,26,26,0.38)" }}>Order Summary</p>
              </div>
              <div className="px-5 pb-4 space-y-2" style={{ borderTop: "0.5px solid #dbdad6", paddingTop: "1rem" }}>
                <div className="flex justify-between">
                  <span className="font-['JetBrains_Mono'] text-[10px] uppercase tracking-widest" style={{ color: "rgba(26,26,26,0.4)" }}>Subtotal</span>
                  <span className="font-['JetBrains_Mono'] text-[10px] text-[#1a1a1a]">₫{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-['JetBrains_Mono'] text-[10px] uppercase tracking-widest" style={{ color: "rgba(26,26,26,0.4)" }}>Shipping</span>
                  <span className="font-['JetBrains_Mono'] text-[10px] text-[#1a1a1a]">₫{shipping.toLocaleString()}</span>
                </div>
                {discount && (
                  <div className="flex justify-between">
                    <span className="font-['JetBrains_Mono'] text-[10px] uppercase tracking-widest" style={{ color: "#0D1F1A" }}>Discount</span>
                    <span className="font-['JetBrains_Mono'] text-[10px]" style={{ color: "#0D1F1A" }}>-₫{discountAmount.toLocaleString()}</span>
                  </div>
                )}
                <div className="pt-2" style={{ borderTop: "0.5px solid #dbdad6" }}>
                  <button onClick={() => setShowDiscount(true)}
                    className="flex items-center gap-1.5 font-['JetBrains_Mono'] text-[9px] tracking-widest uppercase py-1 hover:text-[#1a1a1a] transition-colors"
                    style={{ color: "rgba(26,26,26,0.35)" }}>
                    <Tag size={11} />
                    {discount ? "Change Code" : "Have a discount code?"}
                  </button>
                </div>
                <div className="flex justify-between pt-2" style={{ borderTop: "0.5px solid #dbdad6" }}>
                  <span className="font-['JetBrains_Mono'] text-[10px] uppercase tracking-widest text-[#1a1a1a]">Total</span>
                  <span className="font-['Playfair_Display'] text-xl text-[#1a1a1a]">₫{total.toLocaleString()}</span>
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
