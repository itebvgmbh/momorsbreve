import i18n from "@/i18n";
import { isLang, DEFAULT_LANG, type Lang } from "@/i18n/lang";

/** Ein in alle Sprachen übersetzter String (für Inhaltsdaten außerhalb der i18n-JSONs). */
export type Localized = { da: string; de: string; en: string };

function activeLang(lang?: string): Lang {
  if (lang && isLang(lang)) return lang;
  if (isLang(i18n.language)) return i18n.language;
  return DEFAULT_LANG;
}

/**
 * Wählt die passende Sprachvariante eines lokalisierten Strings.
 * Fallback: Dänisch (Standardsprache).
 */
export function loc(value: Localized | string, lang?: string): string {
  if (typeof value === "string") return value;
  const l = activeLang(lang);
  return value[l] ?? value[DEFAULT_LANG];
}

/**
 * Wie loc(), aber für beliebige Werte pro Sprache (z. B. React-Nodes / Arrays).
 * Fallback: Dänisch.
 */
export function pick<T>(value: Partial<Record<Lang, T>>, lang?: string): T | undefined {
  const l = activeLang(lang);
  return value[l] ?? value[DEFAULT_LANG];
}

/**
 * Name einer Sprache (ISO-Code) in der aktuellen UI-Sprache, z. B.
 * de-UI: "Deutsch", da-UI: "Tysk", en-UI: "German". Nutzt Intl.DisplayNames;
 * `fallback` (z. B. das dänische Label aus translationLanguages) greift,
 * falls die Umgebung den Code nicht auflösen kann.
 */
export function languageDisplayName(code: string, fallback: string, lang?: string): string {
  const l = activeLang(lang);
  try {
    const name = new Intl.DisplayNames([l], { type: "language" }).of(code);
    if (name && name !== code) {
      return name.charAt(0).toUpperCase() + name.slice(1);
    }
  } catch {
    /* Intl.DisplayNames nicht verfügbar – Fallback nutzen */
  }
  return fallback;
}
