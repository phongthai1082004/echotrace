"use client";

import { useTranslation } from "react-i18next";
import { Type, Image as ImageIcon, Square, Sticker, Group } from "lucide-react";
import { useCanvasStore } from "../../../hooks/useCanvasState";

function layerOf(o: any): string {
  if (o.type === "i-text" || o.type === "textbox") return "text";
  if (o.customProperties?.stickerName) return "sticker";
  if (o.customProperties?.layer === "frame") return "frame";
  if (o.customProperties?.layer === "photo" || o.type === "image") return "photo";
  if (o.type === "group") return "group";
  return "shape";
}

function layerLabel(o: any): string {
  const kind = layerOf(o);
  if (kind === "text") return String(o.text || "Text").split("\n")[0].slice(0, 24) || "Text";
  if (kind === "sticker") return String(o.customProperties.stickerName).slice(0, 24);
  if (kind === "frame") return String(o.customProperties?.shapeName || "Frame").slice(0, 24);
  if (kind === "group") return "Group";
  if (kind === "photo") return "Photo";
  return "Shape";
}

const LAYER_ICON: Record<string, React.ReactNode> = {
  text: <Type size={14} />,
  sticker: <Sticker size={14} />,
  frame: <Square size={14} />,
  photo: <ImageIcon size={14} />,
  group: <Group size={14} />,
  shape: <Square size={14} />,
};

export function LayersPanel() {
  const { t } = useTranslation();
  const canvas = useCanvasStore((s) => s.canvas);
  // re-render on add/remove/reorder + selection + page switch.
  useCanvasStore((s) => s.layerVersion);
  useCanvasStore((s) => s.selectionVersion);
  useCanvasStore((s) => s.activePageIndex);

  // Helpers are canvas objects too (snap guides, half-page bg, overlays, spine)
  // but never user layers — every one sets excludeFromExport.
  const isHelper = (o: any) =>
    o.excludeFromExport ||
    o._spine ||
    o._dragOverlay ||
    o._dimOverlay ||
    o.__smartGuide ||
    o._pageBg;

  const layers = (canvas?.getObjects() || [])
    .filter((o: any) => !isHelper(o))
    .sort((a: any, b: any) => (b.customProperties?.z ?? 0) - (a.customProperties?.z ?? 0));
  const active = canvas?.getActiveObject();

  const select = (o: any) => {
    if (!canvas) return;
    canvas.setActiveObject(o);
    canvas.renderAll();
    useCanvasStore.getState().incrementSelectionVersion();
  };

  return (
    <div className="p-4">
      <p className="font-mono text-[9px] font-bold tracking-widest uppercase text-[#666] mb-3">
        {t("customer.studio.layers")}
      </p>
      {layers.length === 0 ? (
        <p className="text-[10px] text-[#999]">{t("common.noData")}</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {layers.map((o: any, i: number) => {
            const kind = layerOf(o);
            const isActive = active === o;
            return (
              <button
                key={o._selId || `${kind}-${i}`}
                onClick={() => select(o)}
                className={`w-full px-2.5 py-2 rounded-lg border-2 flex items-center gap-2 text-left transition-all ${
                  isActive
                    ? "bg-[#222] text-white border-[#222]"
                    : "bg-white border-[#222]/10 hover:border-[#222] text-[#222]"
                }`}
              >
                <span className={isActive ? "text-white" : "text-[#666]"}>{LAYER_ICON[kind]}</span>
                <span className="flex-1 text-[11px] font-bold truncate">{layerLabel(o)}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
