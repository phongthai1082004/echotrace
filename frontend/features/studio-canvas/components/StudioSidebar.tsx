"use client";

import { useState } from "react";
import type { CanvasElement } from "../types";
import { LAYOUT_TEMPLATES, STOCK_PHOTOS } from "../types";

type StudioSection = "tools" | "templates" | "pages" | "photos" | "text" | "layers";

function SidebarIcon({ label, active, onClick, children }: {
  label: string; active: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 w-full py-3 px-1 transition-colors duration-150 group"
      style={{ background: active ? "#eeecea" : "transparent" }}
    >
      <span style={{ color: active ? "#1a1a1a" : "rgba(26,26,26,0.45)" }} className="group-hover:text-[#1a1a1a] transition-colors">
        {children}
      </span>
      <span
        className="font-['JetBrains_Mono'] text-[7.5px] tracking-widest uppercase leading-none"
        style={{ color: active ? "#1a1a1a" : "rgba(26,26,26,0.4)" }}
      >
        {label}
      </span>
    </button>
  );
}

export function StudioSidebar({ elements, selectedId, setSelectedId, addText, addImage, setTool }: {
  elements: CanvasElement[];
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  addText: () => void;
  addImage: (url?: string) => void;
  setTool: (t: "select" | "text" | "image") => void;
}) {
  const [active, setActive] = useState<StudioSection>("pages");
  const iconSize = 16;

  const navItems: { id: StudioSection; label: string; icon: React.ReactNode }[] = [
    { id: "tools", label: "Tools", icon: <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg> },
    { id: "templates", label: "Templates", icon: <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg> },
    { id: "pages", label: "Pages", icon: <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> },
    { id: "photos", label: "Photos", icon: <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="0"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> },
    { id: "text", label: "Text", icon: <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg> },
    { id: "layers", label: "Layers", icon: <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg> },
  ];

  return (
    <div className="flex shrink-0" style={{ borderRight: "0.5px solid #dbdad6" }}>
      <div className="w-[64px] flex flex-col bg-[#FDFBF7] shrink-0 overflow-y-auto" style={{ borderRight: "0.5px solid #dbdad6" }}>
        {navItems.map((item) => (
          <SidebarIcon key={item.id} label={item.label} active={active === item.id} onClick={() => setActive(item.id)}>
            {item.icon}
          </SidebarIcon>
        ))}
      </div>

      <div className="w-[180px] bg-[#FDFBF7] overflow-y-auto flex flex-col" style={{ scrollbarWidth: "none" }}>
        {active === "tools" && (
          <div className="p-4">
            <p className="font-['JetBrains_Mono'] text-[9px] tracking-widest uppercase mb-4" style={{ color: "rgba(26,26,26,0.38)" }}>Tools</p>
            <div className="space-y-1">
              {[
                { label: "Select / Move", action: () => setTool("select"), icon: <Move size={12} /> },
                { label: "Add Text", action: addText, icon: <Type size={12} /> },
                { label: "Add Image", action: () => addImage(), icon: <ImageIcon size={12} /> },
              ].map((t) => (
                <button key={t.label} onClick={t.action}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-[#f5f3ef] transition-colors"
                  style={{ border: "0.5px solid transparent" }}
                >
                  <span style={{ color: "rgba(26,26,26,0.5)", flexShrink: 0 }}>{t.icon}</span>
                  <span className="font-['JetBrains_Mono'] text-[10px] text-[#1a1a1a]">{t.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {active === "templates" && (
          <div className="p-4">
            <p className="font-['JetBrains_Mono'] text-[9px] tracking-widest uppercase mb-4" style={{ color: "rgba(26,26,26,0.38)" }}>Templates</p>
            <div className="space-y-2">
              {LAYOUT_TEMPLATES.map((t) => (
                <div key={t.id} className="cursor-pointer hover:bg-[#f5f3ef] transition-colors p-2.5" style={{ border: "0.5px solid #dbdad6" }}>
                  <div className="aspect-[3/4] bg-[#e8e6e0] mb-2 flex items-center justify-center">
                    <span className="font-['JetBrains_Mono'] text-[8px]" style={{ color: "rgba(26,26,26,0.28)" }}>preview</span>
                  </div>
                  <p className="font-['JetBrains_Mono'] text-[10px] text-[#1a1a1a] mb-0.5">{t.label}</p>
                  <p className="font-['Inter'] text-[10px]" style={{ color: "rgba(26,26,26,0.45)" }}>{t.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {active === "pages" && (
          <div className="p-4">
            <p className="font-['JetBrains_Mono'] text-[10px]" style={{ color: "rgba(26,26,26,0.38)" }}>
              Pages are shown at the bottom of the canvas.
            </p>
          </div>
        )}

        {active === "photos" && (
          <div className="p-4">
            <p className="font-['JetBrains_Mono'] text-[9px] tracking-widest uppercase mb-4" style={{ color: "rgba(26,26,26,0.38)" }}>Stock Photos</p>
            <div className="grid grid-cols-2 gap-1.5">
              {STOCK_PHOTOS.map((photo) => (
                <div key={photo.id} className="cursor-pointer overflow-hidden bg-[#e8e6e0] group" style={{ border: "0.5px solid #dbdad6" }} onClick={() => addImage(photo.url)} title={photo.label}>
                  <img src={photo.url} alt={photo.label} className="w-full object-cover transition-transform duration-300 group-hover:scale-105" style={{ aspectRatio: "1" }} />
                </div>
              ))}
            </div>
          </div>
        )}

        {active === "text" && (
          <div className="p-4">
            <p className="font-['JetBrains_Mono'] text-[9px] tracking-widest uppercase mb-4" style={{ color: "rgba(26,26,26,0.38)" }}>Typography</p>
            <div className="space-y-2">
              {[
                { label: "Display", font: "'Playfair Display', serif", size: "28px", preview: "Aa" },
                { label: "Headline", font: "'Playfair Display', serif", size: "18px", preview: "Aa" },
                { label: "Body", font: "'Inter', sans-serif", size: "13px", preview: "Aa" },
                { label: "Caption", font: "'JetBrains Mono', monospace", size: "10px", preview: "Aa" },
                { label: "Coords", font: "'JetBrains Mono', monospace", size: "9px", preview: "00° N" },
              ].map((style) => (
                <button key={style.label} onClick={addText}
                  className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-[#f5f3ef] transition-colors"
                  style={{ border: "0.5px solid #dbdad6" }}
                >
                  <span className="font-['JetBrains_Mono'] text-[9px] uppercase tracking-widest" style={{ color: "rgba(26,26,26,0.45)" }}>{style.label}</span>
                  <span style={{ fontFamily: style.font, fontSize: style.size, color: "#1a1a1a", lineHeight: 1 }}>{style.preview}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {active === "layers" && (
          <div className="p-4">
            <p className="font-['JetBrains_Mono'] text-[9px] tracking-widest uppercase mb-3" style={{ color: "rgba(26,26,26,0.38)" }}>Layers</p>
            {elements.length === 0 && (
              <p className="font-['JetBrains_Mono'] text-[10px]" style={{ color: "rgba(26,26,26,0.28)" }}>No elements yet</p>
            )}
            {[...elements].reverse().map((el) => (
              <div key={el.id} onClick={() => setSelectedId(el.id)}
                className="py-2 px-2.5 mb-0.5 cursor-pointer flex items-center gap-2 transition-colors select-none"
                style={{ border: selectedId === el.id ? "0.5px solid #1a1a1a" : "0.5px solid transparent", background: selectedId === el.id ? "#f5f3ef" : "transparent" }}
              >
                {el.type === "text" ? <Type size={10} style={{ opacity: 0.4, flexShrink: 0 }} /> : <ImageIcon size={10} style={{ opacity: 0.4, flexShrink: 0 }} />}
                <span className="font-['JetBrains_Mono'] text-[10px] truncate" style={{ color: "rgba(26,26,26,0.65)" }}>
                  {el.type === "text" ? el.content.slice(0, 16) : "Image"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Move({ size }: { size: number }) {
  return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20"/></svg>;
}
function Type({ size }: { size: number }) {
  return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>;
}
function ImageIcon({ size }: { size: number }) {
  return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="0"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>;
}
