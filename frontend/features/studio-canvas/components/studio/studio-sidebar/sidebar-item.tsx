"use client";

import { useTranslation } from "react-i18next";
import { useCanvasStore } from '../../../hooks/useCanvasState'

const sidebarLabelKeys: Record<string, string> = {
  Layouts: "customer.studio.layouts",
  Photos: "customer.studio.image",
  Stickers: "customer.studio.sticker",
  Frames: "customer.studio.sectionFrames",
  Filter: "customer.studio.smartFilters",
  Backgrounds: "customer.studio.background",
  Layers: "customer.studio.layers",
};

export function SidebarItem({ label, children }: {
  label: string; 
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  const activeMenu = useCanvasStore((state) => state.activeMenu);
  const setActiveMenu = useCanvasStore((state) => state.setActiveMenu);

  const isActive = activeMenu === label;

  return (
    <button 
      onClick={() => setActiveMenu(label)} 
      className={`flex flex-col items-center gap-1 w-full py-3 px-1 transition-all duration-150 group cursor-pointer ${
        isActive ? "bg-[#222] text-white" : "hover:bg-[#e8e6e0]"
      }`}
    >
      <span className={isActive ? "text-white" : "text-[#222] group-hover:text-[#222]"}>
        {children}
      </span>
      <span className={`text-[7.5px] font-bold tracking-widest uppercase leading-none transition-colors ${
        isActive ? "text-white" : "text-[#666] group-hover:text-[#222]"
      }`}>
        {t(sidebarLabelKeys[label] || label)}
      </span>
    </button>
  );
}
