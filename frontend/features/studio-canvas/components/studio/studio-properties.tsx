"use client";

export function StudioProperties() {
  return (
    <div className="w-56 shrink-0 bg-[#FDFBF7] overflow-y-auto" style={{ borderLeft: "0.5px solid #dbdad6" }}>
      <div className="p-4" style={{ borderBottom: "0.5px solid #dbdad6" }}>
        <p className="font-['JetBrains_Mono'] text-[9px] tracking-widest uppercase mb-3" style={{ color: "rgba(26,26,26,0.38)" }}>Properties</p>
        <p className="font-['JetBrains_Mono'] text-[10px]" style={{ color: "rgba(26,26,26,0.28)" }}>Select an element</p>
      </div>
      <div className="p-4">
        <p className="font-['JetBrains_Mono'] text-[9px] tracking-widest uppercase mb-3" style={{ color: "rgba(26,26,26,0.38)" }}>Canvas</p>
        {[["FORMAT", "A4 Portrait"], ["SIZE", "210 × 297 mm"], ["STOCK", "Arctic Volume 120gsm"], ["BLEED", "3mm"]].map(([k, v]) => (
          <div key={k} className="mb-2.5"><p className="font-['JetBrains_Mono'] text-[9px] mb-0.5" style={{ color: "rgba(26,26,26,0.38)" }}>{k}</p><p className="font-['JetBrains_Mono'] text-[10px] text-[#1a1a1a]">{v}</p></div>
        ))}
      </div>
    </div>
  );
}
