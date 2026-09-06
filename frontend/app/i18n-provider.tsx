"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import i18n from "@/lib/i18n";

// ponytail: singleton mutation per render — fine at this scale.
// SSR: apply synchronously during render so server HTML matches the request language.
// Client: initial language comes from the cookie at module eval (lib/i18n.ts); this
// effect only re-syncs on client-side navigations — never changeLanguage during render
// (that triggers react-i18next setState-in-render warnings).
export function I18nProvider({ lang, children }: { lang: string; children: ReactNode }) {
  const pathname = usePathname();
  const seg = pathname.split("/")[1];
  const target = ["en", "vi", "es"].includes(seg) ? seg : lang;

  if (typeof window === "undefined" && i18n.language !== target) i18n.changeLanguage(target);

  useEffect(() => {
    if (i18n.language !== target) i18n.changeLanguage(target);
  }, [target]);

  return <>{children}</>;
}
