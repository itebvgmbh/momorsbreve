import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Loader2, Trash2, Eye } from "lucide-react";
import { DocumentPreview } from "@/components/document-preview";
import { getScriptTypeDisplayLabel } from "@shared/models/transcription";

interface QualityDetails {
  readability?: number;
  confidence?: number;
  issues?: string[];
  recommendation?: string;
  level?: "green" | "yellow" | "red";
  detectedScriptType?: string;
}

interface AnalysisRow {
  id: number;
  token: string;
  imageUrl: string;
  scriptType: string;
  qualityDetails: QualityDetails | null;
  createdAt: string;
  claimedByUserId: string | null;
  claimedAt: string | null;
  status: "aktiv" | "geclaimed" | "abgelaufen";
  claimedByUserEmail: string | null;
}

interface ListResponse {
  analyses: AnalysisRow[];
}

function formatDate(s: string): string {
  return new Date(s).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminAnonymousAnalysesPage() {
  const { toast } = useToast();
  const [detailDialog, setDetailDialog] = useState<AnalysisRow | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery<ListResponse>({
    queryKey: ["/api/admin/anonymous-analyses"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/anonymous-analyses");
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/anonymous-analyses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/anonymous-analyses"] });
      toast({ title: "Analyse gelöscht" });
    },
    onError: (error: Error) => {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    },
  });

  const analyses = data?.analyses ?? [];
  const total = analyses.length;
  const aktiv = analyses.filter((a) => a.status === "aktiv").length;
  const geclaimed = analyses.filter((a) => a.status === "geclaimed").length;
  const abgelaufen = analyses.filter((a) => a.status === "abgelaufen").length;

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
        <h1 className="font-serif text-2xl font-bold">Anonyme Analysen</h1>
        <Card className="p-6 text-center space-y-3">
          <p className="text-destructive font-medium">Fehler beim Laden der Analysen</p>
          <p className="text-sm text-muted-foreground">{error?.message || "Unbekannter Fehler"}</p>
          <Button variant="outline" onClick={() => refetch()}>Erneut versuchen</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold">Anonyme Analysen</h1>
          <p className="text-muted-foreground text-sm">
            Hochgeladene Dokumente aus der kostenlosen KI-Analyse (ohne Login)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Gesamt</p>
          <p className="text-2xl font-semibold">{total}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Aktiv</p>
          <p className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">{aktiv}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Geclaimed</p>
          <p className="text-2xl font-semibold text-amber-600 dark:text-amber-400">{geclaimed}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Abgelaufen</p>
          <p className="text-2xl font-semibold text-muted-foreground">{abgelaufen}</p>
        </Card>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Vorschau</TableHead>
              <TableHead>Datum</TableHead>
              <TableHead>Schrifttyp</TableHead>
              <TableHead>Qualität</TableHead>
              <TableHead>Konfidenz</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Geclaimed von</TableHead>
              <TableHead className="w-[100px]">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {analyses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                  Noch keine anonymen Analysen.
                </TableCell>
              </TableRow>
            ) : (
              analyses.map((row) => (
                <TableRow key={row.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setDetailDialog(row)}>
                  <TableCell>
                    <div
                      className="block w-14 h-14 rounded border border-border overflow-hidden bg-muted hover:opacity-90 transition-opacity flex items-center justify-center"
                    >
                      {row.imageUrl.toLowerCase().endsWith(".pdf") ? (
                        <FileText className="h-6 w-6 text-muted-foreground" />
                      ) : (
                        <img
                          src={row.imageUrl}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm whitespace-nowrap">
                    {formatDate(row.createdAt)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {getScriptTypeDisplayLabel(row.scriptType)}
                  </TableCell>
                  <TableCell>
                    {row.qualityDetails?.level ? (
                      <Badge
                        variant="secondary"
                        className={
                          row.qualityDetails.level === "green"
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                            : row.qualityDetails.level === "yellow"
                              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                              : "bg-red-500/15 text-red-600 dark:text-red-400"
                        }
                      >
                        {row.qualityDetails.level === "green" ? "Gut" : row.qualityDetails.level === "yellow" ? "Mittel" : "Schlecht"}
                      </Badge>
                    ) : (
                      "–"
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {row.qualityDetails?.confidence != null ? `${row.qualityDetails.confidence}%` : "–"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        row.status === "aktiv"
                          ? "default"
                          : row.status === "geclaimed"
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {row.status === "aktiv" ? "Aktiv" : row.status === "geclaimed" ? "Geclaimed" : "Abgelaufen"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[180px] truncate">
                    {row.claimedByUserEmail || "–"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => { e.stopPropagation(); setDetailDialog(row); }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        disabled={deleteMutation.isPending}
                        onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(row.id); }}
                      >
                        {deleteMutation.isPending && deleteMutation.variables === row.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!detailDialog} onOpenChange={() => setDetailDialog(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Analyse-Details</DialogTitle>
          </DialogHeader>
          {detailDialog && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-md border border-border overflow-hidden">
                <DocumentPreview src={detailDialog.imageUrl} alt="Hochgeladenes Dokument" />
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Datum</p>
                    <p className="text-sm font-medium">{formatDate(detailDialog.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Schrifttyp (gewählt)</p>
                    <p className="text-sm font-medium">{getScriptTypeDisplayLabel(detailDialog.scriptType)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <Badge
                      variant={
                        detailDialog.status === "aktiv" ? "default"
                          : detailDialog.status === "geclaimed" ? "secondary" : "outline"
                      }
                    >
                      {detailDialog.status === "aktiv" ? "Aktiv" : detailDialog.status === "geclaimed" ? "Geclaimed" : "Abgelaufen"}
                    </Badge>
                  </div>
                  {detailDialog.claimedByUserEmail && (
                    <div>
                      <p className="text-xs text-muted-foreground">Geclaimed von</p>
                      <p className="text-sm font-medium">{detailDialog.claimedByUserEmail}</p>
                    </div>
                  )}
                </div>

                {detailDialog.qualityDetails && (
                  <>
                    <hr className="border-border" />
                    <h3 className="font-semibold text-sm">KI-Analyse</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Qualitätslevel</p>
                        {detailDialog.qualityDetails.level ? (
                          <Badge
                            variant="secondary"
                            className={
                              detailDialog.qualityDetails.level === "green"
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                : detailDialog.qualityDetails.level === "yellow"
                                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                  : "bg-red-500/15 text-red-600 dark:text-red-400"
                            }
                          >
                            {detailDialog.qualityDetails.level === "green" ? "Gut" : detailDialog.qualityDetails.level === "yellow" ? "Mittel" : "Schlecht"}
                          </Badge>
                        ) : "–"}
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Erkannter Schrifttyp</p>
                        <p className="text-sm font-medium">
                          {detailDialog.qualityDetails.detectedScriptType
                            ? getScriptTypeDisplayLabel(detailDialog.qualityDetails.detectedScriptType)
                            : "–"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Lesbarkeit</p>
                        <p className="text-sm font-medium">
                          {detailDialog.qualityDetails.readability != null
                            ? `${detailDialog.qualityDetails.readability} / 5`
                            : "–"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Konfidenz</p>
                        <p className="text-sm font-medium">
                          {detailDialog.qualityDetails.confidence != null
                            ? `${detailDialog.qualityDetails.confidence}%`
                            : "–"}
                        </p>
                      </div>
                    </div>

                    {detailDialog.qualityDetails.recommendation && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Empfehlung</p>
                        <p className="text-sm bg-muted rounded-md p-2">{detailDialog.qualityDetails.recommendation}</p>
                      </div>
                    )}

                    {detailDialog.qualityDetails.issues && detailDialog.qualityDetails.issues.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Erkannte Probleme</p>
                        <ul className="text-sm space-y-1">
                          {detailDialog.qualityDetails.issues.map((issue, i) => (
                            <li key={i} className="flex gap-2 bg-muted rounded-md p-2">
                              <span className="text-amber-500">•</span>
                              {issue}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}

                {!detailDialog.qualityDetails && (
                  <p className="text-sm text-muted-foreground italic">Keine KI-Analyse vorhanden.</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
