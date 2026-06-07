import React, { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Area, Bar, CartesianGrid, ComposedChart, XAxis, YAxis } from "recharts";
import {
  ArrowLeft,
  TrendingUp,
  Euro,
  CalendarDays,
  CalendarRange,
  Wallet,
  AlertCircle,
  History,
  Megaphone,
  Users,
  ShoppingCart,
  UserPlus,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Mail,
  MailPlus,
  MessageSquare,
  Send,
  Loader2,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  CalendarClock,
  XCircle,
  Headphones,
  Download,
  Upload,
  Eye,
  EyeOff,
  FileText,
  RotateCcw,
  Shuffle,
} from "lucide-react";
import {
  CTA_VARIANT_LABELS,
  CtaTeaser,
  ctaVariantEmbedsPreview,
  ctaVariantEmbedsQuality,
  DEFAULT_CTA_VARIANT,
  type CtaVariantId,
} from "@/components/cta-variants";
import {
  HERO_VARIANT_LABELS,
  HERO_VARIANT_HYPOTHESES,
  HeroBlock,
  DEFAULT_HERO_VARIANT,
  type HeroVariantId,
} from "@/components/hero-variants";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// ─── Revenue Types ─────────────────────────────────────────────────────────

interface RevenuePeriod {
  grossEur: number;
  netEur: number;
  vatEur: number;
  count: number;
}

interface RevenueTimeSeriesPoint {
  date: string;
  grossEur: number;
  netEur: number;
  purchases: number;
}

interface RevenueRecentInvoice {
  id: number;
  invoiceNumber: string;
  createdAt: string;
  type: string;
  grossAmountEur: number;
  netAmountEur: number;
  description: string;
  customerEmail: string | null;
}

interface RevenueStats {
  today: RevenuePeriod;
  thisWeek: RevenuePeriod;
  thisMonth: RevenuePeriod;
  allTime: RevenuePeriod;
  timeSeries: RevenueTimeSeriesPoint[];
  recentInvoices: RevenueRecentInvoice[];
}

// ─── User Stats Types ──────────────────────────────────────────────────────

interface PurchaseDistribution {
  noPurchase: number;
  onePurchase: number;
  twoPlusPurchases: number;
}

interface RegistrationTimeSeriesPoint {
  date: string;
  count: number;
}

interface UserListItem {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  credits: number;
  totalPurchasedCredits: number;
  newsletterOptIn: boolean;
  createdAt: string;
  updatedAt: string;
  purchaseCount: number;
  audioCount: number;
}

interface AdminAudioGeneration {
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
  jobScriptType: string | null;
  jobTotalPages: number | null;
  textSnippet: string | null;
}

interface AdminUserAudioResponse {
  user: {
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
  };
  generations: AdminAudioGeneration[];
}

interface AdminSetCreditsResponse {
  userId: string;
  email: string | null;
  creditsBefore: number;
  creditsAfter: number;
}

interface MarketingTemplate {
  id: number;
  name: string;
  subject: string;
  preheader: string | null;
  htmlBody: string;
  textBody: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DirectSendPerUserResult {
  userId: string;
  email: string;
  status:
    | "sent"
    | "failed"
    | "skipped_optin"
    | "skipped_no_email"
    | "skipped_cooldown"
    | "skipped_not_found";
  error?: string;
}

interface DirectSendResult {
  totalRequested: number;
  sent: number;
  failed: number;
  skipped: number;
  perUser: DirectSendPerUserResult[];
}

interface ResendSegmentSyncResult {
  segmentId: string;
  registeredAfter: string;
  totalEligible: number;
  created: number;
  updated: number;
  addedToSegment: number;
  failed: number;
  errors: Array<{ email: string; message: string }>;
}

interface UserStats {
  purchaseDistribution: PurchaseDistribution;
  registrationTimeSeries: RegistrationTimeSeriesPoint[];
  userList: UserListItem[];
}

interface PayingUserHeatmapPoint {
  dow: number;
  hour: number;
  count: number;
  revenueCents: number;
}

interface AdwordsDailyStat {
  id: number;
  date: string;
  costCents: number;
  clicks: number;
  conversions: number;
  impressions: number;
}

// ─── Formatters ────────────────────────────────────────────────────────────

function formatEur(cents: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
}

function formatDateFull(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatInvoiceRowDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "–";
  return d.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "–";
  return d.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Chart Configs ─────────────────────────────────────────────────────────

const combinedRevenueRegChartConfig = {
  grossEur: { label: "Brutto", color: "hsl(24, 75%, 50%)" },
  netEur: { label: "Netto", color: "hsl(24, 60%, 70%)" },
  count: { label: "Registrierungen", color: "hsl(142, 55%, 45%)" },
  adCostCents: { label: "Ad-Kosten", color: "hsl(0, 70%, 55%)" },
  adClicks: { label: "Klicks", color: "hsl(210, 70%, 55%)" },
  adConversions: { label: "Conversions", color: "hsl(270, 60%, 55%)" },
  adImpressions: { label: "Impressionen", color: "hsl(220, 15%, 55%)" },
  netProfit: { label: "Netto-Gewinn", color: "hsl(160, 70%, 40%)" },
} satisfies ChartConfig;

type SeriesKey = keyof typeof combinedRevenueRegChartConfig;

const DEFAULT_ACTIVE_SERIES = new Set<SeriesKey>([
  "grossEur", "netEur", "count", "adCostCents", "adClicks", "adConversions", "netProfit",
]);

const TYPE_LABELS: Record<string, string> = {
  credit_purchase: "Credits",
  specialist_order: "Spezialist",
};

// ─── Aggregation Helpers ───────────────────────────────────────────────────

interface CombinedTimeSeriesPoint {
  date: string;
  grossEur: number;
  netEur: number;
  purchases: number;
  count: number;
  adCostCents: number;
  adClicks: number;
  adConversions: number;
  adImpressions: number;
  netProfit: number;
}

function mergeDailyAll(
  rev: RevenueTimeSeriesPoint[],
  reg: RegistrationTimeSeriesPoint[],
  ads: AdwordsDailyStat[]
): CombinedTimeSeriesPoint[] {
  const empty = (): Omit<CombinedTimeSeriesPoint, "date"> => ({
    grossEur: 0, netEur: 0, purchases: 0, count: 0, adCostCents: 0, adClicks: 0, adConversions: 0, adImpressions: 0, netProfit: 0,
  });
  const map = new Map<string, CombinedTimeSeriesPoint>();
  for (const p of rev) {
    map.set(p.date, { ...empty(), date: p.date, grossEur: p.grossEur, netEur: p.netEur, purchases: p.purchases });
  }
  for (const p of reg) {
    const e = map.get(p.date) ?? { ...empty(), date: p.date };
    e.count = p.count;
    map.set(p.date, e);
  }
  for (const p of ads) {
    const e = map.get(p.date) ?? { ...empty(), date: p.date };
    e.adCostCents = p.costCents;
    e.adClicks = p.clicks;
    e.adConversions = p.conversions;
    e.adImpressions = p.impressions;
    map.set(p.date, e);
  }
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  if (!map.has(todayKey)) {
    map.set(todayKey, { ...empty(), date: todayKey });
  }
  const result = Array.from(map.values());
  result.forEach((e) => { e.netProfit = e.netEur - e.adCostCents; });
  return result.sort((a, b) => a.date.localeCompare(b.date));
}

function aggregateCombinedSeries(
  points: CombinedTimeSeriesPoint[],
  mode: "day" | "week" | "month" = "day"
): CombinedTimeSeriesPoint[] {
  if (mode === "day") return points;

  const grouped = new Map<string, Omit<CombinedTimeSeriesPoint, "date">>();
  for (const p of points) {
    const d = new Date(p.date + "T12:00:00");
    if (Number.isNaN(d.getTime())) continue;
    const key =
      mode === "month"
        ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
        : (() => {
            const day = d.getDate() - d.getDay();
            const weekStart = new Date(d);
            weekStart.setDate(day);
            return weekStart.toISOString().slice(0, 10);
          })();

    const existing = grouped.get(key) ?? {
      grossEur: 0, netEur: 0, purchases: 0, count: 0,
      adCostCents: 0, adClicks: 0, adConversions: 0, adImpressions: 0, netProfit: 0,
    };
    existing.grossEur += p.grossEur;
    existing.netEur += p.netEur;
    existing.purchases += p.purchases;
    existing.count += p.count;
    existing.adCostCents += p.adCostCents;
    existing.adClicks += p.adClicks;
    existing.adConversions += p.adConversions;
    existing.adImpressions += p.adImpressions;
    existing.netProfit += p.netProfit;
    grouped.set(key, existing);
  }

  return Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vals]) => ({ date, ...vals }));
}

// ─── Sort Types ────────────────────────────────────────────────────────────

type SortField = "email" | "name" | "credits" | "totalPurchasedCredits" | "newsletterOptIn" | "createdAt" | "updatedAt" | "purchaseCount" | "audioCount";
type SortDir = "asc" | "desc";

// ─── CTA Kachel-Footer (Stats + In-Rotation-Checkbox) ──────────────────────

function formatConversion(rate: number | null): string {
  if (rate === null) return "–";
  return `${(rate * 100).toFixed(1).replace(".", ",")}%`;
}

function conversionBadgeClasses(rate: number | null): string {
  if (rate === null) return "text-muted-foreground bg-muted/40";
  if (rate >= 0.15) return "text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/40";
  if (rate >= 0.08) return "text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/40";
  return "text-muted-foreground bg-muted/40";
}

interface CtaTileFooterProps {
  variantId: number;
  impressions: number;
  claims: number;
  conversionRate: number | null;
  inRotation: boolean;
  onRotationChange: (checked: boolean) => void;
}

function CtaTileFooter({
  variantId,
  impressions,
  claims,
  conversionRate,
  inRotation,
  onRotationChange,
}: CtaTileFooterProps) {
  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex items-center justify-between gap-1">
        <span className="text-[10px] tabular-nums text-muted-foreground" title="Impressionen → Claims">
          {impressions.toLocaleString("de-DE")} → {claims.toLocaleString("de-DE")}
        </span>
        <span
          className={`text-[10px] font-semibold tabular-nums px-1.5 py-0.5 rounded ${conversionBadgeClasses(conversionRate)}`}
          title="Conversion-Rate (Claims / Impressionen)"
        >
          {formatConversion(conversionRate)}
        </span>
      </div>
      <label
        className="flex items-center gap-1.5 cursor-pointer select-none"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <Checkbox
          checked={inRotation}
          onCheckedChange={(v) => onRotationChange(v === true)}
          className="h-3.5 w-3.5"
          data-testid={`cta-rotation-checkbox-${variantId}`}
        />
        <span className="text-[10px] font-medium text-muted-foreground">In Rotation</span>
      </label>
    </div>
  );
}

// ─── Hero Kachel-Footer (Stats + In-Rotation-Checkbox) ─────────────────────

interface HeroTileFooterProps {
  variantId: number;
  impressions: number;
  conversions: number;
  conversionRate: number | null;
  inRotation: boolean;
  onRotationChange: (checked: boolean) => void;
}

