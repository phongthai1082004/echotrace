"use client";

import type { ReactNode } from "react";
import { useReveal } from "./use-reveal";

export function LandingReveal({ children }: { children: ReactNode }) {
  useReveal();
  return <>{children}</>;
}
