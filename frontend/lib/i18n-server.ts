import i18n from "i18next";
import en from "@/public/locales/en/common.json";
import vi from "@/public/locales/vi/common.json";
import es from "@/public/locales/es/common.json";

// Dùng cho server component render text đúng ngôn ngữ. Client vẫn dùng useTranslation riêng.
const instance = i18n.createInstance();
instance.init({
	resources: { en: { common: en }, vi: { common: vi }, es: { common: es } },
	defaultNS: "common",
	lng: "vi",
	fallbackLng: "vi",
	interpolation: { escapeValue: false },
});

export const I18N_LANGS = ["en", "vi", "es"] as const;

export function getT(lng: string | undefined | null) {
	const lang = lng && (I18N_LANGS as readonly string[]).includes(lng) ? lng : "vi";
	return instance.getFixedT(lang, "common");
}
