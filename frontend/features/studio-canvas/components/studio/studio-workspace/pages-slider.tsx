"use client";

export function PagesSlider() {
  return (
    <div className="shrink-0 flex items-center gap-3 px-4 bg-[#FFF7D6] h-[80px] border-t-[3px] border-[#222]">
      <p className="font-mono text-[9px] font-bold tracking-widest uppercase shrink-0 mr-1 text-[#666]">Pages</p>
      {[1, 2, 3].map((p) => {
        const active = p === 1;
        return (
          <div key={p} className="shrink-0 flex flex-col items-center gap-1">
            <div className={`relative overflow-hidden ${active ? "border-[2px] border-[#222] shadow-[2px_2px_0_#222]" : "border-[2px] border-[#222]/30 bg-[#e8e6e0]"}`}
              style={{ width: 40, height: 54 }}>
              <div className="absolute inset-0 p-1.5 flex flex-col gap-0.5">
                <div className={`h-1.5 w-full rounded-sm ${active ? "bg-[#dbdad6]" : "bg-[#d0cdc5]"}`} />
                <div className={`h-px w-3/5 ${active ? "bg-[#dbdad6]" : "bg-[#d0cdc5]"}`} />
                <div className={`flex-1 w-full mt-0.5 rounded-sm opacity-60 ${active ? "bg-[#f5f3ef]" : "bg-[#d0cdc5]"}`} />
              </div>
              {active && <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#222]" />}
            </div>
            <span className={`font-mono text-[7px] font-bold tracking-widest ${active ? "text-[#222]" : "text-[#999]"}`}>{p}</span>
          </div>
        );
      })}
    </div>
  );
}
