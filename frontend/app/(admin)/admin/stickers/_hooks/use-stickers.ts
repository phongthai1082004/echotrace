"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api.fetch";
import { uploadToR2 } from "@/lib/upload";
import { useDebounce } from "@hooks";
import { AssetCategory } from "@echotrace/shared";

type AssetType = "sticker";

export interface Asset {
  id: number;
  url: string;
  name: string;
  type: AssetType;
  category: AssetCategory | null;
}

export function useStickers(initialAssets?: Asset[]) {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken;
  const [assets, setAssets] = useState<Asset[]>(initialAssets ?? []);
  const [loading, setLoading] = useState(initialAssets === undefined);
  const [uploading, setUploading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<"all" | AssetCategory>("all");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);

  const fetchAssets = async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await apiFetch<any[]>("/api/stickers", token).catch(() => null);
      if (data) setAssets(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialAssets !== undefined) return;
    fetchAssets();
  }, [token]);

  const upload = async (file: File, name: string, category: AssetCategory | "") => {
    if (!file || !token || !name.trim()) return;
    setUploading(true);
    try {
      const { url, publicId } = await uploadToR2(file, "sticker", token);
      const body: any = { url, publicId, name: name.trim() };
      if (category) body.category = category;
      await apiFetch("/api/admin/stickers", token, { method: "POST", body: JSON.stringify(body) });
      await fetchAssets();
      return true;
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!token) {
      setAssets((s) => s.filter((a) => a.id !== id));
      return;
    }
    try {
      await apiFetch(`/api/admin/stickers/${id}`, token, { method: "DELETE" });
      setAssets((s) => s.filter((a) => a.id !== id));
    } catch {}
  };

  const filtered = assets.filter((a) => {
    const q = debouncedSearch.toLowerCase();
    return (!q || a.name.toLowerCase().includes(q)) && (categoryFilter === "all" || a.category === categoryFilter);
  });

  return {
    filtered,
    loading,
    uploading,
    upload,
    handleDelete,
    categoryFilter,
    setCategoryFilter,
    search,
    setSearch,
    token,
  };
}
