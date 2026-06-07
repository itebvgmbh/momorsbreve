import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  FileText,
  Loader2,
  Euro,
  CheckCircle2,
  Clock,
  User,
  Mail,
  Download,
  Calendar,
  Filter,
} from "lucide-react";
import { DocumentPreview } from "@/components/document-preview";
import { getScriptTypeDisplayLabel } from "@shared/models/transcription";

interface OrderItem {
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
  respondedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  stripePaymentIntentId: string | null;
  customer: { name: string; email: string | null } | null;
  job: { id: number; scriptType: string; totalPages: number; status: string } | null;
  invoice: { id: number; invoiceNumber: string; grossAmountEur: number; pdfPath: string | null } | null;
}

interface AdminRequestDetail {
  request: OrderItem;
  job: { id: number; scriptType: string; totalPages: number; status: string } | null;
  pages: { pageNumber: number; imageUrl: string; transcription: string | null; isPreview: boolean }[];
  previewPage: { imageUrl: string; transcription: string | null } | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  accepted: { label: "Bezahlt – Warten auf Bearbeitung", color: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30" },
  in_progress: { label: "In Bearbeitung", color: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30" },
  completed: { label: "Abgeschlossen", color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" },
};

const URGENCY_LABELS: Record<string, string> = {
  standard: "Standard",
  express: "Express",
  priority: "Priorität",
};

const ACCURACY_LABELS: Record<string, string> = {
  reading: "Lesetranskription",
  scientific: "Wissenschaftlich-diplomatisch",
};

type StatusFilter = "all" | "accepted" | "in_progress" | "completed";

function formatDate(s: string | null): string {
  if (!s) return "–";
  return new Date(s).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatPrice(cents: number | null): string {
  if (cents == null) return "–";
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

export default function AdminOrdersPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const { data: orders, isLoading } = useQuery<OrderItem[]>({
    queryKey: ["/api/admin/orders"],
  });

  const { data: detail, isLoading: detailLoading } = useQuery<AdminRequestDetail>({
    queryKey: ["/api/admin/human-transcription/requests", selectedId],
    enabled: selectedId != null,
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/admin/human-transcription/requests/${selectedId}`);
      return res.json();
    },
  });

  const startProgressMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest(
        "POST",
        `/api/admin/human-transcription/requests/${id}/complete`
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/human-transcription/requests", selectedId] });
      toast({ title: "Auftrag als abgeschlossen markiert" });
    },
    onError: (err: Error) => {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    },
  });

  const filtered = (orders ?? []).filter(
    (o) => statusFilter === "all" || o.status === statusFilter
  );

  const counts = {
    all: orders?.length ?? 0,
    accepted: orders?.filter((o) => o.status === "accepted").length ?? 0,
    in_progress: orders?.filter((o) => o.status === "in_progress").length ?? 0,
    completed: orders?.filter((o) => o.status === "completed").length ?? 0,
  };

  const selectedOrder = filtered.find((o) => o.id === selectedId);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate("/app")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zurück
        </Button>
        <h1 className="font-serif text-xl font-bold">Bezahlte Aufträge</h1>
      </div>

      {/* Statistik-Karten */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Gesamt"
          count={counts.all}
          active={statusFilter === "all"}
          onClick={() => setStatusFilter("all")}
          color="text-foreground"
        />
        <StatCard
          label="Offen"
          count={counts.accepted}
          active={statusFilter === "accepted"}
          onClick={() => setStatusFilter("accepted")}
          color="text-amber-600 dark:text-amber-400"
        />
        <StatCard
          label="In Bearbeitung"
          count={counts.in_progress}
          active={statusFilter === "in_progress"}
          onClick={() => setStatusFilter("in_progress")}
          color="text-blue-600 dark:text-blue-400"
        />
        <StatCard
          label="Abgeschlossen"
          count={counts.completed}
          active={statusFilter === "completed"}
          onClick={() => setStatusFilter("completed")}
          color="text-emerald-600 dark:text-emerald-400"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Liste */}
        <Card className="lg:col-span-1 p-4 max-h-[75vh] overflow-auto">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm">
              <Filter className="h-3.5 w-3.5 inline mr-1.5" />
              {filtered.length} Auftrag{filtered.length !== 1 ? "e" : ""}
            </h2>
          </div>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Keine Aufträge in dieser Kategorie.
            </p>
          ) : (
            <ul className="space-y-2">
              {filtered.map((order) => {
                const cfg = STATUS_CONFIG[order.status] ?? { label: order.status, color: "" };
                return (
                  <li key={order.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(order.id)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        selectedId === order.id
                          ? "border-primary bg-primary/10"
                          : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-sm">#{order.id}</span>
                        <Badge variant="outline" className={`text-[10px] ${cfg.color}`}>
                          {cfg.label}
                        </Badge>
                      </div>
                      {order.customer && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {order.customer.name}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-xs text-muted-foreground">
                          {formatDate(order.respondedAt ?? order.createdAt)}
                        </span>
                        {order.quotePriceEur != null && (
                          <span className="text-xs font-medium">
                            {formatPrice(order.quotePriceEur)}
                          </span>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* Detail */}
        <div className="lg:col-span-2 space-y-4">
          {selectedId == null ? (
            <Card className="p-8 text-center text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>Auftrag auswählen, um Details zu sehen</p>
            </Card>
          ) : detailLoading || !detail ? (
            <Skeleton className="h-64 w-full rounded-lg" />
          ) : (
            <>
              {/* Status + Aktionen */}
              <Card className="p-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h3 className="font-semibold">Auftrag #{detail.request.id}</h3>
                    <Badge
                      variant="outline"
                      className={`mt-1 ${STATUS_CONFIG[detail.request.status]?.color ?? ""}`}
                    >
                      {STATUS_CONFIG[detail.request.status]?.label ?? detail.request.status}
                    </Badge>
                  </div>
                  {(detail.request.status === "accepted" || detail.request.status === "in_progress") && (
                    <Button
                      onClick={() => startProgressMutation.mutate(detail.request.id)}
                      disabled={startProgressMutation.isPending}
                    >
                      {startProgressMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                      )}
                      Als abgeschlossen markieren
                    </Button>
                  )}
                </div>
              </Card>

              {/* Kunden- und Zahlungsinfo */}
              <div className="grid sm:grid-cols-2 gap-4">
                <Card className="p-4">
                  <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                    <User className="h-4 w-4" /> Kunde
                  </h4>
                  {selectedOrder?.customer ? (
                    <div className="text-sm space-y-1">
                      <p>{selectedOrder.customer.name}</p>
                      {selectedOrder.customer.email && (
                        <p className="text-muted-foreground flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5" />
                          {selectedOrder.customer.email}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Keine Kundendaten</p>
                  )}
                </Card>

                <Card className="p-4">
                  <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                    <Euro className="h-4 w-4" /> Zahlung & Rechnung
                  </h4>
                  <div className="text-sm space-y-1">
                    {detail.request.quotePriceEur != null && (
                      <p className="font-medium text-lg">
                        {formatPrice(detail.request.quotePriceEur)}
                      </p>
                    )}
                    {selectedOrder?.stripePaymentIntentId && (
                      <p className="text-xs text-muted-foreground truncate">
                        Stripe: {selectedOrder.stripePaymentIntentId}
                      </p>
                    )}
                    {selectedOrder?.invoice ? (
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-muted-foreground">
                          Rechnung {selectedOrder.invoice.invoiceNumber}
                        </span>
                        {selectedOrder.invoice.pdfPath && (
                          <a
                            href={`/api/invoices/${selectedOrder.invoice.id}/pdf`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            <Download className="h-3 w-3" />
                            PDF
                          </a>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">Keine Rechnung vorhanden</p>
                    )}
                  </div>
                </Card>
              </div>

              {/* Auftragsdetails */}
              <Card className="p-4">
                <h4 className="text-sm font-semibold mb-2">Auftragsdetails</h4>
                <div className="grid sm:grid-cols-3 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground block text-xs">Dringlichkeit</span>
                    <span>{URGENCY_LABELS[detail.request.urgency] ?? detail.request.urgency}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs">Genauigkeit</span>
                    <span>{ACCURACY_LABELS[detail.request.accuracyLevel] ?? detail.request.accuracyLevel}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs">Lieferdatum</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      {formatDate(detail.request.quoteDeadline ?? null)}
                    </span>
                  </div>
                </div>
                {detail.request.customerNotes && (
                  <div className="mt-3 p-2 bg-muted/50 rounded text-sm">
                    <span className="text-xs font-medium text-muted-foreground block mb-1">Kundennotiz</span>
                    <p className="whitespace-pre-wrap">{detail.request.customerNotes}</p>
                  </div>
                )}
                {detail.request.quoteMessage && (
                  <div className="mt-2 p-2 bg-muted/50 rounded text-sm">
                    <span className="text-xs font-medium text-muted-foreground block mb-1">Angebotsnachricht</span>
                    <p className="whitespace-pre-wrap">{detail.request.quoteMessage}</p>
                  </div>
                )}
              </Card>

              {/* Dokument-Vorschau */}
              {detail.job && (
                <Card className="p-4">
                  <h4 className="text-sm font-semibold mb-2">Dokument</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    {getScriptTypeDisplayLabel(detail.job.scriptType)} · {detail.job.totalPages} Seite(n)
                  </p>
                  {detail.previewPage && (
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Vorschau (Bild)</p>
                        <DocumentPreview
                          src={detail.previewPage.imageUrl}
                          alt="Vorschau"
                          className="rounded border"
                        />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">KI-Transkription</p>
                        <p className="text-sm whitespace-pre-wrap bg-muted/50 p-2 rounded max-h-64 overflow-auto">
                          {detail.previewPage.transcription || "–"}
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/app/result/${detail.job!.id}`)}
                    >
                      Zum vollständigen Dokument
                    </Button>
                  </div>
                </Card>
              )}

              {/* Zeitstempel */}
              <Card className="p-4">
                <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4" /> Zeitverlauf
                </h4>
                <div className="text-sm space-y-1 text-muted-foreground">
                  <p>Erstellt: {formatDate(detail.request.createdAt)}</p>
                  <p>Bezahlt: {formatDate(detail.request.respondedAt)}</p>
                  {detail.request.completedAt && (
                    <p>Abgeschlossen: {formatDate(detail.request.completedAt)}</p>
                  )}
                </div>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  count,
  active,
  onClick,
  color,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  color: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`p-3 rounded-lg border text-left transition-colors ${
        active ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
      }`}
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{count}</p>
    </button>
  );
}
