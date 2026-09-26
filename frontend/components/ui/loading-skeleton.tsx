"use client";

import React from "react";

const faint = "opacity-60";

const shimmerKeyframes = `
  @keyframes shimmer {
    0% { background-color: #e5e7eb; }
    50% { background-color: #f3f4f6; }
    100% { background-color: #e5e7eb; }
  }
`;

/**
 * Table row skeleton for table loading states
 */
export function TableSkeletonRow({ columns = 6, animated = true }: { columns?: number; animated?: boolean }) {
  return (
    <>
      <style>{shimmerKeyframes}</style>
      <div className={`flex items-center border-b-[2px] border-[#222]/10 px-2 ${faint}`}>
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="px-4 py-5 flex-1">
            <div
              className="h-4 bg-gray-200 rounded"
              style={{
                animation: animated ? "shimmer 2s infinite" : "none",
              }}
            />
          </div>
        ))}
      </div>
    </>
  );
}
