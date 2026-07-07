"use client";

import { useState, useRef } from "react";
import { useCanvasState } from "../hooks/useCanvasState";
import { StudioSidebar } from "./StudioSidebar";
import { fontCss, ZOOM_LEVELS, FONTS, type CanvasElement } from "../types";
import { Undo2, Redo2, Type, Image as ImageIcon, Move, Trash2, Eye, X } from "lucide-react";

function PageStrip() {
  const [pages] = useState([1, 2, 3]);
  const [activePage, setActivePage] = useState(1);
  return (
    <div className="shrink-0 flex items-center gap-3 px-5 overflow-x-auto bg-[#FDFBF7]"
      style={{ borderTop: "0.5px solid #dbdad6", height: 100, scrollbarWidth: "none" }}>
      <p className="font-['JetBrains_Mono'] text-[9px] tracking-widest uppercase shrink-0 mr-1" style={{ color: "rgba(26,26,26,0.35)" }}>Pages</p>
      {pages.map((p) => {
        const active = activePage === p;
        return (
          <button key={p} onClick={() => setActivePage(p)} className="shrink-0 flex flex-col items-center gap-1.5 group">
            <div style={{ width: 48, height: 64, border: active ? "1px solid #1a1a1a" : "0.5px solid #dbdad6", background: active ? "#fff" : "#f5f3ef" }}
              className="relative overflow-hidden transition-all duration-150">
              <div className="absolute inset-0 p-1.5 flex flex-col gap-1">
                <div className="h-2 w-full" style={{ background: active ? "#dbdad6" : "#e8e6e0" }} />
                <div className="h-px w-3/4" style={{ background: active ? "#dbdad6" : "#e8e6e0" }} />
                <div className="flex-1 w-full mt-0.5" style={{ background: active ? "#f5f3ef" : "#e8e6e0", opacity: 0.6 }} />
              </div>
              {active && <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#1a1a1a]" />}
            </div>
            <span className="font-['JetBrains_Mono'] text-[8px] tracking-widest" style={{ color: active ? "#1a1a1a" : "rgba(26,26,26,0.35)" }}>{p}</span>
          </button>
        );
      })}
    </div>
  );
}

export function StudioPage({ onSaveJournal, readOnly = false, onExitPreview }: {
  onSaveJournal?: () => void;
  readOnly?: boolean;
  onExitPreview?: () => void;
}) {
  const { elements, selectedId, setSelectedId, undo, redo, history, historyIdx, addText, addImage, deleteSelected, moveElement } = useCanvasState();
  const [tool, setTool] = useState<"select" | "text" | "image">("select");
  const [zoom, setZoom] = useState(0.75);
  const dragRef = useRef<{ id: string; sx: number; sy: number; ox: number; oy: number } | null>(null);

  const onPointerDown = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    setSelectedId(id);
    if (tool !== "select") return;
    const el = elements.find((el) => el.id === id);
    if (!el) return;
    dragRef.current = { id, sx: e.clientX, sy: e.clientY, ox: el.x, oy: el.y };
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const { id, ox, oy, sx, sy } = dragRef.current;
    moveElement(id, ox + (e.clientX - sx), oy + (e.clientY - sy));
  };

  const onPointerUp = () => { dragRef.current = null; };

  const zoomIn = () => { const n = ZOOM_LEVELS.find((z) => z > zoom); if (n) setZoom(n); };
  const zoomOut = () => { const p = [...ZOOM_LEVELS].reverse().find((z) => z < zoom); if (p) setZoom(p); };

  const sel = elements.find((el) => el.id === selectedId);

  const updateElement = (id: string, patch: Partial<CanvasElement>) => {
    moveElement(id, elements.find(e => e.id === id)?.x ?? 0, elements.find(e => e.id === id)?.y ?? 0);
  };

  const ZoomControls = (
    <div className="flex items-center" style={{ border: "0.5px solid #dbdad6" }}>
      <button onClick={zoomOut} disabled={zoom <= ZOOM_LEVELS[0]} className="px-2.5 py-2 hover:bg-[#f5f3ef] disabled:opacity-25 font-['JetBrains_Mono'] text-[13px]">−</button>
      <button onClick={() => setZoom(0.75)} className="px-3 py-2 hover:bg-[#f5f3ef] font-['JetBrains_Mono'] text-[10px] tracking-widest"
        style={{ borderLeft: "0.5px solid #dbdad6", borderRight: "0.5px solid #dbdad6" }}>
        <span className="flex items-center gap-1.5">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          {Math.round(zoom * 100)}%
        </span>
      </button>
      <button onClick={zoomIn} disabled={zoom >= ZOOM_LEVELS[ZOOM_LEVELS.length - 1]} className="px-2.5 py-2 hover:bg-[#f5f3ef] disabled:opacity-25 font-['JetBrains_Mono'] text-[13px]">+</button>
    </div>
  );

  const toolBtn = (a: boolean) => `p-2 transition-colors ${a ? "bg-[#1a1a1a] text-[#FDFBF7]" : "hover:bg-[#f5f3ef] text-[#1a1a1a]"}`;

  return (
    <div className="h-screen flex flex-col bg-[#FDFBF7] pt-15">
      <div className="h-13 flex items-center px-6 gap-3 bg-[#FDFBF7] shrink-0" style={{ borderBottom: "0.5px solid #dbdad6" }}>
        <span className="font-['Playfair_Display'] text-[15px] text-[#1a1a1a] mr-3">West Africa Circuit</span>
        {!readOnly && (
          <>
            <div className="w-px h-4 bg-[#dbdad6]" />
            <button onClick={undo} disabled={historyIdx === 0} className="p-2 hover:bg-[#f5f3ef] disabled:opacity-20"><Undo2 size={14} /></button>
            <button onClick={redo} disabled={historyIdx >= history.length - 1} className="p-2 hover:bg-[#f5f3ef] disabled:opacity-20"><Redo2 size={14} /></button>
            <div className="w-px h-4 bg-[#dbdad6]" />
            <button onClick={() => setTool("select")} className={toolBtn(tool === "select")}><Move size={14} /></button>
            <button onClick={addText} className={toolBtn(false)}><Type size={14} /></button>
            <button onClick={() => addImage()} className={toolBtn(false)}><ImageIcon size={14} /></button>
            {selectedId && (<><div className="w-px h-4 bg-[#dbdad6]" /><button onClick={deleteSelected} className="p-2 hover:bg-red-50 hover:text-red-600"><Trash2 size={14} /></button></>)}
          </>
        )}
        {readOnly && <span className="font-['JetBrains_Mono'] text-[9px] tracking-widest uppercase px-2 py-1" style={{ background: "#f5f3ef", color: "rgba(26,26,26,0.45)" }}>Preview — Read only</span>}
        <div className="ml-auto flex items-center gap-2">
          {ZoomControls}
          {readOnly ? (
            <button onClick={onExitPreview} className="flex items-center gap-1.5 font-['JetBrains_Mono'] text-[10px] tracking-widest uppercase px-4 py-2 hover:bg-[#1a1a1a] hover:text-[#FDFBF7] transition-colors" style={{ border: "0.5px solid #dbdad6" }}>
              <X size={12} /> Close Preview
            </button>
          ) : (
            <>
              <button className="flex items-center gap-1.5 font-['JetBrains_Mono'] text-[10px] tracking-widest uppercase px-4 py-2 hover:bg-[#f5f3ef] transition-colors" style={{ border: "0.5px solid #dbdad6" }}><Eye size={12} /> Preview</button>
              <button onClick={onSaveJournal} className="flex items-center gap-1.5 font-['JetBrains_Mono'] text-[10px] tracking-widest uppercase bg-[#0D1F1A] text-[#FDFBF7] px-4 py-2 hover:bg-[#1a1a1a] transition-colors">Save Journal</button>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {!readOnly && <StudioSidebar elements={elements} selectedId={selectedId} setSelectedId={setSelectedId} addText={addText} addImage={addImage} setTool={setTool} />}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto flex items-start justify-center" style={{ background: "#dedad4", padding: `${Math.max(40, 40 / zoom)}px` }}
            onPointerMove={readOnly ? undefined : onPointerMove} onPointerUp={readOnly ? undefined : onPointerUp}>
            <div style={{ transform: `scale(${zoom})`, transformOrigin: "top center", flexShrink: 0 }}>
              <div className="relative bg-[#FDFBF7]" style={{ width: 840, height: 1188, border: "0.5px solid #c0beba" }} onClick={() => setSelectedId(null)}>
                {elements.map((el) => (
                  <div key={el.id} onPointerDown={(e) => onPointerDown(e, el.id)} onClick={(e) => e.stopPropagation()}
                    style={{ position: "absolute", left: el.x, top: el.y, width: el.width, height: el.height, zIndex: el.zIndex, cursor: readOnly ? "default" : (tool === "select" ? "move" : "default"), outline: (!readOnly && selectedId === el.id) ? "1px solid #0D1F1A" : "none", pointerEvents: readOnly ? "none" : "auto", outlineOffset: 3 }}>
                    {el.type === "text" ? (
                      <p style={{ fontFamily: fontCss(el.fontFamily), fontSize: el.fontSize, color: "#1a1a1a", lineHeight: (el.fontFamily ?? "").includes("Mono") ? 1.6 : 1.1, userSelect: "none" }}>{el.content}</p>
                    ) : (
                      el.imageUrl && <img src={el.imageUrl} alt="" className="w-full h-full object-cover" draggable={false} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <PageStrip />
        </div>

        {!readOnly && (
          <div className="w-52.5 shrink-0 bg-[#FDFBF7] overflow-y-auto" style={{ borderLeft: "0.5px solid #dbdad6", scrollbarWidth: "none" }}>
            <div className="p-4" style={{ borderBottom: "0.5px solid #dbdad6" }}>
              <p className="font-['JetBrains_Mono'] text-[9px] tracking-widest uppercase mb-3" style={{ color: "rgba(26,26,26,0.38)" }}>Properties</p>
              {sel ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    {([["X", Math.round(sel.x)], ["Y", Math.round(sel.y)], ["W", sel.width], ["H", sel.height]] as [string, number][]).map(([l, v]) => (
                      <div key={l}><p className="font-['JetBrains_Mono'] text-[9px] mb-0.5" style={{ color: "rgba(26,26,26,0.38)" }}>{l}</p><p className="font-['JetBrains_Mono'] text-[10px] text-[#1a1a1a]">{v}</p></div>
                    ))}
                  </div>
                  {sel.type === "text" && (
                    <>
                      <div>
                        <p className="font-['JetBrains_Mono'] text-[9px] mb-1.5" style={{ color: "rgba(26,26,26,0.38)" }}>FONT SIZE</p>
                        <div className="flex items-center" style={{ border: "0.5px solid #dbdad6" }}>
                          <button disabled={!sel.fontSize || sel.fontSize <= 8} className="px-2.5 py-1.5 hover:bg-[#f5f3ef] disabled:opacity-30 font-['JetBrains_Mono'] text-[13px]" style={{ borderRight: "0.5px solid #dbdad6" }}>−</button>
                          <span className="flex-1 text-center font-['JetBrains_Mono'] text-[10px] text-[#1a1a1a]">{sel.fontSize}px</span>
                          <button className="px-2.5 py-1.5 hover:bg-[#f5f3ef] disabled:opacity-30 font-['JetBrains_Mono'] text-[13px]" style={{ borderLeft: "0.5px solid #dbdad6" }}>+</button>
                        </div>
                      </div>
                      <div>
                        <p className="font-['JetBrains_Mono'] text-[9px] mb-1.5" style={{ color: "rgba(26,26,26,0.38)" }}>TYPEFACE</p>
                        <div className="space-y-1">
                          {FONTS.map((f) => {
                            const a = sel.fontFamily === f.name;
                            return (<button key={f.name}
                              className="w-full flex items-center justify-between px-2.5 py-2 transition-colors"
                              style={{ border: `0.5px solid ${a ? "#1a1a1a" : "#dbdad6"}`, background: a ? "#1a1a1a" : "transparent" }}>
                              <span className="text-[12px]" style={{ fontFamily: f.css, color: a ? "#FDFBF7" : "#1a1a1a" }}>{f.preview}</span>
                              <span className="font-['JetBrains_Mono'] text-[8px] tracking-widest uppercase" style={{ color: a ? "rgba(253,251,247,0.55)" : "rgba(26,26,26,0.35)" }}>{f.name.split(" ")[0]}</span>
                            </button>);
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : <p className="font-['JetBrains_Mono'] text-[10px]" style={{ color: "rgba(26,26,26,0.28)" }}>Select an element</p>}
            </div>
            <div className="p-4">
              <p className="font-['JetBrains_Mono'] text-[9px] tracking-widest uppercase mb-3" style={{ color: "rgba(26,26,26,0.38)" }}>Canvas</p>
              {([["FORMAT", "A4 Portrait"], ["SIZE", "210 × 297 mm"], ["STOCK", "Arctic Volume 120gsm"], ["BLEED", "3mm"]] as [string, string][]).map(([k, v]) => (
                <div key={k} className="mb-3"><p className="font-['JetBrains_Mono'] text-[9px] mb-0.5" style={{ color: "rgba(26,26,26,0.38)" }}>{k}</p><p className="font-['JetBrains_Mono'] text-[10px] text-[#1a1a1a]">{v}</p></div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
