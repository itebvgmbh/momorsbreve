import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Globe, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SUPPORTED_LANGS,
  LANG_LABELS,
  localizePath,
  isLang,
  type Lang,
} from "@/i18n/lang";

const LANG_STORAGE_KEY = "preferredLang";

/**
 * Sichtbarer Sprachumschalter (da / de / en).
 *
 * Beim Wechsel wird die Seite vollständig neu geladen, weil sich das
 * URL-Präfix (Routing-Base) ändert – so passen SSR, <html lang> und
 * hreflang garantiert zur neuen Sprache.
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  // base-relativer Pfad (ohne /de bzw. /en), z. B. "/blog"
  const [relativePath] = useLocation();
  const { i18n } = useTranslation();
  const current: Lang = isLang(i18n.language) ? i18n.language : "da";

  const change = (lang: Lang) => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(LANG_STORAGE_KEY, lang);
      } catch {
        /* localStorage evtl. nicht verfügbar – egal */
      }
      const target = localizePath(relativePath || "/", lang);
      window.location.assign(target + window.location.hash);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`gap-1.5 ${className ?? ""}`}
          aria-label={`${LANG_LABELS[current]} – Sprog/Sprache/Language`}
          data-testid="button-language"
        >
          <Globe className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase">{current}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {SUPPORTED_LANGS.map((lang) => (
          <DropdownMenuItem
            key={lang}
            onClick={() => change(lang)}
            className="flex items-center justify-between gap-4"
            data-testid={`lang-${lang}`}
          >
            <span>{LANG_LABELS[lang]}</span>
            {lang === current && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
