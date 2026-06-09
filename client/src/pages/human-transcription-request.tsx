import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
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
  { value: "standard", labelKey: "urgencyStandardLabel", descriptionKey: "urgencyStandardDesc" },
  { value: "express", labelKey: "urgencyExpressLabel", descriptionKey: "urgencyExpressDesc" },
  { value: "priority", labelKey: "urgencyPriorityLabel", descriptionKey: "urgencyPriorityDesc" },
] as const;

const ACCURACY_OPTIONS = [
  { value: "reading", labelKey: "accuracyReadingLabel", descriptionKey: "accuracyReadingDesc" },
  { value: "scientific", labelKey: "accuracyScientificLabel", descriptionKey: "accuracyScientificDesc" },
] as const;

const BUDGET_OPTIONS = [
  { value: "bis_100", labelKey: "budgetUpTo100" },
  { value: "100_250", labelKey: "budget100To250" },
  { value: "250_500", labelKey: "budget250To500" },
  { value: "500_plus", labelKey: "budgetOver500" },
  { value: "flexible", labelKey: "budgetFlexible" },
] as const;

const TIER_OPTIONS = [
  { value: "ki_geprueft", labelKey: "tierKiLabel", priceLabelKey: "tierKiPrice", descriptionKey: "tierKiDesc" },
  { value: "experten", labelKey: "tierExpertLabel", priceLabelKey: "tierExpertPrice", descriptionKey: "tierExpertDesc" },
] as const;

function getTierFromSearch(): "ki_geprueft" | "experten" {
  if (typeof window === "undefined") return "experten";
  const t = new URLSearchParams(window.location.search).get("tier");
  return t === "ki_geprueft" ? "ki_geprueft" : "experten";
}

export default function HumanTranscriptionRequestPage() {
  const { t } = useTranslation();
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
        title: t("htRequest.toastSentTitle"),
        description: t("htRequest.toastSentBody"),
      });
      navigate("/app/human-transcription");
    },
    onError: (error: Error) => {
      toast({
        title: t("htRequest.toastErrorTitle"),
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
  const indicativeTotal = serviceLevel === "ki_geprueft" ? (job.totalPages * 67).toFixed(2).replace(".", ",") : null;

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-8">
      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" onClick={() => navigate(`/app/preview/${jobId}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("htRequest.back")}
        </Button>
        <h1 className="font-serif text-xl font-bold">{t("htRequest.title")}</h1>
      </div>

      <div>
        <Label className="text-base font-medium mb-3 block">{t("htRequest.serviceOption")}</Label>
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
              <span className="font-medium">{t(`htRequest.${opt.labelKey}`)}</span>
              <span className="block text-sm text-muted-foreground">{t(`htRequest.${opt.descriptionKey}`)}</span>
              <span className="block text-sm font-semibold mt-1">{t(`htRequest.${opt.priceLabelKey}`)}</span>
              {serviceLevel === opt.value && opt.value === "ki_geprueft" && (
                <span className="block text-xs text-muted-foreground mt-0.5">
                  {t("htRequest.indicativePrice", { pages: job.totalPages, total: indicativeTotal })}
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
              <strong className="text-foreground">{t("htRequest.eligibilityTitle")}</strong> {t("htRequest.eligibilityBody")}
            </p>
          </div>
        </Card>
      )}

      <Card className="p-4 border-primary/20 bg-muted/30">
        <h2 className="font-serif font-semibold mb-2 flex items-center gap-2">
          <FileText className="h-4 w-4" />
          {t("htRequest.yourDocument")}
        </h2>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li><strong>{t("htRequest.scriptLabel")}</strong> {scriptLabel}</li>
          <li><strong>{t("htRequest.pagesLabel")}</strong> {job.totalPages}</li>
          {qualityLevel && (
            <li>
              <strong>{t("htRequest.qualityPreviewLabel")}</strong>{" "}
              {qualityLevel === "green" ? t("htRequest.qualityGood") : qualityLevel === "yellow" ? t("htRequest.qualityMedium") : t("htRequest.qualityHard")}
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
          <Label className="text-base font-medium mb-3 block">{t("htRequest.urgency")}</Label>
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
                <span className="font-medium">{t(`htRequest.${opt.labelKey}`)}</span>
                <span className="block text-sm text-muted-foreground">{t(`htRequest.${opt.descriptionKey}`)}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label className="text-base font-medium mb-3 block">{t("htRequest.accuracyLevel")}</Label>
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
                <span className="font-medium">{t(`htRequest.${opt.labelKey}`)}</span>
                <p className="text-sm text-muted-foreground mt-0.5">{t(`htRequest.${opt.descriptionKey}`)}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label className="text-base font-medium mb-3 block">{t("htRequest.budgetRange")}</Label>
          <div className="flex flex-wrap gap-2">
            {BUDGET_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                type="button"
                variant={budgetRange === opt.value ? "default" : "outline"}
                size="sm"
                onClick={() => setBudgetRange(opt.value)}
              >
                {t(`htRequest.${opt.labelKey}`)}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <Label htmlFor="notes" className="text-base font-medium mb-2 block">
            {t("htRequest.notesLabel")}
          </Label>
          <Textarea
            id="notes"
            placeholder={t("htRequest.notesPlaceholder")}
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
          {t("htRequest.dataSharingTitle")}
        </h2>
        <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
          {t("htRequest.dataSharingBefore")}{" "}
          <a
            href="/datenschutz"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            {t("htRequest.dataSharingPrivacyLink")}
          </a>
          {" "}{t("htRequest.dataSharingMiddle")}{" "}
          <a
            href="/agb"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            {t("htRequest.dataSharingTermsLink")}
          </a>
          {t("htRequest.dataSharingAfter")}
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
              {t("htRequest.consentDataSharing")}
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
              {t("htRequest.consentNoSensitiveData")}
            </span>
          </label>
        </div>
      </Card>

      <Card className="p-4 border-amber-200/50 dark:border-amber-800/50 bg-amber-50/30 dark:bg-amber-950/20">
        <p className="text-sm text-muted-foreground mb-4">
          {t("htRequest.closingNote")}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={() => navigate(`/app/preview/${jobId}`)}>
            {t("common.cancel")}
          </Button>
          <Button
            disabled={!canSubmit || submitMutation.isPending}
            onClick={() => submitMutation.mutate()}
            data-testid="button-submit-request"
          >
            {submitMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t("htRequest.submitting")}
              </>
            ) : (
              <>
                {t("htRequest.submit")}
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
