import { useState } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useQuery } from "@tanstack/react-query";
import { getAuthHeaders } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Coins,
  ArrowUpDown,
  ChevronDown,
  DollarSign,
  FileText,
  Zap,
  Users,
  ExternalLink,
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getScriptTypeDisplayLabel } from "@shared/models/transcription";

type TokenUsageUser = {
  userId: string;
  name: string | null;
  email: string | null;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsd: number;
  pageCount: number;
  jobCount: number;
  lastActivity: string | null;
};

type TokenUsageResponse = {
  users: TokenUsageUser[];
  totals: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    costUsd: number;
    pageCount: number;
  };
  pricing: {
    model: string;
    inputPricePerM: number;
    outputPricePerM: number;
  };
};

type TokenUsageJob = {
  id: number;
  scriptType: string;
  status: string;
  totalPages: number;
  createdAt: string | null;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsd: number;
  textSnippet: string | null;
  completedPages: number;
};

type TokenUsageJobsResponse = { jobs: TokenUsageJob[] };

type SortField = "totalTokens" | "costUsd" | "pageCount" | "lastActivity";

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString("de-DE");
}

function formatCost(usd: number): string {
  return `$${usd.toFixed(4)}`;
}

function formatCostEur(usd: number): string {
  const eur = usd * 0.92;
  return `~€${eur.toFixed(2)}`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "–";
  return new Date(dateStr).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminTokenUsagePage() {
  const { t } = useTranslation();
  const [days, setDays] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("totalTokens");
  const [sortAsc, setSortAsc] = useState(false);

  const queryDays = days === "all" ? undefined : days;

  const { data, isLoading } = useQuery<TokenUsageResponse>({
    queryKey: ["/api/admin/token-usage", queryDays],
    queryFn: async () => {
      const url = queryDays
        ? `/api/admin/token-usage?days=${queryDays}`
        : "/api/admin/token-usage";
      const headers = await getAuthHeaders();
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error(t("adminTokens.errorLoading"));
      return res.json();
    },
    staleTime: 30_000,
  });

  const sortedUsers = data?.users
    ? [...data.users].sort((a, b) => {
        let cmp = 0;
        if (sortField === "lastActivity") {
          const da = a.lastActivity ? new Date(a.lastActivity).getTime() : 0;
          const db_ = b.lastActivity ? new Date(b.lastActivity).getTime() : 0;
          cmp = da - db_;
        } else {
          cmp = (a[sortField] ?? 0) - (b[sortField] ?? 0);
        }
        return sortAsc ? cmp : -cmp;
      })
    : [];

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  }

  function SortButton({ field, children }: { field: SortField; children: React.ReactNode }) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 h-8 font-medium"
        onClick={() => toggleSort(field)}
      >
        {children}
        <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
      </Button>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  const totals = data?.totals;
  const pricing = data?.pricing;

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("adminTokens.pageTitle")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("adminTokens.pageSubtitle")}
            {pricing && (
              <span className="ml-2">
                <Badge variant="secondary" className="text-[10px]">
                  {pricing.model}
                </Badge>
              </span>
            )}
          </p>
        </div>
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">{t("adminTokens.last7Days")}</SelectItem>
            <SelectItem value="30">{t("adminTokens.last30Days")}</SelectItem>
            <SelectItem value="90">{t("adminTokens.last90Days")}</SelectItem>
            <SelectItem value="all">{t("adminTokens.allTime")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("adminTokens.totalCost")}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCost(totals?.costUsd ?? 0)}</div>
            <p className="text-xs text-muted-foreground">{formatCostEur(totals?.costUsd ?? 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("adminTokens.inputTokens")}</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totals?.inputTokens ?? 0)}</div>
            <p className="text-xs text-muted-foreground">
              {t("adminTokens.pricePerMillion", { price: pricing?.inputPricePerM ?? 0 })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("adminTokens.outputTokens")}</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totals?.outputTokens ?? 0)}</div>
            <p className="text-xs text-muted-foreground">
              {t("adminTokens.pricePerMillion", { price: pricing?.outputPricePerM ?? 0 })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("adminTokens.pagesTranscribed")}</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals?.pageCount ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              {t("adminTokens.userCount", { count: sortedUsers.length })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* User Table */}
      {sortedUsers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-medium">{t("adminTokens.emptyTitle")}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {t("adminTokens.emptyBody")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>{t("adminTokens.colUser")}</TableHead>
                <TableHead className="text-right">{t("adminTokens.colInput")}</TableHead>
                <TableHead className="text-right">{t("adminTokens.colOutput")}</TableHead>
                <TableHead className="text-right">
                  <SortButton field="totalTokens">{t("adminTokens.colTotal")}</SortButton>
                </TableHead>
                <TableHead className="text-right">
                  <SortButton field="costUsd">{t("adminTokens.colCost")}</SortButton>
                </TableHead>
                <TableHead className="text-right">
                  <SortButton field="pageCount">{t("adminTokens.colPages")}</SortButton>
                </TableHead>
                <TableHead className="text-right">
                  <SortButton field="lastActivity">{t("adminTokens.colLastActivity")}</SortButton>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedUsers.map((user) => (
                <UserRow key={user.userId} user={user} queryDays={queryDays} />
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

function JobStatusBadge({ status, completedPages, totalPages, t }: { status: string; completedPages: number; totalPages: number; t: TFunction }) {
  switch (status) {
    case "completed":
      return (
        <Badge variant="secondary" className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px]">
          <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
          {t("adminTokens.statusDone")}
        </Badge>
      );
    case "processing":
      return (
        <Badge variant="secondary" className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px]">
          <Loader2 className="h-2.5 w-2.5 mr-0.5 animate-spin" />
          {totalPages > 0 ? `${completedPages}/${totalPages}` : "…"}
        </Badge>
      );
    case "preview":
      return (
        <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-[10px]">
          <Clock className="h-2.5 w-2.5 mr-0.5" />
          {t("adminTokens.statusPreview")}
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" className="text-[10px]">
          <AlertCircle className="h-2.5 w-2.5 mr-0.5" />
          {status}
        </Badge>
      );
  }
}

function UserRow({ user, queryDays }: { user: TokenUsageUser; queryDays: string | undefined }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [, navigate] = useLocation();

  const { data: jobsData, isLoading: jobsLoading } = useQuery<TokenUsageJobsResponse>({
    queryKey: ["/api/admin/token-usage", user.userId, "jobs", queryDays],
    queryFn: async () => {
      const url = queryDays
        ? `/api/admin/token-usage/${encodeURIComponent(user.userId)}/jobs?days=${queryDays}`
        : `/api/admin/token-usage/${encodeURIComponent(user.userId)}/jobs`;
      const headers = await getAuthHeaders();
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error(t("adminTokens.errorLoadingDocs"));
      return res.json();
    },
    enabled: open,
    staleTime: 30_000,
  });

  const jobs = jobsData?.jobs ?? [];

  return (
    <>
      <TableRow
        className="cursor-pointer hover:bg-muted/50"
        onClick={() => setOpen(!open)}
      >
        <TableCell>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
        </TableCell>
        <TableCell>
          <div>
            <p className="font-medium text-sm">
              {user.name || t("adminTokens.unnamed")}
            </p>
            <p className="text-xs text-muted-foreground">{user.email || user.userId}</p>
          </div>
        </TableCell>
        <TableCell className="text-right tabular-nums text-sm">
          {formatNumber(user.inputTokens)}
        </TableCell>
        <TableCell className="text-right tabular-nums text-sm">
          {formatNumber(user.outputTokens)}
        </TableCell>
        <TableCell className="text-right tabular-nums text-sm font-medium">
          {formatNumber(user.totalTokens)}
        </TableCell>
        <TableCell className="text-right tabular-nums text-sm font-medium">
          {formatCost(user.costUsd)}
        </TableCell>
        <TableCell className="text-right tabular-nums text-sm">
          {user.pageCount}
        </TableCell>
        <TableCell className="text-right text-sm text-muted-foreground">
          {formatDate(user.lastActivity)}
        </TableCell>
      </TableRow>
      {open && (
        <TableRow className="bg-muted/30">
          <TableCell colSpan={8} className="p-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">{t("adminTokens.detailJobs")}</p>
                  <p className="font-medium">{user.jobCount}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">{t("adminTokens.detailPagesPerJob")}</p>
                  <p className="font-medium">
                    {user.jobCount > 0 ? (user.pageCount / user.jobCount).toFixed(1) : "–"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">{t("adminTokens.detailCostPerPage")}</p>
                  <p className="font-medium">
                    {user.pageCount > 0 ? formatCost(user.costUsd / user.pageCount) : "–"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">{t("adminTokens.detailCostEur")}</p>
                  <p className="font-medium">{formatCostEur(user.costUsd)}</p>
                </div>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{t("adminTokens.documents")}</h4>
                {jobsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("adminTokens.documentsLoading")}
                  </div>
                ) : jobs.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">{t("adminTokens.noDocuments")}</p>
                ) : (
                  <div className="border rounded-md overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                          <TableHead className="text-xs">{t("adminTokens.jobColScript")}</TableHead>
                          <TableHead className="text-xs">{t("adminTokens.jobColStatus")}</TableHead>
                          <TableHead className="text-xs text-right">{t("adminTokens.jobColPages")}</TableHead>
                          <TableHead className="text-xs text-right">{t("adminTokens.jobColInput")}</TableHead>
                          <TableHead className="text-xs text-right">{t("adminTokens.jobColOutput")}</TableHead>
                          <TableHead className="text-xs text-right">{t("adminTokens.jobColTotal")}</TableHead>
                          <TableHead className="text-xs text-right">{t("adminTokens.jobColCost")}</TableHead>
                          <TableHead className="text-xs">{t("adminTokens.jobColSnippet")}</TableHead>
                          <TableHead className="text-xs">{t("adminTokens.jobColCreated")}</TableHead>
                          <TableHead className="text-xs w-20" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {jobs.map((job) => (
                          <TableRow key={job.id} className="text-sm">
                            <TableCell className="py-2">
                              {getScriptTypeDisplayLabel(job.scriptType)}
                            </TableCell>
                            <TableCell className="py-2">
                              <JobStatusBadge
                                status={job.status}
                                completedPages={job.completedPages}
                                totalPages={job.totalPages}
                                t={t}
                              />
                            </TableCell>
                            <TableCell className="text-right tabular-nums py-2">
                              {job.completedPages}/{job.totalPages}
                            </TableCell>
                            <TableCell className="text-right tabular-nums py-2">
                              {formatNumber(job.inputTokens)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums py-2">
                              {formatNumber(job.outputTokens)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums font-medium py-2">
                              {formatNumber(job.totalTokens)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums py-2">
                              {formatCost(job.costUsd)}
                            </TableCell>
                            <TableCell className="max-w-[180px] truncate text-muted-foreground py-2" title={job.textSnippet ?? undefined}>
                              {job.textSnippet ? job.textSnippet + (job.textSnippet.length >= 100 ? "…" : "") : "–"}
                            </TableCell>
                            <TableCell className="text-muted-foreground py-2">
                              {formatDate(job.createdAt)}
                            </TableCell>
                            <TableCell className="py-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/app/result/${job.id}`);
                                }}
                              >
                                <ExternalLink className="h-3 w-3 mr-1" />
                                {t("adminTokens.view")}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
