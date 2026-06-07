import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useLocation, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, getAuthHeaders } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Download,
  FileText,
  Loader2,
  Maximize2,
  Minimize2,
  Sparkles,
  Wand2,
  Eye,
  GripVertical,
  BookOpen,
} from "lucide-react";
import { createPortal } from "react-dom";
import { useToast } from "@/hooks/use-toast";
import type { TranscriptionPage } from "@shared/models/transcription";
import { getScriptTypeDisplayLabel } from "@shared/models/transcription";

type TextVersion = "original" | "completed" | "interpreted";

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
}

function getPageText(page: TranscriptionPage & Record<string, unknown>, version: TextVersion): string | null {
  const edited = version === "original"
    ? (page.transcriptionEdited ?? (page as any).transcription_edited)
    : version === "completed"
      ? (page.transcriptionCompletedEdited ?? (page as any).transcription_completed_edited)
      : (page.transcriptionInterpretedEdited ?? (page as any).transcription_interpreted_edited);
  if (edited != null && edited !== "") return edited as string;

  if (version === "interpreted") {
    return (page.transcriptionInterpreted ?? (page as any).transcription_interpreted ?? page.transcriptionCompleted ?? page.transcription) || null;
  }
  if (version === "completed") {
    return page.transcriptionCompleted ?? page.transcription ?? null;
  }
  return page.transcription ?? null;
}

interface CoverPageOptions {
  title: string;
  subtitle: string;
  author: string;
  style: "classic" | "elegant" | "minimal";
}

