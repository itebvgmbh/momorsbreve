import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import da from "./locales/da.json";
import de from "./locales/de.json";
import en from "./locales/en.json";
import { DEFAULT_LANG, SUPPORTED_LANGS } from "./lang";

// Eine gemeinsame i18next-Instanz für Client und SSR.
// Die aktive Sprache wird NICHT automatisch erkannt, sondern von der App
// anhand des URL-Präfixes gesetzt (siehe lang.ts / App.tsx / entry-server.tsx),
// damit Server- und Client-Render garantiert übereinstimmen (keine Hydration-Fehler).
if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: {
      da: { translation: da },
      de: { translation: de },
      en: { translation: en },
    },
    lng: DEFAULT_LANG,
    fallbackLng: DEFAULT_LANG,
    supportedLngs: SUPPORTED_LANGS as unknown as string[],
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
}

export default i18n;
