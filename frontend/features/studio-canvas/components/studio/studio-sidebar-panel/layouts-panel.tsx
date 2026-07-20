"use client";

import { useTranslation } from "react-i18next";
import { useCanvasStore } from "../../../hooks/useCanvasState";
import { LAYOUT_LIST, SPREAD_LAYOUT_LIST } from "../../../types/layout";
import type { LayoutSlot } from "../../../types/layout";
import * as fabric from "fabric";
import { isFrameObject, clearLayoutFrames, showGuides, placePhotoInFrame, applyFrameClip, enforceZLayers } from "../../../lib/layout-engine";

type AnyLayout = { layoutId: string; name: string; slots: LayoutSlot[] };

function LayoutThumbnail({ layout, isSpread }: { layout: AnyLayout; isSpread?: boolean }) {
  const slots = layout.slots;
  const pageW = isSpread ? 420 : 210;
  const pageH = isSpread ? 297 : 297;
  const thumbW = 110;
  const thumbH = Math.round((pageH / pageW) * thumbW);
  const scale = thumbW / pageW;

  return (
    <div className="relative bg-white border border-[#ccc]" style={{ width: thumbW, height: thumbH }}>
      {slots.map((slot, i) => {
        const photoSlots = slots.filter((s) => s.role === "photo");
        const isBg = slot.role === "background";
        const label = isBg ? null : photoSlots.indexOf(slot) + 1;

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: slot.left * scale,
              top: slot.top * scale,
              width: slot.width * scale,
              height: slot.height * scale,
              border: isBg ? "1px dashed #aaa" : "1.5px dashed #666",
              background: isBg ? "repeating-linear-gradient(45deg, #f5f5f5, #f5f5f5 3px, #eee 3px, #eee 6px)" : "#e8e6e0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {label != null && (
              <span className="font-mono text-[7px] text-[#999] font-bold">{label}</span>
            )}
          </div>
        );
      })}
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
    const pageW = (canvas.getWidth() ?? 840) / 2;
    const isSingleSide = !spreadMode && viewMode !== "spread";
    const onSide = (o: any) => {
      if (!isSingleSide) return true;
      return viewMode === "left" ? (o.left || 0) < pageW : (o.left || 0) >= pageW;
    };
    
    const photos = canvas.getObjects()
      .filter((o: any) => o.customProperties?.layer === "photo" && onSide(o))
      .sort((a: any, b: any) => (a.top || 0) - (b.top || 0) || (a.left || 0) - (b.left || 0));
    
    canvas.getObjects().filter((o: any) => isFrameObject(o) && onSide(o)).forEach((o) => canvas.remove(o));
    
    const targetIdx = isSingleSide && viewMode === "right" ? activePageIndex + 1 : activePageIndex;
    useCanvasStore.getState().setPage(targetIdx, { layout });
    useCanvasStore.setState({ activeLayout: layout });
    
    const offsetX = viewMode === "right" && !spreadMode ? pageW : 0;
    showGuides(canvas, layout, offsetX, (o) => !isSingleSide || onSide(o));
    
    const frames = canvas.getObjects()
      .filter((o: any) => o.customProperties?.layer === "frame" && o.customProperties?.layoutFrame)
      .sort((a: any, b: any) => (a.top || 0) - (b.top || 0) || (a.left || 0) - (b.left || 0));
    
    photos.forEach((photo, i) => {
      if (i < frames.length) {
        const frame = frames[i];
        placePhotoInFrame(frame, photo as fabric.FabricImage);
        applyFrameClip(frame, photo as fabric.FabricImage);
      } else {
        canvas.remove(photo);
      }
    });
    
    enforceZLayers(canvas);
    canvas.renderAll();
  };

  const handleClear = () => {
    if (!canvas) return;
    
    pushUndo();
    const activePageIndex = useCanvasStore.getState().activePageIndex;
    const pageW = (canvas.getWidth() ?? 840) / 2;
    const isSingleSide = !spreadMode && viewMode !== "spread";
    const onSide = (o: any) => {
      if (!isSingleSide) return true;
      return viewMode === "left" ? (o.left || 0) < pageW : (o.left || 0) >= pageW;
    };
    
    clearLayoutFrames(canvas, (o) => !isSingleSide || onSide(o));
    const targetIdx = isSingleSide && viewMode === "right" ? activePageIndex + 1 : activePageIndex;
    useCanvasStore.getState().setPage(targetIdx, { layout: null });
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
