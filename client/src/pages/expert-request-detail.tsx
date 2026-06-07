import { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { DocumentPreview } from "@/components/document-preview";
import { ArrowLeft, CheckCircle2, Copy, Euro, FileText, Loader2, Save, Sparkles, Wand2 } from "lucide-react";

interface RequestDetail {
  request: {
    id: number;
    jobId: number;
    status: string;
    serviceLevel: "ki_geprueft" | "experten";
    urgency: string;
    accuracyLevel: string;
    budgetRange: string;
    customerNotes: string | null;
    quotePriceEur: number | null;
    quoteMessage: string | null;
    quoteDeadline: string | null;
  };
  job: { id: number; totalPages: number; status: string } | null;
  pages: Array<{
    id: number;
    pageNumber: number;
    imageUrl: string;
    status: string;
    transcription: string | null;
    transcriptionCompleted: string | null;
    transcriptionInterpreted: string | null;
  }>;
  results: Array<{ pageId: number | null; pageNumber: number; text: string; expertNotes: string | null }>;
}

interface ExpertMe {
  canQuote: boolean;
  missingFields: string[];
  expert: { isActive?: boolean } | null;
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

function formatPriceInput(cents: number | null): string {
  if (cents == null) return "";
  return (cents / 100).toFixed(2);
}

export default function ExpertRequestDetailPage() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const requestId = params.id;
  const [quotePrice, setQuotePrice] = useState("");
  const [quoteMessage, setQuoteMessage] = useState("");
  const [quoteDeadline, setQuoteDeadline] = useState("");
  const [texts, setTexts] = useState<Record<number, string>>({});
  const [textVersion, setTextVersion] = useState<"original" | "completed" | "interpreted">("interpreted");

  const { data, isLoading } = useQuery<RequestDetail>({
    queryKey: ["/api/expert/requests", requestId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/expert/requests/${requestId}`);
      return res.json();
    },
    enabled: !!requestId,
  });
  const { data: expertMe } = useQuery<ExpertMe>({
    queryKey: ["/api/expert/me"],
  });

  useEffect(() => {
    if (!data) return;
    setQuotePrice(formatPriceInput(data.request.quotePriceEur));
    setQuoteMessage(data.request.quoteMessage ?? "");
    setQuoteDeadline(data.request.quoteDeadline ? data.request.quoteDeadline.slice(0, 10) : "");
    const existing: Record<number, string> = {};
    for (const page of data.pages) {
      const result = data.results.find((r) => r.pageNumber === page.pageNumber);
      existing[page.pageNumber] =
        result?.text ??
        page.transcriptionInterpreted ??
        page.transcriptionCompleted ??
        page.transcription ??
        "";
    }
    setTexts(existing);
  }, [data]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/expert/requests"] });
    queryClient.invalidateQueries({ queryKey: ["/api/expert/requests", requestId] });
  };

  const quoteMutation = useMutation({
    mutationFn: async () => {
      const price = quotePrice.trim() ? Math.round(parseFloat(quotePrice.replace(",", ".")) * 100) : null;
      const res = await apiRequest("POST", `/api/expert/requests/${requestId}/quote`, {
        quotePriceEur: price,
        quoteMessage: quoteMessage.trim() || undefined,
        quoteDeadline: quoteDeadline || undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Angebot gesendet" });
    },
    onError: (error: Error) => toast({ title: "Fehler", description: error.message, variant: "destructive" }),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!data) return null;
      const res = await apiRequest("POST", `/api/expert/requests/${requestId}/results`, {
        results: data.pages.map((page) => ({
          pageId: page.id,
          pageNumber: page.pageNumber,
          text: texts[page.pageNumber] ?? "",
        })),
      });
      return res.json();
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Ergebnis gespeichert" });
    },
    onError: (error: Error) => toast({ title: "Fehler", description: error.message, variant: "destructive" }),
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/expert/requests/${requestId}/complete`);
      return res.json();
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Auftrag abgeschlossen" });
    },
    onError: (error: Error) => toast({ title: "Fehler", description: error.message, variant: "destructive" }),
  });

  const canQuote = data?.request.status === "pending" && expertMe?.canQuote === true;
  const canEdit = data ? ["accepted", "in_progress", "completed"].includes(data.request.status) : false;
  const canComplete = data ? ["accepted", "in_progress"].includes(data.request.status) : false;
  const resultLabel = useMemo(() => {
    if (!data) return "Ergebnis";
    return data.request.serviceLevel === "ki_geprueft" ? "KI-geprüfte Transkription" : "Expertentranskription";
  }, [data]);

  const getVersionText = (page: RequestDetail["pages"][number]) => {
    if (textVersion === "interpreted") {
      return page.transcriptionInterpreted ?? page.transcriptionCompleted ?? page.transcription ?? "";
    }
    if (textVersion === "completed") {
      return page.transcriptionCompleted ?? page.transcription ?? "";
    }
    return page.transcription ?? "";
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Kopiert", description: "Text wurde in die Zwischenablage kopiert." });
  };

  if (isLoading || !data) {
    return (
      <div className="p-6 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <Button variant="ghost" onClick={() => navigate("/app/expert")}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Zurück
      </Button>

      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-serif text-xl font-bold">Anfrage #{data.request.id}</h1>
            <p className="text-sm text-muted-foreground">
              {data.request.serviceLevel === "ki_geprueft" ? "KI-geprüft" : "Expertentranskription"} · {data.job?.totalPages ?? data.pages.length} Seite(n)
            </p>
          </div>
          <Badge variant="secondary">{STATUS_LABELS[data.request.status] ?? data.request.status}</Badge>
        </div>
        {data.request.customerNotes && (
          <p className="text-sm text-muted-foreground mt-3 whitespace-pre-wrap">{data.request.customerNotes}</p>
        )}
      </Card>

      <Card className="p-4 space-y-4 border-primary/20">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Dokument und KI-Transkription prüfen</h2>
            <p className="text-sm text-muted-foreground">
              Dieser Bereich entspricht dem Ergebnisfenster des Kunden: Originalbild, vorhandene KI-Fassungen und Bearbeitung der finalen Expertenfassung.
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate(`/app/result/${data.request.jobId}`)}>
            Im Ergebnisfenster öffnen
          </Button>
        </div>
        <Tabs value={textVersion} onValueChange={(value) => setTextVersion(value as "original" | "completed" | "interpreted")}>
          <TabsList>
            <TabsTrigger value="original">
              <FileText className="h-3 w-3 mr-1" />
              Originaltreu
            </TabsTrigger>
            <TabsTrigger value="completed">
              <Sparkles className="h-3 w-3 mr-1" />
              Ergänzt
            </TabsTrigger>
            <TabsTrigger value="interpreted">
              <Wand2 className="h-3 w-3 mr-1" />
              Interpretation
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </Card>

      {canQuote && (
        <Card className="p-4 space-y-3">
          <h2 className="font-semibold">Angebot erstellen</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Preis (EUR)</Label>
              <Input value={quotePrice} onChange={(e) => setQuotePrice(e.target.value)} placeholder="z. B. 150,00" />
            </div>
            <div>
              <Label>Voraussichtliches Lieferdatum</Label>
              <Input type="date" value={quoteDeadline} onChange={(e) => setQuoteDeadline(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Nachricht an den Kunden</Label>
            <Textarea rows={4} value={quoteMessage} onChange={(e) => setQuoteMessage(e.target.value)} />
          </div>
          <Button onClick={() => quoteMutation.mutate()} disabled={quoteMutation.isPending}>
            {quoteMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Euro className="h-4 w-4 mr-2" />}
            Angebot senden
          </Button>
        </Card>
      )}
      {data.request.status === "pending" && expertMe?.canQuote === false && (
        <Card className="p-4 border-amber-200 bg-amber-50/60 dark:bg-amber-950/20">
          <h2 className="font-semibold">Angebot noch nicht möglich</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Bitte vervollständigen Sie zuerst Ihr Expertenprofil. Fehlend: {(expertMe.missingFields ?? []).join(", ")}
          </p>
          <Button variant="outline" className="mt-3" onClick={() => navigate("/app/expert/profile")}>
            Profil bearbeiten
          </Button>
        </Card>
      )}

      <Card className="p-4 space-y-4">
        <div>
          <h2 className="font-semibold">{canEdit ? `${resultLabel} bearbeiten` : "Arbeitsbereich"}</h2>
          <p className="text-sm text-muted-foreground">
            {canEdit
              ? "Speichern Sie die finale Fassung. Der Kunde sieht nach Abschluss nur diese Ergebnisart."
              : "Vor Annahme können Sie alle vorhandenen Seiten und KI-Fassungen prüfen. Die finale Bearbeitung wird nach Annahme des Angebots freigeschaltet."}
          </p>
        </div>
        {data.pages.map((page) => {
          const versionText = getVersionText(page);
          return (
            <div key={page.id} className="grid lg:grid-cols-2 gap-4 border-t border-border pt-4">
              <div>
                <p className="text-sm font-medium mb-2">Original Seite {page.pageNumber}</p>
                <DocumentPreview src={page.imageUrl} alt={`Seite ${page.pageNumber}`} className="rounded border" />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <Label>KI-Fassung zur Prüfung</Label>
                  <Button size="sm" variant="ghost" onClick={() => copyText(versionText)} disabled={!versionText}>
                    <Copy className="h-3 w-3 mr-1" />
                    Kopieren
                  </Button>
                </div>
                <Card className="p-3 bg-muted/40 min-h-[160px]">
                  <p className="font-serif text-sm leading-relaxed whitespace-pre-wrap">
                    {versionText || (page.status === "completed" ? "Für diese Version liegt kein Text vor." : "Diese Seite wurde noch nicht vollständig transkribiert.")}
                  </p>
                </Card>
                <div className="space-y-2">
                  <Label>Finale Expertenfassung</Label>
                  <Textarea
                    rows={12}
                    className="font-serif"
                    value={texts[page.pageNumber] ?? ""}
                    disabled={!canEdit}
                    onChange={(e) => setTexts((prev) => ({ ...prev, [page.pageNumber]: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          );
        })}
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => saveMutation.mutate()} disabled={!canEdit || saveMutation.isPending}>
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Ergebnis speichern
          </Button>
          {canComplete && (
            <Button variant="outline" onClick={() => completeMutation.mutate()} disabled={completeMutation.isPending}>
              {completeMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Abschließen und freigeben
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
