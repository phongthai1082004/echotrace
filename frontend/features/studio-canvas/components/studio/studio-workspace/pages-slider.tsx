"use client";

import { useCanvasStore } from "../../../hooks/useCanvasState";
import { usePageManager } from "../../../hooks/usePageManager";

function PageThumb({ thumb, idx, active, onClick }: { thumb?: string | null; idx: number; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`w-full h-full overflow-hidden bg-white ${active ? "border-2 border-[#222] shadow-[2px_2px_0_#222]" : "border-2 border-[#222]/30 hover:border-[#222]/60"} cursor-pointer transition-all`}>
      {thumb ? (
        <img src={thumb} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-white flex items-center justify-center">
          <span className="font-mono text-[7px] font-bold text-[#999]">{idx + 1}</span>
        </div>
      )}
      {active && <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#222]" />}
    </button>
  );
}

export function PagesSlider() {
  const pages = useCanvasStore((s) => s.pages);
  const activePageIndex = useCanvasStore((s) => s.activePageIndex);
  const { switchPage, addPage, deletePage } = usePageManager();
  const n = pages.length;
  const singleW = Math.round(54 * (210 / 297)); // ~38px for A4 portrait
  const spreadW = singleW * 2 + 1; // 2 pages + spine

  // items: cover pages are singles, content pages are spreads
  const items: { idx: number; type: "single" | "spread"; leftIdx: number; rightIdx: number; isCover: boolean }[] = [];
  let i = 0;
  while (i < n) {
    if (i === 0 || i === n - 1) {
      items.push({ idx: i, type: "single", leftIdx: i, rightIdx: i, isCover: true });
      i++;
    } else {
      const rightIdx = Math.min(i + 1, n - 1);
      items.push({ idx: i, type: "spread", leftIdx: i, rightIdx, isCover: false });
      i += 2;
    }
  }

  const handleDelete = (item: (typeof items)[0]) => {
    if (item.type === "spread") {
      // delete right page first so indices don't shift
      deletePage(item.rightIdx);
      deletePage(item.leftIdx);
    } else {
      deletePage(item.idx);
    }
  };

  return (
    <div className="shrink-0 flex items-center gap-3 px-4 bg-[#FFF7D6] h-[80px] overflow-x-auto thin-scrollbar border-t-[3px] border-[#222]">
      <p className="font-mono text-[9px] font-bold tracking-widest uppercase shrink-0 mr-1 text-[#666]">Pages</p>
      {items.map((item) => {
        const left = pages[item.leftIdx];
        const right = pages[item.rightIdx];
        const active = activePageIndex === item.leftIdx || activePageIndex === item.rightIdx;
        return (
          <div key={item.idx} className="shrink-0 flex flex-col items-center gap-1 group relative">
            <div className="relative" style={{ width: item.type === "spread" ? spreadW : singleW, height: 54 }}>
              {item.type === "spread" ? (
                <div onClick={() => switchPage(item.leftIdx)} className={`w-full h-full flex overflow-hidden bg-white ${active ? "border-2 border-[#222] shadow-[2px_2px_0_#222]" : "border-2 border-[#222]/30 hover:border-[#222]/60"} cursor-pointer transition-all`}>
                  <div className="w-1/2 h-full bg-white flex items-center justify-center overflow-hidden" style={{ borderRight: "1px dashed #222" }}>
                    {left?.thumbnailUrl ? <img src={left.thumbnailUrl} alt="" className="w-full h-full object-cover" style={{ objectPosition: "left" }} /> : <span className="font-mono text-[7px] font-bold text-[#999]">{item.leftIdx + 1}</span>}
                  </div>
                  <div className="w-1/2 h-full bg-white flex items-center justify-center overflow-hidden">
                    {(right?.thumbnailUrl || left?.thumbnailUrl) ? <img src={right?.thumbnailUrl || left?.thumbnailUrl || ""} alt="" className="w-full h-full object-cover" style={{ objectPosition: "right" }} /> : <span className="font-mono text-[7px] font-bold text-[#999]">{item.rightIdx + 1}</span>}
                  </div>
                </div>
              ) : (
                <PageThumb thumb={left?.thumbnailUrl} idx={item.idx} active={active} onClick={() => switchPage(item.idx)} />
              )}
              {!item.isCover && (
                <button onClick={() => handleDelete(item)}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-[#B54843] text-white rounded-full text-[8px] leading-none font-bold opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:scale-110">×</button>
              )}
              {active && <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#222]" />}
            </div>
            <span className={`font-mono text-[7px] font-bold tracking-widest ${active ? "text-[#222]" : "text-[#999]"}`}>{item.idx + 1}{item.type === "spread" ? `/${item.rightIdx + 1}` : ""}</span>
          </div>
        );
      })}
      <button onClick={addPage}
        className="shrink-0 flex items-center justify-center border-2 border-dashed border-[#222]/40 rounded-md hover:border-[#222] hover:bg-[#e8e6e0] transition-all"
        style={{ width: singleW, height: 54 }}>
        <span className="text-lg leading-none text-[#666]">+</span>
      </button>
    </div>
  );
}
