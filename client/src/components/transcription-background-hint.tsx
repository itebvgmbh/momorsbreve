import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export function TranscriptionBackgroundHint({ className }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <p className={cn("text-xs text-muted-foreground mt-2", className)}>
      {t("bgHint.message")}
    </p>
  );
}
