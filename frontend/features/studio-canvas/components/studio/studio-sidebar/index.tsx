"use client";

import Link from "next/link";
import { SidebarItem } from "./sidebar-item";
import { navItems } from "./nav-items";

const iconSize = 16;

export function StudioSidebar({ backHref }: { backHref?: string }) {
  return (
    <div className="w-16 flex flex-col bg-[#FFF7D6] shrink-0 overflow-y-auto border-r-[3px] border-[#222]">
      {navItems.map((item) => (
        <SidebarItem key={item.label} label={item.label}>
          <svg
            width={iconSize}
            height={iconSize}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {item.icon}
          </svg>
        </SidebarItem>
      ))}
      {backHref && (
        <Link
          href={backHref}
          className="mt-auto flex items-center justify-center h-14 border-t-[3px] border-[#222] hover:bg-[#e8e6e0] transition-colors"
        >
          <svg
            width={iconSize}
            height={iconSize}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5" />
            <path d="m12 19-7-7 7-7" />
          </svg>
        </Link>
      )}
    </div>
  );
}
