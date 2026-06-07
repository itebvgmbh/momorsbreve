import { useEffect, useState } from "react";
import { useLocation } from "wouter";
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

const STATUS_LABELS: Record<string, string> = {
  pending: "Offen",
  quoted: "Angebot erstellt",
  accepted: "Angenommen",
  in_progress: "In Bearbeitung",
  completed: "Abgeschlossen",
  declined: "Abgelehnt",
  cancelled: "Storniert",
};

const URGENCY_LABELS: Record<string, string> = {
  standard: "Standard (ca. 2 Wo.)",
  express: "Express (ca. 1 Wo.)",
  priority: "Priorität (ca. 3 Tage)",
};

const ACCURACY_LABELS: Record<string, string> = {
  reading: "Lesetranskription",
  scientific: "Wissenschaftlich-diplomatisch",
};

const BUDGET_LABELS: Record<string, string> = {
  bis_100: "Bis 100 €",
  "100_250": "100 – 250 €",
  "250_500": "250 – 500 €",
  "500_plus": "Über 500 €",
  flexible: "Flexibel",
};

function formatDate(s: string | null): string {
  if (!s) return "–";
  return new Date(s).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function AdminHumanTranscriptionPage() {
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
      toast({ title: "Angebot gespeichert" });
    },
    onError: (error: Error) => {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
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
      toast({ title: "Experte zugewiesen" });
    },
    onError: (error: Error) => {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
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
      toast({ title: "Als abgeschlossen markiert" });
    },
    onError: (error: Error) => {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
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
          Zurück
        </Button>
        <h1 className="font-serif text-xl font-bold">Experten-Anfragen (Admin)</h1>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 p-4">
          <h2 className="font-semibold mb-3">Anfragen</h2>
          {listLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : !requests?.length ? (
            <p className="text-sm text-muted-foreground">Keine Anfragen.</p>
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
                      {STATUS_LABELS[req.status] ?? req.status}
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
              <p>Anfrage auswählen</p>
            </Card>
          ) : detailLoading || !detail ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <>
              <Card className="p-4">
                <h3 className="font-semibold mb-2">Anfrage & Anforderungen</h3>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>Dringlichkeit: {URGENCY_LABELS[detail.request.urgency] ?? detail.request.urgency}</li>
                  <li>Genauigkeit: {ACCURACY_LABELS[detail.request.accuracyLevel] ?? detail.request.accuracyLevel}</li>
                  <li>Budget: {BUDGET_LABELS[detail.request.budgetRange] ?? detail.request.budgetRange}</li>
                  {detail.request.customerNotes && (
                    <li className="mt-2">
                      <span className="font-medium text-foreground">Anmerkungen:</span>{" "}
                      {detail.request.customerNotes}
                    </li>
                  )}
                  {detail.expert && (
                    <li>
                      Experte: {detail.expert.companyName || detail.expert.contactName || detail.expert.email}
                    </li>
                  )}
                </ul>
              </Card>

              <Card className="p-4">
                <h3 className="font-semibold mb-3">Experte</h3>
                <div className="flex flex-wrap gap-2">
                  <Select value={selectedExpertId} onValueChange={setSelectedExpertId}>
                    <SelectTrigger className="w-full sm:w-[320px]">
                      <SelectValue placeholder="Experten auswählen" />
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
                    Zuweisen
                  </Button>
                </div>
                {(experts ?? []).filter(isAssignableExpert).length === 0 && (
                  <p className="text-xs text-amber-600 mt-2">
                    Keine aktiven Experten mit vollständigem Pflichtprofil verfügbar.
                  </p>
                )}
              </Card>

              {detail.job && (
                <Card className="p-4">
                  <h3 className="font-semibold mb-2">Dokument</h3>
                  <p className="text-sm text-muted-foreground">
                    {getScriptTypeDisplayLabel(detail.job.scriptType)} · {detail.job.totalPages} Seite(n)
                  </p>
                  {detail.previewPage && (
                    <div className="mt-3 grid sm:grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Vorschau (Bild)</p>
                        <DocumentPreview
                          src={detail.previewPage.imageUrl}
                          alt="Vorschau"
                          className="rounded border"
                        />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">KI-Vorschau (Text)</p>
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
                  <h3 className="font-semibold mb-3">Angebot erstellen</h3>
                  <div className="space-y-3">
                    <div>
                      <Label>Preis (EUR)</Label>
                      <Input
                        type="text"
                        placeholder="z. B. 150.00"
                        value={quotePriceEur}
                        onChange={(e) => setQuotePriceEur(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Nachricht an den Kunden</Label>
                      <Textarea
                        placeholder="Kurze Erklärung zum Angebot, Lieferzeit …"
                        value={quoteMessage}
                        onChange={(e) => setQuoteMessage(e.target.value)}
                        rows={3}
                        className="mt-1 resize-none"
                      />
                    </div>
                    <div>
                      <Label>Voraussichtliches Lieferdatum</Label>
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
                          Angebot senden
                        </>
                      )}
                    </Button>
                  </div>
                </Card>
              )}

              {detail.request.status === "quoted" && (
                <Card className="p-4 border-amber-200/50 dark:border-amber-800/50">
                  <p className="text-sm text-muted-foreground">
                    Angebot wurde erstellt. Warten auf Reaktion des Kunden.
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
                        Als abgeschlossen markieren
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
