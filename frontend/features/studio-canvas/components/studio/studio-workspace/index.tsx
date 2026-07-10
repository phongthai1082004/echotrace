"use client";

import Canvas from "./canvas-surface";
import { PagesSlider } from "./pages-slider";

export function StudioWorkspace() {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-auto flex items-start justify-center p-8 bg-[#e8e6e0]"
        style={{
          backgroundImage: "linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}>
        <div style={{ transform: "scale(0.7)", transformOrigin: "top center", flexShrink: 0 }}>
          <div className="bg-white" style={{ width: 840, height: 1188, border: "3px solid #222", boxShadow: "6px 6px 0 #222" }} />
        </div>
      </div>
      <PagesSlider />
    </div>
  );
}
