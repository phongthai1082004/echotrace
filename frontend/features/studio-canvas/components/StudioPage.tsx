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
import { StudioMobileNav } from "./studio/studio-mobile-nav";
import { StudioProvider } from "../context/studio-context";
import type { StudioAPI } from "../api/studio-api";

type Props = {
  api: StudioAPI;
  hideOrder?: boolean;
  noPadding?: boolean;
  backHref?: string;
  isAdmin?: boolean;
};

export function StudioPage({ api, hideOrder, noPadding, backHref, isAdmin }: Props) {
  useEffect(() => {
    const fn = (e: MouseEvent) => e.preventDefault();
    document.addEventListener("contextmenu", fn);
    return () => document.removeEventListener("contextmenu", fn);
  }, []);
  return (
    <StudioProvider api={api}>
      <DndProvider backend={HTML5Backend}>
        <StudioLayout noPadding={noPadding}>
          <StudioTopbar hideOrder={hideOrder} isAdmin={isAdmin} />
          <div className="flex flex-1 overflow-hidden relative">
            <div className="hidden lg:contents">
              <StudioSidebar backHref={backHref} />
            </div>
            <div className="hidden lg:contents">
              <StudioSidebarPanel />
            </div>
            <StudioWorkspace />
            <div className="hidden lg:contents">
              <StudioProperties />
            </div>
          </div>
          <StudioMobileNav />
        </StudioLayout>
      </DndProvider>
    </StudioProvider>
  );
}
