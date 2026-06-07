import { useLocation } from "wouter";
import { Helmet } from "react-helmet-async";
import { SUPPORTED_LANGS, DEFAULT_LANG, localizePath } from "@/i18n/lang";

const SITE_ORIGIN = "https://mormorsbreve.dk";

/**
 * Gibt hreflang-Alternativen für die aktuelle Seite aus, damit Google die
 * da/de/en-Varianten als zusammengehörig erkennt. Erwartet den base-relativen
 * Pfad von wouter (ohne /de bzw. /en).
 */
export function HreflangTags() {
  const [relativePath] = useLocation();
  const path = relativePath || "/";

  return (
    <Helmet>
      {SUPPORTED_LANGS.map((lang) => (
        <link
          key={lang}
          rel="alternate"
          hrefLang={lang}
          href={`${SITE_ORIGIN}${localizePath(path, lang)}`}
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