function HeroTileFooter({
  variantId,
  impressions,
  conversions,
  conversionRate,
  inRotation,
  onRotationChange,
}: HeroTileFooterProps) {
  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex items-center justify-between gap-1">
        <span className="text-[10px] tabular-nums text-muted-foreground" title="Impressionen → Uploads">
          {impressions.toLocaleString("de-DE")} → {conversions.toLocaleString("de-DE")}
        </span>
        <span
          className={`text-[10px] font-semibold tabular-nums px-1.5 py-0.5 rounded ${conversionBadgeClasses(conversionRate)}`}
          title="Upload-Rate (Uploads / Impressionen)"
        >
          {formatConversion(conversionRate)}
        </span>
      </div>
      <label
        className="flex items-center gap-1.5 cursor-pointer select-none"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <Checkbox
          checked={inRotation}
          onCheckedChange={(v) => onRotationChange(v === true)}
          className="h-3.5 w-3.5"
          data-testid={`hero-rotation-checkbox-${variantId}`}
        />
        <span className="text-[10px] font-medium text-muted-foreground">In Rotation</span>
      </label>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeCtaVariant, setActiveCtaVariantState] = useState<CtaVariantId>(DEFAULT_CTA_VARIANT);

  useEffect(() => {
    fetch("/api/cta-variant")
      .then((r) => r.json())
      .then((data) => {
        if (typeof data?.variant === "number" && data.variant >= 0 && data.variant <= 13) {
          setActiveCtaVariantState(data.variant as CtaVariantId);
        }
      })
      .catch(() => {});
  }, []);

  const handleCtaVariantChange = async (v: CtaVariantId) => {
    setActiveCtaVariantState(v);
    try {
      await apiRequest("PUT", "/api/admin/settings", { cta_variant: v });
    } catch (err) {
      console.error("Failed to persist CTA variant:", err);
    }
  };

  // ─── CTA-Rotation + Statistik ───────────────────────────────────────────
  type CtaStat = {
    variantId: number;
    impressions: number;
    claims: number;
    conversionRate: number | null;
  };

  const settingsQuery = useQuery<Record<string, unknown>>({
    queryKey: ["/api/admin/settings"],
    staleTime: 30_000,
  });
  const ctaStatsQuery = useQuery<CtaStat[]>({
    queryKey: ["/api/admin/cta-stats"],
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const rotationEnabled =
    settingsQuery.data?.cta_rotation_enabled === true;
  const rotationVariantsRaw = Array.isArray(settingsQuery.data?.cta_rotation_variants)
    ? (settingsQuery.data!.cta_rotation_variants as unknown[])
    : [];
  const rotationVariants = new Set<number>(
    rotationVariantsRaw
      .map((v) => (typeof v === "number" ? v : Number(v)))
      .filter((v) => Number.isInteger(v) && v >= 0 && v <= 13)
  );

  const statsByVariant = new Map<number, CtaStat>();
  for (const s of ctaStatsQuery.data ?? []) {
    statsByVariant.set(s.variantId, s);
  }

  const rotationSettingsMutation = useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      const res = await apiRequest("PUT", "/api/admin/settings", updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
    },
    onError: (err: Error) => {
      toast({
        title: "Fehler",
        description: err.message || "Einstellung konnte nicht gespeichert werden",
        variant: "destructive",
      });
    },
  });

  const handleRotationToggle = (enabled: boolean) => {
    rotationSettingsMutation.mutate({ cta_rotation_enabled: enabled });
  };

  const handleRotationVariantToggle = (id: CtaVariantId, inRotation: boolean) => {
    const next = new Set(rotationVariants);
    if (inRotation) next.add(id);
    else next.delete(id);
    rotationSettingsMutation.mutate({
      cta_rotation_variants: Array.from(next).sort((a, b) => a - b),
    });
  };

  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const resetStatsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/cta-stats/reset");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cta-stats"] });
      setResetDialogOpen(false);
      toast({ title: "Zähler zurückgesetzt", description: "Impressionen und Claims auf 0." });
    },
    onError: (err: Error) => {
      toast({
        title: "Fehler",
        description: err.message || "Zurücksetzen fehlgeschlagen",
        variant: "destructive",
      });
    },
  });

  // ─── Hero-A/B-Test (Homepage) ────────────────────────────────────────────
  type HeroStat = {
    variantId: number;
    impressions: number;
    conversions: number;
    conversionRate: number | null;
  };

  const [activeHeroVariant, setActiveHeroVariantState] = useState<HeroVariantId>(DEFAULT_HERO_VARIANT);

  // Standard-Variante kommt aus den App-Settings (nicht aus dem rotations-bewussten
  // Besucher-Endpoint), damit die Admin-Kachel die echte Standard-Variante hervorhebt.
  useEffect(() => {
    const v = settingsQuery.data?.hero_variant;
    if (typeof v === "number" && v >= 0 && v <= 4) {
      setActiveHeroVariantState(v as HeroVariantId);
    }
  }, [settingsQuery.data?.hero_variant]);

  const heroStatsQuery = useQuery<HeroStat[]>({
    queryKey: ["/api/admin/hero-stats"],
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const heroRotationEnabled = settingsQuery.data?.hero_rotation_enabled === true;
  const heroRotationVariantsRaw = Array.isArray(settingsQuery.data?.hero_rotation_variants)
    ? (settingsQuery.data!.hero_rotation_variants as unknown[])
    : [];
  const heroRotationVariants = new Set<number>(
    heroRotationVariantsRaw
      .map((v) => (typeof v === "number" ? v : Number(v)))
      .filter((v) => Number.isInteger(v) && v >= 0 && v <= 4)
  );

  const heroStatsByVariant = new Map<number, HeroStat>();
  for (const s of heroStatsQuery.data ?? []) {
    heroStatsByVariant.set(s.variantId, s);
  }

  const handleHeroVariantChange = async (v: HeroVariantId) => {
    setActiveHeroVariantState(v);
    try {
      await apiRequest("PUT", "/api/admin/settings", { hero_variant: v });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
    } catch (err) {
      console.error("Failed to persist hero variant:", err);
    }
  };

  const handleHeroRotationToggle = (enabled: boolean) => {
    rotationSettingsMutation.mutate({ hero_rotation_enabled: enabled });
  };

  const handleHeroRotationVariantToggle = (id: HeroVariantId, inRotation: boolean) => {
    const next = new Set(heroRotationVariants);
    if (inRotation) next.add(id);
    else next.delete(id);
    rotationSettingsMutation.mutate({
      hero_rotation_variants: Array.from(next).sort((a, b) => a - b),
    });
  };

  const [heroResetDialogOpen, setHeroResetDialogOpen] = useState(false);
  const heroResetStatsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/hero-stats/reset");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/hero-stats"] });
      setHeroResetDialogOpen(false);
      toast({ title: "Zähler zurückgesetzt", description: "Impressionen und Uploads auf 0." });
    },
    onError: (err: Error) => {
      toast({
        title: "Fehler",
        description: err.message || "Zurücksetzen fehlgeschlagen",
        variant: "destructive",
      });
    },
  });

  const [showAdminInvoices, setShowAdminInvoices] = useState(true);

  const { data, isLoading, isError, error, refetch, isFetching } =
    useQuery<RevenueStats>({
      queryKey: ["/api/admin/revenue", showAdminInvoices],
      queryFn: async () => {
        const res = await apiRequest("GET", `/api/admin/revenue?includeAdmin=${showAdminInvoices}`);
        return res.json();
      },
      staleTime: 60_000,
    });

  const userStatsQuery = useQuery<UserStats>({
    queryKey: ["/api/admin/users"],
    staleTime: 60_000,
  });

  const heatmapQuery = useQuery<PayingUserHeatmapPoint[]>({
    queryKey: ["/api/admin/paying-user-heatmap"],
    staleTime: 60_000,
  });

  const adwordsQuery = useQuery<AdwordsDailyStat[]>({
    queryKey: ["/api/admin/adwords"],
    staleTime: 60_000,
  });

  const [activeSeries, setActiveSeries] = useState<Set<SeriesKey>>(
    () => new Set(DEFAULT_ACTIVE_SERIES)
  );
  const [timeInterval, setTimeInterval] = useState<"day" | "week" | "month">("day");
  const toggleSeries = (key: SeriesKey) => {
    setActiveSeries((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const csvInputRef = useRef<HTMLInputElement>(null);
  const uploadCsvMutation = useMutation({
    mutationFn: async (csvText: string) => {
      const res = await apiRequest("POST", "/api/admin/adwords/import", { csv: csvText });
      return res.json() as Promise<{ imported: number; message: string }>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/adwords"] });
      toast({ title: "CSV importiert", description: data.message });
    },
    onError: (err: Error) => {
      toast({ title: "Import fehlgeschlagen", description: err.message, variant: "destructive" });
    },
  });

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      uploadCsvMutation.mutate(text);
    };
    reader.readAsText(file);
    if (csvInputRef.current) csvInputRef.current.value = "";
  };

  const combinedChartData = useMemo(() => {
    if (!data || userStatsQuery.isLoading) return [];
    const reg = userStatsQuery.isError
      ? []
      : userStatsQuery.data?.registrationTimeSeries ?? [];
    const ads = adwordsQuery.data ?? [];
    return aggregateCombinedSeries(mergeDailyAll(data.timeSeries, reg, ads), timeInterval);
  }, [data, userStatsQuery.data, userStatsQuery.isLoading, userStatsQuery.isError, adwordsQuery.data, timeInterval]);

  const hasAnyRevenue =
    data != null &&
    (data.allTime.grossEur > 0 ||
      data.allTime.count > 0 ||
      (data.recentInvoices?.length ?? 0) > 0);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <Button variant="ghost" onClick={() => navigate("/app")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zurück
        </Button>
        <h1 className="font-serif text-xl font-bold">Umsatz-Dashboard</h1>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setShowAdminInvoices((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
              showAdminInvoices
                ? "border-amber-500 text-amber-600 opacity-100"
                : "border-border text-muted-foreground opacity-60 hover:opacity-80"
            }`}
          >
            {showAdminInvoices ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            Admin-Rechnungen
          </button>
          {!isLoading && !isError && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => { refetch(); userStatsQuery.refetch(); heatmapQuery.refetch(); adwordsQuery.refetch(); }}
              disabled={isFetching || userStatsQuery.isFetching}
            >
              {isFetching || userStatsQuery.isFetching ? "Aktualisiere…" : "Aktualisieren"}
            </Button>
          )}
        </div>
      </div>

      {isError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Daten konnten nicht geladen werden</AlertTitle>
          <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm">
              {(error as Error)?.message ||
                "Unbekannter Fehler. Prüfen Sie, ob Sie als Admin angemeldet sind."}
            </span>
            <Button variant="secondary" size="sm" onClick={() => refetch()}>
              Erneut versuchen
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="revenue" className="space-y-6">
        <TabsList>
          <TabsTrigger value="revenue">Umsatz</TabsTrigger>
          <TabsTrigger value="users">Nutzer</TabsTrigger>
        </TabsList>

        {/* ═══ Tab: Umsatz ═══ */}
        <TabsContent value="revenue" className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard icon={Euro} label="Heute" data={data?.today} isLoading={isLoading} />
            <KpiCard icon={CalendarDays} label="Letzte 7 Tage" data={data?.thisWeek} isLoading={isLoading} />
            <KpiCard icon={CalendarRange} label="Letzte 30 Tage" data={data?.thisMonth} isLoading={isLoading} />
            <KpiCard icon={Wallet} label="Gesamt" data={data?.allTime} isLoading={isLoading} />
          </div>

          {/* Purchase Distribution */}
          <PurchaseDistributionCards
            data={userStatsQuery.data?.purchaseDistribution}
            isLoading={userStatsQuery.isLoading}
          />

          {/* CTA-Varianten-Switcher mit Live-Vorschau */}
          <Card className="p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-2">
              <Megaphone className="h-5 w-5 text-muted-foreground" />
              <h2 className="font-semibold">CTA-Varianten (Analyse-Seite)</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              Klick auf eine Kachel ändert die <strong className="text-foreground">Standard-Variante</strong>{" "}
              (wird ausgespielt, wenn die Rotation aus ist).
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Varianten mit 🔥 ersetzen die separate „Transkriptionsvorschau"-Karte
              und integrieren den CTA direkt in die Vorschau – weniger Scrollen, klarerer nächster Schritt.
            </p>

            {/* Rotation-Steuerung */}
            <div className="rounded-lg border bg-muted/30 p-4 mb-5 space-y-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <Shuffle className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div>
                    <div className="flex items-center gap-2">
                      <label htmlFor="cta-rotation-toggle" className="font-medium text-sm cursor-pointer">
                        A/B-Rotation aktiv
                      </label>
                      <Switch
                        id="cta-rotation-toggle"
                        checked={rotationEnabled}
                        onCheckedChange={handleRotationToggle}
                        disabled={settingsQuery.isLoading || rotationSettingsMutation.isPending}
                        data-testid="cta-rotation-toggle"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 max-w-xl">
                      Wenn aktiv, wird jede neue Analyse zufällig einer der unten markierten
                      Varianten zugewiesen. Wenn aus, gilt die zuletzt angeklickte Standard-Variante (V{activeCtaVariant}).
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setResetDialogOpen(true)}
                  disabled={ctaStatsQuery.isLoading}
                  data-testid="cta-stats-reset-button"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Alle Zähler zurücksetzen
                </Button>
              </div>
              {rotationEnabled && rotationVariants.size < 2 && (
                <Alert variant="default" className="border-amber-300/60 dark:border-amber-700/60">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle className="text-sm">
                    {rotationVariants.size === 0
                      ? "Keine Variante in der Rotation"
                      : "Nur eine Variante in der Rotation"}
                  </AlertTitle>
                  <AlertDescription className="text-xs">
                    {rotationVariants.size === 0
                      ? "Solange keine Variante ausgewählt ist, fällt das System auf die Standard-Variante (V" +
                        activeCtaVariant +
                        ") zurück. Markieren Sie mindestens zwei Varianten unten als „In Rotation\u201c."
                      : "Für einen echten A/B-Test sollten mindestens zwei Varianten markiert sein."}
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Gruppe 1: Klassische CTA-Karten (Vorschau separat) */}
            <div className="mb-4">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Klassisch – CTA als eigene Karte unter der Vorschau
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {(Object.entries(CTA_VARIANT_LABELS) as [string, string][])
                  .filter(([key]) => Number(key) <= 5)
                  .map(([key, label]) => {
                    const id = Number(key) as CtaVariantId;
                    const isActive = activeCtaVariant === id;
                    const stat = statsByVariant.get(id);
                    return (
                      <div
                        key={id}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleCtaVariantChange(id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleCtaVariantChange(id);
                          }
                        }}
                        className={`text-left p-3 rounded-lg border-2 transition-all cursor-pointer ${
                          isActive
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-border hover:border-primary/30 hover:bg-muted/30"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${isActive ? "bg-primary" : "bg-muted-foreground/30"}`} />
                          <span className="text-[10px] font-medium text-muted-foreground">V{id}</span>
                        </div>
                        <p className={`text-xs font-medium leading-tight ${isActive ? "text-primary" : ""}`}>{label}</p>
                        <CtaTileFooter
                          variantId={id}
                          impressions={stat?.impressions ?? 0}
                          claims={stat?.claims ?? 0}
                          conversionRate={stat?.conversionRate ?? null}
                          inRotation={rotationVariants.has(id)}
                          onRotationChange={(checked) => handleRotationVariantToggle(id, checked)}
                        />
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Gruppe 2: Vorschau + CTA in EINER Karte (gegen Abspringen) */}
            <div className="mb-4">
              <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-2">
                🔥 Integriert – Vorschau + CTA in einer Karte (weniger Bouncen)
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                {(Object.entries(CTA_VARIANT_LABELS) as [string, string][])
                  .filter(([key]) => { const n = Number(key); return n >= 6 && n <= 10; })
                  .map(([key, label]) => {
                    const id = Number(key) as CtaVariantId;
                    const isActive = activeCtaVariant === id;
                    const isLive = id === DEFAULT_CTA_VARIANT;
                    const stat = statsByVariant.get(id);
                    return (
                      <div
                        key={id}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleCtaVariantChange(id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleCtaVariantChange(id);
                          }
                        }}
                        className={`relative text-left p-3 rounded-lg border-2 transition-all cursor-pointer ${
                          isActive
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-amber-300/40 dark:border-amber-700/40 hover:border-primary/40 hover:bg-muted/30"
                        }`}
                      >
                        {isLive && (
                          <span className="absolute -top-2 -right-2 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-emerald-500 text-white rounded-full shadow-sm">
                            Live
                          </span>
                        )}
                        <div className="flex items-center gap-1.5 mb-1">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${isActive ? "bg-primary" : "bg-amber-500/40"}`} />
                          <span className="text-[10px] font-medium text-muted-foreground">V{id}</span>
                        </div>
                        <p className={`text-xs font-medium leading-tight ${isActive ? "text-primary" : ""}`}>{label}</p>
                        <CtaTileFooter
                          variantId={id}
                          impressions={stat?.impressions ?? 0}
                          claims={stat?.claims ?? 0}
                          conversionRate={stat?.conversionRate ?? null}
                          inRotation={rotationVariants.has(id)}
                          onRotationChange={(checked) => handleRotationVariantToggle(id, checked)}
                        />
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Gruppe 3: Nur Zusammenfassung – KEIN Textauszug (gegen Gratis-Leser) */}
            <div>
              <p className="text-[10px] font-semibold text-purple-700 dark:text-purple-400 uppercase tracking-wider mb-2">
                🧠 Nur Zusammenfassung – kein Textauszug (gegen Gratis-Leser)
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-2">
                {(Object.entries(CTA_VARIANT_LABELS) as [string, string][])
                  .filter(([key]) => Number(key) >= 11)
                  .map(([key, label]) => {
                    const id = Number(key) as CtaVariantId;
                    const isActive = activeCtaVariant === id;
                    const isLive = id === DEFAULT_CTA_VARIANT;
                    const stat = statsByVariant.get(id);
                    return (
                      <div
                        key={id}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleCtaVariantChange(id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleCtaVariantChange(id);
                          }
                        }}
                        className={`relative text-left p-3 rounded-lg border-2 transition-all cursor-pointer ${
                          isActive
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-purple-300/40 dark:border-purple-700/40 hover:border-primary/40 hover:bg-muted/30"
                        }`}
                      >
                        {isLive && (
                          <span className="absolute -top-2 -right-2 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-emerald-500 text-white rounded-full shadow-sm">
                            Live
                          </span>
                        )}
                        <div className="flex items-center gap-1.5 mb-1">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${isActive ? "bg-primary" : "bg-purple-500/40"}`} />
                          <span className="text-[10px] font-medium text-muted-foreground">V{id}</span>
                        </div>
                        <p className={`text-xs font-medium leading-tight ${isActive ? "text-primary" : ""}`}>{label}</p>
                        <CtaTileFooter
                          variantId={id}
                          impressions={stat?.impressions ?? 0}
                          claims={stat?.claims ?? 0}
                          conversionRate={stat?.conversionRate ?? null}
                          inRotation={rotationVariants.has(id)}
                          onRotationChange={(checked) => handleRotationVariantToggle(id, checked)}
                        />
                      </div>
                    );
                  })}
              </div>
            </div>

            <div className="mt-6 pt-6 border-t">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Vorschau – Variante {activeCtaVariant}: {CTA_VARIANT_LABELS[activeCtaVariant]}
                </p>
                <div className="flex gap-2">
                  {ctaVariantEmbedsPreview(activeCtaVariant) && !ctaVariantEmbedsQuality(activeCtaVariant) && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40 px-2 py-1 rounded-full">
                      Vorschau integriert
                    </span>
                  )}
                  {ctaVariantEmbedsQuality(activeCtaVariant) && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-purple-700 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/40 px-2 py-1 rounded-full">
                      Nur Zusammenfassung · kein Textauszug
                    </span>
                  )}
                </div>
              </div>
              <div className="rounded-lg border border-dashed border-border bg-background p-4 space-y-4">
                {/* Bei klassischen Varianten zeigen wir, wie die Vorschau-Karte auf der Live-Seite zusätzlich aussieht */}
                {!ctaVariantEmbedsPreview(activeCtaVariant) && (
                  <div className="rounded-lg border bg-card p-5">
                    <h3 className="font-serif text-lg font-semibold mb-3 flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      Transkriptionsvorschau
                    </h3>
                    <p className="font-mono text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                      Frankfurt, 22.07.2025{"\n\n"}Aktenzeichen{"\n"}71846958-8{"\n"}(bitte stets angeben)
                    </p>
                    <p className="mt-3 text-xs text-muted-foreground border-t pt-3">
                      Melden Sie sich kostenlos an, um die vollständige Transkription zu erhalten.
                    </p>
                  </div>
                )}
                <CtaTeaser
                  variant={activeCtaVariant}
                  scriptType="kurrent"
                  quality={{ readability: 4, confidence: 88, issues: ["Leichte Verfärbung des historischen Papiers"], recommendation: "Gut lesbare Kurrentschrift, automatische Transkription problemlos möglich.", level: "green", contentSummary: "Persönlicher Brief aus dem 19. Jahrhundert, vermutlich familiäre Korrespondenz. Der Absender berichtet über den Erhalt eines Briefes und erkundigt sich nach dem Wohlbefinden der Familie." }}
                  transcriptionSnippet={"Frankfurt, 22.07.2025\n\nAktenzeichen\n71846958-8\n(bitte stets angeben)\n\nUniversum Inkasso GmbH\nHanauer Landstraße 164\n60314 Frankfurt\n\nSehr geehrte Damen und Herren,\n\nhiermit möchten wir Sie darüber informieren, dass die oben genannte Angelegenheit bearbeitet wurde. Bitte beachten Sie die folgenden Hinweise zur weiteren Vorgehensweise..."}
                  claiming={false}
                  onAction={() => {}}
                />
              </div>
            </div>

            <AlertDialog
              open={resetDialogOpen}
              onOpenChange={(open) => {
                if (!open && !resetStatsMutation.isPending) setResetDialogOpen(false);
              }}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Alle CTA-Zähler zurücksetzen?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Setzt Impressionen und Claims aller Varianten auf 0. Die Rotation-Einstellungen
                    (Toggle und Variantenauswahl) bleiben erhalten. Dieser Schritt kann nicht
                    rückgängig gemacht werden.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={resetStatsMutation.isPending}>
                    Abbrechen
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={(e) => {
                      e.preventDefault();
                      resetStatsMutation.mutate();
                    }}
                    disabled={resetStatsMutation.isPending}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    data-testid="cta-stats-reset-confirm"
                  >
                    {resetStatsMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Setze zurück…
                      </>
                    ) : (
                      "Zurücksetzen"
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </Card>

          {/* Hero-Varianten-Switcher mit Live-Vorschau (Homepage) */}
          <Card className="p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-2">
              <Megaphone className="h-5 w-5 text-muted-foreground" />
              <h2 className="font-semibold">Hero-Varianten (Startseite)</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Klick auf eine Kachel ändert die <strong className="text-foreground">Standard-Variante</strong> des
              Homepage-Heros (wird ausgespielt, wenn die Rotation aus ist). Gezählt werden Impressionen und
              <strong className="text-foreground"> Uploads</strong> (erster Funnel-Schritt: Besucher wählt im Hero eine Datei).
            </p>

            {/* Rotation-Steuerung */}
            <div className="rounded-lg border bg-muted/30 p-4 mb-5 space-y-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <Shuffle className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div>
                    <div className="flex items-center gap-2">
                      <label htmlFor="hero-rotation-toggle" className="font-medium text-sm cursor-pointer">
                        A/B-Rotation aktiv
                      </label>
                      <Switch
                        id="hero-rotation-toggle"
                        checked={heroRotationEnabled}
                        onCheckedChange={handleHeroRotationToggle}
                        disabled={settingsQuery.isLoading || rotationSettingsMutation.isPending}
                        data-testid="hero-rotation-toggle"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 max-w-xl">
                      Wenn aktiv, wird jeder neue Besucher zufällig einer der unten markierten Varianten zugewiesen
                      (sticky pro Session). Wenn aus, gilt die zuletzt angeklickte Standard-Variante (V{activeHeroVariant}).
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setHeroResetDialogOpen(true)}
                  disabled={heroStatsQuery.isLoading}
                  data-testid="hero-stats-reset-button"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Alle Zähler zurücksetzen
                </Button>
              </div>
              {heroRotationEnabled && heroRotationVariants.size < 2 && (
                <Alert variant="default" className="border-amber-300/60 dark:border-amber-700/60">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle className="text-sm">
                    {heroRotationVariants.size === 0
                      ? "Keine Variante in der Rotation"
                      : "Nur eine Variante in der Rotation"}
                  </AlertTitle>
                  <AlertDescription className="text-xs">
                    {heroRotationVariants.size === 0
                      ? `Solange keine Variante ausgewählt ist, fällt das System auf die Standard-Variante (V${activeHeroVariant}) zurück. Markieren Sie mindestens zwei Varianten unten als „In Rotation".`
                      : "Für einen echten A/B-Test sollten mindestens zwei Varianten markiert sein."}
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Varianten-Kacheln */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {(Object.entries(HERO_VARIANT_LABELS) as [string, string][]).map(([key, label]) => {
                const id = Number(key) as HeroVariantId;
                const isActive = activeHeroVariant === id;
                const stat = heroStatsByVariant.get(id);
                return (
                  <div
                    key={id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleHeroVariantChange(id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleHeroVariantChange(id);
                      }
                    }}
                    title={HERO_VARIANT_HYPOTHESES[id]}
                    className={`text-left p-3 rounded-lg border-2 transition-all cursor-pointer ${
                      isActive
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border hover:border-primary/30 hover:bg-muted/30"
                    }`}
                    data-testid={`hero-variant-tile-${id}`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${isActive ? "bg-primary" : "bg-muted-foreground/30"}`} />
                      <span className="text-[10px] font-medium text-muted-foreground">V{id}</span>
                    </div>
                    <p className={`text-xs font-medium leading-tight ${isActive ? "text-primary" : ""}`}>{label}</p>
                    <HeroTileFooter
                      variantId={id}
                      impressions={stat?.impressions ?? 0}
                      conversions={stat?.conversions ?? 0}
                      conversionRate={stat?.conversionRate ?? null}
                      inRotation={heroRotationVariants.has(id)}
                      onRotationChange={(checked) => handleHeroRotationVariantToggle(id, checked)}
                    />
                  </div>
                );
              })}
            </div>

            {/* Live-Vorschau */}
            <div className="mt-6 pt-6 border-t">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                Vorschau – Variante {activeHeroVariant}: {HERO_VARIANT_LABELS[activeHeroVariant]}
              </p>
              <p className="text-xs text-muted-foreground mb-3 italic">{HERO_VARIANT_HYPOTHESES[activeHeroVariant]}</p>
              <div className="relative rounded-lg overflow-hidden border border-dashed border-border">
                <div className="absolute inset-0">
                  <img src="/images/hero-desk.png" alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/80" />
                </div>
                <div className="relative scale-[0.85] origin-top-left w-[117.6%]">
                  <HeroBlock
                    variant={activeHeroVariant}
                    isLoggedIn={false}
                    dragOver={false}
                    setDragOver={() => {}}
                    fileInputRef={{ current: null }}
                    onFileSelected={() => {}}
                  />
                </div>
              </div>
            </div>

            <AlertDialog
              open={heroResetDialogOpen}
              onOpenChange={(open) => {
                if (!open && !heroResetStatsMutation.isPending) setHeroResetDialogOpen(false);
              }}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Alle Hero-Zähler zurücksetzen?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Setzt Impressionen und Uploads aller Hero-Varianten auf 0. Die Rotation-Einstellungen
                    (Toggle und Variantenauswahl) bleiben erhalten. Dieser Schritt kann nicht rückgängig gemacht werden.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={heroResetStatsMutation.isPending}>Abbrechen</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={(e) => {
                      e.preventDefault();
                      heroResetStatsMutation.mutate();
                    }}
                    disabled={heroResetStatsMutation.isPending}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    data-testid="hero-stats-reset-confirm"
                  >
                    {heroResetStatsMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Setze zurück…
                      </>
                    ) : (
                      "Zurücksetzen"
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </Card>

          {/* Umsatz, Registrierungen & AdWords */}
          <Card className="p-4 sm:p-6">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-muted-foreground shrink-0" />
              <h2 className="font-semibold">Umsatz, Registrierungen & AdWords</h2>
              <div className="ml-auto flex items-center gap-2">
                <input
                  ref={csvInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleCsvUpload}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => csvInputRef.current?.click()}
                  disabled={uploadCsvMutation.isPending}
                >
                  <Upload className="h-3.5 w-3.5 mr-1.5" />
                  {uploadCsvMutation.isPending ? "Importiere…" : "AdWords CSV"}
                </Button>
                {combinedChartData.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {formatDateFull(combinedChartData[0].date)} –{" "}
                    {formatDateFull(combinedChartData[combinedChartData.length - 1].date)}
                  </span>
                )}
              </div>
            </div>

            {/* Series toggles */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              {(Object.keys(combinedRevenueRegChartConfig) as SeriesKey[]).map((key) => {
                const cfg = combinedRevenueRegChartConfig[key];
                const active = activeSeries.has(key);
                return (
                  <button
                    key={key}
                    onClick={() => toggleSeries(key)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
                      active
                        ? "border-current opacity-100"
                        : "border-border opacity-40 hover:opacity-60"
                    }`}
                    style={{ color: active ? cfg.color : undefined }}
                  >
                    {active ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                    {cfg.label}
                  </button>
                );
              })}
            </div>

            {isLoading || userStatsQuery.isLoading ? (
              <Skeleton className="h-[380px] w-full rounded-lg" />
            ) : isError ? (
              <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
                Diagramm nicht verfügbar
              </div>
            ) : combinedChartData.length === 0 ? (
              <div className="h-[200px] flex flex-col items-center justify-center gap-2 text-center text-muted-foreground px-4">
                <p>Keine Zeitreihen-Daten vorhanden.</p>
              </div>
            ) : (
              <ChartContainer
                config={combinedRevenueRegChartConfig}
                className="aspect-auto min-h-[320px] h-[380px] w-full"
              >
                <ComposedChart
                  data={combinedChartData}
                  margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
                >
                  <defs>
                    <linearGradient id="fillGross" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-grossEur)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--color-grossEur)" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="fillNet" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-netEur)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--color-netEur)" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="fillReg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-count)" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="var(--color-count)" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="fillAdCost" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-adCostCents)" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="var(--color-adCostCents)" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="fillNetProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-netProfit)" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="var(--color-netProfit)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="date"
                    xAxisId="main"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={formatDateShort}
                    minTickGap={40}
                  />
                  <YAxis
                    yAxisId="eur"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(v: number) => formatEur(v)}
                    width={80}
                  />
                  <YAxis
                    yAxisId="counts"
                    orientation="right"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    width={50}
                    allowDecimals={false}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        labelFormatter={(_, payload) => {
                          const item = payload?.[0]?.payload as CombinedTimeSeriesPoint | undefined;
                          return item ? formatDateFull(item.date) : "";
                        }}
                        formatter={(value, _name, item) => {
                          const key = String(item.dataKey ?? "") as SeriesKey;
                          const label = combinedRevenueRegChartConfig[key]?.label ?? key;
                          let formatted: string;
                          if (key === "grossEur" || key === "netEur" || key === "netProfit") {
                            formatted = formatEur(value as number);
                          } else if (key === "adCostCents") {
                            formatted = formatEur(value as number);
                          } else {
                            formatted = String(value);
                          }
                          return (
                            <div className="flex w-full flex-wrap items-center justify-between gap-2">
                              <span className="text-muted-foreground">{label}</span>
                              <span className="font-mono font-medium tabular-nums text-foreground">{formatted}</span>
                            </div>
                          );
                        }}
                      />
                    }
                  />
                  {activeSeries.has("grossEur") && (
                    <Area yAxisId="eur" xAxisId="main" dataKey="grossEur" type="monotone" fill="url(#fillGross)" stroke="var(--color-grossEur)" strokeWidth={2} />
                  )}
                  {activeSeries.has("netEur") && (
                    <Area yAxisId="eur" xAxisId="main" dataKey="netEur" type="monotone" fill="url(#fillNet)" stroke="var(--color-netEur)" strokeWidth={2} />
                  )}
                  {activeSeries.has("netProfit") && (
                    <Area yAxisId="eur" xAxisId="main" dataKey="netProfit" type="monotone" fill="url(#fillNetProfit)" stroke="var(--color-netProfit)" strokeWidth={2} />
                  )}
                  {activeSeries.has("adCostCents") && (
                    <Area yAxisId="eur" xAxisId="main" dataKey="adCostCents" type="monotone" fill="url(#fillAdCost)" stroke="var(--color-adCostCents)" strokeWidth={2} />
                  )}
                  {activeSeries.has("count") && (
                    <Bar yAxisId="counts" xAxisId="main" dataKey="count" fill="var(--color-count)" opacity={0.6} radius={[2, 2, 0, 0]} />
                  )}
                  {activeSeries.has("adClicks") && (
                    <Area yAxisId="counts" xAxisId="main" dataKey="adClicks" type="monotone" fill="none" stroke="var(--color-adClicks)" strokeWidth={1.5} strokeDasharray="4 2" />
                  )}
                  {activeSeries.has("adConversions") && (
                    <Bar yAxisId="counts" xAxisId="main" dataKey="adConversions" fill="var(--color-adConversions)" opacity={0.7} radius={[2, 2, 0, 0]} />
                  )}
                  {activeSeries.has("adImpressions") && (
                    <Area yAxisId="counts" xAxisId="main" dataKey="adImpressions" type="monotone" fill="none" stroke="var(--color-adImpressions)" strokeWidth={1} strokeDasharray="6 3" />
                  )}
                </ComposedChart>
              </ChartContainer>
            )}
          </Card>

          {/* Umsatz vs. AdWords-Kosten (Tagesübersicht) */}
          <RevenueVsCostsTable chartData={combinedChartData} isLoading={isLoading || adwordsQuery.isLoading} timeInterval={timeInterval} onTimeIntervalChange={setTimeInterval} />

          {/* Heatmap: Wochentag x Uhrzeit (zahlende Nutzer) */}
          <PayingUserHeatmap
            data={heatmapQuery.data}
            isLoading={heatmapQuery.isLoading}
            isError={heatmapQuery.isError}
          />

          {/* Historische Rechnungen */}
          <Card className="p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <History className="h-5 w-5 text-muted-foreground" />
              <h2 className="font-semibold">Rechnungs-Historie</h2>
              <span className="text-xs text-muted-foreground">
                (neueste zuerst, bis zu 150 Einträge)
              </span>
            </div>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : isError ? (
              <p className="text-sm text-muted-foreground">Tabelle nicht verfügbar</p>
            ) : !data?.recentInvoices?.length ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                Noch keine Rechnungen in der Datenbank.
              </p>
            ) : (
              <ScrollArea className="h-[min(480px,50vh)] rounded-md border">
                <div className="min-w-[640px]">
                  <div className="grid grid-cols-[120px_1fr_100px_100px_140px] gap-2 px-3 py-2 bg-muted/50 border-b text-xs font-medium text-muted-foreground">
                    <span>Datum</span>
                    <span>Rechnung / Beschreibung</span>
                    <span className="text-right">Brutto</span>
                    <span className="text-right">Netto</span>
                    <span>Typ</span>
                  </div>
                  <div className="divide-y">
                    {data.recentInvoices.map((inv) => (
                      <div
                        key={inv.id}
                        className="grid grid-cols-[120px_1fr_100px_100px_140px] gap-2 px-3 py-2.5 items-center text-sm hover:bg-muted/30"
                      >
                        <span className="text-muted-foreground text-xs whitespace-nowrap">
                          {formatInvoiceRowDate(inv.createdAt)}
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{inv.invoiceNumber}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {inv.description}
                            {inv.customerEmail ? ` · ${inv.customerEmail}` : ""}
                          </p>
                        </div>
                        <span className="text-right tabular-nums">
                          {formatEur(inv.grossAmountEur)}
                        </span>
                        <span className="text-right tabular-nums text-muted-foreground">
                          {formatEur(inv.netAmountEur)}
                        </span>
                        <Badge variant="outline" className="justify-self-start text-[10px]">
                          {TYPE_LABELS[inv.type] ?? inv.type}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </ScrollArea>
            )}
          </Card>
        </TabsContent>

        {/* ═══ Tab: Nutzer ═══ */}
        <TabsContent value="users" className="space-y-6">
          <AbuseStatsCard />
          <UserListTable
            users={userStatsQuery.data?.userList}
            isLoading={userStatsQuery.isLoading}
            isError={userStatsQuery.isError}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── KPI Card ──────────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon,
  label,
  data,
  isLoading,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  data: RevenuePeriod | undefined;
  isLoading: boolean;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
      ) : data ? (
        <>
          <p className="text-2xl font-bold tracking-tight">
            {formatEur(data.grossEur)}
          </p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-muted-foreground">
              Netto: {formatEur(data.netEur)}
            </span>
            <span className="text-xs text-muted-foreground">
              {data.count} {data.count === 1 ? "Position" : "Positionen"}
            </span>
          </div>
        </>
      ) : (
        <p className="text-2xl font-bold tracking-tight text-muted-foreground">
          –
        </p>
      )}
    </Card>
  );
}

