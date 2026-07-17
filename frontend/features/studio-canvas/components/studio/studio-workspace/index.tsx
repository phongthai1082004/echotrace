"use client";

import { useEffect, useRef } from "react";
import * as fabric from "fabric";
import { useDrop } from "react-dnd";
import { useCanvasStore } from "../../../hooks/useCanvasState";
import { useElementControls } from "../../../hooks/useElementControls";
import { usePageManager } from "../../../hooks/usePageManager";
import { FORMATS, ZOOM_LEVELS } from "../../../types";
import { isFrameObject, hitTestFrame, enforceZLayers, removeDragOverlays, addFrameDragOverlays, placePhotoInFrame, movePhotoWithFrame, unlockPhotoInFrame, lockPhotoInFrame, removePhotoDimOverlays, addPhotoDimOverlays, resolveFrameForPhoto, findPhotoInFrame, applyUndo, applyRedo, rehydrateCanvas, isCoverPage, canvasPointer, applyInteractionLock } from "../../../lib/layout-engine";
import { PagesSlider } from "./pages-slider";
import { FiltersBar } from "../filters-bar";

export function StudioWorkspace() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const epochRef = useRef(0);
  const destroyedRef = useRef(false);
  const loadedPageRef = useRef<number>(-1);
  const setCanvas = useCanvasStore((s) => s.setCanvas);
  const bookMeta = useCanvasStore((s) => s.bookMeta);
  const zoomIndex = useCanvasStore((s) => s.zoomIndex);
  const activePageIndex = useCanvasStore((s) => s.activePageIndex);
  const viewMode = useCanvasStore((s) => s.viewMode);

  useElementControls();
  const { addPage: addNewPage } = usePageManager();

  const [, dropRef] = useDrop(() => ({
    accept: ["PHOTO", "STICKER"],
    hover: (item: any, monitor) => {
      if (item.type !== "PHOTO" || useCanvasStore.getState().autoPlaced) return;
      const c = useCanvasStore.getState().canvas; if (!c) return;
      const off = monitor.getClientOffset(); if (!off) return;
      const p = canvasPointer(c, off.x, off.y);
      if (hitTestFrame(c, p.x, p.y)) useCanvasStore.getState().setAutoPlaced(true);
    },
    drop: (item: any, monitor) => {
      if (item.type === "PHOTO") useCanvasStore.getState().setAutoPlaced(false);
      const c = useCanvasStore.getState().canvas; if (!c) return;
      const off = monitor.getClientOffset(); if (!off) return;
      const p = canvasPointer(c, off.x, off.y);
      if (item.type === "PHOTO") {
        useCanvasStore.getState().pushUndo();
        fabric.FabricImage.fromURL(item.url, { crossOrigin: "anonymous" }).then((img) => {
          const frame = hitTestFrame(c, p.x, p.y);
          // skip frame placement if on the non-interactive side
          if (frame) {
            const st = useCanvasStore.getState();
            const effView = isCoverPage(st.activePageIndex, st.pages.length) ? "spread" : st.viewMode;
            if (effView !== "spread") {
              const halfW = (c.getWidth() || 840) / 2;
              const frameCenter = (frame.left || 0) + ((frame.width || 0) * (frame.scaleX || 1)) / 2;
              if ((effView === "left" && frameCenter >= halfW) || (effView === "right" && frameCenter < halfW)) return;
            }
            placePhotoInFrame(frame, img); c.add(img); c.setActiveObject(img); c.renderAll(); enforceZLayers(c); return;
          }
          const s = Math.min(300 / (img.width || 1), 300 / (img.height || 1));
          img.set({ left: p.x - 75, top: p.y - 75, scaleX: s, scaleY: s, customProperties: { z: Date.now(), layer: "element" } } as any);
          (img as any)._selId = `photo-${Date.now()}`; c.add(img); c.setActiveObject(img); c.renderAll(); enforceZLayers(c);
        });
      } else if (item.type === "STICKER" && item.url) {
        useCanvasStore.getState().pushUndo();
        fabric.FabricImage.fromURL(item.url, { crossOrigin: "anonymous" }).then((img) => {
          const s = Math.min(150 / (img.width || 1), 150 / (img.height || 1));
          img.set({ left: p.x - 37.5, top: p.y - 37.5, scaleX: s, scaleY: s, customProperties: { z: Date.now(), layer: "element", stickerName: item.name || "Sticker" } } as any);
          (img as any)._selId = `sticker-${Date.now()}`; c.add(img); c.setActiveObject(img); c.renderAll(); enforceZLayers(c);
        });
      }
    },
  }), []);

  const fmt = FORMATS[bookMeta.format];
  const pageW = fmt.width;
  const ch = pageW * (297 / 210);

  useEffect(() => {
    const s = useCanvasStore.getState();
    if (isCoverPage(s.activePageIndex, s.pages.length) && s.viewMode !== "spread") s.setViewMode("spread");
  }, [activePageIndex]);

  const isCover = useCanvasStore((s) => isCoverPage(s.activePageIndex, s.pages.length));
  const effectiveView = isCover ? "spread" : viewMode;
  const cw = isCover ? pageW : pageW * 2;

  const loadPage = (c: fabric.Canvas) => {
    const s = useCanvasStore.getState();
    const { pages, activePageIndex: idx } = s; const n = pages.length;
    const rightIdx = Math.min(idx + 1, n - 1);

    const prev = (c as any)._pageIdx;
    if (loadedPageRef.current === idx && prev === idx) {
      applyInteractionLock(c, pageW, isCover, effectiveView, true);
      if (!isCover) c.renderAll();
      return;
    }

    const epoch = ++epochRef.current;
    (c as any)._pageIdx = idx;
    loadedPageRef.current = idx;
    c.clear();
    c.backgroundColor = "#fff";
    if (isCover) {
      const pg = useCanvasStore.getState().pages[idx];
      const coverJson = pg?.canvasJson;
      if (coverJson) {
        try {
          void c.loadFromJSON(JSON.parse(coverJson)).then(() => {
            if (destroyedRef.current || epochRef.current !== epoch) return;
            c.backgroundColor = "#fff";
            rehydrateCanvas(coverJson, c);
            c.renderAll();
          }).catch(() => { if (!destroyedRef.current) c.renderAll(); });
        } catch { if (!destroyedRef.current) c.renderAll(); }
      }
      if (!destroyedRef.current) { c.selection = true; c.renderAll(); }
    } else {
      const latestPages = useCanvasStore.getState().pages;
      const merged: any = { version: "7.4", background: "#fff", objects: [] };
      const leftPg = latestPages[idx];
      if (leftPg?.canvasJson) {
        JSON.parse(leftPg.canvasJson).objects?.forEach((o: any) => merged.objects.push(o));
      }
      const rightPg = latestPages[rightIdx];
      if (rightPg?.canvasJson && rightPg !== leftPg) {
        const rj = JSON.parse(rightPg.canvasJson);
        rj.objects?.forEach((o: any) => { o.left = (o.left || 0) + pageW; merged.objects.push(o); });
      }
      const mergedJson = JSON.stringify(merged);
      if (!destroyedRef.current) {
        try {
          void c.loadFromJSON(merged).then(() => {
            if (destroyedRef.current || epochRef.current !== epoch) return;
            c.backgroundColor = "#fff";
            rehydrateCanvas(mergedJson, c);
            c.add(new fabric.Line([pageW, 0, pageW, ch], { stroke: "#222", strokeWidth: 1, strokeDashArray: [6, 4], selectable: false, evented: false }).set({ _spine: true } as any));
            c.selection = true;
            applyInteractionLock(c, pageW, isCover, effectiveView);
            c.renderAll();
          }).catch(() => { if (!destroyedRef.current) c.renderAll(); });
        } catch { if (!destroyedRef.current) c.renderAll(); }
      }
    }
  };

  // create canvas once, resize on width change
  useEffect(() => {
    if (!canvasRef.current) return;
    destroyedRef.current = false;
    const epoch = ++epochRef.current;
    const c = new fabric.Canvas(canvasRef.current, { width: cw, height: ch, preserveObjectStacking: true, selection: true });
    fabricRef.current = c;
      (fabric.FabricObject.prototype as any).snapAngle = 15;
      (fabric.FabricObject.prototype as any).snapThreshold = 6;
      function applyStyle(o: any) {
        o.set({ cornerStyle: 'circle', cornerColor: '#7c3aed', cornerStrokeColor: '#7c3aed', transparentCorners: false, cornerSize: 12, borderColor: '#7c3aed', borderScaleFactor: 3, padding: 4 });
        if (o.controls) { if (o.controls.tl) o.controls.tl.cursorStyle = 'nwse-resize'; if (o.controls.br) o.controls.br.cursorStyle = 'nwse-resize'; if (o.controls.tr) o.controls.tr.cursorStyle = 'nesw-resize'; if (o.controls.bl) o.controls.bl.cursorStyle = 'nesw-resize'; }
        if ((o as any).customProperties?.layer === "frame") o.set({ stroke: "#000", strokeWidth: 2, strokeDashArray: undefined } as any);
      }
      c.getObjects().forEach(applyStyle);
      c.on("object:modified", () => { const a = c.getActiveObject(); if (a) a.setCoords(); enforceZLayers(c); useCanvasStore.getState().incrementLayerVersion(); });
      const syncF = (e: any) => { const o = e.target; o.setCoords(); if (!isFrameObject(o)) return; const p = findPhotoInFrame(c, o); if (p) movePhotoWithFrame(o, p); };
      c.on("object:moving", syncF);
      c.on("object:scaling", (e: any) => { const o = e.target; o.setCoords(); c.requestRenderAll(); if ((o as any).hasControls && (o as any).customProperties?.layer === "photo") addPhotoDimOverlays(c, o as any); if (isFrameObject(o)) { const p = findPhotoInFrame(c, o); if (p) movePhotoWithFrame(o, p); } });
      c.on("object:rotating", syncF);
      c.on("selection:cleared", () => { setTimeout(() => { if (c.getActiveObject()) return; c.getObjects().filter((o: any) => o.customProperties?.layer === "photo" && (o as any).hasControls).forEach((p: any) => lockPhotoInFrame(c, p as any)); }, 0); });
      c.on("selection:created", (e: any) => { const sel = e.selected?.[0]; if (!sel) return; const unlocked = c.getObjects().filter((o: any) => o.customProperties?.layer === "photo" && (o as any).hasControls) as fabric.FabricImage[]; if (!unlocked.length) return; const frame = resolveFrameForPhoto(c, unlocked[0]); if (frame && sel === frame) return; unlocked.forEach((p: any) => lockPhotoInFrame(c, p)); });
      c.on("object:added", (e: any) => { if (e.target) applyStyle(e.target); enforceZLayers(c); useCanvasStore.getState().incrementLayerVersion(); });
      c.on("object:removed", () => { useCanvasStore.getState().incrementLayerVersion(); });
      c.on("text:changed", () => { useCanvasStore.getState().incrementLayerVersion(); });
      c.on("mouse:dblclick", () => { const a = c.getActiveObject(); if (!a || !isFrameObject(a)) return; const fid = (a as any)._selId; let p: any = c.getObjects().find((o: any) => o.customProperties?.frameId === fid); if (!p) { p = c.getObjects().find((o: any) => o.customProperties?.layer === "photo" && a.containsPoint(new fabric.Point(o.left || 0, o.top || 0))); } if (p) { unlockPhotoInFrame(c, p as any); c.setActiveObject(p as any); c.renderAll(); } });
      const onKeyDown = async (e: KeyboardEvent) => {
        if (e.key === "Delete" || e.key === "Backspace") {
          if ((e.target as HTMLElement)?.tagName === "INPUT" || (e.target as HTMLElement)?.tagName === "TEXTAREA") return;
          const sel = c.getActiveObjects(); if (!sel.length) return; useCanvasStore.getState().pushUndo();
          sel.forEach((a: any) => {
            if (isFrameObject(a)) { const p2 = findPhotoInFrame(c, a); if (p2) c.remove(p2); }
            if (a.customProperties?.layer === "photo") { removePhotoDimOverlays(c); const fr: any = resolveFrameForPhoto(c, a); if (fr) { (fr as any).__savedEvented = undefined; fr.set({ evented: true, selectable: true, hasControls: true, hasBorders: true } as any); } }
            c.remove(a);
          });
          c.discardActiveObject(); c.renderAll(); useCanvasStore.getState().clearRedo();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) { e.preventDefault(); const s = useCanvasStore.getState(); console.log(`keydown: Ctrl+Z undoStack=${s.undoStack.length}`); if (!s.undoStack.length) return; await applyUndo(c, s.popUndo, s.pushRedo, s.activePageIndex, s.pages.length, s.setPage, s.setActivePageIndex, s.setAutoPlaced, s.isDraggingPhoto);
          loadedPageRef.current = -1; (c as any)._pageIdx = undefined; loadPage(c); }
        if ((e.ctrlKey || e.metaKey) && ((e.shiftKey && e.key === "z") || e.key === "y")) { e.preventDefault(); const s = useCanvasStore.getState(); console.log(`keydown: Ctrl+Shift+Z redoStack=${s.redoStack.length}`); if (!s.redoStack.length) return; await applyRedo(c, s.popRedo, s.pushUndo, s.activePageIndex, s.pages.length, s.setPage, s.setActivePageIndex, s.setAutoPlaced, s.isDraggingPhoto);
          loadedPageRef.current = -1; (c as any)._pageIdx = undefined; loadPage(c); }
        if ((e.ctrlKey || e.metaKey) && e.key === "n") { e.preventDefault(); addNewPage(); }
        if ((e.ctrlKey || e.metaKey) && e.key === "c") { const a2 = c.getActiveObject(); if (a2 && !(a2 as any)._dragOverlay) { useCanvasStore.getState().setClipboard(JSON.stringify((a2 as any).toJSON(["z", "layer", "customProperties", "_selId"]))); useCanvasStore.getState().resetPasteCount(); } }
        if ((e.ctrlKey || e.metaKey) && e.key === "v") { e.preventDefault(); const { clipboard, pasteCount, bumpPasteCount } = useCanvasStore.getState(); if (!clipboard) return; const parsed = JSON.parse(clipboard); const savedCp = parsed.customProperties, savedSelId = parsed._selId; useCanvasStore.getState().pushUndo(); fabric.util.enlivenObjects([parsed]).then((arr: any[]) => { const obj = arr[0]; if (!obj) return; obj.set({ customProperties: savedCp || { z: Date.now(), layer: "element" } } as any); if (savedSelId) (obj as any)._selId = savedSelId; const offset = 20 + pasteCount * 20; obj.set({ left: (obj.left || 0) + offset, top: (obj.top || 0) + offset }); (obj as any)._selId = `paste-${Date.now()}`; c.add(obj); c.setActiveObject(obj); c.renderAll(); enforceZLayers(c); bumpPasteCount(); }); }
      };
      window.addEventListener("keydown", onKeyDown);
      (window as any).__kc = () => window.removeEventListener("keydown", onKeyDown);
      c.backgroundColor = "#fff";
      c.renderAll();
      setCanvas(c);
      loadPage(c);
    return () => { destroyedRef.current = true; loadedPageRef.current = -1; (window as any).__kc?.(); c.dispose(); fabricRef.current = null; if (useCanvasStore.getState().canvas === c) setCanvas(null); if (epochRef.current === epoch) epochRef.current++; };
  }, [cw, bookMeta.format]);
  useEffect(() => {
    const c = fabricRef.current || useCanvasStore.getState().canvas;
    if (c) loadPage(c);
  }, [activePageIndex, viewMode]);

  const isDraggingPhoto = useCanvasStore((s) => s.isDraggingPhoto);
  useEffect(() => {
    const c = fabricRef.current; if (!c) return;
    if (isDraggingPhoto) {
      addFrameDragOverlays(c);
      // remove overlays on the non-interactive side
      if (effectiveView === "left") {
        c.getObjects().filter((o: any) => o._dragOverlay && (o.left || 0) >= pageW).forEach((o) => c.remove(o));
      } else if (effectiveView === "right") {
        c.getObjects().filter((o: any) => o._dragOverlay && (o.left || 0) < pageW).forEach((o) => c.remove(o));
      }
      c.renderAll();
    } else {
      removeDragOverlays(c);
    }
  }, [isDraggingPhoto]);

  useEffect(() => {
    const el = viewportRef.current; if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return; e.preventDefault();
      const s = useCanvasStore.getState(); const dir = e.deltaY < 0 ? 1 : -1;
      const idx = Math.max(0, Math.min(ZOOM_LEVELS.length - 1, s.zoomIndex + dir));
      if (idx === s.zoomIndex) return;
      const os = ZOOM_LEVELS[s.zoomIndex], ns = ZOOM_LEVELS[idx];
      const r = el.getBoundingClientRect();
      const mx = e.clientX - r.left, my = e.clientY - r.top;
      el.scrollLeft = mx * (1 - ns / os) + el.scrollLeft * ns / os;
      el.scrollTop = my * (1 - ns / os) + el.scrollTop * ns / os;
      s.setZoomIndex(idx);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [bookMeta.format]);

  const zoom = ZOOM_LEVELS[zoomIndex];

  return (
    <div className="flex-1 flex flex-col overflow-hidden" ref={dropRef as any}>
      <div ref={viewportRef} className="flex-1 overflow-auto bg-[#e8e6e0]" style={{ backgroundImage: "linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px)", backgroundSize: "20px 20px" }}>
        <div style={{ minWidth: "100%", minHeight: "100%", padding: 80, display: "flex", alignItems: "center", justifyContent: "center", width: "fit-content" }}>
          <div style={{ width: cw * zoom, height: ch * zoom, position: "relative", flexShrink: 0 }}>
            <div style={{ position: "absolute", top: 0, left: 0, width: cw, height: ch, transform: `scale(${zoom})`, transformOrigin: "0 0", borderStyle: "solid", borderColor: "#222", borderWidth: "3px 3px 6px 6px", boxShadow: "6px 6px 0 #222", overflow: "hidden", background: "#fff" }}>
              <canvas ref={canvasRef} />
              {!isCover && effectiveView !== "spread" && <div style={{ position: "absolute", top: 0, left: effectiveView === "left" ? "50%" : 0, width: "50%", height: "100%", background: "rgba(128,128,128,0.18)" }} />}
            </div>
          </div>
        </div>
      </div>
      <FiltersBar />
      <PagesSlider />
    </div>
  );
}
