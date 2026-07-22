"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import i18n from "@/lib/i18n";

export function I18nProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    const lang = document.cookie.replace(/(?:(?:^|.*;\s*)i18nextLng\s*=\s*([^;]*).*$)|^.*$/, "$1") || "en";
    if (lang !== i18n.language) i18n.changeLanguage(lang);
  }, [pathname]);

  return <>{children}</>;
}
