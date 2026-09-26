"use client";

import { useState, useRef, useEffect } from "react";
import { Undo2, Redo2, Type, Trash2, Eye } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useCanvasStore } from "../../hooks/useCanvasState";
import { useAutoSave, useAutoSaveLoop } from "../../hooks/useAutoSave";
import { usePageManager } from "../../hooks/usePageManager";
import { useToast } from "@/components/toast";
import { apiFetch } from "@/lib/api.fetch";
import { neoBtnSm, neoBtnPrimarySm } from "@/lib/styles";
import { ZOOM_LEVELS, FONTS } from "../../types";
import { isCoverPage, serializeCanvasState } from "../../lib/layout-engine";
import { applyUndo, applyRedo } from "../../lib/history";
import { isFrameObject } from "../../lib/fabric-core";
import { deleteSelectedObjects } from "../../lib/frames";
import { useAutoFill } from "../../hooks/useAutoFill";
import * as fabric from "fabric";

function useTextPresets(t: any) {
  return [
    { label: t("customer.studio.textPresets.title"), fontSize: 36, fontWeight: "bold", fontFamily: FONTS[0].css },
    { label: t("customer.studio.textPresets.heading"), fontSize: 28, fontWeight: "bold", fontFamily: FONTS[0].css },
    { label: t("customer.studio.textPresets.subheading"), fontSize: 22, fontWeight: "600", fontFamily: FONTS[3].css },
    { label: t("customer.studio.textPresets.body"), fontSize: 16, fontWeight: "normal", fontFamily: FONTS[3].css },
    { label: t("customer.studio.textPresets.caption"), fontSize: 12, fontWeight: "normal", fontFamily: FONTS[3].css },
  ];
}

function ToolBtn({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick?: () => void }) {
  return (
    <div className="relative group">
      <button
        onClick={onClick}
        className="p-1.5 hover:bg-[#FFF7D6] rounded-[6px] border-2 border-transparent hover:border-[#222] transition-all text-[#222]"
      >
        {icon}
      </button>
      <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none">
        <div className="bg-[#222] text-white font-mono text-[8px] font-bold tracking-widest uppercase px-2 py-1 rounded-md whitespace-nowrap">
          {label}
        </div>
      </div>
    </div>
  );
}

function DelBtn({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick?: () => void }) {
  return (
    <div className="relative group">
      <button
        onClick={onClick}
        className="p-1.5 hover:bg-[#B54843]/10 hover:text-[#B54843] rounded-[6px] border-2 border-transparent hover:border-[#B54843] transition-all"
      >
        {icon}
      </button>
      <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none">
        <div className="bg-[#222] text-white font-mono text-[8px] font-bold tracking-widest uppercase px-2 py-1 rounded-md whitespace-nowrap">
          {label}
        </div>
      </div>
    </div>
  );
}

type Props = {
  hideOrder?: boolean;
  isAdmin?: boolean;
};

