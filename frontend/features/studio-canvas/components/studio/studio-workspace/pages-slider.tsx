"use client";

export function PagesSlider() {
  return (
    <div className="shrink-0 flex items-center gap-3 px-4 bg-[#FDFBF7]"
      style={{ borderTop: "0.5px solid #dbdad6", height: 80 }}>
      <p className="font-['JetBrains_Mono'] text-[9px] tracking-widest uppercase shrink-0 mr-1" style={{ color: "rgba(26,26,26,0.35)" }}>Pages</p>
      {[1, 2, 3].map((p) => {
        const active = p === 1;
        return (
          <div key={p} className="shrink-0 flex flex-col items-center gap-1">
            <div style={{ width: 40, height: 54, border: active ? "1px solid #1a1a1a" : "0.5px solid #dbdad6", background: active ? "#fff" : "#f5f3ef" }}
              className="relative overflow-hidden">
              <div className="absolute inset-0 p-1.5 flex flex-col gap-0.5">
                <div className="h-1.5 w-full rounded-sm" style={{ background: active ? "#dbdad6" : "#e8e6e0" }} />
                <div className="h-px w-3/5" style={{ background: active ? "#dbdad6" : "#e8e6e0" }} />
                <div className="flex-1 w-full mt-0.5 rounded-sm" style={{ background: active ? "#f5f3ef" : "#e8e6e0", opacity: 0.6 }} />
              </div>
              {active && <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#1a1a1a]" />}
            </div>
            <span className="font-['JetBrains_Mono'] text-[7px] tracking-widest" style={{ color: active ? "#1a1a1a" : "rgba(26,26,26,0.35)" }}>{p}</span>
          </div>
        );
      })}
    </div>
  );
}
