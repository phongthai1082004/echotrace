"use client";

import { useEffect, useRef } from "react";
import * as fabric from "fabric";
import { useCanvasStore } from "../../hooks/useCanvasState";
import { isFrameObject, enforceZLayers, resolveFrameForPhoto, removePhotoDimOverlays, serializeSel } from "../../lib/layout-engine";

interface Props {
  x: number;
  y: number;
  objects: fabric.FabricObject[];
  onClose: () => void;
}

function cp(obj: any): Record<string, any> { return obj.customProperties || {}; }

function moveZ(canvas: fabric.Canvas, objs: fabric.FabricObject[], mode: "front" | "back" | "forward" | "backward") {
  const all = canvas.getObjects().filter((o: any) => !o._dragOverlay && !o._dimOverlay);
  const asAny = (o: any) => o;

  if (mode === "front") {
    const maxZ = all.reduce((m: number, o: any) => Math.max(m, (cp(o).z ?? 0) + 10), 0);
    objs.forEach((o, i) => { asAny(o).customProperties = { ...cp(o), z: maxZ + i * 10 }; });
  } else if (mode === "back") {
    const minZ = all.reduce((m: number, o: any) => {
      if (objs.includes(o)) return m;
      return Math.min(m, (cp(o).z ?? 0) - 10);
    }, Infinity);
    const base = Math.min(0, minZ - objs.length * 10);
    objs.forEach((o, i) => { asAny(o).customProperties = { ...cp(o), z: base + i * 10 }; });
  } else if (mode === "forward") {
    objs.forEach((o) => {
      const oz = cp(o).z ?? 0;
      const above = all.filter((a: any) => !objs.includes(a) && (cp(a).z ?? 0) > oz);
      if (!above.length) return;
      const swap = above.reduce((a: any, b: any) => (cp(a).z ?? 0) < (cp(b).z ?? 0) ? a : b);
      const sz = cp(swap).z ?? 0;
      asAny(swap).customProperties = { ...cp(swap), z: oz };
      asAny(o).customProperties = { ...cp(o), z: sz };
    });
  } else {
    objs.forEach((o) => {
      const oz = cp(o).z ?? 0;
      const below = all.filter((a: any) => !objs.includes(a) && (cp(a).z ?? 0) < oz);
      if (!below.length) return;
      const swap = below.reduce((a: any, b: any) => (cp(a).z ?? 0) > (cp(b).z ?? 0) ? a : b);
      const sz = cp(swap).z ?? 0;
      asAny(swap).customProperties = { ...cp(swap), z: oz };
      asAny(o).customProperties = { ...cp(o), z: sz };
    });
  }

  objs.forEach((o: any) => {
    if (cp(o).layer === "frame") {
      const photo = canvas.getObjects().find((p: any) => cp(p).frameId === (o as any)._selId);
      if (photo) asAny(photo).customProperties = { ...cp(photo), z: (cp(o).z ?? 0) - 1 };
    }
  });

  enforceZLayers(canvas);
  canvas.renderAll();
  useCanvasStore.getState().incrementLayerVersion();
}

export function ContextMenu({ x, y, objects, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth, vh = window.innerHeight;
    let cx = x, cy = y;
    if (x + rect.width > vw - 8) cx = vw - rect.width - 8;
    if (y + rect.height > vh - 8) cy = vh - rect.height - 8;
    el.style.left = `${Math.max(8, cx)}px`;
    el.style.top = `${Math.max(8, cy)}px`;
  }, [x, y]);

  const act = (fn: () => void) => { fn(); onClose(); };
  const canvas = useCanvasStore.getState().canvas;
  if (!canvas) return null;

  const sections = [
    {
      items: [
        { label: "Bring to Front", fn: () => act(() => { useCanvasStore.getState().pushUndo(); moveZ(canvas, objects, "front"); }) },
        { label: "Send to Back", fn: () => act(() => { useCanvasStore.getState().pushUndo(); moveZ(canvas, objects, "back"); }) },
        { label: "Bring Forward", fn: () => act(() => { useCanvasStore.getState().pushUndo(); moveZ(canvas, objects, "forward"); }) },
        { label: "Send Backward", fn: () => act(() => { useCanvasStore.getState().pushUndo(); moveZ(canvas, objects, "backward"); }) },
      ],
    },
    {
      items: [
        { label: "Flip Horizontal", fn: () => act(() => { useCanvasStore.getState().pushUndo(); objects.forEach(o => { o.set("flipX", !o.flipX); o.setCoords(); if (isFrameObject(o)) { const photo = canvas.getObjects().find((p: any) => cp(p).frameId === (o as any)._selId); if (photo) { photo.set("flipX", !(photo as any).flipX); photo.setCoords(); } } }); canvas.renderAll(); }) },
        { label: "Flip Vertical", fn: () => act(() => { useCanvasStore.getState().pushUndo(); objects.forEach(o => { o.set("flipY", !o.flipY); o.setCoords(); if (isFrameObject(o)) { const photo = canvas.getObjects().find((p: any) => cp(p).frameId === (o as any)._selId); if (photo) { photo.set("flipY", !(photo as any).flipY); photo.setCoords(); } } }); canvas.renderAll(); }) },
      ],
    },
    {
      items: [
        { label: "Copy", fn: () => { const obj = objects[0]; const json = serializeSel(canvas, obj); useCanvasStore.getState().setClipboard(json); useCanvasStore.getState().resetPasteCount(); onClose(); } },
        { label: "Cut", fn: () => act(() => { const obj = objects[0]; const json = serializeSel(canvas, obj); useCanvasStore.getState().setClipboard(json); useCanvasStore.getState().resetPasteCount(); objects.forEach(o => { if (cp(o).layer === "frame") { const fid = (o as any)._selId; canvas.getObjects().filter((p: any) => cp(p).frameId === fid).forEach(p => canvas.remove(p)); } if (cp(o).layer === "photo") { removePhotoDimOverlays(canvas); const fr = resolveFrameForPhoto(canvas, o as any); if (fr) { fr.set({ evented: true, selectable: true, hasControls: true, hasBorders: true } as any); } } canvas.remove(o); }); canvas.discardActiveObject(); canvas.renderAll(); }) },
        { label: "Delete", fn: () => act(() => { useCanvasStore.getState().pushUndo(); objects.forEach(o => { if (cp(o).layer === "frame") { const fid = (o as any)._selId; canvas.getObjects().filter((p: any) => cp(p).frameId === fid).forEach(p => canvas.remove(p)); } if (cp(o).layer === "photo") { removePhotoDimOverlays(canvas); const fr = resolveFrameForPhoto(canvas, o as any); if (fr) { fr.set({ evented: true, selectable: true, hasControls: true, hasBorders: true } as any); } } canvas.remove(o); }); canvas.discardActiveObject(); canvas.renderAll(); }) },
      ],
    },
  ];

  return (
    <div ref={ref} className="fixed z-[9999] min-w-[180px]" style={{ left: x, top: y }}>
      <div className="bg-[#FFF7D6] rounded-[10px] border-[3px] border-[#222] shadow-[4px_4px_0_#222] overflow-hidden py-1">
        {sections.map((section, si) => (
          <div key={si}>
            {si > 0 && <div className="mx-2 h-[2px] bg-[#222]/10" />}
            {section.items.map((item) => (
              <button key={item.label} onClick={item.fn}
                className="w-full text-left px-4 py-2 font-mono text-[10px] font-bold tracking-wider hover:bg-[#e8e6e0] transition-colors text-[#222]">
                {item.label}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
