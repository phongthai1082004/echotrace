"use client";

interface SidebarNavItem {
  label: string;
  value: string;
}

export function SidebarNav({
  title,
  items,
  activeItem,
  onSelect,
  hideAll = false,
}: {
  title: string;
  items: SidebarNavItem[];
  activeItem: string | null;
  onSelect: (value: string | null) => void;
  hideAll?: boolean;
}) {
  return (
    <aside className="lg:w-48 shrink-0 py-8 lg:py-10 lg:pr-8 border-b-[3px] lg:border-b-0 lg:border-r-[3px] border-[#222]">
      <p className="font-mono text-[9px] font-bold tracking-widest uppercase mb-3 text-[#666]">{title}</p>
      <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
        {!hideAll && (
          <button onClick={() => onSelect(null)}
            className={`shrink-0 text-left text-sm font-bold px-3 py-2 rounded-[8px] transition-all ${
              activeItem === null ? "bg-[#222] text-white border-[2px] border-[#222] shadow-[2px_2px_0_#222]" : "border-[2px] border-[#222] hover:bg-[#FFF7D6]"
            }`}>
            All
          </button>
        )}
        {items.map((item) => (
          <button key={item.value} onClick={() => onSelect(item.value)}
            className={`shrink-0 text-left text-sm font-bold px-3 py-2 rounded-[8px] transition-all ${
              activeItem === item.value ? "bg-[#222] text-white border-[2px] border-[#222] shadow-[2px_2px_0_#222]" : "border-[2px] border-[#222] hover:bg-[#FFF7D6]"
            }`}>
            {item.label}
          </button>
        ))}
      </div>
    </aside>
  );
}
