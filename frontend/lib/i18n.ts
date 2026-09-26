import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import vi from "@/public/locales/vi/common.json";

const LANGS = ["en", "vi", "es"] as const;
type Lang = (typeof LANGS)[number];

// en/es lazy theo nhu cầu — đỡ ~80KB JS ban đầu. Thiếu bundle thì i18next
// fallback về vi (fallbackLng), không bao giờ hiện key thô.
const loaders: Record<Lang, () => Promise<{ default: unknown }>> = {
  vi: () => Promise.resolve({ default: vi }),
  en: () => import("@/public/locales/en/common.json"),
  es: () => import("@/public/locales/es/common.json"),
};

i18n.use(initReactI18next).init({
  resources: { vi: { common: vi } },
  defaultNS: "common",
  lng: "vi",
  fallbackLng: "vi",
  interpolation: { escapeValue: false },
});

export function ensureLang(lang: string): Promise<void> {
  if (!(LANGS as readonly string[]).includes(lang) || i18n.hasResourceBundle(lang, "common")) {
    return Promise.resolve();
  }
  return loaders[lang as Lang]()
    .then((m) => {
      i18n.addResourceBundle(lang, "common", (m as any).default ?? m, true, true);
    })
    .catch(() => {});
}

// render matches the server's language — no hydration mismatch, no render-time changeLanguage.
if (typeof document !== "undefined") {
  const cookie = document.cookie.match(/(?:^|;\s*)i18nextLng=([^;]+)/)?.[1];
  if (cookie && (LANGS as readonly string[]).includes(cookie) && i18n.language !== cookie) {
    void ensureLang(cookie).then(() => {
      if (i18n.language !== cookie) void i18n.changeLanguage(cookie);
    });
  }
}
export default i18n;
