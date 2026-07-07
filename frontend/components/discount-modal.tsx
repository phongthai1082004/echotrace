"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { X, Check, Tag } from "lucide-react";

export function DiscountModal({
  open,
  onClose,
  subtotal,
}: {
  open: boolean;
  onClose: () => void;
  subtotal: number;
}) {
  const [code, setCode] = useState("");
  const [discount, setDiscount] = useState<{ amount: number; code: string } | null>(null);
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);

  const handleApply = () => {
    if (!code.trim()) return;
    const c = code.toUpperCase();
    if (c === "WELCOME10") {
      const amount = Math.round(subtotal * 0.1);
      setDiscount({ code: c, amount });
      setFeedback({ ok: true, message: `10% off — ₫${amount.toLocaleString()}` });
    } else if (c === "FLAT50" || c === "FREESHIP") {
      setDiscount({ code: c, amount: 50000 });
      setFeedback({ ok: true, message: "₫50,000 off" });
    } else {
      setFeedback({ ok: false, message: "Invalid discount code" });
    }
  };

  const handleRemove = () => {
    setDiscount(null);
    setCode("");
    setFeedback(null);
  };

  const handleClose = () => {
    setCode("");
    setFeedback(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose}>
      <div
        className="bg-[#FDFBF7] w-full max-w-sm"
        style={{ border: "0.5px solid #dbdad6" }}
      >
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "0.5px solid #dbdad6" }}>
          <div className="flex items-center gap-2">
            <Tag size={13} style={{ color: "rgba(26,26,26,0.4)" }} />
            <span className="font-['JetBrains_Mono'] text-[10px] tracking-widest uppercase" style={{ color: 'rgba(26,26,26,0.5)' }}>Discount Code</span>
          </div>
          <button onClick={handleClose} className="opacity-30 hover:opacity-70">
            <X size={14} />
          </button>
        </div>

        <div className="px-6 py-5">
          {discount ? (
            <div>
              <div
                className="flex items-center justify-between px-4 py-3 mb-4"
                style={{ background: "#f5f3ef", border: "0.5px solid #dbdad6" }}
              >
                <div className="flex items-center gap-2">
                  <Check size={13} style={{ color: "#0D1F1A" }} />
                  <span className="font-['JetBrains_Mono'] text-[11px] text-[#1a1a1a]">{discount.code}</span>
                </div>
                <div className="text-right">
                  <p className="font-['JetBrains_Mono'] text-[11px] text-[#0D1F1A]">-₫{discount.amount.toLocaleString()}</p>
                </div>
              </div>
              <button
                onClick={handleRemove}
                className="w-full font-['JetBrains_Mono'] text-[9px] tracking-widest uppercase py-2 hover:bg-[#f5f3ef]"
                style={{ border: "0.5px solid #dbdad6" }}
              >
                Remove Code
              </button>
            </div>
          ) : (
            <div>
              <div className="flex gap-2 mb-3">
                <input
                  value={code}
                  onChange={(e) => { setCode(e.target.value); setFeedback(null); }}
                  onKeyDown={(e) => e.key === "Enter" && handleApply()}
                  placeholder="Enter code"
                  className="flex-1 bg-transparent font-['Inter'] text-[13px] text-[#1a1a1a] px-3 py-2.5 placeholder:text-[#1a1a1a]/25 focus:outline-none"
                  style={{ border: "0.5px solid #dbdad6" }}
                />
                <button
                  onClick={handleApply}
                  disabled={!code.trim()}
                  className="font-['JetBrains_Mono'] text-[9px] tracking-widest uppercase px-5 py-2.5 bg-[#0D1F1A] text-[#FDFBF7] hover:bg-[#1a1a1a] disabled:opacity-40"
                >
                  Apply
                </button>
              </div>
              {feedback && (
                <p
                  className="font-['JetBrains_Mono'] text-[9px] tracking-widest uppercase"
                  style={{ color: feedback.ok ? "#0D1F1A" : "#c0392b" }}
                >
                  {feedback.message}
                </p>
              )}
              <div className="mt-4 pt-4" style={{ borderTop: "0.5px solid #dbdad6" }}>
                <p className="font-['JetBrains_Mono'] text-[8px] tracking-widest uppercase mb-2" style={{ color: "rgba(26,26,26,0.3)" }}>Try these</p>
                <div className="flex flex-wrap gap-2">
                  {["WELCOME10", "FLAT50", "FREESHIP"].map((c) => (
                    <button
                      key={c}
                      onClick={() => { setCode(c); }}
                      className="font-['JetBrains_Mono'] text-[9px] tracking-widest uppercase px-3 py-1 hover:bg-[#f5f3ef]"
                      style={{ border: "0.5px solid #dbdad6", color: "rgba(26,26,26,0.5)" }}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
}
