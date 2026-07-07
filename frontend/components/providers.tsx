"use client";

import { Grain } from "@/components/grain";
import { SessionProvider } from "next-auth/react";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider> 
      <Grain />
      {children}
    </SessionProvider>
  );
}