// ─── Purchase Distribution Cards ───────────────────────────────────────────

function PurchaseDistributionCards({
  data,
  isLoading,
}: {
  data: PurchaseDistribution | undefined;
  isLoading: boolean;
}) {
  const total = data ? data.noPurchase + data.onePurchase + data.twoPlusPurchases : 0;
  const pct = (n: number) => (total > 0 ? ((n / total) * 100).toFixed(1) : "0.0");

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-2 rounded-lg bg-muted">
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
          <span className="text-sm text-muted-foreground">Nie gekauft</span>
        </div>
        {isLoading ? (
          <Skeleton className="h-8 w-20" />
        ) : data ? (
          <>
            <p className="text-2xl font-bold tracking-tight">{data.noPurchase}</p>
            <p className="text-xs text-muted-foreground mt-1">{pct(data.noPurchase)} % aller Nutzer</p>
          </>
        ) : (
          <p className="text-2xl font-bold tracking-tight text-muted-foreground">–</p>
        )}
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-2 rounded-lg bg-blue-500/10">
            <ShoppingCart className="h-4 w-4 text-blue-600" />
          </div>
          <span className="text-sm text-muted-foreground">1x gekauft</span>
        </div>
        {isLoading ? (
          <Skeleton className="h-8 w-20" />
        ) : data ? (
          <>
            <p className="text-2xl font-bold tracking-tight">{data.onePurchase}</p>
            <p className="text-xs text-muted-foreground mt-1">{pct(data.onePurchase)} % aller Nutzer</p>
          </>
        ) : (
          <p className="text-2xl font-bold tracking-tight text-muted-foreground">–</p>
        )}
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-2 rounded-lg bg-green-500/10">
            <ShoppingCart className="h-4 w-4 text-green-600" />
          </div>
          <span className="text-sm text-muted-foreground">2+ gekauft</span>
        </div>
        {isLoading ? (
          <Skeleton className="h-8 w-20" />
        ) : data ? (
          <>
            <p className="text-2xl font-bold tracking-tight">{data.twoPlusPurchases}</p>
            <p className="text-xs text-muted-foreground mt-1">{pct(data.twoPlusPurchases)} % aller Nutzer</p>
          </>
        ) : (
          <p className="text-2xl font-bold tracking-tight text-muted-foreground">–</p>
        )}
      </Card>
    </div>
  );
}

