import { useEffect, useRef } from "react";
import * as fabric from "fabric";
import { useCanvasStore } from "./useCanvasState";
import { usePageManager } from "./usePageManager";
import { serializeSel, pasteClipboard } from "../lib/clipboard";
import { groupSelectedObjects, ungroupSelectedObjects } from "../lib/groups";
import { deleteSelectedObjects } from "../lib/frames";
import { enforceZLayers } from "../lib/fabric-core";
import { applyUndo, applyRedo } from "../lib/history";
import { ZOOM_LEVELS } from "../types";

// ponytail: fabric hides custom props from its types — one local shape instead of `any`.
type CustomProps = {
  _dragOverlay?: boolean;
  _spine?: boolean;
  isEditing?: boolean;
  customProperties?: { z?: number };
};
const customProps = (o: fabric.FabricObject | undefined | null): CustomProps => (o ?? {}) as CustomProps;
const getZ = (o: fabric.FabricObject): number => customProps(o).customProperties?.z ?? 0;
const setZ = (o: fabric.FabricObject, z: number) => {
  const cp = customProps(o);
  cp.customProperties = { ...cp.customProperties, z };
};

// ponytail: studio keyboard shortcuts in one place (was inline in StudioWorkspace)
export function useStudioKeyboard() {
  const { addPage, copySpread, pasteCopiedSpread } = usePageManager();
  const addPageRef = useRef(addPage);
  const pageOpsRef = useRef({ copySpread, pasteCopiedSpread });
  useEffect(() => {
    addPageRef.current = addPage;
    pageOpsRef.current = { copySpread, pasteCopiedSpread };
  }, [addPage, copySpread, pasteCopiedSpread]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const c = useCanvasStore.getState().canvas;
      if (!c) return;
      if (customProps(c.getActiveObject()).isEditing) return;
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
        if (a2 && !customProps(a2)._dragOverlay) {
          useCanvasStore.getState().setClipboard(serializeSel(c, a2));
          useCanvasStore.getState().resetPasteCount();
          useCanvasStore.getState().setPageClipboard(null);
        } else {
          // ponytail: no object selected → copy the active spread (pasted as next pages)
          const t = e.target as HTMLElement;
          if (t?.tagName === "INPUT" || t?.tagName === "TEXTAREA" || t?.isContentEditable) return;
          pageOpsRef.current.copySpread();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "x") {
        e.preventDefault();
        const a2 = c.getActiveObject();
        if (a2 && !customProps(a2)._dragOverlay) {
          useCanvasStore.getState().setClipboard(serializeSel(c, a2));
          useCanvasStore.getState().resetPasteCount();
          useCanvasStore.getState().setPageClipboard(null);
          useCanvasStore.getState().pushUndo();
          deleteSelectedObjects(c);
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "v") {
        e.preventDefault();
        const { clipboard, pasteCount, bumpPasteCount, pageClipboard } = useCanvasStore.getState();
        // ponytail: object copy wins if present; page copy clears it on copy so no ambiguity
        if (clipboard) {
          pasteClipboard(c, clipboard, pasteCount, bumpPasteCount, () => useCanvasStore.getState().pushUndo());
        } else if (pageClipboard?.length) {
          pageOpsRef.current.pasteCopiedSpread();
        }
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
        const objs = c
          .getObjects()
          .filter((o) => o.selectable && !customProps(o)._dragOverlay && !customProps(o)._spine);
        if (!objs.length) return;
        c.discardActiveObject();
        c.setActiveObject(new fabric.ActiveSelection(objs, { canvas: c }));
        c.requestRenderAll();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d" && !inField) {
        e.preventDefault();
        const a = c.getActiveObject();
        if (!a || customProps(a)._dragOverlay) return;
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
        // ponytail: same z-swap stacking as the right-click menu (fabric v7 has no bringForward).
        const all = c.getObjects().filter((o) => !customProps(o)._dragOverlay);
        const others = all.filter((a) => !objs.includes(a));
        if (!others.length) return;
        objs.forEach((o) => {
          const oz = getZ(o);
          if (e.shiftKey) {
            const extreme = others.reduce((m, a) => (front ? Math.max(m, getZ(a)) : Math.min(m, getZ(a))), front ? -Infinity : Infinity);
            setZ(o, extreme + (front ? 10 : -10));
          } else {
            const neighbors = others.filter((a) => (front ? getZ(a) > oz : getZ(a) < oz));
            if (!neighbors.length) return;
            const swap = neighbors.reduce((best, a) =>
              (front ? getZ(a) < getZ(best) : getZ(a) > getZ(best)) ? a : best,
            );
            const sz = getZ(swap);
            setZ(swap, oz);
            setZ(o, sz);
          }
        });
        enforceZLayers(c);
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
