"use client";

import type { ReactNode } from "react";

interface ResponsiveTableProps {
  header: ReactNode;
  children: ReactNode;
  gridCols?: string;
}

export function ResponsiveTable({ header, children, gridCols }: ResponsiveTableProps) {
  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-x-auto thin-scrollbar">
      <div className="shrink-0" style={gridCols ? { gridTemplateColumns: gridCols } : undefined}>
        {header}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto thin-scrollbar">{children}</div>
    </div>
  );
}
