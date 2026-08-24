"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { X, Search } from "lucide-react";
import { label, neoBtnPrimary, neoBtnSm, neoBtnPrimarySm } from "@/lib/styles";
import { AdminHeader } from "@/components/admin-header";
import { ASSET_CATEGORIES, AssetCategory } from "@echotrace/shared";
import { useStickers } from "./_hooks/use-stickers";
import { StickerGrid } from "./_components/sticker-grid";
import { UploadModal } from "./_components/upload-modal";

export default function AdminAssetsPage() {
  const { t } = useTranslation();
  const {
    filtered,
    loading,
    uploading,
    upload,
    handleDelete,
    categoryFilter,
    setCategoryFilter,
    search,
    setSearch,
  } = useStickers();

  const [showUpload, setShowUpload] = useState(false);
  const catLabels = Object.fromEntries(
    ASSET_CATEGORIES.map((c) => [c, t(`admin.stickers.categoryLabels.${c}`)]),
  ) as Record<AssetCategory, string>;

  const catBtn = (value: "all" | AssetCategory, label: string) => (
    <button
      key={value}
      onClick={() => setCategoryFilter(value)}
      className={`w-full text-left text-sm font-bold px-3 py-2 rounded-lg ${
        categoryFilter === value ? neoBtnPrimarySm : neoBtnSm
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="h-screen flex flex-col">
      <AdminHeader label={t("admin.stickers.label")} title={t("admin.stickers.title")}>
        <button
          suppressHydrationWarning
          onClick={() => setShowUpload(true)}
          className={`${neoBtnPrimary} font-mono text-[9px] font-bold tracking-widest uppercase px-4 py-2.5 shrink-0`}
        >
          {t("admin.stickers.uploadBtn")}
        </button>
      </AdminHeader>

      <div className="flex-1 flex overflow-hidden">
        {/* category sidebar */}
        <div className="w-48 max-[1600px]:w-40 max-[1280px]:w-36 shrink-0 border-r-2 border-[#222] p-4 max-[1600px]:p-3 overflow-y-auto">
          <p className={`${label} mb-3`}>{t("admin.stickers.categories")}</p>
          <div className="flex flex-col gap-1">
            {catBtn("all", t("admin.stickers.all"))}
            {ASSET_CATEGORIES.map((c) => catBtn(c, catLabels[c]))}
          </div>
        </div>

        {/* main content */}
        <div className="flex-1 px-8 max-[1600px]:px-6 max-[1440px]:px-5 max-[1280px]:px-4 py-6 max-[1600px]:py-5 overflow-y-auto space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 bg-white rounded-lg border-2 border-[#222] px-3 w-60 shrink-0">
              <Search size={13} className="text-[#999] shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("admin.stickers.searchPlaceholder")}
                className="flex-1 text-sm font-bold py-2 placeholder:text-[#999] focus:outline-none bg-transparent"
              />
              {search && (
                <button onClick={() => setSearch("")} className="opacity-40 hover:opacity-70">
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          <StickerGrid filtered={filtered} loading={loading} onDelete={handleDelete} />
        </div>
      </div>

      {showUpload && (
        <UploadModal
          uploading={uploading}
          onUpload={(file, name, category) => upload(file, name, category).then(() => true)}
          onClose={() => setShowUpload(false)}
        />
      )}
    </div>
  );
}
