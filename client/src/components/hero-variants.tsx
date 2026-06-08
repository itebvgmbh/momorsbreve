import type { RefObject } from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ImagePlus, Check, ArrowRight, Upload, ShieldCheck } from "lucide-react";

export type HeroVariantId = 0 | 1 | 2 | 3 | 4;
export const DEFAULT_HERO_VARIANT: HeroVariantId = 0;

export const HERO_VARIANT_LABELS: Record<HeroVariantId, string> = {
  0: "Original (Kontrolle)",
  1: "Outcome + Button-CTA (Ich-Form)",
  2: "Single-Stat „2 Minuten“",
  3: "Emotionale Frage + Verlust-Aversion",
  4: "3-Schritt-Stepper + Risk-Reversal",
};

/**
 * Dominante Hypothese + Hebel je Variante (für Admin-Vorschau / Doku).
 * Jede Variante variiert bewusst mehrere Hochwirkungs-Elemente
 * (Headline-Hebel, CTA-Mechanik, CTA-Text, Trust-Signale).
 */
export const HERO_VARIANT_HYPOTHESES: Record<HeroVariantId, string> = {
  0: "Baseline – aktueller Hero unverändert (Dropzone, 8 Häkchen).",
  1: "Ergebnis-Headline + Ich-Form-Button (statt Dropzone) + nur 3 nutzenorientierte Häkchen senken die Aktivierungsenergie und heben die Klickrate.",
  2: "Single-Stat-Hero (eine große Zahl: 2 Minuten) committet auf den stärksten Claim; eine einzige Trust-Zeile statt vieler Häkchen reduziert Clutter.",
  3: "Rhetorische Frage + Verlust-Aversion („bevor es niemand mehr lesen kann“) + große Dropzone aktivieren die emotionale Motivation.",
  4: "Goal-Gradient (1-2-3-Stepper) + Reziprozität (Gratis-Vorschau) + Garantie-Badge (Risk-Reversal) gegen Regret-Aversion.",
};

interface HeroBlockProps {
  variant: HeroVariantId;
  isLoggedIn: boolean;
  dragOver: boolean;
  setDragOver: (value: boolean) => void;
  fileInputRef: RefObject<HTMLInputElement>;
  onFileSelected: (file: File) => void;
}

type TrustConfig =
  | { type: "bullets"; items: string[] }
  | { type: "line"; text: string }
  | { type: "guarantee"; text: string };

interface HeroConfig {
  badge?: string;
  headlineMode: "standard" | "stat";
  statValue?: string;
  statCaption?: string;
  titleLine1: string;
  titleAccent: string;
  subtitle: string;
  ctaMode: "dropzone" | "button";
  dropzoneSize?: "md" | "lg";
  dropzoneTitle?: string;
  dropzoneSubtitle?: string;
  buttonLabel?: string;
  buttonSubtext?: string;
  note?: string;
  steps?: string[];
  trust: TrustConfig;
}

