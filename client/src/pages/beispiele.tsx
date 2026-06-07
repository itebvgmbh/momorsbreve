import { Link } from "wouter";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { AuthDialog } from "@/components/auth-dialog";
import {
  ArrowRight,
  BookOpen,
  FileText,
  ScrollText,
  MapPin,
  Copy,
  Pencil,
  Sparkles,
  Wand2,
  Headphones,
  Download,
  Globe,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { MarketingNav } from "@/components/marketing-nav";
import { MarketingFooter } from "@/components/marketing-footer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { DocumentPreview } from "@/components/document-preview";
import { PdfExportDialog } from "@/components/pdf-export-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  getScriptTypeDisplayLabel,
  getTranslationLanguageLabel,
} from "@shared/models/transcription";
import type { TranscriptionPage } from "@shared/models/transcription";
import {
  type TextVersion,
  type DisplayLanguage,
  getPageInterpreted,
  getPageDisplayText,
} from "@/lib/transcription-helpers";
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

interface ExamplePage {
  pageNumber: number;
  imageUrl: string;
  transcription: string | null;
  transcriptionCompleted: string | null;
  transcriptionInterpreted: string | null;
  transcriptionEdited: string | null;
  transcriptionCompletedEdited: string | null;
  transcriptionInterpretedEdited: string | null;
  translation: string | null;
  translationCompleted: string | null;
  translationInterpreted: string | null;
  translationEdited: string | null;
  translationCompletedEdited: string | null;
  translationInterpretedEdited: string | null;
  qualityDetails: unknown;
  status: string;
}

interface ExampleDocument {
  id: number;
  title: string;
  description: string;
  source: string;
  scriptType: string;
  translationLanguage?: string | null;
  totalPages: number;
  audioUrl: string | null;
  pages: ExamplePage[];
}

interface ExamplesResponse {
  examples: ExampleDocument[];
  maxVisible: number;
}

