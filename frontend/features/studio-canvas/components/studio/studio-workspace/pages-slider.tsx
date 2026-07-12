"use client";

import { useCanvasStore } from "../../../hooks/useCanvasState";
import { usePageManager } from "../../../hooks/usePageManager";

export function PagesSlider() {
  const pages = useCanvasStore((s) => s.pages);
  const activePageIndex = useCanvasStore((s) => s.activePageIndex);
  const { switchPage, addPage, deletePage } = usePageManager();

  return (
    <div className="shrink-0 flex items-center gap-3 px-4 bg-[#FFF7D6] h-[80px] border-t-[3px] border-[#222]">
      <p className="font-mono text-[9px] font-bold tracking-widest uppercase shrink-0 mr-1 text-[#666]">Pages</p>
      {pages.map((p, i) => {
        const active = i === activePageIndex;
        return (
          <div key={i} className="shrink-0 flex flex-col items-center gap-1 group relative">
            <button onClick={() => switchPage(i)}
              className={`relative overflow-hidden ${active ? "border-2 border-[#222] shadow-[2px_2px_0_#222]" : "border-2 border-[#222]/30 hover:border-[#222]/60"} cursor-pointer transition-all`}
              style={{ width: 40, height: 54 }}>
              {p.thumbnailUrl ? (
                <img src={p.thumbnailUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-[#e8e6e0] flex items-center justify-center">
                  <span className="font-mono text-[7px] font-bold text-[#999]">{i + 1}</span>
                </div>
              )}
              {active && <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#222]" />}
            </button>
            <span className={`font-mono text-[7px] font-bold tracking-widest ${active ? "text-[#222]" : "text-[#999]"}`}>{i + 1}</span>
            {pages.length > 1 && (
              <button onClick={() => deletePage(i)}
                className="absolute -top-1 -right-1 w-4 h-4 bg-[#B54843] text-white rounded-full text-[8px] leading-none font-bold opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:scale-110">×</button>
            )}
          </div>
        );
      })}
      <button onClick={addPage}
        className="shrink-0 flex items-center justify-center border-2 border-dashed border-[#222]/40 rounded-md hover:border-[#222] hover:bg-[#e8e6e0] transition-all"
        style={{ width: 40, height: 54 }}>
        <span className="text-lg leading-none text-[#666]">+</span>
      </button>
      <div className="ml-auto flex items-center gap-2">
        <button className="flex items-center gap-1.5 font-mono text-[9px] font-bold tracking-widest uppercase px-3 py-2 rounded-lg border-2 border-[#222] shadow-[2px_2px_0_#222] bg-[#222] text-white hover:translate-x-px hover:translate-y-[1px] hover:shadow-[1px_1px_0_#222] transition-all">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
          Auto-Fill
        </button>
      </div>
    </div>
  );
}
