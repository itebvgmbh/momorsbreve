import { useState, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ArrowRight, Loader2, FileText, Info, ShieldCheck } from "lucide-react";
import { getScriptTypeDisplayLabel } from "@shared/models/transcription";
import type { TranscriptionJob } from "@shared/models/transcription";
import type { TranscriptionPage } from "@shared/models/transcription";

interface ResultData {
  job: TranscriptionJob;
  pages: TranscriptionPage[];
  progress: { completed: number; processing: number; failed: number; pending: number; total: number };
}

const URGENCY_OPTIONS = [
  { value: "standard", label: "Standard", description: "Ca. 2 Wochen" },
  { value: "express", label: "Express", description: "Ca. 1 Woche" },
  { value: "priority", label: "Priorität", description: "Ca. 3 Tage" },
] as const;

const ACCURACY_OPTIONS = [
  {
    value: "reading",
    label: "Lesetranskription",
    description: "Lesbarer Text, Lücken sinnvoll ergänzt. Ideal für Familienunterlagen.",
  },
  {
    value: "scientific",
    label: "Wissenschaftlich-diplomatisch",
    description: "Zeichengetreu mit Kennzeichnung unsicherer Stellen. Für Forschung und Edition.",
  },
] as const;

const BUDGET_OPTIONS = [
  { value: "bis_100", label: "Bis 100 €" },
  { value: "100_250", label: "100 € – 250 €" },
  { value: "250_500", label: "250 € – 500 €" },
  { value: "500_plus", label: "Über 500 €" },
  { value: "flexible", label: "Flexibel" },
] as const;

const TIER_OPTIONS = [
  { value: "ki_geprueft", label: "KI-Geprüft", priceLabel: "8,99 EUR/Seite", description: "KI-Transkription mit Experten-Korrektur, 2–3 Werktage" },
  { value: "experten", label: "Experten", priceLabel: "ab 14,90 EUR/Seite", description: "Vollständige menschliche Transkription, 5–7 Werktage" },
] as const;

function getTierFromSearch(): "ki_geprueft" | "experten" {
  if (typeof window === "undefined") return "experten";
  const t = new URLSearchParams(window.location.search).get("tier");
  return t === "ki_geprueft" ? "ki_geprueft" : "experten";
}

