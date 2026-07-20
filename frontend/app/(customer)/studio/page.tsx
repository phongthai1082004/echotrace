"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslation } from "react-i18next";
import { StudioPage } from "@/features/studio-canvas/components/StudioPage";
import { useCanvasStore } from "@/features/studio-canvas/hooks/useCanvasState";

export default function StudioRoute() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const { status } = useSession();
  const bookId = searchParams.get("id");
  const [loaded, setLoaded] = useState(false);
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    useCanvasStore.getState().resetStore();
    // New journal — no fetch needed
    if (!bookId) { setLoaded(true); return; }
    // Existing book — wait for authenticated session
    if (status !== "authenticated") { done.current = false; return; }
    fetch(`/api/books/${bookId}`)
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((data) => {
        const book = data.data || data;
        let content: any = {};
        try { content = JSON.parse(book.content || "{}"); } catch {}
        useCanvasStore.getState().setBookMeta({
          id: book.id,
          title: book.title || content.title || "Untitled",
          themeId: book.themeId || null,
          format: content.paperSize || "A4_PORTRAIT",
          gsm: content.gsm || 200,
          paperType: content.paperType || "matte",
          bindingType: content.bindingType || "perfect",
        });
        if (Array.isArray(content.pages) && content.pages.length > 0) {
          useCanvasStore.getState().setPages(content.pages.map((p: any, i: number) => ({
            index: i,
            canvasJson: p.canvasJson ?? null,
            thumbnailUrl: p.thumbnailUrl ?? null,
            layout: p.layout ?? null,
          })));
        }
        setLoaded(true);
      })
      .catch((err) => { console.warn("[studio] load error:", err); done.current = false; setLoaded(true); });
  }, [bookId, status]);

  if (!loaded) {
    return <div className="min-h-screen flex items-center justify-center"><p suppressHydrationWarning className="font-mono text-[10px] font-bold">{t("common.loading")}</p></div>;
  }

  return <StudioPage />;
}
