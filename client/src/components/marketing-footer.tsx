import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Logo } from "@/components/logo";
import { TOPIC_PAGES } from "@/data/topic-pages";
import { loc } from "@/i18n/localized";

/**
 * Geteilter Footer für die öffentlichen Marketing-Seiten – übersetzt (da/de/en).
 * Ersetzt die zuvor pro Seite duplizierten Footer-Blöcke.
 */
export function MarketingFooter() {
  const { t, i18n } = useTranslation();
  const linkClass = "hover:text-foreground transition-colors";

  return (
    <footer className="border-t border-border py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-between gap-4">
        <Logo height="h-6" />
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <Link href="/blog" className={linkClass}>{t("footer.blog")}</Link>
          <Link href="/beispiele" className={linkClass}>{t("footer.examples")}</Link>
          {TOPIC_PAGES.map((tp) => (
            <Link key={tp.slug} href={`/${tp.slug}`} className={linkClass}>
              {loc(tp.heroTitle, i18n.language)}
            </Link>
          ))}
          <Link href="/impressum" className={linkClass}>{t("footer.imprint")}</Link>
          <Link href="/datenschutz" className={linkClass}>{t("footer.privacy")}</Link>
          <Link href="/agb" className={linkClass}>{t("footer.terms")}</Link>
          <Link href="/widerrufsbelehrung" className={linkClass}>{t("footer.withdrawal")}</Link>
        </div>
        <p className="text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} MormorsBreve. {t("footer.rights")}
        </p>
      </div>
    </footer>
  );
}
