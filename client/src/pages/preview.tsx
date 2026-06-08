import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowRight,
  ArrowLeft,
  Globe,
  XCircle,
  Loader2,
  Coins,
  Copy,
  Download,
  FileText,
  Pencil,
  RotateCcw,
  Sparkles,
  Wand2,
  User,
  CheckCircle,
  Volume2,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DocumentPreview } from "@/components/document-preview";
import { TranscriptionBackgroundHint } from "@/components/transcription-background-hint";
import { QualityIndicator, type QualityDetails } from "@/components/quality-indicator";
import { trackBeginCheckout } from "@/lib/gtag";
import { getTranslationLanguageLabel } from "@shared/models/transcription";
import { TTS_VOICES, TTS_STYLE_PRESETS, TTS_CHARACTERS, TTS_CHARACTER_STYLES, ttsCreditsForText } from "@/lib/tts-constants";
import { AudioCharacterPicker } from "@/components/audio-character-picker";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface PreviewProgress {
  completed: number;
  processing: number;
  failed: number;
  total: number;
}

interface PreviewData {
  jobId: number;
  previewPageId?: number;
  imageUrl: string;
  transcription: string;
  transcriptionCompleted: string | null;
  transcriptionInterpreted: string | null;
  transcriptionEdited?: string | null;
  transcriptionCompletedEdited?: string | null;
  transcriptionInterpretedEdited?: string | null;
  translation?: string | null;
  translationCompleted?: string | null;
  translationInterpreted?: string | null;
  translationLanguage?: string | null;
  quality: QualityDetails;
  totalPages: number;
  creditsRequired: number;
  currentCredits: number;
  progress?: PreviewProgress;
  failed?: boolean;
}

type TextVersion = "original" | "completed" | "interpreted";
type DisplayLanguage = "de" | "translation";

function getPreviewDisplayText(preview: PreviewData, version: TextVersion, lang: DisplayLanguage = "de"): string {
  if (lang === "translation") {
    if (version === "original") return preview.translation ?? "";
    if (version === "completed") return preview.translationCompleted ?? preview.translation ?? "";
    return preview.translationInterpreted ?? preview.translationCompleted ?? preview.translation ?? "";
  }
  if (version === "original") return preview.transcriptionEdited ?? preview.transcription ?? "";
  if (version === "completed") return preview.transcriptionCompletedEdited ?? preview.transcriptionCompleted ?? preview.transcription ?? "";
  return preview.transcriptionInterpretedEdited ?? preview.transcriptionInterpreted ?? preview.transcriptionCompleted ?? preview.transcription ?? "";
}

function getPreviewHasEdited(preview: PreviewData, version: TextVersion): boolean {
  const v = version === "original"
    ? preview.transcriptionEdited
    : version === "completed"
      ? preview.transcriptionCompletedEdited
      : preview.transcriptionInterpretedEdited;
  return v != null && v !== "";
}

function formatCredits(t: TFunction, creditsRequired: number): string {
  return t("preview.creditsCount", { count: creditsRequired });
}

function getTranscribeButtonLabel(
  t: TFunction,
  totalPages: number,
  creditsRequired: number,
  variant: "full" | "compact" = "full",
): string {
  const remainingPages = totalPages - 1;
  const credits = formatCredits(t, creditsRequired);
  if (variant === "compact") {
    return remainingPages === 1
      ? t("preview.transcribeRemainingCompactOne")
      : t("preview.transcribeRemainingCompactMany");
  }
  return remainingPages === 1
    ? t("preview.transcribeRemainingOne", { credits })
    : t("preview.transcribeRemainingMany", { count: remainingPages, credits });
}

const SIMULATED_PROGRESS_INTERVAL_MS = 500;
const SIMULATED_PROGRESS_MAX = 92;

