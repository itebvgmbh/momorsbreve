import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Headphones,
  Download,
  Trash2,
  Clock,
  User2,
  FileText,
  Volume2,
  Plus,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  ListMusic,
  Play,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { TTS_CHARACTERS, TTS_CHARACTER_STYLES, TTS_VOICES } from "@/lib/tts-constants";
import { loc } from "@/i18n/localized";
import { AudiobookPlayer, type PlaylistTrack } from "@/components/audiobook-player";

type AudioGeneration = {
  id: number;
  jobId: number;
  version: string;
  lang: string;
  voice: string;
  style: string | null;
  pages: number[] | "all";
  status: string;
  audioUrl: string | null;
  audioMimeType: string | null;
  creditsUsed: number;
  createdAt: string;
  textSnippet: string | null;
};

type PlaylistSummary = {
  id: number;
  name: string;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
  lastPosition: { trackIndex: number; time: number } | null;
};

type PlaylistDetail = PlaylistSummary & {
  items: Array<{
    id: number;
    ttsGenerationId: number;
    sortOrder: number;
    voice: string;
    style: string | null;
    lang: string;
    version: string;
    pages: number[] | "all";
    audioUrl: string | null;
    textSnippet: string | null;
  }>;
};

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function AudioDuration({ src }: { src: string }) {
  const [duration, setDuration] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;
    audio.preload = "metadata";
    audio.src = src;
    const onMeta = () => {
      if (audio.duration && isFinite(audio.duration)) setDuration(audio.duration);
    };
    audio.addEventListener("loadedmetadata", onMeta);
    return () => {
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.src = "";
      audioRef.current = null;
    };
  }, [src]);

  if (duration === null) return <span className="text-muted-foreground text-xs">--:--</span>;
  return <span className="text-xs tabular-nums">{formatDuration(duration)}</span>;
}

function getVoiceLabel(voice: string) {
  const char = TTS_CHARACTERS.find((c) => c.voice === voice);
  if (char) return { label: char.label, gender: char.gender, description: char.description };
  const v = TTS_VOICES.find((v) => v.name === voice);
  if (v) return { label: v.name, gender: v.gender, description: null };
  return { label: voice, gender: null, description: null };
}

function getStyleLabel(style: string | null, t: TFunction, lang?: string): string {
  if (!style) return t("audioPage.styleStandard");
  const preset = TTS_CHARACTER_STYLES.find((s) => s.prompt === style);
  if (preset) return loc(preset.label, lang);
  return style.length > 50 ? style.slice(0, 50) + "…" : style;
}

function getVersionLabel(version: string, t: TFunction): string {
  switch (version) {
    case "original": return t("audioPage.versionOriginal");
    case "completed": return t("audioPage.versionCompleted");
    case "interpreted": return t("audioPage.versionInterpreted");
    default: return version;
  }
}

function getPagesLabel(pages: number[] | "all", t: TFunction): string {
  if (pages === "all") return t("audioPage.pagesAll");
  if (Array.isArray(pages) && pages.length === 1) return t("audioPage.pageSingle", { page: pages[0] });
  if (Array.isArray(pages)) return t("audioPage.pagesCount", { count: pages.length });
  return "";
}

