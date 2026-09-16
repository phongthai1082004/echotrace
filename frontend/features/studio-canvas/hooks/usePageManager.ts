"use client";

import { useCanvasStore } from "./useCanvasState";
import type { PageState } from "../types";
import { serializeCanvasState, isCoverPage, splitCanvasByMidpoint } from "../lib/layout-engine";

export function usePageManager() {
  const saveCurrentPage = () => {
    const s = useCanvasStore.getState();
    const c = s.canvas;
    if (!c) return;
    const { activePageIndex, setPage, activeLayout, pages, viewMode } = s;
    const n = pages.length;
    let thumbnail: string | null = null;
    try {
      thumbnail = c.toDataURL({ format: "jpeg", quality: 0.4, multiplier: 0.5 });
    } catch {}
    const json = serializeCanvasState(c);
    const cw = c.getWidth();
    if (!isCoverPage(activePageIndex, n) && cw > 400) {
      const mid = cw / 2;
      const { leftJson, rightJson } = splitCanvasByMidpoint(json, mid);
      const rightIdx = Math.min(activePageIndex + 1, n - 1);


      if (viewMode === "spread") {
        setPage(activePageIndex, {
          canvasJson: leftJson,
          thumbnailUrl: thumbnail,
          spreadLayout: activeLayout,
          layout: null,
        });
        setPage(rightIdx, { canvasJson: rightJson, thumbnailUrl: thumbnail, spreadLayout: activeLayout, layout: null });
      } else if (viewMode === "right") {
        setPage(activePageIndex, { canvasJson: leftJson, thumbnailUrl: thumbnail });
        setPage(rightIdx, { canvasJson: rightJson, thumbnailUrl: thumbnail, layout: activeLayout, spreadLayout: null });
      } else {
        setPage(activePageIndex, {
          canvasJson: leftJson,
          thumbnailUrl: thumbnail,
          layout: activeLayout,
          spreadLayout: null,
        });
        setPage(rightIdx, { canvasJson: rightJson, thumbnailUrl: thumbnail });
      }
    } else {
      setPage(activePageIndex, { canvasJson: json, thumbnailUrl: thumbnail, layout: activeLayout });
    }
  };

  const switchPage = (newIndex: number) => {
    const { activePageIndex, pages, setActivePageIndex, setViewMode, viewMode } = useCanvasStore.getState();
    if (newIndex === activePageIndex || newIndex >= pages.length || newIndex < 0) return;
    saveCurrentPage();
    setActivePageIndex(newIndex);
    // ponytail: first/last pages are singles — pin to 2P now so panels never see a stale L/R.
    const effView = isCoverPage(newIndex, pages.length) ? "spread" : viewMode;
    if (effView !== viewMode) setViewMode(effView);
    const spread = effView === "spread" && !isCoverPage(newIndex, pages.length);
    const targetLayout = spread
      ? (useCanvasStore.getState().pages[newIndex]?.spreadLayout ?? null)
      : effView === "right"
        ? (useCanvasStore.getState().pages[Math.min(newIndex + 1, pages.length - 1)]?.layout ?? null)
        : (useCanvasStore.getState().pages[newIndex]?.layout ?? null);
    useCanvasStore.setState({ activeLayout: targetLayout });
  };

  const addPage = () => {
    saveCurrentPage();
    useCanvasStore.getState().pushUndoPages();
    const { pages, setPages, setActivePageIndex } = useCanvasStore.getState();
    const n = pages.length;
    const baseIdx = n - 1;
    const p1: PageState = {
      index: baseIdx,
      canvasJson: null,
      thumbnailUrl: null,
      layout: null,
      spreadLayout: null,
    };
    const p2: PageState = {
      index: baseIdx + 1,
      canvasJson: null,
      thumbnailUrl: null,
      layout: null,
      spreadLayout: null,
    };
    const updated = [...pages.slice(0, n - 1), p1, p2, pages[n - 1]];
    const reindexed = updated.map((p, i) => ({ ...p, index: i }));
    setPages(reindexed);
    setActivePageIndex(baseIdx);
    useCanvasStore.setState({ activeLayout: null });
  };

  const deletePage = (index: number) => {
    const { pages, activePageIndex, setPages, setActivePageIndex, viewMode } = useCanvasStore.getState();
    if (index === 0 || index >= pages.length - 1) return;
    saveCurrentPage();
    useCanvasStore.getState().pushUndoPages();
    const updated = pages.filter((_, i) => i !== index).map((p, i) => ({ ...p, index: i }));
    setPages(updated);
    const next = Math.min(activePageIndex, updated.length - 1);
    setActivePageIndex(next);
    const spread = viewMode === "spread" && !isCoverPage(next, updated.length);
    const targetLayout = spread
      ? (useCanvasStore.getState().pages[next]?.spreadLayout ?? null)
      : (useCanvasStore.getState().pages[next]?.layout ?? null);
    useCanvasStore.setState({ activeLayout: targetLayout });
  };

  // ponytail: middle pages move as spread chunks; covers (first/last) never move.
  // Chunk = the pair shown as one spread thumbnail in PagesSlider.
  const getSpreadChunks = () => {
    const { pages } = useCanvasStore.getState();
    const n = pages.length;
    const chunks: { leftIdx: number; rightIdx: number }[] = [];
    let i = 1;
    while (i < n - 1) {
      const rightIdx = Math.min(i + 1, n - 2);
      chunks.push({ leftIdx: i, rightIdx });
      i += 2;
    }
    return chunks;
  };

  const chunkOfPage = (pageIdx: number) => getSpreadChunks().find((c) => pageIdx >= c.leftIdx && pageIdx <= c.rightIdx) ?? null;

  const moveSpread = (fromLeftIdx: number, toLeftIdx: number) => {
    if (fromLeftIdx === toLeftIdx) return;
    const st = useCanvasStore.getState();
    const { pages, setPages, setActivePageIndex } = st;
    const n = pages.length;
    const chunks = getSpreadChunks();
    const from = chunks.findIndex((c) => c.leftIdx === fromLeftIdx);
    const to = chunks.findIndex((c) => c.leftIdx === toLeftIdx);
    if (from < 0 || to < 0) return;
    saveCurrentPage();
    st.pushUndoPages();
    const cur = useCanvasStore.getState().pages;
    const inner = cur.slice(1, n - 1);
    const pairs: typeof inner[] = [];
    for (let k = 0; k < inner.length; k += 2) pairs.push(inner.slice(k, k + 2));
    const [moved] = pairs.splice(from, 1);
    pairs.splice(to, 0, moved);
    const updated = [cur[0], ...pairs.flat(), cur[n - 1]].map((p, i) => ({ ...p, index: i }));
    // ponytail: select what you dragged — its new start index.
    const pairSizes = pairs.map((p) => p.length);
    const newStart = 1 + pairSizes.slice(0, to).reduce((a, b) => a + b, 0);
    setPages(updated);
    setActivePageIndex(newStart);
  };

  const clonePages = (idxs: number[]) => {
    const { pages } = useCanvasStore.getState();
    return idxs.map((i) => JSON.parse(JSON.stringify(pages[i])));
  };

  // duplicate a spread chunk right after itself (copy becomes the next pages)
  const duplicateSpread = (leftIdx: number) => {
    const chunk = chunkOfPage(leftIdx);
    if (!chunk) return;
    saveCurrentPage();
    const st = useCanvasStore.getState();
    st.pushUndoPages();
    const { pages, setPages, setActivePageIndex } = useCanvasStore.getState();
    const clones = clonePages([chunk.leftIdx, ...(chunk.rightIdx !== chunk.leftIdx ? [chunk.rightIdx] : [])]);
    const updated = [...pages.slice(0, chunk.rightIdx + 1), ...clones, ...pages.slice(chunk.rightIdx + 1)].map((p, i) => ({
      ...p,
      index: i,
    }));
    setPages(updated);
    setActivePageIndex(chunk.rightIdx + 1);
    useCanvasStore.setState({ activeLayout: null });
  };

  const copySpread = (leftIdx?: number) => {
    const { activePageIndex, setPageClipboard, setClipboard } = useCanvasStore.getState();
    const chunk = chunkOfPage(leftIdx ?? activePageIndex);
    if (!chunk) return false;
    saveCurrentPage();
    const idxs = [chunk.leftIdx, ...(chunk.rightIdx !== chunk.leftIdx ? [chunk.rightIdx] : [])];
    setPageClipboard(clonePages(idxs));
    setClipboard(null); // ponytail: one clipboard wins — page copy clears object copy so Ctrl+V is unambiguous
    return true;
  };

  const pasteCopiedSpread = () => {
    const st = useCanvasStore.getState();
    if (!st.pageClipboard?.length) return false;
    saveCurrentPage();
    st.pushUndoPages();
    const { pages, setPages, setActivePageIndex, pageClipboard } = useCanvasStore.getState();
    // insert right after the active spread (or after source if active is a cover)
    const chunk = chunkOfPage(st.activePageIndex);
    const at = chunk ? chunk.rightIdx + 1 : pages.length - 1;
    const clones = JSON.parse(JSON.stringify(pageClipboard));
    const updated = [...pages.slice(0, at), ...clones, ...pages.slice(at)].map((p, i) => ({ ...p, index: i }));
    setPages(updated);
    setActivePageIndex(at);
    useCanvasStore.setState({ activeLayout: null });
    return true;
  };

  return { saveCurrentPage, switchPage, addPage, deletePage, moveSpread, duplicateSpread, copySpread, pasteCopiedSpread, chunkOfPage };
}
