"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslation } from "react-i18next";
import type { ComponentType } from "react";
import type { StudioAPI } from "@/features/studio-canvas/api/studio-api";
import { sampleBookAPI } from "@/features/studio-canvas/api/sample-book-api";
import { useStudioEditor } from "@/features/studio-canvas/hooks/useStudioEditor";

const StudioPage = dynamic(
  () => import("@/features/studio-canvas/components/StudioPage").then((m) => ({ default: m.StudioPage })),
  { ssr: false },
) as ComponentType<{ api: StudioAPI; hideOrder?: boolean; noPadding?: boolean; backHref?: string }>;

export default function AdminSampleStudioPage() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const accessToken = (session as any)?.accessToken;
  const bookId = searchParams.get("id");
  const { loaded, loadError } = useStudioEditor(bookId, status === "authenticated", (id) => sampleBookAPI.load(id, accessToken));

  if (loadError) {
    return <div className="min-h-screen bg-[#F8F2E5] flex flex-col items-center justify-center gap-3"><p className="text-sm font-bold text-[#B54843]">Failed to load template: {loadError}</p></div>;
  }
  if (!loaded) {
    return <div className="min-h-screen bg-[#F8F2E5] flex items-center justify-center"><p suppressHydrationWarning className="font-mono text-[10px] font-bold">{t("common.loading")}</p></div>;
  }
  return (
    <div className="min-h-screen bg-[#F8F2E5]">
      <StudioPage api={sampleBookAPI} hideOrder noPadding backHref="/admin/sample-books" />
    </div>
  );
}