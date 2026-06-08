import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, FileText, Loader2, Euro, Calendar, CheckCircle2 } from "lucide-react";
import { DocumentPreview } from "@/components/document-preview";
import { getScriptTypeDisplayLabel } from "@shared/models/transcription";

interface HumanTranscriptionRequest {
  id: number;
  jobId: number;
  userId: string;
  status: string;
  urgency: string;
  accuracyLevel: string;
  budgetRange: string;
  customerNotes: string | null;
  quotePriceEur: number | null;
  quoteMessage: string | null;
  quoteDeadline: string | null;
  quotedAt: string | null;
  respondedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  expert?: { companyName: string | null; contactName: string | null; email: string | null } | null;
}

interface AdminRequestDetail {
  request: HumanTranscriptionRequest;
  expert: { id: number; companyName: string | null; contactName: string | null; email: string | null } | null;
  job: { id: number; scriptType: string; totalPages: number; status: string } | null;
  pages: { pageNumber: number; imageUrl: string; transcription: string | null; isPreview: boolean; qualityDetails: unknown }[];
  previewPage: { imageUrl: string; transcription: string | null; qualityDetails: unknown } | null;
}

interface ExpertAccount {
  id: number;
  email: string;
  isActive: boolean;
  companyName: string | null;
  legalName: string | null;
  contactName: string | null;
  street: string | null;
  postalCode: string | null;
  city: string | null;
  country: string | null;
  phone: string | null;
  invoiceEmail: string | null;
  businessType: string | null;
  legalComplianceConfirmed: boolean;
  actsAsBusinessConfirmed: boolean;
  externalBillingConfirmed: boolean;
  confidentialityConfirmed: boolean;
  dataProtectionConfirmed: boolean;
}

function isAssignableExpert(expert: ExpertAccount): boolean {
  return expert.isActive &&
    !!(expert.companyName || expert.legalName) &&
    !!expert.street &&
    !!expert.postalCode &&
    !!expert.city &&
    !!expert.country &&
    !!expert.phone &&
    !!expert.invoiceEmail &&
    !!expert.businessType &&
    expert.legalComplianceConfirmed &&
    expert.actsAsBusinessConfirmed &&
    expert.externalBillingConfirmed &&
    expert.confidentialityConfirmed &&
    expert.dataProtectionConfirmed;
}

function getStatusLabel(t: TFunction, status: string): string {
  const map: Record<string, string> = {
    pending: t("adminHt.statusPending"),
    quoted: t("adminHt.statusQuoted"),
    accepted: t("adminHt.statusAccepted"),
    in_progress: t("adminHt.statusInProgress"),
    completed: t("adminHt.statusCompleted"),
    declined: t("adminHt.statusDeclined"),
    cancelled: t("adminHt.statusCancelled"),
  };
  return map[status] ?? status;
}

function getUrgencyLabel(t: TFunction, urgency: string): string {
  const map: Record<string, string> = {
    standard: t("adminHt.urgencyStandard"),
    express: t("adminHt.urgencyExpress"),
    priority: t("adminHt.urgencyPriority"),
  };
  return map[urgency] ?? urgency;
}

function getAccuracyLabel(t: TFunction, accuracy: string): string {
  const map: Record<string, string> = {
    reading: t("adminHt.accuracyReading"),
    scientific: t("adminHt.accuracyScientific"),
  };
  return map[accuracy] ?? accuracy;
}

function getBudgetLabel(t: TFunction, budget: string): string {
  const map: Record<string, string> = {
    bis_100: t("adminHt.budgetUpTo100"),
    "100_250": t("adminHt.budget100to250"),
    "250_500": t("adminHt.budget250to500"),
    "500_plus": t("adminHt.budgetOver500"),
    flexible: t("adminHt.budgetFlexible"),
  };
  return map[budget] ?? budget;
}

