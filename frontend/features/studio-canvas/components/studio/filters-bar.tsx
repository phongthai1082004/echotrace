"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import * as fabric from "fabric";
import { useCanvasStore } from "../../hooks/useCanvasState";
import { FILTER_PRESETS, parseFilterSliders } from "../../lib/filters";

export function FiltersBar() {
  const canvas = useCanvasStore((s) => s.canvas);
  const pushUndo = useCanvasStore((s) => s.pushUndo);
  const incrementFilterVersion = useCanvasStore((s) => s.incrementFilterVersion);
  const setFilterSliderValues = useCanvasStore((s) => s.setFilterSliderValues);
  useCanvasStore((s) => s.selectionVersion);
  const selected = canvas?.getActiveObject();
  const isImage = selected?.type === "image";
  const img = isImage ? (selected as fabric.FabricImage) : null;
  const selectedSrc = isImage ? (selected as fabric.FabricImage).getSrc() : null;
  const scrollRef = useRef<HTMLDivElement>(null);
  const presets = FILTER_PRESETS;

  const scroll = (dir: -1 | 1) => {
    const el = scrollRef.current;
    if (el) el.scrollLeft += dir * 160;
  };

  const handleClick = (p: (typeof presets)[number]) => {
    if (!canvas || !img) return;
    pushUndo();
    img.filters = p.apply();
    img.applyFilters();
    canvas.renderAll();
    setFilterSliderValues(parseFilterSliders(img.filters));
    incrementFilterVersion();
  };

  if (!isImage || !selectedSrc) return null;

  return (
    <div className="shrink-0 bg-[#FFF7D6] border-t-[3px] border-[#222] flex flex-row">
      <button
        onClick={() => scroll(-1)}
        className="shrink-0 self-stretch px-2 border-r-[3px] border-y-[3px] border-[#222] hover:bg-[#e8e6e0] transition-[background-color] flex items-center justify-center"
      >
        <ChevronLeft size={14} />
      </button>
      <div className="my-4 flex items-center flex-1 min-w-0">
        <div
          ref={scrollRef}
          onWheel={(e) => {
            e.currentTarget.scrollLeft += e.deltaY;
          }}
          className="w-full flex items-center gap-2 px-3 overflow-hidden"
        >
          {presets.map((p) => (
            <button
              key={p.name}
              onClick={() => handleClick(p)}
              className="flex flex-col items-center gap-1 shrink-0 p-2 rounded-lg border-2 border-[#222] shadow-[1px_1px_0_#222] hover:translate-x-px hover:translate-y-[0.5px] hover:shadow-[0px_0px_0_#222] transition-[transform,box-shadow] bg-white"
            >
              <div className="w-12 h-12 rounded-[3px] border-[1.5px] border-[#222] overflow-hidden relative">
                <img
                  src={selectedSrc}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                  style={p.cssFilter ? { filter: p.cssFilter } : undefined}
                />
              </div>

              <span className="font-mono text-[7px] font-bold tracking-widest uppercase whitespace-nowrap">
                {p.name}
              </span>
            </button>
          ))}
        </div>
      </div>
      <button
        onClick={() => scroll(1)}
        className="shrink-0 self-stretch px-2 border-l-[3px] border-y-[3px] border-[#222] hover:bg-[#e8e6e0] transition-[background-color] flex items-center justify-center"
      >
        <ChevronRight size={14} />
      </button>
    </div>
  );
}
