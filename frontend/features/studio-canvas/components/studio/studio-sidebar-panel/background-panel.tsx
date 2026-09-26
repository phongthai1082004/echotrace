"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useCanvasStore } from "../../../hooks/useCanvasState";
import { TEXT_COLOR_PRESETS } from "../../../types";

export function BackgroundPanel() {
  const { t } = useTranslation();
  const canvas = useCanvasStore((s) => s.canvas);
  const activePageIndex = useCanvasStore((s) => s.activePageIndex);
  const undoVersion = useCanvasStore((s) => s.undoVersion);

  const bg = canvas?.backgroundColor;
  const current = (typeof bg === "string" && bg) || "#ffffff";
  const [hexInput, setHexInput] = useState(current.replace("#", ""));

  useEffect(() => {
    setHexInput(current.replace("#", ""));
  }, [current, activePageIndex, undoVersion]);

  const apply = (color: string) => {
    const c = useCanvasStore.getState().canvas;
    if (!c) return;
    useCanvasStore.getState().pushUndo();
    c.set({ backgroundColor: color });
    c.renderAll();
    setHexInput(color.replace("#", ""));
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="font-mono text-[9px] font-bold tracking-widest uppercase text-[#666]">
          {t("customer.studio.background")}
        </p>
        <button
          onClick={() => apply("#ffffff")}
          className="font-mono text-[8px] font-bold tracking-widest uppercase px-2 py-1 rounded-md border-2 border-[#222] shadow-[1px_1px_0_#222] hover:translate-x-px hover:translate-y-px hover:shadow-none transition-all bg-white"
        >
          {t("customer.studio.reset")}
        </button>
      </div>
      <div className="grid grid-cols-5 gap-1.5 mb-3">
        {TEXT_COLOR_PRESETS.map((c) => (
          <button
            key={c}
            onClick={() => apply(c)}
            aria-label={c}
            className={`w-full aspect-square rounded-md border-2 transition-all ${current.toUpperCase() === c.toUpperCase() ? "border-[#222] scale-110 shadow" : "border-[#ccc] hover:border-[#999]"}`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-[9px] font-bold text-[#999]">#</span>
        <input
          type="text"
          value={hexInput}
          onChange={(e) => {
            const val = e.target.value.replace(/[^0-9a-fA-F]/g, "").slice(0, 6);
            setHexInput(val);
            if (val.length === 6) apply("#" + val);
          }}
          onBlur={() => {
            if (!/^[0-9a-fA-F]{6}$/.test(hexInput)) setHexInput(current.replace("#", ""));
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          maxLength={6}
          placeholder="FFFFFF"
          className="flex-1 font-mono text-[10px] font-bold p-1.5 rounded-md border-2 border-[#222] bg-white uppercase shadow-none! focus:shadow-none! focus:translate-x-0! focus:translate-y-0!"
        />
        <input
          type="color"
          value={/^#[0-9a-fA-F]{6}$/.test(current) ? current : "#ffffff"}
          onChange={(e) => apply(e.target.value)}
          className="w-8 h-8 p-0.5 rounded-md border-2 border-[#222] bg-white cursor-pointer"
        />
      </div>
    </div>
  );
}
