import { useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Download,
  Eye,
  Loader2,
  BookOpen,
  Sparkles,
  FileText,
  Wand2,
  Maximize2,
  Minimize2,
  Globe,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { getAuthHeaders } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getTranslationLanguageLabel } from "@shared/models/transcription";

interface PdfExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Single job export */
  jobId?: string;
  /** Multi-job combined export (sorted order) */
  jobIds?: number[];
  textVersion: "original" | "completed" | "interpreted";
  anyPageHasCompleted: boolean;
  anyPageHasInterpreted?: boolean;
  /** If set, user can choose Deutsch or this translation for PDF preview/export */
  translationLanguage?: string | null;
  /** Public mode: uses unauthenticated /api/examples/:id endpoints instead of /api/jobs/:id */
  publicMode?: boolean;
}

interface CoverPageOptions {
  title: string;
  subtitle: string;
  author: string;
  style: "classic" | "elegant" | "minimal";
}

export function PdfExportDialog({
  open,
  onOpenChange,
  jobId,
  jobIds,
  textVersion: initialTextVersion,
  anyPageHasCompleted,
  anyPageHasInterpreted = false,
  translationLanguage,
  publicMode = false,
}: PdfExportDialogProps) {
  const isCombined = !!(jobIds && jobIds.length > 0);
  const { t } = useTranslation();
  const { toast } = useToast();

  const [textVersion, setTextVersion] = useState(initialTextVersion);
  const [pdfLanguage, setPdfLanguage] = useState<"de" | "translation">("de");
  const [enableCover, setEnableCover] = useState(false);
  const [continuousFlow, setContinuousFlow] = useState(false);
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
  const [mobileTab, setMobileTab] = useState<"settings" | "preview">("settings");
  const hasGeneratedForOpen = useRef(false);
  const previewDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  previewUrlRef.current = previewUrl;

  useEffect(() => {
    if (open) {
      setTextVersion(initialTextVersion);
      setMobileTab("settings");
    }
  }, [open, initialTextVersion]);

  const buildBody = useCallback(() => {
    const body: any = {
      version: textVersion,
      lang: pdfLanguage,
      continuousFlow,
      justified,
      mergeLines,
      showPageLabels,
      fontSize,
    };
    if (isCombined) {
      body.jobIds = jobIds;
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
  }, [textVersion, pdfLanguage, continuousFlow, justified, mergeLines, showPageLabels, fontSize, enableCover, cover, isCombined, jobIds]);

  const generatePreview = useCallback(async () => {
    if (!isCombined && !jobId) return;
    setIsGeneratingPreview(true);
    const prev = previewUrlRef.current;
    if (prev) {
      URL.revokeObjectURL(prev);
      previewUrlRef.current = null;
      setPreviewUrl(null);
    }
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (!publicMode) {
        Object.assign(headers, await getAuthHeaders());
      }
      const previewEndpoint = publicMode
        ? `/api/examples/${jobId}/preview-pdf`
        : isCombined
          ? "/api/preview-combined-pdf"
          : `/api/jobs/${jobId}/preview-pdf`;
      const res = await fetch(previewEndpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(buildBody()),
      });
      if (!res.ok) throw new Error(t("pdfExport.previewFailed"));
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      previewUrlRef.current = url;
      setPreviewUrl(url);
    } catch (e) {
      toast({
        title: t("pdfExport.errorTitle"),
        description: e instanceof Error ? e.message : t("pdfExport.previewFailed"),
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPreview(false);
    }
  }, [jobId, isCombined, publicMode, buildBody, toast, t]);

  // Sofort Vorschau beim Öffnen; bei Einstellungsänderung debounced neu laden
  useEffect(() => {
    if (!open) {
      hasGeneratedForOpen.current = false;
      if (previewDebounceRef.current) {
        clearTimeout(previewDebounceRef.current);
        previewDebounceRef.current = null;
      }
      return;
    }
    if (!hasGeneratedForOpen.current) {
      hasGeneratedForOpen.current = true;
      generatePreview();
      return;
    }
    previewDebounceRef.current = setTimeout(() => generatePreview(), 400);
    return () => {
      if (previewDebounceRef.current) {
        clearTimeout(previewDebounceRef.current);
        previewDebounceRef.current = null;
      }
    };
  }, [open, generatePreview]);

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setFullscreen(false);
      }
    };
    document.body.style.overflow = "";
    document.body.style.pointerEvents = "";
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
    };
  }, [fullscreen]);

  const downloadPdf = async () => {
    if (!isCombined && !jobId) return;
    setIsDownloading(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (!publicMode) {
        Object.assign(headers, await getAuthHeaders());
      }
      const exportEndpoint = publicMode
        ? `/api/examples/${jobId}/export-pdf`
        : isCombined
          ? "/api/export-combined-pdf"
          : `/api/jobs/${jobId}/export-pdf`;
      const res = await fetch(exportEndpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(buildBody()),
      });
      if (!res.ok) throw new Error(t("pdfExport.exportFailed"));
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition");
      const match = disposition?.match(/filename="?([^";\n]+)"?/);
      const fallbackName = isCombined ? "mormorsbreve-sammel.pdf" : `mormorsbreve-${jobId}.pdf`;
      const filename = match?.[1] ?? fallbackName;
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(objectUrl);
      toast({ title: t("pdfExport.exportTitle"), description: t("pdfExport.downloadStarted") });
    } catch (e) {
      toast({
        title: t("pdfExport.errorTitle"),
        description: e instanceof Error ? e.message : t("pdfExport.exportFailed"),
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen && fullscreen) return;
    if (!isOpen && previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
      setPreviewUrl(null);
    }
    onOpenChange(isOpen);
  };

  return (
    <>
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-full max-w-[95vw] max-h-[90vh] overflow-y-auto md:max-w-5xl">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            {isCombined ? t("pdfExport.titleCombined") : t("pdfExport.titleSingle")}
          </DialogTitle>
          <DialogDescription>
            {isCombined
              ? t("pdfExport.descriptionCombined", { count: jobIds!.length })
              : t("pdfExport.descriptionSingle")}
          </DialogDescription>
        </DialogHeader>

        {/* Mobile: Tab-Umschaltung Einstellungen / Vorschau */}
        <Tabs
          value={mobileTab}
          onValueChange={(v) => setMobileTab(v as "settings" | "preview")}
          className="md:hidden"
        >
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="settings">{t("pdfExport.tabSettings")}</TabsTrigger>
            <TabsTrigger value="preview">{t("pdfExport.tabPreview")}</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="grid grid-cols-1 md:grid-cols-[340px_1fr] gap-6">
          <div className={`space-y-5 ${mobileTab === "settings" ? "block" : "hidden md:block"}`}>
            {translationLanguage && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t("pdfExport.pdfLanguage")}</Label>
                <Tabs
                  value={pdfLanguage}
                  onValueChange={(v) => setPdfLanguage(v as "de" | "translation")}
                >
                  <TabsList className="w-full">
                    <TabsTrigger value="de" className="flex-1 text-xs">
                      {t("pdfExport.german")}
                    </TabsTrigger>
                    <TabsTrigger value="translation" className="flex-1 text-xs">
                      <Globe className="h-3 w-3 mr-1" />
                      {getTranslationLanguageLabel(translationLanguage)}
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            )}

            {(anyPageHasCompleted || anyPageHasInterpreted) && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t("pdfExport.textVersion")}</Label>
                <Tabs
                  value={textVersion}
                  onValueChange={(v) => setTextVersion(v as "original" | "completed" | "interpreted")}
                >
                  <TabsList className="w-full">
                    <TabsTrigger value="original" className="flex-1 text-xs">
                      <FileText className="h-3 w-3 mr-1" />
                      {t("pdfExport.versionFaithful")}
                    </TabsTrigger>
                    <TabsTrigger value="completed" className="flex-1 text-xs">
                      <Sparkles className="h-3 w-3 mr-1" />
                      {t("pdfExport.versionCompleted")}
                    </TabsTrigger>
                    <TabsTrigger value="interpreted" className="flex-1 text-xs">
                      <Wand2 className="h-3 w-3 mr-1" />
                      {t("pdfExport.versionInterpreted")}
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            )}

            <div className="flex items-center justify-between">
              <Label htmlFor="continuous-flow" className="text-sm font-medium cursor-pointer">
                {t("pdfExport.continuousFlow")}
              </Label>
              <Switch
                id="continuous-flow"
                checked={continuousFlow}
                onCheckedChange={setContinuousFlow}
                data-testid="switch-continuous-flow"
              />
            </div>
            <p className="text-xs text-muted-foreground -mt-3">
              {t("pdfExport.continuousFlowHint")}
            </p>

            <div className="flex items-center justify-between">
              <Label htmlFor="show-page-labels" className="text-sm font-medium cursor-pointer">
                {t("pdfExport.pageLabels")}
              </Label>
              <Switch
                id="show-page-labels"
                checked={showPageLabels}
                onCheckedChange={setShowPageLabels}
                data-testid="switch-show-page-labels"
              />
            </div>
            <p className="text-xs text-muted-foreground -mt-3">
              {t("pdfExport.pageLabelsHint")}
            </p>

            <div className="flex items-center justify-between">
              <Label htmlFor="merge-lines" className="text-sm font-medium cursor-pointer">
                {t("pdfExport.mergeLines")}
              </Label>
              <Switch
                id="merge-lines"
                checked={mergeLines}
                onCheckedChange={setMergeLines}
                data-testid="switch-merge-lines"
              />
            </div>
            <p className="text-xs text-muted-foreground -mt-3">
              {t("pdfExport.mergeLinesHint")}
            </p>

            <div className="flex items-center justify-between">
              <Label htmlFor="justified" className="text-sm font-medium cursor-pointer">
                {t("pdfExport.justified")}
              </Label>
              <Switch
                id="justified"
                checked={justified}
                onCheckedChange={setJustified}
                data-testid="switch-justified"
              />
            </div>
            <p className="text-xs text-muted-foreground -mt-3">
              {t("pdfExport.justifiedHint")}
            </p>

            <div className="flex items-center justify-between">
              <Label htmlFor="font-size" className="text-sm font-medium">
                {t("pdfExport.fontSize")}
              </Label>
              <select
                id="font-size"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                data-testid="select-font-size"
              >
                <option value={10}>10 pt</option>
                <option value={11}>11 pt</option>
                <option value={12}>12 pt</option>
                <option value={13}>13 pt</option>
                <option value={14}>14 pt</option>
              </select>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <Label htmlFor="enable-cover" className="text-sm font-medium cursor-pointer">
                {t("pdfExport.enableCover")}
              </Label>
              <Switch
                id="enable-cover"
                checked={enableCover}
                onCheckedChange={setEnableCover}
                data-testid="switch-enable-cover"
              />
            </div>

            {enableCover && (
              <div className="space-y-4 pl-1">
                <div className="space-y-1.5">
                  <Label htmlFor="cover-title" className="text-xs">{t("pdfExport.coverTitle")}</Label>
                  <Input
                    id="cover-title"
                    placeholder={t("pdfExport.coverTitlePlaceholder")}
                    value={cover.title}
                    onChange={(e) => setCover({ ...cover, title: e.target.value })}
                    data-testid="input-cover-title"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="cover-subtitle" className="text-xs">{t("pdfExport.coverSubtitle")}</Label>
                  <Input
                    id="cover-subtitle"
                    placeholder={t("pdfExport.coverSubtitlePlaceholder")}
                    value={cover.subtitle}
                    onChange={(e) => setCover({ ...cover, subtitle: e.target.value })}
                    data-testid="input-cover-subtitle"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="cover-author" className="text-xs">{t("pdfExport.coverAuthor")}</Label>
                  <Input
                    id="cover-author"
                    placeholder={t("pdfExport.coverAuthorPlaceholder")}
                    value={cover.author}
                    onChange={(e) => setCover({ ...cover, author: e.target.value })}
                    data-testid="input-cover-author"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">{t("pdfExport.coverStyle")}</Label>
                  <RadioGroup
                    value={cover.style}
                    onValueChange={(v) => setCover({ ...cover, style: v as CoverPageOptions["style"] })}
                    className="flex gap-3"
                  >
                    <div className="flex items-center gap-1.5">
                      <RadioGroupItem value="classic" id="style-classic" />
                      <Label htmlFor="style-classic" className="text-xs cursor-pointer">{t("pdfExport.styleClassic")}</Label>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <RadioGroupItem value="elegant" id="style-elegant" />
                      <Label htmlFor="style-elegant" className="text-xs cursor-pointer">{t("pdfExport.styleElegant")}</Label>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <RadioGroupItem value="minimal" id="style-minimal" />
                      <Label htmlFor="style-minimal" className="text-xs cursor-pointer">{t("pdfExport.styleMinimal")}</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            )}

            <Separator />

            <div className="flex gap-2 hidden md:flex">
              <Button
                className="flex-1"
                onClick={downloadPdf}
                disabled={isGeneratingPreview || isDownloading}
                data-testid="button-download-pdf"
              >
                {isDownloading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                {t("common.download")}
              </Button>
            </div>
          </div>

          <div className={`relative border rounded-lg overflow-hidden bg-muted/30 min-h-[400px] md:min-h-[500px] flex items-center justify-center ${mobileTab === "preview" ? "block" : "hidden md:block"}`}>
            {isGeneratingPreview && !previewUrl ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <Loader2 className="h-10 w-10 animate-spin" />
                <span className="text-sm">{t("pdfExport.previewLoading")}</span>
              </div>
            ) : null}
            {previewUrl ? (
              <>
                <div className="absolute top-2 right-2 z-10 flex gap-1">
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-7 w-7 bg-background/80 backdrop-blur-sm"
                    onClick={() => setFullscreen(true)}
                    title={t("pdfExport.fullscreen")}
                    data-testid="button-fullscreen-preview"
                  >
                    <Maximize2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <iframe
                  src={previewUrl}
                  className="w-full h-full min-h-[400px] md:min-h-[500px]"
                  title={t("pdfExport.previewIframeTitle")}
                  data-testid="iframe-pdf-preview"
                />
              </>
            ) : null}
          </div>
        </div>

        {/* Sticky Download-Button auf Mobilgeräten (in beiden Tabs erreichbar) */}
        <div className="md:hidden sticky bottom-0 py-3 -mx-6 px-6 border-t bg-background mt-4">
          <Button
            className="w-full"
            onClick={downloadPdf}
            disabled={isGeneratingPreview || isDownloading}
            data-testid="button-download-pdf"
          >
            {isDownloading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            {t("common.download")}
          </Button>
        </div>

        <DialogFooter className="sm:justify-start hidden md:flex">
          <p className="text-xs text-muted-foreground">
            {t("pdfExport.footerTip")}
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>

      {fullscreen && previewUrl && createPortal(
        <div
          className="fixed inset-0 flex flex-col bg-background"
          style={{ zIndex: 9999 }}
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b bg-background shrink-0">
            <h3 className="font-serif text-lg flex items-center gap-2">
              <Eye className="h-5 w-5" />
              {t("pdfExport.previewHeading")}
            </h3>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={downloadPdf}
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                {t("common.download")}
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setFullscreen(false)}
                title={t("pdfExport.exitFullscreen")}
                data-testid="button-exit-fullscreen"
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <iframe
            src={previewUrl}
            className="flex-1 w-full border-0"
            style={{ minHeight: 0 }}
            title={t("pdfExport.previewIframeFullscreenTitle")}
            data-testid="iframe-pdf-fullscreen"
          />
        </div>,
        document.body,
      )}
    </>
  );
}
