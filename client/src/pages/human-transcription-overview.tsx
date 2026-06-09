import { useState } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  FileText,
  Loader2,
  Check,
  X,
  Clock,
  MessageSquare,
  Euro,
  Calendar,
  CreditCard,
  ChevronDown,
} from "lucide-react";

interface ExpertAccount {
  companyName: string | null;
  legalName: string | null;
  contactName: string | null;
  street: string | null;
  postalCode: string | null;
  city: string | null;
  country: string | null;
  invoiceEmail: string | null;
  phone: string | null;
  vatId: string | null;
  tradeRegisterName?: string | null;
  tradeRegisterNumber?: string | null;
}

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
  expert?: ExpertAccount | null;
}

function statusLabels(t: TFunction): Record<string, string> {
  return {
    pending: t("htOverview.statusPending"),
    quoted: t("htOverview.statusQuoted"),
    accepted: t("htOverview.statusAccepted"),
    in_progress: t("htOverview.statusInProgress"),
    completed: t("htOverview.statusCompleted"),
    declined: t("htOverview.statusDeclined"),
    cancelled: t("htOverview.statusCancelled"),
  };
}

function urgencyLabels(t: TFunction): Record<string, string> {
  return {
    standard: t("htOverview.urgencyStandard"),
    express: t("htOverview.urgencyExpress"),
    priority: t("htOverview.urgencyPriority"),
  };
}

function accuracyLabels(t: TFunction): Record<string, string> {
  return {
    reading: t("htOverview.accuracyReading"),
    scientific: t("htOverview.accuracyScientific"),
  };
}

function budgetLabels(t: TFunction): Record<string, string> {
  return {
    bis_100: t("htOverview.budgetUpTo100"),
    "100_250": t("htOverview.budget100to250"),
    "250_500": t("htOverview.budget250to500"),
    "500_plus": t("htOverview.budgetOver500"),
    flexible: t("htOverview.budgetFlexible"),
  };
}

