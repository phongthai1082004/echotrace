"use client";

import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createQueryClient } from "@/lib/query-client";
import { ReactNode } from "react";

export function QueryProvider({ children }: { children: ReactNode }) {
  // ponytail: singleton per mount — new client every render wipes cache → refetch storm.
  const [queryClient] = useState(() => createQueryClient());
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
