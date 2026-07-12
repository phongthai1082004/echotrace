"use client";

import { useState } from "react";
import { useCanvasStore } from "../../../hooks/useCanvasState";
import * as fabric from "fabric";
import exampleImg from "@/assets/images/example.jpg";

type FilterDef = {
  name: string;
  gradient: string;
  apply: () => fabric.filters.BaseFilter<any, any, any>[];
};

const smartFilters: FilterDef[] = [
  { name: "Warm Vintage", gradient: "from-[#8B6914]/60 to-[#F5E6D3]/40", apply: () => [new fabric.filters.ColorMatrix({ matrix: [1,0,0,0,0.15, 0,1,0,0,0.08, 0,0,1,0,0, 0,0,0,1,0] })] },
  { name: "Cool Breeze", gradient: "from-[#4A7C9B]/60 to-[#E8F0F8]/40", apply: () => [new fabric.filters.ColorMatrix({ matrix: [1,0,0,0,-0.08, 0,1,0,0,0, 0,0,1,0,0.12, 0,0,0,1,0] })] },
  { name: "Monochrome", gradient: "from-[#444]/60 to-[#ccc]/40", apply: () => [new fabric.filters.Grayscale()] },
  { name: "Golden Hour", gradient: "from-[#D4A574]/60 to-[#FFF7D6]/40", apply: () => [new fabric.filters.ColorMatrix({ matrix: [1,0,0,0,0.2, 0,1,0,0,0.1, 0,0,1,0,0, 0,0,0,1,0] })] },
  { name: "Matte Film", gradient: "from-[#7A9B6A]/60 to-[#F0F5EA]/40", apply: () => [new fabric.filters.ColorMatrix({ matrix: [1,0,0,0,0.05, 0,1,0,0,0.05, 0,0,1,0,0.05, 0,0,0,0.85,0] })] },
  { name: "Noir", gradient: "from-[#111]/60 to-[#eee]/40", apply: () => [new fabric.filters.ColorMatrix({ matrix: [0.3,0.3,0.3,0,0, 0.3,0.3,0.3,0,0, 0.3,0.3,0.3,0,0, 0,0,0,1,0] })] },
];

function applyToAllPhotos(canvas: fabric.Canvas, filters: fabric.filters.BaseFilter<any, any, any>[]) {
  canvas.getObjects().forEach((obj: any) => {
    if (obj.type === "image") { obj.filters = filters; obj.applyFilters(); }
  });
  canvas.renderAll();
}

function clearAllPhotos(canvas: fabric.Canvas) {
  canvas.getObjects().forEach((obj: any) => {
    if (obj.type === "image") { obj.filters = []; obj.applyFilters(); }
  });
  canvas.renderAll();
}

export function FilterPanel() {
  const canvas = useCanvasStore((s) => s.canvas);
  const pushUndo = useCanvasStore((s) => s.pushUndo);
  const [confirm, setConfirm] = useState<FilterDef | null>(null);

  const handleApply = (f: FilterDef) => { if (canvas) setConfirm(f); };

  const doApply = (f: FilterDef) => {
    if (!canvas) return;
    pushUndo();
    applyToAllPhotos(canvas, f.apply());
    setConfirm(null);
  };

  const handleReset = () => {
    if (!canvas) return;
    pushUndo();
    clearAllPhotos(canvas);
  };

  return (
    <div className="p-4">
      <p className="font-mono text-[9px] font-bold tracking-widest uppercase mb-3 text-[#666]">Smart Filters</p>
      <button onClick={handleReset}
        className="w-full flex items-center gap-3 px-3 py-2.5 mb-3 cursor-pointer hover:bg-[#e8e6e0] transition-all rounded-lg border-2 border-[#222] shadow-[2px_2px_0_#222] hover:translate-x-px hover:translate-y-[1px] hover:shadow-[1px_1px_0_#222] text-left">
        <div className="w-9 h-9 rounded-[4px] border-2 border-[#222] bg-white flex items-center justify-center shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#222" strokeWidth="2" strokeLinecap="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
        </div>
        <div>
          <p className="font-mono text-[10px] font-bold">Reset All</p>
          <p className="font-mono text-[7px] tracking-widest uppercase text-[#999]">Clear all photo filters</p>
        </div>
      </button>
      <div className="grid grid-cols-2 gap-2">
        {smartFilters.map((f) => (
          <button key={f.name} onClick={() => handleApply(f)}
            className="flex flex-col items-center gap-1.5 px-2 py-2 cursor-pointer hover:bg-[#e8e6e0] transition-all rounded-lg border-2 border-[#222] shadow-[2px_2px_0_#222] hover:translate-x-px hover:translate-y-[1px] hover:shadow-[1px_1px_0_#222]">
            <div className="w-full h-12 rounded-[3px] border-[2px] border-[#222] overflow-hidden relative">
              <img src={exampleImg.src} alt="" className="absolute inset-0 w-full h-full object-cover" />
              <div className={`absolute inset-0 bg-gradient-to-br ${f.gradient}`} />
            </div>
            <span className="font-mono text-[7px] font-bold tracking-widest uppercase text-center leading-tight">{f.name}</span>
          </button>
        ))}
      </div>

      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-[#FFF7D6] rounded-[10px] border-[3px] border-[#222] shadow-[4px_4px_0_#222] p-5 max-w-xs w-full mx-4">
            <p className="font-mono text-[10px] font-bold mb-1">Apply Smart Filter</p>
            <p className="font-mono text-[8px] leading-relaxed text-[#666] mb-4">
              &ldquo;{confirm.name}&rdquo; will be applied to <strong>all photos</strong> on this page. Continue?
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirm(null)}
                className="font-mono text-[9px] font-bold tracking-widest uppercase px-3 py-1.5 rounded-lg border-2 border-[#222] shadow-[1px_1px_0_#222] hover:translate-x-px hover:translate-y-px hover:shadow-none transition-all bg-white">
                Cancel
              </button>
              <button onClick={() => doApply(confirm)}
                className="font-mono text-[9px] font-bold tracking-widest uppercase px-3 py-1.5 rounded-lg border-2 border-[#222] shadow-[1px_1px_0_#222] hover:translate-x-px hover:translate-y-px hover:shadow-none transition-all bg-[#222] text-white">
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
