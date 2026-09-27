"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useCanvasStore } from "../../../hooks/useCanvasState";
import * as fabric from "fabric";
import exampleImg from "@/assets/images/example.jpg";
import { FILTER_PRESETS, parseFilterSliders } from "../../../lib/filters";
import { isPageLocked } from "../../../lib/layout-engine";
import { YesNoPopup } from "@/components/yes-no-popup";

function filtersToJSON(filters: fabric.filters.BaseFilter<any, any, any>[]): Record<string, any>[] {
  return filters.map((f) => f.toObject());
}

function injectFiltersToAllPages(filterData: Record<string, any>[]) {
  const s = useCanvasStore.getState();
  const updatedPages = s.pages.map((pg) => {
    if (!pg.canvasJson || pg.locked) return pg; // trang khóa => viewonly, giữ nguyên
    try {
      const parsed = JSON.parse(pg.canvasJson);
      parsed.objects?.forEach((obj: any) => {
        if (obj.customProperties?.layer === "photo") {
          obj.filters = filterData;
        }
      });
      return { ...pg, canvasJson: JSON.stringify(parsed) };
    } catch {
      return pg;
    }
  });
  s.setPages(updatedPages);
}

function applyToAllPhotos(canvas: fabric.Canvas, filters: fabric.filters.BaseFilter<any, any, any>[]) {
  const filterData = filtersToJSON(filters);
  canvas.getObjects().forEach((obj: any) => {
    if (obj.customProperties?.layer === "photo" && typeof obj.applyFilters === "function") {
      obj.filters = filters;
      obj.applyFilters();
    }
  });
  canvas.renderAll();
  injectFiltersToAllPages(filterData);
}

function clearAllPhotos(canvas: fabric.Canvas) {
  canvas.getObjects().forEach((obj: any) => {
    if (obj.customProperties?.layer === "photo" && typeof obj.applyFilters === "function") {
      obj.filters = [];
      obj.applyFilters();
    }
  });
  canvas.renderAll();
  injectFiltersToAllPages([]);
}

export function FilterPanel() {
  const { t } = useTranslation();
  const canvas = useCanvasStore((s) => s.canvas);
  const pushUndo = useCanvasStore((s) => s.pushUndo);
  const incrementSelectionVersion = useCanvasStore((s) => s.incrementSelectionVersion);
  const setFilterSliderValues = useCanvasStore((s) => s.setFilterSliderValues);
  const [confirm, setConfirm] = useState<(typeof FILTER_PRESETS)[number] | null>(null);

  const handleApply = (f: (typeof FILTER_PRESETS)[number]) => {
    if (canvas) setConfirm(f);
  };

  const doApply = (f: (typeof FILTER_PRESETS)[number]) => {
    if (!canvas) return;
    const st = useCanvasStore.getState();
    if (isPageLocked(st.pages, st.activePageIndex)) {
      setConfirm(null);
      return;
    }
    pushUndo();
    applyToAllPhotos(canvas, f.apply());
    const active = canvas.getActiveObject();
    if (active && active.type === "image") {
      setFilterSliderValues(parseFilterSliders((active as fabric.FabricImage).filters || []));
    }
    incrementSelectionVersion();
    setConfirm(null);
  };

  const handleReset = () => {
    if (!canvas) return;
    const st = useCanvasStore.getState();
    if (isPageLocked(st.pages, st.activePageIndex)) return;
    pushUndo();
    clearAllPhotos(canvas);
    setFilterSliderValues({ Brightness: 0, Contrast: 0, Saturation: 0, Vibrance: 0 });
    incrementSelectionVersion();
  };

  return (
    <div className="p-4">
      <p className="font-mono text-[9px] font-bold tracking-widest uppercase mb-3 text-[#666]">
        {t("customer.studio.smartFilters")}
      </p>
      <button
        onClick={handleReset}
        className="w-full flex items-center gap-3 px-3 py-2.5 mb-3 cursor-pointer hover:bg-[#e8e6e0] transition-[background-color] rounded-lg border-2 border-[#222] shadow-[2px_2px_0_#222] hover:translate-x-px hover:translate-y-[1px] hover:shadow-[1px_1px_0_#222] text-left"
      >
        <div className="w-9 h-9 rounded-[4px] border-2 border-[#222] bg-white flex items-center justify-center shrink-0">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#222"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </div>
        <div>
          <p className="font-mono text-[10px] font-bold">{t("customer.studio.resetAll")}</p>
          <p className="font-mono text-[7px] tracking-widest uppercase text-[#999]">
            {t("customer.studio.clearFilters")}
          </p>
        </div>
      </button>
      <div className="grid grid-cols-2 gap-2 mobile-strip">
        {FILTER_PRESETS.map((f) => (
          <button
            key={f.name}
            onClick={() => handleApply(f)}
            className="flex flex-col items-center gap-1.5 px-2 py-2 cursor-pointer hover:bg-[#e8e6e0] transition-[background-color] rounded-lg border-2 border-[#222] shadow-[2px_2px_0_#222] hover:translate-x-px hover:translate-y-[1px] hover:shadow-[1px_1px_0_#222]"
          >
            <div className="w-full h-12 rounded-[3px] border-[2px] border-[#222] overflow-hidden relative">
              <img src={exampleImg.src} alt="" loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover" />
              <div className={`absolute inset-0 bg-gradient-to-br ${f.gradient}`} />
            </div>
            <span className="font-mono text-[7px] font-bold tracking-widest uppercase text-center leading-tight">
              {f.name}
            </span>
          </button>
        ))}
      </div>

      {confirm && (
        <YesNoPopup
          open
          variant="primary"
          onConfirm={() => doApply(confirm)}
          onCancel={() => setConfirm(null)}
          title={t("customer.studio.applyFilter")}
          message={t("customer.studio.applyFilterConfirm", { name: confirm.name })}
          confirmLabel={t("customer.studio.apply")}
        />
      )}
    </div>
  );
}
