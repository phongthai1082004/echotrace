"use client";

import { useState } from "react";

const photoFilters = [
  { name: "Warm", gradient: "from-[#8B6914]/30" },
  { name: "Cool", gradient: "from-[#4A7C9B]/30" },
  { name: "B&W", gradient: "from-[#444]/40" },
  { name: "Gold", gradient: "from-[#D4A574]/40" },
  { name: "Mute", gradient: "from-[#7A9B6A]/20" },
  { name: "Noir", gradient: "from-[#111]/50" },
];

export function StudioProperties() {
  const [hasSelection] = useState(true); // ponytail: swap to real canvas selection

  return (
    <div className="w-56 shrink-0 bg-[#FFF7D6] overflow-y-auto border-l-[3px] border-[#222]">
      <div className="p-4 border-b-[3px] border-[#222]">
        <p className="font-mono text-[9px] font-bold tracking-widest uppercase mb-3 text-[#666]">Properties</p>
        {hasSelection ? (
          <div className="space-y-4">
            <div>
              <p className="font-mono text-[9px] font-bold tracking-widest uppercase mb-2 text-[#666]">Adjust</p>
              {[["Brightness", 0], ["Contrast", 0], ["Saturation", 0], ["Sharpness", 0]].map(([label]) => (
                <div key={label} className="mb-2">
                  <div className="flex justify-between mb-0.5">
                    <p className="font-mono text-[8px] font-bold text-[#999]">{label}</p>
                    <p className="font-mono text-[8px] font-bold text-[#999]">0</p>
                  </div>
                  <div className="h-1.5 bg-[#e8e6e0] rounded-full border-[1.5px] border-[#222] overflow-hidden">
                    <div className="h-full w-1/2 bg-[#222] rounded-full" style={{ width: `${50 + (label === "Brightness" ? 10 : label === "Contrast" ? -5 : label === "Saturation" ? 20 : -15)}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div>
              <p className="font-mono text-[9px] font-bold tracking-widest uppercase mb-2 text-[#666]">Filters</p>
              <div className="grid grid-cols-3 gap-1.5">
                {photoFilters.map((f) => (
                  <button key={f.name} className="flex flex-col items-center gap-0.5 px-1 py-1.5 rounded-lg border-2 border-[#222] shadow-[1px_1px_0_#222] hover:translate-x-px hover:translate-y-px hover:shadow-[0px_0px_0_#222] transition-all bg-[#FFF7D6]">
                    <div className={`w-full h-6 rounded-[2px] border-[1.5px] border-[#222] bg-gradient-to-r ${f.gradient} to-transparent`} />
                    <span className="font-mono text-[6px] font-bold tracking-widest uppercase text-[#666]">{f.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p className="font-mono text-[10px] font-bold text-[#999]">Select an element</p>
        )}
      </div>
      <div className="p-4">
        <p className="font-mono text-[9px] font-bold tracking-widest uppercase mb-3 text-[#666]">Canvas</p>
        {[["FORMAT", "A4 Portrait"], ["SIZE", "210 × 297 mm"], ["STOCK", "Arctic Volume 120gsm"], ["BLEED", "3mm"]].map(([k, v]) => (
          <div key={k} className="mb-2.5"><p className="font-mono text-[9px] font-bold mb-0.5 text-[#999]">{k}</p><p className="font-mono text-[10px] font-bold text-[#222]">{v}</p></div>
        ))}
      </div>
    </div>
  );
}
