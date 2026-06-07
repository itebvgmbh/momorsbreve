import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, getAuthHeaders, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
  ArrowLeft,
  Download,
  FileText,
  Search,
  Copy,
  Check,
  Mail,
  Euro,
  Calendar,
  Loader2,
  Trash2,
} from "lucide-react";

interface AdminInvoice {
  id: number;
  invoiceNumber: string;
  userId: string;
  type: string;
  paymentOrderId: number | null;
  netAmountEur: number;
  vatRate: number;
  vatAmountEur: number;
  grossAmountEur: number;
  description: string;
  customerName: string | null;
  customerEmail: string | null;
  customerStreet: string | null;
  customerPostalCode: string | null;
  customerCity: string | null;
  customerCountry: string | null;
  pdfPath: string | null;
  createdAt: string;
  customerEmailFromUser: string | null;
}

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  credit_purchase: {
    label: "Credit-Kauf",
    color: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
  },
  specialist_order: {
    label: "Spezialistenauftrag",
    color: "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30",
  },
};

function formatDate(s: string | null): string {
  if (!s) return "–";
  return new Date(s).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatPrice(cents: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

function CopyableEmail({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors group cursor-pointer"
      title="E-Mail kopieren"
    >
      <Mail className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{email}</span>
      {copied ? (
        <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
      ) : (
        <Copy className="h-3.5 w-3.5 opacity-0 group-hover:opacity-60 shrink-0 transition-opacity" />
      )}
    </button>
  );
}

export default function AdminInvoicesPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "credit_purchase" | "specialist_order">("all");

  const { data: invoices, isLoading } = useQuery<AdminInvoice[]>({
    queryKey: ["/api/admin/invoices"],
  });

  const filtered = (invoices ?? []).filter((inv) => {
    if (typeFilter !== "all" && inv.type !== typeFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        inv.invoiceNumber.toLowerCase().includes(q) ||
        (inv.customerName ?? "").toLowerCase().includes(q) ||
        (inv.customerEmail ?? "").toLowerCase().includes(q) ||
        (inv.customerEmailFromUser ?? "").toLowerCase().includes(q) ||
        inv.description.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalGross = filtered.reduce((sum, inv) => sum + inv.grossAmountEur, 0);
  const totalNet = filtered.reduce((sum, inv) => sum + inv.netAmountEur, 0);

  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminInvoice | null>(null);
  const [markOrderAsTest, setMarkOrderAsTest] = useState(true);

  const handleDownload = async (inv: AdminInvoice) => {
    setDownloadingId(inv.id);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/admin/invoices/${inv.id}/pdf`, { headers });
      if (!res.ok) throw new Error("Rechnung konnte nicht geladen werden.");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${inv.invoiceNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    } finally {
      setDownloadingId(null);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async (args: { id: number; markOrderAsTest: boolean }) => {
      const res = await apiRequest("DELETE", `/api/admin/invoices/${args.id}`, {
        markOrderAsTest: args.markOrderAsTest,
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Rechnung konnte nicht gelöscht werden.");
      }
      return res.json();
    },
    onSuccess: (data: { deletedInvoiceNumber: string; paymentOrderMarkedAsTest: boolean }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/invoices"] });
      toast({
        title: "Rechnung gelöscht",
        description: data.paymentOrderMarkedAsTest
          ? `${data.deletedInvoiceNumber} entfernt, zugehöriger Auftrag als Test markiert.`
          : `${data.deletedInvoiceNumber} entfernt.`,
      });
      setDeleteTarget(null);
    },
    onError: (err: Error) => {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    },
  });

  const openDeleteDialog = (inv: AdminInvoice) => {
    setMarkOrderAsTest(true);
    setDeleteTarget(inv);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate({
      id: deleteTarget.id,
      markOrderAsTest: deleteTarget.paymentOrderId ? markOrderAsTest : false,
    });
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate("/app")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zurück
        </Button>
        <h1 className="font-serif text-xl font-bold">Rechnungen</h1>
      </div>

      {/* Statistik */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => setTypeFilter("all")}
          className={`p-3 rounded-lg border text-left transition-colors ${
            typeFilter === "all" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
          }`}
        >
          <p className="text-xs text-muted-foreground">Gesamt</p>
          <p className="text-2xl font-bold">{invoices?.length ?? 0}</p>
        </button>
        <button
          type="button"
          onClick={() => setTypeFilter("credit_purchase")}
          className={`p-3 rounded-lg border text-left transition-colors ${
            typeFilter === "credit_purchase" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
          }`}
        >
          <p className="text-xs text-muted-foreground">Credit-Käufe</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {invoices?.filter((i) => i.type === "credit_purchase").length ?? 0}
          </p>
        </button>
        <button
          type="button"
          onClick={() => setTypeFilter("specialist_order")}
          className={`p-3 rounded-lg border text-left transition-colors ${
            typeFilter === "specialist_order" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
          }`}
        >
          <p className="text-xs text-muted-foreground">Spezialistenaufträge</p>
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {invoices?.filter((i) => i.type === "specialist_order").length ?? 0}
          </p>
        </button>
        <div className="p-3 rounded-lg border border-border">
          <p className="text-xs text-muted-foreground">Umsatz (gefiltert)</p>
          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
            {formatPrice(totalGross)}
          </p>
          <p className="text-xs text-muted-foreground">
            Netto: {formatPrice(totalNet)}
          </p>
        </div>
      </div>

      {/* Suchfeld */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Suchen nach Rechnungsnr., Name, E-Mail..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Tabelle */}
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
          <p>Keine Rechnungen gefunden.</p>
        </Card>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          {/* Desktop-Header */}
          <div className="hidden md:grid md:grid-cols-[1fr_1fr_1fr_120px_120px_110px] gap-3 px-4 py-2.5 bg-muted/50 border-b text-xs font-medium text-muted-foreground">
            <span>Rechnung</span>
            <span>Empfänger</span>
            <span>E-Mail</span>
            <span className="text-right">Betrag</span>
            <span className="text-right">Datum</span>
            <span className="text-right">Aktionen</span>
          </div>

          <div className="divide-y">
            {filtered.map((inv) => {
              const typeCfg = TYPE_LABELS[inv.type] ?? {
                label: inv.type,
                color: "",
              };
              const email = inv.customerEmail || inv.customerEmailFromUser;

              return (
                <div
                  key={inv.id}
                  className="px-4 py-3 hover:bg-muted/30 transition-colors"
                >
                  {/* Desktop */}
                  <div className="hidden md:grid md:grid-cols-[1fr_1fr_1fr_120px_120px_110px] gap-3 items-center">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {inv.invoiceNumber}
                      </p>
                      <Badge
                        variant="outline"
                        className={`text-[10px] mt-0.5 ${typeCfg.color}`}
                      >
                        {typeCfg.label}
                      </Badge>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm truncate">
                        {inv.customerName || "–"}
                      </p>
                    </div>
                    <div className="min-w-0">
                      {email ? (
                        <CopyableEmail email={email} />
                      ) : (
                        <span className="text-sm text-muted-foreground">–</span>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {formatPrice(inv.grossAmountEur)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        zzgl. {inv.vatRate}% MwSt.
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground flex items-center justify-end gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(inv.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={downloadingId === inv.id}
                        onClick={() => handleDownload(inv)}
                        className="h-8 w-8 p-0"
                        title="PDF herunterladen"
                      >
                        {downloadingId === inv.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteDialog(inv)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        title="Rechnung löschen"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Mobile */}
                  <div className="md:hidden space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">
                          {inv.invoiceNumber}
                        </p>
                        <Badge
                          variant="outline"
                          className={`text-[10px] mt-0.5 ${typeCfg.color}`}
                        >
                          {typeCfg.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={downloadingId === inv.id}
                          onClick={() => handleDownload(inv)}
                          className="h-8 w-8 p-0"
                          title="PDF herunterladen"
                        >
                          {downloadingId === inv.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDeleteDialog(inv)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          title="Rechnung löschen"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {inv.customerName && (
                      <p className="text-sm">{inv.customerName}</p>
                    )}
                    {email && <CopyableEmail email={email} />}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Euro className="h-3 w-3" />
                        {formatPrice(inv.grossAmountEur)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(inv.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Zusammenfassung */}
      {filtered.length > 0 && (
        <p className="text-xs text-muted-foreground text-right">
          {filtered.length} Rechnung{filtered.length !== 1 ? "en" : ""} angezeigt
        </p>
      )}

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !deleteMutation.isPending) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rechnung löschen?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Rechnung{" "}
                  <span className="font-mono font-semibold text-foreground">
                    {deleteTarget?.invoiceNumber}
                  </span>{" "}
                  über{" "}
                  <span className="font-semibold text-foreground">
                    {deleteTarget ? formatPrice(deleteTarget.grossAmountEur) : ""}
                  </span>{" "}
                  wird endgültig entfernt (DB-Eintrag und PDF).
                </p>
                {deleteTarget?.paymentOrderId ? (
                  <label className="flex items-start gap-2 rounded-md border border-border bg-muted/30 p-3 cursor-pointer">
                    <Checkbox
                      checked={markOrderAsTest}
                      onCheckedChange={(v) => setMarkOrderAsTest(v === true)}
                      className="mt-0.5"
                    />
                    <span className="text-sm text-foreground">
                      Zugehörigen Zahlungs-Auftrag (#{deleteTarget.paymentOrderId})
                      auf <span className="font-mono">test</span> setzen.
                      <span className="block text-xs text-muted-foreground mt-1">
                        Verhindert, dass die Rechnung beim nächsten Öffnen der
                        Einstellungen automatisch neu erstellt wird. Empfohlen
                        für Test-Käufe.
                      </span>
                    </span>
                  </label>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Keine zugehörige Zahlungs-Order – nur die Rechnung wird
                    gelöscht.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Abbrechen
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Lösche…
                </>
              ) : (
                "Endgültig löschen"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