function formatDate(s: string | null): string {
  if (!s) return "–";
  const d = new Date(s);
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatPrice(cents: number | null): string {
  if (cents == null) return "–";
  return (
    new Intl.NumberFormat("da-DK", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(cents / 100) + " kr."
  );
}

function getExpertDisplayName(expert: ExpertAccount | null | undefined, t: TFunction): string {
  return expert?.companyName || expert?.legalName || expert?.contactName || t("htOverview.expertFallback");
}

export default function HumanTranscriptionOverviewPage() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [acceptingRequest, setAcceptingRequest] = useState<HumanTranscriptionRequest | null>(null);
  const [externalNoticeAccepted, setExternalNoticeAccepted] = useState(false);

  const { data: requests, isLoading } = useQuery<HumanTranscriptionRequest[]>({
    queryKey: ["/api/human-transcription/requests"],
  });

  const acceptMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/human-transcription/requests/${id}/accept-external`, {
        externalBillingNoticeAccepted: true,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/human-transcription/requests"] });
      setAcceptingRequest(null);
      setExternalNoticeAccepted(false);
      toast({
        title: t("htOverview.toastAcceptedTitle"),
        description: t("htOverview.toastAcceptedDescription"),
      });
    },
    onError: (error: Error) => {
      toast({ title: t("htOverview.toastErrorTitle"), description: error.message, variant: "destructive" });
    },
  });

  const declineMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/human-transcription/requests/${id}/respond`, {
        accept: false,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/human-transcription/requests"] });
      toast({ title: t("htOverview.toastDeclinedTitle") });
    },
    onError: (error: Error) => {
      toast({ title: t("htOverview.toastErrorTitle"), description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 max-w-3xl mx-auto flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const list = requests ?? [];
  const STATUS_LABELS = statusLabels(t);
  const URGENCY_LABELS = urgencyLabels(t);
  const ACCURACY_LABELS = accuracyLabels(t);
  const BUDGET_LABELS = budgetLabels(t);

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" onClick={() => navigate("/app")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("htOverview.dashboard")}
        </Button>
        <h1 className="font-serif text-xl font-bold">{t("htOverview.title")}</h1>
      </div>

      <p className="text-sm text-muted-foreground">
        {t("htOverview.intro")}
      </p>

      {list.length === 0 ? (
        <Card className="p-8 text-center">
          <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">
            {t("htOverview.emptyTitle")}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {t("htOverview.emptyBody")}
          </p>
        </Card>
      ) : (
        <ul className="space-y-4">
          {list.map((req) => (
            <Card key={req.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{t("htOverview.orderNumber", { id: req.id })}</span>
                    <Badge variant="secondary">{STATUS_LABELS[req.status] ?? req.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t("htOverview.urgencyLabel")}: {URGENCY_LABELS[req.urgency] ?? req.urgency} ·{" "}
                    {ACCURACY_LABELS[req.accuracyLevel] ?? req.accuracyLevel} ·{" "}
                    {BUDGET_LABELS[req.budgetRange] ?? req.budgetRange}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("htOverview.createdOn", { date: formatDate(req.createdAt) })}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/app/result/${req.jobId}`)}
                >
                  {t("htOverview.toDocument")}
                </Button>
              </div>

              {req.status === "quoted" && (
                <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-border">
                  <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                    <MessageSquare className="h-4 w-4" />
                    {t("htOverview.yourQuote")}
                  </h4>
                  {req.quotePriceEur != null && (
                    <p className="flex items-center gap-2 text-sm">
                      <Euro className="h-4 w-4" />
                      {formatPrice(req.quotePriceEur)}
                    </p>
                  )}
                  {req.quoteDeadline && (
                    <p className="flex items-center gap-2 text-sm mt-1">
                      <Calendar className="h-4 w-4" />
                      {t("htOverview.expectedBy", { date: formatDate(req.quoteDeadline) })}
                    </p>
                  )}
                  {req.quoteMessage && (
                    <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">
                      {req.quoteMessage}
                    </p>
                  )}
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      onClick={() => {
                        setAcceptingRequest(req);
                        setExternalNoticeAccepted(false);
                      }}
                      disabled={acceptMutation.isPending || declineMutation.isPending}
                    >
                      {acceptMutation.isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : (
                        <CreditCard className="h-3 w-3 mr-1" />
                      )}
                      {t("htOverview.reviewAndAccept")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => declineMutation.mutate(req.id)}
                      disabled={acceptMutation.isPending || declineMutation.isPending}
                    >
                      {declineMutation.isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : (
                        <X className="h-3 w-3 mr-1" />
                      )}
                      {t("htOverview.decline")}
                    </Button>
                  </div>
                </div>
              )}

              {(req.status === "accepted" || req.status === "in_progress") && (
                <div className="mt-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                  <p className="text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                    <Check className="h-4 w-4" />
                    {t("htOverview.acceptedExpertWorking")}
                  </p>
                  {req.quotePriceEur != null && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-1 ml-6">
                      {t("htOverview.priceBilledByExpert", { price: formatPrice(req.quotePriceEur) })}
                    </p>
                  )}
                </div>
              )}

              {req.status === "completed" && req.completedAt && (
                <p className="text-sm text-muted-foreground mt-2 flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600" />
                  {t("htOverview.completedOn", { date: formatDate(req.completedAt) })}
                </p>
              )}
            </Card>
          ))}
        </ul>
      )}

      <Dialog open={!!acceptingRequest} onOpenChange={(open) => {
        if (!open) {
          setAcceptingRequest(null);
          setExternalNoticeAccepted(false);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("htOverview.dialogTitle")}</DialogTitle>
            <DialogDescription>
              {t("htOverview.dialogDescription")}
            </DialogDescription>
          </DialogHeader>
          {acceptingRequest && (
            <div className="space-y-3 text-sm">
              <p>
                {t("htOverview.quoteLabel")}: <strong>{formatPrice(acceptingRequest.quotePriceEur)}</strong>
              </p>
              {acceptingRequest.expert && (
                <div className="rounded-md border border-border bg-background p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("htOverview.contractPartner")}</p>
                  <p className="font-medium">{getExpertDisplayName(acceptingRequest.expert, t)}</p>
                </div>
              )}
              <p className="text-muted-foreground">
                {t("htOverview.noPaymentNotice")}
              </p>
              {acceptingRequest.expert && (
                <Collapsible className="rounded-md border border-border bg-muted/30">
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm font-medium"
                    >
                      <span>{t("htOverview.showExpertContact")}</span>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="px-3 pb-3 text-sm text-muted-foreground">
                    <div className="border-t border-border pt-3 space-y-1">
                      <p className="font-medium text-foreground">
                        {getExpertDisplayName(acceptingRequest.expert, t)}
                      </p>
                      {(acceptingRequest.expert.street || acceptingRequest.expert.postalCode || acceptingRequest.expert.city) && (
                        <p>
                          {[acceptingRequest.expert.street, [acceptingRequest.expert.postalCode, acceptingRequest.expert.city].filter(Boolean).join(" ")]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                      )}
                      {acceptingRequest.expert.country && <p>{acceptingRequest.expert.country}</p>}
                      {acceptingRequest.expert.invoiceEmail && <p>{t("htOverview.emailLabel")}: {acceptingRequest.expert.invoiceEmail}</p>}
                      {acceptingRequest.expert.phone && <p>{t("htOverview.phoneLabel")}: {acceptingRequest.expert.phone}</p>}
                      {acceptingRequest.expert.vatId && <p>{t("htOverview.vatLabel")}: {acceptingRequest.expert.vatId}</p>}
                      {acceptingRequest.expert.tradeRegisterName && (
                        <p>{t("htOverview.registerLabel")}: {acceptingRequest.expert.tradeRegisterName}{acceptingRequest.expert.tradeRegisterNumber ? `, ${acceptingRequest.expert.tradeRegisterNumber}` : ""}</p>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}
              <label className="flex items-start gap-2">
                <Checkbox
                  checked={externalNoticeAccepted}
                  onCheckedChange={(checked) => setExternalNoticeAccepted(checked === true)}
                />
                <span>
                  {t("htOverview.confirmCheckbox")}
                </span>
              </label>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAcceptingRequest(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              disabled={!externalNoticeAccepted || acceptMutation.isPending || !acceptingRequest}
              onClick={() => acceptingRequest && acceptMutation.mutate(acceptingRequest.id)}
            >
              {acceptMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("htOverview.orderPaidAtExpert")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
