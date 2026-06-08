import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useParams, useSearch } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient, getAuthHeaders } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Copy,
  CheckCircle2,
  Coins,
  Download,
  FileText,
  Globe,
  Loader2,
  Lock,
  Pencil,
  RefreshCw,
  RotateCcw,
  Sparkles,
  StopCircle,
  User,
  Volume2,
  Wand2,
  XCircle,
} from "lucide-react";
import { DocumentPreview } from "@/components/document-preview";
import { TranscriptionBackgroundHint } from "@/components/transcription-background-hint";
import { QualityIndicator, type QualityDetails } from "@/components/quality-indicator";
import { trackBeginCheckout } from "@/lib/gtag";
import { PdfExportDialog } from "@/components/pdf-export-dialog";
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
import { useToast } from "@/hooks/use-toast";
import html2canvas from "html2canvas";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Headphones } from "lucide-react";
import type { TranscriptionPage, UserCredits } from "@shared/models/transcription";
import { getScriptTypeDisplayLabel, getTranslationLanguageLabel } from "@shared/models/transcription";
import { TTS_VOICES, TTS_STYLE_PRESETS, TTS_CHARACTERS, TTS_CHARACTER_STYLES, ttsCreditsForText } from "@/lib/tts-constants";
import { AudioCharacterPicker } from "@/components/audio-character-picker";

interface ResultProgress {
  completed: number;
  processing: number;
  failed: number;
  pending: number;
  total: number;
}

interface ResultData {
  job: {
    id: number;
    scriptType: string;
    status: string;
    totalPages: number;
    createdAt: string;
    translationLanguage?: string;
  };
  pages: TranscriptionPage[];
  progress?: ResultProgress;
  expertResult?: {
    request: {
      id: number;
      serviceLevel: "ki_geprueft" | "experten";
      completedAt: string | null;
    };
    results: Array<{
      pageId: number | null;
      pageNumber: number;
      text: string;
      expertNotes: string | null;
    }>;
  } | null;
}

/** Read interpreted text from page (supports camelCase and snake_case from API) */
function getPageInterpreted(page: TranscriptionPage & Record<string, unknown>): string | null | undefined {
  return page.transcriptionInterpreted ?? (page.transcription_interpreted as string) ?? null;
}

type TextVersion = "original" | "completed" | "interpreted";
type DisplayLanguage = "de" | "translation";


/** Get edited value for a version (camelCase or snake_case from API) */
function getPageEdited(page: TranscriptionPage & Record<string, unknown>, version: TextVersion): string | null | undefined {
  if (version === "original") return page.transcriptionEdited ?? (page.transcription_edited as string) ?? null;
  if (version === "completed") return page.transcriptionCompletedEdited ?? (page.transcription_completed_edited as string) ?? null;
  return page.transcriptionInterpretedEdited ?? (page.transcription_interpreted_edited as string) ?? null;
}

/** Effective display text for given version + language. For translation mode, reads from translation fields. */
function getPageDisplayText(page: TranscriptionPage & Record<string, unknown>, version: TextVersion, lang: DisplayLanguage = "de"): string | null {
  if (lang === "translation") {
    if (version === "interpreted") return (page as any).translationInterpreted || (page as any).translation_interpreted || (page as any).translationCompleted || (page as any).translation_completed || (page as any).translation || null;
    if (version === "completed") return (page as any).translationCompleted || (page as any).translation_completed || (page as any).translation || null;
    return (page as any).translation || null;
  }
  const edited = getPageEdited(page, version);
  if (edited != null && edited !== "") return edited;
  if (version === "interpreted") return getPageInterpreted(page) || page.transcriptionCompleted || page.transcription || null;
  if (version === "completed" && page.transcriptionCompleted) return page.transcriptionCompleted;
  return page.transcription ?? null;
}

/** Whether this page has a user-edited version for the given variant */
function getPageHasEdited(page: TranscriptionPage & Record<string, unknown>, version: TextVersion): boolean {
  const v = getPageEdited(page, version);
  return v != null && v !== "";
}

/** Capture only the transcription text card as PNG (hides UI chrome during capture) */
async function downloadResultPageAsImage(containerEl: HTMLDivElement | null, pageNumber: number, t: TFunction): Promise<void> {
  if (!containerEl) throw new Error(t("result.errorPageNotLoaded"));
  const hiddenEls = containerEl.querySelectorAll<HTMLElement>("[data-export-hide]");
  hiddenEls.forEach((el) => (el.style.display = "none"));
  try {
    const canvas = await html2canvas(containerEl, {
      useCORS: true,
      allowTaint: true,
      scale: 2,
      backgroundColor: null,
      logging: false,
    });
    return await new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error(t("result.errorImageFailed")));
            return;
          }
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = `Ergebnis-Seite-${pageNumber}.png`;
          a.click();
          URL.revokeObjectURL(a.href);
          resolve();
        },
        "image/png",
        0.95,
      );
    });
  } finally {
    hiddenEls.forEach((el) => (el.style.display = ""));
  }
}

