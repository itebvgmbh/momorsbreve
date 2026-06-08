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
