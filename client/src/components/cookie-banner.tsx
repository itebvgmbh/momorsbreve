import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { updateConsent, type ConsentPrefs } from "@/lib/gtag";

const COOKIE_CONSENT_KEY = "cookie-consent";

// Gespeichert wird JSON {"statistics":bool,"marketing":bool}.
// Legacy-Werte "all"/"necessary" (vor der granularen Umstellung) werden gemappt.
function getStoredConsent(): ConsentPrefs | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!stored) return null;
    if (stored === "all") return { statistics: true, marketing: true };
    if (stored === "necessary") return { statistics: false, marketing: false };
    if (stored.startsWith("{")) {
      const p = JSON.parse(stored);
      return { statistics: !!p.statistics, marketing: !!p.marketing };
    }
    return null;
  } catch {
    return null;
  }
}

export function CookieBanner() {
  const { t } = useTranslation();
  const [consent, setConsent] = useState<ConsentPrefs | null>(null);
  const [mounted, setMounted] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [draft, setDraft] = useState<ConsentPrefs>({ statistics: false, marketing: false });

  useEffect(() => {
    setConsent(getStoredConsent());
    setMounted(true);
  }, []);

  const saveConsent = (prefs: ConsentPrefs) => {
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(prefs));
    } catch {
      /* localStorage evtl. nicht verfügbar – egal */
    }
    setConsent(prefs);
    updateConsent(prefs);
  };

  const handleAcceptAll = () => saveConsent({ statistics: true, marketing: true });
  const handleNecessaryOnly = () => saveConsent({ statistics: false, marketing: false });
  const handleSaveSelection = () => saveConsent(draft);

  if (consent !== null || !mounted) return null;

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-[100] p-4 sm:p-5",
        "bg-background/95 dark:bg-background/95 backdrop-blur-md border-t border-border shadow-lg",
        "animate-in slide-in-from-bottom duration-300"
      )}
    >
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t("cookie.intro")}
            {" "}
            <Link
              href="/datenschutz"
              className="text-primary underline underline-offset-2 hover:no-underline"
            >
              {t("cookie.privacyLink")}
            </Link>
            .
          </p>
          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={handleNecessaryOnly} data-testid="cookie-necessary">
              {t("cookie.necessaryOnly")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDetails((v) => !v)}
              data-testid="cookie-customize"
            >
              {t("cookie.customize")}
            </Button>
            <Button variant="default" size="sm" onClick={handleAcceptAll} data-testid="cookie-accept-all">
              {t("cookie.acceptAll")}
            </Button>
          </div>
        </div>

        {showDetails && (
          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">{t("cookie.catNecessary")}</p>
                <p className="text-xs text-muted-foreground">{t("cookie.catNecessaryDesc")}</p>
              </div>
              <span className="text-xs text-muted-foreground shrink-0">{t("cookie.alwaysActive")}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">{t("cookie.catStatistics")}</p>
                <p className="text-xs text-muted-foreground">{t("cookie.catStatisticsDesc")}</p>
              </div>
              <Switch
                checked={draft.statistics}
                onCheckedChange={(v) => setDraft((d) => ({ ...d, statistics: v }))}
                data-testid="cookie-switch-statistics"
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">{t("cookie.catMarketing")}</p>
                <p className="text-xs text-muted-foreground">{t("cookie.catMarketingDesc")}</p>
              </div>
              <Switch
                checked={draft.marketing}
                onCheckedChange={(v) => setDraft((d) => ({ ...d, marketing: v }))}
                data-testid="cookie-switch-marketing"
              />
            </div>
            <div className="flex justify-end">
              <Button size="sm" onClick={handleSaveSelection} data-testid="cookie-save-selection">
                {t("cookie.saveSelection")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
