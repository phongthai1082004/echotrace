"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import i18n from "@/lib/i18n";

// ponytail: changeLanguage runs during render (not useEffect) so SSR + hydration
// emit the same language; render-time singleton mutation is fine at this scale.
export function I18nProvider({ lang, children }: { lang: string; children: ReactNode }) {
  const pathname = usePathname();
  const seg = pathname.split("/")[1];
  const target = ["en", "vi", "es"].includes(seg) ? seg : lang;
  if (i18n.language !== target) i18n.changeLanguage(target);
  return <>{children}</>;
}
