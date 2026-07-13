"use client";

import { useEffect, useRef } from "react";
import * as fabric from "fabric";
import { useDrop } from "react-dnd";
import { useCanvasStore } from "../../../hooks/useCanvasState";
import { useElementControls } from "../../../hooks/useElementControls";
import { FORMATS, ZOOM_LEVELS } from "../../../types";
import { PagesSlider } from "./pages-slider";

function enforceZLayers(canvas: fabric.Canvas) {
  const objects = canvas.getObjects().slice();
  objects.sort((a: any, b: any) => (a.customProperties?.z ?? 0) - (b.customProperties?.z ?? 0));
  objects.forEach((obj, i) => {
    canvas.moveObjectTo(obj, i);
  });
}

export function StudioWorkspace() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const setCanvas = useCanvasStore((s) => s.setCanvas);
  const bookMeta = useCanvasStore((s) => s.bookMeta);
  const zoomIndex = useCanvasStore((s) => s.zoomIndex);
  const setZoomIndex = useCanvasStore((s) => s.setZoomIndex);

  useElementControls();

  const [, dropRef] = useDrop(() => ({
    accept: ["PHOTO", "STICKER"],
    drop: (item: any, monitor) => {
      const c = useCanvasStore.getState().canvas;
      if (!c) return;
      const offset = monitor.getClientOffset();
      if (!offset) return;
      const el = c.getElement();
      const rect = el.getBoundingClientRect();
      const pointer = {
        x: (offset.x - rect.left) * (c.getWidth() / rect.width),
        y: (offset.y - rect.top) * (c.getHeight() / rect.height),
      };
      if (item.type === "PHOTO") {
        useCanvasStore.getState().pushUndo();
        fabric.FabricImage.fromURL(item.url, { crossOrigin: "anonymous" }).then((img) => {
          const maxDim = 300;
          const scale = Math.min(maxDim / (img.width || 1), maxDim / (img.height || 1));
          img.set({
            left: pointer.x - 75,
            top: pointer.y - 75,
            scaleX: scale,
            scaleY: scale,
            customProperties: { z: 50, layer: "photo", id: `photo-${Date.now()}`, slotIndex: -1 },
          } as any);
          c.add(img);
          c.setActiveObject(img);
          c.renderAll();
          enforceZLayers(c);
        });
      } else if (item.type === "STICKER") {
        if (item.url) {
          useCanvasStore.getState().pushUndo();
          fabric.FabricImage.fromURL(item.url, { crossOrigin: "anonymous" }).then((img) => {
            const maxDim = 150;
            const scale = Math.min(maxDim / (img.width || 1), maxDim / (img.height || 1));
            img.set({
              left: pointer.x - 37.5,
              top: pointer.y - 37.5,
              scaleX: scale,
              scaleY: scale,
              customProperties: { z: 251, layer: "element", id: `sticker-${Date.now()}` },
            } as any);
            c.add(img);
            c.setActiveObject(img);
            c.renderAll();
            enforceZLayers(c);
          });
        }
      }
    },
  }), []);

  useEffect(() => {
    if (!canvasRef.current) return;
    const fmt = FORMATS[bookMeta.format];
    const c = new fabric.Canvas(canvasRef.current, {
      width: fmt.width,
      height: fmt.height,
      preserveObjectStacking: true,
      selection: true,
      backgroundColor: "#fff",
    });
    c.renderAll();
    setCanvas(c);

    c.on("object:modified", () => enforceZLayers(c));
    c.on("object:added", () => enforceZLayers(c));

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        const active = c.getActiveObject();
        if (active) {
          useCanvasStore.getState().pushUndo();
          c.remove(active);
          c.discardActiveObject();
          c.renderAll();
          useCanvasStore.getState().clearRedo();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      c.dispose();
      setCanvas(null);
    };
  }, [bookMeta.format]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const { zoomIndex: zi, setZoomIndex: setZi } = useCanvasStore.getState();
        const dir = e.deltaY < 0 ? 1 : -1;
        const idx = Math.max(0, Math.min(ZOOM_LEVELS.length - 1, zi + dir));
        if (idx === zi) return;
        const oldS = ZOOM_LEVELS[zi];
        const newS = ZOOM_LEVELS[idx];
        const rect = el.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const sx = el.scrollLeft;
        const sy = el.scrollTop;
        el.scrollLeft = mx * (1 - newS / oldS) + sx * newS / oldS;
        el.scrollTop = my * (1 - newS / oldS) + sy * newS / oldS;
        setZi(idx);
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [bookMeta.format]);

  const zoom = ZOOM_LEVELS[zoomIndex];
  const fmt = FORMATS[bookMeta.format];

  return (
    <div className="flex-1 flex flex-col overflow-hidden" ref={dropRef as any}>
      <div ref={viewportRef}
        className="flex-1 overflow-auto bg-[#e8e6e0]"
        style={{
          backgroundImage: "linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}>
        <div style={{ minWidth: "100%", minHeight: "100%", padding: 80, display: "flex", alignItems: "center", justifyContent: "center", width: "fit-content" }}>
          <div style={{ width: fmt.width * zoom, height: fmt.height * zoom, position: "relative", flexShrink: 0 }}>
            <div style={{ position: "absolute", top: 0, left: 0, width: fmt.width, height: fmt.height, transform: `scale(${zoom})`, transformOrigin: "0 0", border: "3px solid #222", boxShadow: "6px 6px 0 #222", overflow: "hidden", background: "#fff" }}>
              <canvas ref={canvasRef} id="fabric-canvas-container" />
            </div>
          </div>
        </div>
      </div>
      <PagesSlider />
    </div>
  );
}