function ExamplePageNavigator({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8"
        disabled={currentPage <= 0}
        onClick={() => onPageChange(currentPage - 1)}
        aria-label={t("examples.prevPage")}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Select
        value={String(currentPage)}
        onValueChange={(val) => onPageChange(Number(val))}
      >
        <SelectTrigger className="w-auto h-8 min-w-[160px] text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Array.from({ length: totalPages }, (_, i) => (
            <SelectItem key={i} value={String(i)}>
              {t("examples.pageOf", { n: i + 1, total: totalPages })}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8"
        disabled={currentPage >= totalPages - 1}
        onClick={() => onPageChange(currentPage + 1)}
        aria-label={t("examples.nextPage")}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

function ExampleDocumentView({
  example,
  onRequestAuth,
}: {
  example: ExampleDocument;
  onRequestAuth: () => void;
}) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [currentPageIdx, setCurrentPageIdx] = useState(0);
  const [textVersion, setTextVersion] = useState<TextVersion>("original");
  const [displayLanguage, setDisplayLanguage] = useState<DisplayLanguage>(
    example.translationLanguage ? "translation" : "de",
  );
  const [editingPageId, setEditingPageId] = useState<number | null>(null);
  const [editedTextDraft, setEditedTextDraft] = useState("");
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [showPdfExport, setShowPdfExport] = useState(false);

  const originalColRef = useRef<HTMLDivElement>(null);
  const [originalColHeight, setOriginalColHeight] = useState<number | null>(null);

  useEffect(() => {
    if (!originalColRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) setOriginalColHeight(Math.round(entry.contentRect.height));
    });
    ro.observe(originalColRef.current);
    return () => ro.disconnect();
  }, [currentPageIdx]);

  const currentPage = example.pages[currentPageIdx];
  if (!currentPage) return null;

  const pageAsRecord = currentPage as unknown as TranscriptionPage & Record<string, unknown>;

  const anyPageHasCompleted = example.pages.some((p) => p.transcriptionCompleted);
  const anyPageHasInterpreted = example.pages.some((p) =>
    getPageInterpreted(p as unknown as TranscriptionPage & Record<string, unknown>),
  );
  const anyPageHasEnhanced = anyPageHasCompleted || anyPageHasInterpreted;

  const hasTranslation = example.translationLanguage && example.pages.some((p) => p.translation);

  const displayText = getPageDisplayText(pageAsRecord, textVersion, displayLanguage);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: t("common.copied"), description: t("common.copiedToClipboard") });
  };

  const startEditing = () => {
    setEditingPageId(currentPage.pageNumber);
    setEditedTextDraft(displayText ?? "");
  };

  const cancelEditing = () => {
    setEditingPageId(null);
    setEditedTextDraft("");
  };

  const handleSave = () => {
    setShowLoginPrompt(true);
  };

  const isEditingThis = editingPageId === currentPage.pageNumber;

  const interpretedText = getPageInterpreted(pageAsRecord);

  return (
    <article className="space-y-4">
      <div>
        <h2 className="font-serif text-2xl font-bold mb-1">{example.title}</h2>
        {example.description && (
          <p className="text-muted-foreground text-sm mb-3">{example.description}</p>
        )}
        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
          <Badge variant="secondary" className="text-xs">
            {example.totalPages} {example.totalPages === 1 ? t("examples.pageOne") : t("examples.pageMany")}
          </Badge>
          {example.source && (
            <span className="flex items-center gap-1 text-xs">
              <MapPin className="h-3 w-3 text-primary" />
              {example.source}
            </span>
          )}
        </div>
      </div>

      {example.pages.length > 1 && (
        <div className="flex items-center justify-center">
          <ExamplePageNavigator
            currentPage={currentPageIdx}
            totalPages={example.pages.length}
            onPageChange={setCurrentPageIdx}
          />
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6 items-start">
        <div>
          <h3 className="font-serif text-lg font-semibold mb-3">{t("examples.original")}</h3>
          <Card ref={originalColRef}>
            <DocumentPreview
              src={currentPage.imageUrl}
              alt={t("examples.originalAlt", { n: currentPage.pageNumber })}
            />
          </Card>
        </div>

        <div className="min-w-0">
          <div className="flex items-center justify-between gap-2 mb-2">
            <h3 className="font-serif text-lg font-semibold">{t("examples.transcription")}</h3>
            {currentPage.transcription && !isEditingThis && (
              <div className="flex items-center gap-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => copyToClipboard(displayText || "")}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t("common.copy")}</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={startEditing}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t("common.edit")}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
          </div>

          {currentPage.transcription && hasTranslation && (
            <div className="flex items-center gap-2 mb-2">
              <Tabs
                value={displayLanguage}
                onValueChange={(v) => setDisplayLanguage(v as DisplayLanguage)}
              >
                <TabsList className="h-8">
                  <TabsTrigger value="de" className="text-xs px-3 h-6">
                    {t("examples.original")}
                  </TabsTrigger>
                  <TabsTrigger value="translation" className="text-xs px-3 h-6">
                    <Globe className="h-3 w-3 mr-1" />
                    {getTranslationLanguageLabel(example.translationLanguage!)}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          )}

          {currentPage.transcription && anyPageHasEnhanced && (
            <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
              <Tabs
                value={textVersion}
                onValueChange={(v) => setTextVersion(v as TextVersion)}
              >
                <TabsList className="h-8">
                  <TabsTrigger value="original" className="text-xs px-3 h-6">
                    <FileText className="h-3 w-3 mr-1" />
                    {t("examples.faithful")}
                  </TabsTrigger>
                  <TabsTrigger value="completed" className="text-xs px-3 h-6">
                    <Sparkles className="h-3 w-3 mr-1" />
                    {t("examples.completed")}
                  </TabsTrigger>
                  <TabsTrigger value="interpreted" className="text-xs px-3 h-6">
                    <Wand2 className="h-3 w-3 mr-1" />
                    {t("examples.interpretation")}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs shrink-0"
                onClick={() => setShowPdfExport(true)}
              >
                <BookOpen className="h-3.5 w-3.5 mr-1.5" />
                PDF
              </Button>
            </div>
          )}
          {currentPage.transcription && !anyPageHasEnhanced && (
            <div className="flex justify-end mb-3">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setShowPdfExport(true)}
              >
                <BookOpen className="h-3.5 w-3.5 mr-1.5" />
                PDF
              </Button>
            </div>
          )}

          <Card className="p-5">
            {currentPage.transcription && textVersion === "completed" && currentPage.transcriptionCompleted && !isEditingThis && (
              <div className="flex items-center gap-1.5 mb-3 text-xs text-amber-600 dark:text-amber-400">
                <Sparkles className="h-3 w-3" />
                <span>{t("examples.gapsFilled")}</span>
              </div>
            )}
            {currentPage.transcription && textVersion === "interpreted" && (interpretedText || currentPage.transcriptionCompleted) && !isEditingThis && (
              <div className="flex items-center gap-1.5 mb-3 text-xs text-amber-600 dark:text-amber-400">
                <Wand2 className="h-3 w-3" />
                <span>{t("examples.interpretedNote")}</span>
              </div>
            )}
            {isEditingThis ? (
              <div className="space-y-3">
                <textarea
                  className="w-full font-serif text-sm leading-relaxed whitespace-pre-wrap rounded-md border border-input bg-background px-3 py-2 resize-y"
                  style={{ minHeight: originalColHeight ? `${Math.max(200, originalColHeight)}px` : "300px" }}
                  value={editedTextDraft}
                  onChange={(e) => setEditedTextDraft(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSave}>
                    {t("common.save")}
                  </Button>
                  <Button size="sm" variant="outline" onClick={cancelEditing}>
                    {t("common.cancel")}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="font-serif text-sm leading-relaxed whitespace-pre-wrap">
                {displayText || t("examples.noTextYet")}
              </div>
            )}
          </Card>
        </div>
      </div>

      {example.audioUrl && (
        <Card className="p-4 border-primary/20 bg-primary/[0.02]">
          <div className="flex flex-wrap items-center gap-3">
            <Headphones className="h-5 w-5 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <audio controls className="w-full h-9" src={example.audioUrl} />
            </div>
            <Button size="sm" variant="ghost" className="h-8 text-xs shrink-0" asChild>
              <a href={example.audioUrl} download>
                <Download className="h-3.5 w-3.5 mr-1" />
                {t("common.download")}
              </a>
            </Button>
          </div>
        </Card>
      )}

      <AlertDialog open={showLoginPrompt} onOpenChange={setShowLoginPrompt}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("examples.loginRequiredTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("examples.loginRequiredBody")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.close")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setShowLoginPrompt(false); onRequestAuth(); }}>
              {t("common.login")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PdfExportDialog
        open={showPdfExport}
        onOpenChange={setShowPdfExport}
        jobId={String(example.id)}
        textVersion={textVersion}
        anyPageHasCompleted={anyPageHasCompleted}
        anyPageHasInterpreted={anyPageHasInterpreted}
        translationLanguage={example.translationLanguage}
        publicMode
      />
    </article>
  );
}

export default function BeispielePage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);

  const { data, isLoading } = useQuery<ExamplesResponse>({
    queryKey: ["/api/examples"],
    staleTime: 60_000,
  });

  const hasExamples = data && data.examples.length > 0;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: t("examples.jsonLdName"),
    description: t("examples.jsonLdDescription"),
    url: "https://mormorsbreve.dk/beispiele",
    publisher: {
      "@type": "Organization",
      name: "MormorsBreve",
      url: "https://mormorsbreve.dk",
    },
    mainEntity: data?.examples.map((ex) => ({
      "@type": "CreativeWork",
      name: ex.title,
      description: ex.description,
    })) ?? [],
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{t("examples.metaTitle")}</title>
        <meta name="description" content={t("examples.metaDescription")} />
        <link rel="canonical" href="https://mormorsbreve.dk/beispiele" />
        <meta property="og:title" content={t("examples.ogTitle")} />
        <meta property="og:description" content={t("examples.ogDescription")} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://mormorsbreve.dk/beispiele" />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <MarketingNav activeLink="beispiele" />

      <main className="pt-24 pb-16 max-w-5xl mx-auto px-4 sm:px-6">
        <header className="mb-14">
          <Badge variant="secondary" className="mb-4">
            {t("examples.badge")}
          </Badge>
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold mb-5">
            {t("examples.h1")}
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed max-w-3xl">
            {t("examples.intro")}
          </p>
        </header>

        {isLoading && (
          <div className="space-y-8">
            <Skeleton className="h-10 w-64" />
            <div className="grid lg:grid-cols-2 gap-6">
              <Skeleton className="h-96" />
              <Skeleton className="h-96" />
            </div>
          </div>
        )}

        {!isLoading && hasExamples && (
          <>
            {data.examples.length > 1 && (
              <nav className="mb-14" aria-label={t("examples.navAria")}>
                <div className="grid sm:grid-cols-3 gap-3">
                  {data.examples.map((ex) => (
                    <a key={ex.id} href={`#beispiel-${ex.id}`} className="group">
                      <Card className="p-4 hover:border-primary/40 transition-colors cursor-pointer h-full">
                        <p className="font-serif text-sm font-semibold group-hover:text-primary transition-colors mb-1">
                          {ex.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {getScriptTypeDisplayLabel(ex.scriptType) && (
                            <>{getScriptTypeDisplayLabel(ex.scriptType)} &middot;{" "}</>
                          )}
                          {ex.totalPages} {ex.totalPages === 1 ? t("examples.pageOne") : t("examples.pageMany")}
                        </p>
                      </Card>
                    </a>
                  ))}
                </div>
              </nav>
            )}

            <div className="space-y-20 sm:space-y-28">
              {data.examples.map((example) => (
                <div key={example.id} id={`beispiel-${example.id}`} className="scroll-mt-20">
                  <ExampleDocumentView
                    example={example}
                    onRequestAuth={() => setAuthOpen(true)}
                  />
                </div>
              ))}
            </div>
          </>
        )}

        {!isLoading && !hasExamples && (
          <div className="text-center py-16">
            <FileText className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
            <p className="text-muted-foreground">
              {t("examples.emptyState")}
            </p>
          </div>
        )}

        <section className="mt-20 sm:mt-28 text-center">
          <Card className="p-8 sm:p-12 bg-primary/5 border-primary/20">
            <h2 className="font-serif text-2xl sm:text-3xl font-bold mb-4">
              {t("examples.ctaTitle")}
            </h2>
            <p className="text-muted-foreground text-lg mb-6 max-w-2xl mx-auto">
              {t("examples.ctaBody")}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {user ? (
                <Link href="/app/upload">
                  <Button size="lg">
                    {t("examples.uploadNow")}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              ) : (
                <Button size="lg" onClick={() => setAuthOpen(true)}>
                  {t("examples.tryFree")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
              <Link href="/blog">
                <Button size="lg" variant="outline">
                  {t("examples.moreBlog")}
                </Button>
              </Link>
            </div>
          </Card>
        </section>
      </main>

      <MarketingFooter />

      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
    </div>
  );
}