function buildHeroConfigs(t: TFunction): Record<HeroVariantId, HeroConfig> {
  const originalBullets = [
    t("hero.bulletAsEasyAsPhoto"),
    t("hero.bulletResultInMinutes"),
    t("hero.bulletEditInApp"),
    t("hero.bulletTranslationIncluded"),
    t("hero.bulletReadAloudGiveAway"),
    t("hero.bulletExportPdfImage"),
    t("hero.bulletSecurePrivate"),
    t("hero.bulletNoSubscription"),
  ];

  return {
    0: {
      badge: t("hero.v0Badge"),
      headlineMode: "standard",
      titleLine1: t("hero.v0TitleLine1"),
      titleAccent: t("hero.v0TitleAccent"),
      subtitle: t("hero.v0Subtitle"),
      ctaMode: "dropzone",
      dropzoneSize: "md",
      dropzoneTitle: t("hero.v0DropzoneTitle"),
      dropzoneSubtitle: t("hero.v0DropzoneSubtitle"),
      note: t("hero.v0Note"),
      trust: { type: "bullets", items: originalBullets },
    },
    1: {
      badge: t("hero.v1Badge"),
      headlineMode: "standard",
      titleLine1: t("hero.v1TitleLine1"),
      titleAccent: t("hero.v1TitleAccent"),
      subtitle: t("hero.v1Subtitle"),
      ctaMode: "button",
      buttonLabel: t("hero.v1ButtonLabel"),
      buttonSubtext: t("hero.v1ButtonSubtext"),
      trust: {
        type: "bullets",
        items: [t("hero.v1Bullet1"), t("hero.v1Bullet2"), t("hero.v1Bullet3")],
      },
    },
    2: {
      headlineMode: "stat",
      statValue: t("hero.v2StatValue"),
      statCaption: t("hero.v2StatCaption"),
      titleLine1: t("hero.v2TitleLine1"),
      titleAccent: t("hero.v2TitleAccent"),
      subtitle: t("hero.v2Subtitle"),
      ctaMode: "button",
      buttonLabel: t("hero.v2ButtonLabel"),
      buttonSubtext: t("hero.v2ButtonSubtext"),
      trust: {
        type: "line",
        text: t("hero.v2TrustLine"),
      },
    },
    3: {
      badge: t("hero.v3Badge"),
      headlineMode: "standard",
      titleLine1: t("hero.v3TitleLine1"),
      titleAccent: t("hero.v3TitleAccent"),
      subtitle: t("hero.v3Subtitle"),
      ctaMode: "dropzone",
      dropzoneSize: "lg",
      dropzoneTitle: t("hero.v3DropzoneTitle"),
      dropzoneSubtitle: t("hero.v3DropzoneSubtitle"),
      trust: {
        type: "bullets",
        items: [t("hero.v3Bullet1"), t("hero.v3Bullet2"), t("hero.v3Bullet3")],
      },
    },
    4: {
      badge: t("hero.v4Badge"),
      headlineMode: "standard",
      titleLine1: t("hero.v4TitleLine1"),
      titleAccent: t("hero.v4TitleAccent"),
      subtitle: t("hero.v4Subtitle"),
      ctaMode: "button",
      buttonLabel: t("hero.v4ButtonLabel"),
      steps: [t("hero.v4Step1"), t("hero.v4Step2"), t("hero.v4Step3")],
      trust: { type: "guarantee", text: t("hero.v4Guarantee") },
    },
  };
}

