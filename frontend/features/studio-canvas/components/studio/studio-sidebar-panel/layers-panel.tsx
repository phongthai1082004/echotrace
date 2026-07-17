"use client";

import { useCanvasStore } from "../../../hooks/useCanvasState";
import { isFrameObject, enforceZLayers } from "../../../lib/layout-engine";
import * as fabric from "fabric";

type LayerItem = {
  id: string;
  label: string;
  type: "background" | "frame" | "text" | "sticker";
  hasPhoto: boolean;
  obj: fabric.FabricObject;
};

function moveUpGroup(canvas: fabric.Canvas, items: LayerItem[], index: number, isFrameGroup: boolean) {
  if (index <= 0) return;
  const a = items[index].obj;
  const b = items[index - 1].obj;
  const zA = (a as any).customProperties?.z ?? 250;
  const zB = (b as any).customProperties?.z ?? 250;
  (a as any).customProperties.z = zB;
  (b as any).customProperties.z = zA;
  if (isFrameGroup) {
    [a, b].forEach((obj) => {
      if (isFrameObject(obj)) {
        const fid = (obj as any)._selId;
        const photo = canvas.getObjects().find((o: any) => o.customProperties?.frameId === fid);
        if (photo) (photo as any).customProperties.z = (obj as any).customProperties.z - 1;
      }
    });
  }
  enforceZLayers(canvas);
  canvas.renderAll();
  useCanvasStore.getState().incrementLayerVersion();
}

const iconMap: Record<string, React.ReactNode> = {
  background: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>,
  frame: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="4" width="16" height="16" rx="2" strokeDasharray="3 2"/></svg>,
  text: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="4 7 4 4 20 4 20 7" /><line x1="9" y1="20" x2="15" y2="20" /><line x1="12" y1="4" x2="12" y2="20" /></svg>,
  sticker: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>,
};

function LayerRow({ item, index, total, onSelect, onMoveUp }: {
  item: LayerItem; index: number; total: number;
  onSelect: (obj: fabric.FabricObject) => void;
  onMoveUp: (index: number) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <button onClick={() => onSelect(item.obj)} className="flex items-center gap-2 flex-1 px-2 py-1 rounded-[4px] hover:bg-[#e8e6e0] transition-colors text-left min-w-0">
        <span className="text-[#999] shrink-0">{iconMap[item.type]}</span>
        <span className="font-mono text-[8px] font-bold tracking-wide uppercase text-[#333] truncate flex-1">{item.label}</span>
        {item.hasPhoto && <span className="text-[10px] text-[#999]">📷</span>}
      </button>
      <div className="flex shrink-0">
        <button onClick={() => onMoveUp(index)} disabled={index === 0} className="p-1 text-[#999] hover:text-[#222] disabled:opacity-20 disabled:cursor-default" title="Lên">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 15 12 9 6 15" /></svg>
        </button>
        <button onClick={() => onMoveUp(index + 1)} disabled={index === total - 1} className="p-1 text-[#999] hover:text-[#222] disabled:opacity-20 disabled:cursor-default" title="Xuống">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
        </button>
      </div>
    </div>
  );
}

function LayerGroup({ title, items, isFrameGroup, canvas }: { title: string; items: LayerItem[]; isFrameGroup: boolean; canvas: fabric.Canvas }) {
  return (
    <div className="mb-3">
      <p className="font-mono text-[8px] font-bold tracking-widest uppercase text-[#999] mb-1">{title} ({items.length})</p>
      {items.length === 0 ? (
        <p className="font-mono text-[8px] text-[#bbb] ml-2">—</p>
      ) : (
        items.map((item, i) => (
          <LayerRow key={item.id} item={item} index={i} total={items.length}
            onSelect={(obj) => { canvas.setActiveObject(obj); canvas.renderAll(); }}
            onMoveUp={(idx) => moveUpGroup(canvas, items, idx, isFrameGroup)} />
        ))
      )}
    </div>
  );
}

export function LayersPanel() {
  const canvas = useCanvasStore((s) => s.canvas);

  if (!canvas) {
    return (
      <div className="p-4">
        <p className="font-mono text-[9px] font-bold tracking-widest uppercase mb-3 text-[#666]">Layers</p>
        <p className="font-mono text-[9px] text-[#999]">No canvas</p>
      </div>
    );
  }

  let background: LayerItem | null = null;
  const frames: LayerItem[] = [];
  const elements: LayerItem[] = [];

  canvas.getObjects().forEach((obj) => {
    if ((obj as any)._dragOverlay === true) return;
    const cp = (obj as any).customProperties;
    const layer = cp?.layer;
    const selId = (obj as any)._selId as string | undefined;
    const id = selId || `obj-${Math.random().toString(36).slice(2, 8)}`;

    if (layer === "background") {
      background = { id, label: "Background", type: "background", hasPhoto: false, obj };
    } else if (layer === "frame") {
      const hasPhoto = canvas.getObjects().some((o: any) => o.customProperties?.frameId === selId);
      frames.push({ id, label: "Frame", type: "frame", hasPhoto, obj });
    } else if (layer === "photo") {
      return;
    } else if (layer === "element" || (!layer && (cp?.z ?? 0) >= 200)) {
      const isText = obj instanceof fabric.IText || obj instanceof fabric.FabricText;
      if (isText) {
        const text = (obj as fabric.IText).text || "Text";
        elements.push({ id, label: text.length > 20 ? text.slice(0, 20) + "…" : text, type: "text", hasPhoto: false, obj });
      } else {
        const stickerName = cp?.stickerName || "Sticker";
        elements.push({ id, label: stickerName.length > 20 ? stickerName.slice(0, 20) + "…" : stickerName, type: "sticker", hasPhoto: false, obj });
      }
    }
  });

  return (
    <div className="p-4">
      <p className="font-mono text-[9px] font-bold tracking-widest uppercase mb-3 text-[#666]">Layers</p>
      <LayerGroup title="Background" items={background ? [background] : []} isFrameGroup={false} canvas={canvas} />
      <LayerGroup title="Frames" items={frames.reverse()} isFrameGroup={true} canvas={canvas} />
      <LayerGroup title="Elements" items={elements.reverse()} isFrameGroup={false} canvas={canvas} />
      <div className="mt-4 pt-3 border-t border-[#ddd]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-[3px] bg-[#ddd] border border-[#ccc]" style={{ backgroundColor: "#4a9f4a" }} />
            <span className="font-mono text-[7px] font-bold tracking-widest text-[#999]">Đầu</span>
          </div>
          <span className="text-[#ddd]">→</span>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-[3px] bg-[#ddd] border border-[#ccc]" style={{ backgroundColor: "#ccc" }} />
            <span className="font-mono text-[7px] font-bold tracking-widest text-[#999]">Cuối</span>
          </div>
        </div>
      </div>
    </div>
  );
}
