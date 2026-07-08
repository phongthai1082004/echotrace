"use client";

import { Undo2, Redo2, Move, Type, ImageIcon, Trash2, Eye } from "lucide-react";

function ToolBtn({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="relative group">
      <button className="p-1.5 hover:bg-[#f5f3ef] transition-colors text-[#1a1a1a]">{icon}</button>
      <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        <div className="bg-[#1a1a1a] text-[#FDFBF7] font-['JetBrains_Mono'] text-[8px] tracking-widest uppercase px-2 py-1 whitespace-nowrap">
          {label}
        </div>
      </div>
    </div>
  );
}

function DelBtn({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="relative group">
      <button className="p-1.5 hover:bg-red-50 hover:text-red-600 transition-colors">{icon}</button>
      <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        <div className="bg-[#1a1a1a] text-[#FDFBF7] font-['JetBrains_Mono'] text-[8px] tracking-widest uppercase px-2 py-1 whitespace-nowrap">
          {label}
        </div>
      </div>
    </div>
  );
}

const textStyles = [
  { label: "Display", font: "'Playfair Display', serif", size: "28px", preview: "Aa" },
  { label: "Headline", font: "'Playfair Display', serif", size: "18px", preview: "Aa" },
  { label: "Body", font: "'Inter', sans-serif", size: "13px", preview: "Aa" },
  { label: "Caption", font: "'JetBrains Mono', monospace", size: "10px", preview: "Aa" },
  { label: "Coords", font: "'JetBrains Mono', monospace", size: "9px", preview: "00° N" },
];

function TextTypeBtn() {
  return (
    <div className="relative group">
      <button className="p-1.5 hover:bg-[#f5f3ef] transition-colors text-[#1a1a1a]">
        <Type size={14} />
      </button>
      <div className="absolute top-full left-1/2 -translate-x-1/2 w-52 h-2 z-50" />
      <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        <div className="bg-[#FDFBF7] w-52" style={{ border: "0.5px solid #dbdad6", boxShadow: "0 8px 32px rgba(0,0,0,0.08)" }}>
          <div className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: "0.5px solid #dbdad6" }}>
            <span className="font-['JetBrains_Mono'] text-[8px] tracking-widest uppercase" style={{ color: "rgba(26,26,26,0.35)" }}>Add Text</span>
            <span className="font-['JetBrains_Mono'] text-[7px] tracking-widest uppercase px-1 py-[1px]" style={{ border: "0.5px solid #dbdad6", color: "rgba(26,26,26,0.2)", borderRadius: 0 }}>
              {textStyles.length}
            </span>
          </div>
          {textStyles.map((s, i) => (
            <button key={s.label}
              className="w-full flex items-center justify-between px-3 py-2 hover:bg-[#f5f3ef] transition-colors"
              style={{ borderBottom: i < textStyles.length - 1 ? "0.5px solid #dbdad6" : "none" }}
            >
              <div className="flex flex-col items-start gap-[1px]">
                <span className="font-['JetBrains_Mono'] text-[8px] uppercase tracking-wider" style={{ color: "rgba(26,26,26,0.45)" }}>{s.label}</span>
                <span className="font-['JetBrains_Mono'] text-[7px] tracking-widest uppercase" style={{ color: "rgba(26,26,26,0.18)" }}>{s.size}</span>
              </div>
              <span style={{ fontFamily: s.font, fontSize: s.size, color: "#1a1a1a", lineHeight: 1 }}>{s.preview}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function StudioTopbar() {
  const iconSize = 14;

  return (
    <div className="h-12 flex items-center px-5 gap-2 bg-[#FDFBF7] shrink-0" style={{ borderBottom: "0.5px solid #dbdad6" }}>
      <span className="font-['Playfair_Display'] text-sm text-[#1a1a1a] mr-2">West Africa Circuit</span>

      <div className="w-px h-4 bg-[#dbdad6]" />
      <ToolBtn icon={<Undo2 size={iconSize} />} label="Undo" />
      <ToolBtn icon={<Redo2 size={iconSize} />} label="Redo" />
      <div className="w-px h-4 bg-[#dbdad6]" />
      <ToolBtn icon={<Move size={iconSize} />} label="Select / Move" />
      <TextTypeBtn />
      <ToolBtn icon={<ImageIcon size={iconSize} />} label="Add Image" />
      <div className="w-px h-4 bg-[#dbdad6]" />
      <DelBtn icon={<Trash2 size={iconSize} />} label="Delete" />

      <div className="ml-auto flex items-center gap-2">
        <div className="flex items-center" style={{ border: "0.5px solid #dbdad6" }}>
          <button className="px-2 py-1.5 font-['JetBrains_Mono'] text-xs" style={{ color: "rgba(26,26,26,0.35)" }}>−</button>
          <button className="px-2.5 py-1.5 font-['JetBrains_Mono'] text-[10px] tracking-widest" style={{ borderLeft: "0.5px solid #dbdad6", borderRight: "0.5px solid #dbdad6", color: "rgba(26,26,26,0.45)" }}>
            <span className="flex items-center gap-1">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              75%
            </span>
          </button>
          <button className="px-2 py-1.5 font-['JetBrains_Mono'] text-xs" style={{ color: "rgba(26,26,26,0.35)" }}>+</button>
        </div>
        <button className="flex items-center gap-1.5 font-['JetBrains_Mono'] text-[10px] tracking-widest uppercase px-3.5 py-1.5" style={{ border: "0.5px solid #dbdad6", color: "rgba(26,26,26,0.5)" }}><Eye size={11} /> Preview</button>
        <button className="flex items-center gap-1.5 font-['JetBrains_Mono'] text-[10px] tracking-widest uppercase bg-[#0D1F1A] text-[#FDFBF7] px-3.5 py-1.5">Save Journal</button>
      </div>
    </div>
  );
}
