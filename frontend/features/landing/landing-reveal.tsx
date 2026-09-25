"use client";

import type { ReactNode } from "react";
import { useReveal } from "./use-reveal";

// ponytail: CSS landing nằm ở globals.css (build-time) — wrapper chỉ còn scroll-reveal.
export function LandingReveal({ children }: { children: ReactNode }) {
  useReveal();
  return <>{children}</>;
}
