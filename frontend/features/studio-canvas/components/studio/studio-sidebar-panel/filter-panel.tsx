"use client";

const smartFilters = [
  { name: "Warm Vintage", desc: "Amber tones, faded contrast", gradient: "from-[#8B6914]/30 to-[#F5E6D3]/20" },
  { name: "Cool Breeze", desc: "Blue tint, soft highlights", gradient: "from-[#4A7C9B]/30 to-[#E8F0F8]/20" },
  { name: "Monochrome", desc: "Desaturated, high contrast", gradient: "from-[#444]/40 to-[#ccc]/20" },
  { name: "Golden Hour", desc: "Warm glow, soft bloom", gradient: "from-[#D4A574]/40 to-[#FFF7D6]/20" },
  { name: "Matte Film", desc: "Flat tones, muted shadows", gradient: "from-[#7A9B6A]/20 to-[#F0F5EA]/30" },
  { name: "Noir", desc: "Deep blacks, stark whites", gradient: "from-[#111]/50 to-[#eee]/10" },
];

const palettes = [
  { name: "Earth", colors: ["#5C4033","#D4A574","#F5E6D3","#8B6914"] },
  { name: "Pastel", colors: ["#F2D5D5","#D5E8D5","#D5D5F2","#F2F2D5"] },
  { name: "Vivid", colors: ["#E85D3A","#3A86E8","#5AE85D","#E8D53A"] },
  { name: "Ocean", colors: ["#0A1628","#4A7C9B","#7AB8D4","#E8F0F8"] },
];

export function FilterPanel() {
  return (
    <div className="p-4 space-y-6">
      <div>
        <p className="font-mono text-[9px] font-bold tracking-widest uppercase mb-2 text-[#666]">Smart Filters</p>
        <div className="space-y-1.5">
          {smartFilters.map((f) => (
            <button key={f.name} className="w-full flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-[#e8e6e0] transition-all rounded-lg border-2 border-[#222] shadow-[2px_2px_0_#222] hover:translate-x-px hover:translate-y-[1px] hover:shadow-[1px_1px_0_#222] text-left">
              <div className={`w-8 h-8 rounded-[4px] border-2 border-[#222] bg-gradient-to-br ${f.gradient}`} />
              <div>
                <p className="font-mono text-[10px] font-bold">{f.name}</p>
                <p className="font-mono text-[7px] tracking-widest uppercase text-[#999]">{f.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="font-mono text-[9px] font-bold tracking-widest uppercase mb-2 text-[#666]">Color Palette</p>
        <div className="space-y-1.5">
          {palettes.map((p) => (
            <button key={p.name} className="w-full flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-[#e8e6e0] transition-all rounded-lg border-2 border-[#222] shadow-[2px_2px_0_#222] hover:translate-x-px hover:translate-y-[1px] hover:shadow-[1px_1px_0_#222]">
              <div className="flex gap-px">
                {p.colors.map((c, i) => (
                  <div key={i} className="w-5 h-5 border-[2px] border-[#222] first:rounded-l-[3px] last:rounded-r-[3px]" style={{ background: c }} />
                ))}
              </div>
              <span className="font-mono text-[10px] font-bold">{p.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
