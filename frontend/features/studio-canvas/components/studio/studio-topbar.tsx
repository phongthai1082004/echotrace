"use client";

import { Undo2, Redo2, Type, Trash2, Eye } from "lucide-react";
import { useCanvasStore } from "../../hooks/useCanvasState";
import { useAutoSave } from "../../hooks/useAutoSave";
import { ZOOM_LEVELS, FONTS } from "../../types";
import * as fabric from "fabric";

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
  const canvas = useCanvasStore((s) => s.canvas);
  const undoStack = useCanvasStore((s) => s.undoStack);
  const redoStack = useCanvasStore((s) => s.redoStack);
  const pushUndo = useCanvasStore((s) => s.pushUndo);
  const popUndo = useCanvasStore((s) => s.popUndo);
  const popRedo = useCanvasStore((s) => s.popRedo);
  const pushRedo = useCanvasStore((s) => s.pushRedo);
  const clearRedo = useCanvasStore((s) => s.clearRedo);
  const bookMeta = useCanvasStore((s) => s.bookMeta);
  const zoomIndex = useCanvasStore((s) => s.zoomIndex);
  const setZoomIndex = useCanvasStore((s) => s.setZoomIndex);
  const { saveFull } = useAutoSave();

  const iconSize = 14;

  const handleUndo = async () => {
    if (!canvas || undoStack.length === 0) return;
    const current = JSON.stringify((canvas as any).toJSON(["z", "slotIndex", "layer"]));
    pushRedo(current);
    const prev = popUndo();
    if (prev) {
      canvas.clear();
      canvas.backgroundColor = "#fff";
      await canvas.loadFromJSON(JSON.parse(prev));
      canvas.renderAll();
    }
  };

  const handleRedo = async () => {
    if (!canvas || redoStack.length === 0) return;
    const current = JSON.stringify((canvas as any).toJSON(["z", "slotIndex", "layer"]));
    pushUndo();
    const next = popRedo();
    if (next) {
      canvas.clear();
      canvas.backgroundColor = "#fff";
      await canvas.loadFromJSON(JSON.parse(next));
      canvas.renderAll();
    }
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
    const container = document.getElementById("canvas-scale-container");
    if (container) {
      container.style.transform = `scale(${ZOOM_LEVELS[idx]})`;
    }
  };

  const handleAddText = () => {
    if (!canvas) return;
    pushUndo();
    const text = new fabric.IText("Double-click to edit", {
      left: 100,
      top: 100,
      fontSize: 24,
      fontFamily: FONTS[0].css,
      customProperties: { z: 251, layer: "element", id: `text-${Date.now()}` },
    } as any);
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
      <span className="font-bold text-sm mr-2">{bookMeta.title}</span>

      <div className="w-[3px] h-4 bg-[#222] rounded-full" />
      <ToolBtn icon={<Undo2 size={iconSize} />} label="Undo" onClick={handleUndo} />
      <ToolBtn icon={<Redo2 size={iconSize} />} label="Redo" onClick={handleRedo} />
      <div className="w-[3px] h-4 bg-[#222] rounded-full" />
      <ToolBtn icon={<Type size={iconSize} />} label="Add Text" onClick={handleAddText} />
      <div className="w-[3px] h-4 bg-[#222] rounded-full" />
      <DelBtn icon={<Trash2 size={iconSize} />} label="Delete" onClick={handleDelete} />
      <div className="w-[3px] h-4 bg-[#222] rounded-full" />
      <ToolBtn icon={<svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h3"/><path d="M16 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3"/><path d="M12 20v2"/><path d="M12 14v-4"/><path d="M12 8V6"/><path d="M9 13l3-3 3 3"/><path d="M9 11l3 3 3-3"/></svg>} label="Flip H" onClick={handleFlipH} />
      <ToolBtn icon={<svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M12 22v-4"/><path d="M12 10V6"/><path d="M9 13l3-3 3 3"/><path d="M9 15l3 3 3-3"/></svg>} label="Flip V" onClick={handleFlipV} />

      <div className="ml-auto flex items-center gap-2">
        <div className="flex items-center rounded-lg border-2 border-[#222] shadow-[2px_2px_0_#222] overflow-hidden">
          <button onClick={() => handleZoom(-1)} className="px-2 py-1.5 font-mono text-xs font-bold hover:bg-[#e8e6e0] transition-colors">−</button>
          <button className="px-2.5 py-1.5 font-mono text-[10px] font-bold tracking-widest border-x-[2px] border-[#222] flex items-center gap-1 hover:bg-[#e8e6e0] transition-colors">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            {Math.round(ZOOM_LEVELS[zoomIndex] * 100)}%
          </button>
          <button onClick={() => handleZoom(1)} className="px-2 py-1.5 font-mono text-xs font-bold hover:bg-[#e8e6e0] transition-colors">+</button>
        </div>
        <button className="flex items-center gap-1.5 font-mono text-[10px] font-bold tracking-widest uppercase px-3.5 py-1.5 rounded-lg border-2 border-[#222] shadow-[2px_2px_0_#222] bg-[#FFF7D6] hover:translate-x-px hover:translate-y-[1px] hover:shadow-[1px_1px_0_#222] transition-all"><Eye size={11} /> Preview</button>
        <button onClick={saveFull}
          className="flex items-center gap-1.5 font-mono text-[10px] font-bold tracking-widest uppercase bg-[#222] text-white px-3.5 py-1.5 rounded-lg border-2 border-[#222] shadow-[2px_2px_0_#222] hover:translate-x-px hover:translate-y-[1px] hover:shadow-[1px_1px_0_#222] transition-all">Save Journal</button>
        <button className="flex items-center gap-1.5 font-mono text-[10px] font-bold tracking-widest uppercase px-3.5 py-1.5 rounded-lg border-2 border-[#222] shadow-[2px_2px_0_#222] bg-[#D4A574] hover:translate-x-px hover:translate-y-[1px] hover:shadow-[1px_1px_0_#222] transition-all">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 17L12 5l6 12"/><path d="M8 13h8"/>
          </svg>
          Order Print
        </button>
      </div>
    </div>
  );
}
