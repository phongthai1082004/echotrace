"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PageFlip, SizeType } from "page-flip";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { neoBtnSm } from "@/lib/styles";
import type { BookPageImage } from "./render-book-images";

const PAGE_W = 550;

export function FlipPreview({ images }: { images: BookPageImage[] }) {
  const bookRef = useRef<HTMLDivElement>(null);
  const flipRef = useRef<PageFlip | null>(null);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(images.length);

  useEffect(() => {
    const el = bookRef.current;
    if (!el || images.length === 0) return;
    let cancelled = false;
    let flip: PageFlip | null = null;
    // dynamic import: UMD bundle never evaluates during SSR
    void import("page-flip").then(({ PageFlip: Ctor }) => {
      if (cancelled || !bookRef.current) return;
      const base = images[0];
      const h = Math.round((PAGE_W * base.height) / Math.max(1, base.width));
      flip = new Ctor(el, {
        width: PAGE_W,
        height: h,
        size: "stretch" as SizeType,
        minWidth: 300,
        maxWidth: 1100,
        minHeight: Math.round((300 * h) / PAGE_W),
        maxHeight: Math.round((1100 * h) / PAGE_W),
        showCover: true,
        flippingTime: 800,
        maxShadowOpacity: 0.4,
        mobileScrollSupport: false,
        usePortrait: true,
      });
      const instance = flip;
      instance.on("flip", (e) => setPage(Number(e.data)));
      instance.on("init", (e) => {
        setTotal(instance.getPageCount());
        setPage(Number((e.data as { page?: number })?.page ?? 0));
      });
      instance.loadFromImages(images.map((i) => i.src));
      flipRef.current = instance;
    });
    return () => {
      cancelled = true;
      flip?.destroy();
      flipRef.current = null;
    };
  }, [images]);

  const go = useCallback((fn: (f: PageFlip) => void) => {
    const f = flipRef.current;
    if (f) fn(f);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go((f) => f.flipNext());
      else if (e.key === "ArrowLeft") go((f) => f.flipPrev());
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  if (images.length === 0) {
    return (
      <div className="h-full flex items-center justify-center font-mono text-[10px] font-bold text-[#222]/60">
        No pages to preview
      </div>
    );
  }

  const btn =
    `${neoBtnSm} font-mono text-[10px] font-bold tracking-widest uppercase p-2.5 shrink-0 cursor-pointer disabled:opacity-40 disabled:pointer-events-none`;
  const last = Math.max(0, total - 1);

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0 w-full max-w-5xl mx-auto px-4 pt-4 flex items-center justify-center">
        <div ref={bookRef} className="w-full h-full" />
      </div>
      <div className="shrink-0 w-full flex justify-center">
        <div className="flex items-center gap-3 max-w-full p-4 overflow-x-auto">
          <button aria-label="Cover" className={btn} disabled={page === 0} onClick={() => go((f) => f.flip(0))}>
            <ChevronsLeft size={14} />
          </button>
          <button aria-label="Previous" className={btn} disabled={page === 0} onClick={() => go((f) => f.flipPrev())}>
            <ChevronLeft size={14} />
          </button>
          <span className="font-mono text-[10px] font-bold tracking-widest uppercase text-[#222]/70 shrink-0">
            Page {page + 1} / {total}
          </span>
          <button aria-label="Next" className={btn} disabled={page >= last} onClick={() => go((f) => f.flipNext())}>
            <ChevronRight size={14} />
          </button>
          <button aria-label="Back cover" className={btn} disabled={page >= last} onClick={() => go((f) => f.flip(last))}>
            <ChevronsRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
