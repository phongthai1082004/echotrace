"use client";

import { card } from "@/lib/styles";

interface Tab {
  key: string;
  label: string;
  count: number;
}

interface Props {
  tabs: Tab[];
  selected: string;
  onChange: (key: string) => void;
}

export function AdminFilterTabs({ tabs, selected, onChange }: Props) {
  return (
    <div className={`${card} p-4 shrink-0`}>
      <div className="flex gap-1">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => onChange(t.key)}
            className={`font-mono text-[8px] font-bold tracking-widest uppercase px-3 py-1.5 rounded-md border-2 transition-[background-color,color,border-color] ${
              selected === t.key ? "bg-[#222] text-white border-[#222]" : "border-transparent text-[#999] hover:text-[#222]"
            }`}>
            {t.label} <span className={selected === t.key ? "text-white/60" : "text-[#999]"}>({t.count})</span>
          </button>
        ))}
      </div>
    </div>
  );
}
