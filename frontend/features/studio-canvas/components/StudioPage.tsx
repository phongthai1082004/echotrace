"use client";

import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { StudioLayout } from "./studio/studio-layout";
import { StudioTopbar } from "./studio/studio-topbar";
import { StudioSidebar } from "./studio/studio-sidebar";
import { StudioSidebarPanel } from "./studio/studio-sidebar-panel";
import { StudioWorkspace } from "./studio/studio-workspace";
import { StudioProperties } from "./studio/studio-properties";

export function StudioPage() {
  return (
    <DndProvider backend={HTML5Backend}>
      <StudioLayout>
        <StudioTopbar />
        <div className="flex flex-1 overflow-hidden">
          <StudioSidebar />
          <StudioSidebarPanel />
          <StudioWorkspace />
          <StudioProperties />
        </div>
      </StudioLayout>
    </DndProvider>
  );
}
