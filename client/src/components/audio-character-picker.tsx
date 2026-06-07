import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  TTS_CHARACTERS,
  TTS_CHARACTER_STYLES,
  previewAudioUrl,
  type TtsCharacter,
  type TtsCharacterStyle,
} from "@/lib/tts-constants";
import { Pause, Play, User, Volume2 } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AudioCharacterPickerProps {
  selectedVoice: string;
  selectedStyle: string;
  onSelect: (voice: string, stylePrompt: string) => void;
  /** Compact mode for landing page (no header, tighter spacing) */
  compact?: boolean;
  className?: string;
}

// ---------------------------------------------------------------------------
// Hook: single shared <audio> element, only one sound at a time
// ---------------------------------------------------------------------------

function usePreviewPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = new Audio();
    el.preload = "none";
    audioRef.current = el;

    const onEnded = () => {
      setPlayingKey(null);
      setProgress(0);
    };
    const onTimeUpdate = () => {
      if (el.duration) setProgress(el.currentTime / el.duration);
    };
    el.addEventListener("ended", onEnded);
    el.addEventListener("timeupdate", onTimeUpdate);

    return () => {
      el.removeEventListener("ended", onEnded);
      el.removeEventListener("timeupdate", onTimeUpdate);
      el.pause();
    };
  }, []);

  const toggle = useCallback(
    (voice: string, styleId: string) => {
      const key = `${voice}-${styleId}`;
      const el = audioRef.current;
      if (!el) return;

      if (playingKey === key) {
        el.pause();
        setPlayingKey(null);
        setProgress(0);
        return;
      }

      el.pause();
      el.src = previewAudioUrl(voice, styleId);
      el.currentTime = 0;
      setProgress(0);
      setPlayingKey(key);
      el.play().catch(() => {
        setPlayingKey(null);
      });
    },
    [playingKey],
  );

  return { playingKey, progress, toggle };
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function CharacterCard({
  char,
  isSelected,
  onClick,
}: {
  char: TtsCharacter;
  isSelected: boolean;
  onClick: () => void;
}) {
  const isFemale = char.gender === "Weiblich";
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all",
        "hover:border-primary/50 hover:shadow-sm",
        isSelected
          ? "border-primary bg-primary/[0.06] shadow-sm ring-1 ring-primary/20"
          : "border-border bg-card",
      )}
    >
      <div className="flex w-full items-center justify-between gap-2">
        <span className="font-serif text-sm font-semibold leading-tight">
          {char.label}
        </span>
        <span
          className={cn(
            "flex h-5 w-5 items-center justify-center rounded-full text-[10px]",
            isFemale
              ? "bg-pink-100 text-pink-600 dark:bg-pink-950 dark:text-pink-400"
              : "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
          )}
        >
          <User className="h-3 w-3" />
        </span>
      </div>
      <span className="text-xs text-muted-foreground leading-snug">
        {char.description}
      </span>
      <span
        className={cn(
          "mt-0.5 text-[10px] font-medium uppercase tracking-wider",
          isFemale
            ? "text-pink-500 dark:text-pink-400"
            : "text-blue-500 dark:text-blue-400",
        )}
      >
        {char.gender}
      </span>
    </button>
  );
}

function StyleButton({
  style,
  isSelected,
  isPlaying,
  progress,
  onSelectAndPlay,
}: {
  style: TtsCharacterStyle;
  isSelected: boolean;
  isPlaying: boolean;
  progress: number;
  onSelectAndPlay: () => void;
}) {
  return (
    <div
      className={cn(
        "relative flex items-center gap-2 rounded-lg border px-3 py-2 transition-all cursor-pointer overflow-hidden",
        "hover:border-primary/50",
        isSelected
          ? "border-primary bg-primary/[0.06] ring-1 ring-primary/20"
          : "border-border bg-card",
      )}
      onClick={onSelectAndPlay}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelectAndPlay();
        }
      }}
    >
      {/* Progress bar background */}
      {isPlaying && (
        <div
          className="absolute inset-y-0 left-0 bg-primary/[0.08] transition-all duration-200"
          style={{ width: `${progress * 100}%` }}
        />
      )}

      <div
        className={cn(
          "relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors",
          isPlaying
            ? "bg-primary text-primary-foreground"
            : "bg-muted group-hover:bg-primary/20 text-muted-foreground group-hover:text-primary",
        )}
      >
        {isPlaying ? (
          <Pause className="h-3 w-3" />
        ) : (
          <Play className="h-3 w-3 ml-0.5" />
        )}
      </div>

      <span
        className={cn(
          "relative z-10 text-sm font-medium",
          isSelected ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {style.label}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function AudioCharacterPicker({
  selectedVoice,
  selectedStyle,
  onSelect,
  compact = false,
  className,
}: AudioCharacterPickerProps) {
  const { playingKey, progress, toggle } = usePreviewPlayer();

  const selectedStyleId =
    TTS_CHARACTER_STYLES.find((s) => s.prompt === selectedStyle)?.id ??
    TTS_CHARACTER_STYLES[0].id;

  const handleCharacterClick = (char: TtsCharacter) => {
    const currentStylePrompt =
      TTS_CHARACTER_STYLES.find((s) => s.id === selectedStyleId)?.prompt ??
      TTS_CHARACTER_STYLES[0].prompt;
    onSelect(char.voice, currentStylePrompt);
  };

  const handleStyleSelectAndPlay = (style: TtsCharacterStyle) => {
    const voice = selectedVoice || TTS_CHARACTERS[0].voice;
    onSelect(voice, style.prompt);
    toggle(voice.toLowerCase(), style.id);
  };

  return (
    <div className={cn("space-y-4", className)}>
      {!compact && (
        <div className="flex items-center gap-2">
          <Volume2 className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium text-muted-foreground">
            Stimme wählen
          </span>
        </div>
      )}

      {/* Character grid */}
      <div className={cn("grid grid-cols-2 sm:grid-cols-3 gap-2", !compact && "lg:grid-cols-6")}>
        {TTS_CHARACTERS.map((char) => (
          <CharacterCard
            key={char.voice}
            char={char}
            isSelected={selectedVoice === char.voice}
            onClick={() => handleCharacterClick(char)}
          />
        ))}
      </div>

      {/* Style selection with play buttons */}
      {selectedVoice && (
        <div className="space-y-2">
          {!compact && (
            <span className="text-xs font-medium text-muted-foreground">
              Vorlesestil wählen
            </span>
          )}
          <div className={cn("grid grid-cols-2 gap-2", !compact && "lg:grid-cols-4")}>
            {TTS_CHARACTER_STYLES.map((style) => {
              const key = `${selectedVoice.toLowerCase()}-${style.id}`;
              return (
                <StyleButton
                  key={style.id}
                  style={style}
                  isSelected={selectedStyleId === style.id}
                  isPlaying={playingKey === key}
                  progress={playingKey === key ? progress : 0}
                  onSelectAndPlay={() => handleStyleSelectAndPlay(style)}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
