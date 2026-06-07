import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Sparkles,
  Loader2,
  Lock,
  CreditCard,
  Clock,
  Gift,
  CheckCircle,
  Users,
  UserCheck,
  ShieldCheck,
  FileText,
  ArrowRight,
  Eye,
  Star,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
} from "lucide-react";
import { getScriptTypeDisplayLabel } from "@shared/models/transcription";
import type { QualityDetails } from "@/components/quality-indicator";

const CTA_VARIANT_KEY = "ctaVariantV2";
export const DEFAULT_CTA_VARIANT: CtaVariantId = 9;

export type CtaVariantId = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;

export const CTA_VARIANT_LABELS: Record<CtaVariantId, string> = {
  0: "Original (aktuell)",
  1: "Fortschritt + Social Proof",
  2: "Blurred Content Reveal",
  3: "Benefit-Headline + Trust-Badges",
  4: "Personalisierte CTA",
  5: "Zwei-Stufen Micro-Commitment",
  6: "🔥 Vorschau + Inline-CTA",
  7: "🔥 Vorschau mit Lock-Overlay (Pro)",
  8: "🔥 Snippet + Fortschritt + CTA",
  9: "🔥 Split-Card: Snippet links, CTA rechts",
  10: "🔥 Snippet mit Action-Footer",
  11: "🧠 Nur Zusammenfassung + Qualität",
  12: "🧠 Zusammenfassung + Split-CTA",
  13: "🧠 Zusammenfassung kompakt + Action-Footer",
};

/**
 * Varianten 6+ enthalten die Transkriptionsvorschau oder eine Zusammenfassung.
 * Die analysieren.tsx-Seite sollte in diesem Fall die separate Vorschau-Karte
 * NICHT zusätzlich rendern.
 */
export function ctaVariantEmbedsPreview(v: CtaVariantId): boolean {
  return v >= 6;
}

/**
 * Varianten 11-13 integrieren die QualityIndicator-Daten (Lesbarkeit, Konfidenz,
 * Zusammenfassung) direkt in die Karte. Die separate QualityIndicator-Komponente
 * sollte bei diesen Varianten NICHT gerendert werden.
 */
export function ctaVariantEmbedsQuality(v: CtaVariantId): boolean {
  return v >= 11;
}

export function getActiveCtaVariant(): CtaVariantId {
  try {
    const raw = localStorage.getItem(CTA_VARIANT_KEY);
    if (raw === null) return DEFAULT_CTA_VARIANT;
    const v = parseInt(raw, 10);
    if (v >= 0 && v <= 13) return v as CtaVariantId;
  } catch {}
  return DEFAULT_CTA_VARIANT;
}

export function setActiveCtaVariant(v: CtaVariantId) {
  localStorage.setItem(CTA_VARIANT_KEY, String(v));
}

interface CtaProps {
  scriptType: string;
  quality: QualityDetails | null;
  transcriptionSnippet: string | null;
  claiming: boolean;
  onAction: (action: "transcribe" | "expert") => void;
}

// ---------- Variante 0: Original ----------
function CtaOriginal({ scriptType, claiming, onAction }: CtaProps) {
  return (
    <div className="relative overflow-hidden rounded-xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-amber-50/80 dark:from-primary/20 dark:via-primary/10 dark:to-amber-950/30 p-6 sm:p-8 shadow-lg shadow-primary/5 animate-in fade-in slide-in-from-bottom-3 duration-500">
      <div className="absolute -top-12 -right-12 w-40 h-40 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-amber-300/10 rounded-full blur-2xl pointer-events-none" />
      <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-5">
        <div className="flex-1 space-y-2">
          <p className="text-sm font-medium text-primary/80">
            Erkannte Schrift: <strong className="text-foreground">{getScriptTypeDisplayLabel(scriptType)}</strong>
          </p>
          <h3 className="font-serif text-xl sm:text-2xl font-bold leading-tight">
            Jetzt kostenlos transkribieren lassen
          </h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Unsere KI wandelt Ihre Handschrift in lesbaren Text um. Kurze Anmeldung nötig – Sie erhalten <strong className="text-foreground">3 Seiten gratis</strong>.
          </p>
        </div>
        <Button
          size="lg"
          onClick={() => onAction("transcribe")}
          className="shrink-0 text-base px-8 py-6 rounded-xl shadow-md hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] bg-primary hover:bg-primary/90"
          disabled={claiming}
        >
          {claiming ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Sparkles className="h-5 w-5 mr-2" />}
          Jetzt starten – gratis
        </Button>
      </div>
    </div>
  );
}

