"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useDrag } from "react-dnd";
import { useCanvasStore } from "../../../hooks/useCanvasState";
import { placeFreeImage, isCoarsePointer } from "../../../lib/photos";
import { useSession } from "next-auth/react";
import { ASSET_CATEGORIES, CATEGORY_LABELS, type AssetCategory } from "@echotrace/shared";
import { Search, X } from "lucide-react";
import { apiFetch } from "@/lib/api.fetch";
import { uploadToR2 } from "@/lib/upload";
import { UploadModal } from "@/app/(admin)/admin/stickers/_components/upload-modal";

interface Sticker {
  id: number;
  url: string;
  name: string;
  category: string | null;
}

const ALL_KEY = "___all___";

function DraggableStickerImg({ url, name }: { url: string; name: string }) {
  const [{ isDragging }, dragRef] = useDrag(
    () => ({
      type: "STICKER",
      item: { type: "STICKER", url, name },
      collect: (m) => ({ isDragging: m.isDragging() }),
    }),
    [url, name],
  );

  const handleTapAdd = () => {
    if (!isCoarsePointer()) return;
    const c = useCanvasStore.getState().canvas;
    if (!c) return;
    useCanvasStore.getState().pushUndo();
    void placeFreeImage(c, url, { maxSize: 150, extraProps: { stickerName: name || "Sticker" }, prefix: "sticker" });
  };

  return (
    <div
      ref={dragRef as any}
      onClick={handleTapAdd}
      className={`aspect-square flex items-center justify-center cursor-grab active:cursor-grabbing transition-all rounded-[6px] border-2 border-[#222] shadow-[2px_2px_0_#222] hover:translate-x-px hover:translate-y-[1px] hover:shadow-[1px_1px_0_#222] overflow-hidden bg-white p-1 ${isDragging ? "opacity-40" : ""}`}
    >
      <img src={url} alt="" className="w-full h-full object-contain" loading="lazy" />
    </div>
  );
}

export function StickersPanel() {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const token = (session as any)?.accessToken;
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>(ALL_KEY);
  const [search, setSearch] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const isAdmin = (session as any)?.role === "admin" || (session?.user as any)?.role === "admin";

  const fetchStickers = () => {
    if (!token) return;
    const params = new URLSearchParams();
    params.set("type", "sticker");
    if (categoryFilter !== ALL_KEY) params.set("category", categoryFilter);
    apiFetch<any[]>("/api/admin/stickers?" + params.toString(), token)
      .then((d) => setStickers(d || []))
      .catch(() => {});
  };

  useEffect(() => {
    fetchStickers();
  }, [token, categoryFilter]);

  const handleUpload = async (file: File, name: string, category: AssetCategory | "") => {
    if (!file || !token || !name.trim()) return false;
    setUploading(true);
    try {
      const { url, publicId } = await uploadToR2(file, "sticker", token);
      const body: any = { url, publicId, name: name.trim() };
      if (category) body.category = category;
      await apiFetch("/api/admin/stickers", token, { method: "POST", body: JSON.stringify(body) });
      fetchStickers();
      return true;
    } finally {
      setUploading(false);
    }
  };

  const filtered = stickers.filter((s) => {
    const q = search.toLowerCase();
    return !q || s.name.toLowerCase().includes(q);
  });

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="font-mono text-[9px] font-bold tracking-widest uppercase text-[#666]">
          {t("customer.studio.sticker")}
        </p>
        {isAdmin && (
          <button
            onClick={() => setShowUpload(true)}
            className="font-mono text-[8px] font-bold tracking-widest uppercase px-2 py-1 rounded-md border-2 border-[#222] shadow-[1px_1px_0_#222] hover:translate-x-px hover:translate-y-px hover:shadow-none transition-all bg-white"
          >
            {t("customer.studio.upload")}
          </button>
        )}
      </div>
      <div className="flex items-center gap-1 bg-white rounded border-2 border-[#222] px-2 mb-2">
        <Search size={11} className="text-[#999] shrink-0" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("customer.studio.searchStickers")}
          className="flex-1 text-[10px] font-bold py-1.5 placeholder:text-[#999] focus:outline-none bg-transparent border-none! shadow-none!"
        />
        {search && (
          <button onClick={() => setSearch("")} className="opacity-40 hover:opacity-70">
            <X size={10} />
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1 mb-3">
        <button
          onClick={() => setCategoryFilter(ALL_KEY)}
          className={`font-mono text-[7px] font-bold tracking-wider uppercase px-2 py-1 rounded border-2 transition-[background-color,color] ${
            categoryFilter === ALL_KEY
              ? "bg-[#222] text-white border-[#222]"
              : "border-transparent text-[#999] hover:text-[#222]"
          }`}
        >
          {t("customer.studio.all")}
        </button>
        {ASSET_CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategoryFilter(c)}
            className={`font-mono text-[7px] font-bold tracking-wider uppercase px-2 py-1 rounded border-2 transition-[background-color,color] ${
              categoryFilter === c
                ? "bg-[#222] text-white border-[#222]"
                : "border-transparent text-[#999] hover:text-[#222]"
            }`}
          >
            {CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <p className="text-[10px] text-[#999]">
          {search ? t("customer.studio.noMatch") : t("customer.studio.noStickers")}
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-2 mobile-strip">
          {filtered.map((s) => (
            <div key={s.id}>
              <DraggableStickerImg url={s.url} name={s.name} />
              {s.name && (
                <p className="font-mono text-[7px] font-bold tracking-wider uppercase text-[#666] text-center mt-1.5 leading-tight">
                  {s.name}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
      {showUpload && (
        <UploadModal uploading={uploading} onUpload={handleUpload} onClose={() => setShowUpload(false)} />
      )}
    </div>
  );
}
