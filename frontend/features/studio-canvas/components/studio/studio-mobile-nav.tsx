"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSession } from "next-auth/react";
import { ChevronLeft, ChevronRight, Sparkles, Type } from "lucide-react";
import { useCanvasStore } from "../../hooks/useCanvasState";
import { usePageManager } from "../../hooks/usePageManager";
import { useAutoFill } from "../../hooks/useAutoFill";
import { navItems } from "./studio-sidebar/nav-items";
import { StudioSidebarPanel } from "./studio-sidebar-panel";

type TabId = "template" | "sticker" | "image" | "frame" | "filter" | "background" | "text" | "layers";

const TABS: { id: TabId; menu: string | null; labelKey: string }[] = [
  { id: "template", menu: "Layouts", labelKey: "customer.studio.layouts" },
  { id: "sticker", menu: "Stickers", labelKey: "customer.studio.sticker" },
  { id: "image", menu: "Photos", labelKey: "customer.studio.image" },
  { id: "frame", menu: "Frames", labelKey: "customer.studio.sectionFrames" },
  { id: "filter", menu: "Filter", labelKey: "customer.studio.smartFilters" },
  { id: "background", menu: "Background", labelKey: "customer.studio.background" },
  { id: "text", menu: "Text", labelKey: "customer.studio.text" },
  { id: "layers", menu: "Layers", labelKey: "customer.studio.layers" },
];

const MENU_ICON: Record<string, React.ReactNode> = {
  Layouts: navItems.find((n) => n.label === "Layouts")?.icon,
  Stickers: navItems.find((n) => n.label === "Stickers")?.icon,
  Photos: navItems.find((n) => n.label === "Photos")?.icon,
  Frames: navItems.find((n) => n.label === "Frames")?.icon,
  Filter: navItems.find((n) => n.label === "Filter")?.icon,
  Background: navItems.find((n) => n.label === "Background")?.icon,
  Text: navItems.find((n) => n.label === "Text")?.icon,
  Layers: navItems.find((n) => n.label === "Layers")?.icon,
};

export function StudioMobileNav() {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;
  const { autoFill } = useAutoFill(token);
  const { switchPage } = usePageManager();
  const [tab, setTab] = useState<TabId | null>(null);
  const setActiveMenu = useCanvasStore((s) => s.setActiveMenu);
  const pages = useCanvasStore((s) => s.pages);
  const activePageIndex = useCanvasStore((s) => s.activePageIndex);

  const onTap = (id: TabId, menu: string | null) => {
    if (tab === id) {
      setTab(null);
      return;
    }
    if (menu) setActiveMenu(menu);
    setTab(id);
  };

  return (
    <div className="lg:hidden shrink-0 flex flex-col bg-[#FFF7D6] border-t-[3px] border-[#222]">
      {tab && (
        <div className="mobile-sheet max-h-[32vh] overflow-y-auto border-b-[3px] border-[#222] [&>div]:w-full [&>div]:border-r-0 [&>div]:border-l-0 [&>div]:shrink-0">
          <StudioSidebarPanel />
        </div>
      )}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b-2 border-[#222]/10 shrink-0">
        <button
          type="button"
          aria-label="Previous page"
          disabled={activePageIndex <= 0}
          onClick={() => switchPage(activePageIndex - 1)}
          className="w-10 h-10 flex items-center justify-center rounded-[8px] text-[#222] disabled:opacity-30 disabled:pointer-events-none hover:bg-[#e8e6e0] transition-colors"
        >
          <ChevronLeft size={20} strokeWidth={2.5} />
        </button>
        <span className="font-mono text-[10px] font-bold tracking-widest text-[#666] min-w-10 text-center">
          {activePageIndex + 1}/{pages.length}
        </span>
        <button
          type="button"
          aria-label="Next page"
          disabled={activePageIndex >= pages.length - 1}
          onClick={() => switchPage(activePageIndex + 1)}
          className="w-10 h-10 flex items-center justify-center rounded-[8px] text-[#222] disabled:opacity-30 disabled:pointer-events-none hover:bg-[#e8e6e0] transition-colors"
        >
          <ChevronRight size={20} strokeWidth={2.5} />
        </button>
        <div className="flex-1" />
        <button
          type="button"
          aria-label={t("customer.studio.autoFill")}
          onClick={autoFill}
          className="h-10 px-3 flex items-center gap-1.5 rounded-[8px] font-mono text-[10px] font-bold tracking-widest uppercase text-[#222] hover:bg-[#e8e6e0] transition-colors"
        >
          <Sparkles size={16} strokeWidth={2.5} />
          {t("customer.studio.autoFill")}
        </button>
      </div>
      <div className="grid grid-cols-8 shrink-0">
        {TABS.map((item) => {
          const active = tab === item.id;
          const icon =
            item.id === "text" ? (
              <Type size={20} strokeWidth={2.5} />
            ) : (
              <svg
                width={20}
                height={20}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {MENU_ICON[item.menu as string]}
              </svg>
            );
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTap(item.id, item.menu)}
              className={`flex flex-col items-center gap-1 py-2 transition-colors ${
                active ? "bg-[#222] text-white" : "text-[#222] hover:bg-[#e8e6e0]"
              }`}
            >
              {icon}
              <span className="text-[7.5px] font-bold tracking-widest uppercase leading-none">
                {t(item.labelKey)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
