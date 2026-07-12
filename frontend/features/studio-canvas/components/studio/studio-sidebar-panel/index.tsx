"use client";

import { useCanvasStore } from "../../../hooks/useCanvasState";
import { PhotosPanel } from "./photos-panel";

import { LayersPanel } from "./layers-panel";
import { StickersPanel } from "./stickers-panel";
import { LayoutPanel } from "./layout-panel";
import { ThemePanel } from "./theme-panel";
import { FilterPanel } from "./filter-panel";

export function StudioSidebarPanel() {
  const activeMenu = useCanvasStore((s) => s.activeMenu);

  const panels: Record<string, React.ReactNode> = {
    Photos: <PhotosPanel />,
    Layout: <LayoutPanel />,
    Stickers: <StickersPanel />,
    Filter: <FilterPanel />,
    Layers: <LayersPanel />,
    Theme: <ThemePanel />,
  };

  return (
    <div className="w-56 bg-[#FFF7D6] overflow-y-auto flex flex-col border-r-[3px] border-[#222]" style={{ scrollbarWidth: "none" }}>
      {panels[activeMenu] || null}
    </div>
  );
}