export default function PreviewPage() {
  const { t } = useTranslation();
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [textVersion, setTextVersion] = useState<"original" | "completed" | "interpreted">("original");
  const [displayLanguage, setDisplayLanguage] = useState<DisplayLanguage>("de");
  const [simulatedProgress, setSimulatedProgress] = useState(0);
  const simulatedIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTextDraft, setEditedTextDraft] = useState("");
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [ttsVoice, setTtsVoice] = useState(TTS_CHARACTERS[0].voice);
  const [ttsStyle, setTtsStyle] = useState(TTS_CHARACTER_STYLES[0].prompt);
  const originalColRef = useRef<HTMLDivElement>(null);
  const [originalColHeight, setOriginalColHeight] = useState<number | null>(null);

  useEffect(() => {
    if (!originalColRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) setOriginalColHeight(Math.round(entry.contentRect.height));
    });
    ro.observe(originalColRef.current);
    return () => ro.disconnect();
  }, []);

  const { data: preview, isLoading } = useQuery<PreviewData>({
    queryKey: ["/api/jobs", params.id, "preview"],
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data || !data.transcription) return 2000;
      return false;
    },
  });

  const isProcessing = !preview?.transcription && !preview?.failed;


  useEffect(() => {
    if (!isProcessing) {
      if (simulatedIntervalRef.current) {
        clearInterval(simulatedIntervalRef.current);
        simulatedIntervalRef.current = null;
      }
      setSimulatedProgress(100);
      return;
    }

    setSimulatedProgress(0);
    const startTime = Date.now();
    simulatedIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const fastPhase = Math.min(elapsed / 8000, 1) * 50;
      const slowPhase = Math.max(0, Math.min((elapsed - 8000) / 40000, 1)) * (SIMULATED_PROGRESS_MAX - 50);
      const next = Math.min(Math.round(fastPhase + slowPhase), SIMULATED_PROGRESS_MAX);
      setSimulatedProgress(next);
    }, SIMULATED_PROGRESS_INTERVAL_MS);

    return () => {
      if (simulatedIntervalRef.current) {
        clearInterval(simulatedIntervalRef.current);
        simulatedIntervalRef.current = null;
      }
    };
  }, [isProcessing]);

  const shownPreviewFailToast = useRef(false);
  const shownPreviewTranslationError = useRef(false);
  useEffect(() => {
    if (!preview) return;

    if (preview.failed && !shownPreviewFailToast.current) {
      shownPreviewFailToast.current = true;
      toast({
        title: t("preview.previewFailedTitle"),
        description: preview.transcription || t("preview.previewFailedBody"),
        variant: "destructive",
      });
    }

    if (
      !preview.failed &&
      preview.transcription &&
      preview.translationLanguage &&
      !preview.translation &&
      !shownPreviewTranslationError.current
    ) {
      shownPreviewTranslationError.current = true;
      const qd = preview.quality as unknown as Record<string, unknown> | null;
      const translationError = qd?.translationError as string | undefined;
      if (translationError) {
        toast({
          title: t("preview.translationFailedTitle"),
          description: translationError,
          variant: "destructive",
        });
      }
    }
  }, [preview, toast]);

  const purchaseMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/jobs/${params.id}/transcribe`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/credits"] });
      navigate(`/app/result/${params.id}?fromPreview=true`);
    },
    onError: (error: Error) => {
      toast({
        title: t("preview.errorTitle"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const isSinglePage = preview?.totalPages === 1;

  useEffect(() => {
    if (
      isSinglePage &&
      !isProcessing &&
      !preview?.failed &&
      preview?.transcription &&
      !purchaseMutation.isPending
    ) {
      purchaseMutation.mutate();
    }
  }, [isSinglePage, isProcessing, preview?.failed, preview?.transcription, purchaseMutation.isPending]);

  const updatePageMutation = useMutation({
    mutationFn: async ({ pageId, version, text }: { pageId: number; version: TextVersion; text: string | null }) => {
      const res = await apiRequest("PATCH", `/api/jobs/${params.id}/pages/${pageId}`, { version, text });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs", params.id, "preview"] });
      setIsEditing(false);
      setEditedTextDraft("");
      toast({ title: t("preview.savedTitle"), description: t("preview.savedBody") });
    },
    onError: (error: Error) => {
      toast({ title: t("preview.errorTitle"), description: error.message, variant: "destructive" });
    },
  });

  type TtsGeneration = { id: number; version: string; lang: string; voice: string; style: string | null; pages: number[] | "all"; status: string; audioUrl: string | null; creditsUsed: number; createdAt: string };
  const { data: ttsHistory } = useQuery<{ generations: TtsGeneration[] }>({
    queryKey: ["/api/jobs", params.id, "tts-history"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/jobs/${params.id}/tts-history`);
      return res.json();
    },
    enabled: !!params.id,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    refetchInterval: (query) => {
      const gens = query.state.data?.generations;
      if (gens?.some((g) => g.status === "generating")) return 2000;
      return false;
    },
  });

  useEffect(() => {
    if (params.id) {
      queryClient.refetchQueries({ queryKey: ["/api/jobs", params.id, "tts-history"] });
    }
  }, [params.id]);

  function ttsPagesEqual(a: number[] | "all", b: number[] | "all"): boolean {
    if (a === "all" && b === "all") return true;
    if (a === "all" || b === "all") return false;
    return a.length === b.length && a.every((v, i) => v === b[i]);
  }
  const ttsMatchesPreview = (() => {
    if (!ttsHistory?.generations?.length) return [];
    return ttsHistory.generations.filter(
      (g) =>
        g.version === textVersion &&
        g.lang === displayLanguage &&
        ttsPagesEqual(g.pages as number[] | "all", [1]),
    );
  })();
  const ttsGeneratingForPreview = ttsMatchesPreview.some((g) => g.status === "generating");
  const ttsCompletedForPreview = ttsMatchesPreview.filter((g) => g.status === "completed" && g.audioUrl);

  const ttsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/jobs/${params.id}/tts`, {
        version: textVersion,
        lang: displayLanguage,
        voice: ttsVoice,
        style: ttsStyle || undefined,
        pages: [1],
      });
      return res.json() as Promise<{ generationId: number; status: string; creditsUsed: number }>;
    },
    onSuccess: (body) => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs", params.id, "tts-history"] });
      if (body.creditsUsed > 0) {
        queryClient.invalidateQueries({ queryKey: ["/api/credits"] });
        toast({ title: t("preview.ttsTitle"), description: t("preview.ttsCreditsUsed", { count: body.creditsUsed }) });
      }
    },
    onError: (error: Error) => {
      toast({ title: t("preview.ttsFailedTitle"), description: error.message, variant: "destructive" });
    },
  });

  const startEditing = () => {
    if (!preview) return;
    setEditedTextDraft(getPreviewDisplayText(preview, textVersion, displayLanguage));
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditedTextDraft("");
  };

  const saveEditing = () => {
    const pageId = preview?.previewPageId;
    if (pageId == null) return;
    updatePageMutation.mutate({ pageId, version: textVersion, text: editedTextDraft });
  };

  const resetToOriginal = () => {
    setShowResetDialog(false);
    const pageId = preview?.previewPageId;
    if (pageId == null) return;
    updatePageMutation.mutate({ pageId, version: textVersion, text: null });
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid lg:grid-cols-2 gap-6">
          <Skeleton className="aspect-[3/4] order-2 lg:order-1" />
          <div className="space-y-4 order-1 lg:order-2">
            <Skeleton className="h-40" />
            <Skeleton className="h-60" />
          </div>
        </div>
      </div>
    );
  }

  const isFailed = preview?.failed === true;

  if (isSinglePage && !isFailed) {
    return (
      <div className="p-4 sm:p-6 max-w-5xl mx-auto">
        <Card className="p-10 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <h3 className="font-serif text-xl font-bold mb-2">{t("preview.pageProcessing")}</h3>
          {isProcessing ? (
            <TranscriptionBackgroundHint className="mb-6 max-w-md mx-auto text-center" />
          ) : (
            <p className="text-muted-foreground mb-6">{t("preview.redirectingToResult")}</p>
          )}
          <div className="max-w-sm mx-auto">
            <Progress value={simulatedProgress} className="h-2 mb-2" />
            <p className="text-xs text-muted-foreground">
              {getProgressLabel()}
              <span className="ml-1 tabular-nums">{simulatedProgress}%</span>
            </p>
          </div>
        </Card>
      </div>
    );
  }

  function getProgressLabel(): string {
    if (simulatedProgress < 20) return t("preview.progressPreparingImage");
    if (simulatedProgress < 45) return t("preview.progressRecognizing");
    if (simulatedProgress < 70) return t("preview.progressAssembling");
    if (simulatedProgress < 85) return t("preview.progressCheckingQuality");
    return t("preview.progressAlmostDone");
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="hidden sm:block">
          <h1 className="font-serif text-2xl font-bold" data-testid="text-preview-title">
            {t("preview.title")}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t("preview.subtitle")}
          </p>
        </div>
        <Button variant="ghost" onClick={() => navigate("/app/upload")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("preview.back")}
        </Button>
      </div>

      {isFailed ? (
        <Card className="p-10 text-center">
          <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h3 className="font-serif text-xl font-bold mb-2">
            {t("preview.previewFailedTitle")}
          </h3>
          <p className="text-muted-foreground max-w-md mx-auto mb-6">
            {preview?.transcription || t("preview.previewFailedBody")}
          </p>
          <Button onClick={() => navigate("/app/upload")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("preview.tryAgain")}
          </Button>
        </Card>
      ) : (
        <>
          {isProcessing && (
            <Card className="p-4 border-amber-300/40 bg-amber-50/50 dark:bg-amber-950/10">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />
                    <h3 className="font-serif font-semibold text-sm">
                      {t("preview.creatingPreview")}
                    </h3>
                  </div>
                  <Progress value={simulatedProgress} className="h-2 mb-1.5" />
                  <p className="text-xs text-muted-foreground">
                    {getProgressLabel()}
                    <span className="ml-1 tabular-nums">{simulatedProgress}%</span>
                  </p>
                  <TranscriptionBackgroundHint />
                </div>
              </div>
            </Card>
          )}

          {!isProcessing && preview!.quality && (
            <div data-tour="preview-quality">
              <QualityIndicator quality={preview!.quality} deepAnalysis />
            </div>
          )}

          {!isProcessing && preview!.translationLanguage && (
            <Card className="p-4 border-primary/20 bg-primary/[0.02]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Globe className={`h-5 w-5 shrink-0 ${preview!.translation ? "text-primary" : "text-muted-foreground"}`} />
                  <div>
                    <p className="text-sm font-medium">{t("preview.language")}</p>
                    <p className="text-xs text-muted-foreground">
                      {preview!.translation
                        ? t("preview.languageToggleHint")
                        : t("preview.translationUnavailable")}
                    </p>
                  </div>
                </div>
                {preview!.translation && (
                  <Tabs
                    value={displayLanguage}
                    onValueChange={(v) => setDisplayLanguage(v as DisplayLanguage)}
                  >
                    <TabsList>
                      <TabsTrigger value="de" className="text-sm px-4">{t("preview.german")}</TabsTrigger>
                      <TabsTrigger value="translation" className="text-sm px-4">
                        <Globe className="h-3.5 w-3.5 mr-1.5" />
                        {getTranslationLanguageLabel(preview!.translationLanguage!)}
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                )}
              </div>
            </Card>
          )}

          {!isProcessing && (preview!.transcriptionCompleted || preview!.transcriptionInterpreted) && (
            <Card className="p-4 border-primary/20 bg-primary/[0.02]">
              <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-amber-500 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{t("preview.chooseTextVersion")}</p>
                    <p className="text-xs text-muted-foreground hidden sm:block">
                      {t("preview.chooseTextVersionHint")}
                    </p>
                  </div>
                </div>
                <Tabs
                  value={textVersion}
                  onValueChange={(v) => setTextVersion(v as "original" | "completed" | "interpreted")}
                  className="w-full sm:w-auto"
                >
                  <TabsList className="grid w-full grid-cols-3 sm:inline-flex sm:w-auto">
                    <TabsTrigger value="original" className="text-xs sm:text-sm px-1.5 sm:px-4">
                      <FileText className="h-3.5 w-3.5 mr-1 sm:mr-1.5 hidden sm:inline-block" />
                      <span className="sm:hidden">{t("preview.versionOriginalShort")}</span>
                      <span className="hidden sm:inline">{t("preview.versionFaithful")}</span>
                    </TabsTrigger>
                    <TabsTrigger value="completed" className="text-xs sm:text-sm px-1.5 sm:px-4">
                      <Sparkles className="h-3.5 w-3.5 mr-1 sm:mr-1.5 hidden sm:inline-block" />
                      <span className="sm:hidden">{t("preview.versionCompletedShort")}</span>
                      <span className="hidden sm:inline">{t("preview.versionCompleted")}</span>
                    </TabsTrigger>
                    <TabsTrigger value="interpreted" className="text-xs sm:text-sm px-1.5 sm:px-4">
                      <Wand2 className="h-3.5 w-3.5 mr-1 sm:mr-1.5 hidden sm:inline-block" />
                      <span className="sm:hidden">{t("preview.versionInterpretedShort")}</span>
                      <span className="hidden sm:inline">{t("preview.versionInterpreted")}</span>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </Card>
          )}

          {!isProcessing && (
            <Card className="p-3 flex flex-wrap items-center justify-between gap-3 border-primary/20 bg-primary/[0.02]" data-tour="preview-buy">
              <div className="flex items-center gap-2">
                {preview!.currentCredits < preview!.creditsRequired && (
                  <Button variant="outline" size="sm" onClick={() => { trackBeginCheckout(); navigate("/app/pricing"); }}>
                    <Coins className="h-4 w-4 mr-2" />
                    {t("preview.buyCredits")}
                  </Button>
                )}
                <Button
                  size="sm"
                  disabled={purchaseMutation.isPending || preview!.currentCredits < preview!.creditsRequired}
                  onClick={() => purchaseMutation.mutate()}
                >
                  {purchaseMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : preview!.currentCredits < preview!.creditsRequired ? (
                    t("preview.notEnoughCredits")
                  ) : (
                    <>
                      {getTranscribeButtonLabel(t, preview!.totalPages, preview!.creditsRequired)}
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </Card>
          )}

          <div className="grid lg:grid-cols-2 gap-6 items-start">
            <div className="order-2 lg:order-1">
              <h2 className="font-serif text-lg font-semibold mb-3">{t("preview.original")}</h2>
              <Card ref={originalColRef}>
                {preview?.imageUrl ? (
                  <DocumentPreview
                    src={preview.imageUrl}
                    alt={t("preview.original")}
                    data-testid="img-original"
                  />
                ) : (
                  <div className="aspect-[3/4] flex items-center justify-center bg-muted/30 rounded-xl">
                    <Loader2 className="h-8 w-8 text-muted-foreground/40 animate-spin" />
                  </div>
                )}
              </Card>
            </div>

            <div className="order-1 lg:order-2 space-y-4 min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-serif text-lg font-semibold">{t("preview.transcription")}</h2>
                {!isProcessing && preview!.previewPageId != null && !isEditing && (
                  <div className="flex items-center gap-1">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => {
                              navigator.clipboard.writeText(getPreviewDisplayText(preview!, textVersion, displayLanguage));
                              toast({ title: t("common.copied"), description: t("common.copiedToClipboard") });
                            }}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{t("common.copy")}</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={startEditing} data-testid="button-edit-preview">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{t("common.edit")}</TooltipContent>
                      </Tooltip>
                      {getPreviewHasEdited(preview!, textVersion) && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => setShowResetDialog(true)}
                              data-testid="button-reset-preview"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{t("preview.restoreOriginal")}</TooltipContent>
                        </Tooltip>
                      )}
                    </TooltipProvider>
                  </div>
                )}
              </div>
              <Card className="p-5">
                {isProcessing ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mb-2 text-primary" />
                    <p className="font-serif text-sm">{t("preview.analyzingHandwriting")}</p>
                    <p className="text-xs mt-1">{t("preview.textAppearsHere")}</p>
                  </div>
                ) : (
                  <>
                    {textVersion === "completed" && preview!.transcriptionCompleted && !isEditing && (
                      <div className="flex items-center gap-1.5 mb-3 text-xs text-amber-600 dark:text-amber-400">
                        <Sparkles className="h-3 w-3" />
                        <span>{t("preview.gapsFilled")}</span>
                      </div>
                    )}
                    {textVersion === "interpreted" && (preview!.transcriptionInterpreted ?? (preview as any).transcription_interpreted ?? preview!.transcriptionCompleted) && !isEditing && (
                      <div className="flex items-center gap-1.5 mb-3 text-xs text-amber-600 dark:text-amber-400">
                        <Wand2 className="h-3 w-3" />
                        <span>{t("preview.interpretedNote")}</span>
                      </div>
                    )}
                    {getPreviewHasEdited(preview!, textVersion) && !isEditing && (
                      <Badge variant="secondary" className="mb-3 text-xs">{t("preview.edited")}</Badge>
                    )}
                    {isEditing ? (
                      <div className="space-y-3">
                        <textarea
                          className="w-full font-serif text-sm leading-relaxed whitespace-pre-wrap rounded-md border border-input bg-background px-3 py-2 resize-y"
                          style={{ minHeight: originalColHeight ? `${Math.max(200, originalColHeight)}px` : "300px" }}
                          value={editedTextDraft}
                          onChange={(e) => setEditedTextDraft(e.target.value)}
                          data-testid="textarea-edit-preview"
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={saveEditing} disabled={updatePageMutation.isPending} data-testid="button-save-preview">
                            {updatePageMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                            {t("common.save")}
                          </Button>
                          <Button size="sm" variant="outline" onClick={cancelEditing} disabled={updatePageMutation.isPending}>
                            {t("common.cancel")}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className="font-serif text-sm leading-relaxed whitespace-pre-wrap"
                        data-testid="text-transcription"
                      >
                        {getPreviewDisplayText(preview!, textVersion, displayLanguage)}
                      </div>
                    )}
                  </>
                    )}
              </Card>

            </div>
          </div>

          {!isProcessing && preview!.transcription && (
            <Card className="p-5 border-primary/20 bg-primary/[0.02]">
              {(() => {
                const displayText = getPreviewDisplayText(preview!, textVersion, displayLanguage);
                const pageCredits = ttsCreditsForText(displayText);
                const hasEnough = (preview!.currentCredits ?? 0) >= pageCredits;
                return (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="font-serif font-semibold text-sm flex items-center gap-2">
                        <Volume2 className="h-4 w-4 text-primary" />
                        {t("preview.ttsTitle")}
                      </h3>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Coins className="h-3.5 w-3.5" />
                        {t("preview.balance", { count: preview!.currentCredits })}
                      </span>
                    </div>

                    <AudioCharacterPicker
                      selectedVoice={ttsVoice}
                      selectedStyle={ttsStyle}
                      onSelect={(voice, style) => { setTtsVoice(voice); setTtsStyle(style); }}
                    />

                    {(() => {
                      const existingMatch = ttsCompletedForPreview.find(
                        (g) => g.voice === ttsVoice && (g.style || "") === (ttsStyle || "")
                      );
                      if (existingMatch) {
                        return (
                          <div className="border-t pt-3 space-y-2">
                            <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-2">
                              <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                                {t("preview.audioExists")}
                              </p>
                              <audio controls className="w-full h-9" src={existingMatch.audioUrl!} />
                              <Button size="sm" variant="ghost" className="h-7 text-xs px-2" asChild>
                                <a href={existingMatch.audioUrl!} download={existingMatch.audioUrl!.split("/").pop() ?? undefined}>
                                  <Download className="h-3 w-3 mr-1" />
                                  {t("common.download")}
                                </a>
                              </Button>
                            </div>
                          </div>
                        );
                      }
                      return (
                        <div className="border-t pt-3 space-y-3">
                          <p className="text-xs text-muted-foreground">
                            {t("preview.charsEqualsCredits", { chars: displayText.length.toLocaleString("de-DE"), count: pageCredits })}
                          </p>
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              size="sm"
                              disabled={ttsMutation.isPending || ttsGeneratingForPreview || !hasEnough}
                              onClick={() => ttsMutation.mutate()}
                            >
                              {ttsMutation.isPending || ttsGeneratingForPreview ? (
                                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                              ) : (
                                <Volume2 className="h-3.5 w-3.5 mr-1.5" />
                              )}
                              {ttsGeneratingForPreview
                                ? t("preview.audioGenerating")
                                : !hasEnough ? t("preview.notEnoughCredits") : t("preview.previewListen", { count: pageCredits })}
                            </Button>
                            {!hasEnough && !ttsGeneratingForPreview && (
                              <Button variant="ghost" size="sm" className="text-xs h-auto p-0 text-primary" onClick={() => { trackBeginCheckout(); navigate("/app/pricing"); }}>
                                {t("preview.buyCredits")}
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {ttsCompletedForPreview.length > 0 && (
                      <div className="space-y-3 pt-2 border-t">
                        <p className="text-xs font-semibold text-muted-foreground">
                          {ttsCompletedForPreview.length === 1 ? t("preview.playback") : t("preview.playbackVariants", { count: ttsCompletedForPreview.length })}
                        </p>
                        {ttsCompletedForPreview.map((gen) => {
                          const voiceMeta = TTS_VOICES.find((v) => v.name === gen.voice);
                          const styleLabel = gen.style ? TTS_STYLE_PRESETS.find((p) => p.value === gen.style)?.label ?? (gen.style || "").slice(0, 40) : null;
                          return (
                            <div key={gen.id} className="space-y-1.5 rounded-md border bg-muted/30 p-2.5">
                              <p className="text-xs text-muted-foreground">
                                <span className="font-medium">{gen.voice}</span>
                                {voiceMeta ? ` (${voiceMeta.gender})` : ""}
                                {styleLabel ? ` · ${styleLabel}` : ""}
                              </p>
                              <audio controls className="w-full h-9" src={gen.audioUrl!} />
                              <Button size="sm" variant="ghost" className="h-7 text-xs px-2" asChild>
                                <a href={gen.audioUrl!} download={gen.audioUrl!.split("/").pop() ?? undefined}>
                                  <Download className="h-3 w-3 mr-1" />
                                  {t("common.download")}
                                </a>
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}
            </Card>
          )}

          {!isProcessing && (
            <>
              <div className="grid sm:grid-cols-1 lg:grid-cols-3 gap-4">
                <Card className={`p-5 min-w-0 ${preview!.currentCredits < preview!.creditsRequired ? "border-amber-300/40 bg-amber-50/50 dark:bg-amber-950/10" : "border-primary/20 bg-primary/[0.02]"}`}>
                  <div className="flex flex-col gap-3 min-w-0">
                    <div className="flex items-center gap-2">
                      <Coins className="h-5 w-5 text-primary shrink-0" />
                      <h3 className="font-serif font-semibold">{t("preview.tierInstantTitle")}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {t("preview.tierInstantBody", { count: preview!.totalPages })}
                    </p>
                    {preview!.creditsRequired > 0 ? (
                      <p className="text-xs text-muted-foreground">
                        {t("preview.tierInstantCreditsNeeded", { required: preview!.creditsRequired, current: preview!.currentCredits })}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        {t("preview.tierInstantCreditsOk")}
                      </p>
                    )}
                    <div className="flex flex-col gap-2 mt-auto pt-2 w-full min-w-0">
                      {preview!.currentCredits < preview!.creditsRequired && (
                        <Button variant="outline" size="sm" className="w-full" onClick={() => { trackBeginCheckout(); navigate("/app/pricing"); }}>
                          <Coins className="h-4 w-4 mr-2" />
                          {t("preview.buyCredits")}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        className="w-full whitespace-normal h-auto py-2"
                        disabled={purchaseMutation.isPending || preview!.currentCredits < preview!.creditsRequired}
                        onClick={() => purchaseMutation.mutate()}
                        data-testid="button-purchase-transcription"
                        data-tour="preview-buy"
                      >
                        {purchaseMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            {t("preview.starting")}
                          </>
                        ) : preview!.currentCredits < preview!.creditsRequired ? (
                          t("preview.notEnoughCredits")
                        ) : (
                          <>
                            {getTranscribeButtonLabel(t, preview!.totalPages, preview!.creditsRequired, "compact")}
                            <ArrowRight className="h-4 w-4 ml-2 shrink-0" />
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </Card>

                <Card
                  className={
                    preview!.quality?.level === "yellow" || preview!.quality?.level === "red"
                      ? "p-5 border-amber-400/60 bg-amber-50/50 dark:bg-amber-950/20"
                      : "p-5 border-primary/20 bg-primary/[0.02]"
                  }
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-primary shrink-0" />
                      <h3 className="font-serif font-semibold">{t("preview.tierCheckedTitle")}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {t("preview.tierCheckedBody")}
                    </p>
                    <p className="text-sm font-semibold">
                      {(preview!.totalPages * 8.99).toFixed(2).replace(".", ",")} EUR
                      <span className="text-muted-foreground font-normal text-xs ml-1">{t("preview.tierCheckedPerPage")}</span>
                    </p>
                    {preview!.quality?.level === "red" ? (
                      <p className="text-xs text-destructive/80 leading-snug">
                        {t("preview.tierCheckedQualityRed")}
                      </p>
                    ) : preview!.quality?.level === "yellow" ? (
                      <p className="text-xs text-muted-foreground/80 leading-snug">
                        {t("preview.tierCheckedQualityYellow")}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground/80 leading-snug">
                        {t("preview.tierCheckedQualityGreen")}
                      </p>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-auto"
                      onClick={() => navigate(`/app/human-transcription/${params.id}?tier=ki_geprueft`)}
                    >
                      {t("preview.tierCheckedRequest")}
                    </Button>
                  </div>
                </Card>

                <Card
                  className={
                    preview!.quality?.level === "red"
                      ? "p-5 border-amber-400/60 bg-amber-50/50 dark:bg-amber-950/20"
                      : "p-5 border-amber-300/50 dark:border-amber-700/50 bg-amber-50/20 dark:bg-amber-950/10"
                  }
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <User className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
                      <h3 className="font-serif font-semibold">{t("preview.tierExpertTitle")}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {t("preview.tierExpertBody")}
                    </p>
                    <p className="text-sm font-semibold">
                      {t("preview.tierExpertPrice")}
                      <span className="text-muted-foreground font-normal text-xs block">{t("preview.tierExpertCustomQuote")}</span>
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-auto border-amber-400 dark:border-amber-600"
                      onClick={() => navigate(`/app/human-transcription/${params.id}?tier=experten`)}
                    >
                      {t("preview.tierExpertRequest")}
                    </Button>
                  </div>
                </Card>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2">
                <Button variant="ghost" size="sm" onClick={() => navigate("/app")}>
                  {t("common.cancel")}
                </Button>
              </div>
            </>
          )}

          <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("preview.resetDialogTitle")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("preview.resetDialogBody")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={resetToOriginal}
                >
                  {t("preview.resetDialogConfirm")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  );
}
