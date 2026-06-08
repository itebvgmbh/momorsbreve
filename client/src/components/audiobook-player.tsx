import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  RotateCw,
  Moon,
  X,
  ChevronDown,
  Volume2,
} from "lucide-react";
import { TTS_CHARACTERS, TTS_CHARACTER_STYLES, TTS_VOICES } from "@/lib/tts-constants";

export interface PlaylistTrack {
  id: number;
  audioUrl: string;
  voice: string;
  style: string | null;
  lang: string;
  textSnippet: string | null;
}

interface AudiobookPlayerProps {
  tracks: PlaylistTrack[];
  playlistName: string;
  initialTrackIndex?: number;
  initialTime?: number;
  onPositionChange?: (trackIndex: number, time: number) => void;
  onClose?: () => void;
}

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const SLEEP_OPTIONS = [
  { labelKey: "audiobook.sleep15", minutes: 15 },
  { labelKey: "audiobook.sleep30", minutes: 30 },
  { labelKey: "audiobook.sleep45", minutes: 45 },
  { labelKey: "audiobook.sleep60", minutes: 60 },
  { labelKey: "audiobook.sleepEndOfTrack", minutes: -1 },
];

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function getVoiceLabel(voice: string): string {
  const char = TTS_CHARACTERS.find((c) => c.voice === voice);
  if (char) return char.label;
  const v = TTS_VOICES.find((v) => v.name === voice);
  return v?.name ?? voice;
}

function getStyleLabel(style: string | null): string {
  if (!style) return "";
  const preset = TTS_CHARACTER_STYLES.find((s) => s.prompt === style);
  return preset?.label ?? "";
}

