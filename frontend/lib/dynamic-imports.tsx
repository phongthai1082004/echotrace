/**
 * Dynamic imports for code-splitting heavy components
 */
"use client";

import dynamic from "next/dynamic";

// Loading skeleton component
function LoadingSkeleton() {
  return (
    <div className="animate-pulse p-8">
      <div className="h-48 bg-gray-200 rounded mb-4" />
      <div className="h-4 bg-gray-200 rounded w-3/4" />
    </div>
  );
}

/**
 * Example dynamic imports for code-splitting.
 * Uncomment and update paths when feature components are ready.
 * 
 * Usage in pages:
 * import { StudioCanvas } from "@/lib/dynamic-imports"
 * 
 * <StudioCanvas />
 */

/*
export const StudioCanvas = dynamic(() => import("@/features/studio-canvas").then((mod) => mod.StudioCanvas), {
  loading: LoadingSkeleton,
  ssr: false,
});

export const BookSlider = dynamic(() => import("@/features/book-slider").then((mod) => mod.BookSlider), {
  loading: LoadingSkeleton,
  ssr: true,
});

export const OrderKanban = dynamic(() => import("@/features/order-kanban").then((mod) => mod.OrderKanban), {
  loading: LoadingSkeleton,
  ssr: false,
});

export const LandingHero = dynamic(() => import("@/features/landing").then((mod) => mod.Hero), {
  loading: LoadingSkeleton,
  ssr: true,
});
*/

// Re-export LoadingSkeleton for manual lazy loading
export { LoadingSkeleton };
