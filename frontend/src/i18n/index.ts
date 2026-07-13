import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "./en.json";
import zhCN from "./zh-CN.json";

/** Map browser / free-form codes onto the locales we actually ship. */
export function normalizeLocale(lng: string): "en" | "zh-CN" {
  const base = lng.toLowerCase().replaceAll("_", "-");
  if (base === "zh-cn" || base.startsWith("zh")) return "zh-CN";
  return "en";
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      "zh-CN": { translation: zhCN },
    },
    supportedLngs: ["en", "zh-CN"],
    fallbackLng: "en",
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "i18nextLng",
      // navigator may report zh / zh-Hans / en-US — fold them onto shipped codes.
      convertDetectedLanguage: (lng) => normalizeLocale(lng),
    },
  });

// Keep <html lang> in sync so screen readers use correct pronunciation.
i18n.on("languageChanged", (lng) => {
  document.documentElement.lang = lng;
});
document.documentElement.lang = i18n.language;

export default i18n;
