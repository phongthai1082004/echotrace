"use client";

import { SessionProvider } from "next-auth/react";
import { ErrorProvider } from "@/lib/error-context";
import { ErrorToast } from "./error-toast";
import { QueryProvider } from "./query-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <QueryProvider>
        <ErrorProvider>
          {children}
          <ErrorToast />
        </ErrorProvider>
      </QueryProvider>
    </SessionProvider>
  );
}
