"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useTranslation } from "react-i18next";
import { card, cardHover } from "@/lib/styles";
import { apiFetch } from "@/lib/api.fetch";
import { useToast } from "@/components/toast";
import type { ExploreSample } from "../_hooks/use-explore";

function InfoRow({ s, t }: { s: ExploreSample; t: (k: string) => string }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="font-mono text-[9px] font-bold tracking-widest uppercase text-[#999]">{s.style}</span>
      <span className="text-[#222]">·</span>
      <span className="font-mono text-[9px] font-bold text-[#999]" suppressHydrationWarning>
        {s.pageCount} {t("customer.explore.pg")}
      </span>
      {s.paperWidth && s.paperHeight ? (
        <>
          <span className="text-[#222]">·</span>
          <span className="font-mono text-[9px] font-bold text-[#999]" suppressHydrationWarning>
            {s.paperWidth}×{s.paperHeight}mm
          </span>
        </>
      ) : null}
    </div>
  );
}

export function SampleCard({ s, variant = "sample" }: { s: ExploreSample; variant?: "sample" | "album" }) {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const token = (session as any)?.accessToken;
  const { showToast } = useToast();
  const [adding, setAdding] = useState(false);
  const thumb = s.thumbnailUrl ?? s.coverUrl;

  const addAlbum = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!token) {
      showToast(t("customer.explore.loginRequired") || "Vui lòng đăng nhập", "error");
      return;
    }
    try {
      setAdding(true);
      await apiFetch("/api/cart/album", token, {
        method: "POST",
        body: JSON.stringify({ sampleBookId: s.id, quantity: 1 }),
      });
      showToast(t("customer.studio.addedToCart") || "Đã thêm vào giỏ", "success");
    } catch {
      showToast("Thêm vào giỏ thất bại", "error");
    } finally {
      setAdding(false);
    }
  };

  const viewStub = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    showToast(t("customer.explore.viewSoon"), "info");
  };

  if (variant === "album") {
    return (
      <div className={`group relative cursor-pointer ${card} ${cardHover} overflow-hidden`}>
        <div className="aspect-[3/4] bg-[#e8e6e0] overflow-hidden relative">
          {thumb ? (
            <Image src={thumb} alt={s.name} fill sizes="(max-width: 768px) 50vw, 220px" className="object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="font-mono text-[9px] font-bold tracking-widest uppercase text-[#999]">{s.name}</span>
            </div>
          )}
          {s.theme && (
            <div className="absolute top-3 left-3">
              <span className="font-mono text-[7px] font-bold tracking-widest uppercase px-1.5 py-0.5 bg-[#FFF7D6] border-2 border-[#222] rounded-md">
                {s.theme.name}
              </span>
            </div>
          )}
          <div className="absolute inset-0 bg-[#222]/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 px-3">
            <button
              onClick={addAlbum}
              disabled={adding}
              className="font-mono text-[10px] font-bold tracking-widest uppercase px-3 py-2 bg-[#D4A574] border-2 border-[#222] shadow-[2px_2px_0_#222] hover:translate-x-px hover:translate-y-px hover:shadow-none transition-all"
            >
              {adding ? "..." : t("customer.explore.addToCart")}
            </button>
            <button
              onClick={viewStub}
              className="font-mono text-[10px] font-bold tracking-widest uppercase px-3 py-2 bg-white border-2 border-[#222] shadow-[2px_2px_0_#222] hover:translate-x-px hover:translate-y-px hover:shadow-none transition-all"
            >
              {t("customer.explore.view")}
            </button>
          </div>
        </div>
        <div className="p-4 border-t-[3px] border-[#222]">
          <h3 className="text-base font-bold leading-tight mb-1">{s.name}</h3>
          {s.description && <p className="text-[11px] line-clamp-2 mb-2 text-[#666]">{s.description}</p>}
          <InfoRow s={s} t={t} />
        </div>
      </div>
    );
  }

  return (
    <Link href={`/studio?sample=${s.id}`} className={`group cursor-pointer ${card} ${cardHover} overflow-hidden`}>
      <div className="aspect-[3/4] bg-[#e8e6e0] overflow-hidden relative">
        {thumb ? (
          <Image src={thumb} alt={s.name} fill sizes="(max-width: 768px) 50vw, 220px" className="object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="font-mono text-[9px] font-bold tracking-widest uppercase text-[#999]">{s.name}</span>
          </div>
        )}
        {s.theme && (
          <div className="absolute top-3 left-3">
            <span className="font-mono text-[7px] font-bold tracking-widest uppercase px-1.5 py-0.5 bg-[#FFF7D6] border-2 border-[#222] rounded-md">
              {s.theme.name}
            </span>
          </div>
        )}
      </div>
      <div className="p-4 border-t-[3px] border-[#222]">
        <h3 className="text-base font-bold leading-tight mb-1">{s.name}</h3>
        {s.description && <p className="text-[11px] line-clamp-2 mb-2 text-[#666]">{s.description}</p>}
        <InfoRow s={s} t={t} />
      </div>
    </Link>
  );
}
