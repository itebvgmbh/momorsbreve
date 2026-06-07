import { useLocation } from "wouter";
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

const STATUS_LABELS: Record<string, string> = {
  pending: "Offen",
  quoted: "Angebot gesendet",
  accepted: "Angenommen",
  in_progress: "In Bearbeitung",
  completed: "Abgeschlossen",
  declined: "Abgelehnt",
  cancelled: "Storniert",
};

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("de-DE");
}

function formatPrice(cents: number | null): string {
  if (cents == null) return "Noch kein Preis";
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(cents / 100);
}

export default function ExpertDashboardPage() {
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
          <h1 className="font-serif text-xl font-bold mb-2">Kein aktives Expertenkonto</h1>
          <p className="text-sm text-muted-foreground">
            Ihr Login ist aktuell keinem aktiven Expertenaccount zugeordnet.
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
          <h1 className="font-serif text-2xl font-bold">Expertenbereich</h1>
          <p className="text-sm text-muted-foreground">
            Zugewiesene Anfragen prüfen, Angebote erstellen und Ergebnisse liefern.
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate("/app/expert/profile")}>
          Firmenprofil bearbeiten
        </Button>
      </div>

      {list.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-2 opacity-60" />
          Keine zugewiesenen Expertenanfragen.
        </Card>
      ) : (
        <div className="space-y-3">
          {list.map((request) => (
            <Card key={request.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Anfrage #{request.id}</span>
                  <Badge variant="secondary">{STATUS_LABELS[request.status] ?? request.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {request.serviceLevel === "ki_geprueft" ? "KI-geprüft" : "Expertentranskription"} · Job #{request.jobId} · {formatDate(request.createdAt)}
                </p>
                <p className="text-sm text-muted-foreground">{formatPrice(request.quotePriceEur)}</p>
              </div>
              <Button onClick={() => navigate(`/app/expert/requests/${request.id}`)}>
                Öffnen
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
