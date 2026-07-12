"use client";

import { useCanvasStore } from "./useCanvasState";
import { LAYOUTS } from "../types";
import type { PageState } from "../types";

export function usePageManager() {
  const canvas = useCanvasStore((s) => s.canvas);

  const saveCurrentPage = () => {
    const c = useCanvasStore.getState().canvas;
    if (!c) return;
    const { activePageIndex, setPage } = useCanvasStore.getState();
    const json = JSON.stringify((c as any).toJSON(["z", "slotIndex", "layer"]));
    const thumbnail = c.toDataURL({ format: "jpeg", quality: 0.3, multiplier: 0.2 });
    setPage(activePageIndex, { canvasJson: json, thumbnailUrl: thumbnail });
  };

  const switchPage = async (newIndex: number) => {
    const c = useCanvasStore.getState().canvas;
    if (!c) return;
    const { activePageIndex, pages, setActivePageIndex } = useCanvasStore.getState();
    if (newIndex === activePageIndex) return;
    saveCurrentPage();
    const page = pages[newIndex];
    if (!page) return;
    c.clear();
    c.backgroundColor = "#fff";
    if (page.canvasJson) {
      await c.loadFromJSON(JSON.parse(page.canvasJson));
      c.renderAll();
    }
    setActivePageIndex(newIndex);
  };

  const addPage = () => {
    saveCurrentPage();
    const { pages, activePageIndex } = useCanvasStore.getState();
    const currentLayoutId = pages[activePageIndex]?.layoutId || LAYOUTS[0].id;
    const newPage: PageState = {
      index: pages.length,
      canvasJson: null,
      thumbnailUrl: null,
      layoutId: currentLayoutId,
    };
    const updated = [...pages, newPage];
    useCanvasStore.getState().setPages(updated);
    switchPage(updated.length - 1);
  };

  const deletePage = async (index: number) => {
    const { pages, activePageIndex, canvas } = useCanvasStore.getState();
    if (pages.length <= 1) return;
    saveCurrentPage();
    const updated = pages.filter((_, i) => i !== index).map((p, i) => ({ ...p, index: i }));
    useCanvasStore.getState().setPages(updated);
    const nextIndex = Math.min(activePageIndex, updated.length - 1);
    if (nextIndex !== activePageIndex) {
      useCanvasStore.getState().setActivePageIndex(nextIndex);
      const page = updated[nextIndex];
      if (canvas) {
        canvas.clear();
        canvas.backgroundColor = "#fff";
        if (page.canvasJson) {
          await canvas.loadFromJSON(JSON.parse(page.canvasJson));
          canvas.renderAll();
        }
      }
    }
  };

  return { switchPage, addPage, deletePage, saveCurrentPage };
}
