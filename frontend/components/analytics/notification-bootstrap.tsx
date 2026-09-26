"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useNotifStore } from "@/stores/notifications";

// EventSource tự reconnect; poll 60s cũ ở chuông giữ làm backup.
export function NotificationBootstrap() {
  const { status } = useSession();

  useEffect(() => {
    if (status !== "authenticated") return;
    const { refresh, pushLive, reset } = useNotifStore.getState();
    void refresh();
    const es = new EventSource("/api/notifications/stream");
    es.onmessage = (ev) => {
      try {
        const n = JSON.parse(ev.data);
        if (n?.title) pushLive(n);
      } catch {}
    };
    return () => {
      es.close();
      reset();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return null;
}
