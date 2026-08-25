"use client";

import { useEffect } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { StudioLayout } from "./studio/studio-layout";
import { StudioTopbar } from "./studio/studio-topbar";
import { StudioSidebar } from "./studio/studio-sidebar";
import { StudioSidebarPanel } from "./studio/studio-sidebar-panel";
import { StudioWorkspace } from "./studio/studio-workspace";
import { StudioProperties } from "./studio/studio-properties";
import { StudioProvider } from "../context/studio-context";
import type { StudioAPI } from "../api/studio-api";

type Props = {
  api: StudioAPI;
  hideOrder?: boolean;
  noPadding?: boolean;
  backHref?: string;
  isAdmin?: boolean;
};

const CANVAS_FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Cormorant+Garamond:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=DM+Mono:wght@400;500&family=Great+Vibes&family=Dancing+Script:wght@400;500;600;700&family=Pacifico&family=Lobster&family=Righteous&family=Permanent+Marker&family=Abril+Fatface&family=Bebas+Neue&family=Oswald:wght@400;500;600;700&family=Montserrat:wght@400;500;600;700&family=Poppins:wght@400;500;600;700&family=Raleway:wght@400;500;600;700&family=Quicksand:wght@400;500;600;700&family=Comfortaa:wght@400;500;600;700&display=swap";

export function StudioPage({ api, hideOrder, noPadding, backHref, isAdmin }: Props) {
  useEffect(() => {
    const fn = (e: MouseEvent) => e.preventDefault();
    document.addEventListener("contextmenu", fn);
    return () => document.removeEventListener("contextmenu", fn);

    if (!document.querySelector(`link[href="${CANVAS_FONTS_URL}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = CANVAS_FONTS_URL;
      document.head.appendChild(link);
    }
  }, []);
  return (
    <StudioProvider api={api}>
      <DndProvider backend={HTML5Backend}>
        <StudioLayout noPadding={noPadding}>
          <StudioTopbar hideOrder={hideOrder} isAdmin={isAdmin} />
          <div className="flex flex-1 overflow-hidden">
            <StudioSidebar backHref={backHref} />
            <StudioSidebarPanel />
            <StudioWorkspace />
            <StudioProperties />
          </div>
        </StudioLayout>
      </DndProvider>
    </StudioProvider>
  );
}
