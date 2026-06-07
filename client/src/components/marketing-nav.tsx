import { Link } from "wouter";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import { AuthDialog } from "@/components/auth-dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { TOPIC_PAGES } from "@/data/topic-pages";
import { baseForLang, isLang, type Lang } from "@/i18n/lang";
import { Menu, ChevronDown } from "lucide-react";

interface MarketingNavProps {
  activeLink?: "faq" | "blog" | "beispiele";
  /** If provided, the "Anmelden" button calls this instead of the built-in AuthDialog. */
  onLoginClick?: () => void;
}

export function MarketingNav({ activeLink, onLoginClick }: MarketingNavProps) {
  const { user, isLoading } = useAuth();
  const { t, i18n } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  const handleLoginClick = onLoginClick ?? (() => setAuthOpen(true));

  // Sprachbewusste Anker zur Startseite (z. B. /de/#features), damit der
  // Sprachkontext beim Sprung auf Homepage-Abschnitte erhalten bleibt.
  const lang: Lang = isLang(i18n.language) ? i18n.language : "da";
  const home = baseForLang(lang);
  const anchor = (hash: string) => `${home}/#${hash}`;

  const linkClass = (key: string) =>
    key === activeLink
      ? "text-sm text-foreground font-medium"
      : "text-sm text-muted-foreground hover:text-foreground transition-colors";

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3 sm:gap-4 min-w-0">
          <div className="flex items-center gap-1 min-w-0">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden shrink-0" aria-label={t("nav.openMenu")}>
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px]">
                <nav className="flex flex-col gap-4 pt-6">
                  <a href={anchor("features")} className="text-sm text-muted-foreground hover:text-foreground transition-colors py-2" onClick={() => setMobileMenuOpen(false)}>
                    {t("nav.benefits")}
                  </a>
                  <a href={anchor("how-it-works")} className="text-sm text-muted-foreground hover:text-foreground transition-colors py-2" onClick={() => setMobileMenuOpen(false)}>
                    {t("nav.howItWorks")}
                  </a>
                  <a href={anchor("pricing")} className="text-sm text-muted-foreground hover:text-foreground transition-colors py-2" onClick={() => setMobileMenuOpen(false)}>
                    {t("nav.pricing")}
                  </a>
                  <Link href="/faq" className={`${linkClass("faq")} py-2`} onClick={() => setMobileMenuOpen(false)}>
                    {t("nav.faq")}
                  </Link>
                  <Link href="/beispiele" className={`${linkClass("beispiele")} py-2`} onClick={() => setMobileMenuOpen(false)}>
                    {t("nav.examples")}
                  </Link>
                  <Link href="/blog" className={`${linkClass("blog")} py-2`} onClick={() => setMobileMenuOpen(false)}>
                    {t("nav.blog")}
                  </Link>
                  <div className="pt-2 border-t">
                    <p className="text-xs font-medium text-muted-foreground/60 uppercase tracking-wider mb-1">{t("nav.topics")}</p>
                    {TOPIC_PAGES.map((tp) => (
                      <Link key={tp.slug} href={`/${tp.slug}`} className="text-sm text-muted-foreground hover:text-foreground transition-colors py-2 block" onClick={() => setMobileMenuOpen(false)}>
                        {tp.heroTitle}
                      </Link>
                    ))}
                  </div>
                  <div className="pt-2 border-t flex items-center gap-2">
                    <ThemeToggle />
                    <LanguageSwitcher />
                  </div>
                </nav>
              </SheetContent>
            </Sheet>
            <Logo height="h-8" />
          </div>
          <div className="hidden md:flex items-center gap-6 shrink-0">
            <a href={anchor("features")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {t("nav.benefits")}
            </a>
            <a href={anchor("how-it-works")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {t("nav.howItWorks")}
            </a>
            <a href={anchor("pricing")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {t("nav.pricing")}
            </a>
            <Link href="/faq" className={linkClass("faq")}>
              {t("nav.faq")}
            </Link>
            <Link href="/beispiele" className={linkClass("beispiele")}>
              {t("nav.examples")}
            </Link>
            <Link href="/blog" className={linkClass("blog")}>
              {t("nav.blog")}
            </Link>
            <div className="relative group">
              <button className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                {t("nav.topics")} <ChevronDown className="h-3 w-3 transition-transform group-hover:rotate-180" />
              </button>
              <div className="absolute top-full right-0 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150">
                <div className="bg-popover border border-border rounded-lg shadow-lg py-1.5 min-w-[260px]">
                  {TOPIC_PAGES.map((tp) => (
                    <Link key={tp.slug} href={`/${tp.slug}`} className="block px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                      {tp.heroTitle}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden md:block">
              <ThemeToggle />
            </div>
            <LanguageSwitcher />
            {isLoading ? null : user ? (
              <Link href="/app">
                <Button data-testid="button-dashboard">{t("nav.myPage")}</Button>
              </Link>
            ) : (
              <Button data-testid="button-login" onClick={handleLoginClick}>{t("nav.login")}</Button>
            )}
          </div>
        </div>
      </nav>
      {!onLoginClick && <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />}
    </>
  );
}
