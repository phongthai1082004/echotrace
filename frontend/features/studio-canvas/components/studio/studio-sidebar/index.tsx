"use client";

import React from "react";
import { SidebarItem } from "./sidebar-item";
import { navItems } from "../../../types/menu";

const iconSize = 16;

export function StudioSidebar() {
  return (
    <div className="w-16 flex flex-col bg-[#FDFBF7] shrink-0 overflow-y-auto" style={{ borderRight: "0.5px solid #dbdad6" }}>
      {navItems.map((item) => (
        <SidebarItem key={item.label} label={item.label}>
          {/* Khung SVG CHUNG cho tất cả các icon */}
          <svg
            width={iconSize}
            height={iconSize}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
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