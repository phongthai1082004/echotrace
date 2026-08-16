"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslation } from "react-i18next";
import type { ComponentType } from "react";
import { X } from "lucide-react";
import type { StudioAPI } from "@/features/studio-canvas/api/studio-api";
import { sampleBookAPI } from "@/features/studio-canvas/api/sample-book-api";
import { useStudioEditor } from "@/features/studio-canvas/hooks/useStudioEditor";
import { apiFetch } from "@/lib/api.fetch";
import { neoBtnPrimary } from "@/lib/styles";

const StudioPage = dynamic(
  () => import("@/features/studio-canvas/components/StudioPage").then((m) => ({ default: m.StudioPage })),
  { ssr: false },
) as ComponentType<{ api: StudioAPI; hideOrder?: boolean; noPadding?: boolean; backHref?: string }>;

export default function AdminSampleStudioPage() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const accessToken = (session as any)?.accessToken;
  const bookId = searchParams.get("id");
  const format = searchParams.get("format");
  const w = Number(searchParams.get("w") || "0");
  const h = Number(searchParams.get("h") || "0");
  const needsSize = !bookId && !format;

  const [showSize, setShowSize] = useState(needsSize);
  const [sizes, setSizes] = useState<any[]>([]);
  const [sizesLoading, setSizesLoading] = useState(false);

  useEffect(() => {
    if (!showSize || sizes.length || !accessToken) return;
    setSizesLoading(true);
    apiFetch<any>("/api/user/suppliers/options", accessToken)
      .then((d) => setSizes(d?.sizes ?? []))
      .catch(() => setSizes([]))
      .finally(() => setSizesLoading(false));
  }, [showSize, sizes.length, accessToken]);

  const initialSize = w > 0 && h > 0 ? { width: w, height: h } : null;
  const { loaded, loadError } = useStudioEditor(
    bookId,
    status === "authenticated",
    (id) => sampleBookAPI.load(id, accessToken),
    format,
    initialSize,
  );

  if (needsSize) {
    return (
      <div className="min-h-screen bg-[#F8F2E5] flex items-center justify-center">
        <div className="bg-[#FFF7D6] rounded-[10px] border-[3px] border-[#222] shadow-[4px_4px_0_#222] w-[400px] p-5">
          <div className="flex items-center justify-between mb-4">
            <p suppressHydrationWarning className="font-bold text-lg">{t("customer.myJournals.chooseSize")}</p>
            <button onClick={() => router.push("/admin/sample-books")} className="p-1.5 hover:bg-[#e8e6e0] rounded-lg border-2 border-[#222]"><X size={16} /></button>
          </div>
          <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
            {sizesLoading ? (
              <p suppressHydrationWarning className="font-mono text-[10px] font-bold text-[#999]">{t("common.loading")}</p>
            ) : sizes.length === 0 ? (
              <p suppressHydrationWarning className="font-mono text-[10px] font-bold text-[#999]">{t("customer.myJournals.noSize")}</p>
            ) : (
              sizes.map((s) => {
                const lang = (i18n.language || "en").slice(0, 2) as "vi" | "en" | "es";
                const label = s.name?.[lang] || s.name?.en || s.code;
                const desc = s.description?.[lang] || s.description?.en || "";
                const cm = s.width && s.height ? `${s.width / 10}×${s.height / 10} cm` : "";
                return (
                  <button key={s.code} onClick={() => router.push(`/admin/studio?format=${s.code}&w=${s.width ? s.width * 4 : ""}&h=${s.height ? s.height * 4 : ""}`)}
                    className="w-full text-left px-4 py-3 rounded-[8px] border-2 border-[#222] bg-white hover:bg-[#FFF7D6] hover:shadow-[2px_2px_0_#222] transition-all cursor-pointer">
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold">{label}</span>
                      {cm && <span className="font-mono text-[9px] text-[#999]">{cm}</span>}
                    </span>
                    {desc && <span suppressHydrationWarning className="block text-[11px] leading-snug text-[#666] mt-1">{desc}</span>}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return <div className="min-h-screen bg-[#F8F2E5] flex flex-col items-center justify-center gap-3"><p className="text-sm font-bold text-[#B54843]">Failed to load template: {loadError}</p></div>;
  }
  if (!loaded) {
    return <div className="min-h-screen bg-[#F8F2E5] flex items-center justify-center"><p suppressHydrationWarning className="font-mono text-[10px] font-bold">{t("common.loading")}</p></div>;
  }
  return (
    <div className="min-h-screen bg-[#F8F2E5]">
      <StudioPage api={sampleBookAPI} hideOrder noPadding backHref="/admin/sample-books" />
    </div>
  );
}