// ─── Revenue vs. AdWords Costs Table ────────────────────────────────────────

const TIME_INTERVAL_LABELS: Record<string, string> = {
  day: "Tag",
  week: "Woche",
  month: "Monat",
};

function RevenueVsCostsTable({
  chartData,
  isLoading,
  timeInterval,
  onTimeIntervalChange,
}: {
  chartData: CombinedTimeSeriesPoint[];
  isLoading: boolean;
  timeInterval: "day" | "week" | "month";
  onTimeIntervalChange: (v: "day" | "week" | "month") => void;
}) {
  const rows = useMemo(() => {
    return [...chartData]
      .filter((p) => p.grossEur > 0 || p.adCostCents > 0 || p.count > 0)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [chartData]);

  if (isLoading) {
    return (
      <Card className="p-4 sm:p-6">
        <Skeleton className="h-[200px] w-full rounded-lg" />
      </Card>
    );
  }

  if (rows.length === 0) return null;

  return (
    <Card className="p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Euro className="h-5 w-5 text-muted-foreground" />
        <h2 className="font-semibold">Umsatz vs. AdWords-Kosten</h2>
        <div className="ml-auto flex items-center gap-1">
          {(["day", "week", "month"] as const).map((interval) => (
            <button
              key={interval}
              onClick={() => onTimeIntervalChange(interval)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-all ${
                timeInterval === interval
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
              }`}
            >
              {TIME_INTERVAL_LABELS[interval]}
            </button>
          ))}
        </div>
      </div>
      <ScrollArea className="h-[min(400px,45vh)] rounded-md border">
        <div className="min-w-[800px]">
          <div className="grid grid-cols-[90px_80px_80px_90px_60px_60px_60px_70px_70px_70px] gap-2 px-3 py-2 bg-muted/50 border-b text-xs font-medium text-muted-foreground sticky top-0 z-10">
            <span>Datum</span>
            <span className="text-right">Brutto</span>
            <span className="text-right">Ad-Kosten</span>
            <span className="text-right">Netto-Gewinn</span>
            <span className="text-right">Klicks</span>
            <span className="text-right">Reg.</span>
            <span className="text-right">Käufe</span>
            <span className="text-right" title="Registrierungen / Klicks">Reg/Klick</span>
            <span className="text-right" title="Brutto-Umsatz / Registrierungen">€/Reg</span>
            <span className="text-right" title="Registrierungen / zahlende Kunden">Reg/Kauf</span>
          </div>
          <div className="divide-y">
            {rows.map((r) => {
              const cpc = r.adClicks > 0 ? r.adCostCents / r.adClicks : 0;
              const regPerClick = r.adClicks > 0 ? (r.count / r.adClicks * 100) : 0;
              const revenuePerReg = r.count > 0 ? r.grossEur / r.count : 0;
              const regPerPurchase = r.purchases > 0 ? r.count / r.purchases : 0;
              return (
                <div
                  key={r.date}
                  className="grid grid-cols-[90px_80px_80px_90px_60px_60px_60px_70px_70px_70px] gap-2 px-3 py-2 items-center text-sm hover:bg-muted/30"
                >
                  <span className="text-xs text-muted-foreground">{formatDateFull(r.date)}</span>
                  <span className="text-right tabular-nums">{r.grossEur > 0 ? formatEur(r.grossEur) : "–"}</span>
                  <span className="text-right tabular-nums text-red-600 dark:text-red-400">
                    {r.adCostCents > 0 ? formatEur(r.adCostCents) : "–"}
                  </span>
                  <span className={`text-right tabular-nums font-medium ${r.netProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                    {r.netEur > 0 || r.adCostCents > 0 ? formatEur(r.netProfit) : "–"}
                  </span>
                  <span className="text-right tabular-nums text-muted-foreground">{r.adClicks || "–"}</span>
                  <span className="text-right tabular-nums text-muted-foreground">{r.count || "–"}</span>
                  <span className="text-right tabular-nums font-medium">{r.purchases || "–"}</span>
                  <span className="text-right tabular-nums text-muted-foreground">
                    {regPerClick > 0 ? `${regPerClick.toFixed(1)} %` : "–"}
                  </span>
                  <span className="text-right tabular-nums text-muted-foreground">
                    {revenuePerReg > 0 ? formatEur(revenuePerReg) : "–"}
                  </span>
                  <span className="text-right tabular-nums text-muted-foreground">
                    {regPerPurchase > 0 ? `${regPerPurchase.toFixed(1)}` : "–"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </ScrollArea>
    </Card>
  );
}

// ─── Paying-User Registration Heatmap ──────────────────────────────────────

const DOW_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

function PayingUserHeatmap({
  data,
  isLoading,
  isError,
}: {
  data: PayingUserHeatmapPoint[] | undefined;
  isLoading: boolean;
  isError: boolean;
}) {
  const { grid, revenueGrid, maxCount, daySummaries } = useMemo(() => {
    const g: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    const rg: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    let max = 0;
    if (data) {
      for (const p of data) {
        if (p.dow >= 0 && p.dow < 7 && p.hour >= 0 && p.hour < 24) {
          g[p.dow][p.hour] = p.count;
          rg[p.dow][p.hour] = p.revenueCents ?? 0;
          if (p.count > max) max = p.count;
        }
      }
    }
    const summaries = g.map((row, dow) => ({
      totalCount: row.reduce((s, v) => s + v, 0),
      totalRevenueCents: rg[dow].reduce((s, v) => s + v, 0),
    }));
    return { grid: g, revenueGrid: rg, maxCount: max, daySummaries: summaries };
  }, [data]);

  const totalPaying = useMemo(() => {
    if (!data) return 0;
    return data.reduce((s, p) => s + p.count, 0);
  }, [data]);

  const cellColor = (count: number) => {
    if (maxCount === 0 || count === 0) return "bg-muted/40";
    const ratio = count / maxCount;
    if (ratio > 0.75) return "bg-emerald-600 text-white";
    if (ratio > 0.5) return "bg-emerald-500 text-white";
    if (ratio > 0.25) return "bg-emerald-400/80 text-emerald-950";
    return "bg-emerald-300/60 text-emerald-900";
  };

  const fmtCentsShort = (c: number) => {
    if (c === 0) return "";
    return (c / 100).toLocaleString("de-DE", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + "€";
  };

  return (
    <Card className="p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <CalendarClock className="h-5 w-5 text-muted-foreground shrink-0" />
        <h2 className="font-semibold">Registrierungs-Zeitpunkt zahlender Nutzer</h2>
        {totalPaying > 0 && (
          <span className="text-xs text-muted-foreground ml-auto">
            {totalPaying} zahlende{totalPaying === 1 ? "r" : ""} Nutzer insgesamt
          </span>
        )}
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        An welchem Wochentag und zu welcher Uhrzeit (MEZ) haben sich die Nutzer registriert, die tatsächlich etwas gekauft haben?
      </p>

      {isLoading ? (
        <Skeleton className="h-[220px] w-full rounded-lg" />
      ) : isError ? (
        <div className="h-[150px] flex items-center justify-center text-sm text-muted-foreground">
          Heatmap nicht verfügbar
        </div>
      ) : maxCount === 0 ? (
        <div className="h-[150px] flex items-center justify-center text-sm text-muted-foreground">
          Noch keine zahlenden Nutzer vorhanden.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[720px]">
            <div className="grid gap-[2px]" style={{ gridTemplateColumns: "40px repeat(24, minmax(0, 1fr)) minmax(90px, auto)" }}>
              <div />
              {Array.from({ length: 24 }, (_, h) => (
                <div key={h} className="text-[10px] text-muted-foreground text-center tabular-nums">
                  {h}
                </div>
              ))}
              <div className="text-[10px] text-muted-foreground text-center font-medium">Gesamt</div>

              {grid.map((row, dow) => (
                <React.Fragment key={dow}>
                  <div className="text-xs font-medium text-muted-foreground flex items-center pr-2 justify-end">
                    {DOW_LABELS[dow]}
                  </div>
                  {row.map((count, hour) => {
                    const rev = revenueGrid[dow][hour];
                    return (
                      <div
                        key={hour}
                        className={`aspect-square rounded-sm flex flex-col items-center justify-center text-[9px] font-medium leading-tight transition-colors ${cellColor(count)}`}
                        title={`${DOW_LABELS[dow]} ${hour}:00 – ${hour}:59 Uhr: ${count} Nutzer · ${formatEur(rev)}`}
                      >
                        {count > 0 && <span>{count}</span>}
                        {rev > 0 && <span className="opacity-70 text-[7px]">({fmtCentsShort(rev)})</span>}
                      </div>
                    );
                  })}
                  <div className="flex flex-col items-center justify-center text-[10px] font-medium bg-muted/30 rounded-sm px-1">
                    <span>{fmtCentsShort(daySummaries[dow].totalRevenueCents) || "–"}</span>
                    <span className="text-[8px] text-muted-foreground">({daySummaries[dow].totalCount} Nutzer)</span>
                  </div>
                </React.Fragment>
              ))}
            </div>

            <div className="flex items-center gap-3 mt-3 text-[10px] text-muted-foreground">
              <span>Weniger</span>
              <div className="flex gap-[2px]">
                <div className="w-3 h-3 rounded-sm bg-muted/40" />
                <div className="w-3 h-3 rounded-sm bg-emerald-300/60" />
                <div className="w-3 h-3 rounded-sm bg-emerald-400/80" />
                <div className="w-3 h-3 rounded-sm bg-emerald-500" />
                <div className="w-3 h-3 rounded-sm bg-emerald-600" />
              </div>
              <span>Mehr</span>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

// ─── Abuse Stats Card ──────────────────────────────────────────────────────

interface AbuseStats {
  totalBlocked: number;
  affectedEmails: number;
}

function AbuseStatsCard() {
  const { data, isLoading } = useQuery<AbuseStats>({
    queryKey: ["/api/admin/abuse-stats"],
    staleTime: 60_000,
  });

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-2 rounded-lg bg-red-500/10">
          <ShieldAlert className="h-4 w-4 text-red-600 dark:text-red-400" />
        </div>
        <span className="text-sm text-muted-foreground">Credit-Farming blockiert</span>
      </div>
      {isLoading ? (
        <Skeleton className="h-8 w-20" />
      ) : data ? (
        <>
          <p className="text-2xl font-bold tracking-tight">{data.totalBlocked}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {data.totalBlocked === 1 ? "Versuch" : "Versuche"} geblockt
            {data.affectedEmails > 0 && ` · ${data.affectedEmails} ${data.affectedEmails === 1 ? "E-Mail betroffen" : "E-Mails betroffen"}`}
          </p>
        </>
      ) : (
        <p className="text-2xl font-bold tracking-tight text-muted-foreground">–</p>
      )}
    </Card>
  );
}

// ─── Sortable User List Table ──────────────────────────────────────────────

function UserListTable({
  users,
  isLoading,
  isError,
}: {
  users: UserListItem[] | undefined;
  isLoading: boolean;
  isError: boolean;
}) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [messageTarget, setMessageTarget] = useState<UserListItem | null>(null);
  const [msgSubject, setMsgSubject] = useState("");
  const [msgContent, setMsgContent] = useState("");

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [mailDialogOpen, setMailDialogOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [ignoreCooldown, setIgnoreCooldown] = useState(false);
  const [ignoreOptIn, setIgnoreOptIn] = useState(false);
  const [lastSendResult, setLastSendResult] = useState<DirectSendResult | null>(null);
  const [audioTarget, setAudioTarget] = useState<UserListItem | null>(null);
  const [resendSyncOpen, setResendSyncOpen] = useState(false);
  const [resendSegmentId, setResendSegmentId] = useState("");
  const [resendRegisteredAfter, setResendRegisteredAfter] = useState("2026-03-16T00:00:00.000Z");
  const [lastResendSyncResult, setLastResendSyncResult] = useState<ResendSegmentSyncResult | null>(null);
  const [creditTarget, setCreditTarget] = useState<UserListItem | null>(null);
  const [creditValue, setCreditValue] = useState("");

  const templatesQuery = useQuery<MarketingTemplate[]>({
    queryKey: ["/api/admin/marketing/templates"],
    enabled: mailDialogOpen,
  });

  const resendSegmentSyncMutation = useMutation({
    mutationFn: async (data: { segmentId?: string; registeredAfter: string }) => {
      const res = await apiRequest("POST", "/api/admin/marketing/resend-segment/sync", data);
      return (await res.json()) as ResendSegmentSyncResult;
    },
    onSuccess: (data) => {
      setLastResendSyncResult(data);
      toast({
        title: "Resend-Segment synchronisiert",
        description: `${data.addedToSegment} Kontakte im Segment · ${data.failed} fehlgeschlagen`,
        variant: data.failed > 0 ? "destructive" : "default",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Resend-Sync fehlgeschlagen",
        description: err?.message ?? "Unbekannter Fehler",
        variant: "destructive",
      });
    },
  });

  const sendTemplateMutation = useMutation({
    mutationFn: async (data: {
      templateId: number;
      userIds: string[];
      ignoreCooldown: boolean;
      ignoreOptIn: boolean;
    }) => {
      const res = await apiRequest("POST", "/api/admin/marketing/send-to-users", data);
      return (await res.json()) as DirectSendResult;
    },
    onSuccess: (data) => {
      setLastSendResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/marketing/sends"] });
      const parts = [`${data.sent} versendet`];
      if (data.failed > 0) parts.push(`${data.failed} fehlgeschlagen`);
      if (data.skipped > 0) parts.push(`${data.skipped} übersprungen`);
      toast({
        title: data.sent > 0 ? "Versand abgeschlossen" : "Kein Versand",
        description: parts.join(" · "),
        variant: data.failed > 0 || (data.sent === 0 && data.skipped > 0) ? "destructive" : "default",
      });
      if (data.sent > 0 && data.failed === 0 && data.skipped === 0) {
        setMailDialogOpen(false);
        setSelectedIds(new Set());
      }
    },
    onError: (err: any) => {
      toast({
        title: "Fehler beim Versand",
        description: err?.message ?? "Unbekannter Fehler",
        variant: "destructive",
      });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: { userId: string; subject: string; content: string }) => {
      const res = await apiRequest("POST", "/api/admin/messages/create", data);
      return res.json();
    },
    onSuccess: (data: { conversationId: number }) => {
      toast({ title: "Nachricht gesendet", description: `Konversation #${data.conversationId} erstellt.` });
      setMessageTarget(null);
      setMsgSubject("");
      setMsgContent("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/messages"] });
    },
    onError: () => {
      toast({ title: "Fehler", description: "Nachricht konnte nicht gesendet werden.", variant: "destructive" });
    },
  });

  const setCreditsMutation = useMutation({
    mutationFn: async (data: { userId: string; credits: number }) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${data.userId}/credits`, {
        credits: data.credits,
      });
      return (await res.json()) as AdminSetCreditsResponse;
    },
    onSuccess: (data) => {
      toast({
        title: "Credit-Stand aktualisiert",
        description: `${data.creditsBefore} → ${data.creditsAfter} Credits`,
      });
      setCreditTarget(null);
      setCreditValue("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (err: any) => {
      toast({
        title: "Credits konnten nicht gesetzt werden",
        description: err?.message ?? "Unbekannter Fehler",
        variant: "destructive",
      });
    },
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const sorted = useMemo(() => {
    if (!users) return [];
    return [...users].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      switch (sortField) {
        case "email":
          return dir * (a.email ?? "").localeCompare(b.email ?? "");
        case "name": {
          const nameA = [a.firstName, a.lastName].filter(Boolean).join(" ");
          const nameB = [b.firstName, b.lastName].filter(Boolean).join(" ");
          return dir * nameA.localeCompare(nameB);
        }
        case "credits":
          return dir * (a.credits - b.credits);
        case "totalPurchasedCredits":
          return dir * (a.totalPurchasedCredits - b.totalPurchasedCredits);
        case "newsletterOptIn":
          return dir * (Number(a.newsletterOptIn) - Number(b.newsletterOptIn));
        case "createdAt":
          return dir * (a.createdAt.localeCompare(b.createdAt));
        case "updatedAt":
          return dir * (a.updatedAt.localeCompare(b.updatedAt));
        case "purchaseCount":
          return dir * (a.purchaseCount - b.purchaseCount);
        case "audioCount":
          return dir * (a.audioCount - b.audioCount);
        default:
          return 0;
      }
    });
  }, [users, sortField, sortDir]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDir === "asc"
      ? <ArrowUp className="h-3 w-3 ml-1" />
      : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const gridCols =
    "grid-cols-[32px_1fr_1fr_70px_70px_35px_120px_120px_60px_60px_130px]";

  const toggleUser = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const visibleIds = useMemo(() => sorted.map((u) => u.id), [sorted]);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
  const someVisibleSelected =
    visibleIds.some((id) => selectedIds.has(id)) && !allVisibleSelected;

  const toggleAllVisible = (checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) visibleIds.forEach((id) => next.add(id));
      else visibleIds.forEach((id) => next.delete(id));
      return next;
    });
  };

  const selectedUsers = useMemo(
    () => (users ?? []).filter((u) => selectedIds.has(u.id)),
    [users, selectedIds],
  );
  const selectedWithoutOptIn = selectedUsers.filter((u) => !u.newsletterOptIn).length;
  const selectedWithoutEmail = selectedUsers.filter((u) => !u.email).length;

  const openMailDialog = (preselect?: UserListItem) => {
    if (preselect) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.add(preselect.id);
        return next;
      });
    }
    setLastSendResult(null);
    setMailDialogOpen(true);
  };

  const openCreditDialog = (user: UserListItem) => {
    setCreditTarget(user);
    setCreditValue(String(user.credits));
  };

  const parsedCreditValue = Number(creditValue);
  const canSubmitCredits =
    creditTarget !== null &&
    creditValue.trim() !== "" &&
    Number.isInteger(parsedCreditValue) &&
    parsedCreditValue >= 0 &&
    !setCreditsMutation.isPending;

  if (isLoading) {
    return (
      <Card className="p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-semibold">Alle Nutzer</h2>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="p-4 sm:p-6">
        <p className="text-sm text-muted-foreground">Nutzerdaten konnten nicht geladen werden.</p>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <Users className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-semibold">Alle Nutzer</h2>
          <span className="text-xs text-muted-foreground">
            ({sorted.length} Nutzer)
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setLastResendSyncResult(null);
                setResendSyncOpen(true);
              }}
            >
              <Mail className="h-4 w-4 mr-2" />
              Resend-Segment syncen
            </Button>
            {selectedIds.size > 0 && (
              <>
                <span className="text-xs text-muted-foreground">
                  {selectedIds.size} ausgewählt
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedIds(new Set())}
                >
                  Auswahl aufheben
                </Button>
                <Button size="sm" onClick={() => openMailDialog()}>
                  <MailPlus className="h-4 w-4 mr-2" />
                  Vorlage senden
                </Button>
              </>
            )}
          </div>
        </div>

        <ScrollArea className="h-[min(600px,65vh)] rounded-md border">
          <div className="min-w-[980px]">
            <div className={`grid ${gridCols} gap-2 px-3 py-2 bg-muted/50 border-b text-xs font-medium text-muted-foreground sticky top-0 z-10`}>
              <span className="flex items-center justify-center">
                <Checkbox
                  checked={allVisibleSelected ? true : someVisibleSelected ? "indeterminate" : false}
                  onCheckedChange={(v) => toggleAllVisible(v === true)}
                  aria-label="Alle sichtbaren auswählen"
                />
              </span>
              <button className="flex items-center text-left hover:text-foreground transition-colors" onClick={() => handleSort("email")}>
                E-Mail <SortIcon field="email" />
              </button>
              <button className="flex items-center text-left hover:text-foreground transition-colors" onClick={() => handleSort("name")}>
                Name <SortIcon field="name" />
              </button>
              <button className="flex items-center text-right justify-end hover:text-foreground transition-colors" onClick={() => handleSort("credits")}>
                Credits <SortIcon field="credits" />
              </button>
              <button className="flex items-center text-right justify-end hover:text-foreground transition-colors" onClick={() => handleSort("totalPurchasedCredits")}>
                Gekauft <SortIcon field="totalPurchasedCredits" />
              </button>
              <button className="flex items-center justify-center hover:text-foreground transition-colors" onClick={() => handleSort("newsletterOptIn")} title="Newsletter">
                NL <SortIcon field="newsletterOptIn" />
              </button>
              <button className="flex items-center text-left hover:text-foreground transition-colors" onClick={() => handleSort("createdAt")}>
                Anmeldung <SortIcon field="createdAt" />
              </button>
              <button className="flex items-center text-left hover:text-foreground transition-colors" onClick={() => handleSort("updatedAt")}>
                Letzter Login <SortIcon field="updatedAt" />
              </button>
              <button className="flex items-center text-right justify-end hover:text-foreground transition-colors" onClick={() => handleSort("purchaseCount")}>
                Käufe <SortIcon field="purchaseCount" />
              </button>
              <button className="flex items-center text-right justify-end hover:text-foreground transition-colors" onClick={() => handleSort("audioCount")} title="Anzahl erzeugter Audiodateien">
                Audio <SortIcon field="audioCount" />
              </button>
              <span className="text-center">Aktion</span>
            </div>
            <div className="divide-y">
              {sorted.map((u) => (
                <div
                  key={u.id}
                  className={`grid ${gridCols} gap-2 px-3 py-2.5 items-center text-sm hover:bg-muted/30 ${selectedIds.has(u.id) ? "bg-primary/5" : ""}`}
                >
                  <span className="flex items-center justify-center">
                    <Checkbox
                      checked={selectedIds.has(u.id)}
                      onCheckedChange={(v) => toggleUser(u.id, v === true)}
                      aria-label={`${u.email ?? u.id} auswählen`}
                    />
                  </span>
                  <span className="truncate">{u.email ?? "–"}</span>
                  <span className="truncate text-muted-foreground">
                    {[u.firstName, u.lastName].filter(Boolean).join(" ") || "–"}
                  </span>
                  <span className="text-right tabular-nums font-medium">{u.credits}</span>
                  <span className="text-right tabular-nums text-muted-foreground">{u.totalPurchasedCredits}</span>
                  <span className="flex justify-center">
                    <span className={`inline-block w-2 h-2 rounded-full ${u.newsletterOptIn ? "bg-green-500" : "bg-muted-foreground/30"}`} title={u.newsletterOptIn ? "Ja" : "Nein"} />
                  </span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDateTime(u.createdAt)}
                  </span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDateTime(u.updatedAt)}
                  </span>
                  <span className="text-right tabular-nums">{u.purchaseCount}</span>
                  <span className={`text-right tabular-nums ${u.audioCount > 0 ? "font-medium" : "text-muted-foreground"}`}>
                    {u.audioCount}
                  </span>
                  <div className="flex items-center justify-center gap-1">
                    <button
                      title="Credit-Stand setzen"
                      className="p-1 rounded hover:bg-muted transition-colors"
                      onClick={() => openCreditDialog(u)}
                    >
                      <Wallet className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                    </button>
                    <button
                      title={u.audioCount > 0 ? "Audiodateien anzeigen" : "Keine Audiodateien"}
                      className="p-1 rounded hover:bg-muted transition-colors disabled:opacity-40"
                      disabled={u.audioCount === 0}
                      onClick={() => setAudioTarget(u)}
                    >
                      <Headphones className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                    </button>
                    <button
                      title="Vorlage per E-Mail senden"
                      className="p-1 rounded hover:bg-muted transition-colors disabled:opacity-40"
                      disabled={!u.email}
                      onClick={() => openMailDialog(u)}
                    >
                      <MailPlus className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                    </button>
                    <button
                      title="Interne Nachricht senden"
                      className="p-1 rounded hover:bg-muted transition-colors"
                      onClick={() => { setMessageTarget(u); setMsgSubject(""); setMsgContent(""); }}
                    >
                      <Mail className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                    </button>
                    <button
                      title="Konversationen anzeigen"
                      className="p-1 rounded hover:bg-muted transition-colors"
                      onClick={() => navigate(`/app/admin/support?user=${u.id}`)}
                    >
                      <MessageSquare className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>
      </Card>

      {/* Credits setzen Dialog */}
      <Dialog
        open={creditTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCreditTarget(null);
            setCreditValue("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Credit-Stand setzen</DialogTitle>
            <DialogDescription>
              {creditTarget?.email ?? creditTarget?.id ?? "Nutzer"} · aktuell{" "}
              {creditTarget?.credits ?? 0} Credits
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Label htmlFor="admin-credit-value">Neuer Credit-Stand</Label>
            <Input
              id="admin-credit-value"
              type="number"
              min={0}
              step={1}
              value={creditValue}
              onChange={(e) => setCreditValue(e.target.value)}
              placeholder="0"
            />
            <p className="text-xs text-muted-foreground">
              Der vorhandene Stand wird direkt auf diesen Wert gesetzt, nicht addiert.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreditTarget(null);
                setCreditValue("");
              }}
              disabled={setCreditsMutation.isPending}
            >
              Abbrechen
            </Button>
            <Button
              disabled={!canSubmitCredits}
              onClick={() => {
                if (!creditTarget || !canSubmitCredits) return;
                setCreditsMutation.mutate({
                  userId: creditTarget.id,
                  credits: parsedCreditValue,
                });
              }}
            >
              {setCreditsMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resend Segment Sync Dialog */}
      <Dialog
        open={resendSyncOpen}
        onOpenChange={(open) => {
          setResendSyncOpen(open);
          if (!open) {
            setLastResendSyncResult(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Resend-Marketing-Segment synchronisieren</DialogTitle>
            <DialogDescription>
              Synchronisiert alle Nutzer mit Newsletter-Opt-In und Anmeldung ab dem Stichtag in ein Resend Segment.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="resend-segment-id">Resend Segment-ID</Label>
              <Input
                id="resend-segment-id"
                value={resendSegmentId}
                onChange={(e) => setResendSegmentId(e.target.value)}
                placeholder="Leer lassen, wenn RESEND_MARKETING_SEGMENT_ID gesetzt ist"
              />
              <p className="text-xs text-muted-foreground">
                Resend nennt Audiences inzwischen Segments. Die ID findest du im Resend Dashboard beim Segment.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="resend-registered-after">Angemeldet ab</Label>
              <Input
                id="resend-registered-after"
                value={resendRegisteredAfter}
                onChange={(e) => setResendRegisteredAfter(e.target.value)}
                placeholder="2026-03-16T00:00:00.000Z"
              />
            </div>

            {lastResendSyncResult && (
              <Alert>
                <AlertTitle>Sync-Ergebnis</AlertTitle>
                <AlertDescription>
                  <div className="text-xs space-y-1 mt-1">
                    <div>
                      {lastResendSyncResult.totalEligible} passend · {lastResendSyncResult.created} neu ·{" "}
                      {lastResendSyncResult.updated} aktualisiert · {lastResendSyncResult.addedToSegment} im Segment ·{" "}
                      {lastResendSyncResult.failed} fehlgeschlagen
                    </div>
                    {lastResendSyncResult.errors.length > 0 && (
                      <ScrollArea className="h-24 mt-2 rounded border p-2 bg-background">
                        <ul className="space-y-0.5">
                          {lastResendSyncResult.errors.slice(0, 20).map((err) => (
                            <li key={err.email} className="truncate">
                              <span className="text-muted-foreground">{err.email}:</span>{" "}
                              <span className="text-destructive">{err.message}</span>
                            </li>
                          ))}
                        </ul>
                      </ScrollArea>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setResendSyncOpen(false)}
              disabled={resendSegmentSyncMutation.isPending}
            >
              Schließen
            </Button>
            <Button
              disabled={
                resendSegmentSyncMutation.isPending ||
                !resendRegisteredAfter.trim()
              }
              onClick={() =>
                resendSegmentSyncMutation.mutate({
                  segmentId: resendSegmentId.trim() || undefined,
                  registeredAfter: resendRegisteredAfter.trim(),
                })
              }
            >
              {resendSegmentSyncMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Synchronisiere…
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Sync starten
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Template (Marketing) Dialog */}
      <Dialog
        open={mailDialogOpen}
        onOpenChange={(open) => {
          setMailDialogOpen(open);
          if (!open) {
            setLastSendResult(null);
            setSelectedTemplateId("");
            setIgnoreCooldown(false);
            setIgnoreOptIn(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>E-Mail-Vorlage an Nutzer senden</DialogTitle>
            <DialogDescription>
              {selectedUsers.length} {selectedUsers.length === 1 ? "Nutzer" : "Nutzer"} ausgewählt. Der Versand wird im Marketing-Log
              protokolliert und zählt zum 48h-Cooldown dieses Nutzers.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Empfängerliste */}
            <div className="space-y-2">
              <Label>Empfänger</Label>
              <ScrollArea className="h-32 rounded-md border p-2">
                <div className="space-y-1 text-xs">
                  {selectedUsers.length === 0 ? (
                    <p className="text-muted-foreground">Keine Nutzer ausgewählt.</p>
                  ) : (
                    selectedUsers.map((u) => (
                      <div
                        key={u.id}
                        className="flex items-center justify-between gap-2"
                      >
                        <span className="truncate">
                          {u.email ?? "(keine E-Mail)"}
                          {(u.firstName || u.lastName) && (
                            <span className="text-muted-foreground ml-2">
                              {[u.firstName, u.lastName].filter(Boolean).join(" ")}
                            </span>
                          )}
                        </span>
                        <div className="flex items-center gap-1">
                          {!u.newsletterOptIn && (
                            <span className="text-amber-600" title="Kein Newsletter-Opt-In">
                              <AlertTriangle className="h-3 w-3" />
                            </span>
                          )}
                          <button
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => toggleUser(u.id, false)}
                            title="Entfernen"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
              {(selectedWithoutOptIn > 0 || selectedWithoutEmail > 0) && (
                <Alert variant="default" className="border-amber-500/50">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <AlertDescription className="text-xs">
                    {selectedWithoutOptIn > 0 && (
                      <div>
                        {selectedWithoutOptIn} Nutzer ohne Newsletter-Opt-In werden standardmäßig übersprungen.
                      </div>
                    )}
                    {selectedWithoutEmail > 0 && (
                      <div>{selectedWithoutEmail} Nutzer ohne E-Mail werden übersprungen.</div>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Template-Auswahl */}
            <div className="space-y-2">
              <Label htmlFor="tpl-select">Vorlage</Label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger id="tpl-select">
                  <SelectValue
                    placeholder={
                      templatesQuery.isLoading ? "Lade Vorlagen…" : "Vorlage auswählen…"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {(templatesQuery.data ?? []).map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.name}
                      <span className="text-muted-foreground ml-2 text-xs">
                        — {t.subject}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {templatesQuery.data?.length === 0 && !templatesQuery.isLoading && (
                <p className="text-xs text-muted-foreground">
                  Noch keine Vorlagen angelegt. Erstelle eine unter{" "}
                  <button
                    className="underline"
                    onClick={() => navigate("/app/admin/marketing")}
                  >
                    Admin › Marketing
                  </button>
                  .
                </p>
              )}
            </div>

            {/* Erweiterte Optionen */}
            <div className="space-y-2 rounded-md border p-3 bg-muted/30">
              <div className="flex items-start gap-2">
                <Checkbox
                  id="ignore-cooldown"
                  checked={ignoreCooldown}
                  onCheckedChange={(v) => setIgnoreCooldown(v === true)}
                />
                <div className="grid gap-0.5 leading-none">
                  <label htmlFor="ignore-cooldown" className="text-sm font-medium cursor-pointer">
                    48h-Cooldown ignorieren
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Sendet auch dann, wenn der Nutzer kürzlich schon eine Marketing-Mail bekommen hat.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Checkbox
                  id="ignore-optin"
                  checked={ignoreOptIn}
                  onCheckedChange={(v) => setIgnoreOptIn(v === true)}
                />
                <div className="grid gap-0.5 leading-none">
                  <label htmlFor="ignore-optin" className="text-sm font-medium cursor-pointer">
                    Opt-In ignorieren <span className="text-destructive">(rechtlich heikel)</span>
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Nur für transaktionale/dringende Nachrichten. Marketing ohne Einwilligung ist unzulässig.
                  </p>
                </div>
              </div>
            </div>

            {/* Ergebnis des letzten Sendevorgangs */}
            {lastSendResult && (
              <Alert>
                <AlertTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Ergebnis
                </AlertTitle>
                <AlertDescription>
                  <div className="text-xs space-y-1 mt-1">
                    <div>
                      {lastSendResult.sent} versendet · {lastSendResult.skipped} übersprungen ·{" "}
                      {lastSendResult.failed} fehlgeschlagen
                    </div>
                    {lastSendResult.perUser.some((r) => r.status !== "sent") && (
                      <ScrollArea className="h-24 mt-2 rounded border p-2 bg-background">
                        <ul className="space-y-0.5">
                          {lastSendResult.perUser
                            .filter((r) => r.status !== "sent")
                            .map((r) => (
                              <li key={r.userId} className="truncate">
                                <span className="text-muted-foreground">{r.email || r.userId}:</span>{" "}
                                <span className="text-destructive">{r.status}</span>
                                {r.error ? ` – ${r.error}` : ""}
                              </li>
                            ))}
                        </ul>
                      </ScrollArea>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setMailDialogOpen(false)}
              disabled={sendTemplateMutation.isPending}
            >
              Schließen
            </Button>
            <Button
              disabled={
                !selectedTemplateId ||
                selectedUsers.length === 0 ||
                sendTemplateMutation.isPending
              }
              onClick={() => {
                const templateId = parseInt(selectedTemplateId, 10);
                if (!templateId) return;
                sendTemplateMutation.mutate({
                  templateId,
                  userIds: Array.from(selectedIds),
                  ignoreCooldown,
                  ignoreOptIn,
                });
              }}
            >
              {sendTemplateMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              An {selectedUsers.length} Nutzer senden
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Message Dialog */}
      <Dialog open={messageTarget !== null} onOpenChange={(open) => { if (!open) setMessageTarget(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nachricht an Nutzer senden</DialogTitle>
            <DialogDescription>
              {messageTarget?.email ?? "Unbekannt"}{" "}
              {messageTarget?.firstName || messageTarget?.lastName
                ? `(${[messageTarget.firstName, messageTarget.lastName].filter(Boolean).join(" ")})`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="msg-subject">Betreff</Label>
              <Input
                id="msg-subject"
                placeholder="Betreff der Nachricht…"
                value={msgSubject}
                onChange={(e) => setMsgSubject(e.target.value)}
                maxLength={200}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="msg-content">Nachricht</Label>
              <Textarea
                id="msg-content"
                placeholder="Ihre Nachricht an den Nutzer…"
                value={msgContent}
                onChange={(e) => setMsgContent(e.target.value)}
                rows={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMessageTarget(null)}>
              Abbrechen
            </Button>
            <Button
              disabled={!msgSubject.trim() || !msgContent.trim() || sendMessageMutation.isPending}
              onClick={() => {
                if (!messageTarget) return;
                sendMessageMutation.mutate({
                  userId: messageTarget.id,
                  subject: msgSubject.trim(),
                  content: msgContent.trim(),
                });
              }}
            >
              {sendMessageMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Senden
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Audio Dialog */}
      <UserAudioDialog
        user={audioTarget}
        onClose={() => setAudioTarget(null)}
      />
    </>
  );
}

// ─── User Audio Dialog ─────────────────────────────────────────────────────

function formatAudioDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "–";
  return d.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getVersionLabel(version: string): string {
  switch (version) {
    case "original": return "Original";
    case "completed": return "Vervollständigt";
    case "interpreted": return "Interpretiert";
    default: return version;
  }
}

function getPagesLabel(pages: number[] | "all"): string {
  if (pages === "all") return "Alle Seiten";
  if (Array.isArray(pages) && pages.length === 1) return `Seite ${pages[0]}`;
  if (Array.isArray(pages)) return `${pages.length} Seiten`;
  return "";
}

function UserAudioDialog({
  user,
  onClose,
}: {
  user: UserListItem | null;
  onClose: () => void;
}) {
  const open = user !== null;
  const userId = user?.id ?? null;

  const { data, isLoading, isError } = useQuery<AdminUserAudioResponse>({
    queryKey: [`/api/admin/users/${userId}/audio`],
    enabled: open && userId !== null,
    staleTime: 30_000,
  });

  const generations = data?.generations ?? [];

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Headphones className="h-5 w-5 text-muted-foreground" />
            Audiodateien
            {user && (
              <span className="text-sm font-normal text-muted-foreground">
                · {user.email ?? user.id}
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            {user
              ? `${user.audioCount} ${user.audioCount === 1 ? "erzeugte Audiodatei" : "erzeugte Audiodateien"}`
              : ""}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-3 py-2">
            {isLoading ? (
              <>
                <Skeleton className="h-24 w-full rounded-md" />
                <Skeleton className="h-24 w-full rounded-md" />
                <Skeleton className="h-24 w-full rounded-md" />
              </>
            ) : isError ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Fehler</AlertTitle>
                <AlertDescription>
                  Audiodateien konnten nicht geladen werden.
                </AlertDescription>
              </Alert>
            ) : generations.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Keine Audiodateien vorhanden.
              </p>
            ) : (
              generations.map((g) => {
                const downloadName = g.audioUrl
                  ? g.audioUrl.split("/").pop() ?? `audio-${g.id}.mp3`
                  : `audio-${g.id}.mp3`;
                return (
                  <div
                    key={g.id}
                    className="rounded-lg border p-3 space-y-2 bg-muted/20"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <Badge variant="outline">{g.voice}</Badge>
                      <Badge variant="secondary">{getVersionLabel(g.version)}</Badge>
                      <Badge variant="outline">{g.lang}</Badge>
                      <Badge variant="outline">{getPagesLabel(g.pages)}</Badge>
                      {g.creditsUsed > 0 && (
                        <Badge variant="outline" className="text-amber-600">
                          {g.creditsUsed} Credits
                        </Badge>
                      )}
                      <span className="ml-auto text-muted-foreground whitespace-nowrap">
                        {formatAudioDateTime(g.createdAt)}
                      </span>
                    </div>

                    {g.textSnippet && (
                      <p className="text-xs text-muted-foreground italic line-clamp-2">
                        „{g.textSnippet}…"
                      </p>
                    )}

                    {g.audioUrl ? (
                      <div className="flex items-center gap-2">
                        <audio
                          controls
                          preload="none"
                          src={g.audioUrl}
                          className="flex-1 h-9"
                        />
                        <a
                          href={g.audioUrl}
                          download={downloadName}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center h-9 px-3 rounded-md border text-xs hover:bg-muted transition-colors"
                          title="Herunterladen"
                        >
                          <Download className="h-3.5 w-3.5 mr-1" />
                          Download
                        </a>
                      </div>
                    ) : (
                      <p className="text-xs text-destructive">
                        Keine Audio-URL verfügbar
                      </p>
                    )}

                    <div className="text-[10px] text-muted-foreground font-mono">
                      Job #{g.jobId} · Generation #{g.id}
                      {g.jobScriptType ? ` · ${g.jobScriptType}` : ""}
                      {g.jobTotalPages ? ` · ${g.jobTotalPages} S.` : ""}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Schließen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
