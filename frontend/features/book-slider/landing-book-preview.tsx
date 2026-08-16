"use client";

import dynamic from "next/dynamic";

const BookPreview = dynamic(() => import("@/features/book-slider/book").then((m) => m.BookPreview), {
  ssr: false,
  loading: () => null,
});

export function LandingBookPreview({ height = 440 }: { height?: number }) {
  return (
    <div style={{ position: "relative", width: "100%", height }} className="pointer-events-auto">
      <BookPreview showUi={false} />
    </div>
  );
}