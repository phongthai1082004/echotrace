"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Trash2, X, Search } from "lucide-react";
import { NeoSelect } from "@/components/neo-select";
import { useSession } from "next-auth/react";
import { uploadToCloudinary } from "@/lib/upload";
import { label, card, input, neoBtnPrimary } from "@/lib/styles";
import { AdminHeader } from "@/components/admin-header";
import { apiFetch } from "@/lib/api.fetch";
import { SkeletonGrid } from "@/components/skeleton";
import { ASSET_CATEGORIES, CATEGORY_COLORS, AssetCategory } from "@echotrace/shared";

type AssetType = "sticker";

interface Asset {
  id: number;
  url: string;
  name: string;
  type: AssetType;
  category: AssetCategory | null;
}

function ASSETS_META(t: (k: string) => string): Record<AssetType, { label: string; color: string; dotColor: string }> {
  return {
    sticker: { label: t("admin.stickers.sticker"), color: "bg-[#FFD93D] text-[#222]", dotColor: "bg-[#FFD93D]" },
  };
}

export default function AdminAssetsPage() {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const token = (session as any)?.accessToken;
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<"all" | AssetCategory>("all");
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState<AssetCategory | "">("");
  const fileRef = useRef<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchAssets = async () => {
    if (!token) { setLoading(false); return; }
    setLoading(true);
    try {
      const data = await apiFetch<any[]>("/api/admin/stickers", token).catch(() => null);
      if (data) setAssets(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAssets(); }, [token]);

  const handleStartUpload = () => {
    setName("");
    setCategory("");
    fileRef.current = null;
    if (inputRef.current) inputRef.current.value = "";
    setShowForm(true);
  };

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    fileRef.current = e.target.files?.[0] || null;
  };

  const handleUpload = async () => {
    const file = fileRef.current;
    if (!file || !token || !name.trim()) return;
    setUploading(true);
    try {
      const { url, publicId } = await uploadToCloudinary(file, "sticker", token);
      const body: any = { url, publicId, name: name.trim() };
      if (category) body.category = category;
      await apiFetch("/api/admin/stickers", token, { method: "POST", body: JSON.stringify(body) });
      await fetchAssets();
      setShowForm(false);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!token) { setAssets((s) => s.filter((a) => a.id !== id)); return; }
    try {
      await apiFetch(`/api/admin/stickers/${id}`, token, { method: "DELETE" });
      setAssets((s) => s.filter((a) => a.id !== id));
    } catch {}
  };

  const filtered = assets.filter((a) => {
    const q = search.toLowerCase();
    return (!q || a.name.toLowerCase().includes(q)) &&
      (categoryFilter === "all" || a.category === categoryFilter);
  });

  const assetMeta = ASSETS_META(t);
  const catLabels = Object.fromEntries(ASSET_CATEGORIES.map((c) => [c, t(`admin.stickers.categoryLabels.${c}`)])) as Record<AssetCategory, string>;

  return (
    <div className="h-screen flex flex-col">
      <AdminHeader label={t("admin.stickers.label")} title={t("admin.stickers.title")}>
        <button suppressHydrationWarning onClick={handleStartUpload}
          className={`${neoBtnPrimary} font-mono text-[9px] font-bold tracking-widest uppercase px-4 py-2.5 shrink-0`}>
          {t("admin.stickers.uploadBtn")}
        </button>
      </AdminHeader>

      <div className="flex-1 flex overflow-hidden">
        {/* category sidebar */}
        <div className="w-48 max-[1600px]:w-40 max-[1280px]:w-36 shrink-0 border-r-2 border-[#222] p-4 max-[1600px]:p-3 overflow-y-auto">
          <p className={`${label} mb-3`}>{t("admin.stickers.categories")}</p>
          <div className="flex flex-col gap-1">
            <button onClick={() => setCategoryFilter("all")}
              className={`w-full text-left text-sm font-bold px-3 py-2 rounded-lg transition-[background-color,color] border-2 ${
                categoryFilter === "all"
                  ? "bg-[#222] text-white border-[#222] shadow-[2px_2px_0_#222]"
                  : "bg-[#FFF7D6] border-[#222] shadow-[2px_2px_0_#222] hover:translate-x-px hover:translate-y-px hover:shadow-[1px_1px_0_#222]"
              }`}>
              {t("admin.stickers.all")}
            </button>
            {ASSET_CATEGORIES.map((c) => (
              <button key={c} onClick={() => setCategoryFilter(c)}
                className={`w-full text-left text-sm font-bold px-3 py-2 rounded-lg transition-[background-color,color] border-2 ${
                  categoryFilter === c
                    ? "bg-[#222] text-white border-[#222] shadow-[2px_2px_0_#222]"
                    : "bg-[#FFF7D6] border-[#222] shadow-[2px_2px_0_#222] hover:translate-x-px hover:translate-y-px hover:shadow-[1px_1px_0_#222]"
                }`}>
                {catLabels[c]}
              </button>
            ))}
          </div>
        </div>

        {/* main content */}
        <div className="flex-1 px-8 max-[1600px]:px-6 max-[1440px]:px-5 max-[1280px]:px-4 py-6 max-[1600px]:py-5 overflow-y-auto space-y-6">
          {/* search */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 bg-white rounded-lg border-2 border-[#222] px-3 w-60 shrink-0">
              <Search size={13} className="text-[#999] shrink-0" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder={t("admin.stickers.searchPlaceholder")}
                className="flex-1 text-sm font-bold py-2 placeholder:text-[#999] focus:outline-none bg-transparent" />
              {search && <button onClick={() => setSearch("")} className="opacity-40 hover:opacity-70"><X size={12} /></button>}
            </div>
          </div>

          {/* grid */}
          {loading ? (
            <SkeletonGrid count={12} />
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <p className="text-lg font-bold text-[#999]">{t("admin.stickers.noAssets")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-6 gap-4">
              {filtered.map((a) => (
                <div key={a.id} className={`${card} p-2 relative group`}>
                  <div className="w-full aspect-square rounded-[6px] overflow-hidden bg-white border-2 border-[#222] flex items-center justify-center">
                    <img src={a.url} alt={a.name} className="w-full h-full object-contain" loading="lazy" />
                  </div>
                  <p className="font-mono text-[8px] font-bold tracking-widest uppercase mt-1.5 text-center text-[#666] truncate">{a.name}</p>
                  <div className="flex items-center justify-center gap-1 mt-0.5">
                    <span className={`font-mono text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded ${assetMeta[a.type].color}`}>
                      {assetMeta[a.type].label}
                    </span>
                    {a.category && <span className="flex items-center gap-1 font-mono text-[8px] text-[#999] truncate"><span className={`w-2 h-2 rounded-full shrink-0 ${CATEGORY_COLORS[a.category]}`} />{catLabels[a.category]}</span>}
                  </div>
                  <button onClick={() => handleDelete(a.id)}
                    className="absolute top-1 right-1 p-1.5 bg-[#B54843] text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* upload modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center">
          <div className={`${card} w-80 p-5`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <p className="font-bold text-sm">{t("admin.stickers.uploadModal")}</p>
              <button onClick={() => !uploading && setShowForm(false)} className="p-1 hover:opacity-60"><X size={14} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <p className={`${label} mb-1`}>{t("admin.stickers.assetName")}</p>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("admin.stickers.namePlaceholder")}
                  className={input} />
              </div>
              <div>
                <p className={`${label} mb-1`}>{t("admin.stickers.category")}</p>
                <NeoSelect value={category} onChange={(v) => setCategory(v as AssetCategory | "")}
                  placeholder={t("admin.stickers.noCategory")}
                  options={ASSET_CATEGORIES.map((c) => ({ value: c, label: catLabels[c], color: CATEGORY_COLORS[c] }))} />
              </div>
              <div>
                <p className={`${label} mb-1`}>{t("admin.stickers.image")}</p>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => inputRef.current?.click()}
                    className="font-mono text-[9px] font-bold tracking-widest uppercase px-3 py-2 rounded-[8px] border-2 border-[#222] shadow-[2px_2px_0_#222] hover:translate-x-px hover:translate-y-px hover:shadow-[1px_1px_0_#222] transition-[transform,box-shadow] bg-[#FFF7D6] shrink-0">
                    {t("admin.stickers.chooseFile")}
                  </button>
                  <span className="text-sm font-bold truncate text-[#666] min-w-0">
                    {fileRef.current?.name || t("admin.stickers.noFile")}
                  </span>
                  <input ref={inputRef} type="file" accept="image/*" onChange={handleFilePick} className="hidden" />
                </div>
              </div>
              <button onClick={handleUpload} disabled={uploading || !name.trim() || !fileRef.current}
                className={`${neoBtnPrimary} font-mono text-[9px] font-bold tracking-widest uppercase w-full py-3 mt-2 disabled:opacity-40 disabled:pointer-events-none`}>
                {uploading ? t("admin.stickers.uploading") : t("admin.stickers.upload")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
