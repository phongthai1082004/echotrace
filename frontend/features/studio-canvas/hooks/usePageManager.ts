"use client";

import { useCanvasStore } from "./useCanvasState";
import { serializeCanvasState, isCoverPage, splitCanvasByMidpoint } from "../lib/layout-engine";

export function usePageManager() {
  const saveCurrentPage = () => {
    const s = useCanvasStore.getState();
    const c = s.canvas;
    if (!c) { console.warn("save: no canvas"); return; }
    const { activePageIndex, setPage, activeLayout, pages } = s;
    const n = pages.length;
    const objCount = c.getObjects().length;
    console.log(`save pg${activePageIndex} obj:${objCount}`);
    const thumbnail = c.toDataURL({ format: "jpeg", quality: 0.3, multiplier: 0.2 });
    const json = serializeCanvasState(c);
    const cw = c.getWidth();
    if (!isCoverPage(activePageIndex, n) && cw > 400) {
      const mid = cw / 2;
      const { leftJson, rightJson } = splitCanvasByMidpoint(json, mid);
      setPage(activePageIndex, { canvasJson: leftJson, thumbnailUrl: thumbnail, layout: activeLayout });
      setPage(Math.min(activePageIndex + 1, n - 1), { canvasJson: rightJson, layout: activeLayout });
    } else {
      setPage(activePageIndex, { canvasJson: json, thumbnailUrl: thumbnail, layout: activeLayout });
    }
  };

  const switchPage = (newIndex: number) => {
    const { activePageIndex, pages, setActivePageIndex } = useCanvasStore.getState();
    if (newIndex === activePageIndex || newIndex >= pages.length || newIndex < 0) return;
    console.log(`sw pg${activePageIndex}→${newIndex}`);
    saveCurrentPage();
    setActivePageIndex(newIndex);
    const targetLayout = useCanvasStore.getState().pages[newIndex]?.layout ?? null;
    useCanvasStore.setState({ activeLayout: targetLayout });
  };

  const addPage = () => {
    console.log("add");
    saveCurrentPage();
    const { pages, setPages, setActivePageIndex } = useCanvasStore.getState();
    const n = pages.length;
    const baseIdx = n - 1;
    const p1 = { index: baseIdx, canvasJson: null as string | null, thumbnailUrl: null as string | null, layout: null as any };
    const p2 = { index: baseIdx + 1, canvasJson: null as string | null, thumbnailUrl: null as string | null, layout: null as any };
    const updated = [...pages.slice(0, n - 1), p1, p2, pages[n - 1]];
    const reindexed = updated.map((p, i) => ({ ...p, index: i }));
    setPages(reindexed);
    setActivePageIndex(baseIdx);
    useCanvasStore.setState({ activeLayout: null });
  };

  const deletePage = (index: number) => {
    const { pages, activePageIndex, setPages, setActivePageIndex } = useCanvasStore.getState();
    if (index === 0 || index >= pages.length - 1) return;
    console.log(`del pg${index}`);
    saveCurrentPage();
    const updated = pages.filter((_, i) => i !== index).map((p, i) => ({ ...p, index: i }));
    setPages(updated);
    const next = Math.min(activePageIndex, updated.length - 1);
    setActivePageIndex(next);
    const targetLayout = useCanvasStore.getState().pages[next]?.layout ?? null;
    useCanvasStore.setState({ activeLayout: targetLayout });
  };

  return { saveCurrentPage, switchPage, addPage, deletePage };
}
