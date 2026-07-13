"use client";

import { useState, useEffect } from "react";
import { useDrag } from "react-dnd";
import { useSession } from "next-auth/react";

interface Sticker {
  id: number;
  url: string;
  name: string;
  category: string | null;
}

function DraggableStickerImg({ url }: { url: string }) {
  const [{ isDragging }, dragRef] = useDrag(() => ({
    type: "STICKER",
    item: { type: "STICKER", url },
    collect: (m) => ({ isDragging: m.isDragging() }),
  }), [url]);

  return (
    <div ref={dragRef as any}
      className={`aspect-square flex items-center justify-center cursor-grab active:cursor-grabbing transition-all rounded-[6px] border-2 border-[#222] shadow-[2px_2px_0_#222] hover:translate-x-px hover:translate-y-[1px] hover:shadow-[1px_1px_0_#222] overflow-hidden bg-white p-1 ${isDragging ? "opacity-40" : ""}`}>
      <img src={url} alt="" className="w-full h-full object-contain" loading="lazy" />
    </div>
  );
}

export function StickersPanel() {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken;
  const [stickers, setStickers] = useState<Sticker[]>([]);

  useEffect(() => {
    if (!token) return;
    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/stickers`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => r.json()).then((d) => setStickers(d.data || [])).catch(() => {});
  }, [token]);

  return (
    <div className="p-4">
      <p className="font-mono text-[9px] font-bold tracking-widest uppercase mb-3 text-[#666]">Stickers</p>
      {stickers.length === 0 ? (
        <p className="text-[10px] text-[#999]">No stickers yet</p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {stickers.map((s) => (
            <DraggableStickerImg key={s.id} url={s.url} />
          ))}
        </div>
      )}
    </div>
  );
}