function PageNavigator({
  currentPage,
  totalPages,
  pages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  pages?: TranscriptionPage[];
  onPageChange: (page: number) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        className="h-10 w-10 sm:h-8 sm:w-8 shrink-0"
        disabled={currentPage <= 0}
        onClick={() => onPageChange(currentPage - 1)}
        aria-label={t("result.prevPage")}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <Select
        value={String(currentPage)}
        onValueChange={(val) => onPageChange(Number(val))}
      >
        <SelectTrigger className="w-auto min-w-0 flex-1 sm:flex-none sm:min-w-[160px] h-10 sm:h-8 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Array.from({ length: totalPages }, (_, i) => {
            const pageStatus = pages?.[i]?.status;
            return (
              <SelectItem key={i} value={String(i)}>
                <span className="flex items-center gap-2">
                  {pageStatus === "completed" ? (
                    <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                  ) : pageStatus === "processing" ? (
                    <Loader2 className="h-3 w-3 text-amber-500 animate-spin shrink-0" />
                  ) : pageStatus === "failed" ? (
                    <span className="h-3 w-3 text-destructive text-center shrink-0">✗</span>
                  ) : pageStatus === "pending" ? (
                    <span className="h-3 w-3 rounded-full border border-muted-foreground/30 inline-block shrink-0" />
                  ) : null}
                  {t("result.pageOf", { n: i + 1, total: totalPages })}
                </span>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      <Button
        variant="outline"
        size="icon"
        className="h-10 w-10 sm:h-8 sm:w-8 shrink-0"
        disabled={currentPage >= totalPages - 1}
        onClick={() => onPageChange(currentPage + 1)}
        aria-label={t("result.nextPage")}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

export default function ResultPage() {
  const params = useParams<{ id: string }>();
  const search = useSearch();
  const [, navigate] = useLocation();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [currentPageIdx, setCurrentPageIdx] = useState(0);
  const [textVersion, setTextVersion] = useState<"original" | "completed" | "interpreted">("original");
  const [displayLanguage, setDisplayLanguage] = useState<DisplayLanguage | null>(null);
  const effectiveDisplayLanguage: DisplayLanguage = displayLanguage ?? "de";
  const [exporting, setExporting] = useState<"text" | "pdf" | null>(null);
  const [showPdfExport, setShowPdfExport] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [editingPageId, setEditingPageId] = useState<number | null>(null);
  const [editingVersion, setEditingVersion] = useState<TextVersion | null>(null);
  const [editedTextDraft, setEditedTextDraft] = useState("");
  const [showResetDialog, setShowResetDialog] = useState<{ pageId: number; version: TextVersion } | null>(null);
  const [showTtsSheet, setShowTtsSheet] = useState(false);
  const [savingImagePageId, setSavingImagePageId] = useState<number | null>(null);
  const [ttsVoice, setTtsVoice] = useState(TTS_CHARACTERS[0].voice);
  const [ttsStyle, setTtsStyle] = useState(TTS_CHARACTER_STYLES[0].prompt);

  const originalColRef = useRef<HTMLDivElement>(null);
  const transcriptionColRef = useRef<HTMLDivElement>(null);
  const [originalColHeight, setOriginalColHeight] = useState<number | null>(null);

  useEffect(() => {
    if (!originalColRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) setOriginalColHeight(Math.round(entry.contentRect.height));
    });
    ro.observe(originalColRef.current);
    return () => ro.disconnect();
  }, [currentPageIdx]);

  const { data, isLoading } = useQuery<ResultData>({
    queryKey: ["/api/jobs", params.id, "result"],
    refetchInterval: (query) => {
      const d = query.state.data;
      if (!d || d.job.status === "processing") return 3000;
      const hasUnfinishedPages = d.pages?.some(
        (p) => p.status === "pending" || p.status === "processing",
      );
      if (hasUnfinishedPages) return 3000;
      return false;
    },
  });

  const { data: credits } = useQuery<UserCredits>({
    queryKey: ["/api/credits"],
  });

  const { data: ttsCostAll } = useQuery<{ totalCharacters: number; creditsRequired: number; currentCredits: number }>({
    queryKey: ["/api/jobs", params.id, "tts-cost", textVersion, effectiveDisplayLanguage],
    queryFn: async () => {
      const url = `/api/jobs/${params.id}/tts-cost?version=${encodeURIComponent(textVersion)}&lang=${encodeURIComponent(effectiveDisplayLanguage)}&pages=all`;
      const res = await apiRequest("GET", url);
      return res.json();
    },
    enabled: !!params.id && !!data?.job && data.job.status !== "preview" && data.job.status !== "processing",
  });

  type TtsGeneration = { id: number; version: string; lang: string; voice: string; style: string | null; pages: number[] | "all"; status: string; failReason: string | null; audioUrl: string | null; creditsUsed: number; createdAt: string };
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

  const prevTtsGeneratingIds = useRef<Set<number>>(new Set());
  useEffect(() => {
    if (!ttsHistory?.generations) return;
    const currentGenerating = new Set(
      ttsHistory.generations.filter((g) => g.status === "generating").map((g) => g.id),
    );
    const newlyFailed = ttsHistory.generations.filter(
      (g) => g.status === "failed" && prevTtsGeneratingIds.current.has(g.id),
    );
    if (newlyFailed.length > 0) {
      queryClient.invalidateQueries({ queryKey: ["/api/credits"] });
      const reason = newlyFailed[0]?.failReason;
      const isOverloaded = reason && /überlastet|overloaded|503/i.test(reason);
      toast({
        title: t("result.ttsServiceUnavailableTitle"),
        description: isOverloaded
          ? t("result.ttsOverloadedBody")
          : t("result.ttsAudioErrorBody"),
        variant: "destructive",
      });
    }
    prevTtsGeneratingIds.current = currentGenerating;
  }, [ttsHistory?.generations]);

  const userChangedLanguage = useRef(false);
  const hadTranslation = useRef(false);

  // Auto-switch to translation tab once the first translation arrives
  useEffect(() => {
    if (!data?.job) return;

    if (!data.job.translationLanguage) {
      if (displayLanguage === null) setDisplayLanguage("de");
      return;
    }

    const hasAnyTranslation = data.pages.some((p: any) => p.translation);

    if (displayLanguage === null) {
      setDisplayLanguage(hasAnyTranslation ? "translation" : "de");
      if (hasAnyTranslation) hadTranslation.current = true;
      return;
    }

    if (!userChangedLanguage.current && !hadTranslation.current && hasAnyTranslation) {
      hadTranslation.current = true;
      setDisplayLanguage("translation");
    }
  }, [data, displayLanguage]);

  const prevPageStatuses = useRef<Map<number, string>>(new Map());
  const shownTranslationErrors = useRef<Set<number>>(new Set());
  useEffect(() => {
    if (!data?.pages) return;
    const prev = prevPageStatuses.current;

    for (const page of data.pages) {
      const prevStatus = prev.get(page.id);

      if (prevStatus && prevStatus !== "failed" && page.status === "failed") {
        queryClient.invalidateQueries({ queryKey: ["/api/credits"] });
        toast({
          title: t("result.transcriptionFailedTitle"),
          description: page.transcription || t("result.transcriptionFailedRetryBody"),
          variant: "destructive",
        });
      }

      if (
        page.status === "completed" &&
        prevStatus !== "completed" &&
        data.job.translationLanguage &&
        !page.translation
      ) {
        const qd = page.qualityDetails as Record<string, unknown> | null;
        const translationError = qd?.translationError as string | undefined;
        if (translationError && !shownTranslationErrors.current.has(page.id)) {
          shownTranslationErrors.current.add(page.id);
          toast({
            title: t("result.translationFailedTitle"),
            description: translationError,
            variant: "destructive",
          });
        }
      }
    }

    const next = new Map<number, string>();
    for (const page of data.pages) next.set(page.id, page.status);
    prevPageStatuses.current = next;
  }, [data?.pages, data?.job?.translationLanguage, toast]);

  useEffect(() => {
    const sp = new URLSearchParams(search);
    if (sp.get("fromPreview") !== "true" || !params.id) return;
    const key = `tts-hint-shown-${params.id}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    const timer = setTimeout(() => {
      toast({
        title: t("result.tipReadAloudTitle"),
        description: t("result.tipReadAloudBody"),
      });
    }, 2000);
    return () => clearTimeout(timer);
  }, [search, params.id, toast]);

  const ttsMutation = useMutation({
    mutationFn: async (payload: { pages: number[] | "all"; voice: string; style?: string }) => {
      const res = await apiRequest("POST", `/api/jobs/${params.id}/tts`, {
        version: textVersion,
        lang: effectiveDisplayLanguage,
        voice: payload.voice,
        style: payload.style || undefined,
        pages: payload.pages,
      });
      return res.json() as Promise<{ generationId: number; status: string; creditsUsed: number }>;
    },
    onSuccess: (body) => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs", params.id, "tts-history"] });
      if (body.creditsUsed > 0) {
        queryClient.invalidateQueries({ queryKey: ["/api/credits"] });
        toast({ title: t("result.ttsToastTitle"), description: t("result.ttsCreditsUsed", { count: body.creditsUsed, credits: body.creditsUsed === 1 ? t("result.creditOne") : t("result.creditMany") }) });
      }
    },
    onError: (error: Error) => {
      toast({ title: t("result.ttsFailedTitle"), description: error.message, variant: "destructive" });
    },
  });

  const purchaseMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/jobs/${params.id}/transcribe`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/credits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs", params.id, "result"] });
      toast({ title: t("result.startedTitle"), description: t("result.pagesEvaluatingBody") });
    },
    onError: (error: Error) => {
      toast({
        title: t("result.errorTitle"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/jobs/${params.id}/cancel`);
      return res.json() as Promise<{ refundedCredits: number }>;
    },
    onSuccess: (body) => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/credits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs", params.id, "result"] });
      const n = body.refundedCredits ?? 0;
      toast({
        title: t("result.cancelledTitle"),
        description: n > 0 ? t("result.pagesRefunded", { count: n }) : t("result.processingStopped"),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t("result.errorTitle"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const retryPageMutation = useMutation({
    mutationFn: async (pageId: number) => {
      const res = await apiRequest("POST", `/api/jobs/${params.id}/pages/${pageId}/retry`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs", params.id, "result"] });
      queryClient.invalidateQueries({ queryKey: ["/api/credits"] });
      toast({ title: t("result.startedTitle"), description: t("result.pageRetryingBody") });
    },
    onError: (error: Error) => {
      toast({ title: t("result.errorTitle"), description: error.message, variant: "destructive" });
    },
  });

  const retryAllFailedMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/jobs/${params.id}/retry-failed`);
      return res.json() as Promise<{ pageCount: number }>;
    },
    onSuccess: (body) => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs", params.id, "result"] });
      queryClient.invalidateQueries({ queryKey: ["/api/credits"] });
      toast({ title: t("result.startedTitle"), description: t("result.pagesRetrying", { count: body.pageCount }) });
    },
    onError: (error: Error) => {
      toast({ title: t("result.errorTitle"), description: error.message, variant: "destructive" });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: t("common.copied"), description: t("common.copiedToClipboard") });
  };

  const updatePageMutation = useMutation({
    mutationFn: async ({
      pageId,
      version,
      text,
    }: { pageId: number; version: TextVersion; text: string | null }) => {
      const res = await apiRequest("PATCH", `/api/jobs/${params.id}/pages/${pageId}`, { version, text });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs", params.id, "result"] });
      setEditingPageId(null);
      setEditingVersion(null);
      setEditedTextDraft("");
      toast({ title: t("result.savedTitle"), description: t("result.changesSavedBody") });
    },
    onError: (error: Error) => {
      toast({ title: t("result.errorTitle"), description: error.message, variant: "destructive" });
    },
  });

  const startEditing = (page: TranscriptionPage, version: TextVersion) => {
    const display = getPageDisplayText(page as TranscriptionPage & Record<string, unknown>, version, effectiveDisplayLanguage);
    setEditingPageId(page.id);
    setEditingVersion(version);
    setEditedTextDraft(display ?? "");
  };

  const cancelEditing = () => {
    setEditingPageId(null);
    setEditingVersion(null);
    setEditedTextDraft("");
  };

  const saveEditing = () => {
    if (editingPageId == null || editingVersion == null) return;
    updatePageMutation.mutate({ pageId: editingPageId, version: editingVersion, text: editedTextDraft });
  };

  const resetToOriginal = () => {
    const target = showResetDialog;
    setShowResetDialog(null);
    if (!target) return;
    updatePageMutation.mutate({ pageId: target.pageId, version: target.version, text: null });
  };

  const copyAll = () => {
    if (!data) return;
    const fullText = data.pages
      .filter((p) => p.transcription)
      .map((p) => {
        const text = getPageDisplayText(p as TranscriptionPage & Record<string, unknown>, textVersion, effectiveDisplayLanguage);
        return `--- ${t("result.pageSeparator", { n: p.pageNumber })} ---\n${text ?? ""}`;
      })
      .join("\n\n");
    copyToClipboard(fullText);
  };

  const downloadExport = async (type: "text" | "pdf") => {
    if (!params.id) return;
    setExporting(type);
    try {
      const headers = await getAuthHeaders();
      const langParam = effectiveDisplayLanguage === "translation" ? "&lang=translation" : "";
      const url = type === "pdf"
        ? `/api/jobs/${params.id}/export-pdf?version=${textVersion}${langParam}`
        : `/api/jobs/${params.id}/export?version=${textVersion}${langParam}`;
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error(res.status === 401 ? t("result.errorReLogin") : t("result.errorExportFailed"));
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition");
      const match = disposition?.match(/filename="?([^";\n]+)"?/);
      const filename = match?.[1] ?? (type === "pdf" ? `transkription-${params.id}.pdf` : `transkription-${params.id}.txt`);
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(objectUrl);
      toast({ title: t("result.exportTitle"), description: type === "pdf" ? t("result.pdfDownloading") : t("result.textDownloading") });
    } catch (e) {
      toast({ title: t("result.errorTitle"), description: e instanceof Error ? e.message : t("result.errorExportFailed"), variant: "destructive" });
    } finally {
      setExporting(null);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-4 sm:p-6 max-w-5xl mx-auto text-center">
        <p className="text-muted-foreground">{t("result.notFound")}</p>
      </div>
    );
  }

  if (data.expertResult?.results?.length) {
    const label = data.expertResult.request.serviceLevel === "ki_geprueft"
      ? t("result.aiVerifiedTranscription")
      : t("result.expertTranscription");
    const resultPages = data.expertResult.results;
    const selectedResult = resultPages[Math.min(currentPageIdx, resultPages.length - 1)];
    const sourcePage = data.pages.find((p) => p.pageNumber === selectedResult.pageNumber) ?? data.pages[0];

    return (
      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="font-serif text-2xl font-bold">{label}</h1>
              <Badge variant="secondary" className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {t("result.statusDone")}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {t("result.expertFinalVersion", { count: data.job.totalPages })}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="ghost" size="sm" onClick={() => navigate("/app")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("result.dashboard")}
            </Button>
            <Button variant="outline" size="sm" disabled={exporting !== null} onClick={() => downloadExport("text")}>
              {exporting === "text" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
              {t("result.textExport")}
            </Button>
            <Button size="sm" onClick={() => setShowPdfExport(true)}>
              <BookOpen className="h-4 w-4 mr-2" />
              {t("result.pdfExport")}
            </Button>
          </div>
        </div>

        <PageNavigator
          currentPage={Math.min(currentPageIdx, resultPages.length - 1)}
          totalPages={resultPages.length}
          onPageChange={setCurrentPageIdx}
        />

        <div className="grid lg:grid-cols-2 gap-6 items-start">
          <div>
            <h2 className="font-serif text-lg font-semibold mb-3">{t("result.original")}</h2>
            <Card>
              {sourcePage ? (
                <DocumentPreview src={sourcePage.imageUrl} alt={t("result.originalAlt", { n: selectedResult.pageNumber })} />
              ) : (
                <div className="p-8 text-center text-muted-foreground">{t("result.noOriginalImage")}</div>
              )}
            </Card>
          </div>
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="font-serif text-lg font-semibold">{label}</h2>
              <Button size="sm" variant="ghost" onClick={() => copyToClipboard(selectedResult.text)}>
                <Copy className="h-4 w-4 mr-2" />
                {t("common.copy")}
              </Button>
            </div>
            <Card className="p-5">
              <div className="font-serif text-sm leading-relaxed whitespace-pre-wrap">
                {selectedResult.text}
              </div>
            </Card>
          </div>
        </div>

        <PdfExportDialog
          open={showPdfExport}
          onOpenChange={setShowPdfExport}
          jobId={params.id}
          textVersion="interpreted"
          anyPageHasCompleted
          anyPageHasInterpreted
        />
      </div>
    );
  }

  const isJobProcessing = data.job.status === "processing";
  const hasRetryingPages = data.pages.some((p) => p.status === "pending" || p.status === "processing");
  const isProcessing = isJobProcessing || hasRetryingPages;
  const isPreviewOnly = data.job.status === "preview";
  const remainingPages = data.pages.filter((p) => p.status === "pending").length;
  const failedPages = data.pages.filter((p) => p.status === "failed");
  const failedCount = failedPages.length;
  const currentCredits = credits?.credits ?? 0;
  const hasEnoughCredits = currentCredits >= remainingPages;

  // For the page content renderer
  const currentPage = data.pages[currentPageIdx];

  function ttsPagesEqual(a: number[] | "all", b: number[] | "all"): boolean {
    if (a === "all" && b === "all") return true;
    if (a === "all" || b === "all") return false;
    return a.length === b.length && a.every((v, i) => v === b[i]);
  }
  const ttsMatchesForThisPage = (() => {
    if (!currentPage || !ttsHistory?.generations?.length) return [];
    const wantPages: number[] = [currentPage.pageNumber];
    return ttsHistory.generations.filter(
      (g) =>
        g.version === textVersion &&
        g.lang === effectiveDisplayLanguage &&
        ttsPagesEqual(g.pages as number[] | "all", wantPages),
    );
  })();
  const ttsGeneratingForPage = ttsMatchesForThisPage.some((g) => g.status === "generating");
  const ttsCompletedForPage = ttsMatchesForThisPage.filter((g) => g.status === "completed" && g.audioUrl);

  const ttsMatchesForAll = (() => {
    if (!ttsHistory?.generations?.length) return [];
    return ttsHistory.generations.filter(
      (g) =>
        g.version === textVersion &&
        g.lang === effectiveDisplayLanguage &&
        ttsPagesEqual(g.pages as number[] | "all", "all"),
    );
  })();
  const ttsGeneratingForAll = ttsMatchesForAll.some((g) => g.status === "generating");
  const ttsCompletedForAll = ttsMatchesForAll.filter((g) => g.status === "completed" && g.audioUrl);

  // Check if any page has enhanced versions (completed or interpreted)
  const anyPageHasCompleted = data.pages.some((p) => p.transcriptionCompleted);
  const anyPageHasInterpreted = data.pages.some((p) => getPageInterpreted(p as TranscriptionPage & Record<string, unknown>));
  const anyPageHasEnhanced = anyPageHasCompleted || anyPageHasInterpreted;

  // Quality data from the preview page (first analyzed page)
  const previewPage = data.pages.find((p) => p.isPreview) ?? data.pages[0];
  const qualityData = previewPage?.qualityDetails as QualityDetails | null;

  function renderPageContent(page: TranscriptionPage) {
    const hasTranscription = page.transcription && page.status === "completed";
    const isLockedPage = isPreviewOnly && !page.isPreview && !hasTranscription;
    const pageWithUnknown = page as TranscriptionPage & Record<string, unknown>;
    const interpretedText = getPageInterpreted(pageWithUnknown);
    const displayText = getPageDisplayText(pageWithUnknown, textVersion, effectiveDisplayLanguage);
    const isEditingThis = editingPageId === page.id && editingVersion === textVersion;
    const hasEditedThis = getPageHasEdited(pageWithUnknown, textVersion);

    const savingImage = savingImagePageId === page.id;
    const handleSaveImage = async () => {
      setSavingImagePageId(page.id);
      try {
        await downloadResultPageAsImage(transcriptionColRef.current, page.pageNumber, t);
        toast({ title: t("result.savedTitle"), description: t("result.resultPageImageSaved", { n: page.pageNumber }) });
      } catch (e) {
        toast({ variant: "destructive", title: t("result.errorTitle"), description: (e as Error).message });
      } finally {
        setSavingImagePageId(null);
      }
    };

    return (
      <div className="grid lg:grid-cols-2 gap-6 items-start">
        <div className="order-2 lg:order-1">
          <h2 className="font-serif text-lg font-semibold mb-3">{t("result.original")}</h2>
          <Card ref={originalColRef}>
            <DocumentPreview
              src={page.imageUrl}
              alt={t("result.originalAlt", { n: page.pageNumber })}
              data-testid={`img-original-${page.pageNumber}`}
            />
          </Card>
        </div>
        <div ref={transcriptionColRef} className="order-1 lg:order-2 min-w-0">
          <div data-export-hide className="flex items-center justify-between gap-2 mb-2">
            <h2 className="font-serif text-lg font-semibold">{t("result.transcription")}</h2>
            {hasTranscription && !isEditingThis && (
              <div className="flex items-center gap-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-10 w-10 sm:h-8 sm:w-8" onClick={() => copyToClipboard(displayText || "")} data-testid={`button-copy-page-${page.pageNumber}`}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t("common.copy")}</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-10 w-10 sm:h-8 sm:w-8" onClick={() => startEditing(page, textVersion)} data-testid={`button-edit-page-${page.pageNumber}`}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t("common.edit")}</TooltipContent>
                  </Tooltip>
                  {hasEditedThis && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-10 w-10 sm:h-8 sm:w-8" onClick={() => setShowResetDialog({ pageId: page.id, version: textVersion })} data-testid={`button-reset-page-${page.pageNumber}`}>
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{t("result.restoreOriginal")}</TooltipContent>
                    </Tooltip>
                  )}
                </TooltipProvider>
              </div>
            )}
          </div>
          {hasTranscription && data!.job.translationLanguage && (page as any).translation && (
            <div data-export-hide className="flex items-center gap-2 mb-2 -mx-1 px-1 overflow-x-auto">
              <Tabs
                value={effectiveDisplayLanguage}
                onValueChange={(v) => { userChangedLanguage.current = true; setDisplayLanguage(v as DisplayLanguage); }}
              >
                <TabsList className="h-9 sm:h-8">
                  <TabsTrigger value="de" className="text-xs px-3 h-7 sm:h-6 whitespace-nowrap">
                    {t("result.original")}
                  </TabsTrigger>
                  <TabsTrigger value="translation" className="text-xs px-3 h-7 sm:h-6 whitespace-nowrap">
                    <Globe className="h-3 w-3 mr-1" />
                    {getTranslationLanguageLabel(data!.job.translationLanguage!)}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          )}
          {hasTranscription && anyPageHasEnhanced ? (
            <div data-export-hide className="flex items-center justify-between gap-2 mb-3 flex-wrap">
              <Tabs
                value={textVersion}
                onValueChange={(v) => setTextVersion(v as "original" | "completed" | "interpreted")}
                className="min-w-0 max-w-full overflow-x-auto"
                data-tour="result-tabs"
              >
                <TabsList className="h-9 sm:h-8">
                  <TabsTrigger
                    value="original"
                    className="text-xs px-3 h-7 sm:h-6 whitespace-nowrap"
                    data-tour="result-tab-original"
                    data-testid="result-tab-original"
                  >
                    <FileText className="h-3 w-3 mr-1" />
                    {t("result.faithful")}
                  </TabsTrigger>
                  <TabsTrigger
                    value="completed"
                    className="text-xs px-3 h-7 sm:h-6 whitespace-nowrap"
                    data-tour="result-tab-completed"
                    data-testid="result-tab-completed"
                  >
                    <Sparkles className="h-3 w-3 mr-1" />
                    {t("result.completed")}
                  </TabsTrigger>
                  <TabsTrigger
                    value="interpreted"
                    className="text-xs px-3 h-7 sm:h-6 whitespace-nowrap"
                    data-tour="result-tab-interpreted"
                    data-testid="result-tab-interpreted"
                  >
                    <Wand2 className="h-3 w-3 mr-1" />
                    {t("result.interpretation")}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSaveImage}
                      disabled={savingImage}
                      className="gap-1.5 h-8 shrink-0"
                      data-testid={`button-save-image-page-${page.pageNumber}`}
                    >
                      {savingImage ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                      {t("result.saveAsImage")}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t("result.saveAsImageTooltip")}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          ) : hasTranscription ? (
            <div data-export-hide className="flex justify-end mb-3">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSaveImage}
                      disabled={savingImage}
                      className="gap-1.5 h-8"
                      data-testid={`button-save-image-page-${page.pageNumber}`}
                    >
                      {savingImage ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                      {t("result.saveAsImage")}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t("result.saveAsImageTooltip")}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          ) : null}
          {isLockedPage ? (
            <Card className="p-8 text-center">
              <Lock className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <h3 className="font-serif font-semibold mb-1">{t("result.lockedPageTitle")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("result.lockedPageBody")}
              </p>
            </Card>
          ) : page.status === "failed" ? (
            <Card className="p-6 border-destructive/30 bg-destructive/5">
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <XCircle className="h-8 w-8 text-destructive" />
                <div>
                  <h3 className="font-serif font-semibold mb-1">{t("result.transcriptionFailedTitle")}</h3>
                  <p className="text-sm text-muted-foreground">
                    {page.transcription || t("result.transcriptionFailedBody")}
                  </p>
                </div>
                <Button
                  onClick={() => retryPageMutation.mutate(page.id)}
                  disabled={retryPageMutation.isPending || retryAllFailedMutation.isPending}
                  size="sm"
                >
                  {retryPageMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  {t("result.retryPage")}
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="p-5">
              {hasTranscription && textVersion === "completed" && page.transcriptionCompleted && !isEditingThis && (
                <div className="flex items-center gap-1.5 mb-3 text-xs text-amber-600 dark:text-amber-400">
                  <Sparkles className="h-3 w-3" />
                  <span>{t("result.gapsFilled")}</span>
                </div>
              )}
              {hasTranscription && textVersion === "interpreted" && (interpretedText || page.transcriptionCompleted) && !isEditingThis && (
                <div className="flex items-center gap-1.5 mb-3 text-xs text-amber-600 dark:text-amber-400">
                  <Wand2 className="h-3 w-3" />
                  <span>{t("result.interpretedNote")}</span>
                </div>
              )}
              {hasTranscription && hasEditedThis && !isEditingThis && (
                <Badge variant="secondary" className="mb-3 text-xs">{t("result.editedBadge")}</Badge>
              )}
              {!displayText && (page.status === "pending" || page.status === "processing") ? (
                <div className="flex flex-col items-center justify-center py-4 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin mb-2 text-primary" />
                  <p className="font-serif text-sm">
                    {page.status === "processing" ? t("result.pageTranscribing") : t("result.waitingForProcessing")}
                  </p>
                  <TranscriptionBackgroundHint className="mt-1 text-center max-w-xs" />
                </div>
              ) : isEditingThis ? (
                <div className="space-y-3">
                  <textarea
                    className="w-full font-serif text-sm leading-relaxed whitespace-pre-wrap rounded-md border border-input bg-background px-3 py-2 resize-y"
                    style={{ minHeight: originalColHeight ? `${Math.max(200, originalColHeight)}px` : "300px" }}
                    value={editedTextDraft}
                    onChange={(e) => setEditedTextDraft(e.target.value)}
                    data-testid={`textarea-edit-page-${page.pageNumber}`}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveEditing} disabled={updatePageMutation.isPending} data-testid={`button-save-page-${page.pageNumber}`}>
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
                  data-testid={`text-transcription-${page.pageNumber}`}
                >
                  {displayText || t("result.noTextForPage")}
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="font-serif text-2xl font-bold" data-testid="text-result-title">
              {t("result.title")}
            </h1>
            {isProcessing ? (
              <Badge variant="secondary" className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                {t("result.statusProcessing")}
              </Badge>
            ) : isPreviewOnly ? (
              <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                <FileText className="h-3 w-3 mr-1" />
                {t("result.statusPreview")}
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {t("result.statusDone")}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {getScriptTypeDisplayLabel(data.job.scriptType) && (
              <>{getScriptTypeDisplayLabel(data.job.scriptType)} &middot;{" "}</>
            )}
            {t("result.pageCount", { count: data.job.totalPages })}
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            {t("result.disclaimer")}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="ghost" size="sm" className="shrink-0" onClick={() => navigate("/app")} data-testid="button-back">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("result.dashboard")}
          </Button>
          {!isProcessing && !isPreviewOnly && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="text-xs sm:text-sm shrink-0"
                data-testid="button-export-text"
                disabled={exporting !== null}
                onClick={() => downloadExport("text")}
              >
                {exporting === "text" ? (
                  <Loader2 className="h-4 w-4 mr-1.5 sm:mr-2 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4 mr-1.5 sm:mr-2" />
                )}
                <span className="sm:hidden">{t("result.textShort")}</span>
                <span className="hidden sm:inline">{t("result.textExport")}</span>
              </Button>
              <Button
                size="sm"
                className="text-xs sm:text-sm shrink-0"
                data-testid="button-export-pdf"
                data-tour="result-export-pdf"
                onClick={() => setShowPdfExport(true)}
              >
                <BookOpen className="h-4 w-4 mr-1.5 sm:mr-2" />
                <span className="sm:hidden">{t("result.pdfShort")}</span>
                <span className="hidden sm:inline">{t("result.pdfExport")}</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {qualityData && isPreviewOnly && (
        <QualityIndicator quality={qualityData} deepAnalysis />
      )}

      {/* CTA when only preview is available */}
      {isPreviewOnly && (
        <>
          <Card className={`p-5 ${!hasEnoughCredits ? "border-amber-300/40 bg-amber-50/50 dark:bg-amber-950/10" : "border-primary/20 bg-primary/[0.02]"}`}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="font-serif font-semibold mb-1">
                  {t("result.getAllPagesAsText", { count: data.pages.length })}
                </h3>
                {remainingPages > 0 ? (
                  <>
                    <p className="text-sm text-muted-foreground">
                      {t("result.creditsNeeded", { count: remainingPages })}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      <Coins className="h-3 w-3 inline mr-1" />
                      {t("result.yourBalance", { count: currentCredits })}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t("result.balanceSufficient")}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                {!hasEnoughCredits && (
                  <Button variant="outline" onClick={() => {
                    trackBeginCheckout();
                    navigate("/app/pricing");
                  }}>
                    <Coins className="h-4 w-4 mr-2" />
                    {t("result.buyCredits")}
                  </Button>
                )}
                <Button
                  disabled={purchaseMutation.isPending || !hasEnoughCredits}
                  onClick={() => purchaseMutation.mutate()}
                  data-testid="button-purchase-transcription"
                >
                  {purchaseMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t("result.processingEllipsis")}
                    </>
                  ) : !hasEnoughCredits ? (
                    <>
                      <Lock className="h-4 w-4 mr-2" />
                      {t("result.notEnoughCredits")}
                    </>
                  ) : (
                    <>
                      {t("result.makeAllReadable")}
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>

          <Card
            className={
              qualityData?.level === "yellow" || qualityData?.level === "red"
                ? "p-5 border-amber-400/60 bg-amber-50/50 dark:bg-amber-950/20"
                : "p-5 border-primary/20 bg-primary/[0.02]"
            }
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="font-serif font-semibold mb-1 text-sm">
                  {t("result.alternativeExpertTitle")}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {t("result.alternativeExpertBody")}
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => navigate(`/app/human-transcription/${params.id}`)}
                className="shrink-0"
              >
                <User className="h-4 w-4 mr-2" />
                {t("result.askExperts")}
              </Button>
            </div>
          </Card>
        </>
      )}

      {isProcessing && data.progress && data.progress.total > 0 && (
        <Card className="p-4 border-amber-300/40 bg-amber-50/50 dark:bg-amber-950/10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />
                <h3 className="font-serif font-semibold text-sm">
                  {t("result.pagesBeingEvaluated")}
                </h3>
              </div>
              <Progress
                value={Math.round((data.progress.completed / data.progress.total) * 100)}
                className="h-2 mb-1.5"
              />
              <p className="text-xs text-muted-foreground">
                {t("result.progressDone", { completed: data.progress.completed, total: data.progress.total, count: data.progress.total })}
                {data.progress.processing > 0 && (
                  <span> {t("result.progressPageEvaluating", { n: data.progress.completed + 1 })}</span>
                )}
                {data.progress.failed > 0 && (
                  <span className="text-destructive"> {t("result.progressFailed", { count: data.progress.failed })}</span>
                )}
              </p>
              <TranscriptionBackgroundHint />
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={cancelMutation.isPending}
              onClick={() => setShowCancelDialog(true)}
            >
              {cancelMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <StopCircle className="h-3.5 w-3.5 mr-1.5" />
              )}
              {t("common.cancel")}
            </Button>
          </div>
        </Card>
      )}

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("result.cancelDialogTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("result.cancelDialogBody")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("result.continueTranscribing")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => cancelMutation.mutate()}
            >
              {t("result.cancelAndRefund")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {!isProcessing && failedCount > 0 && (
        <Card className="p-4 border-destructive/30 bg-destructive/5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <XCircle className="h-5 w-5 text-destructive shrink-0" />
              <div>
                <h3 className="font-serif font-semibold text-sm">
                  {t("result.pagesFailed", { count: failedCount })}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {failedCount === 1
                    ? t("result.pagesFailedBodyOne")
                    : t("result.pagesFailedBodyMany", { count: failedCount })}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => retryAllFailedMutation.mutate()}
              disabled={retryAllFailedMutation.isPending || retryPageMutation.isPending}
            >
              {retryAllFailedMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              )}
              {t("result.retryAll", { count: failedCount })}
            </Button>
          </div>
        </Card>
      )}

      {data.pages.length === 1 ? (
        renderPageContent(data.pages[0])
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-center">
            <PageNavigator
              currentPage={currentPageIdx}
              totalPages={data.pages.length}
              pages={(isProcessing || failedCount > 0) ? data.pages : undefined}
              onPageChange={setCurrentPageIdx}
            />
          </div>
          {currentPage && renderPageContent(currentPage)}
        </div>
      )}

      {/* TTS Vorlesen – Compact Teaser */}
      {!isPreviewOnly && !isProcessing && data.pages.some((p) => p.transcription && p.status === "completed") && (() => {
        const anyExistingAudio = ttsCompletedForPage.length > 0 || ttsCompletedForAll.length > 0;
        const latestAudio = ttsCompletedForAll[0] || ttsCompletedForPage[0];
        const pageCredits = currentPage ? ttsCreditsForText(getPageDisplayText(currentPage as TranscriptionPage & Record<string, unknown>, textVersion, effectiveDisplayLanguage) ?? "") : 0;
        const isGenerating = ttsGeneratingForPage || ttsGeneratingForAll;

        return (
          <Card className="p-4 border-primary/20 bg-primary/[0.02]">
            {latestAudio?.audioUrl ? (
              <div className="flex flex-wrap items-center gap-3">
                <Headphones className="h-5 w-5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <audio controls className="w-full h-9" src={latestAudio.audioUrl} />
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button size="sm" variant="ghost" className="h-8 text-xs" asChild>
                    <a href={latestAudio.audioUrl} download={latestAudio.audioUrl.split("/").pop() ?? undefined}>
                      <Download className="h-3.5 w-3.5 mr-1" />
                      {t("common.download")}
                    </a>
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setShowTtsSheet(true)}>
                    {t("result.moreVoices")}
                  </Button>
                </div>
              </div>
            ) : isGenerating ? (
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 text-primary animate-spin shrink-0" />
                <p className="text-sm">{t("result.audioGenerating")}</p>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Headphones className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{t("result.readThisTextTitle")}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("result.ttsTeaserBody")}
                      {pageCredits > 0 && t("result.ttsTeaserFrom", { count: pageCredits })}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => setShowTtsSheet(true)}
                  data-tour="result-tts"
                  data-testid="button-tts-open"
                >
                  <Volume2 className="h-3.5 w-3.5 mr-1.5" />
                  {t("result.chooseVoice")}
                </Button>
              </div>
            )}
          </Card>
        );
      })()}

      {/* TTS Sheet */}
      <Sheet open={showTtsSheet} onOpenChange={setShowTtsSheet}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto" data-tour="tts-sheet">
          <SheetHeader>
            <SheetTitle className="font-serif flex items-center gap-2">
              <Headphones className="h-5 w-5" />
              {t("result.ttsSheetTitle")}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-5">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{t("result.yourBalance", { count: currentCredits })}</span>
                <Button variant="ghost" size="sm" className="h-auto p-0 text-xs text-primary" onClick={() => { trackBeginCheckout(); navigate("/app/pricing"); }}>
                  {t("result.buyCredits")}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground/60">
                {t("result.creditExplanation")}
              </p>
            </div>

            <AudioCharacterPicker
              selectedVoice={ttsVoice}
              selectedStyle={ttsStyle}
              onSelect={(voice, style) => { setTtsVoice(voice); setTtsStyle(style); }}
              compact
            />

            {currentPage && (() => {
              const pageText = getPageDisplayText(currentPage as TranscriptionPage & Record<string, unknown>, textVersion, effectiveDisplayLanguage) ?? "";
              const pageChars = pageText.length;
              const pgCredits = ttsCreditsForText(pageText);
              const hasEnoughForPage = currentCredits >= pgCredits;
              const hasEnoughForAll = ttsCostAll ? currentCredits >= ttsCostAll.creditsRequired : false;
              return (
                <div className="space-y-3 border-t pt-4">
                  <p className="text-xs text-muted-foreground">
                    {t("result.thisPageChars", { chars: pageChars.toLocaleString("de-DE"), count: pgCredits })}
                  </p>
                  {data!.pages.length > 1 && ttsCostAll && (
                    <p className="text-xs text-muted-foreground">
                      {t("result.allPagesChars", { pages: data!.pages.length, chars: ttsCostAll.totalCharacters.toLocaleString("de-DE"), count: ttsCostAll.creditsRequired })}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      disabled={ttsMutation.isPending || ttsGeneratingForPage || !hasEnoughForPage}
                      onClick={() => {
                        ttsMutation.mutate({ pages: [currentPage.pageNumber], voice: ttsVoice, style: ttsStyle || undefined });
                        setShowTtsSheet(false);
                      }}
                    >
                      {ttsGeneratingForPage ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Volume2 className="h-3.5 w-3.5 mr-1.5" />}
                      {ttsGeneratingForPage ? t("result.generating") : t("result.readThisPage", { credits: pgCredits })}
                    </Button>
                    {data!.pages.length > 1 && ttsCostAll && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={ttsMutation.isPending || ttsGeneratingForAll || !hasEnoughForAll}
                        onClick={() => {
                          ttsMutation.mutate({ pages: "all", voice: ttsVoice, style: ttsStyle || undefined });
                          setShowTtsSheet(false);
                        }}
                      >
                        {ttsGeneratingForAll ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Volume2 className="h-3.5 w-3.5 mr-1.5" />}
                        {ttsGeneratingForAll ? t("result.generating") : t("result.readAllPages", { credits: ttsCostAll.creditsRequired })}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })()}

            {(ttsCompletedForPage.length > 0 || ttsCompletedForAll.length > 0) && (
              <div className="space-y-3 border-t pt-4">
                <p className="text-xs font-semibold text-muted-foreground">{t("result.existingAudios")}</p>
                {[...ttsCompletedForPage, ...ttsCompletedForAll].map((gen) => {
                  const voiceMeta = TTS_VOICES.find((v) => v.name === gen.voice);
                  const styleLabel = gen.style ? TTS_STYLE_PRESETS.find((p) => p.value === gen.style)?.label ?? (gen.style || "").slice(0, 30) : null;
                  const isAll = ttsCompletedForAll.includes(gen);
                  return (
                    <div key={gen.id} className="space-y-1.5 rounded-md border bg-muted/30 p-2.5">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium">{gen.voice}</span>
                          {voiceMeta ? ` (${voiceMeta.gender})` : ""}
                          {styleLabel ? ` · ${styleLabel}` : ""}
                        </p>
                        <Badge variant="secondary" className="text-[10px]">{isAll ? t("result.allPagesBadge") : t("result.pageBadge", { n: (gen.pages as number[])?.[0] ?? "?" })}</Badge>
                      </div>
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
        </SheetContent>
      </Sheet>

      {/* Upsell for completed transcriptions – unter der Vorschau */}
      {!isPreviewOnly && !isProcessing && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Card
            className={
              qualityData?.level === "yellow" || qualityData?.level === "red"
                ? "p-5 border-amber-400/60 bg-amber-50/50 dark:bg-amber-950/20"
                : "p-5 border-primary/20 bg-primary/[0.02]"
            }
          >
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                <h3 className="font-serif font-semibold text-sm">{t("result.aiVerifiedTitle")}</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("result.aiVerifiedBody")}
              </p>
              <p className="text-sm font-semibold">
                {(data.pages.length * 8.99).toFixed(2).replace(".", ",")} EUR
                <span className="text-muted-foreground font-normal text-xs ml-1">{t("result.aiVerifiedPerPage")}</span>
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-auto"
                onClick={() => navigate(`/app/human-transcription/${params.id}?tier=ki_geprueft`)}
              >
                {t("result.aiVerifiedRequest")}
              </Button>
            </div>
          </Card>

          <Card
            className={
              qualityData?.level === "red"
                ? "p-5 border-amber-400/60 bg-amber-50/50 dark:bg-amber-950/20"
                : "p-5 border-amber-300/50 dark:border-amber-700/50 bg-amber-50/20 dark:bg-amber-950/10"
            }
          >
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
                <h3 className="font-serif font-semibold text-sm">{t("result.expertTitle")}</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("result.expertBody")}
              </p>
              <p className="text-sm font-semibold">
                {t("result.expertPrice")}
                <span className="text-muted-foreground font-normal text-xs block">{t("result.expertIndividualOffer")}</span>
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-auto border-amber-400 dark:border-amber-600"
                onClick={() => navigate(`/app/human-transcription/${params.id}?tier=experten`)}
              >
                {t("result.expertRequest")}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {params.id && (
        <PdfExportDialog
          open={showPdfExport}
          onOpenChange={setShowPdfExport}
          jobId={params.id}
          textVersion={textVersion}
          anyPageHasCompleted={anyPageHasCompleted}
          anyPageHasInterpreted={anyPageHasInterpreted}
          translationLanguage={data?.job?.translationLanguage}
        />
      )}

      <AlertDialog open={!!showResetDialog} onOpenChange={(open) => !open && setShowResetDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("result.resetDialogTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("result.resetDialogBody")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={resetToOriginal}
            >
              {t("result.discardAndShowOriginal")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
