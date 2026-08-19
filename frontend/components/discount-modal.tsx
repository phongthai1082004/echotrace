"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog } from "@/components/ui/dialog";
import { X, Check, Tag } from "lucide-react";
import { neoBtn, neoBtnPrimary } from "@/lib/styles";

// ponytail: coupon validate + tính discount từ server — frontend không tự định giá.
export function DiscountModal({
  open,
  onClose,
  appliedCode,
  apply,
  remove,
}: {
  open: boolean;
  onClose: () => void;
  appliedCode: string | null;
  apply: (code: string) => Promise<{ ok: boolean; amount: number }>;
  remove: () => void;
}) {
  const { t } = useTranslation();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);

  const handleApply = async () => {
    if (!code.trim() || busy) return;
    setBusy(true);
    try {
      const res = await apply(code.toUpperCase());
      if (res.ok) {
        setFeedback({ ok: true, message: `-₫${res.amount.toLocaleString()}` });
      } else {
        setFeedback({ ok: false, message: t("discount.invalid") });
      }
    } finally {
      setBusy(false);
    }
  };

  const handleClose = () => {
    setCode("");
    setFeedback(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose}>
      <div className="bg-[#FFF7D6] w-full max-w-sm rounded-[10px] border-[3px] border-[#222] shadow-[4px_4px_0_#222] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b-[3px] border-[#222]">
          <div className="flex items-center gap-2">
            <Tag size={13} className="text-[#666]" />
            <span className="font-mono text-[10px] font-bold tracking-widest uppercase text-[#666]">
              {t("discount.title")}
            </span>
          </div>
          <button onClick={handleClose} className="p-1 hover:bg-[#e8e6e0] rounded-[6px]">
            <X size={14} />
          </button>
        </div>

        <div className="px-6 py-5">
          {appliedCode ? (
            <div>
              <div className="flex items-center justify-between px-4 py-3 mb-4 bg-[#e8e6e0] rounded-lg border-2 border-[#222] shadow-[2px_2px_0_#222]">
                <div className="flex items-center gap-2">
                  <Check size={13} className="text-[#5A8F4A]" />
                  <span className="font-mono text-[11px] font-bold">{appliedCode}</span>
                </div>
                <p className="font-mono text-[11px] font-bold text-[#5A8F4A]">✓</p>
              </div>
              <button
                onClick={() => {
                  remove();
                  handleClose();
                }}
                className={`${neoBtn} w-full font-mono text-[9px] font-bold tracking-widest uppercase py-2`}
              >
                {t("discount.removeCode")}
              </button>
            </div>
          ) : (
            <div>
              <div className="flex gap-2 mb-3">
                <input
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value);
                    setFeedback(null);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleApply()}
                  placeholder={t("discount.enterCode")}
                  className="flex-1 bg-white text-[13px] font-bold px-3 py-2.5 rounded-lg border-2 border-[#222] shadow-[2px_2px_0_#222] placeholder:text-[#999] focus:outline-none focus:translate-x-px focus:translate-y-px focus:shadow-[1px_1px_0_#222] transition-[transform,box-shadow]"
                />
                <button
                  onClick={handleApply}
                  disabled={!code.trim() || busy}
                  className={`${neoBtnPrimary} font-mono text-[9px] font-bold tracking-widest uppercase px-5 py-2.5 disabled:opacity-40`}
                >
                  {busy ? "..." : t("discount.apply")}
                </button>
              </div>
              {feedback && (
                <p
                  className={`font-mono text-[9px] font-bold tracking-widest uppercase ${feedback.ok ? "text-[#5A8F4A]" : "text-[#B54843]"}`}
                >
                  {feedback.message}
                </p>
              )}
              <div className="mt-4 pt-4 border-t-[3px] border-[#222]">
                <p className="font-mono text-[8px] font-bold tracking-widest uppercase mb-2 text-[#999]">
                  {t("discount.tryThese")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {["WELCOME10", "FLAT50", "FREESHIP"].map((c) => (
                    <button
                      key={c}
                      onClick={() => setCode(c)}
                      className={`${neoBtn} font-mono text-[9px] font-bold tracking-widest uppercase px-3 py-1 text-[#666]`}
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