export function AudiobookPlayer({
  tracks,
  playlistName,
  initialTrackIndex = 0,
  initialTime = 0,
  onPositionChange,
  onClose,
}: AudiobookPlayerProps) {
  const { t } = useTranslation();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTrack, setCurrentTrack] = useState(Math.min(initialTrackIndex, tracks.length - 1));
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(initialTime);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [sleepTimer, setSleepTimer] = useState<number | null>(null);
  const [sleepEndOfTrack, setSleepEndOfTrack] = useState(false);
  const [sleepRemaining, setSleepRemaining] = useState<number | null>(null);
  const [showTrackList, setShowTrackList] = useState(false);
  const positionReportRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const track = tracks[currentTrack];

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onDurationChange = () => { if (isFinite(audio.duration)) setDuration(audio.duration); };
    const onEnded = () => {
      if (sleepEndOfTrack) {
        setIsPlaying(false);
        setSleepEndOfTrack(false);
        setSleepRemaining(null);
        return;
      }
      if (currentTrack < tracks.length - 1) {
        setCurrentTrack((prev) => prev + 1);
      } else {
        setIsPlaying(false);
      }
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("durationchange", onDurationChange);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.pause();
      audio.src = "";
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !track?.audioUrl) return;
    const wasPlaying = isPlaying;
    audio.src = track.audioUrl;
    audio.playbackRate = speed;
    audio.load();
    setCurrentTime(0);
    setDuration(0);
    if (wasPlaying) {
      audio.play().catch(() => {});
    }
  }, [currentTrack, track?.audioUrl]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [speed]);

  useEffect(() => {
    if (positionReportRef.current) clearTimeout(positionReportRef.current);
    positionReportRef.current = setTimeout(() => {
      onPositionChange?.(currentTrack, currentTime);
    }, 2000);
  }, [currentTrack, currentTime, onPositionChange]);

  useEffect(() => {
    if (sleepTimer === null) { setSleepRemaining(null); return; }
    setSleepRemaining(sleepTimer * 60);
    const interval = setInterval(() => {
      setSleepRemaining((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          fadeOutAndPause();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [sleepTimer]);

  const fadeOutAndPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    let vol = audio.volume;
    if (fadeRef.current) clearInterval(fadeRef.current);
    fadeRef.current = setInterval(() => {
      vol -= 0.05;
      if (vol <= 0) {
        audio.pause();
        audio.volume = 1;
        if (fadeRef.current) clearInterval(fadeRef.current);
        setSleepTimer(null);
        setSleepEndOfTrack(false);
        setSleepRemaining(null);
      } else {
        audio.volume = vol;
      }
    }, 100);
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(() => {});
    }
  }, [isPlaying]);

  const skipForward = useCallback(() => {
    if (audioRef.current) audioRef.current.currentTime = Math.min(audioRef.current.currentTime + 15, duration);
  }, [duration]);

  const skipBackward = useCallback(() => {
    if (audioRef.current) audioRef.current.currentTime = Math.max(audioRef.current.currentTime - 15, 0);
  }, []);

  const nextTrack = useCallback(() => {
    if (currentTrack < tracks.length - 1) setCurrentTrack((prev) => prev + 1);
  }, [currentTrack, tracks.length]);

  const prevTrack = useCallback(() => {
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
    } else if (currentTrack > 0) {
      setCurrentTrack((prev) => prev - 1);
    }
  }, [currentTrack]);

  const seek = useCallback((value: number[]) => {
    if (audioRef.current && isFinite(value[0])) {
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  }, []);

  const setSleepOption = useCallback((minutes: number) => {
    if (minutes === -1) {
      setSleepEndOfTrack(true);
      setSleepTimer(null);
      setSleepRemaining(null);
    } else {
      setSleepEndOfTrack(false);
      setSleepTimer(minutes);
    }
  }, []);

  const clearSleep = useCallback(() => {
    setSleepTimer(null);
    setSleepEndOfTrack(false);
    setSleepRemaining(null);
  }, []);

  if (!track) return null;

  const voiceLabel = getVoiceLabel(track.voice);
  const styleLabel = getStyleLabel(track.style);

  return (
    <div className="rounded-lg border bg-card shadow-lg">
      {/* Track info + track list toggle */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between gap-2 mb-1">
          <button
            className="flex items-center gap-1.5 text-left min-w-0 hover:text-primary transition-colors"
            onClick={() => setShowTrackList(!showTrackList)}
          >
            <span className="font-serif font-semibold text-sm truncate">{playlistName}</span>
            <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${showTrackList ? "rotate-180" : ""}`} />
          </button>
          <div className="flex items-center gap-1 shrink-0">
            {(sleepRemaining !== null || sleepEndOfTrack) && (
              <Badge variant="secondary" className="text-[10px] gap-1 cursor-pointer" onClick={clearSleep}>
                <Moon className="h-3 w-3" />
                {sleepEndOfTrack ? t("audiobook.endTrackBadge") : formatTime(sleepRemaining!)}
                <X className="h-2.5 w-2.5" />
              </Badge>
            )}
            {onClose && (
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onClose}>
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground truncate">
          <span className="font-medium">{voiceLabel}</span>
          {styleLabel && ` · ${styleLabel}`}
          {track.lang !== "de" && ` · ${track.lang.toUpperCase()}`}
          {` · ${t("audiobook.trackCounter", { current: currentTrack + 1, total: tracks.length })}`}
        </p>
        {track.textSnippet && (
          <p className="text-[11px] text-muted-foreground/70 truncate mt-0.5">{track.textSnippet}</p>
        )}
      </div>

      {/* Track list (collapsible) */}
      {showTrackList && (
        <div className="px-4 pb-2 max-h-48 overflow-y-auto border-t">
          {tracks.map((t, idx) => (
            <button
              key={t.id}
              className={`w-full text-left px-2 py-1.5 rounded text-xs flex items-center gap-2 hover:bg-muted/50 transition-colors ${idx === currentTrack ? "bg-primary/10 font-medium" : ""}`}
              onClick={() => setCurrentTrack(idx)}
            >
              <span className="w-5 text-right text-muted-foreground shrink-0">{idx + 1}</span>
              <span className="truncate flex-1">{t.textSnippet || getVoiceLabel(t.voice)}</span>
              {t.lang !== "de" && <Badge variant="outline" className="text-[9px] px-1 py-0">{t.lang}</Badge>}
            </button>
          ))}
        </div>
      )}

      {/* Progress */}
      <div className="px-4 pt-2">
        <Slider
          value={[currentTime]}
          min={0}
          max={duration || 1}
          step={0.5}
          onValueChange={seek}
          className="w-full"
        />
        <div className="flex items-center justify-between text-[11px] text-muted-foreground tabular-nums mt-1">
          <span>{formatTime(currentTime)}</span>
          <span>-{formatTime(Math.max(0, duration - currentTime))}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-1 px-2 sm:px-4 pb-4 pt-1">
        {/* Speed */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-10 sm:h-8 text-xs px-2 tabular-nums shrink-0">
              {speed}x
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {SPEED_OPTIONS.map((s) => (
              <DropdownMenuItem key={s} onClick={() => setSpeed(s)} className={s === speed ? "font-bold" : ""}>
                {s}x
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Main controls */}
        <div className="flex items-center gap-0.5 sm:gap-1">
          <Button size="icon" variant="ghost" className="h-11 w-11 sm:h-9 sm:w-9" onClick={prevTrack} title={t("audiobook.prevTrack")}>
            <SkipBack className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" className="h-11 w-11 sm:h-9 sm:w-9" onClick={skipBackward} title={t("audiobook.skipBack15")}>
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            className="h-14 w-14 sm:h-12 sm:w-12 rounded-full"
            onClick={togglePlay}
          >
            {isPlaying ? <Pause className="h-6 w-6 sm:h-5 sm:w-5" /> : <Play className="h-6 w-6 sm:h-5 sm:w-5 ml-0.5" />}
          </Button>
          <Button size="icon" variant="ghost" className="h-11 w-11 sm:h-9 sm:w-9" onClick={skipForward} title={t("audiobook.skipForward15")}>
            <RotateCw className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" className="h-11 w-11 sm:h-9 sm:w-9" onClick={nextTrack} disabled={currentTrack >= tracks.length - 1} title={t("audiobook.nextTrack")}>
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>

        {/* Sleep timer */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-8 sm:w-8 shrink-0" title={t("audiobook.sleepTimer")}>
              <Moon className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {SLEEP_OPTIONS.map((opt) => (
              <DropdownMenuItem key={opt.minutes} onClick={() => setSleepOption(opt.minutes)}>
                {t(opt.labelKey)}
              </DropdownMenuItem>
            ))}
            {(sleepRemaining !== null || sleepEndOfTrack) && (
              <DropdownMenuItem onClick={clearSleep} className="text-destructive">
                {t("audiobook.disableTimer")}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
