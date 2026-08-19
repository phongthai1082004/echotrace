"use client";

import { useCanvasStore } from "../../../hooks/useCanvasState";
import { PhotosPanel } from "./photos-panel";
import { StickersPanel } from "./stickers-panel";
import { FilterPanel } from "./filter-panel";
import { LayoutsPanel } from "./layouts-panel";
import { FramesPanel } from "./frames-panel";

export function StudioSidebarPanel() {
  const activeMenu = useCanvasStore((s) => s.activeMenu);

  const panels: Record<string, React.ReactNode> = {
    Layouts: <LayoutsPanel />,
    Photos: <PhotosPanel />,
    Stickers: <StickersPanel />,
    Frames: <FramesPanel />,
    Filter: <FilterPanel />,
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
