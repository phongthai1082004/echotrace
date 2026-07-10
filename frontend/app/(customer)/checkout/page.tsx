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
      <label className="font-mono text-[10px] font-bold tracking-widest uppercase block mb-1.5 text-[#666]">{label}</label>
      <input type={type} value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} placeholder={placeholder}
        className="w-full bg-[#FFF7D6] text-sm font-bold rounded-[8px] px-3 py-2.5 border-[2px] border-[#222] shadow-[2px_2px_0_#222] placeholder:text-[#999] focus:outline-none focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-[1px_1px_0_#222] transition-all" />
    </div>
  );

  return (
    <div className="min-h-screen pt-15">
      <div className="px-8 lg:px-16 py-10 border-b-[3px] border-[#222]">
        <p className="font-mono text-[9px] font-bold tracking-widest uppercase mb-1 text-[#666]">Checkout</p>
        <h1 className="text-3xl lg:text-4xl font-bold">Your Cart</h1>
        <div className="flex items-center gap-4 mt-6">
          {(["cart", "delivery", "payment", "confirm"] as const).map((s, i) => (
            <div key={s} className="flex items-center gap-3">
              <div className="flex items-center gap-2" style={{ opacity: step === s ? 1 : 0.3 }}>
                <span className={`font-mono text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-[4px] ${step === s ? "bg-[#222] text-white" : "border-[2px] border-[#222]"}`}>{i + 1}</span>
                <span className="font-mono text-[10px] font-bold tracking-widest uppercase hidden sm:block">{s === "cart" ? "Cart" : s === "delivery" ? "Delivery" : s === "payment" ? "Payment" : "Done"}</span>
              </div>
              {i < 3 && <div className="w-6 h-[3px] bg-[#222]/20 rounded-full" />}
            </div>
          ))}
        </div>
      </div>

      <div className="px-8 lg:px-16 py-10 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-10">
        <div>
          {step === "cart" && (
            <div className="py-16 text-center">
              <p className="text-2xl font-bold mb-2">Your cart is empty</p>
              <p className="font-mono text-[10px] font-bold tracking-widest uppercase text-[#999]">Save a journal from Studio to get started</p>
            </div>
          )}

          {step === "delivery" && (
            <div className="space-y-6 max-w-lg">
              <h2 className="text-2xl font-bold">Delivery Details</h2>
              {field("Full Name", "name", "text", "Recipient name")}
              {field("Phone Number", "phone", "tel", "+84 …")}
              {field("Street Address", "address", "text", "House number, street…")}
              {field("City / Province", "city", "text", "Hà Nội, TP. HCM…")}
              {field("Note (optional)", "note", "text", "Special instructions…")}
              <div className="flex gap-3 pt-1">
                <button onClick={() => setStep("cart")} className="font-mono text-[10px] font-bold tracking-widest uppercase px-5 py-3 rounded-[10px] border-[3px] border-[#222] shadow-[4px_4px_0_#222] bg-[#FFF7D6] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#222] transition-all">← Back</button>
                <button onClick={() => setStep("payment")} disabled={!form.name || !form.phone || !form.address || !form.city}
                  className="font-mono text-[10px] font-bold tracking-widest uppercase px-8 py-3 bg-[#222] text-white rounded-[10px] border-[3px] border-[#222] shadow-[4px_4px_0_#222] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#222] transition-all disabled:opacity-40">
                  Continue to Payment →
                </button>
              </div>
            </div>
          )}

          {step === "payment" && (
            <div className="max-w-sm">
              <h2 className="text-2xl font-bold mb-5">Payment</h2>
              <div className="p-4 mb-4 rounded-[10px] border-[3px] border-[#222] shadow-[4px_4px_0_#222] bg-white">
                <div className="w-44 h-44 mx-auto bg-[#222] flex items-center justify-center rounded-[8px]">
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
              <p className="font-mono text-[9px] font-bold tracking-widest uppercase text-center mb-2 text-[#666]">Scan with banking app · PayOS</p>
              <p className="text-2xl font-bold text-center mb-5">₫{total.toLocaleString()}</p>
              <div className="space-y-2 mb-5 pt-4 border-t-[3px] border-[#222]">
                {[["Recipient", form.name], ["Phone", form.phone], ["Address", `${form.address}, ${form.city}`]].map(([k,v]) => (
                  <div key={k} className="flex justify-between gap-4">
                    <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-[#666]">{k}</span>
                    <span className="text-sm font-bold text-right">{v}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep("delivery")} className="font-mono text-[10px] font-bold tracking-widest uppercase px-4 py-3 rounded-[10px] border-[3px] border-[#222] shadow-[4px_4px_0_#222] bg-[#FFF7D6] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#222] transition-all">← Back</button>
                <button onClick={() => setStep("confirm")}
                  className="flex-1 font-mono text-[10px] font-bold tracking-widest uppercase py-3 bg-[#222] text-white rounded-[10px] border-[3px] border-[#222] shadow-[4px_4px_0_#222] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#222] transition-all">Confirm Payment ✓</button>
              </div>
            </div>
          )}

          {step === "confirm" && (
            <div className="max-w-md py-8">
              <p className="font-mono text-[9px] font-bold tracking-widest uppercase mb-3 text-[#666]">Order Confirmed</p>
              <h2 className="text-4xl lg:text-5xl font-bold mb-3">TC-{Math.floor(Math.random() * 9000 + 1000)}</h2>
              <p className="text-sm leading-relaxed mb-6 text-[#666]">Thank you, {form.name}.</p>
              <div className="p-4 mb-8 bg-[#FFF7D6] rounded-[10px] border-[3px] border-[#222] shadow-[4px_4px_0_#222]">
                {[["Name", form.name], ["Phone", form.phone], ["Ship to", `${form.address}, ${form.city}`], ["Estimated", "7 working days"]].map(([k,v]) => (
                  <div key={k} className="flex justify-between py-1.5 border-b-[2px] border-[#222] last:border-b-0">
                    <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-[#666]">{k}</span>
                    <span className="text-sm font-bold">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {step !== "confirm" && (
          <div>
            <div className="bg-[#FFF7D6] rounded-[10px] border-[3px] border-[#222] shadow-[4px_4px_0_#222] overflow-hidden">
              <div className="px-5 py-4 border-b-[3px] border-[#222]">
                <p className="font-mono text-[9px] font-bold tracking-widest uppercase text-[#666]">Order Summary</p>
              </div>
              <div className="px-5 pb-4 space-y-2 pt-3">
                <div className="flex justify-between">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#666]">Subtotal</span>
                  <span className="font-mono text-[10px] font-bold">₫{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#666]">Shipping</span>
                  <span className="font-mono text-[10px] font-bold">₫{shipping.toLocaleString()}</span>
                </div>
                {discount && (
                  <div className="flex justify-between">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#5A8F4A]">Discount</span>
                    <span className="font-mono text-[10px] font-bold text-[#5A8F4A]">-₫{discountAmount.toLocaleString()}</span>
                  </div>
                )}
                <div className="pt-2 border-t-[2px] border-[#222]">
                  <button onClick={() => setShowDiscount(true)}
                    className="flex items-center gap-1.5 font-mono text-[9px] font-bold tracking-widest uppercase py-1 text-[#999] hover:text-[#222] transition-colors">
                    <Tag size={11} />
                    {discount ? "Change Code" : "Have a discount code?"}
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
