"use client";

import { useEffect, useReducer } from "react";
import { Copy, Ellipsis, Lock, LockOpen, Trash2 } from "lucide-react";
import { useCanvasStore } from "../../hooks/useCanvasState";
import { isObjectLocked, setObjectLocked } from "../../lib/fabric-core";
import { ZOOM_LEVELS } from "../../types";
import { serializeSel, pasteClipboard } from "../../lib/clipboard";
import { deleteSelectedObjects } from "../../lib/frames";

export function StudioSelectionTooltip() {
  const canvas = useCanvasStore((s) => s.canvas);
  const zoomIndex = useCanvasStore((s) => s.zoomIndex);
  useCanvasStore((s) => s.selectionVersion);
  const [, force] = useReducer((x: number) => x + 1, 0);

  useEffect(() => {
    if (!canvas) return;
    const bump = () => force();
    canvas.on("selection:created", bump);
    canvas.on("selection:updated", bump);
    canvas.on("selection:cleared", bump);
    canvas.on("object:moving", bump);
    canvas.on("object:scaling", bump);
    canvas.on("object:rotating", bump);
    return () => {
      canvas.off("selection:created", bump);
      canvas.off("selection:updated", bump);
      canvas.off("selection:cleared", bump);
      canvas.off("object:moving", bump);
      canvas.off("object:scaling", bump);
      canvas.off("object:rotating", bump);
    };
  }, [canvas]);

  if (!canvas) return null;
  const active = canvas.getActiveObject() as any;
  if (!active || active._dragOverlay || active._spine || active.excludeFromExport) return null;
  if (active.isEditing) return null;

  active.setCoords();
  const zoom = ZOOM_LEVELS[zoomIndex] ?? 1;
  const r = active.getBoundingRect(true, true);
  // ponytail: dock tooltip at the corner with room (prefer top-right) — never top-center (rotate handle).
  const GAP = 12;
  const EST_W = 180;
  const EST_H = 52;
  const containerW = (canvas.getWidth?.() ?? 0) * zoom;
  const containerH = (canvas.getHeight?.() ?? 0) * zoom;
  const leftEdge = r.left * zoom;
  const rightEdge = (r.left + r.width) * zoom;
  const topEdge = r.top * zoom;
  const botEdge = (r.top + r.height) * zoom;
  const roomRight = containerW - rightEdge >= EST_W + GAP;
  const roomAbove = topEdge >= EST_H + 10;
  const left = roomRight ? rightEdge + GAP : Math.max(0, leftEdge - GAP - EST_W);
  const top = roomAbove ? topEdge - 10 : Math.min(botEdge + 10, Math.max(0, containerH - EST_H));
  const transform = roomAbove ? "translate(0,-100%)" : "translate(0,0)";

  const onCopy = () => {
    const c = useCanvasStore.getState().canvas;
    const a = c?.getActiveObject();
    if (!c || !a || (a as any)._dragOverlay) return;
    const st = useCanvasStore.getState();
    const clip = serializeSel(c, a);
    st.setClipboard(clip);
    st.resetPasteCount();
    pasteClipboard(c, clip, 0, st.bumpPasteCount, () => useCanvasStore.getState().pushUndo());
  };

  const onDelete = () => {
    const c = useCanvasStore.getState().canvas;
    if (!c || !c.getActiveObjects().length) return;
    if (c.getActiveObjects().every((a: any) => isObjectLocked(a))) return;
    const st = useCanvasStore.getState();
    st.pushUndo();
    deleteSelectedObjects(c);
    st.clearRedo();
  };

  const lockTargets = (() => {
    const objs = active.type === "activeselection" && Array.isArray((active as any)._objects)
      ? (active as any)._objects
      : [active];
    return objs as any[];
  })();
  const locked = lockTargets.length > 0 && lockTargets.every((o: any) => isObjectLocked(o));

  const onToggleLock = () => {
    const c = useCanvasStore.getState().canvas;
    if (!c) return;
    useCanvasStore.getState().pushUndo();
    const next = !locked;
    lockTargets.forEach((o: any) => setObjectLocked(o, next));
    c.requestRenderAll();
    force();
  };

  const onMore = (e: React.MouseEvent) => {
    const c = useCanvasStore.getState().canvas;
    if (!c) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    useCanvasStore.getState().setCtxMenu({
      x: Math.min(rect.left, window.innerWidth - 200),
      y: rect.bottom + 6,
      objects: c.getActiveObjects(),
    });
  };

  return (
    <div
      className="absolute z-40"
      style={{ left, top, transform }}
    >
      <div className="flex items-center gap-1 sm:gap-0.5 bg-[#FFF7D6] rounded-[10px] border-[3px] border-[#222] shadow-[4px_4px_0_#222] px-1.5 py-1 sm:px-0.5 sm:py-0.5">
        <button
          type="button"
          onClick={onMore}
          aria-label="More actions"
          className="w-9 h-9 sm:w-6 sm:h-6 flex items-center justify-center rounded-[6px] hover:bg-[#e8e6e0] transition-colors text-[#222]"
        >
          <Ellipsis size={16} strokeWidth={2.5} className="sm:w-3 sm:h-3" />
        </button>
        <button
          type="button"
          onClick={onCopy}
          aria-label="Duplicate"
          className="w-9 h-9 sm:w-6 sm:h-6 flex items-center justify-center rounded-[6px] hover:bg-[#e8e6e0] transition-colors text-[#222]"
        >
          <Copy size={16} strokeWidth={2.5} className="sm:w-3 sm:h-3" />
        </button>
        <button
          type="button"
          onClick={onToggleLock}
          aria-label={locked ? "Unlock" : "Lock"}
          className="w-9 h-9 sm:w-6 sm:h-6 flex items-center justify-center rounded-[6px] hover:bg-[#e8e6e0] transition-colors text-[#222]"
        >
          {locked ? (
            <Lock size={16} strokeWidth={2.5} className="sm:w-3 sm:h-3" />
          ) : (
            <LockOpen size={16} strokeWidth={2.5} className="sm:w-3 sm:h-3" />
          )}
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label="Delete"
          className="w-9 h-9 sm:w-6 sm:h-6 flex items-center justify-center rounded-[6px] hover:bg-[#B54843]/10 hover:text-[#B54843] transition-colors text-[#222]"
        >
          <Trash2 size={16} strokeWidth={2.5} className="sm:w-3 sm:h-3" />
        </button>
      </div>
    </div>
  );
}
