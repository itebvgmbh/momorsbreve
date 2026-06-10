import { useLocation } from "wouter";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { DEFAULT_LANG, localizePath, type Lang } from "@/i18n/lang";

const SITE_ORIGIN = "https://mormorsbreve.dk";

// Sprachen, die indexiert werden sollen. Deutsch ist bewusst AUSGESCHLOSSEN:
// die de-Texte stammen vom Schwesterprojekt omastagebuch.de — eine Indexierung
// würde Duplicate Content zwischen beiden Domains erzeugen. /de bleibt für
// Besucher voll nutzbar, bekommt aber noindex und taucht weder in hreflang
// noch in der Sitemap auf.
const INDEXED_LANGS: Lang[] = ["da", "en"];

const OG_LOCALE: Record<string, string> = {
  da: "da_DK",
  de: "de_DE",
  en: "en_GB",
};

/**
 * Zentrale SEO-Tags für jede Seite (global in App/SSR eingebunden):
 * Canonical der aktuellen Sprachversion, hreflang-Alternates (nur da/en),
 * og:locale sowie noindex für die deutsche Version.
 * Erwartet den base-relativen Pfad von wouter (ohne /de bzw. /en).
 */
export function HreflangTags() {
  const [relativePath] = useLocation();
  const { i18n } = useTranslation();
  const path = relativePath || "/";
  const lang = (i18n.language as Lang) || DEFAULT_LANG;
  const noindex = !INDEXED_LANGS.includes(lang);

  return (
    <Helmet>
      <link rel="canonical" href={`${SITE_ORIGIN}${localizePath(path, lang)}`} />
      {noindex && <meta name="robots" content="noindex, follow" />}
      <meta property="og:locale" content={OG_LOCALE[lang] ?? OG_LOCALE[DEFAULT_LANG]} />
      {INDEXED_LANGS.map((l) => (
        <link
          key={l}
          rel="alternate"
          hrefLang={l}
          href={`${SITE_ORIGIN}${localizePath(path, l)}`}
        />
      ))}
      <link
        rel="alternate"
        hrefLang="x-default"
        href={`${SITE_ORIGIN}${localizePath(path, DEFAULT_LANG)}`}
      />
    </Helmet>
  );
}
