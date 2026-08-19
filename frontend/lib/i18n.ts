import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "@/public/locales/en/common.json";

i18n.use(initReactI18next).init({
  resources: { en: { common: en } },
  defaultNS: "common",
  lng: "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

if (typeof document !== "undefined") {
  const lang = document.cookie.replace(/(?:(?:^|.*;\s*)i18nextLng\s*=\s*([^;]*).*$)|^.*$/, "$1") || "en";
  if (lang !== "en") {
    fetch(`/locales/${lang}/common.json`)
      .then((r) => r.json())
      .then((data) => {
        i18n.addResourceBundle(lang, "common", data);
        i18n.changeLanguage(lang);
      })
      .catch(() => {});
  }
}

i18n.on("languageChanged", (lng) => {
  if (i18n.hasResourceBundle(lng, "common")) return;
  fetch(`/locales/${lng}/common.json`)
    .then((r) => r.json())
    .then((data) => i18n.addResourceBundle(lng, "common", data))
    .catch(() => {});
});

export default i18n;
