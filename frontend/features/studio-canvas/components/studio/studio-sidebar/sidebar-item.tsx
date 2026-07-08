"use client";

import { useCanvasStore } from '../../../hooks/useCanvasState'
export function SidebarItem({ label, children }: {
  label: string; 
  children: React.ReactNode;
}) {
  const activeMenu = useCanvasStore((state) => state.activeMenu);
  const setActiveMenu = useCanvasStore((state) => state.setActiveMenu);

  const isActive = activeMenu === label;

  return (
    <button 
      onClick={() => setActiveMenu(label)} 
      className="flex flex-col items-center gap-1 w-full py-3 px-1 transition-colors duration-150 group cursor-pointer"
    >
      <span 
        style={{ color: isActive ? "#1a1a1a" : "rgba(26,26,26,0.45)" }} 
        className="group-hover:text-[#1a1a1a] transition-colors"
      >
        {children}
      </span>
      <span 
        className="font-['JetBrains_Mono'] text-[7.5px] tracking-widest uppercase leading-none transition-colors" 
        style={{ color: isActive ? "#1a1a1a" : "rgba(26,26,26,0.4)" }}
      >
        {label}
      </span>
    </button>
  );
}
