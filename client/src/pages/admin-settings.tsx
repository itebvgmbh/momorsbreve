import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, AlertTriangle, Percent, ShieldAlert, FileText, Plus, Trash2, Volume2, ArrowUp, ArrowDown, Headphones } from "lucide-react";
import type { PromotionConfig } from "@shared/models/transcription";
import { getScriptTypeDisplayLabel } from "@shared/models/transcription";
import { TTS_CHARACTERS, TTS_CHARACTER_STYLES } from "@/lib/tts-constants";

type Provider = "anthropic" | "google";
type TtsTextVersion = "original" | "completed" | "interpreted";

interface ExampleDocConfig {
  jobId: number;
  title: string;
  description: string;
  source: string;
  ttsVersion: TtsTextVersion;
  audioUrl: string | null;
}

interface ExampleConfig {
  maxVisible: number;
  ttsVoice: string;
  ttsStyle: string;
  documents: ExampleDocConfig[];
}

interface CompletedJob {
  id: number;
  scriptType: string;
  translationLanguage: string | null;
  totalPages: number;
  createdAt: string;
  textSnippet: string | null;
}

function parseExampleConfig(settings: Record<string, unknown> | undefined): ExampleConfig {
  const raw = settings?.example_config;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { maxVisible: 3, ttsVoice: "Aoede", ttsStyle: "warm", documents: [] };
  }
  const o = raw as Record<string, unknown>;
  return {
    maxVisible: typeof o.maxVisible === "number" ? o.maxVisible : 3,
    ttsVoice: typeof o.ttsVoice === "string" ? o.ttsVoice : "Aoede",
    ttsStyle: typeof o.ttsStyle === "string" ? o.ttsStyle : "warm",
    documents: Array.isArray(o.documents)
      ? (o.documents as ExampleDocConfig[]).map((d) => ({
          jobId: d.jobId,
          title: d.title || "",
          description: d.description || "",
          source: d.source || "",
          ttsVersion: (d.ttsVersion as TtsTextVersion) || "interpreted",
          audioUrl: d.audioUrl || null,
        }))
      : [],
  };
}

