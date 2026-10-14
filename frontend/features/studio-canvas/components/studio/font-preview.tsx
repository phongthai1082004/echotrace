"use client";

import { useEffect, useRef } from "react";
import { ensureFontFamily } from "../../lib/fonts";

// Renders text in its own typeface, fetching the family only when scrolled
// into view — so 500-entry lists stay WYSIWYG without a 500-family preload.
const pending = new Map<Element, string>();
let io: IntersectionObserver | null = null;

function observe(el: Element, name: string) {
  if (typeof IntersectionObserver === "undefined") {
    void ensureFontFamily(name);
    return;
  }
  if (!io) {
    io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const n = pending.get(e.target);
          if (n) void ensureFontFamily(n);
          pending.delete(e.target);
          io?.unobserve(e.target);
        });
      },
      { rootMargin: "200px" },
    );
  }
  pending.set(el, name);
  io.observe(el);
}

export function FontPreview({
  name,
  css,
  className,
  children,
}: {
  name: string;
  css: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    observe(el, name);
    return () => {
      pending.delete(el);
      io?.unobserve(el);
    };
  }, [name]);

  return (
    <span ref={ref} className={className} style={{ fontFamily: css }}>
      {children ?? name}
    </span>
  );
}
