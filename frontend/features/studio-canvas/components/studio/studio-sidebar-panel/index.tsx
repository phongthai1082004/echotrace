"use client";

import { useCanvasStore } from "../../../hooks/useCanvasState";
import { TemplatesPanel } from "./templates-panel";
import { PhotosPanel } from "./photos-panel";

import { LayersPanel } from "./layers-panel";
import { StickersPanel } from "./stickers-panel";
import { LayoutPanel } from "./layout-panel";
import { ThemePanel } from "./theme-panel";
import { FilterPanel } from "./filter-panel";

export function StudioSidebarPanel() {
  const activeMenu = useCanvasStore((s) => s.activeMenu);

  const panels: Record<string, React.ReactNode> = {
    Templates: <TemplatesPanel />,
    Photos: <PhotosPanel />,

    Layers: <LayersPanel />,
    Stickers: <StickersPanel />,
    Layout: <LayoutPanel />,
    Theme: <ThemePanel />,
    Filter: <FilterPanel />,
  };

  return (
    <div className="w-56 bg-[#FFF7D6] overflow-y-auto flex flex-col border-r-[3px] border-[#222]" style={{ scrollbarWidth: "none" }}>
      {panels[activeMenu] || <TemplatesPanel />}
    </div>
  );
}
