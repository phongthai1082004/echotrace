"use client";

import { useState, useEffect, useRef } from "react";
import { Trash2, X, Search } from "lucide-react";
import { useSession } from "next-auth/react";
import { uploadToCloudinary } from "@/lib/upload";
import { label, card, neoBtn, input } from "@/lib/styles";
import { AdminHeader } from "@/components/admin-header";

type AssetType = "sticker" | "template" | "background" | "element";

interface Asset {
  id: number;
  url: string;
  name: string;
  type: AssetType;
  category: string | null;
}

const ASSETS_META: Record<AssetType, { label: string; color: string }> = {
  sticker:    { label: "Sticker",   color: "bg-[#FFD93D] text-[#222]" },
  template:   { label: "Template",  color: "bg-[#3B82F6] text-white" },
  background: { label: "Background",color: "bg-[#22C55E] text-white" },
  element:    { label: "Element",   color: "bg-[#8B5CF6] text-white" },
};

const MOCK_ASSETS: Asset[] = [
  { id: 1, url: "https://placehold.co/200x200/FFD93D/222?text=🌿", name: "Tropical Leaf", type: "sticker", category: "travel" },
  { id: 2, url: "https://placehold.co/200x200/FFD93D/222?text=⭐", name: "Gold Star", type: "sticker", category: null },
  { id: 3, url: "https://placehold.co/200x200/3B82F6/fff?text=A4", name: "A4 Portrait Grid", type: "template", category: "grid" },
  { id: 4, url: "https://placehold.co/200x200/3B82F6/fff?text=SQ", name: "Square Collage", type: "template", category: "collage" },
  { id: 5, url: "https://placehold.co/200x200/22C55E/fff?text=🌸", name: "Sakura Bloom", type: "background", category: "floral" },
  { id: 6, url: "https://placehold.co/200x200/22C55E/fff?text=🌊", name: "Ocean Wave", type: "background", category: "nature" },
  { id: 7, url: "https://placehold.co/200x200/8B5CF6/fff?text=◇", name: "Diamond Frame", type: "element", category: null },
  { id: 8, url: "https://placehold.co/200x200/8B5CF6/fff?text=○", name: "Circle Badge", type: "element", category: "badge" },
];

const ASSET_TYPES: AssetType[] = ["sticker", "template", "background", "element"];

