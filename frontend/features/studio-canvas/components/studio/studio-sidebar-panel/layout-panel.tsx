"use client";

const layouts = [
  { label: "Full Page", desc: "Single full-bleed photo", cells: [[0,0,1,1]] },
  { label: "Split", desc: "50/50 image & text", cells: [[0,0,0.5,1],[0.5,0,0.5,1]] },
  { label: "Montage", desc: "Three staggered photos", cells: [[0,0,0.6,0.55],[0.6,0,0.4,0.4],[0.5,0.55,0.5,0.45]] },
  { label: "Canvas", desc: "Text column + image", cells: [[0,0,0.35,1],[0.35,0,0.65,1]] },
  { label: "Grid 2×2", desc: "Four equal photos", cells: [[0,0,0.5,0.5],[0.5,0,0.5,0.5],[0,0.5,0.5,0.5],[0.5,0.5,0.5,0.5]] },
  { label: "Hero", desc: "Wide image + caption", cells: [[0,0,1,0.6],[0,0.6,1,0.4]] },
];

export function LayoutPanel() {
  return (
    <div className="p-4">
      <p className="font-mono text-[9px] font-bold tracking-widest uppercase mb-3 text-[#666]">Page Layouts</p>
      <div className="space-y-2">
        {layouts.map((l) => (
          <div key={l.label} className="flex gap-3 p-2.5 cursor-pointer hover:bg-[#e8e6e0] transition-all rounded-lg border-2 border-[#222] shadow-[2px_2px_0_#222] hover:translate-x-px hover:translate-y-[1px] hover:shadow-[1px_1px_0_#222]">
            <div className="w-16 h-20 bg-[#e8e6e0] shrink-0 relative overflow-hidden rounded-md">
              {l.cells.map(([x, y, w, h], i) => (
                <div key={i} className="absolute bg-[#222]/20"
                  style={{ left: `${x * 100}%`, top: `${y * 100}%`, width: `${w * 100}%`, height: `${h * 100}%`, border: "2px solid #222" }}
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
