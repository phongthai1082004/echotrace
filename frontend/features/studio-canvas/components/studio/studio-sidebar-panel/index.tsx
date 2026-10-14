"use client";

import { useCanvasStore } from "../../../hooks/useCanvasState";
import { PhotosPanel } from "./photos-panel";
import { BackgroundPanel } from "./background-panel";
import { StickersPanel } from "./stickers-panel";
import { FilterPanel } from "./filter-panel";
import { LayoutsPanel } from "./layouts-panel";
import { FramesPanel } from "./frames-panel";
import { TextPanel } from "./text-panel";
import { LayersPanel } from "./layers-panel";

export function StudioSidebarPanel() {
  const activeMenu = useCanvasStore((s) => s.activeMenu);

  const panels: Record<string, React.ReactNode> = {
    Layouts: <LayoutsPanel />,
    Photos: <PhotosPanel />,
    Background: <BackgroundPanel />,
    Stickers: <StickersPanel />,
    Frames: <FramesPanel />,
    Filter: <FilterPanel />,
    Text: <TextPanel />,
    Layers: <LayersPanel />,
  };

  return (
    <div
      className="w-56 bg-[#FFF7D6] overflow-y-auto flex flex-col border-r-[3px] border-[#222]"
      style={{ scrollbarWidth: "none" }}
    >
      {panels[activeMenu] || null}
    </div>
  );
}
