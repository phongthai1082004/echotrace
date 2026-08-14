"use client";

import { useTranslation } from "react-i18next";
import { useCanvasStore } from "../../../hooks/useCanvasState";
import { LAYOUT_LIST, SPREAD_LAYOUT_LIST } from "../../../types/layout";
import type { LayoutSlot } from "../../../types/layout";
import * as fabric from "fabric";
import { clearLayoutFrames, showGuides, placePhotoInFrame, applyFrameClip, enforceZLayers } from "../../../lib/layout-engine";

type AnyLayout = { layoutId: string; name: string; slots: LayoutSlot[] };

function LayoutThumbnail({ layout, isSpread }: { layout: AnyLayout; isSpread?: boolean }) {
  const slots = layout.slots;
  const thumbW = 110;
  // schematic: always the design canvas shape (210×297 or 420×297) so slots never overflow the box
  const thumbH = Math.round(thumbW * (isSpread ? 297 / 420 : 297 / 210));
  const scale = thumbW / (isSpread ? 420 : 210);

  return (
    <div className="relative bg-white border border-[#ccc]" style={{ width: thumbW, height: thumbH }}>
      {slots.map((slot, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: slot.left * scale,
            top: slot.top * scale,
            width: slot.width * scale,
            height: slot.height * scale,
            border: "1.5px dashed #666",
            background: "#e8e6e0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span className="font-mono text-[7px] text-[#999] font-bold">{i + 1}</span>
        </div>
      ))}
    </div>
  );
}

export function LayoutsPanel() {
  const { t } = useTranslation();
  const canvas = useCanvasStore((s) => s.canvas);
  const activeLayout = useCanvasStore((s) => s.activeLayout);
  const pushUndo = useCanvasStore((s) => s.pushUndo);
  const spreadMode = useCanvasStore((s) => {
    const n = s.pages.length; const idx = s.activePageIndex;
    return s.viewMode === "spread" && idx !== 0 && idx !== n - 1 && n > 2;
  });
  const viewMode = useCanvasStore((s) => s.viewMode);
  const layouts = spreadMode ? SPREAD_LAYOUT_LIST : LAYOUT_LIST;

  const handleSelect = (layout: AnyLayout) => {
    if (!canvas) return;

    pushUndo();
    const activePageIndex = useCanvasStore.getState().activePageIndex;
    const pages = useCanvasStore.getState().pages;
    const pageW = (canvas.getWidth() ?? 840) / 2;
    const isSingleSide = !spreadMode && viewMode !== "spread";
    const kind: "single" | "spread" = spreadMode ? "spread" : "single";
    // one page's pixel width in the current format (cover canvas is a single page wide)
    const pageWidth = spreadMode ? pageW : (viewMode === "spread" ? (canvas.getWidth() ?? 840) : pageW);
    const onSide = (o: any) => {
      if (!isSingleSide) return true;
      return viewMode === "left" ? (o.left || 0) < pageW : (o.left || 0) >= pageW;
    };

    // gather every photo on the target side, then replace all layout frames there with the new layout
    const photos = canvas.getObjects()
      .filter((o: any) => o.customProperties?.layer === "photo" && onSide(o))
      .sort((a: any, b: any) => (a.top || 0) - (b.top || 0) || (a.left || 0) - (b.left || 0));

    // Clear ALL old layout frames from canvas (not just current side)
    // This ensures complete cleanup when switching between 2P/R/L modes
    clearLayoutFrames(canvas);

    // Update page state: clear all layout data and set new layout only for target pages
    const targetIdx = isSingleSide && viewMode === "right" ? activePageIndex + 1 : activePageIndex;
    
    // Clear layout/spreadLayout from all pages
    pages.forEach((_, i) => {
      useCanvasStore.getState().setPage(i, { layout: null, spreadLayout: null });
    });

    // Set new layout on target page(s)
    if (kind === "spread") {
      useCanvasStore.getState().setPage(targetIdx, { spreadLayout: layout, layout: null });
      if (targetIdx + 1 < pages.length) useCanvasStore.getState().setPage(targetIdx + 1, { spreadLayout: layout, layout: null });
    } else {
      useCanvasStore.getState().setPage(targetIdx, { layout, spreadLayout: null });
    }
    useCanvasStore.setState({ activeLayout: layout });

    const offsetX = viewMode === "right" && !spreadMode ? pageW : 0;
    showGuides(canvas, layout, offsetX, (o) => !isSingleSide || onSide(o), kind, pageWidth);

    const frames = canvas.getObjects()
      .filter((o: any) => o.customProperties?.layer === "frame" && o.customProperties?.layoutFrame && onSide(o))
      .sort((a: any, b: any) => (a.top || 0) - (b.top || 0) || (a.left || 0) - (b.left || 0));

    photos.forEach((photo, i) => {
      if (i < frames.length) {
        placePhotoInFrame(frames[i], photo as fabric.FabricImage);
        applyFrameClip(frames[i], photo as fabric.FabricImage);
      }
    });

    enforceZLayers(canvas);
    canvas.renderAll();
  };

  const handleClear = () => {
    if (!canvas) return;

    pushUndo();
    const pages = useCanvasStore.getState().pages;
    
    // Clear ALL layout frames from canvas
    clearLayoutFrames(canvas);

    // Clear layout/spreadLayout from all pages
    pages.forEach((_, i) => {
      useCanvasStore.getState().setPage(i, { layout: null, spreadLayout: null });
    });

    useCanvasStore.setState({ activeLayout: null });
    canvas.renderAll();
  };

  return (
    <div className="p-4">
      <p className="font-mono text-[9px] font-bold tracking-widest uppercase mb-3 text-[#666]">{t("customer.studio.layouts")}</p>
      <div className="flex flex-col gap-3">
        {layouts.map((layout: AnyLayout) => (
          <button
            key={layout.layoutId}
            onClick={() => handleSelect(layout)}
            className={`flex flex-col items-center gap-1.5 p-2 rounded-[6px] border-2 transition-all text-center ${
              activeLayout?.layoutId === layout.layoutId
                ? "border-[#222] shadow-[2px_2px_0_#222] bg-[#FFF7D6]"
                : "border-[#ccc] hover:border-[#222] hover:shadow-[1px_1px_0_#222]"
            }`}
          >
            <LayoutThumbnail layout={layout} isSpread={spreadMode} />
            <span className="font-mono text-[8px] font-bold tracking-widest uppercase text-[#666]">{layout.name}</span>
          </button>
        ))}
      </div>
      {activeLayout && (
        <button
          onClick={handleClear}
          className="mt-4 w-full font-mono text-[8px] font-bold tracking-widest uppercase px-2 py-1.5 rounded-md border-2 border-[#ccc] hover:border-[#B54843] hover:text-[#B54843] transition-all"
        >
          {t("customer.studio.clearLayout")}
        </button>
      )}
    </div>
  );
}
