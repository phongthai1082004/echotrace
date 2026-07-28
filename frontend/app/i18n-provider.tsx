"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import i18n from "@/lib/i18n";

export function I18nProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const synced = useRef(false);

  useEffect(() => {
    if (synced.current) return;
    synced.current = true;
    const detected = pathname.split("/")[1];
    const lang = ["en", "vi", "es"].includes(detected) ? detected : "en";
    if (lang !== i18n.language) i18n.changeLanguage(lang);
  }, [pathname]);

  return <>{children}</>;
}
