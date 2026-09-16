import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "@/public/locales/en/common.json";
import vi from "@/public/locales/vi/common.json";
import es from "@/public/locales/es/common.json";

const LANGS = ["en", "vi", "es"];

i18n.use(initReactI18next).init({
  resources: { en: { common: en }, vi: { common: vi }, es: { common: es } },
  defaultNS: "common",
  lng: "vi",
  fallbackLng: "vi",
  interpolation: { escapeValue: false },
});

// ponytail: sync at module eval (runs before hydration render) so the client's first
// render matches the server's language — no hydration mismatch, no render-time changeLanguage.
if (typeof document !== "undefined") {
  const cookie = document.cookie.match(/(?:^|;\s*)i18nextLng=([^;]+)/)?.[1];
  if (cookie && LANGS.includes(cookie) && i18n.language !== cookie) i18n.changeLanguage(cookie);
}
export default i18n;
