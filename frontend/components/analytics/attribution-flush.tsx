"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api.fetch";
import { readFirstTouch, readSyncedUserId, markAttributionSynced } from "@/lib/attribution";

// Google lẫn user cũ còn token. Backend write-once nên gọi thừa cũng vô hại.
export function AttributionFlush() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status !== "authenticated") return;
    const dbId = (session?.user as any)?.dbId;
    if (!dbId) return;
    if (readSyncedUserId() === dbId) return;
    const touch = readFirstTouch();
    markAttributionSynced(dbId);
    if (!touch?.source) return;
    apiFetch("/api/user/attribution", undefined, {
      method: "POST",
      body: JSON.stringify({ source: touch.source, medium: touch.medium, campaign: touch.campaign }),
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return null;
}
