"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { StudioAPI } from "@/features/studio-canvas/api/studio-api";
import { customerAPI } from "@/features/studio-canvas/api/customer-api";

const StudioPage = dynamic(
  () => import("@/features/studio-canvas/components/StudioPage").then((m) => ({ default: m.StudioPage })),
  { ssr: false },
) as ComponentType<{ api: StudioAPI; hideOrder?: boolean; noPadding?: boolean }>;

export default function AdminStudioPage() {
  return (
    <div className="min-h-screen bg-[#F8F2E5]">
      <StudioPage api={customerAPI} hideOrder noPadding />
    </div>
  );
}
