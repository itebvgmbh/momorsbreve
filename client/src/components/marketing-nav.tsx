import { Link } from "wouter";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { AuthDialog } from "@/components/auth-dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { TOPIC_PAGES } from "@/data/topic-pages";
import { Menu, ChevronDown } from "lucide-react";

interface MarketingNavProps {
  activeLink?: "faq" | "blog" | "beispiele";
  /** If provided, the "Anmelden" button calls this instead of the built-in AuthDialog. */
  onLoginClick?: () => void;
}

export function MarketingNav({ activeLink, onLoginClick }: MarketingNavProps) {
  const { user, isLoading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  const handleLoginClick = onLoginClick ?? (() => setAuthOpen(true));

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
                <Button variant="ghost" size="icon" className="md:hidden shrink-0" aria-label="Åbn menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px]">
                <nav className="flex flex-col gap-4 pt-6">
                  <a href="/#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors py-2" onClick={() => setMobileMenuOpen(false)}>
                    Fordele
                  </a>
                  <a href="/#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors py-2" onClick={() => setMobileMenuOpen(false)}>
                    Sådan virker det
                  </a>
                  <a href="/#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors py-2" onClick={() => setMobileMenuOpen(false)}>
                    Priser
                  </a>
                  <Link href="/faq" className={`${linkClass("faq")} py-2`} onClick={() => setMobileMenuOpen(false)}>
                    FAQ
                  </Link>
                  <Link href="/beispiele" className={`${linkClass("beispiele")} py-2`} onClick={() => setMobileMenuOpen(false)}>
                    Eksempler
                  </Link>
                  <Link href="/blog" className={`${linkClass("blog")} py-2`} onClick={() => setMobileMenuOpen(false)}>
                    Blog
                  </Link>
                  <div className="pt-2 border-t">
                    <p className="text-xs font-medium text-muted-foreground/60 uppercase tracking-wider mb-1">Emner</p>
                    {TOPIC_PAGES.map((tp) => (
                      <Link key={tp.slug} href={`/${tp.slug}`} className="text-sm text-muted-foreground hover:text-foreground transition-colors py-2 block" onClick={() => setMobileMenuOpen(false)}>
                        {tp.heroTitle}
                      </Link>
                    ))}
                  </div>
                  <div className="pt-2 border-t">
                    <ThemeToggle />
                  </div>
                </nav>
              </SheetContent>
            </Sheet>
            <Logo height="h-8" />
          </div>
          <div className="hidden md:flex items-center gap-6 shrink-0">
            <a href="/#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Fordele
            </a>
            <a href="/#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Sådan virker det
            </a>
            <a href="/#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Priser
            </a>
            <Link href="/faq" className={linkClass("faq")}>
              FAQ
            </Link>
            <Link href="/beispiele" className={linkClass("beispiele")}>
              Eksempler
            </Link>
            <Link href="/blog" className={linkClass("blog")}>
              Blog
            </Link>
            <div className="relative group">
              <button className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                Themen <ChevronDown className="h-3 w-3 transition-transform group-hover:rotate-180" />
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
            {isLoading ? null : user ? (
              <Link href="/app">
                <Button data-testid="button-dashboard">Min side</Button>
              </Link>
            ) : (
              <Button data-testid="button-login" onClick={handleLoginClick}>Log ind</Button>
            )}
          </div>
        </div>
      </nav>
      {!onLoginClick && <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />}
    </>
  );
}
