"use client";

import { SessionProvider } from "next-auth/react";
import { ErrorProvider } from "@/lib/error-context";
import { ErrorToast } from "./error-toast";
import { QueryProvider } from "./query-provider";
import { AttributionCapture } from "./analytics/attribution-capture";
import { AttributionFlush } from "./analytics/attribution-flush";
import { NotificationBootstrap } from "./analytics/notification-bootstrap";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
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
