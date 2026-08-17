"use client";

import { useCanvasStore } from "./useCanvasState";
import { calculateSpineWidth } from "../lib/spine";
import { serializeCanvasState, isCoverPage, splitCanvasByMidpoint } from "../lib/layout-engine";
import { useStudioAPI } from "../context/studio-context";
import { resolveFormat } from "../types";

export function useAutoSave() {
  const api = useStudioAPI();

  const saveFull = async (token?: string): Promise<{ ok: boolean; error?: string; id?: number }> => {
    const s = useCanvasStore.getState();
    const c = s.canvas;
    if (!c) return { ok: false, error: "No canvas" };

    const pageCount = s.pages.length;
    const spineWidth = calculateSpineWidth({ gsm: s.bookMeta.gsm || 200, pageCount });

    const currentJson = serializeCanvasState(c);
    let currentThumb: string | null = null;
    try { currentThumb = c.toDataURL({ format: "jpeg", quality: 0.4, multiplier: 0.5 }); } catch {} // ponytail: skip if tainted
    const updatedPages = [...s.pages];
    const spread = !isCoverPage(s.activePageIndex, pageCount) && s.viewMode === "spread";
    if (!isCoverPage(s.activePageIndex, pageCount) && c.getWidth() > 400) {
      const { leftJson, rightJson } = splitCanvasByMidpoint(currentJson, c.getWidth() / 2);
      const layoutField = spread
        ? { spreadLayout: s.activeLayout, layout: null }
        : { layout: s.activeLayout, spreadLayout: null };
      updatedPages[s.activePageIndex] = { ...updatedPages[s.activePageIndex], canvasJson: leftJson, ...layoutField };
      updatedPages[Math.min(s.activePageIndex + 1, pageCount - 1)] = { ...updatedPages[Math.min(s.activePageIndex + 1, pageCount - 1)], canvasJson: rightJson, ...layoutField };
    } else {
      updatedPages[s.activePageIndex] = { ...updatedPages[s.activePageIndex], canvasJson: currentJson, thumbnailUrl: currentThumb, layout: s.activeLayout };
    }
    useCanvasStore.getState().setPages(updatedPages);

    const pagesPayload = updatedPages.map((p) => ({
      index: p.index,
      layout: p.layout,
      spreadLayout: p.spreadLayout,
      canvasJson: p.canvasJson,
      thumbnailUrl: p.thumbnailUrl,
    }));

    const payload: Record<string, unknown> = {
      version: 3,
      id: s.bookMeta.id || undefined,
      title: s.bookMeta.title,
      kind: s.bookMeta.kind,
      pages: pagesPayload,
      pageCount,
      paperSize: s.bookMeta.format,
      paper: s.bookMeta.paper || "matte",
      gsm: s.bookMeta.gsm || 200,
      spineWidth,
    };

    // Size lives on the Book/SampleBook columns (paperHeight/paperWidth, mm), not inside content.
    const fmt = resolveFormat({ format: s.bookMeta.format, width: s.bookMeta.width, height: s.bookMeta.height });
    payload.paperHeight = Math.round(fmt.height / 4);
    payload.paperWidth = Math.round(fmt.width / 4);

    const result = await api.save(token ?? "", s.bookMeta.id, payload);
    if (result.ok && result.id) useCanvasStore.getState().setBookMeta({ id: result.id });
    return result;
  };

  return { saveFull };
}
