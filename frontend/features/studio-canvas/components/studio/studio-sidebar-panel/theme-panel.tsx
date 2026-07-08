"use client";

const themes = [
  { name: "Charcoal", colors: ["#1a1a1a","#FDFBF7","#dbdad6","#9CB8A8","#C4A882"] },
  { name: "Sepia", colors: ["#2C1810","#F5E6D3","#D4A574","#8B6914","#5C4033"] },
  { name: "Nord", colors: ["#2E3440","#ECEFF4","#81A1C1","#A3BE8C","#BF616A"] },
  { name: "Warmth", colors: ["#3D2B1F","#FFF8F0","#E8C4A0","#B8926C","#8B5E3C"] },
  { name: "Ocean", colors: ["#0A1628","#E8F0F8","#4A7C9B","#7AB8D4","#2C5F7C"] },
  { name: "Moss", colors: ["#1A2E1A","#F0F5EA","#7A9B6A","#A8C49A","#4A6B3A"] },
];

export function ThemePanel() {
  return (
    <div className="p-4">
      <p className="font-['JetBrains_Mono'] text-[9px] tracking-widest uppercase mb-3" style={{ color: "rgba(26,26,26,0.38)" }}>Color Themes</p>
      <div className="space-y-1.5">
        {themes.map((t) => (
          <div key={t.name} className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-[#f5f3ef] transition-colors"
            style={{ border: "0.5px solid #dbdad6" }}
          >
            <div className="flex gap-0.5">
              {t.colors.map((c, i) => (
                <div key={i} className="w-5 h-5" style={{ background: c, border: "0.5px solid rgba(0,0,0,0.08)" }} />
              ))}
            </div>
            <span className="font-['JetBrains_Mono'] text-[10px] text-[#1a1a1a]">{t.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
