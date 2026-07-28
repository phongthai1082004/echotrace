"use client";

import { createContext, useContext } from "react";
import type { StudioAPI } from "../api/studio-api";

const StudioContext = createContext<StudioAPI | null>(null);

export function StudioProvider({ api, children }: { api: StudioAPI; children: React.ReactNode }) {
  return <StudioContext.Provider value={api}>{children}</StudioContext.Provider>;
}

export function useStudioAPI(): StudioAPI {
  const api = useContext(StudioContext);
  if (!api) throw new Error("useStudioAPI must be used within <StudioProvider>");
  return api;
}