function formatDate(s: string | null): string {
  if (!s) return "–";
  return new Date(s).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function AdminHumanTranscriptionPage() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [quotePriceEur, setQuotePriceEur] = useState("");
  const [quoteMessage, setQuoteMessage] = useState("");
  const [quoteDeadline, setQuoteDeadline] = useState("");
  const [selectedExpertId, setSelectedExpertId] = useState("");

  const { data: requests, isLoading: listLoading } = useQuery<HumanTranscriptionRequest[]>({
    queryKey: ["/api/admin/human-transcription/requests"],
  });

  const { data: experts } = useQuery<ExpertAccount[]>({
    queryKey: ["/api/admin/experts"],
  });

  const { data: detail, isLoading: detailLoading } = useQuery<AdminRequestDetail>({
    queryKey: ["/api/admin/human-transcription/requests", selectedId],
    enabled: selectedId != null,
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/admin/human-transcription/requests/${selectedId}`);
      return res.json();
    },
  });

  const quoteMutation = useMutation({
    mutationFn: async () => {
      const price = quotePriceEur.trim() ? Math.round(parseFloat(quotePriceEur.replace(",", ".")) * 100) : null;
      const res = await apiRequest("POST", `/api/admin/human-transcription/requests/${selectedId}/quote`, {
        quotePriceEur: price,
        quoteMessage: quoteMessage.trim() || undefined,
        quoteDeadline: quoteDeadline.trim() || undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/human-transcription/requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/human-transcription/requests", selectedId] });
      setQuotePriceEur("");
      setQuoteMessage("");
      setQuoteDeadline("");
      toast({ title: t("adminHt.toastQuoteSaved") });
    },
    onError: (error: Error) => {
      toast({ title: t("adminHt.toastError"), description: error.message, variant: "destructive" });
    },
  });

  useEffect(() => {
    setSelectedExpertId(detail?.expert ? String(detail.expert.id) : "");
  }, [detail?.expert]);

  const assignMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/admin/human-transcription/requests/${selectedId}/assign`, {
        expertAccountId: Number(selectedExpertId),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/human-transcription/requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/human-transcription/requests", selectedId] });
      toast({ title: t("adminHt.toastExpertAssigned") });
    },
    onError: (error: Error) => {
      toast({ title: t("adminHt.toastError"), description: error.message, variant: "destructive" });
    },
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/admin/human-transcription/requests/${selectedId}/complete`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/human-transcription/requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/human-transcription/requests", selectedId] });
      toast({ title: t("adminHt.toastMarkedCompleted") });
    },
    onError: (error: Error) => {
      toast({ title: t("adminHt.toastError"), description: error.message, variant: "destructive" });
    },
  });

  const selectedRequest = detail?.request;
  const canQuote = selectedRequest?.status === "pending";
  const canComplete =
    selectedRequest?.status === "accepted" || selectedRequest?.status === "in_progress";

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate("/app")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("adminHt.back")}
        </Button>
        <h1 className="font-serif text-xl font-bold">{t("adminHt.pageTitle")}</h1>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 p-4">
          <h2 className="font-semibold mb-3">{t("adminHt.requestsHeading")}</h2>
          {listLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : !requests?.length ? (
            <p className="text-sm text-muted-foreground">{t("adminHt.noRequests")}</p>
          ) : (
            <ul className="space-y-2">
              {requests.map((req) => (
                <li key={req.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(req.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedId === req.id ? "border-primary bg-primary/10" : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <span className="font-medium text-sm">#{req.id}</span>
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {getStatusLabel(t, req.status)}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">{formatDate(req.createdAt)}</p>
                    {req.expert && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {req.expert.companyName || req.expert.contactName || req.expert.email}
                      </p>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="lg:col-span-2 space-y-4">
          {selectedId == null ? (
            <Card className="p-8 text-center text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>{t("adminHt.selectRequest")}</p>
            </Card>
          ) : detailLoading || !detail ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <>
              <Card className="p-4">
                <h3 className="font-semibold mb-2">{t("adminHt.requestRequirementsHeading")}</h3>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>{t("adminHt.urgencyLabel")}: {getUrgencyLabel(t, detail.request.urgency)}</li>
                  <li>{t("adminHt.accuracyLabel")}: {getAccuracyLabel(t, detail.request.accuracyLevel)}</li>
                  <li>{t("adminHt.budgetLabel")}: {getBudgetLabel(t, detail.request.budgetRange)}</li>
                  {detail.request.customerNotes && (
                    <li className="mt-2">
                      <span className="font-medium text-foreground">{t("adminHt.notesLabel")}:</span>{" "}
                      {detail.request.customerNotes}
                    </li>
                  )}
                  {detail.expert && (
                    <li>
                      {t("adminHt.expertLabel")}: {detail.expert.companyName || detail.expert.contactName || detail.expert.email}
                    </li>
                  )}
                </ul>
              </Card>

              <Card className="p-4">
                <h3 className="font-semibold mb-3">{t("adminHt.expertHeading")}</h3>
                <div className="flex flex-wrap gap-2">
                  <Select value={selectedExpertId} onValueChange={setSelectedExpertId}>
                    <SelectTrigger className="w-full sm:w-[320px]">
                      <SelectValue placeholder={t("adminHt.selectExpertPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {(experts ?? []).filter(isAssignableExpert).map((expert) => (
                        <SelectItem key={expert.id} value={String(expert.id)}>
                          {expert.companyName || expert.contactName || expert.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    onClick={() => assignMutation.mutate()}
                    disabled={!selectedExpertId || assignMutation.isPending}
                  >
                    {assignMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    {t("adminHt.assign")}
                  </Button>
                </div>
                {(experts ?? []).filter(isAssignableExpert).length === 0 && (
                  <p className="text-xs text-amber-600 mt-2">
                    {t("adminHt.noAssignableExperts")}
                  </p>
                )}
              </Card>

              {detail.job && (
                <Card className="p-4">
                  <h3 className="font-semibold mb-2">{t("adminHt.documentHeading")}</h3>
                  <p className="text-sm text-muted-foreground">
                    {getScriptTypeDisplayLabel(detail.job.scriptType)} · {t("adminHt.pagesCount", { count: detail.job.totalPages })}
                  </p>
                  {detail.previewPage && (
                    <div className="mt-3 grid sm:grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">{t("adminHt.previewImage")}</p>
                        <DocumentPreview
                          src={detail.previewPage.imageUrl}
                          alt={t("adminHt.previewAlt")}
                          className="rounded border"
                        />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">{t("adminHt.previewAiText")}</p>
                        <p className="text-sm whitespace-pre-wrap line-clamp-6 bg-muted/50 p-2 rounded">
                          {detail.previewPage.transcription || "–"}
                        </p>
                      </div>
                    </div>
                  )}
                </Card>
              )}

              {canQuote && (
                <Card className="p-4">
                  <h3 className="font-semibold mb-3">{t("adminHt.createQuoteHeading")}</h3>
                  <div className="space-y-3">
                    <div>
                      <Label>{t("adminHt.priceLabel")}</Label>
                      <Input
                        type="text"
                        placeholder={t("adminHt.pricePlaceholder")}
                        value={quotePriceEur}
                        onChange={(e) => setQuotePriceEur(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>{t("adminHt.messageLabel")}</Label>
                      <Textarea
                        placeholder={t("adminHt.messagePlaceholder")}
                        value={quoteMessage}
                        onChange={(e) => setQuoteMessage(e.target.value)}
                        rows={3}
                        className="mt-1 resize-none"
                      />
                    </div>
                    <div>
                      <Label>{t("adminHt.deliveryDateLabel")}</Label>
                      <Input
                        type="date"
                        value={quoteDeadline}
                        onChange={(e) => setQuoteDeadline(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <Button
                      onClick={() => quoteMutation.mutate()}
                      disabled={quoteMutation.isPending}
                    >
                      {quoteMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Euro className="h-4 w-4 mr-2" />
                          {t("adminHt.sendQuote")}
                        </>
                      )}
                    </Button>
                  </div>
                </Card>
              )}

              {detail.request.status === "quoted" && (
                <Card className="p-4 border-amber-200/50 dark:border-amber-800/50">
                  <p className="text-sm text-muted-foreground">
                    {t("adminHt.quotedWaiting")}
                  </p>
                  {detail.request.quotePriceEur != null && (
                    <p className="text-sm mt-1">
                      <Euro className="h-4 w-4 inline mr-1" />
                      {(detail.request.quotePriceEur / 100).toFixed(2)} €
                    </p>
                  )}
                </Card>
              )}

              {canComplete && (
                <Card className="p-4">
                  <Button
                    variant="outline"
                    onClick={() => completeMutation.mutate()}
                    disabled={completeMutation.isPending}
                  >
                    {completeMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        {t("adminHt.markCompleted")}
                      </>
                    )}
                  </Button>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
