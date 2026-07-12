"use client";

import { useEffect, useRef } from "react";
import { useCanvasStore } from "./useCanvasState";

type PatchEvent = "ELEMENT_ADDED" | "ELEMENT_MODIFIED" | "ELEMENT_REMOVED" | "LAYOUT_CHANGED";

export type Patch = {
  pageIndex: number;
  event: PatchEvent;
  elementId?: string;
  payload: any;
  timestamp: number;
};

export function useAutoSave() {
  const canvas = useCanvasStore((s) => s.canvas);
  const activePageIndex = useCanvasStore((s) => s.activePageIndex);
  const bookMeta = useCanvasStore((s) => s.bookMeta);
  const patchesRef = useRef<Patch[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = () => {
    if (patchesRef.current.length === 0) return;
    const patches = [...patchesRef.current];
    patchesRef.current = [];
    if (!bookMeta.id) return;
    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/books/${bookMeta.id}/pages`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patches }),
    }).catch(() => {});
  };

  const queue = (event: PatchEvent, elementId?: string, payload?: any) => {
    patchesRef.current.push({
      pageIndex: activePageIndex,
      event,
      elementId,
      payload,
      timestamp: Date.now(),
    });
    if (event === "ELEMENT_ADDED" || event === "ELEMENT_REMOVED" || event === "LAYOUT_CHANGED") {
      flush();
    } else {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(flush, 2000);
    }
  };

  const saveFull = () => {
    const c = useCanvasStore.getState().canvas;
    if (!c || !bookMeta.id) return;
    flush();
    const json = JSON.stringify((c as any).toJSON(["z", "slotIndex", "layer"]));
    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/books/${bookMeta.id}/pages`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullSave: true, pages: [{ pageNumber: activePageIndex + 1, elements: JSON.parse(json).objects }] }),
    }).catch(() => {});
  };

  useEffect(() => {
    if (!canvas) return;
    const onAdded = (e: any) => queue("ELEMENT_ADDED", e.target?.customProperties?.id, { type: e.target?.type });
    const onModified = (e: any) => queue("ELEMENT_MODIFIED", e.target?.customProperties?.id, { left: e.target?.left, top: e.target?.top, scaleX: e.target?.scaleX, scaleY: e.target?.scaleY });
    const onRemoved = (e: any) => queue("ELEMENT_REMOVED", e.target?.customProperties?.id);
    canvas.on("object:added", onAdded);
    canvas.on("object:modified", onModified);
    canvas.on("object:removed", onRemoved);
    return () => {
      canvas.off("object:added", onAdded);
      canvas.off("object:modified", onModified);
      canvas.off("object:removed", onRemoved);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [canvas, activePageIndex]);

  return { queue, flush, saveFull };
}
