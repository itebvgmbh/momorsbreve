import { useState, useCallback, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  Upload,
  FileText,
  Coins,
  Clock,
  Plus,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Info,
  Loader2,
  Trash2,
  Sparkles,
  Headphones,
  X,
  MoreVertical,
  ExternalLink,
  AlertTriangle,
  Search,
  Pencil,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { TranscriptionJobWithSnippet, UserCredits } from "@shared/models/transcription";
import { getScriptTypeDisplayLabel } from "@shared/models/transcription";
import type { PromotionConfig } from "@shared/models/transcription";

function StatusBadge({ status, completedPages, totalPages }: { status: string; completedPages?: number; totalPages?: number }) {
  switch (status) {
    case "completed":
      return (
        <Badge variant="secondary" className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Fertig
        </Badge>
      );
    case "processing":
      return (
        <Badge variant="secondary" className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          {totalPages && totalPages > 0
            ? `${completedPages ?? 0}/${totalPages} Seiten`
            : "Verarbeitung"}
        </Badge>
      );
    case "preview":
      return (
        <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
          <Clock className="h-3 w-3 mr-1" />
          Vorschau
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary">
          <AlertCircle className="h-3 w-3 mr-1" />
          {status}
        </Badge>
      );
  }
}

/** Anzeigename eines Jobs: vom Nutzer vergebener Titel, sonst Textauszug, sonst Schrifttyp/ID. */
function getJobDisplayLabel(job: TranscriptionJobWithSnippet): string {
  if (job.title && job.title.trim().length > 0) return job.title;
  if (job.textSnippet) {
    return job.textSnippet + (job.textSnippet.length >= 100 ? "…" : "");
  }
  return getScriptTypeDisplayLabel(job.scriptType) || `Dokument #${job.id}`;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [deleteTarget, setDeleteTarget] = useState<TranscriptionJobWithSnippet | null>(null);
  const [transcribingJobId, setTranscribingJobId] = useState<number | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedJobIds, setSelectedJobIds] = useState<Set<number>>(new Set());
  const [renameTarget, setRenameTarget] = useState<TranscriptionJobWithSnippet | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [returningBannerDismissed, setReturningBannerDismissed] = useState(
    () => sessionStorage.getItem("returning_banner_dismissed") === "1",
  );

  const { data: credits, isLoading: creditsLoading } = useQuery<UserCredits & { freeCreditsBlocked?: boolean }>({
    queryKey: ["/api/credits"],
  });

  const showReturningBanner = credits?.freeCreditsBlocked === true && !returningBannerDismissed;

  const { data: promotion } = useQuery<PromotionConfig>({
    queryKey: ["/api/promotion"],
  });

  const { data: jobs, isLoading: jobsLoading } = useQuery<TranscriptionJobWithSnippet[]>({
    queryKey: ["/api/jobs"],
    refetchInterval: (query) => {
      const d = query.state.data;
      if (d?.some((j) => j.status === "processing")) return 4000;
      return false;
    },
  });

  const completedJobs = useMemo(
    () => (jobs ?? []).filter((j) => j.status === "completed"),
    [jobs],
  );

  const filteredJobs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return (jobs ?? []).filter((job) => {
      if (statusFilter !== "all" && job.status !== statusFilter) return false;
      if (q) {
        const haystack = [
          job.title ?? "",
          job.textSnippet ?? "",
          getScriptTypeDisplayLabel(job.scriptType),
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [jobs, searchQuery, statusFilter]);

  const isFiltering = searchQuery.trim().length > 0 || statusFilter !== "all";

  const toggleJobSelection = useCallback((jobId: number) => {
    setSelectedJobIds((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
  }, []);

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedJobIds(new Set());
  }, []);

  const selectedJobs = useMemo(
    () => completedJobs.filter((j) => selectedJobIds.has(j.id)),
    [completedJobs, selectedJobIds],
  );

  const selectedTotalPages = useMemo(
    () => selectedJobs.reduce((sum, j) => sum + j.totalPages, 0),
    [selectedJobs],
  );

  const deleteMutation = useMutation({
    mutationFn: async (jobId: number) => {
      await apiRequest("DELETE", `/api/jobs/${jobId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      setDeleteTarget(null);
    },
  });

  const renameMutation = useMutation({
    mutationFn: async ({ jobId, title }: { jobId: number; title: string }) => {
      const res = await apiRequest("PATCH", `/api/jobs/${jobId}`, { title });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      setRenameTarget(null);
      toast({ title: "Gespeichert", description: "Der Name wurde aktualisiert." });
    },
    onError: (error: Error) => {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    },
  });

  const transcribeMutation = useMutation({
    mutationFn: async (jobId: number) => {
      setTranscribingJobId(jobId);
      const res = await apiRequest("POST", `/api/jobs/${jobId}/transcribe`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/credits"] });
      toast({ title: "Gestartet", description: "Alle Seiten werden jetzt ausgewertet." });
      setTranscribingJobId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
      setTranscribingJobId(null);
    },
  });

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user?.profileImageUrl || undefined} />
            <AvatarFallback>
              {user?.firstName?.[0] || user?.email?.[0] || "U"}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="font-serif text-2xl font-bold" data-testid="text-welcome">
              Willkommen{user?.firstName ? `, ${user.firstName}` : ""}
            </h1>
            <p className="text-sm text-muted-foreground">
              Ihre Erinnerungen an einem Ort
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {completedJobs.length >= 2 && !selectionMode && (
            <Button
              variant="outline"
              onClick={() => setSelectionMode(true)}
              data-testid="button-enter-selection"
              data-tour="dashboard-combine"
              title="Mehrere Dokumente auswählen, zusammenfügen und drucken"
            >
              <BookOpen className="h-4 w-4 mr-2" />
              <span className="sm:hidden">Zusammenfügen</span>
              <span className="hidden sm:inline">Zusammenfügen &amp; drucken</span>
            </Button>
          )}
          {selectionMode && (
            <Button
              variant="ghost"
              size="sm"
              onClick={exitSelectionMode}
            >
              <X className="h-4 w-4 mr-2" />
              Abbrechen
            </Button>
          )}
          <Link href="/app/upload">
            <Button data-testid="button-new-transcription">
              <Plus className="h-4 w-4 mr-2" />
              Seiten hochladen
            </Button>
          </Link>
        </div>
      </div>

      {promotion?.enabled && (
        <Link href="/app/pricing">
          <div className="rounded-lg border border-amber-300/60 dark:border-amber-600/60 bg-amber-50/80 dark:bg-amber-950/30 px-4 py-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-amber-100/80 dark:hover:bg-amber-900/30 transition-colors">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              {promotion.label}: Bis zu 55 % auf KI-Transkription!
            </p>
            <ArrowRight className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          </div>
        </Link>
      )}

      {showReturningBanner && (
        <Alert className="border-blue-300/60 dark:border-blue-600/60 bg-blue-50/80 dark:bg-blue-950/30">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="flex items-center justify-between gap-3">
            <span className="text-sm text-blue-800 dark:text-blue-200">
              Willkommen zurück! Gratis-Credits können nur einmal vergeben werden.
              Sie können jederzeit weitere Credits erwerben.
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 h-7 w-7 p-0 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
              onClick={() => {
                sessionStorage.setItem("returning_banner_dismissed", "1");
                setReturningBannerDismissed(true);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {(() => {
          const creditCount = credits?.credits ?? 0;
          const isLow = !creditsLoading && creditCount < 5;
          const isEmpty = !creditsLoading && creditCount === 0;

          const toneCard = isEmpty
            ? "border-red-300/70 dark:border-red-700/60 bg-red-50/60 dark:bg-red-950/20"
            : isLow
              ? "border-amber-300/70 dark:border-amber-700/60 bg-amber-50/60 dark:bg-amber-950/20"
              : "";
          const toneIconBg = isEmpty
            ? "bg-red-500/10"
            : isLow
              ? "bg-amber-500/15"
              : "bg-primary/10";
          const toneIcon = isEmpty
            ? "text-red-600 dark:text-red-400"
            : isLow
              ? "text-amber-600 dark:text-amber-400"
              : "text-primary";

          return (
            <Link href="/app/pricing" data-testid="link-credits-card">
              <Card
                className={`px-4 py-3 flex items-center gap-3 cursor-pointer hover-elevate ${toneCard}`}
                aria-label={isEmpty ? "Kein Guthaben – jetzt aufladen" : isLow ? "Wenig Guthaben – jetzt aufladen" : "Guthaben verwalten"}
              >
                <div className={`p-1.5 rounded-md shrink-0 ${toneIconBg}`}>
                  {isLow ? (
                    <AlertTriangle className={`h-4 w-4 ${toneIcon}`} />
                  ) : (
                    <Coins className={`h-4 w-4 ${toneIcon}`} />
                  )}
                </div>
                {creditsLoading ? (
                  <Skeleton className="h-6 w-16" />
                ) : (
                  <div className="min-w-0 flex-1">
                    <p className="font-serif text-xl font-bold leading-tight" data-testid="text-credits">
                      {creditCount}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {isEmpty ? "Kein Guthaben – aufladen" : isLow ? "Wenig Guthaben – aufladen" : "Guthaben"}
                    </p>
                  </div>
                )}
                {!creditsLoading && (
                  <ArrowRight className={`h-3.5 w-3.5 shrink-0 ${isLow ? toneIcon : "text-muted-foreground/60"}`} />
                )}
              </Card>
            </Link>
          );
        })()}

        <Card className="px-4 py-3 flex items-center gap-3">
          <div className="p-1.5 rounded-md bg-primary/10 shrink-0">
            <FileText className="h-4 w-4 text-primary" />
          </div>
          {jobsLoading ? (
            <Skeleton className="h-6 w-16" />
          ) : (
            <div className="min-w-0">
              <p className="font-serif text-xl font-bold leading-tight" data-testid="text-jobs-count">
                {jobs?.length ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">Dokumente</p>
            </div>
          )}
        </Card>

        <Card className="px-4 py-3 flex items-center gap-3">
          <div className="p-1.5 rounded-md bg-primary/10 shrink-0">
            <Upload className="h-4 w-4 text-primary" />
          </div>
          {jobsLoading ? (
            <Skeleton className="h-6 w-16" />
          ) : (
            <div className="min-w-0">
              <p className="font-serif text-xl font-bold leading-tight" data-testid="text-completed-pages">
                {jobs?.filter((j) => j.status === "completed").reduce((sum, j) => sum + j.totalPages, 0) ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">Fertige Seiten</p>
            </div>
          )}
        </Card>
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="font-serif text-xl font-semibold">Meine Transkriptionen</h2>
          {jobs && jobs.length > 0 && !selectionMode && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Durchsuchen…"
                  className="h-9 w-44 sm:w-56 pl-8 pr-8"
                  data-testid="input-search-jobs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label="Suche zurücksetzen"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 w-36" data-testid="select-status-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle</SelectItem>
                  <SelectItem value="completed">Fertig</SelectItem>
                  <SelectItem value="preview">Vorschau</SelectItem>
                  <SelectItem value="processing">In Arbeit</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        {jobsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : jobs && jobs.length > 0 ? (
          <>
            {filteredJobs.length === 0 ? (
              <Card className="p-8 text-center">
                <Search className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-3">
                  Keine Transkriptionen entsprechen den Filterkriterien.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                  }}
                >
                  Filter zurücksetzen
                </Button>
              </Card>
            ) : (
            <div className="space-y-2" data-tour="dashboard-job-list">
              {filteredJobs.map((job) => {
                const isSelectable = selectionMode && job.status === "completed";
                const isSelected = selectedJobIds.has(job.id);
                const isDisabledInSelection = selectionMode && job.status !== "completed";

                return (
                  <Card
                    key={job.id}
                    className={`p-4 hover-elevate ${isSelected ? "ring-2 ring-primary" : ""} ${isDisabledInSelection ? "opacity-50" : ""}`}
                    data-testid={`card-job-${job.id}`}
                    onClick={isSelectable ? (e) => { e.preventDefault(); toggleJobSelection(job.id); } : undefined}
                    role={isSelectable ? "button" : undefined}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      {selectionMode && (
                        <Checkbox
                          checked={isSelected}
                          disabled={job.status !== "completed"}
                          onCheckedChange={() => toggleJobSelection(job.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="shrink-0"
                          data-testid={`checkbox-job-${job.id}`}
                        />
                      )}
                      <Link
                        href={job.status === "preview" ? `/app/preview/${job.id}` : `/app/result/${job.id}`}
                        className="flex items-center gap-3 min-w-0 basis-full sm:basis-0 sm:flex-1 cursor-pointer"
                        onClick={selectionMode ? (e: React.MouseEvent) => e.preventDefault() : undefined}
                      >
                        <div className="p-2 rounded-md bg-muted shrink-0">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">
                            {getJobDisplayLabel(job)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {getScriptTypeDisplayLabel(job.scriptType) && (
                              <>{getScriptTypeDisplayLabel(job.scriptType)} &middot;{" "}</>
                            )}
                            {job.totalPages} {job.totalPages === 1 ? "Seite" : "Seiten"} &middot;{" "}
                            {job.createdAt
                              ? new Date(job.createdAt).toLocaleDateString("de-DE", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })
                              : ""}
                          </p>
                        </div>
                      </Link>
                      {!selectionMode && (
                        <div className="flex items-center flex-wrap gap-2">
                          {job.status === "preview" && (
                            <Button
                              size="sm"
                              variant="default"
                              className="text-xs"
                              disabled={transcribeMutation.isPending && transcribingJobId === job.id}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const currentCr = credits?.credits ?? 0;
                                const needed = Math.max(0, job.totalPages - 1);
                                if (currentCr < needed) {
                                  toast({
                                    title: "Nicht genügend Guthaben",
                                    description: `Sie benötigen noch ${needed - currentCr} weitere ${needed - currentCr === 1 ? "Credit" : "Credits"}.`,
                                    variant: "destructive",
                                  });
                                  return;
                                }
                                transcribeMutation.mutate(job.id);
                              }}
                              data-testid={`button-transcribe-${job.id}`}
                            >
                              {transcribeMutation.isPending && transcribingJobId === job.id ? (
                                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                              ) : (
                                <Sparkles className="h-3.5 w-3.5 mr-1" />
                              )}
                              Komplett transkribieren
                            </Button>
                          )}
                          <StatusBadge status={job.status} completedPages={job.completedPages} totalPages={job.totalPages} />
                          {job.status === "completed" && !job.hasAudio && (
                            <Link href={`/app/result/${job.id}`} onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                              <Badge variant="outline" className="text-[10px] cursor-pointer hover:bg-primary/5 gap-1">
                                <Headphones className="h-3 w-3" />
                                Vorlesen
                              </Badge>
                            </Link>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 sm:h-8 sm:w-8 text-muted-foreground"
                                aria-label="Weitere Aktionen"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                }}
                                data-testid={`button-menu-${job.id}`}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <DropdownMenuItem
                                onSelect={() => {
                                  navigate(
                                    job.status === "preview"
                                      ? `/app/preview/${job.id}`
                                      : `/app/result/${job.id}`,
                                  );
                                }}
                                data-testid={`menu-open-${job.id}`}
                              >
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Öffnen
                              </DropdownMenuItem>
                              {job.status === "completed" && !job.hasAudio && (
                                <DropdownMenuItem
                                  onSelect={() => navigate(`/app/result/${job.id}`)}
                                >
                                  <Headphones className="h-4 w-4 mr-2" />
                                  Vorlesen
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onSelect={() => {
                                  setRenameTarget(job);
                                  setRenameValue(job.title ?? "");
                                }}
                                data-testid={`menu-rename-${job.id}`}
                              >
                                <Pencil className="h-4 w-4 mr-2" />
                                Umbenennen
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onSelect={() => setDeleteTarget(job)}
                                data-testid={`menu-delete-${job.id}`}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Löschen
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
            )}

            <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Dokument löschen?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Dieses Dokument und alle zugehörigen Transkriptionen werden unwiderruflich gelöscht.
                    {deleteTarget && deleteTarget.totalPages > 0 && (
                      <span className="block mt-1 font-medium">
                        {deleteTarget.totalPages} {deleteTarget.totalPages === 1 ? "Seite wird" : "Seiten werden"} entfernt.
                      </span>
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={deleteMutation.isPending}>Abbrechen</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={deleteMutation.isPending}
                    onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
                  >
                    {deleteMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Wird gelöscht…
                      </>
                    ) : (
                      "Endgültig löschen"
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        ) : (
          <Card className="p-10 text-center">
            <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-serif text-lg font-semibold mb-2">
              Noch keine Dokumente
            </h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
              Laden Sie Ihre ersten Seiten hoch – einzelne Fotos, Scans oder ein
              mehrseitiges PDF. Wir machen sie für Sie lesbar.
            </p>
            <Link href="/app/upload">
              <Button data-testid="button-first-upload">
                <Upload className="h-4 w-4 mr-2" />
                Erste Seiten hochladen
              </Button>
            </Link>
          </Card>
        )}
      </div>

      <Dialog open={!!renameTarget} onOpenChange={(open) => !open && setRenameTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transkription umbenennen</DialogTitle>
            <DialogDescription>
              Vergeben Sie einen eigenen Namen. Leer lassen, um wieder den
              automatischen Textauszug anzuzeigen.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="rename-input">Name</Label>
            <Input
              id="rename-input"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              maxLength={200}
              placeholder={
                renameTarget
                  ? renameTarget.textSnippet?.slice(0, 60) || "z. B. Brief von Oma"
                  : ""
              }
              onKeyDown={(e) => {
                if (e.key === "Enter" && !renameMutation.isPending && renameTarget) {
                  renameMutation.mutate({ jobId: renameTarget.id, title: renameValue });
                }
              }}
              data-testid="input-rename-job"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setRenameTarget(null)}
              disabled={renameMutation.isPending}
            >
              Abbrechen
            </Button>
            <Button
              onClick={() =>
                renameTarget &&
                renameMutation.mutate({ jobId: renameTarget.id, title: renameValue })
              }
              disabled={renameMutation.isPending}
              data-testid="button-save-rename"
            >
              {renameMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Speichern…
                </>
              ) : (
                "Speichern"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectionMode && selectedJobIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-sm shadow-lg">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-sm">
              <Badge variant="secondary" className="text-xs">
                {selectedJobIds.size}
              </Badge>
              <span>
                {selectedJobIds.size === 1 ? "Dokument" : "Dokumente"} ausgewählt
                <span className="text-muted-foreground ml-1">
                  ({selectedTotalPages} {selectedTotalPages === 1 ? "Seite" : "Seiten"})
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={exitSelectionMode}
              >
                Auswahl aufheben
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  const ids = Array.from(selectedJobIds).join(",");
                  exitSelectionMode();
                  navigate(`/app/combine?jobs=${ids}`);
                }}
                data-testid="button-combine-pdf"
                data-tour="dashboard-combine-submit"
                {...(selectedJobIds.size >= 2 ? { "data-tour-ready": "combine" } : {})}
              >
                <BookOpen className="h-4 w-4 mr-2" />
                Als PDF zusammenführen
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
