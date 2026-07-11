"use client";

export function TemplatesPanel() {
  return (
    <div className="p-4">
      <p className="font-mono text-[9px] font-bold tracking-widest uppercase mb-3 text-[#666]">Templates</p>
      <div className="space-y-2">
        {[
          { label: "Full Bleed", desc: "Single dramatic image" },
          { label: "Split", desc: "50/50 image & text" },
          { label: "Scrapbook", desc: "Offset photo collage" },
        ].map((t) => (
          <div key={t.label} className="p-2.5 rounded-lg border-2 border-[#222] shadow-[2px_2px_0_#222] hover:translate-x-px hover:translate-y-[1px] hover:shadow-[1px_1px_0_#222] cursor-pointer transition-all">
            <div className="aspect-[3/4] bg-[#e8e6e0] mb-2 flex items-center justify-center rounded-md">
              <span className="font-mono text-[8px] font-bold text-[#999]">preview</span>
            </div>
            <p className="font-mono text-[10px] font-bold mb-0.5">{t.label}</p>
            <p className="text-[10px] text-[#666]">{t.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