function HeroTrust({ trust }: { trust: TrustConfig }) {
  if (trust.type === "line") {
    return (
      <div className="flex items-start gap-2 text-sm text-white/75 max-w-xl" data-testid="hero-trust-line">
        <Check className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
        <span>{trust.text}</span>
      </div>
    );
  }
  if (trust.type === "guarantee") {
    return (
      <div
        className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/40 bg-emerald-400/10 px-4 py-2.5 text-sm font-medium text-emerald-100"
        data-testid="hero-trust-guarantee"
      >
        <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0" />
        <span>{trust.text}</span>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-4 text-sm text-white/60" data-testid="hero-trust-bullets">
      {trust.items.map((bullet) => (
        <span key={bullet} className="flex items-center gap-1.5">
          <Check className="h-3.5 w-3.5 text-emerald-400" />
          {bullet}
        </span>
      ))}
    </div>
  );
}

export function HeroBlock({
  variant,
  isLoggedIn,
  dragOver,
  setDragOver,
  fileInputRef,
  onFileSelected,
}: HeroBlockProps) {
  const { t } = useTranslation();
  const heroConfigs = buildHeroConfigs(t);
  const config = heroConfigs[variant] ?? heroConfigs[0];
  const largeDropzone = config.dropzoneSize === "lg";

  const openPicker = () => fileInputRef.current?.click();

  const hiddenInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept="image/*,.pdf,application/pdf"
      className="hidden"
      onChange={(e) => {
        const f = e.target.files?.[0];
        if (f) onFileSelected(f);
      }}
    />
  );

  return (
    <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-24 sm:py-32 md:py-40">
      <div className="max-w-2xl">
        {config.badge && (
          <Badge variant="secondary" className="mb-6 bg-white/10 text-white/90 border-white/20">
            {config.badge}
          </Badge>
        )}

        {config.headlineMode === "stat" ? (
          <h1 className="mb-6" data-testid="text-hero-title">
            <span className="block font-serif text-6xl sm:text-7xl md:text-8xl font-bold text-amber-300 leading-none">
              {config.statValue}
            </span>
            <span className="mt-3 block font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-white leading-tight">
              {config.statCaption}
            </span>
          </h1>
        ) : (
          <h1
            className="font-serif text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-tight mb-6"
            data-testid="text-hero-title"
          >
            {config.titleLine1}
            <br />
            <span className="text-amber-300">{config.titleAccent}</span>
          </h1>
        )}

        <p className="text-lg sm:text-xl text-white/80 mb-8 leading-relaxed max-w-xl">{config.subtitle}</p>

        {config.steps && (
          <div className="flex flex-col sm:flex-row gap-3 mb-8 max-w-xl" data-testid="hero-stepper">
            {config.steps.map((step, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2.5 rounded-lg bg-white/5 border border-white/15 px-3 py-2.5 backdrop-blur-sm flex-1"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white text-sm font-bold">
                  {idx + 1}
                </span>
                <span className="text-sm text-white/90 leading-tight">{step}</span>
              </div>
            ))}
          </div>
        )}

        {isLoggedIn ? (
          <div className="flex flex-wrap items-start gap-3 mb-8">
            <Link href="/app">
              <Button size="lg" className="bg-amber-600 border-amber-700 text-white" data-testid="button-hero-start">
                {t("hero.toDashboard")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        ) : (
          <div className="mb-8 space-y-4">
            {hiddenInput}

            {config.ctaMode === "button" ? (
              <div className="space-y-2">
                <Button
                  size="lg"
                  onClick={openPicker}
                  className="h-auto bg-amber-500 hover:bg-amber-400 border-amber-600 text-black font-semibold text-base sm:text-lg px-6 py-4 shadow-lg shadow-amber-900/30"
                  data-testid="hero-cta-button"
                >
                  <Upload className="mr-2 h-5 w-5" />
                  {config.buttonLabel}
                </Button>
                {config.buttonSubtext && <p className="text-sm text-white/60">{config.buttonSubtext}</p>}
              </div>
            ) : (
              <div
                className={`relative rounded-xl border-2 border-dashed backdrop-blur-sm text-center transition-all cursor-pointer ${
                  largeDropzone ? "p-8 sm:p-10 max-w-xl" : "p-6 sm:p-8 max-w-md"
                } ${
                  dragOver
                    ? "border-amber-400 bg-amber-400/15"
                    : "border-white/30 bg-white/5 hover:border-amber-400/60 hover:bg-white/10"
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const f = e.dataTransfer.files[0];
                  if (f) onFileSelected(f);
                }}
                onClick={openPicker}
                data-testid="hero-dropzone"
              >
                <ImagePlus className={`text-amber-300 mx-auto mb-3 ${largeDropzone ? "h-12 w-12" : "h-10 w-10"}`} />
                <p className={`text-white font-semibold ${largeDropzone ? "text-xl" : "text-lg"}`}>
                  {config.dropzoneTitle}
                </p>
                <p className="text-white/60 text-sm mt-1">{config.dropzoneSubtitle}</p>
              </div>
            )}

            {config.note && <p className="text-sm text-white/50 max-w-md">{config.note}</p>}
          </div>
        )}

        <HeroTrust trust={config.trust} />
      </div>
    </div>
  );
}
