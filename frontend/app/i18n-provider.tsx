"use client";

import { useEffect, type ReactNode } from "react";
import i18n from "@/lib/i18n";

export function I18nProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const stored = localStorage.getItem("i18nextLng");
    if (stored && stored !== "en") {
      i18n.changeLanguage(stored);
    }
  }, []);

  return <>{children}</>;
}
