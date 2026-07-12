"use client";

import { useState, useRef, useEffect } from "react";
import { useDrag } from "react-dnd";
import { useSession } from "next-auth/react";
import { uploadToCloudinary } from "@/lib/upload";
import { cloudinaryUrl } from "@/lib/cloudinary";

function DraggablePhoto({ url, label }: { url: string; label?: string }) {
  const [{ isDragging }, dragRef] = useDrag(() => ({
    type: "PHOTO",
    item: { type: "PHOTO", url },
    collect: (m) => ({ isDragging: m.isDragging() }),
  }), [url]);

  return (
    <div ref={dragRef as any} className={`overflow-hidden bg-[#e8e6e0] rounded-[6px] border-2 border-[#222] shadow-[2px_2px_0_#222] cursor-grab active:cursor-grabbing transition-opacity ${isDragging ? "opacity-40" : "hover:shadow-[1px_1px_0_#222] hover:translate-x-px hover:translate-y-px"}`}>
      <img src={cloudinaryUrl(url)} alt={label || ""} className="w-full object-cover" style={{ aspectRatio: "1" }} draggable={false} loading="lazy" />
    </div>
  );
}

export function PhotosPanel() {
  const { data: session } = useSession();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [userImages, setUserImages] = useState<{ id: number; url: string }[]>([]);
  const token = (session as any)?.accessToken;

  const fetchImages = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/uploads/images`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUserImages(data.data || []);
      }
    } catch {}
  };

  useEffect(() => { fetchImages(); }, [token]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !token) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      try {
        const url = await uploadToCloudinary(file, "gallery", token);
        await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/uploads/image`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ url, publicId: "" }),
        });
      } catch {}
    }
    setUploading(false);
    fetchImages();
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="font-mono text-[9px] font-bold tracking-widest uppercase text-[#666]">Your Photos</p>
        <button onClick={() => fileRef.current?.click()} disabled={uploading}
          className="font-mono text-[8px] font-bold tracking-widest uppercase px-2 py-1 rounded-md border-2 border-[#222] shadow-[1px_1px_0_#222] hover:translate-x-px hover:translate-y-px hover:shadow-none transition-all bg-white">
          {uploading ? "..." : "+ Upload"}
        </button>
        <input ref={fileRef} type="file" multiple accept="image/*" onChange={handleUpload} className="hidden" />
      </div>
      {userImages.length > 0 && (
        <div className="grid grid-cols-2 gap-1.5 mb-4">
          {userImages.map((img) => (
            <DraggablePhoto key={img.id} url={img.url} />
          ))}
        </div>
      )}
    </div>
  );
}
