"use client";

import Link from "next/link";
import Image from "next/image";
import { useTranslation } from "react-i18next";
import { card, cardHover } from "@/lib/styles";
import type { ExploreSample } from "../_hooks/use-explore";

export function SampleCard({ s }: { s: ExploreSample }) {
  const { t } = useTranslation();
  const thumb = s.thumbnailUrl ?? s.coverUrl;

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
      </div>
    </Link>
  );
}
