"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Lock } from "lucide-react";
import { useCanvasStore } from "../../../hooks/useCanvasState";
import { usePageManager } from "../../../hooks/usePageManager";
import { isPageLocked } from "../../../lib/layout-engine";

const PageThumb = memo(function PageThumb({
  thumb,
  idx,
  active,
  onClick,
}: {
  thumb?: string | null;
  idx: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full h-full overflow-hidden bg-white ${active ? "border-2 border-[#222] shadow-[2px_2px_0_#222]" : "border-2 border-[#222]/30 hover:border-[#222]/60"} cursor-pointer transition-all`}
    >
      {thumb ? (
        <img src={thumb} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-white flex items-center justify-center">
          <span className="font-mono text-[7px] font-bold text-[#999]">{idx + 1}</span>
        </div>
      )}
      {active && <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#222]" />}
    </button>
  );
});

type Item = { idx: number; type: "single" | "spread"; leftIdx: number; rightIdx: number; isCover: boolean };

export function PagesSlider() {
  const pages = useCanvasStore((s) => s.pages);
  const activePageIndex = useCanvasStore((s) => s.activePageIndex);
  const ratio = useCanvasStore((s) =>
    s.bookMeta.width && s.bookMeta.height ? s.bookMeta.width / s.bookMeta.height : 210 / 297,
  );
  const pageClipboard = useCanvasStore((s) => s.pageClipboard);
  const { switchPage, addPage, deletePage, moveSpread, duplicateSpread, copySpread, pasteCopiedSpread, togglePageLock } =
    usePageManager();
  const n = pages.length;
  const h = 54;
  const singleW = Math.round(h * ratio); // thumbnail keeps the canvas aspect ratio
  const spreadW = singleW * 2 + 1; // 2 pages + spine

  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<number | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; item: Item } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // clamp menu into viewport + close on outside click / Escape
  useEffect(() => {
    if (!menu) return;
    const el = menuRef.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      const vw = window.innerWidth,
        vh = window.innerHeight;
      let cx = menu.x,
        cy = menu.y;
      if (menu.x + rect.width > vw - 8) cx = vw - rect.width - 8;
      if (menu.y + rect.height > vh - 8) cy = vh - rect.height - 8;
      el.style.left = `${Math.max(8, cx)}px`;
      el.style.top = `${Math.max(8, cy)}px`;
    }
    const close = () => setMenu(null);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenu(null);
    window.addEventListener("click", close);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  // items: cover pages are singles, content pages are spreads
  const items: Item[] = useMemo(() => {
    const out: Item[] = [];
    let i = 0;
    while (i < n) {
      if (i === 0 || i === n - 1) {
        out.push({ idx: i, type: "single", leftIdx: i, rightIdx: i, isCover: true });
        i++;
      } else {
        const rightIdx = Math.min(i + 1, n - 1);
        out.push({ idx: i, type: "spread", leftIdx: i, rightIdx, isCover: false });
        i += 2;
      }
    }
    return out;
  }, [n]);

  const handleDelete = (item: (typeof items)[0]) => {
    // deletePage đã chặn trang khóa; đây chỉ ẩn nút × cho gọn.
    if (item.type === "spread") {
      // delete right page first so indices don't shift
      deletePage(item.rightIdx);
      deletePage(item.leftIdx);
    } else {
      deletePage(item.idx);
    }
  };

  const itemLocked = (item: (typeof items)[0]) => isPageLocked(pages, item.leftIdx);

  const menuItems = menu
    ? [
        ...(menu.item.isCover
          ? []
          : [
              {
                label: itemLocked(menu.item) ? "Unlock" : "Lock",
                fn: () => togglePageLock(menu.item.leftIdx),
              },
            ]),
        { label: "Duplicate", fn: () => duplicateSpread(menu.item.leftIdx) },
        { label: "Copy", fn: () => copySpread(menu.item.leftIdx) },
        { label: "Paste", disabled: !pageClipboard?.length, fn: () => pasteCopiedSpread() },
        { label: "Delete", disabled: itemLocked(menu.item), fn: () => handleDelete(menu.item) },
      ]
    : [];

  return (
    <div className="shrink-0 flex items-center gap-3 px-4 bg-[#FFF7D6] overflow-x-auto thin-scrollbar border-t-[3px] border-[#222]">
      <div className="my-2 flex items-center gap-3">
        <p className="font-mono text-[9px] font-bold tracking-widest uppercase shrink-0 mr-1 text-[#666]">Pages</p>
        {items.map((item) => {
          const left = pages[item.leftIdx];
          const right = pages[item.rightIdx];
          const active = activePageIndex === item.leftIdx || activePageIndex === item.rightIdx;
          const dragging = dragFrom === item.leftIdx;
          const isTarget = dropTarget === item.leftIdx && dragFrom !== item.leftIdx;
          const locked = itemLocked(item);
          return (
            <div
              key={item.idx}
              className="shrink-0 flex flex-col items-center gap-1 group relative"
              draggable={!item.isCover}
              onDragStart={(e) => {
                if (item.isCover) return;
                setDragFrom(item.leftIdx);
                setMenu(null);
                e.dataTransfer.effectAllowed = "move";
                try {
                  e.dataTransfer.setData("text/plain", String(item.leftIdx));
                } catch {}
              }}
              onDragOver={(e) => {
                if (item.isCover || dragFrom == null) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                setDropTarget(item.leftIdx);
              }}
              onDragLeave={() => setDropTarget((t) => (t === item.leftIdx ? null : t))}
              onDrop={(e) => {
                if (item.isCover || dragFrom == null) return;
                e.preventDefault();
                moveSpread(dragFrom, item.leftIdx);
                setDragFrom(null);
                setDropTarget(null);
              }}
              onDragEnd={() => {
                setDragFrom(null);
                setDropTarget(null);
              }}
              onContextMenu={(e) => {
                if (item.isCover) return;
                e.preventDefault();
                e.stopPropagation();
                setMenu({ x: e.clientX, y: e.clientY, item });
              }}
            >
              <div
                className={`${dragging ? "opacity-40" : ""} ${isTarget ? "outline-2 outline-dashed outline-[#7c3aed] outline-offset-2" : ""} ${!item.isCover ? "cursor-grab active:cursor-grabbing" : ""}`}
                style={{ width: item.type === "spread" ? spreadW : singleW, height: h }}
              >
                {item.type === "spread" ? (
                  <div
                    onClick={() => switchPage(item.leftIdx)}
                    className={`w-full h-full flex overflow-hidden bg-white ${active ? "border-2 border-[#222] shadow-[2px_2px_0_#222]" : "border-2 border-[#222]/30 hover:border-[#222]/60"} cursor-pointer transition-all`}
                  >
                    <div
                      className="w-1/2 h-full bg-white flex items-center justify-center overflow-hidden"
                      style={{ borderRight: "1px dashed #222" }}
                    >
                      {left?.thumbnailUrl ? (
                        <img
                          src={left.thumbnailUrl}
                          alt=""
                          className="w-full h-full object-cover"
                          style={{ objectPosition: "left" }}
                        />
                      ) : (
                        <span className="font-mono text-[7px] font-bold text-[#999]">{item.leftIdx + 1}</span>
                      )}
                    </div>
                    <div className="w-1/2 h-full bg-white flex items-center justify-center overflow-hidden">
                      {right?.thumbnailUrl || left?.thumbnailUrl ? (
                        <img
                          src={right?.thumbnailUrl || left?.thumbnailUrl || ""}
                          alt=""
                          className="w-full h-full object-cover"
                          style={{ objectPosition: "right" }}
                        />
                      ) : (
                        <span className="font-mono text-[7px] font-bold text-[#999]">{item.rightIdx + 1}</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <PageThumb
                    thumb={left?.thumbnailUrl}
                    idx={item.idx}
                    active={active}
                    onClick={() => switchPage(item.idx)}
                  />
                )}
                {!item.isCover && !locked && (
                  <button
                    onClick={() => handleDelete(item)}
                    className="absolute -top-1 -right-1 w-6 h-6 sm:w-4 sm:h-4 flex items-center justify-center bg-[#B54843] text-white rounded-full text-[8px] leading-none font-bold opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity z-10 hover:scale-110"
                  >
                    ×
                  </button>
                )}
                {locked && (
                  <div
                    title="View only"
                    className="absolute -top-1 -right-1 w-6 h-6 sm:w-4 sm:h-4 flex items-center justify-center bg-[#222] text-white rounded-full z-10"
                  >
                    <Lock size={10} strokeWidth={3} className="sm:w-2 sm:h-2" />
                  </div>
                )}
                {active && <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#222]" />}
              </div>
              <span
                className={`font-mono text-[7px] font-bold tracking-widest ${active ? "text-[#222]" : "text-[#999]"}`}
              >
                {item.idx + 1}
                {item.type === "spread" ? `/${item.rightIdx + 1}` : ""}
                {locked ? " · viewonly" : ""}
              </span>
            </div>
          );
        })}
        <button
          onClick={addPage}
          className="shrink-0 flex items-center justify-center border-2 border-dashed border-[#222]/40 rounded-md hover:border-[#222] hover:bg-[#e8e6e0] transition-all"
          style={{ width: singleW, height: h }}
        >
          <span className="text-lg leading-none text-[#666]">+</span>
        </button>
      </div>
      {menu && (
        <div ref={menuRef} className="fixed z-[9999] min-w-[160px]" style={{ left: menu.x, top: menu.y }}>
          <div className="bg-[#FFF7D6] rounded-[10px] border-[3px] border-[#222] shadow-[4px_4px_0_#222] overflow-hidden py-1">
            {menuItems.map((m) => (
              <button
                key={m.label}
                disabled={m.disabled}
                onClick={() => {
                  if (m.disabled) return;
                  m.fn();
                  setMenu(null);
                }}
                className="w-full text-left px-4 py-2 font-mono text-[10px] font-bold tracking-wider hover:bg-[#e8e6e0] transition-colors text-[#222] disabled:opacity-40 disabled:hover:bg-transparent"
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
