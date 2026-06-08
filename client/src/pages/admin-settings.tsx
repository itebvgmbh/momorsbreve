import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
        title: t("adminSettings.toastSavedTitle"),
        description: t("adminSettings.toastModelSaved", { provider: provider === "google" ? "Gemini" : "Claude", model }),
      });
      setHasChanges(false);
    },
    onError: () => {
      toast({
        title: t("adminSettings.toastErrorTitle"),
        description: t("adminSettings.toastModelSaveError"),
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
        title: t("adminSettings.toastSavedTitle"),
        description: fallbackEnabled
          ? t("adminSettings.toastFallbackEnabled", { provider: fallbackProvider === "google" ? "Gemini" : "Claude", model: fallbackModel })
          : t("adminSettings.toastFallbackDisabled"),
      });
      setFallbackHasChanges(false);
    },
    onError: () => {
      toast({
        title: t("adminSettings.toastErrorTitle"),
        description: t("adminSettings.toastFallbackSaveError"),
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
        title: t("adminSettings.toastSavedTitle"),
        description: t("adminSettings.toastPromotionSaved"),
      });
      setPromotionHasChanges(false);
    },
    onError: () => {
      toast({
        title: t("adminSettings.toastErrorTitle"),
        description: t("adminSettings.toastPromotionSaveError"),
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
      toast({ title: t("adminSettings.toastSavedTitle"), description: t("adminSettings.toastExampleSaved") });
      setExampleHasChanges(false);
    },
    onError: () => {
      toast({ title: t("adminSettings.toastErrorTitle"), description: t("adminSettings.toastExampleSaveError"), variant: "destructive" });
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
      toast({ title: t("adminSettings.toastAudioGeneratedTitle"), description: t("adminSettings.toastAudioGeneratedBody") });
    },
    onError: (error: Error) => {
      setGeneratingTtsFor(null);
      toast({ title: t("adminSettings.toastTtsErrorTitle"), description: error.message, variant: "destructive" });
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
          title: job ? `${getScriptTypeDisplayLabel(job.scriptType)} #${id}` : t("adminSettings.defaultDocTitle", { id }),
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
        <h1 className="text-2xl font-bold">{t("adminSettings.pageTitle")}</h1>
        <p className="text-muted-foreground mt-1">
          {t("adminSettings.pageSubtitle")}
        </p>
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-1">{t("adminSettings.modelCardTitle")}</h2>
        <p className="text-sm text-muted-foreground mb-4">
          {t("adminSettings.modelCardDesc")}
        </p>

        <div className="flex items-center gap-2 mb-6">
          <span className="text-sm text-muted-foreground">{t("adminSettings.currentlyActive")}</span>
          <Badge variant="outline">
            {currentProvider === "google" ? "Gemini" : "Claude"}
          </Badge>
          <Badge variant="secondary" className="font-mono text-xs">
            {currentModel}
          </Badge>
        </div>

        <div className="space-y-4">
          <div>
            <Label>{t("adminSettings.providerLabel")}</Label>
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
            <Label>{t("adminSettings.modelLabel")}</Label>
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
                {t("adminSettings.geminiWarning")}
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
            {t("adminSettings.saveChanges")}
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-1">{t("adminSettings.fallbackCardTitle")}</h2>
        <p className="text-sm text-muted-foreground mb-4">
          {t("adminSettings.fallbackCardDesc")}
        </p>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="fallback-enabled">{t("adminSettings.fallbackActive")}</Label>
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
                <Label>{t("adminSettings.fallbackProviderLabel")}</Label>
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
                <Label>{t("adminSettings.fallbackModelLabel")}</Label>
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
                    {t("adminSettings.fallbackIdenticalWarning")}
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
            {t("adminSettings.saveFallback")}
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-1">{t("adminSettings.promotionCardTitle")}</h2>
        <p className="text-sm text-muted-foreground mb-4">
          {t("adminSettings.promotionCardDesc")}
        </p>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="promo-enabled">{t("adminSettings.promotionActive")}</Label>
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
            <Label htmlFor="promo-label">{t("adminSettings.promotionLabelLabel")}</Label>
            <Input
              id="promo-label"
              value={promotionLabel}
              onChange={(e) => {
                setPromotionLabel(e.target.value);
                setPromotionHasChanges(true);
              }}
              className="mt-1"
              placeholder={t("adminSettings.promotionLabelPlaceholder")}
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
              <p className="font-medium mb-2">{t("adminSettings.promotionPreviewTitle")}</p>
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
            {t("adminSettings.savePromotion")}
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-1">{t("adminSettings.exampleCardTitle")}</h2>
        <p className="text-sm text-muted-foreground mb-4">
          {t("adminSettings.exampleCardDesc")}
        </p>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t("adminSettings.maxVisibleLabel")}</Label>
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
              <Label>{t("adminSettings.ttsVoiceLabel")}</Label>
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
              <Label>{t("adminSettings.ttsStyleLabel")}</Label>
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
            <Label className="mb-2 block">{t("adminSettings.addDocumentLabel")}</Label>
            {jobsLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("adminSettings.loadingJobs")}
              </div>
            ) : jobsError ? (
              <div className="text-sm text-destructive py-2">
                {t("adminSettings.loadError", { message: (jobsError as Error).message })}
              </div>
            ) : (() => {
              const availableJobs = (completedJobs ?? []).filter(
                (j) => !exampleConfig.documents.some((d) => d.jobId === j.id),
              );
              return availableJobs.length > 0 ? (
                <Select value="" onValueChange={(val) => addExampleDocById(val)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("adminSettings.selectJobPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableJobs.map((j) => (
                      <SelectItem key={j.id} value={String(j.id)}>
                        #{j.id} &ndash; {getScriptTypeDisplayLabel(j.scriptType)} {t("adminSettings.pagesAbbrev", { count: j.totalPages })}
                        {j.textSnippet ? ` — ${j.textSnippet.slice(0, 50)}…` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : completedJobs?.length ? (
                <p className="text-sm text-muted-foreground py-1">
                  {t("adminSettings.allJobsAdded")}
                </p>
              ) : null;
            })()}
            <div className="flex gap-2 mt-2">
              <Input
                type="number"
                placeholder={t("adminSettings.manualJobIdPlaceholder")}
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
                {t("adminSettings.add")}
              </Button>
            </div>
            {!completedJobs?.length && !jobsLoading && !jobsError && (
              <p className="text-sm text-muted-foreground mt-2">
                {t("adminSettings.noJobsFound")}
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
                          {t("adminSettings.jobNumber", { id: doc.jobId })}
                          {job && (
                            <span className="text-muted-foreground font-normal">
                              {" "}&ndash; {getScriptTypeDisplayLabel(job.scriptType)}, {t("adminSettings.pagesCount", { count: job.totalPages })}
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
                      <Label className="text-xs">{t("adminSettings.titleLabel")}</Label>
                      <Input
                        value={doc.title}
                        onChange={(e) => updateExampleDoc(doc.jobId, "title", e.target.value)}
                        placeholder={t("adminSettings.titlePlaceholder")}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label className="text-xs">{t("adminSettings.descriptionLabel")}</Label>
                      <Textarea
                        value={doc.description}
                        onChange={(e) => updateExampleDoc(doc.jobId, "description", e.target.value)}
                        placeholder={t("adminSettings.descriptionPlaceholder")}
                        rows={2}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label className="text-xs">{t("adminSettings.sourceLabel")}</Label>
                      <Input
                        value={doc.source}
                        onChange={(e) => updateExampleDoc(doc.jobId, "source", e.target.value)}
                        placeholder={t("adminSettings.sourcePlaceholder")}
                        className="mt-1"
                      />
                    </div>

                    <div className="rounded-md border bg-muted/20 p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <Headphones className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="text-xs font-medium">{t("adminSettings.audioTts")}</span>
                        {doc.audioUrl && (
                          <Badge variant="secondary" className="text-[10px] ml-auto">{t("adminSettings.audioAvailable")}</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs whitespace-nowrap shrink-0">{t("adminSettings.textVersionLabel")}</Label>
                        <Select value={doc.ttsVersion} onValueChange={(v) => updateExampleDoc(doc.jobId, "ttsVersion", v)}>
                          <SelectTrigger className="h-8 text-xs flex-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="original">{t("adminSettings.versionOriginal")}</SelectItem>
                            <SelectItem value="completed">{t("adminSettings.versionCompleted")}</SelectItem>
                            <SelectItem value="interpreted">{t("adminSettings.versionInterpreted")}</SelectItem>
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
                        {generatingTtsFor === doc.jobId ? t("adminSettings.ttsGenerating") : doc.audioUrl ? t("adminSettings.ttsRegenerate") : t("adminSettings.ttsGenerate")}
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
            {t("adminSettings.saveExample")}
          </Button>
        </div>
      </Card>
    </div>
  );
}
