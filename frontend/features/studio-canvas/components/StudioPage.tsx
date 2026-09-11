"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
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

export function StudioPage({ api, hideOrder, noPadding, backHref, isAdmin }: Props) {
  const { t } = useTranslation();
  const [mobileSheet, setMobileSheet] = useState<"tools" | "props" | null>(null);
  useEffect(() => {
    const fn = (e: MouseEvent) => e.preventDefault();
    document.addEventListener("contextmenu", fn);
    return () => document.removeEventListener("contextmenu", fn);
  }, []);
  const toggleSheet = (which: "tools" | "props") => setMobileSheet((cur) => (cur === which ? null : which));
  return (
    <StudioProvider api={api}>
      <DndProvider backend={HTML5Backend}>
        <StudioLayout noPadding={noPadding}>
          <StudioTopbar hideOrder={hideOrder} isAdmin={isAdmin} />
          <div className="flex flex-1 overflow-hidden relative">
            <StudioSidebar backHref={backHref} />
            <div className="hidden lg:contents">
              <StudioSidebarPanel />
            </div>
            <StudioWorkspace />
            <div className="hidden lg:contents">
              <StudioProperties />
            </div>
            {mobileSheet && (
              <div className="lg:hidden absolute inset-x-2 bottom-2 z-50 max-h-[55vh] flex flex-col rounded-[10px] border-[3px] border-[#222] bg-[#FFF7D6] shadow-[4px_4px_0_#222] overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 border-b-[3px] border-[#222] shrink-0">
                  <p className="font-mono text-[9px] font-bold tracking-widest uppercase text-[#666]">
                    {mobileSheet === "tools" ? t("customer.studio.tools") : t("customer.studio.properties")}
                  </p>
                  <button
                    type="button"
                    aria-label="Close panel"
                    onClick={() => setMobileSheet(null)}
                    className="w-10 h-10 flex items-center justify-center font-bold text-[#222]"
                  >
                    ✕
                  </button>
                </div>
                <div className="overflow-y-auto [&>div]:w-full [&>div]:border-r-0 [&>div]:border-l-0 [&>div]:shrink-0">
                  {mobileSheet === "tools" ? <StudioSidebarPanel /> : <StudioProperties />}
                </div>
              </div>
            )}
            <div className="lg:hidden absolute bottom-3 right-3 z-40 flex gap-2">
              <button
                type="button"
                aria-label={t("customer.studio.tools")}
                onClick={() => toggleSheet("tools")}
                className={`w-11 h-11 flex items-center justify-center rounded-[10px] border-[3px] border-[#222] shadow-[3px_3px_0_#222] transition-colors ${
                  mobileSheet === "tools" ? "bg-[#222] text-white" : "bg-[#FFF7D6] text-[#222]"
                }`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 2 7 12 12 22 7 12 2" />
                  <polyline points="2 17 12 22 22 17" />
                  <polyline points="2 12 12 17 22 12" />
                </svg>
              </button>
              <button
                type="button"
                aria-label={t("customer.studio.properties")}
                onClick={() => toggleSheet("props")}
                className={`w-11 h-11 flex items-center justify-center rounded-[10px] border-[3px] border-[#222] shadow-[3px_3px_0_#222] transition-colors ${
                  mobileSheet === "props" ? "bg-[#222] text-white" : "bg-[#FFF7D6] text-[#222]"
                }`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="4" y1="21" x2="4" y2="14" />
                  <line x1="4" y1="10" x2="4" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12" y2="3" />
                  <line x1="20" y1="21" x2="20" y2="16" />
                  <line x1="20" y1="12" x2="20" y2="3" />
                  <line x1="1" y1="14" x2="7" y2="14" />
                  <line x1="9" y1="8" x2="15" y2="8" />
                  <line x1="17" y1="16" x2="23" y2="16" />
                </svg>
              </button>
            </div>
          </div>
        </StudioLayout>
      </DndProvider>
    </StudioProvider>
  );
}
