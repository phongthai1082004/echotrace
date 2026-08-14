"use client";

import { card, neoBtn, neoBtnPrimary } from "@/lib/styles";

interface Tab {
  key: string;
  label: string;
  count?: number;
}

interface Props {
  tabs: Tab[];
  selected: string;
  onChange: (key: string) => void;
}

export function AdminFilterTabs({ tabs, selected, onChange }: Props) {
  return (
    <div className={`${card} p-4 shrink-0`}>
      <div className="flex gap-2">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => onChange(t.key)}
            className={`font-mono text-[8px] font-bold tracking-widest uppercase px-3 py-1.5 ${selected === t.key ? neoBtnPrimary : neoBtn}`}>
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