// ---------- Variante 1: Fortschritt + Social Proof ----------
function CtaProgressSocialProof({ scriptType, quality, claiming, onAction }: CtaProps) {
  const score = quality ? Math.round((quality.readability + quality.confidence) / 2) : null;
  return (
    <div className="relative overflow-hidden rounded-xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-amber-50/80 dark:from-primary/20 dark:via-primary/10 dark:to-amber-950/30 p-6 sm:p-8 shadow-lg shadow-primary/5 animate-in fade-in slide-in-from-bottom-3 duration-500">
      <div className="absolute -top-12 -right-12 w-40 h-40 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-amber-300/10 rounded-full blur-2xl pointer-events-none" />
      <div className="relative space-y-5">
        {/* Progress bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full w-[80%] bg-primary rounded-full transition-all duration-1000" />
          </div>
          <span className="text-sm font-semibold text-primary whitespace-nowrap">80% geschafft</span>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="flex-1 space-y-2">
            <h3 className="font-serif text-xl sm:text-2xl font-bold leading-tight">
              Ihr Dokument ist bereit zur Transkription
            </h3>
            <p className="text-sm text-muted-foreground max-w-md">
              {score !== null && score >= 70 ? (
                <>Qualität: <strong className="text-foreground">{score}%</strong> – perfekt für unsere KI. </>
              ) : (
                <>Erkannte Schrift: <strong className="text-foreground">{getScriptTypeDisplayLabel(scriptType)}</strong>. </>
              )}
              Nur noch ein Klick bis zum vollständigen Text.
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1">
              <div className="flex items-center gap-2">
                <Gift className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="text-xs text-muted-foreground"><strong className="text-foreground">3 Seiten komplett gratis</strong> – keine Kreditkarte</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-xs text-muted-foreground">Bereits <strong className="text-foreground">12.400+</strong> Seiten transkribiert</span>
              </div>
            </div>
          </div>
          <Button
            size="lg"
            onClick={() => onAction("transcribe")}
            className="shrink-0 text-base px-8 py-6 rounded-xl shadow-md hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] bg-primary hover:bg-primary/90"
            disabled={claiming}
          >
            {claiming ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Sparkles className="h-5 w-5 mr-2" />}
            Vollständigen Text erhalten
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------- Variante 2: Blurred Content Reveal ----------
function CtaBlurredReveal({ transcriptionSnippet, claiming, onAction }: CtaProps) {
  const snippet = transcriptionSnippet || "";
  const visible = snippet.slice(0, 100);
  const blurred = snippet.slice(100, 500) || "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam...";

  return (
    <Card className="relative overflow-hidden p-0 animate-in fade-in slide-in-from-bottom-3 duration-500">
      <div className="p-5 pb-0">
        <p className="font-mono text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
          {visible}
        </p>
      </div>
      <div className="relative px-5 pb-5">
        <p className="font-mono text-sm leading-relaxed whitespace-pre-wrap text-foreground/90 blur-[4px] select-none pointer-events-none" aria-hidden>
          {blurred}
        </p>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-card/95 backdrop-blur-sm rounded-xl p-6 sm:p-8 text-center shadow-2xl border border-primary/20 max-w-sm mx-auto">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-3">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-serif text-lg sm:text-xl font-bold mb-2">
              Vollständige Transkription freischalten
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Kostenlos – <strong className="text-foreground">3 Seiten gratis</strong>, keine Kreditkarte nötig
            </p>
            <Button
              size="lg"
              onClick={() => onAction("transcribe")}
              className="w-full text-base py-5 rounded-xl shadow-md hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
              disabled={claiming}
            >
              {claiming ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Sparkles className="h-5 w-5 mr-2" />}
              Text freischalten
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ---------- Variante 3: Benefit-Headline + Trust-Badges ----------
function CtaBenefitTrust({ scriptType, quality, claiming, onAction }: CtaProps) {
  const score = quality ? Math.round((quality.readability + quality.confidence) / 2) : null;
  return (
    <div className="relative overflow-hidden rounded-xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-amber-50/80 dark:from-primary/20 dark:via-primary/10 dark:to-amber-950/30 p-6 sm:p-8 shadow-lg shadow-primary/5 animate-in fade-in slide-in-from-bottom-3 duration-500">
      <div className="absolute -top-12 -right-12 w-40 h-40 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-amber-300/10 rounded-full blur-2xl pointer-events-none" />
      <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-5">
        <div className="flex-1 space-y-3">
          <h3 className="font-serif text-xl sm:text-2xl font-bold leading-tight">
            Lesen Sie, was Ihre Vorfahren geschrieben haben
          </h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Unsere KI hat{" "}
            {score !== null ? (
              <><strong className="text-foreground">{score}%</strong> der </>
            ) : (
              <>die </>
            )}
            {getScriptTypeDisplayLabel(scriptType)}-Schrift erkannt – Ihr Ergebnis ist nur einen Klick entfernt.
          </p>
          <div className="flex flex-wrap gap-x-5 gap-y-2 pt-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CreditCard className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Keine Kreditkarte</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Anmeldung in 10 Sekunden</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Gift className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>3 Seiten komplett gratis</span>
            </div>
          </div>
        </div>
        <Button
          size="lg"
          onClick={() => onAction("transcribe")}
          className="shrink-0 text-base px-8 py-6 rounded-xl shadow-md hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] bg-primary hover:bg-primary/90"
          disabled={claiming}
        >
          {claiming ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Sparkles className="h-5 w-5 mr-2" />}
          Mein Ergebnis anzeigen
        </Button>
      </div>
    </div>
  );
}

// ---------- Variante 4: Personalisierte CTA ----------
function CtaPersonalized({ scriptType, quality, claiming, onAction }: CtaProps) {
  const score = quality ? Math.round((quality.readability + quality.confidence) / 2) : null;
  const isHighQuality = score !== null && score >= 70;

  return (
    <div className="relative overflow-hidden rounded-xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-amber-50/80 dark:from-primary/20 dark:via-primary/10 dark:to-amber-950/30 p-6 sm:p-8 shadow-lg shadow-primary/5 animate-in fade-in slide-in-from-bottom-3 duration-500">
      <div className="absolute -top-12 -right-12 w-40 h-40 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-amber-300/10 rounded-full blur-2xl pointer-events-none" />
      <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-5">
        <div className="flex-1 space-y-3">
          {isHighQuality ? (
            <>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-xs font-medium">
                <CheckCircle className="h-3.5 w-3.5" />
                Hervorragende Qualität erkannt
              </div>
              <h3 className="font-serif text-xl sm:text-2xl font-bold leading-tight">
                Ihr {getScriptTypeDisplayLabel(scriptType)}-Dokument ist optimal lesbar
              </h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Bei dieser Qualität (<strong className="text-foreground">{score}%</strong>) liefert unsere KI besonders präzise Ergebnisse. Starten Sie jetzt – <strong className="text-foreground">3 Seiten gratis</strong>.
              </p>
            </>
          ) : (
            <>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 text-xs font-medium">
                <ShieldCheck className="h-3.5 w-3.5" />
                Spezialisiert auf schwierige Handschriften
              </div>
              <h3 className="font-serif text-xl sm:text-2xl font-bold leading-tight">
                Auch bei schwierigerer Schrift – unsere KI schafft das
              </h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Wir haben bereits tausende {getScriptTypeDisplayLabel(scriptType)}-Dokumente erfolgreich transkribiert. Testen Sie es – <strong className="text-foreground">3 Seiten gratis</strong>.
              </p>
            </>
          )}
        </div>
        <Button
          size="lg"
          onClick={() => onAction("transcribe")}
          className="shrink-0 text-base px-8 py-6 rounded-xl shadow-md hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] bg-primary hover:bg-primary/90"
          disabled={claiming}
        >
          {claiming ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Sparkles className="h-5 w-5 mr-2" />}
          Meine Transkription abrufen
        </Button>
      </div>
    </div>
  );
}

// ---------- Variante 5: Zwei-Stufen Micro-Commitment ----------
function CtaMicroCommitment({ claiming, onAction }: CtaProps) {
  return (
    <div className="relative overflow-hidden rounded-xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-amber-50/80 dark:from-primary/20 dark:via-primary/10 dark:to-amber-950/30 p-6 sm:p-8 shadow-lg shadow-primary/5 animate-in fade-in slide-in-from-bottom-3 duration-500">
      <div className="absolute -top-12 -right-12 w-40 h-40 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-amber-300/10 rounded-full blur-2xl pointer-events-none" />
      <div className="relative space-y-5">
        <h3 className="font-serif text-xl sm:text-2xl font-bold leading-tight text-center sm:text-left">
          Wie möchten Sie Ihre Transkription erhalten?
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => onAction("transcribe")}
            disabled={claiming}
            className="relative p-5 rounded-xl border-2 border-primary bg-primary/5 text-left hover:bg-primary/10 transition-all hover:shadow-md disabled:opacity-50 group"
          >
            <Sparkles className="h-5 w-5 text-primary mb-2" />
            <p className="font-semibold text-base">KI-Transkription</p>
            <p className="text-xs text-muted-foreground mt-1">Sofortergebnis, 3 Seiten gratis</p>
            <span className="inline-flex items-center gap-1 mt-3 text-xs font-medium text-primary">
              Beliebteste Wahl
              <span className="transition-transform group-hover:translate-x-0.5">→</span>
            </span>
            {claiming && <Loader2 className="absolute top-5 right-5 h-4 w-4 animate-spin text-primary" />}
          </button>

          <button
            onClick={() => onAction("expert")}
            disabled={claiming}
            className="p-5 rounded-xl border text-left hover:bg-muted/50 transition-all hover:shadow-md disabled:opacity-50 group"
          >
            <UserCheck className="h-5 w-5 text-muted-foreground mb-2" />
            <p className="font-semibold text-base">Experten-Transkription</p>
            <p className="text-xs text-muted-foreground mt-1">Von Hand geprüft, ab 4,90 €</p>
            <span className="inline-flex items-center gap-1 mt-3 text-xs font-medium text-muted-foreground">
              Höchste Genauigkeit
              <span className="transition-transform group-hover:translate-x-0.5">→</span>
            </span>
          </button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Kostenlose Anmeldung in 10 Sekunden – keine Kreditkarte nötig
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// NEUE VARIANTEN 6–10: Vorschau + CTA in einer einzigen Karte
// Diese Varianten ersetzen die separate „Transkriptionsvorschau"-Karte.
// ═══════════════════════════════════════════════════════════════════════════

const PLACEHOLDER_SNIPPET = "Frankfurt, 22.07.1925\n\nLiebe Mutter,\n\nendlich finde ich Zeit, Dir ausführlich zu schreiben. Die Reise war lang und beschwerlich, doch hier in der neuen Wohnung fühle ich mich bereits heimisch. Die Vermieterin ist eine herzliche Frau und der Blick aus dem Fenster geht direkt auf den alten Marktplatz mit seinem Brunnen…";

function getSnippetOrPlaceholder(snippet: string | null): string {
  if (snippet && snippet.trim().length > 0) return snippet;
  return PLACEHOLDER_SNIPPET;
}

// ---------- Variante 6: Vorschau + Inline-CTA (einfachste Integration) ----------
function CtaPreviewInline({ scriptType, transcriptionSnippet, claiming, onAction }: CtaProps) {
  const snippet = getSnippetOrPlaceholder(transcriptionSnippet);
  const visible = snippet.slice(0, 220);

  return (
    <Card className="relative overflow-hidden border-2 border-primary/30 shadow-lg shadow-primary/5 animate-in fade-in slide-in-from-bottom-3 duration-500">
      <div className="p-5 sm:p-6 pb-3">
        <h2 className="font-serif text-lg font-semibold mb-3 flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Transkriptionsvorschau
        </h2>
        <div className="relative">
          <p className="font-mono text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
            {visible}
          </p>
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-card to-transparent pointer-events-none" />
        </div>
      </div>

      <div className="relative bg-gradient-to-br from-primary/10 via-primary/5 to-amber-50/80 dark:from-primary/20 dark:via-primary/10 dark:to-amber-950/30 border-t border-primary/20 p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1 space-y-1">
            <p className="text-sm font-semibold text-foreground">
              Vollständigen Text jetzt freischalten
            </p>
            <p className="text-xs text-muted-foreground">
              Erkannte Schrift: <strong className="text-foreground">{getScriptTypeDisplayLabel(scriptType)}</strong>
              {" · "}
              <span className="text-emerald-700 dark:text-emerald-400 font-medium">3 Seiten gratis</span>, keine Kreditkarte
            </p>
          </div>
          <Button
            size="lg"
            onClick={() => onAction("transcribe")}
            className="shrink-0 text-base px-7 py-5 rounded-xl shadow-md hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
            disabled={claiming}
          >
            {claiming ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Sparkles className="h-5 w-5 mr-2" />}
            Vollständigen Text erhalten
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ---------- Variante 7: Lock-Overlay mit sichtbarem Snippet-Anriss ----------
function CtaPreviewLocked({ scriptType, transcriptionSnippet, claiming, onAction }: CtaProps) {
  const snippet = getSnippetOrPlaceholder(transcriptionSnippet);
  const visible = snippet.slice(0, 140);
  const blurred = snippet.slice(140, 600) || "weitere Zeilen werden nach der Anmeldung sichtbar…";

  return (
    <Card className="relative overflow-hidden border-2 border-primary/30 shadow-lg shadow-primary/5 animate-in fade-in slide-in-from-bottom-3 duration-500">
      <div className="p-5 sm:p-6 pb-2 flex items-center justify-between">
        <h2 className="font-serif text-lg font-semibold flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Transkriptionsvorschau
        </h2>
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-full">
          <Eye className="h-3.5 w-3.5" /> Anriss
        </span>
      </div>

      <div className="px-5 sm:px-6">
        <p className="font-mono text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
          {visible}
        </p>
      </div>

      <div className="relative px-5 sm:px-6 pb-5 pt-2">
        <p className="font-mono text-sm leading-relaxed whitespace-pre-wrap text-foreground/80 blur-[5px] select-none pointer-events-none min-h-[120px]" aria-hidden>
          {blurred}
        </p>
        <div className="absolute inset-0 flex items-center justify-center px-4">
          <div className="bg-card/95 backdrop-blur-sm rounded-xl px-5 py-4 sm:px-6 sm:py-5 text-center shadow-2xl border-2 border-primary/40 max-w-md w-full">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-primary/10">
                <Lock className="h-4.5 w-4.5 text-primary" />
              </div>
              <p className="font-serif text-base sm:text-lg font-bold">
                Sehen Sie den vollständigen Text
              </p>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              {getScriptTypeDisplayLabel(scriptType)} erkannt · <strong className="text-foreground">3 Seiten gratis</strong> · keine Kreditkarte
            </p>
            <Button
              size="lg"
              onClick={() => onAction("transcribe")}
              className="w-full text-base py-5 rounded-xl shadow-md hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
              disabled={claiming}
            >
              {claiming ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Sparkles className="h-5 w-5 mr-2" />}
              Jetzt freischalten – gratis
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ---------- Variante 8: Snippet + Fortschritt + CTA ----------
function CtaPreviewProgress({ scriptType, quality, transcriptionSnippet, claiming, onAction }: CtaProps) {
  const snippet = getSnippetOrPlaceholder(transcriptionSnippet);
  const visible = snippet.slice(0, 200);
  const score = quality ? Math.round((quality.readability + quality.confidence) / 2) : null;

  return (
    <Card className="relative overflow-hidden border-2 border-primary/30 shadow-lg shadow-primary/5 animate-in fade-in slide-in-from-bottom-3 duration-500">
      {/* Fortschritts-Header */}
      <div className="bg-gradient-to-r from-primary/15 via-primary/10 to-amber-50/60 dark:from-primary/25 dark:via-primary/15 dark:to-amber-950/30 px-5 sm:px-6 py-4 border-b border-primary/20">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex-1 h-2 bg-background/60 rounded-full overflow-hidden">
            <div className="h-full w-[80%] bg-primary rounded-full transition-all duration-1000" />
          </div>
          <span className="text-xs font-semibold text-primary whitespace-nowrap">
            Schritt 4 von 5
          </span>
        </div>
        <h2 className="font-serif text-lg sm:text-xl font-bold leading-tight">
          Ihre Vorschau ist fertig – ein Klick zum vollständigen Text
        </h2>
      </div>

      {/* Snippet */}
      <div className="p-5 sm:p-6 pb-3">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            Transkriptionsvorschau
          </span>
        </div>
        <div className="relative">
          <p className="font-mono text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
            {visible}
          </p>
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-card to-transparent pointer-events-none" />
        </div>
      </div>

      {/* CTA-Footer */}
      <div className="px-5 sm:px-6 pb-5 pt-3 border-t border-border bg-muted/20">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
          <div className="flex-1 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              {score !== null ? `${score}% Qualität` : "Bereit"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Gift className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <strong className="text-foreground">3 Seiten gratis</strong>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              Keine Kreditkarte
            </span>
          </div>
          <Button
            size="lg"
            onClick={() => onAction("transcribe")}
            className="shrink-0 text-base px-6 py-5 rounded-xl shadow-md hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
            disabled={claiming}
          >
            {claiming ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Sparkles className="h-5 w-5 mr-2" />}
            Vollständigen Text laden
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ---------- Variante 9: Split-Card – Snippet links, CTA rechts ----------
function CtaPreviewSplit({ scriptType, quality, transcriptionSnippet, claiming, onAction }: CtaProps) {
  const snippet = getSnippetOrPlaceholder(transcriptionSnippet);
  const visible = snippet.slice(0, 280);
  const score = quality ? Math.round((quality.readability + quality.confidence) / 2) : null;

  return (
    <Card
      className="relative overflow-hidden border-2 border-primary/30 shadow-lg shadow-primary/5 animate-in fade-in slide-in-from-bottom-3 duration-500"
      data-testid="cta-preview-split"
    >
      <div className="grid grid-cols-1 md:grid-cols-[1fr,18rem]">
        {/* CTA-Seite – mobil oben, Desktop rechts */}
        <div className="relative order-first md:order-last bg-gradient-to-br from-primary/10 via-primary/5 to-amber-50/80 dark:from-primary/20 dark:via-primary/10 dark:to-amber-950/30 p-5 sm:p-6 flex flex-col justify-center border-b md:border-b-0 md:border-l border-primary/20">
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-amber-300/10 rounded-full blur-2xl pointer-events-none" />
          <div className="relative space-y-3">
            <h3 className="font-serif text-lg font-bold leading-tight">
              Vollständigen Text erhalten
            </h3>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li className="flex items-start gap-1.5">
                <Gift className="h-3.5 w-3.5 mt-0.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span><strong className="text-foreground">3 Seiten gratis</strong> bei Anmeldung</span>
              </li>
              <li className="flex items-start gap-1.5">
                <Clock className="h-3.5 w-3.5 mt-0.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Anmeldung in 10 Sekunden</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CreditCard className="h-3.5 w-3.5 mt-0.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Keine Kreditkarte nötig</span>
              </li>
            </ul>
            <Button
              size="lg"
              onClick={() => onAction("transcribe")}
              className="w-full text-sm sm:text-base px-4 py-5 rounded-xl shadow-md hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
              disabled={claiming}
              data-testid="cta-preview-split-button"
            >
              {claiming ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Vollständigen Text laden
            </Button>
            <p className="hidden md:flex items-center gap-1.5 text-[11px] text-muted-foreground pt-1">
              <Users className="h-3 w-3 shrink-0" />
              Bereits <strong className="text-foreground">12.400+</strong> Seiten transkribiert
            </p>
          </div>
        </div>

        {/* Snippet-Seite – mobil unten, Desktop links */}
        <div className="p-5 sm:p-6 order-last md:order-first">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-xs uppercase tracking-wider text-primary font-semibold">
                Ihre Vorschau
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground hidden sm:inline">
              {getScriptTypeDisplayLabel(scriptType)}
            </span>
          </div>
          <div className="relative min-h-[140px]">
            <p className="font-mono text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
              {visible}
            </p>
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-card to-transparent pointer-events-none" />
          </div>
          <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border/60">
            Erkannte Schrift: <strong className="text-foreground">{getScriptTypeDisplayLabel(scriptType)}</strong>
          </p>
        </div>
      </div>
    </Card>
  );
}

// ---------- Variante 10: Snippet mit Action-Footer (Sticky-Look) ----------
function CtaPreviewActionFooter({ scriptType, quality, transcriptionSnippet, claiming, onAction }: CtaProps) {
  const snippet = getSnippetOrPlaceholder(transcriptionSnippet);
  const visible = snippet.slice(0, 240);
  const score = quality ? Math.round((quality.readability + quality.confidence) / 2) : null;

  return (
    <Card className="relative overflow-hidden border-2 border-primary/30 shadow-xl shadow-primary/10 animate-in fade-in slide-in-from-bottom-3 duration-500">
      {/* Header */}
      <div className="px-5 sm:px-6 pt-5 pb-3 flex items-center justify-between gap-3">
        <h2 className="font-serif text-lg font-semibold flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Transkriptionsvorschau
        </h2>
        {score !== null && (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 px-2.5 py-1 rounded-full">
            <CheckCircle className="h-3.5 w-3.5" />
            {score}% Qualität
          </span>
        )}
      </div>

      {/* Snippet mit Fade */}
      <div className="relative px-5 sm:px-6 pb-4">
        <p className="font-mono text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
          {visible}
        </p>
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-card to-transparent pointer-events-none" />
      </div>

      {/* Auffälliger Action-Footer */}
      <div className="relative bg-primary text-primary-foreground px-5 sm:px-6 py-4">
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider rounded-full shadow-md border-2 border-card">
          Nur noch ein Klick
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex-1 space-y-0.5">
            <p className="text-sm font-semibold">
              Vollständigen Text aus {getScriptTypeDisplayLabel(scriptType)} freischalten
            </p>
            <p className="text-xs text-primary-foreground/80">
              3 Seiten kostenlos · keine Kreditkarte · 10-Sekunden-Anmeldung
            </p>
          </div>
          <Button
            size="lg"
            variant="secondary"
            onClick={() => onAction("transcribe")}
            className="shrink-0 text-base px-6 py-5 rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] bg-card text-foreground hover:bg-card/90 font-semibold"
            disabled={claiming}
          >
            {claiming ? (
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-5 w-5 mr-2 text-primary" />
            )}
            Jetzt freischalten
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// VARIANTEN 11–13: Nur Zusammenfassung + Qualität – KEIN Transkriptions-Snippet
// Diese Varianten ersetzen SOWOHL die Vorschau-Karte ALS AUCH die QualityIndicator.
// ═══════════════════════════════════════════════════════════════════════════

const QUALITY_LEVEL_CONFIG = {
  green: {
    bg: "bg-emerald-100 dark:bg-emerald-900/30",
    text: "text-emerald-700 dark:text-emerald-400",
    icon: CheckCircle2,
    label: "Gut lesbar",
  },
  yellow: {
    bg: "bg-amber-100 dark:bg-amber-900/30",
    text: "text-amber-700 dark:text-amber-400",
    icon: AlertTriangle,
    label: "Teilweise lesbar",
  },
  red: {
    bg: "bg-red-100 dark:bg-red-900/30",
    text: "text-red-700 dark:text-red-400",
    icon: AlertTriangle,
    label: "Schwer lesbar",
  },
} as const;

function QualityBadgeInline({ quality }: { quality: QualityDetails }) {
  const cfg = QUALITY_LEVEL_CONFIG[quality.level];
  const Icon = cfg.icon;
  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      <Icon className="h-3.5 w-3.5" />
      {cfg.label}
    </div>
  );
}

function QualityMiniMetrics({ quality }: { quality: QualityDetails }) {
  return (
    <div className="space-y-2">
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">Lesbarkeit</span>
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={`h-3 w-3 ${
                  s <= quality.readability
                    ? "text-amber-500 fill-amber-500"
                    : "text-muted-foreground/30"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">Erkennungssicherheit</span>
          <span className="text-xs font-medium">{quality.confidence}%</span>
        </div>
        <Progress value={quality.confidence} className="h-1.5" />
      </div>
    </div>
  );
}

// ---------- Variante 11: Zusammenfassung + Qualität komplett integriert ----------
function CtaSummaryFull({ scriptType, quality, claiming, onAction }: CtaProps) {
  return (
    <Card className="relative overflow-hidden border-2 border-primary/30 shadow-lg shadow-primary/5 animate-in fade-in slide-in-from-bottom-3 duration-500">
      {/* Qualitäts-Header */}
      <div className="p-5 sm:p-6 pb-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <span className="text-xs uppercase tracking-wider text-primary font-semibold">
              Analyse-Ergebnis
            </span>
          </div>
          {quality && <QualityBadgeInline quality={quality} />}
        </div>

        {quality?.contentSummary && (
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/50 border border-border/50">
            <FileText className="h-4 w-4 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="text-sm italic text-foreground/80">{quality.contentSummary}</p>
          </div>
        )}

        {quality && <QualityMiniMetrics quality={quality} />}

        <p className="text-xs text-muted-foreground">
          Erkannte Schrift: <strong className="text-foreground">{getScriptTypeDisplayLabel(scriptType)}</strong>
        </p>
      </div>

      {/* CTA-Footer */}
      <div className="relative bg-gradient-to-br from-primary/10 via-primary/5 to-amber-50/80 dark:from-primary/20 dark:via-primary/10 dark:to-amber-950/30 border-t border-primary/20 p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1 space-y-1">
            <h3 className="font-serif text-lg font-bold leading-tight">
              Vollständige Transkription erhalten
            </h3>
            <p className="text-xs text-muted-foreground">
              Unsere KI hat Ihr Dokument erkannt. Melden Sie sich an und erhalten Sie den kompletten Text
              {" – "}
              <strong className="text-foreground">3 Seiten gratis</strong>, keine Kreditkarte.
            </p>
          </div>
          <Button
            size="lg"
            onClick={() => onAction("transcribe")}
            className="shrink-0 w-full sm:w-auto text-base px-7 py-5 rounded-xl shadow-md hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
            disabled={claiming}
          >
            {claiming ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Sparkles className="h-5 w-5 mr-2" />}
            Text jetzt freischalten
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ---------- Variante 12: Zusammenfassung + Split-CTA (wie V9-Layout) ----------
function CtaSummarySplit({ scriptType, quality, claiming, onAction }: CtaProps) {
  return (
    <Card
      className="relative overflow-hidden border-2 border-primary/30 shadow-lg shadow-primary/5 animate-in fade-in slide-in-from-bottom-3 duration-500"
    >
      <div className="grid grid-cols-1 md:grid-cols-[1fr,18rem]">
        {/* CTA-Seite – mobil oben, Desktop rechts */}
        <div className="relative order-first md:order-last bg-gradient-to-br from-primary/10 via-primary/5 to-amber-50/80 dark:from-primary/20 dark:via-primary/10 dark:to-amber-950/30 p-5 sm:p-6 flex flex-col justify-center border-b md:border-b-0 md:border-l border-primary/20">
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
          <div className="relative space-y-3">
            <h3 className="font-serif text-lg font-bold leading-tight">
              Vollständigen Text erhalten
            </h3>
            <p className="text-sm text-muted-foreground">
              Unsere KI hat Ihr Dokument erkannt und kann den Text vollständig transkribieren.
            </p>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li className="flex items-start gap-1.5">
                <Gift className="h-3.5 w-3.5 mt-0.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span><strong className="text-foreground">3 Seiten gratis</strong> bei Anmeldung</span>
              </li>
              <li className="flex items-start gap-1.5">
                <Clock className="h-3.5 w-3.5 mt-0.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Anmeldung in 10 Sekunden</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CreditCard className="h-3.5 w-3.5 mt-0.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Keine Kreditkarte nötig</span>
              </li>
            </ul>
            <Button
              size="lg"
              onClick={() => onAction("transcribe")}
              className="w-full text-sm sm:text-base px-4 py-5 rounded-xl shadow-md hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
              disabled={claiming}
            >
              {claiming ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Vollständigen Text laden
            </Button>
          </div>
        </div>

        {/* Zusammenfassung-Seite – mobil unten, Desktop links */}
        <div className="p-5 sm:p-6 order-last md:order-first space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              <span className="text-xs uppercase tracking-wider text-primary font-semibold">
                Analyse-Ergebnis
              </span>
            </div>
            {quality && <QualityBadgeInline quality={quality} />}
          </div>

          {quality?.contentSummary && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/50 border border-border/50">
              <FileText className="h-4 w-4 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
              <p className="text-sm italic text-foreground/80">{quality.contentSummary}</p>
            </div>
          )}

          {quality && <QualityMiniMetrics quality={quality} />}

          <p className="text-xs text-muted-foreground pt-2 border-t border-border/60">
            Erkannte Schrift: <strong className="text-foreground">{getScriptTypeDisplayLabel(scriptType)}</strong>
          </p>
        </div>
      </div>
    </Card>
  );
}

// ---------- Variante 13: Zusammenfassung kompakt + Action-Footer ----------
function CtaSummaryCompact({ scriptType, quality, claiming, onAction }: CtaProps) {
  return (
    <Card className="relative overflow-hidden border-2 border-primary/30 shadow-xl shadow-primary/10 animate-in fade-in slide-in-from-bottom-3 duration-500">
      {/* Kompakter Header mit Qualität */}
      <div className="px-5 sm:px-6 pt-5 pb-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-serif text-lg font-semibold flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Ihr Dokument wurde analysiert
          </h2>
          {quality && <QualityBadgeInline quality={quality} />}
        </div>

        {quality?.contentSummary && (
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/50 border border-border/50">
            <FileText className="h-4 w-4 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="text-sm italic text-foreground/80">{quality.contentSummary}</p>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
          <span>
            Schrift: <strong className="text-foreground">{getScriptTypeDisplayLabel(scriptType)}</strong>
          </span>
          {quality && (
            <>
              <span className="flex items-center gap-1">
                Lesbarkeit:
                <span className="flex gap-0.5 ml-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`h-3 w-3 ${
                        s <= quality.readability
                          ? "text-amber-500 fill-amber-500"
                          : "text-muted-foreground/30"
                      }`}
                    />
                  ))}
                </span>
              </span>
              <span>
                Erkennung: <strong className="text-foreground">{quality.confidence}%</strong>
              </span>
            </>
          )}
        </div>
      </div>

      {/* Action-Footer */}
      <div className="relative bg-primary text-primary-foreground px-5 sm:px-6 py-4">
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider rounded-full shadow-md border-2 border-card">
          Bereit zur Transkription
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex-1 space-y-0.5">
            <p className="text-sm font-semibold">
              Jetzt den vollständigen Text freischalten
            </p>
            <p className="text-xs text-primary-foreground/80">
              3 Seiten kostenlos · keine Kreditkarte · 10-Sekunden-Anmeldung
            </p>
          </div>
          <Button
            size="lg"
            variant="secondary"
            onClick={() => onAction("transcribe")}
            className="shrink-0 text-base px-6 py-5 rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] bg-card text-foreground hover:bg-card/90 font-semibold"
            disabled={claiming}
          >
            {claiming ? (
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-5 w-5 mr-2 text-primary" />
            )}
            Text freischalten
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ---------- Dispatcher ----------
export function CtaTeaser(props: CtaProps & { variant: CtaVariantId }) {
  switch (props.variant) {
    case 1: return <CtaProgressSocialProof {...props} />;
    case 2: return <CtaBlurredReveal {...props} />;
    case 3: return <CtaBenefitTrust {...props} />;
    case 4: return <CtaPersonalized {...props} />;
    case 5: return <CtaMicroCommitment {...props} />;
    case 6: return <CtaPreviewInline {...props} />;
    case 7: return <CtaPreviewLocked {...props} />;
    case 8: return <CtaPreviewProgress {...props} />;
    case 9: return <CtaPreviewSplit {...props} />;
    case 10: return <CtaPreviewActionFooter {...props} />;
    case 11: return <CtaSummaryFull {...props} />;
    case 12: return <CtaSummarySplit {...props} />;
    case 13: return <CtaSummaryCompact {...props} />;
    default: return <CtaOriginal {...props} />;
  }
}
