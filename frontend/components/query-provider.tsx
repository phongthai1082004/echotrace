"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { createQueryClient } from "@/lib/query-client";
import { ReactNode } from "react";

export function QueryProvider({ children }: { children: ReactNode }) {
  const queryClient = createQueryClient();
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
