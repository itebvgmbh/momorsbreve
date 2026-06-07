import { useState, useCallback, useRef, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  ImagePlus,
  Loader2,
  FileText,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { translationLanguages } from "@shared/models/transcription";
import { Progress } from "@/components/ui/progress";
import { QualityIndicator, type QualityDetails } from "@/components/quality-indicator";
import { DocumentPreview } from "@/components/document-preview";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/logo";
import { AuthDialog } from "@/components/auth-dialog";
import { useAuth } from "@/hooks/use-auth";
import { getAuthHeaders } from "@/lib/queryClient";
import { Link } from "wouter";
import { consumePendingFile } from "@/lib/pending-file";
import { CtaTeaser, ctaVariantEmbedsPreview, ctaVariantEmbedsQuality, DEFAULT_CTA_VARIANT, type CtaVariantId } from "@/components/cta-variants";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

const ANALYZE_TOKEN_KEY = "analyzeToken";
const ANALYZE_ACTION_KEY = "analyzeAction";
const ANALYZE_TRANSLATION_LANGUAGE_KEY = "analyzeTranslationLanguage";

export default function AnalysierenPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [translationLanguage, setTranslationLanguage] = useState("none");
  const [dragOver, setDragOver] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<"login" | "register">("register");
  const [claiming, setClaiming] = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState(0);
  // Fallback-Variante, falls die Analyse-Response keine Variante mitschickt
  // (z. B. legacy oder Fehlerpfad). Im Normalfall wird ctaVariant beim
  // erfolgreichen /api/analyze-Aufruf aus der Response gesetzt.
  const [ctaVariant, setCtaVariant] = useState<CtaVariantId>(DEFAULT_CTA_VARIANT);

  useEffect(() => {
    fetch("/api/cta-variant")
      .then((r) => r.json())
      .then((data) => {
        if (typeof data?.variant === "number" && data.variant >= 0 && data.variant <= 13) {
          setCtaVariant(data.variant as CtaVariantId);
        }
      })
      .catch(() => {});
  }, []);
  const [result, setResult] = useState<{
    token: string;
    imageUrl: string;
    quality: QualityDetails | null;
    scriptType: string;
    transcriptionSnippet: string | null;
  } | null>(null);

  useEffect(() => {
    const pending = consumePendingFile();
    if (pending) addFile(pending);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // After login: automatically claim the analysis and redirect
  useEffect(() => {
    if (authLoading || !user || claiming) return;
    const token = localStorage.getItem(ANALYZE_TOKEN_KEY);
    const action = localStorage.getItem(ANALYZE_ACTION_KEY);
    if (!token || !action || (action !== "transcribe" && action !== "expert")) return;

    setClaiming(true);
    (async () => {
      try {
        const headers = await getAuthHeaders();
        const translationLang = localStorage.getItem(ANALYZE_TRANSLATION_LANGUAGE_KEY);
        const res = await fetch("/api/claim-analysis", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...headers },
          body: JSON.stringify({
            token,
            action,
            translationLanguage: translationLang && translationLang !== "none" ? translationLang : undefined,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || "Übernahme fehlgeschlagen");
        }
        const data = await res.json();
        localStorage.removeItem(ANALYZE_TOKEN_KEY);
        localStorage.removeItem(ANALYZE_ACTION_KEY);
        localStorage.removeItem(ANALYZE_TRANSLATION_LANGUAGE_KEY);
        if (action === "expert") {
          navigate(`/app/human-transcription/${data.jobId}`);
        } else {
          navigate(`/app/preview/${data.jobId}`);
        }
      } catch (err: any) {
        localStorage.removeItem(ANALYZE_TOKEN_KEY);
        localStorage.removeItem(ANALYZE_ACTION_KEY);
        localStorage.removeItem(ANALYZE_TRANSLATION_LANGUAGE_KEY);
        setClaiming(false);
        toast({
          title: "Fehler",
          description: err?.message || "Analyse konnte nicht übernommen werden",
          variant: "destructive",
        });
      }
    })();
  }, [user, authLoading, claiming, navigate, toast]);

  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startProgress = useCallback(() => {
    setAnalyzeProgress(0);
    if (progressRef.current) clearInterval(progressRef.current);
    const start = Date.now();
    progressRef.current = setInterval(() => {
      const elapsed = (Date.now() - start) / 1000;
      // Fast to 30%, then slow climb to ~90% over ~20s, never reaches 100
      const pct = elapsed < 3
        ? (elapsed / 3) * 30
        : 30 + 60 * (1 - Math.exp(-(elapsed - 3) / 8));
      setAnalyzeProgress(Math.min(pct, 95));
    }, 200);
  }, []);

  const stopProgress = useCallback(() => {
    if (progressRef.current) {
      clearInterval(progressRef.current);
      progressRef.current = null;
    }
    setAnalyzeProgress(100);
  }, []);

  useEffect(() => {
    return () => {
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, []);

  const analyzeMutation = useMutation({
    mutationFn: async (fileToAnalyze: File) => {
      const formData = new FormData();
      formData.append("file", fileToAnalyze);
      formData.append("scriptType", "auto");
      startProgress();
      const res = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Analyse fehlgeschlagen");
      }
      return res.json();
    },
    onSuccess: (data) => {
      stopProgress();
      // Server hat eine konkrete Variante für diese Analyse vergeben und
      // sie als Impression gezählt — wir spielen exakt diese aus.
      if (
        typeof data?.ctaVariant === "number" &&
        data.ctaVariant >= 0 &&
        data.ctaVariant <= 13
      ) {
        setCtaVariant(data.ctaVariant as CtaVariantId);
      }
      setResult({
        token: data.token,
        imageUrl: data.imageUrl,
        quality: data.quality,
        scriptType: data.scriptType || "auto",
        transcriptionSnippet: data.transcriptionSnippet ?? null,
      });
    },
    onError: (error: Error) => {
      stopProgress();
      toast({
        title: "Analyse fehlgeschlagen",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const addFile = useCallback(
    (newFile: File) => {
      if (!newFile.type.startsWith("image/") && newFile.type !== "application/pdf") {
        toast({
          title: "Ungültiges Format",
          description: "Bitte nur Fotos (JPG, PNG) oder PDF auswählen.",
          variant: "destructive",
        });
        return;
      }
      if (newFile.size > MAX_FILE_SIZE) {
        toast({
          title: "Datei zu groß",
          description: "Maximale Dateigröße: 50 MB.",
          variant: "destructive",
        });
        return;
      }
      setFile(newFile);
      setResult(null);
      analyzeMutation.mutate(newFile);
    },
    [toast, analyzeMutation]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files[0];
      if (f) addFile(f);
    },
    [addFile]
  );

  const openAuthForAction = (action: "transcribe" | "expert") => {
    if (!result?.token) return;
    try {
      localStorage.setItem(ANALYZE_TOKEN_KEY, result.token);
      localStorage.setItem(ANALYZE_ACTION_KEY, action);
      if (translationLanguage && translationLanguage !== "none") {
        localStorage.setItem(ANALYZE_TRANSLATION_LANGUAGE_KEY, translationLanguage);
      } else {
        localStorage.removeItem(ANALYZE_TRANSLATION_LANGUAGE_KEY);
      }
    } catch {
      toast({ title: "Fehler", description: "Speichern fehlgeschlagen", variant: "destructive" });
      return;
    }
    setAuthInitialMode("register");
    setAuthOpen(true);
  };

  const openAuthForLogin = () => {
    if (result?.token) {
      openAuthForAction("transcribe");
      return;
    }
    setAuthInitialMode("login");
    setAuthOpen(true);
  };

  const reset = () => {
    setFile(null);
    setResult(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Kostenlose Handschrift-Analyse – MormorsBreve</title>
        <meta name="description" content="Laden Sie ein Bild oder PDF Ihrer alten Handschrift hoch – unsere KI bewertet kostenlos die Lesbarkeit und zeigt, wie gut das Dokument transkribiert werden kann." />
        <link rel="canonical" href="https://mormorsbreve.dk/analysieren" />
      </Helmet>
      <header className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/">
            <Logo className="h-8" />
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {authLoading ? null : user ? (
              <Link href="/app">
                <Button data-testid="button-dashboard">Dashboard</Button>
              </Link>
            ) : (
              <Button data-testid="button-login" onClick={openAuthForLogin}>Anmelden</Button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 sm:p-6 space-y-8">
        {!result && (
          <div>
            <h1 className="font-serif text-2xl font-bold mb-1">
              Kostenlose KI-Analyse
            </h1>
            <p className="text-muted-foreground">
              Laden Sie ein Bild oder PDF hoch – unsere KI bewertet die Lesbarkeit und zeigt Ihnen, wie gut Ihr Dokument automatisch transkribiert werden kann. Keine Anmeldung nötig.
            </p>
          </div>
        )}

        {!result ? (
          <>
            {analyzeMutation.isPending ? (
              <Card className="p-8 sm:p-10 animate-in fade-in duration-300">
                <div className="flex flex-col items-center text-center gap-5">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <div>
                    <p className="font-medium text-lg">
                      {analyzeProgress < 30
                        ? "Dokument wird hochgeladen…"
                        : analyzeProgress < 60
                          ? "KI analysiert die Handschrift…"
                          : analyzeProgress < 90
                            ? "Transkriptionsprobe wird erstellt…"
                            : "Fast fertig…"}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">Unsere KI bewertet Ihr Dokument – einen Moment bitte.</p>
                  </div>
                  <div className="w-full max-w-sm space-y-2">
                    <Progress value={analyzeProgress} className="h-2" />
                    <p className="text-xs text-muted-foreground">{Math.round(analyzeProgress)}%</p>
                  </div>
                  {file && (
                    <p className="text-xs text-muted-foreground">{file.name}</p>
                  )}
                </div>
              </Card>
            ) : (
              <>
                <div
                  className={cn(
                    "border-2 border-dashed rounded-md p-10 text-center transition-colors cursor-pointer",
                    dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                  )}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf,application/pdf"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && addFile(e.target.files[0])}
                  />
                  <ImagePlus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="font-medium mb-1">Datei hierher ziehen oder klicken</p>
                  <p className="text-sm text-muted-foreground">Ein Bild oder PDF – max. 50 MB</p>
                </div>

                <div className="flex items-center gap-3">
                  <label className="text-sm text-muted-foreground whitespace-nowrap">In andere Sprache übersetzen:</label>
                  <Select
                    value={translationLanguage}
                    onValueChange={setTranslationLanguage}
                  >
                    <SelectTrigger className="w-64" data-testid="select-translation-language">
                      <SelectValue placeholder="Keine Übersetzung" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Keine Übersetzung</SelectItem>
                      {translationLanguages.map((lang) => (
                        <SelectItem key={lang.code} value={lang.code}>
                          {lang.label}
                          <span className="ml-2 text-muted-foreground">{lang.labelNative}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </>
        ) : (
          <div className="space-y-6">
            {result.quality && !ctaVariantEmbedsQuality(ctaVariant) && (
              <QualityIndicator quality={result.quality} />
            )}

            {result.transcriptionSnippet && !ctaVariantEmbedsPreview(ctaVariant) && (
              <Card className="p-5 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <h2 className="font-serif text-lg font-semibold mb-3 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Transkriptionsvorschau
                </h2>
                <div className="relative">
                  <p className="font-mono text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                    {result.transcriptionSnippet.slice(0, 150)}
                  </p>
                  <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-card to-transparent pointer-events-none" />
                </div>
                <p className="mt-3 text-xs text-muted-foreground border-t pt-3">
                  Melden Sie sich kostenlos an, um die vollständige Transkription zu erhalten.
                </p>
              </Card>
            )}

            <CtaTeaser
              variant={ctaVariant}
              scriptType={result.scriptType}
              quality={result.quality}
              transcriptionSnippet={result.transcriptionSnippet}
              claiming={claiming}
              onAction={openAuthForAction}
            />

            {/* Document preview */}
            <div>
              <h2 className="font-serif text-lg font-semibold mb-3">Ihr Dokument</h2>
              <Card>
                <DocumentPreview src={result.imageUrl} alt="Hochgeladenes Dokument" />
              </Card>
            </div>

            <Button variant="ghost" onClick={reset} disabled={claiming}>
              Anderes Dokument analysieren
            </Button>
          </div>
        )}
      </main>

      <AuthDialog key={authInitialMode} open={authOpen} onOpenChange={setAuthOpen} initialMode={authInitialMode} />

      {claiming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="text-center space-y-3">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
            <p className="font-medium">Ihr Dokument wird übernommen…</p>
          </div>
        </div>
      )}
    </div>
  );
}