export function StudioTopbar({ hideOrder }: Props = {}) {
  const { t } = useTranslation();
  const TEXT_PRESETS = useTextPresets(t);
  const canvas = useCanvasStore((s) => s.canvas);
  const undoStack = useCanvasStore((s) => s.undoStack);
  const redoStack = useCanvasStore((s) => s.redoStack);
  const pushUndo = useCanvasStore((s) => s.pushUndo);
  const clearRedo = useCanvasStore((s) => s.clearRedo);
  const bookMeta = useCanvasStore((s) => s.bookMeta);
  const setBookMeta = useCanvasStore((s) => s.setBookMeta);
  const zoomIndex = useCanvasStore((s) => s.zoomIndex);
  const setZoomIndex = useCanvasStore((s) => s.setZoomIndex);
  const viewMode = useCanvasStore((s) => s.viewMode);
  useCanvasStore((s) => s.selectionVersion);
  const { saveFull } = useAutoSave();
  const { saveCurrentPage } = usePageManager();
  const { showToast } = useToast();
  const { data: session } = useSession();
  const router = useRouter();
  const token = (session as any)?.accessToken;
  useAutoSaveLoop(token);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingTitle && titleRef.current) {
      titleRef.current.focus();
      titleRef.current.select();
    }
  }, [editingTitle]);

  const commitTitle = () => {
    const t = titleDraft.trim();
    if (t) setBookMeta({ title: t });
    setEditingTitle(false);
  };

  const iconSize = 14;

  const handleUndo = () => {
    if (!canvas || undoStack.length === 0) return;
    const s = useCanvasStore.getState();
    applyUndo(
      canvas,
      s.popUndo,
      s.pushRedo,
      { pages: s.pages, activePageIndex: s.activePageIndex, activeLayout: s.activeLayout, viewMode: s.viewMode },
      s.setPage,
      s.setPages,
      s.setActivePageIndex,
      s.setActiveLayout,
      s.setViewMode,
      s.pages.length,
    );
  };

  const handleRedo = () => {
    if (!canvas || redoStack.length === 0) return;
    const s = useCanvasStore.getState();
    applyRedo(
      canvas,
      s.popRedo,
      s.pushUndo,
      s.pushUndoPages,
      s.setPage,
      s.setPages,
      s.setActivePageIndex,
      s.setActiveLayout,
      s.setViewMode,
      s.pages.length,
    );
  };

  const handleDelete = () => {
    if (!canvas) return;
    if (!canvas.getActiveObjects().length) return;
    pushUndo();
    // its children -- route through the group-aware delete instead.
    deleteSelectedObjects(canvas);
    clearRedo();
  };

  const handleZoom = (dir: 1 | -1) => {
    const idx = Math.max(0, Math.min(ZOOM_LEVELS.length - 1, zoomIndex + dir));
    setZoomIndex(idx);
  };

  const handleAddText = (preset?: (typeof TEXT_PRESETS)[number]) => {
    if (!canvas) return;
    pushUndo();
    const id = `text-${Date.now()}`;
    const st = useCanvasStore.getState();
    const cw = canvas.getWidth() || 840;
    const halfX =
      !isCoverPage(st.activePageIndex, st.pages.length) && st.viewMode === "right" ? cw / 2 : 0;
    const text = new fabric.IText(preset ? preset.label : t("customer.studio.doubleClickEdit"), {
      left: halfX + 100,
      top: 100,
      fontSize: preset?.fontSize || 24,
      fontWeight: preset?.fontWeight || "normal",
      fontFamily: preset?.fontFamily || FONTS[0].css,
      customProperties: { z: Date.now(), layer: "element" },
    } as any);
    (text as any)._selId = id;
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
    clearRedo();
  };

  const handleFlipH = () => {
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (active) {
      pushUndo();
      active.set("flipX", !active.flipX);
      active.setCoords();
      if (isFrameObject(active)) {
        const photo = canvas.getObjects().find((p: any) => p.customProperties?.frameId === (active as any)._selId);
        if (photo) {
          photo.set("flipX", !(photo as any).flipX);
          photo.setCoords();
        }
      }
      canvas.renderAll();
      clearRedo();
    }
  };

  const handleFlipV = () => {
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (active) {
      pushUndo();
      active.set("flipY", !active.flipY);
      active.setCoords();
      if (isFrameObject(active)) {
        const photo = canvas.getObjects().find((p: any) => p.customProperties?.frameId === (active as any)._selId);
        if (photo) {
          photo.set("flipY", !(photo as any).flipY);
          photo.setCoords();
        }
      }
      canvas.renderAll();
      clearRedo();
    }
  };

  const { autoFill: handleAutoFill } = useAutoFill(token);

  return (
      <div
        className="h-12 flex items-center px-4 sm:px-5 gap-2 bg-[#FFF7D6] shrink-0 border-b-[3px] border-[#222] overflow-x-auto overflow-y-hidden overscroll-x-contain [&>*]:shrink-0"
        style={{ scrollbarWidth: "none" }}
      >
      {editingTitle ? (
        <input
          ref={titleRef}
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitTitle();
            if (e.key === "Escape") setEditingTitle(false);
          }}
          className="font-bold text-sm bg-transparent border-b-2 border-[#222] outline-none w-40 shadow-none!"
        />
      ) : (
        <span
          onClick={() => {
            setTitleDraft(bookMeta.title);
            setEditingTitle(true);
          }}
          className="font-bold text-sm mr-2 cursor-pointer hover:opacity-60 transition-opacity"
        >
          {bookMeta.title}
        </span>
      )}

      <div className="hidden sm:contents">
      <div className="w-[3px] h-4 bg-[#222] rounded-full" />
      <ToolBtn icon={<Undo2 size={iconSize} />} label={t("customer.studio.undo")} onClick={handleUndo} />
      <ToolBtn icon={<Redo2 size={iconSize} />} label={t("customer.studio.redo")} onClick={handleRedo} />
      <div className="w-[3px] h-4 bg-[#222] rounded-full" />
      <div className="relative group">
        <button
          onClick={() => handleAddText()}
          className="p-1.5 hover:bg-[#FFF7D6] rounded-[6px] border-2 border-transparent hover:border-[#222] transition-all text-[#222]"
        >
          <Type size={iconSize} />
        </button>
        <div className="absolute top-full left-0 pt-2 z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none group-hover:pointer-events-auto">
          <div className="bg-[#FFF7D6] rounded-lg shadow-[4px_4px_0_#222] border-2 border-[#222] overflow-hidden min-w-[160px]">
            {TEXT_PRESETS.map((preset, i) => (
              <button
                key={preset.label}
                onClick={() => handleAddText(preset)}
                className={`w-full px-4 py-2.5 text-left hover:bg-[#e8e6e0] transition-colors flex items-center gap-3 ${i < TEXT_PRESETS.length - 1 ? "border-b border-[#222]/10" : ""}`}
              >
                <span
                  style={{
                    fontFamily: preset.fontFamily,
                    fontSize: Math.min(preset.fontSize / 3, 14),
                    fontWeight: preset.fontWeight as any,
                  }}
                  className="text-[#222]"
                >
                  {preset.label}
                </span>
                <span className="font-mono text-[8px] font-bold tracking-widest text-[#999] ml-auto">
                  {preset.fontSize}px
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="w-[3px] h-4 bg-[#222] rounded-full" />
      <DelBtn icon={<Trash2 size={iconSize} />} label={t("customer.studio.deleteBtn")} onClick={handleDelete} />
      <div className="w-[3px] h-4 bg-[#222] rounded-full" />
      <ToolBtn
        icon={
          <svg
            width={iconSize}
            height={iconSize}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M8 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h3" />
            <path d="M16 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3" />
            <path d="M12 20v2" />
            <path d="M12 14v-4" />
            <path d="M12 8V6" />
            <path d="M9 13l3-3 3 3" />
            <path d="M9 11l3 3 3-3" />
          </svg>
        }
        label={t("customer.studio.flipH")}
        onClick={handleFlipH}
      />
      <ToolBtn
        icon={
          <svg
            width={iconSize}
            height={iconSize}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="4" y="2" width="16" height="20" rx="2" />
            <path d="M12 22v-4" />
            <path d="M12 10V6" />
            <path d="M9 13l3-3 3 3" />
            <path d="M9 15l3 3 3-3" />
          </svg>
        }
        label={t("customer.studio.flipV")}
        onClick={handleFlipV}
      />
      </div>
      <div className="ml-auto flex items-center gap-2">
        <div className="flex items-center rounded-lg border-2 border-[#222] shadow-[2px_2px_0_#222] overflow-hidden">
          {(["left", "spread", "right"] as const).map((v) => (
            <button
              key={v}
              onClick={() => {
                const s = useCanvasStore.getState();
                saveCurrentPage();
                s.setViewMode(v);
                const spread = v === "spread" && !isCoverPage(s.activePageIndex, s.pages.length);
                const target = spread
                  ? (s.pages[s.activePageIndex]?.spreadLayout ?? null)
                  : v === "right"
                    ? (s.pages[Math.min(s.activePageIndex + 1, s.pages.length - 1)]?.layout ?? null)
                    : (s.pages[s.activePageIndex]?.layout ?? null);
                useCanvasStore.setState({ activeLayout: target });
              }}
              disabled={
                useCanvasStore.getState().pages.length <= 2 ||
                useCanvasStore.getState().activePageIndex === 0 ||
                useCanvasStore.getState().activePageIndex === useCanvasStore.getState().pages.length - 1
              }
              className={`px-2 py-1.5 font-mono text-[10px] font-bold tracking-widest transition-colors ${viewMode === v ? "bg-[#222] text-white" : "bg-white hover:bg-[#e8e6e0] text-[#666]"} ${v === "right" ? "" : "border-r-2 border-[#222]"} disabled:opacity-30 disabled:cursor-not-allowed`}
            >
              {v === "left" ? "L" : v === "right" ? "R" : "2P"}
            </button>
          ))}
        </div>
        <div className="hidden sm:contents">
        <div className="flex items-center rounded-lg border-2 border-[#222] shadow-[2px_2px_0_#222] overflow-hidden">
          <button
            onClick={() => handleZoom(-1)}
            className="px-2 py-1.5 font-mono text-xs font-bold hover:bg-[#e8e6e0] transition-colors"
          >
            -
          </button>
          <button className="px-2.5 py-1.5 font-mono text-[10px] font-bold tracking-widest border-x-[2px] border-[#222] flex items-center gap-1 hover:bg-[#e8e6e0] transition-colors">
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            {Math.round(ZOOM_LEVELS[zoomIndex] * 100)}%
          </button>
          <button
            onClick={() => handleZoom(1)}
            className="px-2 py-1.5 font-mono text-xs font-bold hover:bg-[#e8e6e0] transition-colors"
          >
            +
          </button>
        </div>
        <button
          disabled
          onClick={() => router.push(`/studio/preview?id=${useCanvasStore.getState().bookMeta.id ?? ""}`)}
          className={`${neoBtnSm} flex items-center gap-1.5 font-mono text-[10px] font-bold tracking-widest uppercase px-3.5 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          <Eye size={11} /> {t("customer.studio.preview")}
        </button>
        <button
          onClick={handleAutoFill}
          className={`${neoBtnPrimarySm} flex items-center gap-1.5 font-mono text-[10px] font-bold tracking-widest uppercase px-3.5 py-1.5`}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
          {t("customer.studio.autoFill")}
        </button>
        </div>
        <button
            onClick={async () => {
              if (editingTitle) commitTitle();
              const r = await saveFull(token);
              if (r.ok && r.id && token) {
                try {
                  const s = useCanvasStore.getState();
                  const meta = s.bookMeta;
                  await apiFetch(`/api/cart/item/${r.id}`, token, {
                    method: "PATCH",
                    body: JSON.stringify({
                      paperSize: meta.format,
                      paper: meta.paper,
                    }),
                  });
                } catch {}
              }
            showToast(
              r.ok ? t("customer.studio.saveSuccess") : `${t("customer.studio.saveFailed")}: ${r.error}`,
              r.ok ? "success" : "error",
            );
          }}
          className={`${neoBtnPrimarySm} flex items-center gap-1.5 font-mono text-[10px] font-bold tracking-widest uppercase px-3.5 py-1.5`}
        >
          {t("customer.studio.save")} Journal
        </button>
        {!hideOrder && (
          <button
            onClick={async () => {
              try {
                if (editingTitle) commitTitle();
                if (!token) {
                  showToast("Not authenticated", "error");
                  return;
                }
                const c = useCanvasStore.getState().canvas;
                if (!c) {
                  showToast("No canvas", "error");
                  return;
                }
                const activeIdx = useCanvasStore.getState().activePageIndex;
                useCanvasStore.getState().setPage(activeIdx, { canvasJson: serializeCanvasState(c) });
                let thumb: string | null = null;
                try {
                  thumb = c.toDataURL({ format: "jpeg", quality: 0.4, multiplier: 0.5 });
                } catch {}
                if (thumb) useCanvasStore.getState().setPage(activeIdx, { thumbnailUrl: thumb });
                const s = useCanvasStore.getState();
                const meta = s.bookMeta;

                const item = {
                  bookId: meta.id,
                  cover: "softcover",
                  paperSize: meta.format,
                  paper: meta.paper || "matte",
                  quantity: 1,
                };

                try {
                  await apiFetch("/api/cart/item", token, {
                    method: "POST",
                    body: JSON.stringify(item),
                  });
                  showToast(t("customer.studio.addedToCart") || "Added to cart", "success");
                } catch {
                  showToast("Failed to add to cart", "error");
                }
              } catch (e) {
                console.error("[addToCart]", e);
                showToast("Failed to add to cart", "error");
              }
            }}
            className={`${neoBtnSm} flex items-center gap-1.5 font-mono text-[10px] font-bold tracking-widest uppercase px-3.5 py-1.5 !bg-[#D4A574]`}
          >
            {t("customer.studio.orderPrint")}
          </button>
        )}
      </div>
    </div>
  );
}
