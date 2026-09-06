import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "@/public/locales/en/common.json";
import vi from "@/public/locales/vi/common.json";
import es from "@/public/locales/es/common.json";

i18n.use(initReactI18next).init({
  resources: { en: { common: en }, vi: { common: vi }, es: { common: es } },
  defaultNS: "common",
  lng: "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