export default function CombinePage() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const { toast } = useToast();

  const jobIdsParam = useMemo(() => {
    const params = new URLSearchParams(search);
    const raw = params.get("jobs") || "";
    return raw.split(",").map(Number).filter((n) => n > 0);
  }, [search]);

  const [orderedJobIds, setOrderedJobIds] = useState<number[]>([]);
  const [textVersion, setTextVersion] = useState<TextVersion>("interpreted");
  const [combinedText, setCombinedText] = useState("");
  const [textDirty, setTextDirty] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const [enableCover, setEnableCover] = useState(false);
  const [continuousFlow, setContinuousFlow] = useState(true);
  const [justified, setJustified] = useState(false);
  const [mergeLines, setMergeLines] = useState(false);
  const [showPageLabels, setShowPageLabels] = useState(true);
  const [fontSize, setFontSize] = useState(12);
  const [cover, setCover] = useState<CoverPageOptions>({
    title: "",
    subtitle: "",
    author: "",
    style: "classic",
  });

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<"settings" | "editor" | "preview">("editor");

  useEffect(() => {
    const handler = () => setMobilePanel("settings");
    window.addEventListener("tour:combine-show-settings", handler);
    return () => window.removeEventListener("tour:combine-show-settings", handler);
  }, []);

  const previewUrlRef = useRef<string | null>(null);
  previewUrlRef.current = previewUrl;
  const previewDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (jobIdsParam.length > 0 && orderedJobIds.length === 0) {
      setOrderedJobIds(jobIdsParam);
    }
  }, [jobIdsParam, orderedJobIds.length]);

  const jobQueries = useQuery<Record<number, ResultData>>({
    queryKey: ["combine-jobs", orderedJobIds.join(",")],
    queryFn: async () => {
      const results: Record<number, ResultData> = {};
      for (const id of orderedJobIds) {
        const res = await apiRequest("GET", `/api/jobs/${id}/result`);
        results[id] = await res.json();
      }
      return results;
    },
    enabled: orderedJobIds.length > 0,
  });

  const jobsData = jobQueries.data;

  const buildCombinedText = useCallback(
    (version: TextVersion) => {
      if (!jobsData || orderedJobIds.length === 0) return "";
      const sections: string[] = [];
      for (const jid of orderedJobIds) {
        const result = jobsData[jid];
        if (!result?.pages) continue;
        const completedPages = result.pages.filter(
          (p) => p.transcription && p.status === "completed",
        );
        for (const page of completedPages) {
          const text = getPageText(page as TranscriptionPage & Record<string, unknown>, version);
          if (text) sections.push(text);
        }
      }
      return sections.join("\n\n");
    },
    [jobsData, orderedJobIds],
  );

  useEffect(() => {
    if (jobsData && orderedJobIds.length > 0 && !textDirty) {
      setCombinedText(buildCombinedText(textVersion));
    }
  }, [jobsData, orderedJobIds, textVersion, textDirty, buildCombinedText]);

  const confirmDestructiveAction = useCallback(
    (action: () => void) => {
      if (textDirty) {
        setPendingAction(() => action);
      } else {
        action();
      }
    },
    [textDirty],
  );

  const moveJob = useCallback(
    (fromIdx: number, toIdx: number) => {
      if (fromIdx === toIdx) return;
      const doMove = () => {
        setOrderedJobIds((prev) => {
          const next = [...prev];
          const [removed] = next.splice(fromIdx, 1);
          next.splice(toIdx, 0, removed);
          return next;
        });
        setTextDirty(false);
      };
      confirmDestructiveAction(doMove);
    },
    [confirmDestructiveAction],
  );

  const changeTextVersion = useCallback(
    (v: TextVersion) => {
      const doChange = () => {
        setTextVersion(v);
        setTextDirty(false);
      };
      confirmDestructiveAction(doChange);
    },
    [confirmDestructiveAction],
  );

  const downloadAsText = useCallback(() => {
    const blob = new Blob([combinedText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sammeltranskription.txt";
    a.click();
    URL.revokeObjectURL(url);
  }, [combinedText]);

  const buildBody = useCallback(() => {
    const body: any = {
      version: textVersion,
      lang: "de",
      continuousFlow,
      justified,
      mergeLines,
      showPageLabels,
      fontSize,
    };
    if (textDirty) {
      body.rawText = combinedText;
    } else {
      body.jobIds = orderedJobIds;
    }
    if (enableCover && (cover.title || cover.subtitle || cover.author)) {
      body.coverPage = {
        title: cover.title || undefined,
        subtitle: cover.subtitle || undefined,
        author: cover.author || undefined,
        style: cover.style,
      };
    }
    return body;
  }, [textVersion, continuousFlow, justified, mergeLines, showPageLabels, fontSize, textDirty, combinedText, orderedJobIds, enableCover, cover]);

  const generatePreview = useCallback(async () => {
    if (orderedJobIds.length === 0 && !textDirty) return;
    setIsGeneratingPreview(true);
    const prev = previewUrlRef.current;
    if (prev) {
      URL.revokeObjectURL(prev);
      previewUrlRef.current = null;
      setPreviewUrl(null);
    }
    try {
      const headers = await getAuthHeaders();
      (headers as Record<string, string>)["Content-Type"] = "application/json";
      const res = await fetch("/api/preview-combined-pdf", {
        method: "POST",
        headers,
        body: JSON.stringify(buildBody()),
      });
      if (!res.ok) throw new Error("Vorschau fehlgeschlagen.");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      previewUrlRef.current = url;
      setPreviewUrl(url);
    } catch {
      toast({ title: "Fehler", description: "PDF-Vorschau fehlgeschlagen.", variant: "destructive" });
    } finally {
      setIsGeneratingPreview(false);
    }
  }, [orderedJobIds, textDirty, buildBody, toast]);

  useEffect(() => {
    if (orderedJobIds.length === 0 && !textDirty) return;
    if (!jobsData && !textDirty) return;
    if (previewDebounceRef.current) clearTimeout(previewDebounceRef.current);
    previewDebounceRef.current = setTimeout(() => generatePreview(), 800);
    return () => {
      if (previewDebounceRef.current) clearTimeout(previewDebounceRef.current);
    };
  }, [combinedText, buildBody, generatePreview, orderedJobIds, textDirty, jobsData]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); setFullscreen(false); }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [fullscreen]);

  const downloadPdf = async () => {
    setIsDownloading(true);
    try {
      const headers = await getAuthHeaders();
      headers["Content-Type"] = "application/json";
      const res = await fetch("/api/export-combined-pdf", {
        method: "POST",
        headers,
        body: JSON.stringify(buildBody()),
      });
      if (!res.ok) throw new Error("Export fehlgeschlagen.");
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition");
      const match = disposition?.match(/filename="?([^";\n]+)"?/);
      const filename = match?.[1] ?? "mormorsbreve-sammel.pdf";
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(objectUrl);
      toast({ title: "Export", description: "PDF wird heruntergeladen." });
    } catch {
      toast({ title: "Fehler", description: "PDF-Export fehlgeschlagen.", variant: "destructive" });
    } finally {
      setIsDownloading(false);
    }
  };

  const totalPages = useMemo(() => {
    if (!jobsData) return 0;
    return orderedJobIds.reduce((sum, jid) => {
      const r = jobsData[jid];
      return sum + (r?.job?.totalPages ?? 0);
    }, 0);
  }, [jobsData, orderedJobIds]);

  if (jobIdsParam.length === 0) {
    return (
      <div className="p-6 max-w-5xl mx-auto text-center">
        <p className="text-muted-foreground">Keine Dokumente ausgewählt.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/app")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zurück zum Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => {
            if (textDirty) {
              setPendingAction(() => () => navigate("/app"));
            } else {
              navigate("/app");
            }
          }}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Dashboard
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <h1 className="font-serif text-lg font-semibold hidden sm:block">Sammel-PDF erstellen</h1>
          <Badge variant="secondary" className="text-xs">
            {orderedJobIds.length} {orderedJobIds.length === 1 ? "Dokument" : "Dokumente"}, {totalPages} Seiten
          </Badge>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={downloadAsText} title="Als Text speichern">
            <FileText className="h-4 w-4 mr-1.5" />
            Text
          </Button>
          <Button size="sm" onClick={downloadPdf} disabled={isDownloading}>
            {isDownloading ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Download className="h-4 w-4 mr-1.5" />}
            PDF herunterladen
          </Button>
        </div>
      </div>

      {/* Mobile tabs */}
      <div className="md:hidden border-b px-4 py-2">
        <Tabs value={mobilePanel} onValueChange={(v) => setMobilePanel(v as typeof mobilePanel)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="settings" className="text-xs" data-tour="combine-tab-settings">Einstellungen</TabsTrigger>
            <TabsTrigger value="editor" className="text-xs">Editor</TabsTrigger>
            <TabsTrigger value="preview" className="text-xs">Vorschau</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
        {/* Left column: Sort + Settings */}
        <div className={`w-full md:w-80 lg:w-96 md:border-r overflow-y-auto shrink-0 p-4 space-y-4 ${mobilePanel === "settings" ? "block" : "hidden md:block"}`}>
          {/* Sort */}
          <div data-tour="combine-order">
            <h2 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Reihenfolge
            </h2>
            {jobQueries.isLoading ? (
              <div className="space-y-2">{orderedJobIds.map((id) => <Skeleton key={id} className="h-14" />)}</div>
            ) : (
              <div className="space-y-1.5">
                {orderedJobIds.map((jid, idx) => {
                  const r = jobsData?.[jid];
                  const snippet = r?.pages?.find((p) => p.transcription)?.transcription?.slice(0, 80) || "";
                  return (
                    <Card key={jid} className="p-2 flex items-center gap-2">
                      <GripVertical className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <Badge variant="secondary" className="text-[10px] shrink-0">{idx + 1}</Badge>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">{snippet || getScriptTypeDisplayLabel(r?.job?.scriptType ?? "auto")}</p>
                        <p className="text-[10px] text-muted-foreground">{r?.job?.totalPages ?? "?"} Seiten</p>
                      </div>
                      <div className="flex gap-0.5 shrink-0">
                        <Button size="icon" variant="ghost" className="h-6 w-6" disabled={idx === 0} onClick={() => moveJob(idx, idx - 1)}>
                          <ArrowUp className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6" disabled={idx === orderedJobIds.length - 1} onClick={() => moveJob(idx, idx + 1)}>
                          <ArrowDown className="h-3 w-3" />
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          <Separator />

          {/* Text version */}
          <div className="space-y-2" data-tour="combine-textversion">
            <Label className="text-sm font-semibold">Textversion</Label>
            <Tabs value={textVersion} onValueChange={(v) => changeTextVersion(v as TextVersion)}>
              <TabsList className="w-full">
                <TabsTrigger value="original" className="flex-1 text-xs">
                  <FileText className="h-3 w-3 mr-1" />Original
                </TabsTrigger>
                <TabsTrigger value="completed" className="flex-1 text-xs">
                  <Sparkles className="h-3 w-3 mr-1" />Ergänzt
                </TabsTrigger>
                <TabsTrigger value="interpreted" className="flex-1 text-xs">
                  <Wand2 className="h-3 w-3 mr-1" />Interpretation
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <Separator />

          {/* PDF settings */}
          <div className="space-y-4" data-tour="combine-settings">
            <Label className="text-sm font-semibold">PDF-Einstellungen</Label>

            <div className="flex items-center justify-between">
              <Label htmlFor="cf" className="text-xs cursor-pointer">Fortlaufender Textfluss</Label>
              <Switch id="cf" checked={continuousFlow} onCheckedChange={setContinuousFlow} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="spl" className="text-xs cursor-pointer">Seitenangaben</Label>
              <Switch id="spl" checked={showPageLabels} onCheckedChange={setShowPageLabels} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="ml" className="text-xs cursor-pointer">Fließtext</Label>
              <Switch id="ml" checked={mergeLines} onCheckedChange={setMergeLines} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="jst" className="text-xs cursor-pointer">Blocksatz</Label>
              <Switch id="jst" checked={justified} onCheckedChange={setJustified} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="fs" className="text-xs">Schriftgröße</Label>
              <select
                id="fs"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="h-8 rounded-md border border-input bg-background px-2 py-1 text-xs"
              >
                {[10, 11, 12, 13, 14].map((s) => <option key={s} value={s}>{s} pt</option>)}
              </select>
            </div>
          </div>

          <Separator />

          {/* Cover */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="ec" className="text-sm font-semibold cursor-pointer">Deckblatt</Label>
              <Switch id="ec" checked={enableCover} onCheckedChange={setEnableCover} />
            </div>
            {enableCover && (
              <div className="space-y-3 pl-1">
                <div className="space-y-1">
                  <Label htmlFor="ct" className="text-xs">Titel</Label>
                  <Input id="ct" placeholder="z.B. MormorsBreve" value={cover.title} onChange={(e) => setCover({ ...cover, title: e.target.value })} className="h-8 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="cs" className="text-xs">Untertitel</Label>
                  <Input id="cs" placeholder="z.B. Erinnerungen 1920" value={cover.subtitle} onChange={(e) => setCover({ ...cover, subtitle: e.target.value })} className="h-8 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="ca" className="text-xs">Autor</Label>
                  <Input id="ca" placeholder="z.B. Maria Müller" value={cover.author} onChange={(e) => setCover({ ...cover, author: e.target.value })} className="h-8 text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Stil</Label>
                  <RadioGroup value={cover.style} onValueChange={(v) => setCover({ ...cover, style: v as CoverPageOptions["style"] })} className="flex gap-3">
                    {(["classic", "elegant", "minimal"] as const).map((s) => (
                      <div key={s} className="flex items-center gap-1">
                        <RadioGroupItem value={s} id={`st-${s}`} />
                        <Label htmlFor={`st-${s}`} className="text-xs cursor-pointer capitalize">{s === "classic" ? "Klassisch" : s === "elegant" ? "Elegant" : "Schlicht"}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Download actions */}
          <div className="space-y-2 pt-1" data-tour="combine-download">
            <Button className="w-full" onClick={downloadPdf} disabled={isDownloading}>
              {isDownloading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
              PDF herunterladen
            </Button>
            <Button variant="outline" className="w-full" onClick={downloadAsText}>
              <FileText className="h-4 w-4 mr-2" />
              Als Text speichern
            </Button>
          </div>
        </div>

        {/* Middle column: Editor */}
        <div className={`flex-1 flex flex-col min-w-0 ${mobilePanel === "editor" ? "flex" : "hidden md:flex"}`}>
          <div className="flex items-center justify-between px-4 py-2 border-b">
            <h2 className="text-sm font-semibold">Text-Editor</h2>
            {textDirty && (
              <Badge variant="secondary" className="text-[10px]">Bearbeitet</Badge>
            )}
          </div>
          <div className="flex-1 overflow-hidden p-2">
            {jobQueries.isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <textarea
                className="w-full h-full font-serif text-sm leading-relaxed whitespace-pre-wrap rounded-md border border-input bg-background px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                value={combinedText}
                onChange={(e) => {
                  setCombinedText(e.target.value);
                  setTextDirty(true);
                }}
                placeholder="Der zusammengeführte Text erscheint hier..."
              />
            )}
          </div>
        </div>

        {/* Right column: Preview */}
        <div className={`w-full md:w-[45%] lg:w-[40%] flex flex-col border-l shrink-0 ${mobilePanel === "preview" ? "flex" : "hidden md:flex"}`}>
          <div className="flex items-center justify-between px-3 py-2 border-b">
            <h2 className="text-sm font-semibold flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5" />
              PDF-Vorschau
            </h2>
            <div className="flex items-center gap-1">
              {isGeneratingPreview && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setFullscreen(true)} title="Vollbild">
                <Maximize2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <div className="flex-1 relative bg-muted/30">
            {isGeneratingPreview && !previewUrl ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <Loader2 className="h-10 w-10 animate-spin" />
                <span className="text-sm">PDF wird geladen…</span>
              </div>
            ) : null}
            {previewUrl ? (
              <iframe
                src={previewUrl}
                className="w-full h-full"
                title="PDF Vorschau"
              />
            ) : !isGeneratingPreview ? (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
                Vorschau wird generiert…
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Dirty-warning dialog */}
      <AlertDialog open={!!pendingAction} onOpenChange={(open) => !open && setPendingAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ungespeicherte Änderungen</AlertDialogTitle>
            <AlertDialogDescription>
              Sie haben den Text im Editor bearbeitet. Durch diese Aktion wird der Text aus den Originaldokumenten neu zusammengesetzt und Ihre Änderungen gehen verloren.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                downloadAsText();
                toast({ title: "Gespeichert", description: "Text wurde als Datei heruntergeladen." });
                const action = pendingAction;
                setPendingAction(null);
                action?.();
              }}
            >
              <FileText className="h-3.5 w-3.5 mr-1.5" />
              Speichern & fortfahren
            </Button>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                const action = pendingAction;
                setPendingAction(null);
                action?.();
              }}
            >
              Ohne Speichern fortfahren
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Fullscreen preview */}
      {fullscreen && previewUrl && createPortal(
        <div
          className="fixed inset-0 flex flex-col bg-background"
          style={{ zIndex: 9999 }}
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
            <h3 className="font-serif text-lg flex items-center gap-2">
              <Eye className="h-5 w-5" />
              PDF-Vorschau
            </h3>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={downloadPdf} disabled={isDownloading}>
                {isDownloading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                Herunterladen
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setFullscreen(false)} title="Vollbild beenden">
                <Minimize2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <iframe src={previewUrl} className="flex-1 w-full border-0" style={{ minHeight: 0 }} title="PDF Vorschau (Vollbild)" />
        </div>,
        document.body,
      )}
    </div>
  );
}