export default function AdminAssetsPage() {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken;
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<"all" | AssetType>("all");
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [assetType, setAssetType] = useState<AssetType>("sticker");
  const [category, setCategory] = useState("");
  const fileRef = useRef<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchAssets = async () => {
    if (!token) { setAssets(MOCK_ASSETS); setLoading(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/stickers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAssets(data.data || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAssets(); }, [token]);

  const handleStartUpload = () => {
    setName("");
    setAssetType("sticker");
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
      const url = await uploadToCloudinary(file, "sticker", token);
      const body: any = { url, publicId: "", name: name.trim(), category: category.trim() || null };
      if (assetType !== "sticker") body.type = assetType;
      await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/stickers`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      await fetchAssets();
      setShowForm(false);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!token) { setAssets((s) => s.filter((a) => a.id !== id)); return; }
    const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/stickers/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setAssets((s) => s.filter((a) => a.id !== id));
  };

  const filtered = assets.filter((a) => {
    const q = search.toLowerCase();
    return (!q || a.name.toLowerCase().includes(q)) &&
      (filter === "all" || a.type === filter);
  });

  const counts = {
    all: assets.length,
    sticker: assets.filter((a) => a.type === "sticker").length,
    template: assets.filter((a) => a.type === "template").length,
    background: assets.filter((a) => a.type === "background").length,
    element: assets.filter((a) => a.type === "element").length,
  };

  return (
    <div className="h-screen flex flex-col">
      <AdminHeader label="Admin — Assets" title="Assets">
        <button onClick={handleStartUpload}
          className="bg-[#222] text-white rounded-[10px] border-[3px] border-[#222] shadow-[4px_4px_0_#222] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#222] transition-[transform,box-shadow] font-mono text-[9px] font-bold tracking-widest uppercase px-4 py-2.5 shrink-0">
          + Upload Asset
        </button>
      </AdminHeader>

      <div className="flex-1 px-8 py-6 overflow-y-auto space-y-6">
        {/* filter + search */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex gap-1">
            {(["all", ...ASSET_TYPES] as const).map((t) => (
              <button key={t} onClick={() => { setFilter(t as typeof filter); }}
                className={`font-mono text-[8px] font-bold tracking-widest uppercase px-3 py-1.5 rounded-md border-2 transition-[background-color,color,border-color] ${
                  filter === t ? "bg-[#222] text-white border-[#222]" : "border-transparent text-[#999] hover:text-[#222]"
                }`}>
                {t === "all" ? "All" : ASSETS_META[t].label} <span className={filter === t ? "text-white/60" : "text-[#999]"}>({counts[t]})</span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 bg-white rounded-lg border-2 border-[#222] px-3 w-60 shrink-0">
            <Search size={13} className="text-[#999] shrink-0" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search assets…"
              className="flex-1 text-sm font-bold py-2 placeholder:text-[#999] focus:outline-none bg-transparent" />
            {search && <button onClick={() => setSearch("")} className="opacity-40 hover:opacity-70"><X size={12} /></button>}
          </div>
        </div>

        {/* grid */}
        {loading ? (
          <p className="text-sm text-[#999]">Loading...</p>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-lg font-bold text-[#999]">No assets found</p>
          </div>
        ) : (
          <div className="grid grid-cols-6 gap-4">
            {filtered.map((a) => (
              <div key={a.id} className={`${card} p-2 relative group`}>
                <div className="w-full aspect-square rounded-[6px] overflow-hidden bg-white border-2 border-[#222] flex items-center justify-center">
                  <img src={a.url} alt={a.name} className="w-full h-full object-contain" loading="lazy" />
                </div>
                <p className="font-mono text-[7px] font-bold tracking-widest uppercase mt-1.5 text-center text-[#666] truncate">{a.name}</p>
                <div className="flex items-center justify-center gap-1 mt-0.5">
                  <span className={`font-mono text-[6px] font-bold tracking-wider uppercase px-1 py-0.5 rounded ${ASSETS_META[a.type].color}`}>
                    {ASSETS_META[a.type].label}
                  </span>
                  {a.category && <span className="font-mono text-[6px] text-[#999] truncate">{a.category}</span>}
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

      {/* upload modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center" onClick={() => !uploading && setShowForm(false)}>
          <div className={`${card} w-80 p-5`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <p className="font-bold text-sm">Upload Asset</p>
              <button onClick={() => !uploading && setShowForm(false)} className="p-1 hover:opacity-60"><X size={14} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <p className={`${label} mb-1`}>Name *</p>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Tropical Leaf"
                  className={input} />
              </div>
              <div>
                <p className={`${label} mb-1`}>Type</p>
                <select value={assetType} onChange={(e) => setAssetType(e.target.value as AssetType)}
                  className={`${neoBtn} w-full text-sm px-3 py-2`}>
                  {ASSET_TYPES.map((t) => (
                    <option key={t} value={t}>{ASSETS_META[t].label}</option>
                  ))}
                </select>
              </div>
              <div>
                <p className={`${label} mb-1`}>Category</p>
                <input type="text" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. travel"
                  className={input} />
              </div>
              <div>
                <p className={`${label} mb-1`}>Image *</p>
                <input ref={inputRef} type="file" accept="image/*" onChange={handleFilePick}
                  className="text-sm" />
              </div>
              <button onClick={handleUpload} disabled={uploading || !name.trim() || !fileRef.current}
                className="bg-[#222] text-white rounded-[10px] border-[3px] border-[#222] shadow-[4px_4px_0_#222] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#222] transition-[transform,box-shadow] font-mono text-[9px] font-bold tracking-widest uppercase w-full py-3 mt-2 disabled:opacity-40 disabled:pointer-events-none">
                {uploading ? "Uploading..." : "Upload"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
