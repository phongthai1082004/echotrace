"use client";

import { PagesSlider } from "./pages-slider";

export function StudioWorkspace() {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-auto flex items-start justify-center p-8 bg-[#e8e6e0]"
        style={{
          backgroundImage: "linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}>
        <div style={{ transform: "scale(0.7)", transformOrigin: "top center", flexShrink: 0, position: "relative" }}>
          <div className="bg-white" style={{ width: 840, height: 1188, border: "3px solid #222", boxShadow: "6px 6px 0 #222" }}>
            <div className="absolute left-0 top-0 bottom-0 w-[14px] bg-[repeating-linear-gradient(90deg,#ccc_0,#ccc_1px,transparent_1px,transparent_3px)] opacity-40 pointer-events-none" />
            <div className="absolute left-[14px] top-0 bottom-0 border-l border-dashed border-[#ccc]" />
            <div className="absolute left-1 top-1/2 -translate-y-1/2 -rotate-90 origin-left font-mono text-[7px] font-bold tracking-widest text-[#bbb] uppercase whitespace-nowrap" style={{ writingMode: "vertical-rl" }}>
            </div>
          </div>
        </div>
      </div>
      <PagesSlider />
    </div>
  );
}
