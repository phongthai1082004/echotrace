"use client";

import { useEffect, useRef, useState } from "react";
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
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const lastPan = useRef({ x: 0, y: 0 });
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
        const text = new fabric.FabricText(item.char, {
          left: pointer.x,
          top: pointer.y,
          fontSize: 48,
          customProperties: { z: 251, layer: "element", id: `sticker-${Date.now()}` },
        } as any);
        c.add(text);
        c.setActiveObject(text);
        c.renderAll();
        enforceZLayers(c);
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
    c.hoverCursor = "grab";
    c.defaultCursor = "grab";
    c.renderAll();
    setCanvas(c);

    c.on("object:modified", () => enforceZLayers(c));
    c.on("object:added", () => enforceZLayers(c));

    c.on("mouse:down", (opt: any) => {
      if (!opt.target) {
        isPanning.current = true;
        lastPan.current = { x: opt.e.clientX, y: opt.e.clientY };
        c.selection = false;
        c.defaultCursor = "grabbing";
        c.renderAll();
      }
    });
    c.on("mouse:move", (opt: any) => {
      if (isPanning.current) {
        const dx = opt.e.clientX - lastPan.current.x;
        const dy = opt.e.clientY - lastPan.current.y;
        lastPan.current = { x: opt.e.clientX, y: opt.e.clientY };
        setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
      }
    });
    c.on("mouse:up", () => {
      if (isPanning.current) {
        isPanning.current = false;
        c.selection = true;
        c.defaultCursor = "grab";
        c.renderAll();
      }
    });

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

  const applyTransform = () => {
    const { zoomIndex: zi } = useCanvasStore.getState();
    const container = document.getElementById("canvas-scale-container");
    if (container) {
      container.style.transform = `scale(${ZOOM_LEVELS[zi]}) translate(${pan.x}px, ${pan.y}px)`;
    }
  };

  useEffect(() => {
    applyTransform();
  }, [zoomIndex, pan]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const { zoomIndex: zi, setZoomIndex: setZi } = useCanvasStore.getState();
        const dir = e.deltaY < 0 ? 1 : -1;
        const idx = Math.max(0, Math.min(ZOOM_LEVELS.length - 1, zi + dir));
        setZi(idx);
      } else {
        setPan((p) => ({ x: p.x + e.deltaX, y: p.y + e.deltaY }));
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const fmt = FORMATS[bookMeta.format];

  return (
    <div className="flex-1 flex flex-col overflow-hidden" ref={dropRef as any}>
      <div ref={viewportRef} className="flex-1 overflow-auto flex items-start justify-center p-8 bg-[#e8e6e0]"
        style={{
          backgroundImage: "linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}>
        <div id="canvas-scale-container" style={{ transform: `scale(${ZOOM_LEVELS[zoomIndex]}) translate(${pan.x}px, ${pan.y}px)`, transformOrigin: "0 0", flexShrink: 0 }}>
          <div style={{ width: fmt.width, height: fmt.height, border: "3px solid #222", boxShadow: "6px 6px 0 #222", position: "relative", overflow: "hidden", background: "#fff" }}>
            <canvas ref={canvasRef} id="fabric-canvas-container" />
          </div>
        </div>
      </div>
      <PagesSlider />
    </div>
  );
}
