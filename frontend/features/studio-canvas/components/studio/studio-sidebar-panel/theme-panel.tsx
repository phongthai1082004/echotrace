"use client";

const themes = [
  { name: "Charcoal", colors: ["#222","#FFF7D6","#e8e6e0","#9CB8A8","#C4A882"] },
  { name: "Sepia", colors: ["#2C1810","#F5E6D3","#D4A574","#8B6914","#5C4033"] },
  { name: "Nord", colors: ["#2E3440","#ECEFF4","#81A1C1","#A3BE8C","#BF616A"] },
  { name: "Warmth", colors: ["#3D2B1F","#FFF8F0","#E8C4A0","#B8926C","#8B5E3C"] },
  { name: "Ocean", colors: ["#0A1628","#E8F0F8","#4A7C9B","#7AB8D4","#2C5F7C"] },
  { name: "Moss", colors: ["#1A2E1A","#F0F5EA","#7A9B6A","#A8C49A","#4A6B3A"] },
];

export function ThemePanel() {
  return (
    <div className="p-4">
      <p className="font-mono text-[9px] font-bold tracking-widest uppercase mb-3 text-[#666]">Color Themes</p>
      <div className="space-y-1.5">
        {themes.map((t) => (
          <div key={t.name} className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-[#e8e6e0] transition-all rounded-lg border-2 border-[#222] shadow-[2px_2px_0_#222] hover:translate-x-px hover:translate-y-[1px] hover:shadow-[1px_1px_0_#222]">
            <div className="flex gap-0.5">
              {t.colors.map((c, i) => (
                <div key={i} className="w-5 h-5 rounded-[3px]" style={{ background: c, border: "2px solid #222" }} />
              ))}
            </div>
            <span className="font-mono text-[10px] font-bold">{t.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
