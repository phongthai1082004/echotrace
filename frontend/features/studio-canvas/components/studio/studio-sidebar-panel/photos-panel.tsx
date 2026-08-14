"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useDrag } from "react-dnd";
import { useSession } from "next-auth/react";
import { useCanvasStore } from "../../../hooks/useCanvasState";
import { uploadToCloudinary } from "@/lib/upload";
import { cloudinaryUrl } from "@echotrace/shared";
import { X, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api.fetch";

function DraggablePhoto({ id, url, label, onDelete }: { id: number; url: string; label?: string; onDelete: (id: number) => void }) {
  const [{ isDragging }, dragRef] = useDrag(() => ({
    type: "PHOTO",
    item: { type: "PHOTO", url },
    collect: (m) => ({ isDragging: m.isDragging() }),
  }), [url]);

  useEffect(() => {
    useCanvasStore.getState().setIsDraggingPhoto(isDragging);
  }, [isDragging]);

  return (
    <div ref={dragRef as any} className={`relative overflow-hidden bg-[#e8e6e0] rounded-[6px] border-2 border-[#222] shadow-[2px_2px_0_#222] cursor-grab active:cursor-grabbing transition-opacity group ${isDragging ? "opacity-40" : "hover:shadow-[1px_1px_0_#222] hover:translate-x-px hover:translate-y-px"}`}>
      <img src={cloudinaryUrl(url)} alt={label || ""} className="w-full object-cover" style={{ aspectRatio: "1" }} draggable={false} loading="lazy" />
      <button onClick={(e) => { e.stopPropagation(); onDelete(id); }}
        className="absolute top-1 right-1 p-1 bg-[#B54843] text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#8a3632]">
        <X size={10} />
      </button>
    </div>
  );
}

function UploadingPlaceholder() {
  return (
    <div className="relative overflow-hidden bg-[#e8e6e0] rounded-[6px] border-2 border-[#222] shadow-[2px_2px_0_#222] flex items-center justify-center" style={{ aspectRatio: "1" }}>
      <Loader2 size={18} className="text-[#999] animate-spin" />
    </div>
  );
}

export function PhotosPanel() {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [userImages, setUserImages] = useState<{ id: number; url: string }[]>([]);
  const [uploadingIds, setUploadingIds] = useState<string[]>([]);
  const token = (session as any)?.accessToken;

  const fetchImages = async () => {
    if (!token) return;
    try {
      const data = await apiFetch<any[]>("/api/uploads/images", token, { cache: "no-cache" });
      if (data) setUserImages(data);
    } catch {}
  };

  useEffect(() => { fetchImages(); }, [token]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !token) return;
    setUploading(true);
    setError("");
    const ids = Array.from(files).map(() => Math.random().toString(36).slice(2));
    setUploadingIds(ids);
    let i = 0;
    for (const file of Array.from(files)) {
      const currentId = ids[i++];
      try {
        const { url, publicId } = await uploadToCloudinary(file, "gallery", token);
        const saved = await apiFetch<any>("/api/uploads/image", token, { method: "POST", body: JSON.stringify({ url, publicId }) });
        setUserImages((prev) => [{ id: saved?.id || Date.now(), url }, ...prev]);
      } catch (err: any) {
        setError(err?.message || "Upload failed");
      }
      setUploadingIds((prev) => prev.filter((id) => id !== currentId));
    }
    setUploading(false);
    fetchImages();
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleDelete = async (id: number) => {
    if (!token) return;
    setUserImages((prev) => prev.filter((img) => img.id !== id));
    try {
      await apiFetch(`/api/uploads/images/${id}`, token, { method: "DELETE" });
    } catch {}
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="font-mono text-[9px] font-bold tracking-widest uppercase text-[#666]">{t("customer.studio.yourPhotos")}</p>
        <button onClick={() => fileRef.current?.click()} disabled={uploading}
          className="font-mono text-[8px] font-bold tracking-widest uppercase px-2 py-1 rounded-md border-2 border-[#222] shadow-[1px_1px_0_#222] hover:translate-x-px hover:translate-y-px hover:shadow-none transition-all bg-white">
          {uploading ? "..." : t("customer.studio.upload")}
        </button>
        <input ref={fileRef} type="file" multiple accept="image/*" onChange={handleUpload} className="hidden" />
      </div>
      {error && <p className="font-mono text-[8px] text-[#B54843] mb-2">{error}</p>}
      {userImages.length === 0 && uploadingIds.length === 0 && (
        <p className="font-mono text-[9px] text-[#999] text-center py-8">{t("customer.studio.noPhotos")}</p>
      )}
      {(userImages.length > 0 || uploadingIds.length > 0) && (
        <div className="grid grid-cols-2 gap-1.5">
          {uploadingIds.map((id) => (
            <UploadingPlaceholder key={id} />
          ))}
          {userImages.map((img) => (
            <DraggablePhoto key={img.id} id={img.id} url={img.url} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
