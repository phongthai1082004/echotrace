"use client";

import { useCanvasStore } from "./useCanvasState";
import { calculateSpineWidth } from "../lib/spine";
import { serializeCanvasState, isCoverPage, splitCanvasByMidpoint } from "../lib/layout-engine";
import { useStudioAPI } from "../context/studio-context";

export function useAutoSave() {
  const api = useStudioAPI();

  const saveFull = async (token?: string): Promise<{ ok: boolean; error?: string; id?: number }> => {
    const s = useCanvasStore.getState();
    const c = s.canvas;
    if (!c) return { ok: false, error: "No canvas" };

    const pageCount = s.pages.length;
    const spineWidth = calculateSpineWidth({ gsm: s.bookMeta.gsm || 200, pageCount, bindingType: s.bookMeta.bindingType || "perfect" });

    const currentJson = serializeCanvasState(c);
    let currentThumb: string | null = null;
    try { currentThumb = c.toDataURL({ format: "jpeg", quality: 0.4, multiplier: 0.5 }); } catch {} // ponytail: skip if tainted
    const updatedPages = [...s.pages];
    if (!isCoverPage(s.activePageIndex, pageCount) && c.getWidth() > 400) {
      const { leftJson, rightJson } = splitCanvasByMidpoint(currentJson, c.getWidth() / 2);
      updatedPages[s.activePageIndex] = { ...updatedPages[s.activePageIndex], canvasJson: leftJson };
      updatedPages[Math.min(s.activePageIndex + 1, pageCount - 1)] = { ...updatedPages[Math.min(s.activePageIndex + 1, pageCount - 1)], canvasJson: rightJson };
    } else {
      updatedPages[s.activePageIndex] = { ...updatedPages[s.activePageIndex], canvasJson: currentJson, thumbnailUrl: currentThumb };
    }
    useCanvasStore.getState().setPages(updatedPages);

    const pagesPayload = updatedPages.map((p) => ({
      index: p.index,
      layout: p.layout,
      canvasJson: p.canvasJson,
      thumbnailUrl: p.thumbnailUrl,
    }));

    const payload: Record<string, unknown> = {
      version: 3,
      id: s.bookMeta.id || undefined,
      title: s.bookMeta.title,
      pages: pagesPayload,
      pageCount,
      paperSize: s.bookMeta.format,
      paperType: s.bookMeta.paperType || "matte",
      gsm: s.bookMeta.gsm || 200,
      bindingType: s.bookMeta.bindingType || "perfect",
      spineWidth,
    };

    return api.save(token ?? "", s.bookMeta.id, payload);
  };

  return { saveFull };
}
