"use client";

import { useEffect } from "react";
import { useCanvasStore } from "./useCanvasState";

export function useElementControls() {
  const canvas = useCanvasStore((s) => s.canvas);
  const setSelectedElementId = useCanvasStore((s) => s.setSelectedElementId);
  const pushUndo = useCanvasStore((s) => s.pushUndo);

  useEffect(() => {
    if (!canvas) return;
    const onSelect = (e: any) => {
      const obj = e.selected?.[0];
      setSelectedElementId(obj?.customProperties?.id || null);
    };
    const onClear = () => setSelectedElementId(null);
    const onMouseDown = (e: any) => {
      if (e.target) pushUndo();
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
  }, [canvas, setSelectedElementId, pushUndo]);

  const getSelected = () => {
    if (!canvas) return null;
    return canvas.getActiveObject();
  };

  return { getSelected };
}
