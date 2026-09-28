"use client";

import { useTranslation } from "react-i18next";
import { Trash2 } from "lucide-react";
import { card } from "@/lib/styles";
import { r2Thumb } from "@/lib/upload";
import { SkeletonGrid } from "@/components/skeleton";
import { CATEGORY_COLORS, ASSET_CATEGORIES, AssetCategory } from "@echotrace/shared";
import type { Asset } from "../_hooks/use-stickers";

export function StickerGrid({
  filtered,
  loading,
  onDelete,
}: {
  filtered: Asset[];
  loading: boolean;
  onDelete: (id: number) => void;
}) {
  const { t } = useTranslation();
  const assetMeta = {
    sticker: { label: t("admin.stickers.sticker"), color: "bg-[#FFD93D] text-[#222]" },
  };
  const catLabels = Object.fromEntries(
    ASSET_CATEGORIES.map((c) => [c, t(`admin.stickers.categoryLabels.${c}`)]),
  ) as Record<AssetCategory, string>;

  if (loading) return <SkeletonGrid count={12} />;
  if (filtered.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-lg font-bold text-[#999]">{t("admin.stickers.noAssets")}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-6 gap-4">
      {filtered.map((a) => (
        <div key={a.id} className={`${card} p-2 relative group`}>
          <div className="w-full aspect-square rounded-[6px] overflow-hidden bg-white border-2 border-[#222] flex items-center justify-center">
            <img src={r2Thumb(a.url, 200)} alt={a.name} className="w-full h-full object-contain" loading="lazy" />
          </div>
          <p className="font-mono text-[8px] font-bold tracking-widest uppercase mt-1.5 text-center text-[#666] truncate">
            {a.name}
          </p>
          <div className="flex items-center justify-center gap-1 mt-0.5">
            <span className={`font-mono text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded ${assetMeta[a.type].color}`}>
              {assetMeta[a.type].label}
            </span>
            {a.category && (
              <span className="flex items-center gap-1 font-mono text-[8px] text-[#999] truncate">
                <span className={`w-2 h-2 rounded-full shrink-0 ${CATEGORY_COLORS[a.category]}`} />
                {catLabels[a.category]}
              </span>
            )}
          </div>
          <button
            type="button"
            aria-label={t("common.delete")}
            onClick={() => onDelete(a.id)}
            className="absolute top-1 right-1 p-1.5 bg-[#B54843] text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Trash2 size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}
