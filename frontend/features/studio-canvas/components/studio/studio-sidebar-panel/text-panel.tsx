"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Search, X } from "lucide-react";
import * as fabric from "fabric";
import { useCanvasStore } from "../../../hooks/useCanvasState";
import { FONTS } from "../../../types";
import { ensureFontFamily } from "../../../lib/fonts";
import { isCoverPage, isPageLocked } from "../../../lib/layout-engine";
import { FontPreview } from "../font-preview";

const PAGE_SIZE = 48;

function addText(fontFamily: string, fontName: string, defaultLabel: string) {
  const st = useCanvasStore.getState();
  const c = st.canvas;
  if (!c || isPageLocked(st.pages, st.activePageIndex)) return;
  st.pushUndo();
  const cw = c.getWidth() || 840;
  const halfX = !isCoverPage(st.activePageIndex, st.pages.length) && st.viewMode === "right" ? cw / 2 : 0;
  const text = new fabric.IText(defaultLabel, {
    left: halfX + 100,
    top: 100,
    fontSize: 28,
    fontFamily,
    customProperties: { z: Date.now(), layer: "element" },
  } as any);
  (text as any)._selId = `text-${Date.now()}`;
  c.add(text);
  c.setActiveObject(text);
  c.renderAll();
  st.clearRedo();
  void ensureFontFamily(fontName).then(() => c.renderAll());
}

export function TextPanel() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const defaultLabel = t("customer.studio.doubleClickEdit");
  const q = search.toLowerCase();
  const filtered = FONTS.filter((f) => !q || f.name.toLowerCase().includes(q));

  // cursor-style paging: render one page, load the next as the sentinel scrolls in.
  const [shown, setShown] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => setShown(PAGE_SIZE), [q]);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || shown >= filtered.length) return;
    if (typeof IntersectionObserver === "undefined") {
      setShown(filtered.length);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setShown((s) => Math.min(s + PAGE_SIZE, filtered.length));
      },
      { rootMargin: "400px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [shown, filtered.length]);
  const visible = filtered.slice(0, shown);

  return (
    <div className="p-4">
      <p className="font-mono text-[9px] font-bold tracking-widest uppercase text-[#666] mb-3">
        {t("customer.studio.text")}
      </p>
      <div className="flex items-center gap-1 bg-white rounded border-2 border-[#222] px-2 mb-2">
        <Search size={11} className="text-[#999] shrink-0" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("customer.studio.searchFonts")}
          className="flex-1 text-[10px] font-bold py-1.5 placeholder:text-[#999] focus:outline-none bg-transparent border-none! shadow-none!"
        />
        {search && (
          <button onClick={() => setSearch("")} className="opacity-40 hover:opacity-70">
            <X size={10} />
          </button>
        )}
      </div>
      <button
        onClick={() => addText(FONTS[0].css, FONTS[0].name, defaultLabel)}
        className="w-full mb-3 px-4 py-2.5 rounded-lg border-2 border-[#222] bg-[#222] text-white shadow-[2px_2px_0_#222] hover:translate-x-px hover:translate-y-px hover:shadow-[1px_1px_0_#222] transition-all flex items-center justify-center gap-2 font-bold text-sm"
      >
        <span className="text-base leading-none">T</span>
        {t("customer.studio.addTextBox")}
      </button>
      <div className="flex flex-col gap-2">
        {visible.map((f) => (
          <button
            key={f.name}
            onClick={() => addText(f.css, f.name, defaultLabel)}
            className="w-full px-3 py-2.5 text-left bg-white rounded-lg border-2 border-[#222]/10 hover:border-[#222] hover:shadow-[2px_2px_0_#222] transition-all"
          >
            <FontPreview name={f.name} css={f.css} className="block text-[20px] leading-tight text-[#222] truncate" />
            <FontPreview
              name={f.name}
              css={f.css}
              className="block text-[11px] text-[#999] truncate"
            >
              The quick brown fox 123
            </FontPreview>
          </button>
        ))}
      </div>
      {shown < filtered.length && (
        <div ref={sentinelRef} className="py-3 text-center text-[10px] font-bold text-[#999] animate-pulse">
          {visible.length} / {filtered.length}…
        </div>
      )}
      {filtered.length === 0 && <p className="text-[10px] text-[#999]">{t("customer.studio.noMatch")}</p>}
    </div>
  );
}
