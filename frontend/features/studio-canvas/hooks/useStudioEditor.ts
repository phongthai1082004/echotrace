"use client";

import { useEffect, useRef, useState } from "react";
import { useCanvasStore } from "./useCanvasState";

export function useStudioEditor(
  bookId: string | null,
  canLoad: boolean,
  load: (id: string) => Promise<any>,
  initialFormat?: string | null,
  initialSize?: { width: number; height: number } | null,
  sampleId?: string | null,
) {
  const done = useRef(false);
  const prevParams = useRef<string>("");
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);


  const effectiveId = sampleId ?? bookId;
  const paramsKey = `${effectiveId ?? ""}|${canLoad}|${initialFormat ?? ""}|${initialSize?.width ?? ""}|${initialSize?.height ?? ""}|${sampleId ? "sample" : "book"}`;

  useEffect(() => {
    if (done.current && prevParams.current === paramsKey) return;
    prevParams.current = paramsKey;
    done.current = true;
    useCanvasStore.getState().resetStore();
    useCanvasStore.getState().setViewMode("spread");
    if (!effectiveId) {
      useCanvasStore.getState().setBookMeta({
        format: initialFormat || "PORTRAIT_A4",
        width: initialSize?.width ?? null,
        height: initialSize?.height ?? null,
      });
      setLoaded(true);
      return;
    }
    if (!canLoad) {
      done.current = false;
      return;
    }
    load(effectiveId)
      .then((data: any) => {
        const book = data.data || data;
        let content: any = {};
        try {
          content = book.content || {};
        } catch {}
        const paperHeight = book.paperHeight ?? null;
        const paperWidth = book.paperWidth ?? null;
        useCanvasStore.getState().setBookMeta({
          id: sampleId ? null : book.id,
          title: book.title || book.name || content.title || "Untitled",
          themeId: book.themeId || null,
          kind: book.type ?? "TEMPLATE",
          format: content.paperSize || "PORTRAIT_A4",
          gsm: content.gsm || 200,
          paper: content.paper || content.paperType || "matte",
          width: paperWidth ? paperWidth * 4 : (content.width ?? null),
          height: paperHeight ? paperHeight * 4 : (content.height ?? null),
        });
        if (Array.isArray(content.pages) && content.pages.length > 0) {
          useCanvasStore.getState().setPages(
            content.pages.map((p: any, i: number) => ({
              index: i,
              canvasJson: p.canvasJson ?? null,
              thumbnailUrl: p.thumbnailUrl ?? null,
              layout: p.layout ?? null,
              spreadLayout: p.spreadLayout ?? null,
            })),
          );
        }
        setLoaded(true);
      })
      .catch((err: Error) => {
        console.warn("[studio] load error:", err);
        setLoadError(err.message);
        done.current = false;
        setLoaded(true);
      });
  }, [effectiveId, canLoad, load, paramsKey]);

  return { loaded, loadError };
}
