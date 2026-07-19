import { useState, useEffect, useRef, useCallback } from "react";

export function useContainerWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return { ref, width };
}

export function useContainerHeight<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setHeight(entry.contentRect.height));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return { ref, height };
}

export function useVisibleRows<T extends HTMLElement>(rowHeight: number, headerHeight = 48) {
  const { ref, height } = useContainerHeight<T>();
  const count = height > headerHeight ? Math.floor((height - headerHeight) / rowHeight) : 0;
  return { ref, visibleCount: count };
}

export function useVisibleCards<T extends HTMLElement>(cardWidth: number, gap = 20) {
  const { ref, width } = useContainerWidth<T>();
  const count = width > cardWidth ? Math.floor((width + gap) / (cardWidth + gap)) : 0;
  return { ref, visibleCount: count };
}
