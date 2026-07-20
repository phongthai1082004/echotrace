"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSession } from "next-auth/react";
import * as fabric from "fabric";
import { useCanvasStore } from "../../../hooks/useCanvasState";

interface Background {
  id: number;
  url: string;
  name: string;
}

export function BackgroundsPanel() {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const token = (session as any)?.accessToken;
  const canvas = useCanvasStore((s) => s.canvas);
  const pushUndo = useCanvasStore((s) => s.pushUndo);
  const [backgrounds, setBackgrounds] = useState<Background[]>([]);

  useEffect(() => {
    if (!token) return;
    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/stickers?type=background`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => r.json()).then((d) => setBackgrounds(d.data || [])).catch(() => {});
  }, [token]);

  const applyBackground = (url: string) => {
    if (!canvas) return;
    pushUndo();
    fabric.FabricImage.fromURL(url, { crossOrigin: "anonymous" }).then((img) => {
      canvas.getObjects().forEach((o: any) => {
        if (o.customProperties?.layer === "background") canvas.remove(o);
      });
      const scaleX = canvas.width! / img.width!;
      const scaleY = canvas.height! / img.height!;
      img.set({
        left: 0, top: 0,
        originX: "left", originY: "top",
        scaleX, scaleY,
        selectable: false, evented: false,
        customProperties: { z: 0, layer: "background" },
      } as any);
      (img as any)._selId = `bg-${Date.now()}`;
      canvas.add(img);
      canvas.renderAll();
    });
  };

  return (
    <div className="p-4">
      <p className="font-mono text-[9px] font-bold tracking-widest uppercase mb-3 text-[#666]">{t("customer.studio.background")}</p>
      {backgrounds.length === 0 ? (
        <p className="text-[10px] text-[#999]">{t("customer.studio.noBackgrounds")}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {backgrounds.map((b) => (
            <div key={b.id} onClick={() => applyBackground(b.url)}
              className="flex items-center gap-3 rounded-[6px] border-2 border-[#222] shadow-[2px_2px_0_#222] overflow-hidden bg-white cursor-pointer hover:translate-x-px hover:translate-y-[1px] hover:shadow-[1px_1px_0_#222] transition-all">
              <div className="w-14 h-14 shrink-0 overflow-hidden">
                <img src={b.url} alt={b.name} className="w-full h-full object-cover" loading="lazy" />
              </div>
              <span className="font-mono text-[9px] font-bold tracking-widest uppercase text-[#333]">{b.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
