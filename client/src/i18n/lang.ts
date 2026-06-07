// Zentrale Sprach-/URL-Logik für die Mehrsprachigkeit (i18n).
//
// URL-Schema:
//   Dänisch (Standard): kein Präfix   ->  /, /blog, /faq ...
//   Deutsch:            Präfix /de    ->  /de, /de/blog ...
//   Englisch:           Präfix /en    ->  /en, /en/blog ...
//
// Dänisch bleibt bewusst präfixlos, damit bestehende URLs/SEO erhalten bleiben.

export const SUPPORTED_LANGS = ["da", "de", "en"] as const;
export type Lang = (typeof SUPPORTED_LANGS)[number];

export const DEFAULT_LANG: Lang = "da";

export const LANG_LABELS: Record<Lang, string> = {
  da: "Dansk",
  de: "Deutsch",
  en: "English",
};

export function isLang(value: string): value is Lang {
  return (SUPPORTED_LANGS as readonly string[]).includes(value);
}

/**
 * Zerlegt einen vollständigen Pfad in Sprache + den präfixlosen Rest.
 * "/de/blog" -> { lang: "de", base: "/de", path: "/blog" }
 * "/blog"    -> { lang: "da", base: "",    path: "/blog" }
 */
export function parsePath(fullPath: string): { lang: Lang; base: string; path: string } {
  const clean = fullPath || "/";
  const segments = clean.split("/"); // ["", "de", "blog"]
  const maybeLang = segments[1];

  if (maybeLang && isLang(maybeLang) && maybeLang !== DEFAULT_LANG) {
    const rest = "/" + segments.slice(2).join("/");
    return { lang: maybeLang, base: `/${maybeLang}`, path: rest === "/" ? "/" : rest.replace(/\/$/, "") || "/" };
  }
  return { lang: DEFAULT_LANG, base: "", path: clean };
}

/** Liefert das Routing-Base-Präfix für eine Sprache ("" für Dänisch, "/de", "/en"). */
export function baseForLang(lang: Lang): string {
  return lang === DEFAULT_LANG ? "" : `/${lang}`;
}

/**
 * Baut aus einem präfixlosen Pfad ("/blog") den vollständigen Pfad für eine Sprache.
 * localizePath("/blog", "de") -> "/de/blog"
 * localizePath("/", "en")     -> "/en"
 */
export function localizePath(path: string, lang: Lang): string {
  const base = baseForLang(lang);
  if (path === "/" || path === "") return base || "/";
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Wechselt die Sprache eines vollständigen Pfades und behält die Seite bei.
 * swapLang("/de/blog/foo", "en") -> "/en/blog/foo"
 * swapLang("/de/blog/foo", "da") -> "/blog/foo"
 */
export function swapLang(fullPath: string, lang: Lang): string {
  const { path } = parsePath(fullPath);
  return localizePath(path, lang);
}
