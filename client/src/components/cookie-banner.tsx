import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { updateConsent } from "@/lib/gtag";

const COOKIE_CONSENT_KEY = "cookie-consent";

type ConsentStatus = "all" | "necessary" | null;

function getStoredConsent(): ConsentStatus {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (stored === "all" || stored === "necessary") return stored;
    return null;
  } catch {
    return null;
  }
}

export function CookieBanner() {
  const [consent, setConsent] = useState<ConsentStatus>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setConsent(getStoredConsent());
    setMounted(true);
  }, []);

  const saveConsent = (value: "all" | "necessary") => {
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, value);
      setConsent(value);
    } catch {
      setConsent(value);
    }
    updateConsent(value === "all");
  };

  const handleAcceptAll = () => saveConsent("all");
  const handleNecessaryOnly = () => saveConsent("necessary");

  if (consent !== null || !mounted) return null;

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-[100] p-4 sm:p-5",
        "bg-background/95 dark:bg-background/95 backdrop-blur-md border-t border-border shadow-lg",
        "animate-in slide-in-from-bottom duration-300"
      )}
    >
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Wir verwenden notwendige Cookies, um die Website nutzbar zu machen.
          {" "}Mit &bdquo;Alle akzeptieren&ldquo; erlauben Sie Analyse- und
          Marketing-Cookies (Google Analytics, Meta-Pixel), die uns helfen,
          unser Angebot zu verbessern.
          Mehr dazu in unserer{" "}
          <Link
            href="/datenschutz"
            className="text-primary underline underline-offset-2 hover:no-underline"
          >
            Datenschutzerkl&auml;rung
          </Link>
          .
        </p>
        <div className="flex flex-col sm:flex-row gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={handleNecessaryOnly}>
            Nur notwendige
          </Button>
          <Button variant="default" size="sm" onClick={handleAcceptAll}>
            Alle akzeptieren
          </Button>
        </div>
      </div>
    </div>
  );
}
