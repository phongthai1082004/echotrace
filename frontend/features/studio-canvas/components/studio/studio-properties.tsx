"use client";

export function StudioProperties() {
  return (
    <div className="w-56 shrink-0 bg-[#FFF7D6] overflow-y-auto border-l-[3px] border-[#222]">
      <div className="p-4 border-b-[3px] border-[#222]">
        <p className="font-mono text-[9px] font-bold tracking-widest uppercase mb-3 text-[#666]">Properties</p>
        <p className="font-mono text-[10px] font-bold text-[#999]">Select an element</p>
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
