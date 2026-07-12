"use client";

import { useCanvasStore } from "./useCanvasState";
import { FORMATS, LAYOUTS, type Layout, type FormatKey } from "../types";
import * as fabric from "fabric";

const LAYER = { PHOTO: { min: 50, max: 149 }, FRAME: 200, TEXT: { min: 251, max: 500 } };

export function useLayoutEngine() {
  const canvas = useCanvasStore((s) => s.canvas);
  const activePageIndex = useCanvasStore((s) => s.activePageIndex);
  const setPage = useCanvasStore((s) => s.setPage);
  const pushUndo = useCanvasStore((s) => s.pushUndo);
  const pages = useCanvasStore((s) => s.pages);
  const bookMeta = useCanvasStore((s) => s.bookMeta);

  const getLayoutsForFormat = (format: FormatKey) =>
    LAYOUTS.filter((l) => l.formats.includes(format));

  const applyLayout = (layout: Layout) => {
    if (!canvas) return;
    pushUndo();
    const fmt = FORMATS[bookMeta.format];
    const cw = fmt.width;
    const ch = fmt.height;

    // Collect existing photos sorted by slotIndex
    const photos = canvas
      .getObjects()
      .filter((o: any) => o.customProperties?.z >= LAYER.PHOTO.min && o.customProperties?.z <= LAYER.PHOTO.max)
      .sort((a: any, b: any) => (a.customProperties?.slotIndex ?? 99) - (b.customProperties?.slotIndex ?? 99));

    // Remove old frame objects (Layer 3)
    const toRemove = canvas.getObjects().filter((o: any) => o.customProperties?.layer === "frame");
    toRemove.forEach((o) => canvas.remove(o));

    // Draw new frames (Layer 3)
    layout.cells.forEach((cell, idx) => {
      const rect = new fabric.Rect({
        left: cell.x * cw,
        top: cell.y * ch,
        width: cell.w * cw,
        height: cell.h * ch,
        fill: "transparent",
        stroke: "#222",
        strokeWidth: 2,
        strokeDashArray: [6, 4],
        selectable: false,
        evented: false,
        customProperties: { z: LAYER.FRAME, layer: "frame", slotIndex: idx },
      } as any);
      canvas.add(rect);
    });

    // Migrate photos to new cells sequentially
    photos.forEach((photo: any, idx) => {
      if (idx >= layout.cells.length) return;
      const cell = layout.cells[idx];
      const targetW = cell.w * cw;
      const targetH = cell.h * ch;
      const scale = Math.max(targetW / (photo.width || 1), targetH / (photo.height || 1));
      photo.set({
        left: cell.x * cw,
        top: cell.y * ch,
        scaleX: scale,
        scaleY: scale,
        originX: "center",
        originY: "center",
        customProperties: { ...photo.customProperties, slotIndex: idx },
      });
    });

    canvas.renderAll();
    setPage(activePageIndex, { layoutId: layout.id });
  };

  return { applyLayout, getLayoutsForFormat };
}
