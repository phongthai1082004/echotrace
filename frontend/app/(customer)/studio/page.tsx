"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { StudioPage } from "@/features/studio-canvas/components/StudioPage";
import { useCanvasStore } from "@/features/studio-canvas/hooks/useCanvasState";

export default function StudioRoute() {
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const setBookMeta = useCanvasStore((s) => s.setBookMeta);
  const [loaded, setLoaded] = useState(false);
  const bookId = searchParams.get("id");
  const token = (session as any)?.accessToken;

  useEffect(() => {
    if (!bookId || !token) {
      if (!bookId) setLoaded(true);
      return;
    }
    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/books/${bookId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        const book = data.data || data;
        setBookMeta({
          id: book.id,
          title: book.title || "Untitled",
          themeId: book.themeId || null,
          format: book.format || "A4_PORTRAIT",
        });
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [bookId, token]);

  if (!loaded) return null;

  return <StudioPage />;
}
