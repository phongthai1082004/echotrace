"use client";

import { useCanvasStore } from "../../../hooks/useCanvasState";
import { useLayoutEngine } from "../../../hooks/useLayoutEngine";
import { LAYOUTS, FORMATS } from "../../../types";

export function LayoutPanel() {
  const bookMeta = useCanvasStore((s) => s.bookMeta);
  const { applyLayout, getLayoutsForFormat } = useLayoutEngine();
  const filtered = getLayoutsForFormat(bookMeta.format);

  return (
    <div className="p-4">
      <p className="font-mono text-[9px] font-bold tracking-widest uppercase mb-3 text-[#666]">Page Layouts</p>
      <div className="flex items-center gap-1 mb-3">
        <span className="font-mono text-[8px] font-bold text-[#999]">Format:</span>
        <span className="font-mono text-[8px] font-bold px-1.5 py-0.5 bg-[#222] text-white rounded-md">{FORMATS[bookMeta.format].label}</span>
      </div>
      <div className="space-y-2">
        {filtered.map((l) => (
          <div key={l.id} onClick={() => applyLayout(l)}
            className="flex gap-3 p-2.5 cursor-pointer hover:bg-[#e8e6e0] transition-all rounded-lg border-2 border-[#222] shadow-[2px_2px_0_#222] hover:translate-x-px hover:translate-y-[1px] hover:shadow-[1px_1px_0_#222]">
            <div className="w-16 h-20 bg-[#e8e6e0] shrink-0 relative overflow-hidden rounded-md">
              {l.cells.map((cell, i) => (
                <div key={i} className="absolute bg-[#222]/20"
                  style={{ left: `${cell.x * 100}%`, top: `${cell.y * 100}%`, width: `${cell.w * 100}%`, height: `${cell.h * 100}%`, border: "2px solid #222" }}
                />
              ))}
            </div>
            <div className="flex-1 min-w-0 self-center">
              <p className="font-mono text-[10px] font-bold mb-0.5">{l.label}</p>
              <p className="text-[10px] text-[#666]">{l.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