export default function HumanTranscriptionRequestPage() {
  const params = useParams<{ jobId: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const jobId = params.jobId;

  const initialTier = useMemo(getTierFromSearch, []);
  const [serviceLevel, setServiceLevel] = useState<"ki_geprueft" | "experten">(initialTier);
  const [urgency, setUrgency] = useState<string>("standard");
  const [accuracyLevel, setAccuracyLevel] = useState<string>("reading");
  const [budgetRange, setBudgetRange] = useState<string>("100_250");
  const [customerNotes, setCustomerNotes] = useState("");
  const [dataSharingConsent, setDataSharingConsent] = useState(false);
  const [noSensitiveDataConfirmed, setNoSensitiveDataConfirmed] = useState(false);

  const { data: result, isLoading } = useQuery<ResultData>({
    queryKey: ["/api/jobs", jobId, "result"],
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/human-transcription/request", {
        jobId: parseInt(jobId, 10),
        serviceLevel,
        urgency,
        accuracyLevel,
        budgetRange,
        customerNotes: customerNotes.trim() || undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/human-transcription/requests"] });
      toast({
        title: "Anfrage gesendet",
        description: "Wir melden uns mit einem individuellen Angebot bei Ihnen.",
      });
      navigate("/app/human-transcription");
    },
    onError: (error: Error) => {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (!jobId) {
    navigate("/app");
    return null;
  }

  if (isLoading || !result) {
    return (
      <div className="p-4 sm:p-6 max-w-2xl mx-auto flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const { job, pages } = result;
  const previewPage = pages.find((p) => p.isPreview) ?? pages[0];
  const qualityLevel = (previewPage?.qualityDetails as { level?: string } | null)?.level;
  const scriptLabel = getScriptTypeDisplayLabel(job.scriptType);
  const snippet = (previewPage?.transcription || previewPage?.transcriptionCompleted || "").slice(0, 120);

  const canSubmit =
    urgency && accuracyLevel && budgetRange && dataSharingConsent && noSensitiveDataConfirmed;
  const indicativeTotal = serviceLevel === "ki_geprueft" ? (job.totalPages * 8.99).toFixed(2).replace(".", ",") : null;

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-8">
      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" onClick={() => navigate(`/app/preview/${jobId}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zurück
        </Button>
        <h1 className="font-serif text-xl font-bold">Anfrage stellen</h1>
      </div>

      <div>
        <Label className="text-base font-medium mb-3 block">Service-Option</Label>
        <div className="grid gap-2">
          {TIER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setServiceLevel(opt.value)}
              className={`text-left p-3 rounded-lg border transition-colors ${
                serviceLevel === opt.value
                  ? "border-primary bg-primary/10"
                  : "border-border hover:bg-muted/50"
              }`}
            >
              <span className="font-medium">{opt.label}</span>
              <span className="block text-sm text-muted-foreground">{opt.description}</span>
              <span className="block text-sm font-semibold mt-1">{opt.priceLabel}</span>
              {serviceLevel === opt.value && opt.value === "ki_geprueft" && (
                <span className="block text-xs text-muted-foreground mt-0.5">
                  Richtpreis für {job.totalPages} Seiten: ca. {indicativeTotal} EUR
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {serviceLevel === "ki_geprueft" && (
        <Card className="p-4 border-blue-200/60 dark:border-blue-800/40 bg-blue-50/40 dark:bg-blue-950/20">
          <div className="flex gap-3">
            <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Eignungsprüfung:</strong> KI-Geprüft setzt voraus, dass unsere KI den Text grundsätzlich lesen kann.
              Wir prüfen nach Eingang Ihrer Anfrage, ob die Qualität ausreicht.
              Bei Eignung starten wir direkt -- andernfalls bieten wir Ihnen den Experten-Service an. Sie gehen kein Risiko ein.
            </p>
          </div>
        </Card>
      )}

      <Card className="p-4 border-primary/20 bg-muted/30">
        <h2 className="font-serif font-semibold mb-2 flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Ihr Dokument
        </h2>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li><strong>Schrift:</strong> {scriptLabel}</li>
          <li><strong>Seiten:</strong> {job.totalPages}</li>
          {qualityLevel && (
            <li>
              <strong>Qualität Vorschau:</strong>{" "}
              {qualityLevel === "green" ? "Gut" : qualityLevel === "yellow" ? "Mittel" : "Schwierig"}
            </li>
          )}
        </ul>
        {snippet && (
          <p className="text-xs text-muted-foreground mt-2 border-l-2 border-border pl-2 italic">
            „{snippet}…“
          </p>
        )}
      </Card>

      <div className="space-y-6">
        <div>
          <Label className="text-base font-medium mb-3 block">Dringlichkeit</Label>
          <div className="grid gap-2">
            {URGENCY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setUrgency(opt.value)}
                className={`text-left p-3 rounded-lg border transition-colors ${
                  urgency === opt.value
                    ? "border-primary bg-primary/10"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <span className="font-medium">{opt.label}</span>
                <span className="block text-sm text-muted-foreground">{opt.description}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label className="text-base font-medium mb-3 block">Genauigkeitsgrad</Label>
          <div className="grid gap-2">
            {ACCURACY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setAccuracyLevel(opt.value)}
                className={`text-left p-3 rounded-lg border transition-colors ${
                  accuracyLevel === opt.value
                    ? "border-primary bg-primary/10"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <span className="font-medium">{opt.label}</span>
                <p className="text-sm text-muted-foreground mt-0.5">{opt.description}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label className="text-base font-medium mb-3 block">Budget-Rahmen</Label>
          <div className="flex flex-wrap gap-2">
            {BUDGET_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                type="button"
                variant={budgetRange === opt.value ? "default" : "outline"}
                size="sm"
                onClick={() => setBudgetRange(opt.value)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <Label htmlFor="notes" className="text-base font-medium mb-2 block">
            Anmerkungen (optional)
          </Label>
          <Textarea
            id="notes"
            placeholder="z. B. Zeitraum, Region, besondere Wünsche …"
            value={customerNotes}
            onChange={(e) => setCustomerNotes(e.target.value)}
            rows={3}
            className="resize-none"
          />
        </div>
      </div>

      <Card className="p-4 border-primary/30 bg-muted/40">
        <h2 className="font-serif font-semibold mb-3 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Datenweitergabe an Experten
        </h2>
        <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
          Zur Bearbeitung Ihrer Anfrage leiten wir Ihre hochgeladenen Dokumente,
          Transkriptionsentwürfe und Ihre Anmerkungen an ausgewählte Experten bzw. Partnerunternehmen
          weiter und machen sie für diese auf der Plattform zur Angebotsabgabe einsehbar. Alle
          Experten sind vertraglich zur Vertraulichkeit und zur Einhaltung der DSGVO verpflichtet.
          Details finden Sie in unserer{" "}
          <a
            href="/datenschutz"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Datenschutzerklärung
          </a>
          {" "}und in den{" "}
          <a
            href="/agb"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            AGB
          </a>
          . Sie können Ihre Einwilligung jederzeit mit Wirkung für die Zukunft widerrufen.
        </p>
        <div className="space-y-3">
          <label className="flex items-start gap-3 text-sm cursor-pointer">
            <Checkbox
              checked={dataSharingConsent}
              onCheckedChange={(v) => setDataSharingConsent(v === true)}
              className="mt-0.5"
              data-testid="checkbox-data-sharing-consent"
            />
            <span className="leading-relaxed text-foreground">
              Ich willige ausdrücklich ein, dass meine hochgeladenen Dokumente, erstellte
              Transkriptionsentwürfe und meine Anmerkungen zum Zweck der Angebotsabgabe und
              Bearbeitung an externe Experten und Partnerunternehmen weitergegeben und auf der
              Plattform für diese einsehbar gemacht werden.
            </span>
          </label>
          <label className="flex items-start gap-3 text-sm cursor-pointer">
            <Checkbox
              checked={noSensitiveDataConfirmed}
              onCheckedChange={(v) => setNoSensitiveDataConfirmed(v === true)}
              className="mt-0.5"
              data-testid="checkbox-no-sensitive-data"
            />
            <span className="leading-relaxed text-foreground">
              Ich bestätige, dass die hochgeladenen Dokumente keine besonders sensiblen Daten
              im Sinne des Art. 9 DSGVO (z. B. Gesundheits-, religiöse, politische oder
              biometrische Daten) Dritter enthalten oder dass ich zur Weitergabe dieser Daten
              berechtigt bin.
            </span>
          </label>
        </div>
      </Card>

      <Card className="p-4 border-amber-200/50 dark:border-amber-800/50 bg-amber-50/30 dark:bg-amber-950/20">
        <p className="text-sm text-muted-foreground mb-4">
          Wir finden einen passenden Transkriptor für Ihr Dokument und senden Ihnen ein
          individuelles Angebot. Sie entscheiden danach, ob Sie annehmen möchten.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={() => navigate(`/app/preview/${jobId}`)}>
            Abbrechen
          </Button>
          <Button
            disabled={!canSubmit || submitMutation.isPending}
            onClick={() => submitMutation.mutate()}
            data-testid="button-submit-request"
          >
            {submitMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Wird gesendet…
              </>
            ) : (
              <>
                Anfrage absenden
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
