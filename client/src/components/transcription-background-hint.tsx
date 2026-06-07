import { cn } from "@/lib/utils";

export function TranscriptionBackgroundHint({ className }: { className?: string }) {
  return (
    <p className={cn("text-xs text-muted-foreground mt-2", className)}>
      Die Transkription läuft im Hintergrund. Sie können diese Seite verlassen und später
      zurückkehren – Ihr Fortschritt ist im Dashboard jederzeit abrufbar.
    </p>
  );
}
