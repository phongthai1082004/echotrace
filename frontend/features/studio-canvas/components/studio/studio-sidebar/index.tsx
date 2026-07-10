"use client";

import React from "react";
import { SidebarItem } from "./sidebar-item";
import { navItems } from "../../../types/menu";

const iconSize = 16;

export function StudioSidebar() {
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
            {item.iconElements.map((el, idx) =>
              React.createElement(el.tag, { key: idx, ...el.props })
            )}
          </svg>
        </SidebarItem>
      ))}
    </div>
  );
}
