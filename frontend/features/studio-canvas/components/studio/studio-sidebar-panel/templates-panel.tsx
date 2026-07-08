"use client";

export function TemplatesPanel() {
  return (
    <div className="p-4">
      <p className="font-['JetBrains_Mono'] text-[9px] tracking-widest uppercase mb-3" style={{ color: "rgba(26,26,26,0.38)" }}>Templates</p>
      <div className="space-y-2">
        {[
          { label: "Full Bleed", desc: "Single dramatic image" },
          { label: "Split", desc: "50/50 image & text" },
          { label: "Scrapbook", desc: "Offset photo collage" },
        ].map((t) => (
          <div key={t.label} className="p-2.5" style={{ border: "0.5px solid #dbdad6" }}>
            <div className="aspect-[3/4] bg-[#e8e6e0] mb-2 flex items-center justify-center">
              <span className="font-['JetBrains_Mono'] text-[8px]" style={{ color: "rgba(26,26,26,0.28)" }}>preview</span>
            </div>
            <p className="font-['JetBrains_Mono'] text-[10px] text-[#1a1a1a] mb-0.5">{t.label}</p>
            <p className="font-['Inter'] text-[10px]" style={{ color: "rgba(26,26,26,0.45)" }}>{t.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
