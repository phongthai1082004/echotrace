"use client";

import { useRouter } from "next/navigation";
import { StudioPage } from "@/features/studio-canvas/components/StudioPage";

export default function StudioRoute() {
  const router = useRouter();

  return (
    <StudioPage
      onSaveJournal={() => {
        router.push("/checkout");
      }}
    />
  );
}
