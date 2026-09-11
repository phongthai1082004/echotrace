"use client";

import { useEffect, useRef } from "react";
import { useCanvasStore } from "./useCanvasState";

// ponytail: debounced thumbnail sync (was inline in StudioWorkspace)
export function useCanvasThumbnail() {
  const thumbnailVersion = useCanvasStore((s) => s.layerVersion);
  const activePageIndex = useCanvasStore((s) => s.activePageIndex);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    const c = useCanvasStore.getState().canvas;
    if (!c) return;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const s = useCanvasStore.getState();
      const idx = s.activePageIndex;
      if (idx < 0 || idx >= s.pages.length) return;
      let thumb: string | null = null;
      try {
        thumb = c.toDataURL({ format: "jpeg", quality: 0.4, multiplier: 0.5 });
      } catch {} // ponytail: skip if tainted
      if (thumb) s.setPage(idx, { thumbnailUrl: thumb });
    }, 400);
  }, [thumbnailVersion, activePageIndex]);
}
