import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Star,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  XCircle,
  Sparkles,
  Lightbulb,
  FileText,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface QualityDetails {
  readability: number;
  confidence: number;
  issues: string[];
  recommendation: string;
  contentSummary?: string;
  level: "green" | "yellow" | "red";
  optimizationTips?: string[];
}

export function QualityIndicator({ quality, deepAnalysis }: { quality: QualityDetails; deepAnalysis?: boolean }) {
  const [hinweiseOpen, setHinweiseOpen] = useState(false);
  const tips = deepAnalysis ? (quality.optimizationTips?.filter(Boolean) ?? []) : [];
  const [tippsOpen, setTippsOpen] = useState(() => tips.length > 0);
  const colorMap = {
    green: {
      bg: "bg-emerald-100 dark:bg-emerald-900/30",
      text: "text-emerald-700 dark:text-emerald-400",
      icon: CheckCircle2,
      label: "Gut lesbar",
    },
    yellow: {
      bg: "bg-amber-100 dark:bg-amber-900/30",
      text: "text-amber-700 dark:text-amber-400",
      icon: AlertTriangle,
      label: "Teilweise lesbar",
    },
    red: {
      bg: "bg-red-100 dark:bg-red-900/30",
      text: "text-red-700 dark:text-red-400",
      icon: XCircle,
      label: "Sehr schwer lesbar – Ergebnis kann eingeschränkt sein",
    },
  };

  const config = colorMap[quality.level];
  const Icon = config.icon;

  return (
    <Card className="p-4 sm:p-5 space-y-4">
      <div className="flex items-start sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <div className={`p-2 rounded-md ${config.bg} shrink-0`}>
            <Icon className={`h-5 w-5 ${config.text}`} />
          </div>
          <div className="min-w-0">
            <h3 className="font-serif font-semibold text-sm sm:text-base">{config.label}</h3>
            <p className="text-xs text-muted-foreground">{quality.recommendation}</p>
          </div>
        </div>
        {deepAnalysis && (
          <Badge variant="secondary" className="gap-1 text-xs shrink-0 hidden sm:inline-flex">
            <Sparkles className="h-3 w-3" />
            KI-Tiefenanalyse
          </Badge>
        )}
      </div>

      {quality.contentSummary && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/50 border border-border/50">
          <FileText className="h-4 w-4 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-sm italic text-foreground/80">{quality.contentSummary}</p>
        </div>
      )}

      <div className="space-y-3">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm">Wie gut lesbar ist die Vorlage?</span>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`h-3.5 w-3.5 ${
                    s <= quality.readability
                      ? "text-amber-500 fill-amber-500"
                      : "text-muted-foreground/30"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm">Sicherheit der Erkennung</span>
            <span className="text-sm font-medium">{quality.confidence}%</span>
          </div>
          <Progress value={quality.confidence} className="h-2" />
        </div>

        {quality.issues.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setHinweiseOpen((v) => !v)}
              className="flex items-center gap-1.5 text-sm font-medium hover:text-foreground transition-colors w-full"
            >
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${hinweiseOpen ? "rotate-0" : "-rotate-90"}`} />
              Hinweise ({quality.issues.length})
            </button>
            {hinweiseOpen && (
              <div className="space-y-1 mt-2 ml-5.5 pl-1">
                {quality.issues.map((issue, idx) => (
                  <p key={idx} className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                    {issue}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {tips.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setTippsOpen((v) => !v)}
              className="flex items-center gap-1.5 text-sm font-medium hover:text-foreground transition-colors w-full"
            >
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${tippsOpen ? "rotate-0" : "-rotate-90"}`} />
              <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
              Tipps für ein besseres Ergebnis ({tips.length})
            </button>
            {tippsOpen && (
              <div className="space-y-1.5 mt-2 ml-5.5 pl-1">
                {tips.map((tip, idx) => (
                  <p key={idx} className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <span className="text-amber-500 font-medium mt-0.5 shrink-0">💡</span>
                    {tip}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
