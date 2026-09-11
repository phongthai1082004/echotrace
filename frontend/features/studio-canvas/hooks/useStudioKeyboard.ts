import { useEffect, useRef } from "react";
import * as fabric from "fabric";
import { useCanvasStore } from "./useCanvasState";
import { usePageManager } from "./usePageManager";
import { serializeSel, pasteClipboard } from "../lib/clipboard";
import { groupSelectedObjects, ungroupSelectedObjects } from "../lib/groups";
import { deleteSelectedObjects } from "../lib/frames";
import { applyUndo, applyRedo } from "../lib/history";
import { ZOOM_LEVELS } from "../types";

// ponytail: studio keyboard shortcuts in one place (was inline in StudioWorkspace)
export function useStudioKeyboard() {
  const { addPage } = usePageManager();
  const addPageRef = useRef(addPage);
  addPageRef.current = addPage;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const c = useCanvasStore.getState().canvas;
      if (!c) return;
      if ((c.getActiveObject() as any)?.isEditing) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        const t = e.target as HTMLElement;
        if (t?.tagName === "INPUT" || t?.tagName === "TEXTAREA" || t?.isContentEditable) return;
        if (!c.getActiveObjects().length) return;
        useCanvasStore.getState().pushUndo();
        deleteSelectedObjects(c);
        useCanvasStore.getState().clearRedo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        const s = useCanvasStore.getState();
        if (!s.undoStack.length) return;
        applyUndo(
          c,
          s.popUndo,
          s.pushRedo,
          { pages: s.pages, activePageIndex: s.activePageIndex, activeLayout: s.activeLayout, viewMode: s.viewMode },
          s.setPage,
          s.setPages,
          s.setActivePageIndex,
          s.setActiveLayout,
          s.setViewMode,
          s.pages.length,
        );
      }
      if ((e.ctrlKey || e.metaKey) && ((e.shiftKey && e.key === "z") || e.key === "y")) {
        e.preventDefault();
        const s = useCanvasStore.getState();
        if (!s.redoStack.length) return;
        applyRedo(
          c,
          s.popRedo,
          s.pushUndo,
          s.pushUndoPages,
          s.setPage,
          s.setPages,
          s.setActivePageIndex,
          s.setActiveLayout,
          s.setViewMode,
          s.pages.length,
        );
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault();
        addPageRef.current();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "c" && !e.shiftKey) {
        e.preventDefault();
        const a2 = c.getActiveObject();
        if (a2 && !(a2 as any)._dragOverlay) {
          useCanvasStore.getState().setClipboard(serializeSel(c, a2));
          useCanvasStore.getState().resetPasteCount();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "x") {
        e.preventDefault();
        const a2 = c.getActiveObject();
        if (a2 && !(a2 as any)._dragOverlay) {
          useCanvasStore.getState().setClipboard(serializeSel(c, a2));
          useCanvasStore.getState().resetPasteCount();
          useCanvasStore.getState().pushUndo();
          deleteSelectedObjects(c);
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "v") {
        e.preventDefault();
        const { clipboard, pasteCount, bumpPasteCount } = useCanvasStore.getState();
        if (!clipboard) return;
        pasteClipboard(c, clipboard, pasteCount, bumpPasteCount, () => useCanvasStore.getState().pushUndo());
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "g") {
        e.preventDefault();
        const s = useCanvasStore.getState();
        s.pushUndo();
        (e.shiftKey ? ungroupSelectedObjects : groupSelectedObjects)(c);
        s.incrementLayerVersion();
      }
      const inField = (() => {
        const t = e.target as HTMLElement;
        return t?.tagName === "INPUT" || t?.tagName === "TEXTAREA" || t?.isContentEditable;
      })();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a" && !inField) {
        e.preventDefault();
        const objs = c.getObjects().filter((o: any) => o.selectable && !o._dragOverlay && !o._spine);
        if (!objs.length) return;
        c.discardActiveObject();
        c.setActiveObject(new fabric.ActiveSelection(objs, { canvas: c }));
        c.requestRenderAll();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d" && !inField) {
        e.preventDefault();
        const a = c.getActiveObject();
        if (!a || (a as any)._dragOverlay) return;
        const st = useCanvasStore.getState();
        const clip = serializeSel(c, a);
        st.setClipboard(clip);
        st.resetPasteCount();
        pasteClipboard(c, clip, 0, st.bumpPasteCount, () => useCanvasStore.getState().pushUndo());
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "]" || e.key === "[")) {
        e.preventDefault();
        const objs = c.getActiveObjects();
        if (!objs.length) return;
        useCanvasStore.getState().pushUndo();
        const front = e.key === "]";
        objs.forEach((o: any) => (e.shiftKey ? (front ? o.bringToFront() : o.sendToBack()) : front ? o.bringForward() : o.sendBackwards()));
        c.requestRenderAll();
        useCanvasStore.getState().incrementLayerVersion();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "=" || e.key === "+" || e.key === "-")) {
        e.preventDefault();
        const s = useCanvasStore.getState();
        const dir = e.key === "-" ? -1 : 1;
        const idx = Math.max(0, Math.min(ZOOM_LEVELS.length - 1, s.zoomIndex + dir));
        if (idx !== s.zoomIndex) s.setZoomIndex(idx);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "0") {
        e.preventDefault();
        const s = useCanvasStore.getState();
        const idx = ZOOM_LEVELS.indexOf(1.0);
        if (idx >= 0) s.setZoomIndex(idx);
      }
      if (e.key === "Escape" && !inField) {
        c.discardActiveObject();
        c.requestRenderAll();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
