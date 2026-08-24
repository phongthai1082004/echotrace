"use client";

import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

export function SizeModal({
  sizes,
  loading,
  onClose,
}: {
  sizes: any[];
  loading: boolean;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation();
  const router = useRouter();

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-[#FFF7D6] rounded-[10px] border-[3px] border-[#222] shadow-[4px_4px_0_#222] w-[360px] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <p suppressHydrationWarning className="font-bold text-lg">
            {t("customer.myJournals.chooseSize")}
          </p>
          <button onClick={onClose} className="p-1.5 hover:bg-[#e8e6e0] rounded-lg border-2 border-[#222]">
            <X size={16} />
          </button>
        </div>
        <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
          {loading ? (
            <p suppressHydrationWarning className="font-mono text-[10px] font-bold text-[#999]">
              {t("common.loading")}
            </p>
          ) : sizes.length === 0 ? (
            <p suppressHydrationWarning className="font-mono text-[10px] font-bold text-[#999]">
              {t("customer.myJournals.noSize")}
            </p>
          ) : (
            sizes.map((s) => {
              const lang = (i18n.language || "en").slice(0, 2) as "vi" | "en" | "es";
              const label = s.name?.[lang] || s.name?.en || s.code;
              const desc = s.description?.[lang] || s.description?.en || "";
              const cm = s.width && s.height ? `${s.width / 10}×${s.height / 10} cm` : "";
              return (
                <button
                  key={s.code}
                  onClick={() =>
                    router.push(
                      `/studio?format=${s.code}&w=${s.width ? s.width * 4 : ""}&h=${s.height ? s.height * 4 : ""}`,
                    )
                  }
                  className="w-full text-left px-4 py-3 rounded-[8px] border-2 border-[#222] bg-white hover:bg-[#FFF7D6] hover:shadow-[2px_2px_0_#222] transition-all cursor-pointer"
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold">{label}</span>
                    {cm && <span className="font-mono text-[9px] text-[#999]">{cm}</span>}
                  </span>
                  {desc && (
                    <span suppressHydrationWarning className="block text-[11px] leading-snug text-[#666] mt-1">
                      {desc}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
