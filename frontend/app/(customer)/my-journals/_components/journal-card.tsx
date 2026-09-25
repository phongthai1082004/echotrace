"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Trash2 } from "lucide-react";
import { card, cardHover } from "@/lib/styles";
import type { JournalBook } from "../_hooks/use-my-books";

export function JournalCard({ j, onDelete }: { j: JournalBook; onDelete: (j: JournalBook) => void }) {
  const { t } = useTranslation();
  const thumb = j.thumbnailUrl ?? j.coverUrl;

  return (
    <div className={`w-full group ${card} ${cardHover} overflow-hidden`}>
      <Link href={`/studio?id=${j.id}`} className="block">
        <div className="relative overflow-hidden bg-[#e8e6e0] aspect-[3/4]">
          {thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumb} alt={j.title} loading="lazy" decoding="async" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span
                suppressHydrationWarning
                className="font-mono text-[9px] font-bold tracking-widest uppercase text-[#999]"
              >
                {t("customer.myJournals.noCover")}
              </span>
            </div>
          )}
          <button
            type="button"
            aria-label={t("common.delete")}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete(j);
            }}
            className="absolute top-2 right-2 p-1.5 min-h-[40px] min-w-[40px] flex items-center justify-center bg-[#B54843] text-white rounded-md opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity hover:bg-[#943a36] cursor-pointer z-10"
          >
            <Trash2 size={14} />
          </button>
        </div>
        <div className="p-4 border-t-[3px] border-[#222]">
          <h3 className="text-lg font-bold mb-1 leading-tight">{j.title}</h3>
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="font-mono text-[9px] font-bold tracking-widest uppercase text-[#999]">{j.style}</span>
            <span className="text-[#222]">·</span>
            <span suppressHydrationWarning className="font-mono text-[9px] font-bold text-[#999]">
              {j.pages} {t("customer.myJournals.pg")}
            </span>
          </div>
          <p className="font-mono text-[9px] font-bold text-[#999]">{j.createdAt?.slice(0, 10)}</p>
        </div>
      </Link>
    </div>
  );
}
