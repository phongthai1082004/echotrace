"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FlipPreview } from "@/features/book-slider/flip-preview";
import { customerAPI } from "@/features/studio-canvas/api/customer-api";
import { renderBookImages, type BookPageImage } from "@/features/book-slider/render-book-images";
import { resolveFormat, type PageState } from "@/features/studio-canvas/types";
import { trackEvent } from "@/lib/analytics";

export default function StudioPreviewPage() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const [images, setImages] = useState<BookPageImage[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    trackEvent("view_preview", { book_id: id });
    let cancelled = false;
    customerAPI
      .load(id)
      .then((res: any) => {
        const book = res.data || res;
        let content: any = {};
        try {
          content = book.content || {};
        } catch {}
        const pages: PageState[] = Array.isArray(content.pages)
          ? content.pages.map((p: any, i: number) => ({
              index: i,
              canvasJson: p.canvasJson ?? null,
              thumbnailUrl: p.thumbnailUrl ?? null,
              layout: p.layout ?? null,
              spreadLayout: p.spreadLayout ?? null,
            }))
          : [];
        const fmt = resolveFormat({
          format: content.paperSize || "PORTRAIT_A4",
          width: book.paperWidth ? book.paperWidth * 4 : (content.width ?? null),
          height: book.paperHeight ? book.paperHeight * 4 : (content.height ?? null),
        });
        return renderBookImages(pages, fmt);
      })
      .then((imgs) => {
        if (!cancelled) setImages(imgs);
      })
      .catch((err) => {
        if (!cancelled) setError(String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <div className="fixed left-0 right-0 bottom-0 top-15 bg-[#F8F2E5]">
      {error ? (
        <div className="h-full flex items-center justify-center text-sm font-bold text-[#B54843]">{error}</div>
      ) : images === null ? (
        <div className="h-full flex items-center justify-center font-mono text-[10px] font-bold text-[#222]/60">
          Rendering pages…
        </div>
      ) : (
        <FlipPreview images={images} />
      )}
    </div>
  );
}
