"use client";

import React from "react";

export interface LoadingSkeletonProps {
  rows?: number;
  columns?: number;
  itemHeight?: number;
  gap?: number;
  animated?: boolean;
  className?: string;
}

const shimmerKeyframes = `
  @keyframes shimmer {
    0% { background-color: #e5e7eb; }
    50% { background-color: #f3f4f6; }
    100% { background-color: #e5e7eb; }
  }
`;

/**
 * Loading skeleton component with shimmer animation
 */
export function LoadingSkeleton({
  rows = 3,
  columns = 3,
  itemHeight = 20,
  gap = 8,
  animated = true,
  className = "",
}: LoadingSkeletonProps) {
  const items = Array.from({ length: rows * columns }, (_, i) => i);

  return (
    <>
      <style>{shimmerKeyframes}</style>
      <div
        className={className}
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: `${gap}px`,
        }}
      >
        {items.map((i) => (
          <div
            key={i}
            className="bg-gray-200 rounded"
            style={{
              height: `${itemHeight}px`,
              animation: animated ? "shimmer 2s infinite" : "none",
            }}
          />
        ))}
      </div>
    </>
  );
}

/**
 * Table row skeleton for table loading states
 */
export function TableSkeletonRow({ columns = 6, animated = true }: { columns?: number; animated?: boolean }) {
  return (
    <>
      <style>{shimmerKeyframes}</style>
      <div className="flex items-center border-b-[2px] border-[#222]/10 px-2">
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

/**
 * Card skeleton for card-based loading states
 */
export function CardSkeleton({ animated = true, className = "" }: { animated?: boolean; className?: string }) {
  return (
    <>
      <style>{shimmerKeyframes}</style>
      <div className={`border rounded-lg p-4 ${className}`}>
        <div
          className="h-6 bg-gray-200 rounded mb-4 w-3/4"
          style={{
            animation: animated ? "shimmer 2s infinite" : "none",
          }}
        />
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-4 bg-gray-200 rounded mb-2"
            style={{
              animation: animated ? "shimmer 2s infinite" : "none",
              width: i === 2 ? "50%" : "100%",
            }}
          />
        ))}
      </div>
    </>
  );
}
