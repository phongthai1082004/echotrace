"use client";

import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslation } from "react-i18next";
import { StudioPage } from "@/features/studio-canvas/components/StudioPage";
import { useStudioEditor } from "@/features/studio-canvas/hooks/useStudioEditor";
import { customerAPI } from "@/features/studio-canvas/api/customer-api";

export default function StudioRouteInner() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const { status } = useSession();
  const bookId = searchParams.get("id");
  const format = searchParams.get("format");
  const w = Number(searchParams.get("w") || "0");
  const h = Number(searchParams.get("h") || "0");
  const initialSize = w > 0 && h > 0 ? { width: w, height: h } : null;
  const { loaded, loadError } = useStudioEditor(bookId, status === "authenticated", (id) => customerAPI.load(id), format, initialSize);

  if (loadError) {
    return <div className="min-h-screen flex flex-col items-center justify-center gap-3"><p className="text-sm font-bold text-[#B54843]">Failed to load book: {loadError}</p></div>;
  }
  if (!loaded) {
    return <div className="min-h-screen flex items-center justify-center"><p suppressHydrationWarning className="font-mono text-[10px] font-bold">{t("common.loading")}</p></div>;
  }
  return <StudioPage api={customerAPI} backHref="/my-journals" />;
}