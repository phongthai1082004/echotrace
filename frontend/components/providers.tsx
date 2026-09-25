"use client";

import { SessionProvider } from "next-auth/react";
import { ErrorProvider } from "@/lib/error-context";
import { ErrorToast } from "./error-toast";
import { QueryProvider } from "./query-provider";
import { AttributionCapture } from "./analytics/attribution-capture";
import { AttributionFlush } from "./analytics/attribution-flush";
import { NotificationBootstrap } from "./analytics/notification-bootstrap";
import { GoogleAnalytics } from "./analytics/google-analytics";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    // ponytail: no refetch-on-focus — admin tab focus firing /session + refetch storm feels like "ấn load lâu".
    <SessionProvider refetchInterval={0} refetchOnWindowFocus={false}>
      <GoogleAnalytics />
      <QueryProvider>
        <ErrorProvider>
          <AttributionCapture />
          <AttributionFlush />
          <NotificationBootstrap />
          {children}
          <ErrorToast />
        </ErrorProvider>
      </QueryProvider>
    </SessionProvider>
  );
}
