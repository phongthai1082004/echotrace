"use client";

import Canvas from "./canvas-surface";
import { PagesSlider } from "./pages-slider";

export function StudioWorkspace() {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-auto flex items-start justify-center p-8" style={{ background: "#dedad4" }}>
        <div style={{ transform: "scale(0.7)", transformOrigin: "top center", flexShrink: 0 }}>
          <div className="bg-[#FDFBF7]" style={{ width: 840, height: 1188, border: "0.5px solid #c0beba" }} />
        </div>
      </div>
      <PagesSlider />
    </div>
  );
}
