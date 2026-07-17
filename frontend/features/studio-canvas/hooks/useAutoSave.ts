"use client";

import { useCanvasStore } from "./useCanvasState";
import { calculateSpineWidth } from "../lib/spine";
import { serializeCanvasState, isCoverPage, splitCanvasByMidpoint } from "../lib/layout-engine";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

export function useAutoSave() {
  const saveFull = async (token?: string): Promise<{ ok: boolean; error?: string; id?: number }> => {
    const s = useCanvasStore.getState();
    const c = s.canvas;
    if (!c) return { ok: false, error: "No canvas" };

    const pageCount = s.pages.length;
    const spineWidth = calculateSpineWidth({ gsm: s.bookMeta.gsm || 200, pageCount, bindingType: s.bookMeta.bindingType || "perfect" });

    // serialize current canvas and save to current page before building payload
    const currentJson = serializeCanvasState(c);
    const currentThumb = c.toDataURL({ format: "jpeg", quality: 0.3, multiplier: 0.2 });
    const updatedPages = [...s.pages];
    if (!isCoverPage(s.activePageIndex, pageCount) && c.getWidth() > 400) {
      const { leftJson, rightJson } = splitCanvasByMidpoint(currentJson, c.getWidth() / 2);
      updatedPages[s.activePageIndex] = { ...updatedPages[s.activePageIndex], canvasJson: leftJson, thumbnailUrl: null };
      updatedPages[Math.min(s.activePageIndex + 1, pageCount - 1)] = { ...updatedPages[Math.min(s.activePageIndex + 1, pageCount - 1)], canvasJson: rightJson, thumbnailUrl: null };
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

    const contentPayload: any = {
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

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    try {
      const existingId = s.bookMeta.id;
      if (existingId) {
        const res = await fetch(`${BACKEND}/api/books/${existingId}/pages`, {
          method: "PATCH",
          headers,
          body: JSON.stringify({ content: contentPayload, title: s.bookMeta.title }),
        });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          return { ok: false, error: `${res.status} ${text.slice(0, 200)}`, id: existingId };
        }
        return { ok: true, id: existingId };
      } else {
        const res = await fetch(`${BACKEND}/api/books`, {
          method: "POST",
          headers,
          body: JSON.stringify({ content: contentPayload, title: s.bookMeta.title }),
        });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          return { ok: false, error: `${res.status} ${text.slice(0, 200)}` };
        }
        const json = await res.json();
        const newId = json?.data?.id;
        if (newId) {
          useCanvasStore.getState().setBookMeta({ id: newId });
        }
        return { ok: true, id: newId };
      }
    } catch (err) {
      return { ok: false, error: String(err), id: s.bookMeta.id || undefined };
    }
  };

  return { saveFull };
}
