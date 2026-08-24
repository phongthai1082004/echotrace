"use client";

import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { CloseButton } from "@/components/ui/close-button";
import { NeoSelect } from "@/components/neo-select";
import { label, card, input, neoBtnPrimary, neoBtnSm } from "@/lib/styles";
import { ASSET_CATEGORIES, CATEGORY_COLORS, AssetCategory } from "@echotrace/shared";

export function UploadModal({
  uploading,
  onUpload,
  onClose,
}: {
  uploading: boolean;
  onUpload: (file: File, name: string, category: AssetCategory | "") => Promise<boolean | void>;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [category, setCategory] = useState<AssetCategory | "">("");
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const catLabels = Object.fromEntries(
    ASSET_CATEGORIES.map((c) => [c, t(`admin.stickers.categoryLabels.${c}`)]),
  ) as Record<AssetCategory, string>;

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center">
      <div className={`${card} w-80 p-5`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <p className="font-bold text-sm">{t("admin.stickers.uploadModal")}</p>
          <CloseButton onClick={() => !uploading && onClose()} size={14} />
        </div>
        <div className="space-y-3">
          <div>
            <p className={`${label} mb-1`}>{t("admin.stickers.assetName")}</p>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("admin.stickers.namePlaceholder")}
              className={input}
            />
          </div>
          <div>
            <p className={`${label} mb-1`}>{t("admin.stickers.category")}</p>
            <NeoSelect
              value={category}
              onChange={(v) => setCategory(v as AssetCategory | "")}
              placeholder={t("admin.stickers.noCategory")}
              options={ASSET_CATEGORIES.map((c) => ({ value: c, label: catLabels[c], color: CATEGORY_COLORS[c] }))}
            />
          </div>
          <div>
            <p className={`${label} mb-1`}>{t("admin.stickers.image")}</p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className={`${neoBtnSm} font-mono text-[9px] font-bold tracking-widest uppercase px-3 py-2 shrink-0`}
              >
                {t("admin.stickers.chooseFile")}
              </button>
              <span className="text-sm font-bold truncate text-[#666] min-w-0">
                {file?.name || t("admin.stickers.noFile")}
              </span>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="hidden"
              />
            </div>
          </div>
          <button
            onClick={async () => {
              if (!file) return;
              const ok = await onUpload(file, name, category);
              if (ok !== false) onClose();
            }}
            disabled={uploading || !name.trim() || !file}
            className={`${neoBtnPrimary} font-mono text-[9px] font-bold tracking-widest uppercase w-full py-3 mt-2 disabled:opacity-40 disabled:pointer-events-none`}
          >
            {uploading ? t("admin.stickers.uploading") : t("admin.stickers.upload")}
          </button>
        </div>
      </div>
    </div>
  );
}