export default function AudioPage() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"audios" | "playlists">("audios");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deletePlaylistId, setDeletePlaylistId] = useState<number | null>(null);
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [selectedAudioIds, setSelectedAudioIds] = useState<Set<number>>(new Set());
  const [orderedSelectedIds, setOrderedSelectedIds] = useState<number[]>([]);
  const [activePlaylist, setActivePlaylist] = useState<PlaylistDetail | null>(null);

  const { data: audioData, isLoading: audiosLoading } = useQuery<{ generations: AudioGeneration[] }>({
    queryKey: ["/api/audio"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/audio");
      return res.json();
    },
  });

  const { data: playlistsData, isLoading: playlistsLoading } = useQuery<PlaylistSummary[]>({
    queryKey: ["/api/playlists"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/playlists");
      return res.json();
    },
  });

  const generations = audioData?.generations ?? [];
  const playlistsList = playlistsData ?? [];

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/audio/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/audio"] });
      toast({ title: t("audioPage.toastDeletedTitle"), description: t("audioPage.toastAudioDeletedBody") });
      setDeleteId(null);
    },
    onError: (error: Error) => {
      toast({ title: t("audioPage.toastErrorTitle"), description: error.message, variant: "destructive" });
      setDeleteId(null);
    },
  });

  const createPlaylistMutation = useMutation({
    mutationFn: async ({ name, ttsIds }: { name: string; ttsIds: number[] }) => {
      const res = await apiRequest("POST", "/api/playlists", { name, ttsIds });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/playlists"] });
      toast({ title: t("audioPage.toastCreatedTitle"), description: t("audioPage.toastPlaylistCreatedBody") });
      setShowCreatePlaylist(false);
      setNewPlaylistName("");
      setSelectedAudioIds(new Set());
      setTab("playlists");
    },
    onError: (error: Error) => {
      toast({ title: t("audioPage.toastErrorTitle"), description: error.message, variant: "destructive" });
    },
  });

  const deletePlaylistMutation = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/playlists/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/playlists"] });
      toast({ title: t("audioPage.toastDeletedTitle"), description: t("audioPage.toastPlaylistDeletedBody") });
      setDeletePlaylistId(null);
      if (activePlaylist?.id === deletePlaylistId) setActivePlaylist(null);
    },
  });

  const savePositionMutation = useMutation({
    mutationFn: async ({ id, lastPosition }: { id: number; lastPosition: { trackIndex: number; time: number } }) => {
      await apiRequest("PATCH", `/api/playlists/${id}`, { lastPosition });
    },
  });

  const toggleAudioSelection = useCallback((id: number) => {
    setSelectedAudioIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const openPlaylist = useCallback(async (playlistId: number) => {
    try {
      const res = await apiRequest("GET", `/api/playlists/${playlistId}`);
      const detail: PlaylistDetail = await res.json();
      setActivePlaylist(detail);
    } catch {
      toast({ title: t("audioPage.toastErrorTitle"), description: t("audioPage.toastPlaylistLoadFailed"), variant: "destructive" });
    }
  }, [toast, t]);

  const playerTracks: PlaylistTrack[] = useMemo(() => {
    if (!activePlaylist) return [];
    return activePlaylist.items
      .filter((i) => i.audioUrl)
      .map((i) => ({
        id: i.ttsGenerationId,
        audioUrl: i.audioUrl!,
        voice: i.voice,
        style: i.style,
        lang: i.lang,
        textSnippet: i.textSnippet,
      }));
  }, [activePlaylist]);

  const handlePositionChange = useCallback((trackIndex: number, time: number) => {
    if (activePlaylist) {
      savePositionMutation.mutate({ id: activePlaylist.id, lastPosition: { trackIndex, time } });
    }
  }, [activePlaylist, savePositionMutation]);

  const playAllAsPlaylist = useCallback(() => {
    const tracks: PlaylistTrack[] = generations
      .filter((g) => g.audioUrl)
      .map((g) => ({
        id: g.id,
        audioUrl: g.audioUrl!,
        voice: g.voice,
        style: g.style,
        lang: g.lang,
        textSnippet: g.textSnippet,
      }));
    if (tracks.length === 0) return;
    setActivePlaylist({
      id: 0,
      name: t("audioPage.allAudios"),
      itemCount: tracks.length,
      createdAt: "",
      updatedAt: "",
      lastPosition: null,
      items: generations.filter((g) => g.audioUrl).map((g, idx) => ({
        id: idx,
        ttsGenerationId: g.id,
        sortOrder: idx,
        voice: g.voice,
        style: g.style,
        lang: g.lang,
        version: g.version,
        pages: g.pages,
        audioUrl: g.audioUrl,
        textSnippet: g.textSnippet,
      })),
    });
  }, [generations, t]);

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4" data-tour="audio-page-header">
        <div>
          <h1 className="font-serif text-2xl font-bold flex items-center gap-2">
            <Headphones className="h-6 w-6" />
            {t("audioPage.pageTitle")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("audioPage.pageSubtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {generations.length > 0 && (
            <Button variant="outline" size="sm" onClick={playAllAsPlaylist}>
              <Play className="h-3.5 w-3.5 mr-1.5" />
              {t("audioPage.playAll")}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => {
            if (generations.length > 0) {
              const ids = generations.map((g) => g.id);
              setSelectedAudioIds(new Set(ids));
              setOrderedSelectedIds(ids);
              setNewPlaylistName("");
              setShowCreatePlaylist(true);
            } else {
              toast({ title: t("audioPage.toastNoAudiosTitle"), description: t("audioPage.toastNoAudiosBody") });
            }
          }}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            {t("audioPage.newPlaylist")}
          </Button>
        </div>
      </div>

      {/* Player */}
      {activePlaylist && playerTracks.length > 0 && (
        <AudiobookPlayer
          tracks={playerTracks}
          playlistName={activePlaylist.name}
          initialTrackIndex={activePlaylist.lastPosition?.trackIndex ?? 0}
          initialTime={activePlaylist.lastPosition?.time ?? 0}
          onPositionChange={activePlaylist.id > 0 ? handlePositionChange : undefined}
          onClose={() => setActivePlaylist(null)}
        />
      )}

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="audios" className="gap-1.5">
            <Volume2 className="h-3.5 w-3.5" />
            {t("audioPage.tabAudios", { count: generations.length })}
          </TabsTrigger>
          <TabsTrigger value="playlists" className="gap-1.5">
            <ListMusic className="h-3.5 w-3.5" />
            {t("audioPage.tabPlaylists", { count: playlistsList.length })}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Audios tab */}
      {tab === "audios" && (
        <>
          {audiosLoading && (
            <div className="grid sm:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-44 rounded-lg" />)}
            </div>
          )}

          {!audiosLoading && generations.length === 0 && (
            <Card className="p-10 text-center">
              <Headphones className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
              <h3 className="font-serif text-lg font-semibold mb-2">{t("audioPage.emptyAudiosTitle")}</h3>
              <p className="text-sm text-muted-foreground mb-2 max-w-md mx-auto">
                {t("audioPage.emptyAudiosBody")}
              </p>
              <p className="text-xs text-muted-foreground/60 mb-5">{t("audioPage.emptyAudiosHint")}</p>
              <Link href="/app">
                <Button>
                  {t("audioPage.createFirstAudio")}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </Card>
          )}

          {!audiosLoading && generations.length > 0 && (
            <>
              {selectedAudioIds.size > 0 && (
                <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-4 py-2.5">
                  <span className="text-sm">
                    {t("audioPage.selectedCount", { count: selectedAudioIds.size })}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setSelectedAudioIds(new Set())}>
                      {t("audioPage.clearSelection")}
                    </Button>
                    <Button size="sm" onClick={() => {
                      setOrderedSelectedIds(Array.from(selectedAudioIds));
                      setNewPlaylistName("");
                      setShowCreatePlaylist(true);
                    }}>
                      <ListMusic className="h-3.5 w-3.5 mr-1.5" />
                      {t("audioPage.createPlaylist")}
                    </Button>
                  </div>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-4">
                {generations.map((gen) => {
                  const voiceInfo = getVoiceLabel(gen.voice);
                  const styleLabel = getStyleLabel(gen.style, t, i18n.language);
                  const versionLabel = getVersionLabel(gen.version, t);
                  const pagesLabel = getPagesLabel(gen.pages, t);
                  const date = new Date(gen.createdAt).toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" });
                  const isSelected = selectedAudioIds.has(gen.id);

                  return (
                    <Card key={gen.id} className={`p-4 flex flex-col gap-3 ${isSelected ? "ring-2 ring-primary" : ""}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleAudioSelection(gen.id)}
                            className="shrink-0"
                          />
                          <div className={`p-2 rounded-full shrink-0 ${voiceInfo.gender === "Weiblich" ? "bg-pink-100 dark:bg-pink-900/30" : "bg-blue-100 dark:bg-blue-900/30"}`}>
                            <User2 className={`h-4 w-4 ${voiceInfo.gender === "Weiblich" ? "text-pink-600 dark:text-pink-400" : "text-blue-600 dark:text-blue-400"}`} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm">{voiceInfo.label}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Volume2 className="h-3 w-3 shrink-0" />
                              {styleLabel}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          {gen.audioUrl && (
                            <Button size="icon" variant="ghost" className="h-7 w-7" asChild>
                              <a href={gen.audioUrl} download><Download className="h-3.5 w-3.5" /></a>
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setDeleteId(gen.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      {gen.textSnippet && (
                        <p className="text-xs text-muted-foreground line-clamp-2 flex items-start gap-1.5">
                          <FileText className="h-3 w-3 shrink-0 mt-0.5" />
                          <span>{gen.textSnippet}</span>
                        </p>
                      )}

                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
                        <Badge variant="secondary" className="text-[10px]">{pagesLabel}</Badge>
                        <Badge variant="outline" className="text-[10px]">{versionLabel}</Badge>
                        {gen.lang !== "de" && <Badge variant="outline" className="text-[10px]">{gen.lang.toUpperCase()}</Badge>}
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {gen.audioUrl ? <AudioDuration src={gen.audioUrl} /> : "--:--"}
                        </span>
                        <span>{date}</span>
                      </div>

                      {gen.audioUrl && (
                        <audio controls className="w-full h-9" src={gen.audioUrl} preload="metadata" />
                      )}
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      {/* Playlists tab */}
      {tab === "playlists" && (
        <>
          {playlistsLoading && (
            <div className="space-y-3">
              {[1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
            </div>
          )}

          {!playlistsLoading && playlistsList.length === 0 && (
            <Card className="p-10 text-center">
              <ListMusic className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
              <h3 className="font-serif text-lg font-semibold mb-2">{t("audioPage.emptyPlaylistsTitle")}</h3>
              <p className="text-sm text-muted-foreground mb-5 max-w-md mx-auto">
                {t("audioPage.emptyPlaylistsBody")}
              </p>
              {generations.length > 0 ? (
                <Button onClick={() => { setTab("audios"); toast({ title: t("audioPage.toastTipTitle"), description: t("audioPage.toastTipBody") }); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t("audioPage.createPlaylist")}
                </Button>
              ) : (
                <Link href="/app">
                  <Button>
                    {t("audioPage.createAudiosFirst")}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              )}
            </Card>
          )}

          {!playlistsLoading && playlistsList.length > 0 && (
            <div className="space-y-3">
              {playlistsList.map((pl) => {
                const date = new Date(pl.updatedAt || pl.createdAt).toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" });
                return (
                  <Card key={pl.id} className="p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center justify-between gap-3">
                      <button className="flex items-center gap-3 min-w-0 flex-1 text-left" onClick={() => openPlaylist(pl.id)}>
                        <div className="p-2.5 rounded-lg bg-primary/10 shrink-0">
                          <ListMusic className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm">{pl.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {t("audioPage.trackCount", { count: pl.itemCount })} · {date}
                            {pl.lastPosition && ` · ${t("audioPage.progressSaved")}`}
                          </p>
                        </div>
                      </button>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button size="sm" variant="ghost" className="h-8" onClick={() => openPlaylist(pl.id)}>
                          <Play className="h-3.5 w-3.5 mr-1" />
                          {t("audioPage.play")}
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setDeletePlaylistId(pl.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Create playlist dialog */}
      <Dialog open={showCreatePlaylist} onOpenChange={setShowCreatePlaylist}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif">{t("audioPage.createPlaylistDialogTitle")}</DialogTitle>
            <DialogDescription>
              {t("audioPage.createPlaylistDialogDesc", { count: orderedSelectedIds.length })}
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder={t("audioPage.playlistNamePlaceholder")}
            value={newPlaylistName}
            onChange={(e) => setNewPlaylistName(e.target.value)}
            autoFocus
          />
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {orderedSelectedIds.map((id, idx) => {
              const gen = generations.find((g) => g.id === id);
              if (!gen) return null;
              const voiceInfo = getVoiceLabel(gen.voice);
              return (
                <div key={id} className="flex items-center gap-2 rounded-md border px-3 py-2">
                  <span className="text-xs text-muted-foreground w-5 text-right shrink-0">{idx + 1}</span>
                  <div className={`p-1 rounded-full shrink-0 ${voiceInfo.gender === "Weiblich" ? "bg-pink-100 dark:bg-pink-900/30" : "bg-blue-100 dark:bg-blue-900/30"}`}>
                    <User2 className={`h-3 w-3 ${voiceInfo.gender === "Weiblich" ? "text-pink-600 dark:text-pink-400" : "text-blue-600 dark:text-blue-400"}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{gen.textSnippet || voiceInfo.label}</p>
                    <p className="text-[10px] text-muted-foreground">{voiceInfo.label}{gen.lang !== "de" ? ` · ${gen.lang.toUpperCase()}` : ""}</p>
                  </div>
                  <div className="flex gap-0.5 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      disabled={idx === 0}
                      onClick={() => setOrderedSelectedIds((prev) => {
                        const next = [...prev];
                        [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                        return next;
                      })}
                    >
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      disabled={idx === orderedSelectedIds.length - 1}
                      onClick={() => setOrderedSelectedIds((prev) => {
                        const next = [...prev];
                        [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
                        return next;
                      })}
                    >
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreatePlaylist(false)}>{t("common.cancel")}</Button>
            <Button
              disabled={createPlaylistMutation.isPending || orderedSelectedIds.length === 0}
              onClick={() => createPlaylistMutation.mutate({
                name: newPlaylistName.trim() || t("audioPage.defaultPlaylistName"),
                ttsIds: orderedSelectedIds,
              })}
            >
              {t("audioPage.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete audio dialog */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("audioPage.deleteAudioTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("audioPage.deleteAudioBody")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId !== null && deleteMutation.mutate(deleteId)}
            >
              {t("audioPage.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete playlist dialog */}
      <AlertDialog open={deletePlaylistId !== null} onOpenChange={(open) => !open && setDeletePlaylistId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("audioPage.deletePlaylistTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("audioPage.deletePlaylistBody")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deletePlaylistId !== null && deletePlaylistMutation.mutate(deletePlaylistId)}
            >
              {t("audioPage.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
