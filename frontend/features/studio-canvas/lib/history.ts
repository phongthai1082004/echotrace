import * as fabric from "fabric";
import type { PageState } from "../types";
import type { UndoEntry } from "../hooks/useCanvasState";
import { splitCanvasForView, serializeCanvasState, isCoverPage } from "./layout-engine";
import { removeDragOverlays } from "./frames";
import { removePhotoDimOverlays } from "./photos";

function cleanupUndo(canvas: fabric.Canvas) {
  canvas.discardActiveObject();
  removeDragOverlays(canvas);
  removePhotoDimOverlays(canvas);
  canvas.renderAll();
}


export function applyUndo(
  canvas: fabric.Canvas,
  popUndo: () => UndoEntry | undefined,
  pushRedoForCanvas: (entry: UndoEntry) => void,
  stateSnapshot: {
    pages: PageState[];
    activePageIndex: number;
    activeLayout: any;
    viewMode: "left" | "right" | "spread";
  },
  setPage: (i: number, p: Partial<PageState>) => void,
  setPages: (p: PageState[]) => void,
  setActivePageIndex: (i: number) => void,
  setActiveLayout: (l: any) => void,
  setViewMode: (v: "left" | "right" | "spread") => void,
  pageCount: number,
) {
  const prev = popUndo();
  if (!prev) return;

  // Push redo entry based on type
  if (prev.type === "canvas") {
    pushRedoForCanvas({
      type: "canvas",
      pageIdx: stateSnapshot.activePageIndex,
      canvasJson: serializeCanvasState(canvas),
    });
  } else {
    pushRedoForCanvas({ type: "pages", ...stateSnapshot });
  }

  cleanupUndo(canvas);

  if (prev.type === "canvas") {
    const { pageIdx, canvasJson } = prev;
    if (!isCoverPage(pageIdx, pageCount) && canvas.getWidth() > 400) {
      // undo cũng tách theo view đang đứng để khỏi ghi đè màu nửa kia.
      const rightIdx = Math.min(pageIdx + 1, pageCount - 1);
      const { leftJson, rightJson } = splitCanvasForView(
        canvasJson,
        canvas.getWidth() / 2,
        stateSnapshot.viewMode,
        stateSnapshot.pages[pageIdx]?.canvasJson,
        stateSnapshot.pages[rightIdx]?.canvasJson,
      );
      setPage(pageIdx, { canvasJson: leftJson });
      setPage(Math.min(pageIdx + 1, pageCount - 1), { canvasJson: rightJson });
    } else {
      setPage(pageIdx, { canvasJson });
    }
    setActivePageIndex(pageIdx);
  } else {
    setPages(prev.pages);
    setActivePageIndex(prev.activePageIndex);
    if (prev.activeLayout) setActiveLayout(prev.activeLayout);
    if (prev.viewMode) setViewMode(prev.viewMode);
  }
}


export function applyRedo(
  canvas: fabric.Canvas,
  popRedo: () => UndoEntry | undefined,
  pushUndo: () => void,
  pushUndoPages: () => void,
  stateSnapshot: {
    pages: PageState[];
    activePageIndex: number;
    viewMode: "left" | "right" | "spread";
  },
  setPage: (i: number, p: Partial<PageState>) => void,
  setPages: (p: PageState[]) => void,
  setActivePageIndex: (i: number) => void,
  setActiveLayout: (l: any) => void,
  setViewMode: (v: "left" | "right" | "spread") => void,
  pageCount: number,
) {
  const next = popRedo();
  if (!next) return;

  // Push undo entry based on type
  if (next.type === "canvas") {
    pushUndo();
  } else {
    pushUndoPages();
  }

  cleanupUndo(canvas);

  if (next.type === "canvas") {
    const { pageIdx, canvasJson } = next;
    if (!isCoverPage(pageIdx, pageCount) && canvas.getWidth() > 400) {
      const rightIdx = Math.min(pageIdx + 1, pageCount - 1);
      const { leftJson, rightJson } = splitCanvasForView(
        canvasJson,
        canvas.getWidth() / 2,
        stateSnapshot.viewMode,
        stateSnapshot.pages[pageIdx]?.canvasJson,
        stateSnapshot.pages[rightIdx]?.canvasJson,
      );
      setPage(pageIdx, { canvasJson: leftJson });
      setPage(Math.min(pageIdx + 1, pageCount - 1), { canvasJson: rightJson });
    } else {
      setPage(pageIdx, { canvasJson });
    }
    setActivePageIndex(pageIdx);
  } else {
    setPages(next.pages);
    setActivePageIndex(next.activePageIndex);
    if (next.activeLayout) setActiveLayout(next.activeLayout);
    if (next.viewMode) setViewMode(next.viewMode);
  }
}
