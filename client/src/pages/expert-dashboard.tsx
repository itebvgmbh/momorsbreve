import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Building2, FileText } from "lucide-react";

interface ExpertRequest {
  id: number;
  jobId: number;
  status: string;
  serviceLevel: string;
  quotePriceEur: number | null;
  createdAt: string;
}

function getStatusLabel(status: string, t: TFunction): string {
  const labels: Record<string, string> = {
    pending: t("expertDashboard.statusPending"),
    quoted: t("expertDashboard.statusQuoted"),
    accepted: t("expertDashboard.statusAccepted"),
    in_progress: t("expertDashboard.statusInProgress"),
    completed: t("expertDashboard.statusCompleted"),
    declined: t("expertDashboard.statusDeclined"),
    cancelled: t("expertDashboard.statusCancelled"),
  };
  return labels[status] ?? status;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("de-DE");
}

function formatPrice(cents: number | null, t: TFunction): string {
  if (cents == null) return t("expertDashboard.noPriceYet");
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(cents / 100);
}

export default function ExpertDashboardPage() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { data: me, isLoading: meLoading } = useQuery<{ expert: { companyName: string | null } | null }>({
    queryKey: ["/api/expert/me"],
  });
  const { data: requests, isLoading } = useQuery<ExpertRequest[]>({
    queryKey: ["/api/expert/requests"],
    enabled: !!me?.expert,
  });

  if (meLoading || isLoading) {
    return (
      <div className="p-6 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!me?.expert) {
    return (
      <div className="p-4 sm:p-6 max-w-3xl mx-auto">
        <Card className="p-8 text-center">
          <Building2 className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <h1 className="font-serif text-xl font-bold mb-2">{t("expertDashboard.noActiveAccountTitle")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("expertDashboard.noActiveAccountBody")}
          </p>
        </Card>
      </div>
    );
  }

  const list = requests ?? [];

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-bold">{t("expertDashboard.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("expertDashboard.subtitle")}
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate("/app/expert/profile")}>
          {t("expertDashboard.editCompanyProfile")}
        </Button>
      </div>

      {list.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-2 opacity-60" />
          {t("expertDashboard.emptyState")}
        </Card>
      ) : (
        <div className="space-y-3">
          {list.map((request) => (
            <Card key={request.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{t("expertDashboard.requestNumber", { id: request.id })}</span>
                  <Badge variant="secondary">{getStatusLabel(request.status, t)}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {request.serviceLevel === "ki_geprueft" ? t("expertDashboard.serviceAiChecked") : t("expertDashboard.serviceExpertTranscription")} · {t("expertDashboard.jobNumber", { id: request.jobId })} · {formatDate(request.createdAt)}
                </p>
                <p className="text-sm text-muted-foreground">{formatPrice(request.quotePriceEur, t)}</p>
              </div>
              <Button onClick={() => navigate(`/app/expert/requests/${request.id}`)}>
                {t("expertDashboard.open")}
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
