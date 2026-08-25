"use client";

import { useEffect } from "react";
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
