"use client";

import { useEffect } from "react";
import * as fabric from "fabric";
import { useCanvasStore } from "./useCanvasState";

export function useElementControls() {
  const canvas = useCanvasStore((s) => s.canvas);
  const pushUndo = useCanvasStore((s) => s.pushUndo);
  const incrementSelectionVersion = useCanvasStore((s) => s.incrementSelectionVersion);

  useEffect(() => {
    if (!canvas) return;
    const onSelect = () => incrementSelectionVersion();
    const onClear = () => incrementSelectionVersion();
    const onMouseDown = (e: any) => {
      if (e.target) pushUndo();
      if ((e.e?.ctrlKey || e.e?.metaKey) && e.target) {
        const prevObjs = canvas.getActiveObjects();
        if (prevObjs.length === 0) return;
        const clicked = e.target;
        setTimeout(() => {
          const inPrev = prevObjs.includes(clicked);
          if (inPrev) {
            const remaining = prevObjs.filter((o: any) => o !== clicked);
            if (remaining.length === 0) canvas.discardActiveObject();
            else if (remaining.length === 1) canvas.setActiveObject(remaining[0]);
            else canvas.setActiveObject(new fabric.ActiveSelection(remaining, { canvas }));
          } else {
            canvas.setActiveObject(new fabric.ActiveSelection([...prevObjs, clicked], { canvas }));
          }
          canvas.requestRenderAll();
        }, 0);
      }
    };
    canvas.on("selection:created", onSelect);
    canvas.on("selection:updated", onSelect);
    canvas.on("selection:cleared", onClear);
    canvas.on("mouse:down", onMouseDown);
    return () => {
      canvas.off("selection:created", onSelect);
      canvas.off("selection:updated", onSelect);
      canvas.off("selection:cleared", onClear);
      canvas.off("mouse:down", onMouseDown);
    };
  }, [canvas, pushUndo, incrementSelectionVersion]);
}
