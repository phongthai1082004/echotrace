"use client";

import { useState, useRef, useEffect } from "react";
import { Undo2, Redo2, Type, Trash2, Eye } from "lucide-react";
import { useSession } from "next-auth/react";
import { useTranslation } from "react-i18next";
import { useCanvasStore } from "../../hooks/useCanvasState";
import { useAutoSave } from "../../hooks/useAutoSave";
import { useToast } from "@/components/toast";
import { ZOOM_LEVELS, FONTS } from "../../types";
import { applyUndo, applyRedo } from "../../lib/layout-engine";
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
      <button onClick={onClick} className="p-1.5 hover:bg-[#FFF7D6] rounded-[6px] border-2 border-transparent hover:border-[#222] transition-all text-[#222]">{icon}</button>
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
      <button onClick={onClick} className="p-1.5 hover:bg-[#B54843]/10 hover:text-[#B54843] rounded-[6px] border-2 border-transparent hover:border-[#B54843] transition-all">{icon}</button>
      <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none">
        <div className="bg-[#222] text-white font-mono text-[8px] font-bold tracking-widest uppercase px-2 py-1 rounded-md whitespace-nowrap">
          {label}
        </div>
      </div>
    </div>
  );
}

export function StudioTopbar() {
  const { t } = useTranslation();
  const TEXT_PRESETS = useTextPresets(t);
  const canvas = useCanvasStore((s) => s.canvas);
  const undoStack = useCanvasStore((s) => s.undoStack);
  const redoStack = useCanvasStore((s) => s.redoStack);
  const pushUndo = useCanvasStore((s) => s.pushUndo);
  const popUndo = useCanvasStore((s) => s.popUndo);
  const popRedo = useCanvasStore((s) => s.popRedo);
  const pushRedo = useCanvasStore((s) => s.pushRedo);
  const clearRedo = useCanvasStore((s) => s.clearRedo);
  const bookMeta = useCanvasStore((s) => s.bookMeta);
  const setBookMeta = useCanvasStore((s) => s.setBookMeta);
  const zoomIndex = useCanvasStore((s) => s.zoomIndex);
  const setZoomIndex = useCanvasStore((s) => s.setZoomIndex);
  const viewMode = useCanvasStore((s) => s.viewMode);
  const setViewMode = useCanvasStore((s) => s.setViewMode);
  const { saveFull } = useAutoSave();
  const { showToast } = useToast();
  const { data: session } = useSession();
  const token = (session as any)?.accessToken;
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

  const handleUndo = async () => {
    if (!canvas || undoStack.length === 0) return;
    const s = useCanvasStore.getState();
    await applyUndo(canvas, popUndo, pushRedo, s.activePageIndex, s.pages.length, s.setPage, s.setActivePageIndex, s.setAutoPlaced, s.isDraggingPhoto);
  };

  const handleRedo = async () => {
    if (!canvas || redoStack.length === 0) return;
    const s = useCanvasStore.getState();
    await applyRedo(canvas, popRedo, pushUndo, s.activePageIndex, s.pages.length, s.setPage, s.setActivePageIndex, s.setAutoPlaced, s.isDraggingPhoto);
  };

  const handleDelete = () => {
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (active) {
      pushUndo();
      canvas.remove(active);
      canvas.discardActiveObject();
      canvas.renderAll();
      clearRedo();
    }
  };

  const handleZoom = (dir: 1 | -1) => {
    const idx = Math.max(0, Math.min(ZOOM_LEVELS.length - 1, zoomIndex + dir));
    setZoomIndex(idx);
  };

  const handleAddText = (preset?: typeof TEXT_PRESETS[number]) => {
    if (!canvas) return;
    pushUndo();
    const id = `text-${Date.now()}`;
    const text = new fabric.IText(preset ? preset.label : t("customer.studio.doubleClickEdit"), {
      left: 100,
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
      canvas.renderAll();
      clearRedo();
    }
  };

  return (
    <div className="h-12 flex items-center px-5 gap-2 bg-[#FFF7D6] shrink-0 border-b-[3px] border-[#222]">
      {editingTitle ? (
        <input ref={titleRef} value={titleDraft} onChange={(e) => setTitleDraft(e.target.value)}
          onBlur={commitTitle} onKeyDown={(e) => { if (e.key === "Enter") commitTitle(); if (e.key === "Escape") setEditingTitle(false); }}
          className="font-bold text-sm bg-transparent border-b-2 border-[#222] outline-none w-40" />
      ) : (
        <span onClick={() => { setTitleDraft(bookMeta.title); setEditingTitle(true); }}
          className="font-bold text-sm mr-2 cursor-pointer hover:opacity-60 transition-opacity">{bookMeta.title}</span>
      )}

      <div className="w-[3px] h-4 bg-[#222] rounded-full" />
      <ToolBtn icon={<Undo2 size={iconSize} />} label={t("customer.studio.undo")} onClick={handleUndo} />
      <ToolBtn icon={<Redo2 size={iconSize} />} label={t("customer.studio.redo")} onClick={handleRedo} />
      <div className="w-[3px] h-4 bg-[#222] rounded-full" />
      <div className="relative group">
        <button onClick={() => handleAddText()} className="p-1.5 hover:bg-[#FFF7D6] rounded-[6px] border-2 border-transparent hover:border-[#222] transition-all text-[#222]">
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
                <span style={{ fontFamily: preset.fontFamily, fontSize: Math.min(preset.fontSize / 3, 14), fontWeight: preset.fontWeight as any }}
                  className="text-[#222]">{preset.label}</span>
                <span className="font-mono text-[8px] font-bold tracking-widest text-[#999] ml-auto">{preset.fontSize}px</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="w-[3px] h-4 bg-[#222] rounded-full" />
      <DelBtn icon={<Trash2 size={iconSize} />} label={t("customer.studio.deleteBtn")} onClick={handleDelete} />
      <div className="w-[3px] h-4 bg-[#222] rounded-full" />
      <ToolBtn icon={<svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h3"/><path d="M16 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3"/><path d="M12 20v2"/><path d="M12 14v-4"/><path d="M12 8V6"/><path d="M9 13l3-3 3 3"/><path d="M9 11l3 3 3-3"/></svg>} label={t("customer.studio.flipH")} onClick={handleFlipH} />
      <ToolBtn icon={<svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M12 22v-4"/><path d="M12 10V6"/><path d="M9 13l3-3 3 3"/><path d="M9 15l3 3 3-3"/></svg>} label={t("customer.studio.flipV")} onClick={handleFlipV} />
      <div className="ml-auto flex items-center gap-2">
        <div className="flex items-center rounded-lg border-2 border-[#222] shadow-[2px_2px_0_#222] overflow-hidden">
          {(["left", "spread", "right"] as const).map((v) => (
            <button key={v} onClick={() => setViewMode(v)}
              disabled={useCanvasStore.getState().pages.length <= 2 || useCanvasStore.getState().activePageIndex === 0 || useCanvasStore.getState().activePageIndex === useCanvasStore.getState().pages.length - 1}
              className={`px-2 py-1.5 font-mono text-[10px] font-bold tracking-widest transition-colors ${viewMode === v ? "bg-[#222] text-white" : "bg-white hover:bg-[#e8e6e0] text-[#666]"} ${v === "right" ? "" : "border-r-2 border-[#222]"} disabled:opacity-30 disabled:cursor-not-allowed`}>{v === "left" ? "L" : v === "right" ? "R" : "2P"}</button>
          ))}
        </div>
        <div className="flex items-center rounded-lg border-2 border-[#222] shadow-[2px_2px_0_#222] overflow-hidden">
          <button onClick={() => handleZoom(-1)} className="px-2 py-1.5 font-mono text-xs font-bold hover:bg-[#e8e6e0] transition-colors">−</button>
          <button className="px-2.5 py-1.5 font-mono text-[10px] font-bold tracking-widest border-x-[2px] border-[#222] flex items-center gap-1 hover:bg-[#e8e6e0] transition-colors">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            {Math.round(ZOOM_LEVELS[zoomIndex] * 100)}%
          </button>
          <button onClick={() => handleZoom(1)} className="px-2 py-1.5 font-mono text-xs font-bold hover:bg-[#e8e6e0] transition-colors">+</button>
        </div>
        <button className="flex items-center gap-1.5 font-mono text-[10px] font-bold tracking-widest uppercase px-3.5 py-1.5 rounded-lg border-2 border-[#222] shadow-[2px_2px_0_#222] bg-[#FFF7D6] hover:translate-x-px hover:translate-y-[1px] hover:shadow-[1px_1px_0_#222] transition-all"><Eye size={11} /> {t("customer.studio.preview")}</button>
        <button className="flex items-center gap-1.5 font-mono text-[10px] font-bold tracking-widest uppercase px-3.5 py-1.5 rounded-lg border-2 border-[#222] shadow-[2px_2px_0_#222] bg-[#222] text-white hover:translate-x-px hover:translate-y-[1px] hover:shadow-[1px_1px_0_#222] transition-all">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
          {t("customer.studio.autoFill")}
        </button>
        <button onClick={async () => { const r = await saveFull(token); showToast(r.ok ? t("customer.studio.saveSuccess") : `${t("customer.studio.saveFailed")}: ${r.error}`, r.ok ? "success" : "error"); }}
          className="flex items-center gap-1.5 font-mono text-[10px] font-bold tracking-widest uppercase bg-[#222] text-white px-3.5 py-1.5 rounded-lg border-2 border-[#222] shadow-[2px_2px_0_#222] hover:translate-x-px hover:translate-y-[1px] hover:shadow-[1px_1px_0_#222] transition-all">{t("customer.studio.save")} Journal</button>
        <button className="flex items-center gap-1.5 font-mono text-[10px] font-bold tracking-widest uppercase px-3.5 py-1.5 rounded-lg border-2 border-[#222] shadow-[2px_2px_0_#222] bg-[#D4A574] hover:translate-x-px hover:translate-y-[1px] hover:shadow-[1px_1px_0_#222] transition-all">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 17L12 5l6 12"/><path d="M8 13h8"/>
          </svg>
          {t("customer.studio.orderPrint")}
        </button>
      </div>
    </div>
  );
}