const ANTHROPIC_MODELS = [
  { value: "claude-opus-4-6", label: "Claude Opus 4.6" },
  { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
  { value: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5" },
  { value: "claude-sonnet-4-5-20250929", label: "Claude Sonnet 4.5" },
  { value: "claude-opus-4-5-20251101", label: "Claude Opus 4.5" },
  { value: "claude-opus-4-1-20250805", label: "Claude Opus 4.1" },
  { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
  { value: "claude-opus-4-20250514", label: "Claude Opus 4" },
  { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet (Legacy)" },
  { value: "claude-3-haiku-20240307", label: "Claude 3 Haiku (veraltet)" },
] as const;

const GEMINI_MODELS = [
  { value: "gemini-3.5-flash", label: "Gemini 3.5 Flash" },
  { value: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro (Preview)" },
  { value: "gemini-3-flash-preview", label: "Gemini 3 Flash (Preview)" },
  { value: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash-Lite" },
  { value: "gemini-3.1-flash-lite-preview", label: "Gemini 3.1 Flash-Lite (Preview)" },
  { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { value: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash-Lite" },
] as const;

function getModelsForProvider(provider: Provider) {
  return provider === "google" ? GEMINI_MODELS : ANTHROPIC_MODELS;
}

const PACKAGE_BASE_PRICES_CENTS: Record<string, number> = { Starter: 1290, Standard: 3490, Premium: 7490 };

function parsePromotionFromSettings(settings: Record<string, unknown> | undefined): PromotionConfig | null {
  const raw = settings?.promotion_config;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const discounts = o.discounts as Record<string, unknown> | undefined;
  const isLegacySpringPromotion =
    o.enabled === true &&
    o.label === "Frühlingsrabatt" &&
    discounts?.Starter === 0.4 &&
    discounts?.Standard === 0.45 &&
    discounts?.Premium === 0.55;
  if (isLegacySpringPromotion) {
    return null;
  }
  return {
    enabled: typeof o.enabled === "boolean" ? o.enabled : false,
    label: typeof o.label === "string" ? o.label : "Aktion",
    endDate: (typeof o.endDate === "string" || o.endDate === null) ? o.endDate : null,
    discounts: o.discounts && typeof o.discounts === "object" && !Array.isArray(o.discounts)
      ? { Starter: 0, Standard: 0, Premium: 0, ...(o.discounts as Record<string, number>) }
      : { Starter: 0, Standard: 0, Premium: 0 },
  };
}

export default function AdminSettingsPage() {
  const { toast } = useToast();

  const { data: settings, isLoading } = useQuery<Record<string, unknown>>({
    queryKey: ["/api/admin/settings"],
  });

  const [provider, setProvider] = useState<Provider>("anthropic");
  const [model, setModel] = useState<string>("claude-opus-4-6");
  const [hasChanges, setHasChanges] = useState(false);

  const [fallbackEnabled, setFallbackEnabled] = useState(false);
  const [fallbackProvider, setFallbackProvider] = useState<Provider>("anthropic");
  const [fallbackModel, setFallbackModel] = useState<string>("claude-sonnet-4-20250514");
  const [fallbackHasChanges, setFallbackHasChanges] = useState(false);

  const [promotionEnabled, setPromotionEnabled] = useState(false);
  const [promotionLabel, setPromotionLabel] = useState("Aktion");
  const [discountStarter, setDiscountStarter] = useState(0);
  const [discountStandard, setDiscountStandard] = useState(0);
  const [discountPremium, setDiscountPremium] = useState(0);
  const [promotionHasChanges, setPromotionHasChanges] = useState(false);

  const [exampleConfig, setExampleConfig] = useState<ExampleConfig>({
    maxVisible: 3, ttsVoice: "Aoede", ttsStyle: "warm", documents: [],
  });
  const [exampleHasChanges, setExampleHasChanges] = useState(false);
  const [addJobId, setAddJobId] = useState("");
  const [generatingTtsFor, setGeneratingTtsFor] = useState<number | null>(null);

  const { data: completedJobs, isLoading: jobsLoading, error: jobsError } = useQuery<CompletedJob[]>({
    queryKey: ["/api/admin/completed-jobs"],
  });

  useEffect(() => {
    if (settings) {
      const p = (settings.transcription_provider as string) || "anthropic";
      const m = (settings.transcription_model as string) || "claude-opus-4-6";
      setProvider(p as Provider);
      setModel(m);
      setHasChanges(false);

      const fbEnabled = (settings.fallback_enabled as boolean) ?? false;
      const fbProvider = (settings.fallback_provider as string) || "anthropic";
      const fbModel = (settings.fallback_model as string) || "claude-sonnet-4-20250514";
      setFallbackEnabled(fbEnabled);
      setFallbackProvider(fbProvider as Provider);
      setFallbackModel(fbModel);
      setFallbackHasChanges(false);

      const promo = parsePromotionFromSettings(settings);
      if (promo) {
        setPromotionEnabled(promo.enabled);
        setPromotionLabel(promo.label);
        setDiscountStarter(Math.round((promo.discounts.Starter ?? 0) * 100));
        setDiscountStandard(Math.round((promo.discounts.Standard ?? 0) * 100));
        setDiscountPremium(Math.round((promo.discounts.Premium ?? 0) * 100));
        setPromotionHasChanges(false);
      }

      setExampleConfig(parseExampleConfig(settings));
      setExampleHasChanges(false);
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PUT", "/api/admin/settings", {
        transcription_provider: provider,
        transcription_model: model,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      toast({
        title: "Gespeichert",
        description: `Produktionsmodell auf ${provider === "google" ? "Gemini" : "Claude"} (${model}) umgestellt.`,
      });
      setHasChanges(false);
    },
    onError: () => {
      toast({
        title: "Fehler",
        description: "Einstellungen konnten nicht gespeichert werden.",
        variant: "destructive",
      });
    },
  });

  const saveFallbackMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PUT", "/api/admin/settings", {
        fallback_enabled: fallbackEnabled,
        fallback_provider: fallbackProvider,
        fallback_model: fallbackModel,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      toast({
        title: "Gespeichert",
        description: fallbackEnabled
          ? `Fallback auf ${fallbackProvider === "google" ? "Gemini" : "Claude"} (${fallbackModel}) aktiviert.`
          : "Fallback deaktiviert.",
      });
      setFallbackHasChanges(false);
    },
    onError: () => {
      toast({
        title: "Fehler",
        description: "Fallback-Einstellungen konnten nicht gespeichert werden.",
        variant: "destructive",
      });
    },
  });

  const savePromotionMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PUT", "/api/admin/settings", {
        promotion_config: {
          enabled: promotionEnabled,
          label: promotionLabel.trim() || "Aktion",
          endDate: null,
          discounts: {
            Starter: discountStarter / 100,
            Standard: discountStandard / 100,
            Premium: discountPremium / 100,
          },
        },
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/promotion"] });
      queryClient.invalidateQueries({ queryKey: ["/api/packages"] });
      toast({
        title: "Gespeichert",
        description: "Rabattaktion wurde aktualisiert.",
      });
      setPromotionHasChanges(false);
    },
    onError: () => {
      toast({
        title: "Fehler",
        description: "Rabatt-Einstellungen konnten nicht gespeichert werden.",
        variant: "destructive",
      });
    },
  });

  const saveExampleMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PUT", "/api/admin/settings", {
        example_config: exampleConfig,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/examples"] });
      toast({ title: "Gespeichert", description: "Beispiel-Konfiguration aktualisiert." });
      setExampleHasChanges(false);
    },
    onError: () => {
      toast({ title: "Fehler", description: "Beispiel-Konfiguration konnte nicht gespeichert werden.", variant: "destructive" });
    },
  });

  const generateTtsMutation = useMutation({
    mutationFn: async (jobId: number) => {
      setGeneratingTtsFor(jobId);
      const doc = exampleConfig.documents.find((d) => d.jobId === jobId);
      const styleObj = TTS_CHARACTER_STYLES.find((s) => s.id === exampleConfig.ttsStyle);
      const res = await apiRequest("POST", "/api/admin/examples/generate-tts", {
        jobId,
        voice: exampleConfig.ttsVoice,
        style: styleObj?.prompt || undefined,
        version: doc?.ttsVersion || "interpreted",
      });
      return res.json() as Promise<{ audioUrl: string }>;
    },
    onSuccess: (body, jobId) => {
      setExampleConfig((prev) => ({
        ...prev,
        documents: prev.documents.map((d) =>
          d.jobId === jobId ? { ...d, audioUrl: body.audioUrl } : d,
        ),
      }));
      setExampleHasChanges(true);
      setGeneratingTtsFor(null);
      toast({ title: "Audio generiert", description: "TTS-Audio wurde erstellt. Speichern, um anzuwenden." });
    },
    onError: (error: Error) => {
      setGeneratingTtsFor(null);
      toast({ title: "TTS-Fehler", description: error.message, variant: "destructive" });
    },
  });

  const addExampleDocById = (rawId: number | string) => {
    const id = typeof rawId === "number" ? rawId : parseInt(rawId, 10);
    if (!id || Number.isNaN(id) || exampleConfig.documents.some((d) => d.jobId === id)) return;
    const job = completedJobs?.find((j) => j.id === id);
    setExampleConfig((prev) => ({
      ...prev,
      documents: [
        ...prev.documents,
        {
          jobId: id,
          title: job ? `${getScriptTypeDisplayLabel(job.scriptType)} #${id}` : `Dokument #${id}`,
          description: "",
          source: "",
          ttsVersion: "interpreted" as TtsTextVersion,
          audioUrl: null,
        },
      ],
    }));
    setAddJobId("");
    setExampleHasChanges(true);
  };

  const removeExampleDoc = (jobId: number) => {
    setExampleConfig((prev) => ({
      ...prev,
      documents: prev.documents.filter((d) => d.jobId !== jobId),
    }));
    setExampleHasChanges(true);
  };

  const moveExampleDoc = (idx: number, dir: -1 | 1) => {
    setExampleConfig((prev) => {
      const docs = [...prev.documents];
      const target = idx + dir;
      if (target < 0 || target >= docs.length) return prev;
      [docs[idx], docs[target]] = [docs[target], docs[idx]];
      return { ...prev, documents: docs };
    });
    setExampleHasChanges(true);
  };

  const updateExampleDoc = (jobId: number, field: "title" | "description" | "source" | "ttsVersion", value: string) => {
    setExampleConfig((prev) => ({
      ...prev,
      documents: prev.documents.map((d) =>
        d.jobId === jobId ? { ...d, [field]: value } : d,
      ),
    }));
    setExampleHasChanges(true);
  };

  const handleProviderChange = (v: string) => {
    const newProvider = v as Provider;
    setProvider(newProvider);
    const models = getModelsForProvider(newProvider);
    setModel(models[0].value);
    setHasChanges(true);
  };

  const handleModelChange = (v: string) => {
    setModel(v);
    setHasChanges(true);
  };

  const handleFallbackProviderChange = (v: string) => {
    const newProvider = v as Provider;
    setFallbackProvider(newProvider);
    const models = getModelsForProvider(newProvider);
    setFallbackModel(models[0].value);
    setFallbackHasChanges(true);
  };

  const handleFallbackModelChange = (v: string) => {
    setFallbackModel(v);
    setFallbackHasChanges(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const currentProvider = (settings?.transcription_provider as string) || "anthropic";
  const currentModel = (settings?.transcription_model as string) || "claude-opus-4-6";

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin-Einstellungen</h1>
        <p className="text-muted-foreground mt-1">
          Konfiguration für die Produktionsumgebung
        </p>
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-1">Transkriptions-Modell</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Das hier eingestellte Modell wird für alle neuen Transkriptionen in der Produktionsumgebung verwendet.
        </p>

        <div className="flex items-center gap-2 mb-6">
          <span className="text-sm text-muted-foreground">Aktuell aktiv:</span>
          <Badge variant="outline">
            {currentProvider === "google" ? "Gemini" : "Claude"}
          </Badge>
          <Badge variant="secondary" className="font-mono text-xs">
            {currentModel}
          </Badge>
        </div>

        <div className="space-y-4">
          <div>
            <Label>Provider</Label>
            <Select value={provider} onValueChange={handleProviderChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                <SelectItem value="google">Google (Gemini)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Modell</Label>
            <Select value={model} onValueChange={handleModelChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {getModelsForProvider(provider).map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {provider === "google" && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-amber-500/10 border border-amber-500/20">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-sm text-amber-700 dark:text-amber-400">
                Gemini-Modelle wurden noch nicht ausreichend getestet. Stelle sicher, dass die Evaluation zufriedenstellende Ergebnisse zeigt, bevor du auf Gemini umstellst.
              </p>
            </div>
          )}

          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!hasChanges || saveMutation.isPending}
            className="w-full"
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Änderungen speichern
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-1">Fallback-Modell</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Wird automatisch verwendet, wenn das Primärmodell überlastet ist (HTTP 429/503/529).
          Empfohlen: ein schnelleres oder alternatives Modell eines anderen Providers.
        </p>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="fallback-enabled">Fallback aktiv</Label>
            <Switch
              id="fallback-enabled"
              checked={fallbackEnabled}
              onCheckedChange={(v) => {
                setFallbackEnabled(v);
                setFallbackHasChanges(true);
              }}
            />
          </div>

          {fallbackEnabled && (
            <>
              <div>
                <Label>Fallback-Provider</Label>
                <Select value={fallbackProvider} onValueChange={handleFallbackProviderChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                    <SelectItem value="google">Google (Gemini)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Fallback-Modell</Label>
                <Select value={fallbackModel} onValueChange={handleFallbackModelChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getModelsForProvider(fallbackProvider).map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {fallbackProvider === provider && fallbackModel === model && (
                <div className="flex items-start gap-2 p-3 rounded-md bg-amber-500/10 border border-amber-500/20">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    Fallback und Primärmodell sind identisch. Wähle ein anderes Modell oder einen anderen Provider, damit der Fallback sinnvoll ist.
                  </p>
                </div>
              )}
            </>
          )}

          <Button
            onClick={() => saveFallbackMutation.mutate()}
            disabled={!fallbackHasChanges || saveFallbackMutation.isPending}
            className="w-full"
          >
            {saveFallbackMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <ShieldAlert className="h-4 w-4 mr-2" />
            )}
            Fallback-Einstellungen speichern
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-1">Rabattaktion</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Aktion aktivieren und Rabatte in Prozent pro Paket festlegen. Die Preise auf der Website und in Stripe werden automatisch angepasst.
        </p>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="promo-enabled">Aktion aktiv</Label>
            <Switch
              id="promo-enabled"
              checked={promotionEnabled}
              onCheckedChange={(v) => {
                setPromotionEnabled(v);
                setPromotionHasChanges(true);
              }}
            />
          </div>

          <div>
            <Label htmlFor="promo-label">Aktions-Label (z. B. Sommeraktion)</Label>
            <Input
              id="promo-label"
              value={promotionLabel}
              onChange={(e) => {
                setPromotionLabel(e.target.value);
                setPromotionHasChanges(true);
              }}
              className="mt-1"
              placeholder="Aktion"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="disc-starter">Starter %</Label>
              <Input
                id="disc-starter"
                type="number"
                min={0}
                max={100}
                value={discountStarter}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (!Number.isNaN(v)) setDiscountStarter(Math.max(0, Math.min(100, v)));
                  setPromotionHasChanges(true);
                }}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="disc-standard">Standard %</Label>
              <Input
                id="disc-standard"
                type="number"
                min={0}
                max={100}
                value={discountStandard}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (!Number.isNaN(v)) setDiscountStandard(Math.max(0, Math.min(100, v)));
                  setPromotionHasChanges(true);
                }}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="disc-premium">Premium %</Label>
              <Input
                id="disc-premium"
                type="number"
                min={0}
                max={100}
                value={discountPremium}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (!Number.isNaN(v)) setDiscountPremium(Math.max(0, Math.min(100, v)));
                  setPromotionHasChanges(true);
                }}
                className="mt-1"
              />
            </div>
          </div>

          {promotionEnabled && (
            <div className="rounded-md border bg-muted/40 p-3 text-sm">
              <p className="font-medium mb-2">Vorschau Aktionspreise</p>
              <ul className="space-y-1 text-muted-foreground">
                {(["Starter", "Standard", "Premium"] as const).map((name) => {
                  const base = PACKAGE_BASE_PRICES_CENTS[name];
                  const frac = name === "Starter" ? discountStarter / 100 : name === "Standard" ? discountStandard / 100 : discountPremium / 100;
                  const discounted = Math.round(base * (1 - frac));
                  return (
                    <li key={name}>
                      {name}: {(base / 100).toFixed(2).replace(".", ",")} € → {(discounted / 100).toFixed(2).replace(".", ",")} € (-{Math.round(frac * 100)} %)
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <Button
            onClick={() => savePromotionMutation.mutate()}
            disabled={!promotionHasChanges || savePromotionMutation.isPending}
            className="w-full"
          >
            {savePromotionMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Percent className="h-4 w-4 mr-2" />
            )}
            Rabatt-Einstellungen speichern
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-1">Beispiel-Dokumente</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Abgeschlossene Transkriptionsjobs auswählen, die auf der öffentlichen Beispielseite angezeigt werden.
          Besucher können diese Dokumente ohne Anmeldung einsehen.
        </p>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Max. angezeigte Beispiele</Label>
              <Input
                type="number"
                min={1}
                max={20}
                value={exampleConfig.maxVisible}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (!Number.isNaN(v)) {
                    setExampleConfig((prev) => ({ ...prev, maxVisible: Math.max(1, Math.min(20, v)) }));
                    setExampleHasChanges(true);
                  }
                }}
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>TTS-Stimme</Label>
              <Select
                value={exampleConfig.ttsVoice}
                onValueChange={(v) => {
                  setExampleConfig((prev) => ({ ...prev, ttsVoice: v }));
                  setExampleHasChanges(true);
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TTS_CHARACTERS.map((c) => (
                    <SelectItem key={c.voice} value={c.voice}>
                      {c.label} ({c.gender}) &ndash; {c.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>TTS-Stil</Label>
              <Select
                value={exampleConfig.ttsStyle}
                onValueChange={(v) => {
                  setExampleConfig((prev) => ({ ...prev, ttsStyle: v }));
                  setExampleHasChanges(true);
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TTS_CHARACTER_STYLES.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border-t pt-4">
            <Label className="mb-2 block">Dokument hinzufügen</Label>
            {jobsLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Abgeschlossene Jobs werden geladen...
              </div>
            ) : jobsError ? (
              <div className="text-sm text-destructive py-2">
                Fehler beim Laden: {(jobsError as Error).message}
              </div>
            ) : (() => {
              const availableJobs = (completedJobs ?? []).filter(
                (j) => !exampleConfig.documents.some((d) => d.jobId === j.id),
              );
              return availableJobs.length > 0 ? (
                <Select value="" onValueChange={(val) => addExampleDocById(val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Abgeschlossenen Job auswählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableJobs.map((j) => (
                      <SelectItem key={j.id} value={String(j.id)}>
                        #{j.id} &ndash; {getScriptTypeDisplayLabel(j.scriptType)} ({j.totalPages} S.)
                        {j.textSnippet ? ` — ${j.textSnippet.slice(0, 50)}…` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : completedJobs?.length ? (
                <p className="text-sm text-muted-foreground py-1">
                  Alle abgeschlossenen Jobs sind bereits als Beispiele hinzugefügt.
                </p>
              ) : null;
            })()}
            <div className="flex gap-2 mt-2">
              <Input
                type="number"
                placeholder="Oder Job-ID manuell eingeben..."
                value={addJobId}
                onChange={(e) => setAddJobId(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && addJobId) addExampleDocById(addJobId); }}
              />
              <Button
                variant="outline"
                onClick={() => addExampleDocById(addJobId)}
                disabled={!addJobId}
              >
                <Plus className="h-4 w-4 mr-1" />
                Hinzufügen
              </Button>
            </div>
            {!completedJobs?.length && !jobsLoading && !jobsError && (
              <p className="text-sm text-muted-foreground mt-2">
                Keine abgeschlossenen Transkriptionsjobs gefunden. Job-ID oben manuell eingeben.
              </p>
            )}
          </div>

          {exampleConfig.documents.length > 0 && (
            <div className="space-y-4 border-t pt-4">
              {exampleConfig.documents.map((doc, idx) => {
                const job = completedJobs?.find((j) => j.id === doc.jobId);
                return (
                  <div key={doc.jobId} className="rounded-lg border bg-muted/30 p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary shrink-0" />
                        <span className="text-sm font-medium">
                          Job #{doc.jobId}
                          {job && (
                            <span className="text-muted-foreground font-normal">
                              {" "}&ndash; {getScriptTypeDisplayLabel(job.scriptType)}, {job.totalPages} Seite{job.totalPages !== 1 ? "n" : ""}
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={idx === 0} onClick={() => moveExampleDoc(idx, -1)}>
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={idx === exampleConfig.documents.length - 1} onClick={() => moveExampleDoc(idx, 1)}>
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeExampleDoc(doc.jobId)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs">Titel</Label>
                      <Input
                        value={doc.title}
                        onChange={(e) => updateExampleDoc(doc.jobId, "title", e.target.value)}
                        placeholder="z. B. Feldpostbrief 1943 (Sütterlin)"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label className="text-xs">Beschreibung</Label>
                      <Textarea
                        value={doc.description}
                        onChange={(e) => updateExampleDoc(doc.jobId, "description", e.target.value)}
                        placeholder="Kurze Beschreibung für Besucher..."
                        rows={2}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label className="text-xs">Quelle (optional)</Label>
                      <Input
                        value={doc.source}
                        onChange={(e) => updateExampleDoc(doc.jobId, "source", e.target.value)}
                        placeholder="z. B. Familienarchiv Bayern / Bundesarchiv Berlin"
                        className="mt-1"
                      />
                    </div>

                    <div className="rounded-md border bg-muted/20 p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <Headphones className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="text-xs font-medium">Audio (TTS)</span>
                        {doc.audioUrl && (
                          <Badge variant="secondary" className="text-[10px] ml-auto">Audio vorhanden</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs whitespace-nowrap shrink-0">Textversion</Label>
                        <Select value={doc.ttsVersion} onValueChange={(v) => updateExampleDoc(doc.jobId, "ttsVersion", v)}>
                          <SelectTrigger className="h-8 text-xs flex-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="original">Originalgetreu</SelectItem>
                            <SelectItem value="completed">Ergänzt</SelectItem>
                            <SelectItem value="interpreted">Interpretation (besonders lesbar)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => generateTtsMutation.mutate(doc.jobId)}
                        disabled={generatingTtsFor !== null}
                      >
                        {generatingTtsFor === doc.jobId ? (
                          <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        ) : (
                          <Volume2 className="h-3.5 w-3.5 mr-1.5" />
                        )}
                        {generatingTtsFor === doc.jobId ? "Wird generiert..." : doc.audioUrl ? "TTS neu generieren" : "TTS generieren"}
                      </Button>
                    </div>

                    {doc.audioUrl && (
                      <audio controls className="w-full h-9" src={doc.audioUrl} />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <Button
            onClick={() => saveExampleMutation.mutate()}
            disabled={!exampleHasChanges || saveExampleMutation.isPending}
            className="w-full"
          >
            {saveExampleMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Beispiel-Konfiguration speichern
          </Button>
        </div>
      </Card>
    </div>
  );
}
