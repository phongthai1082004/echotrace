"use client";

import { Undo2, Redo2, Move, Type, ImageIcon, Trash2, Eye } from "lucide-react";

function ToolBtn({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="relative group">
      <button className="p-1.5 hover:bg-[#FFF7D6] rounded-[6px] border-[2px] border-transparent hover:border-[#222] transition-all text-[#222]">{icon}</button>
      <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        <div className="bg-[#222] text-white font-mono text-[8px] font-bold tracking-widest uppercase px-2 py-1 rounded-[4px] whitespace-nowrap">
          {label}
        </div>
      </div>
    </div>
  );
}

function DelBtn({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="relative group">
      <button className="p-1.5 hover:bg-[#B54843]/10 hover:text-[#B54843] rounded-[6px] border-[2px] border-transparent hover:border-[#B54843] transition-all">{icon}</button>
      <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        <div className="bg-[#222] text-white font-mono text-[8px] font-bold tracking-widest uppercase px-2 py-1 rounded-[4px] whitespace-nowrap">
          {label}
        </div>
      </div>
    </div>
  );
}

const textStyles = [
  { label: "Display", font: "'Space Grotesk', sans-serif", size: "28px", preview: "Aa" },
  { label: "Headline", font: "'Space Grotesk', sans-serif", size: "18px", preview: "Aa" },
  { label: "Body", font: "'Space Grotesk', sans-serif", size: "13px", preview: "Aa" },
  { label: "Caption", font: "'DM Mono', monospace", size: "10px", preview: "Aa" },
  { label: "Coords", font: "'DM Mono', monospace", size: "9px", preview: "00° N" },
];

function TextTypeBtn() {
  return (
    <div className="relative group">
      <button className="p-1.5 hover:bg-[#FFF7D6] rounded-[6px] border-[2px] border-transparent hover:border-[#222] transition-all text-[#222]">
        <Type size={14} />
      </button>
      <div className="absolute top-full left-1/2 -translate-x-1/2 w-52 h-2 z-50" />
      <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        <div className="bg-[#FFF7D6] w-52 rounded-[10px] border-[3px] border-[#222] shadow-[4px_4px_0_#222] overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b-[3px] border-[#222]">
            <span className="font-mono text-[8px] font-bold tracking-widest uppercase text-[#666]">Add Text</span>
            <span className="font-mono text-[7px] font-bold tracking-widest uppercase px-1 py-[1px] bg-[#222] text-white rounded-[4px]">
              {textStyles.length}
            </span>
          </div>
          {textStyles.map((s, i) => (
            <button key={s.label}
              className="w-full flex items-center justify-between px-3 py-2 hover:bg-[#e8e6e0] transition-colors border-b-[2px] border-[#222] last:border-b-0"
            >
              <div className="flex flex-col items-start gap-[1px]">
                <span className="font-mono text-[8px] font-bold uppercase tracking-wider text-[#666]">{s.label}</span>
                <span className="font-mono text-[7px] font-bold tracking-widest uppercase text-[#999]">{s.size}</span>
              </div>
              <span style={{ fontFamily: s.font, fontSize: s.size, color: "#222", lineHeight: 1 }}>{s.preview}</span>
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
    <div className="h-12 flex items-center px-5 gap-2 bg-[#FFF7D6] shrink-0 border-b-[3px] border-[#222]">
      <span className="font-bold text-sm mr-2">West Africa Circuit</span>

      <div className="w-[3px] h-4 bg-[#222] rounded-full" />
      <ToolBtn icon={<Undo2 size={iconSize} />} label="Undo" />
      <ToolBtn icon={<Redo2 size={iconSize} />} label="Redo" />
      <div className="w-[3px] h-4 bg-[#222] rounded-full" />
      <ToolBtn icon={<Move size={iconSize} />} label="Select / Move" />
      <TextTypeBtn />
      <ToolBtn icon={<ImageIcon size={iconSize} />} label="Add Image" />
      <div className="w-[3px] h-4 bg-[#222] rounded-full" />
      <DelBtn icon={<Trash2 size={iconSize} />} label="Delete" />

      <div className="ml-auto flex items-center gap-2">
        <div className="flex items-center rounded-[8px] border-[2px] border-[#222] shadow-[2px_2px_0_#222] overflow-hidden">
          <button className="px-2 py-1.5 font-mono text-xs font-bold hover:bg-[#e8e6e0] transition-colors">−</button>
          <button className="px-2.5 py-1.5 font-mono text-[10px] font-bold tracking-widest border-x-[2px] border-[#222] flex items-center gap-1 hover:bg-[#e8e6e0] transition-colors">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            75%
          </button>
          <button className="px-2 py-1.5 font-mono text-xs font-bold hover:bg-[#e8e6e0] transition-colors">+</button>
        </div>
        <button className="flex items-center gap-1.5 font-mono text-[10px] font-bold tracking-widest uppercase px-3.5 py-1.5 rounded-[8px] border-[2px] border-[#222] shadow-[2px_2px_0_#222] bg-[#FFF7D6] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#222] transition-all"><Eye size={11} /> Preview</button>
        <button className="flex items-center gap-1.5 font-mono text-[10px] font-bold tracking-widest uppercase bg-[#222] text-white px-3.5 py-1.5 rounded-[8px] border-[2px] border-[#222] shadow-[2px_2px_0_#222] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#222] transition-all">Save Journal</button>
      </div>
    </div>
  );
}
