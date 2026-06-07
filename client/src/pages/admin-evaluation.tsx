import React, { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient, getAuthHeaders } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import {
  documentTypes,
  documentTypeLabels,
  type DocumentType,
} from "@shared/models/transcription";
import {
  FileText,
  FileImage,
  Upload,
  Play,
  Trash2,
  Loader2,
  ChevronRight,
  BarChart3,
  FlaskConical,
  ChevronDown,
} from "lucide-react";

type Provider = "anthropic" | "google";

const ANTHROPIC_MODELS = [
  { value: "claude-opus-4-6", label: "Claude Opus 4.6 (Standard)" },
  { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
  { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet" },
  { value: "claude-3-haiku-20240307", label: "Claude 3 Haiku" },
] as const;

const GEMINI_MODELS = [
  { value: "gemini-3.5-flash", label: "Gemini 3.5 Flash" },
  { value: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro (Preview)" },
  { value: "gemini-3-flash-preview", label: "Gemini 3 Flash (Preview)" },
  { value: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash-Lite" },
  { value: "gemini-3.1-flash-lite-preview", label: "Gemini 3.1 Flash-Lite (Preview)" },
  { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { value: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash-Lite" },
] as const;

function getModelsForProvider(provider: Provider) {
  return provider === "google" ? GEMINI_MODELS : ANTHROPIC_MODELS;
}

function getDefaultModelLabel(provider: Provider) {
  return provider === "google"
    ? "Standard (gemini-2.5-flash)"
    : "Standard (claude-opus-4-6)";
}

interface EvaluationDocument {
  id: number;
  name: string;
  scriptType: string;
  difficulty: string;
  fileUrl: string;
  fileType: string;
  groundTruth: string;
  notes: string | null;
  createdAt: string;
}

interface EvaluationRun {
  id: number;
  name: string;
  config: Record<string, unknown>;
  status: string;
  summary?: {
    avgCER?: number;
    avgWER?: number;
    totalTokens?: number;
    totalDurationMs?: number;
    documentCount?: number;
  };
  createdAt: string;
  completedAt: string | null;
}

interface EvalResultWithDoc {
  id: number;
  runId: number;
  documentId: number;
  transcription: string | null;
  cer: number | null;
  wer: number | null;
  confidence: number | null;
  tokensUsed: number | null;
  durationMs: number | null;
  status: string;
  document?: EvaluationDocument;
}

function formatPct(val: number | null | undefined): string {
  if (val == null) return "–";
  return `${(val * 100).toFixed(2)}%`;
}

function formatDate(s: string | null | undefined): string {
  if (!s) return "–";
  return new Date(s).toLocaleString("de-DE");
}

export default function AdminEvaluationPage() {
  const { toast } = useToast();
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null);
  const [testSingleDoc, setTestSingleDoc] = useState<EvaluationDocument | null>(
    null
  );
  const [testScriptType, setTestScriptType] = useState<string>("auto");

  const { data: documents = [], isLoading: docsLoading } = useQuery<
    EvaluationDocument[]
  >({
    queryKey: ["/api/admin/eval/documents"],
    retry: false,
  });

  const { data: runs = [], isLoading: runsLoading } = useQuery<EvaluationRun[]>({
    queryKey: ["/api/admin/eval/runs"],
    retry: false,
  });

  const { data: runDetail, isLoading: runDetailLoading } = useQuery<{
    run: EvaluationRun;
    results: EvalResultWithDoc[];
  }>({
    queryKey: ["/api/admin/eval/runs", selectedRunId],
    queryFn: async () => {
      const authHeaders = await getAuthHeaders();
      const res = await fetch(`/api/admin/eval/runs/${selectedRunId}`, {
        headers: authHeaders,
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    enabled: !!selectedRunId,
    retry: false,
  });

  const deleteDocMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest("DELETE", `/api/admin/eval/documents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/eval/documents"] });
      toast({ title: "Dokument gelöscht" });
    },
    onError: (e: Error) => {
      toast({ title: "Fehler", description: e.message, variant: "destructive" });
    },
  });

  const deleteRunMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest("DELETE", `/api/admin/eval/runs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/eval/runs"] });
      if (selectedRunId) setSelectedRunId(null);
      toast({ title: "Run gelöscht" });
    },
    onError: (e: Error) => {
      toast({ title: "Fehler", description: e.message, variant: "destructive" });
    },
  });

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-serif font-bold flex items-center gap-2">
          <FlaskConical className="h-6 w-6" />
          Transkriptions-Evaluation
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Ground-Truth-Dokumente verwalten, Testruns starten und Ergebnisse
          vergleichen.
        </p>
      </div>

      <Tabs defaultValue="documents">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="documents">Testdokumente</TabsTrigger>
          <TabsTrigger value="run">Testrun starten</TabsTrigger>
          <TabsTrigger value="dashboard">Ergebnisse</TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="mt-6">
          <DocumentsTab
            documents={documents}
            isLoading={docsLoading}
            onDelete={(id) => deleteDocMutation.mutate(id)}
            onTest={(doc) => {
              setTestSingleDoc(doc);
              setTestScriptType(doc.scriptType);
            }}
          />
        </TabsContent>

        <TabsContent value="run" className="mt-6">
          <RunConfigTab documents={documents} runs={runs} />
        </TabsContent>

        <TabsContent value="dashboard" className="mt-6">
          <DashboardTab
            runs={runs}
            isLoading={runsLoading}
            selectedRunId={selectedRunId}
            onSelectRun={setSelectedRunId}
            runDetail={runDetail}
            runDetailLoading={runDetailLoading}
            onDeleteRun={(id) => deleteRunMutation.mutate(id)}
          />
        </TabsContent>
      </Tabs>

      {testSingleDoc && (
        <TestSingleDialog
          doc={testSingleDoc}
          scriptType={testScriptType}
          onScriptTypeChange={setTestScriptType}
          onClose={() => setTestSingleDoc(null)}
        />
      )}
    </div>
  );
}

function DocumentsTab({
  documents,
  isLoading,
  onDelete,
  onTest,
}: {
  documents: EvaluationDocument[];
  isLoading: boolean;
  onDelete: (id: number) => void;
  onTest: (doc: EvaluationDocument) => void;
}) {
  interface FileEntry {
    file: File;
    name: string;
    groundTruth: string;
    notes: string;
  }

  const { toast } = useToast();
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [scriptType, setScriptType] = useState<string>("auto");
  const [difficulty, setDifficulty] = useState("medium");

  const updateEntry = useCallback(
    (idx: number, patch: Partial<FileEntry>) =>
      setEntries((prev) =>
        prev.map((e, i) => (i === idx ? { ...e, ...patch } : e))
      ),
    []
  );

  const removeEntry = useCallback(
    (idx: number) => setEntries((prev) => prev.filter((_, i) => i !== idx)),
    []
  );

  const allValid =
    entries.length > 0 &&
    entries.every((e) => e.name.trim() && e.groundTruth.trim());

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!allValid) throw new Error("Alle Einträge müssen Name und Ground Truth haben");
      const fd = new FormData();
      for (const entry of entries) {
        fd.append("files", entry.file);
      }
      fd.append("entries", JSON.stringify(entries.map((e) => ({
        name: e.name,
        groundTruth: e.groundTruth,
        notes: e.notes || null,
      }))));
      fd.append("scriptType", scriptType);
      fd.append("difficulty", difficulty);
      const authHeaders = await getAuthHeaders();
      const res = await fetch("/api/admin/eval/documents", {
        method: "POST",
        body: fd,
        headers: authHeaders,
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "Upload fehlgeschlagen");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/eval/documents"] });
      setEntries([]);
      toast({ title: `${entries.length} Dokument(e) hochgeladen` });
    },
    onError: (e: Error) => {
      toast({ title: "Fehler", description: e.message, variant: "destructive" });
    },
  });

  const addFiles = useCallback((fileList: FileList | File[]) => {
    const accepted = Array.from(fileList).filter(
      (f) => f.type.startsWith("image/") || f.type === "application/pdf"
    );
    if (accepted.length === 0) return;
    setEntries((prev) => [
      ...prev,
      ...accepted.map((f) => ({
        file: f,
        name: f.name.replace(/\.[^.]+$/, ""),
        groundTruth: "",
        notes: "",
      })),
    ]);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files);
    e.target.value = "";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <h3 className="font-medium mb-4">Testdokumente hochladen</h3>
        <div
          className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/50 transition-colors"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => document.getElementById("eval-file-input")?.click()}
        >
          <input
            id="eval-file-input"
            type="file"
            className="hidden"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            multiple
            onChange={handleFileChange}
          />
          <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            Bilder oder PDFs hier ablegen oder klicken (mehrere möglich)
          </p>
        </div>

        {entries.length > 0 && (
          <>
            <div className="grid gap-4 mt-4 sm:grid-cols-2">
              <div>
                <Label>Skripttyp (für alle)</Label>
                <Select value={scriptType} onValueChange={setScriptType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {documentTypes.map((t) => (
                      <SelectItem key={t} value={t}>
                        {documentTypeLabels[t as DocumentType]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Schwierigkeit (für alle)</Label>
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Einfach</SelectItem>
                    <SelectItem value="medium">Mittel</SelectItem>
                    <SelectItem value="hard">Schwer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {entries.map((entry, idx) => (
                <Card key={idx} className="p-3 border">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {entry.file.type === "application/pdf" ? (
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <FileImage className="h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                      <span className="text-xs text-muted-foreground truncate">
                        {entry.file.name}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0 text-destructive"
                      onClick={() => removeEntry(idx)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label className="text-xs">Name</Label>
                      <Input
                        value={entry.name}
                        onChange={(e) =>
                          updateEntry(idx, { name: e.target.value })
                        }
                        placeholder="z.B. suetterlin-001"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Anmerkungen (optional)</Label>
                      <Input
                        value={entry.notes}
                        onChange={(e) =>
                          updateEntry(idx, { notes: e.target.value })
                        }
                        placeholder="z.B. Quelle"
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                  <div className="mt-2">
                    <Label className="text-xs">
                      Ground Truth (korrekte Transkription)
                    </Label>
                    <Textarea
                      value={entry.groundTruth}
                      onChange={(e) =>
                        updateEntry(idx, { groundTruth: e.target.value })
                      }
                      placeholder="Korrekte Transkription eingeben..."
                      rows={3}
                      className="mt-1 text-sm"
                    />
                  </div>
                </Card>
              ))}
            </div>

            <div className="flex items-center gap-3 mt-4">
              <Button
                onClick={() => uploadMutation.mutate()}
                disabled={!allValid || uploadMutation.isPending}
              >
                {uploadMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {entries.length === 1
                  ? "1 Dokument hochladen"
                  : `${entries.length} Dokumente hochladen`}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEntries([])}
              >
                Alle entfernen
              </Button>
            </div>
          </>
        )}
      </Card>

      <Card className="p-4">
        <h3 className="font-medium mb-4">Testdokumente ({documents.length})</h3>
        {documents.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Noch keine Testdokumente. Lade das erste oben hoch.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Typ</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Skript</TableHead>
                <TableHead>GT-Länge</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell>
                    {doc.fileType === "pdf" ? (
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <FileImage className="h-4 w-4 text-muted-foreground" />
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{doc.name}</TableCell>
                  <TableCell>{documentTypeLabels[doc.scriptType as DocumentType] ?? doc.scriptType}</TableCell>
                  <TableCell>{doc.groundTruth.length} Zeichen</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onTest(doc)}
                    >
                      Testen
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => onDelete(doc.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}

type DataSource = "eval_documents" | "production";

interface ProductionPage {
  pageId: number;
  jobId: number;
  pageNumber: number;
  imageUrl: string;
  scriptType: string;
  transcription: string;
  inputTokens: number | null;
  outputTokens: number | null;
  createdAt: string | null;
}

function RunConfigTab({
  documents,
  runs,
}: {
  documents: EvaluationDocument[];
  runs: EvaluationRun[];
}) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [provider, setProvider] = useState<Provider>("anthropic");
  const [scriptType, setScriptType] = useState<string>("auto");
  const [model, setModel] = useState<string>("");
  const [maxTokens, setMaxTokens] = useState<string>("");
  const [thinkingBudget, setThinkingBudget] = useState<string>("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [taskPrompt, setTaskPrompt] = useState("");
  const [preprocessAuto, setPreprocessAuto] = useState(false);
  const [preprocessContrast, setPreprocessContrast] = useState(false);
  const [preprocessSharpen, setPreprocessSharpen] = useState(false);
  const [preprocessBinarize, setPreprocessBinarize] = useState(false);
  const [selectedDocIds, setSelectedDocIds] = useState<Set<number>>(new Set());
  const [dataSource, setDataSource] = useState<DataSource>("eval_documents");
  const [selectedPageIds, setSelectedPageIds] = useState<Set<number>>(new Set());

  const { data: productionPages = [], isLoading: prodPagesLoading } = useQuery<ProductionPage[]>({
    queryKey: ["/api/admin/eval/production-pages"],
    queryFn: async () => {
      const authHeaders = await getAuthHeaders();
      const res = await fetch("/api/admin/eval/production-pages?limit=200", {
        headers: authHeaders,
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    enabled: dataSource === "production",
    retry: false,
  });

  const createRunMutation = useMutation({
    mutationFn: async () => {
      const config: Record<string, unknown> = { scriptType };
      if (provider !== "anthropic") config.provider = provider;
      if (model) config.model = model;
      const mt = parseInt(maxTokens, 10);
      if (!isNaN(mt) && mt > 0) config.maxTokens = mt;
      const tb = parseInt(thinkingBudget, 10);
      if (!isNaN(tb) && tb >= 0) config.thinkingBudget = tb;
      if (systemPrompt.trim()) config.systemPrompt = systemPrompt.trim();
      if (taskPrompt.trim()) config.taskPrompt = taskPrompt.trim();
      if (preprocessAuto) {
        config.preprocessing = { preprocessingAuto: true };
      } else if (preprocessContrast || preprocessSharpen || preprocessBinarize) {
        config.preprocessing = {
          contrast: preprocessContrast,
          sharpen: preprocessSharpen,
          binarize: preprocessBinarize,
        };
      }

      const payload: Record<string, unknown> = {
        name: name || `Run ${new Date().toISOString().slice(0, 19)}`,
        config,
      };
      if (dataSource === "production") {
        payload.productionPageIds = selectedPageIds.size > 0
          ? Array.from(selectedPageIds)
          : productionPages.map((p) => p.pageId);
      } else {
        payload.documentIds = selectedDocIds.size > 0
          ? Array.from(selectedDocIds)
          : undefined;
      }

      const res = await apiRequest("POST", "/api/admin/eval/runs", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/eval/runs"] });
      setName("");
      setProvider("anthropic");
      setModel("");
      setMaxTokens("");
      setThinkingBudget("");
      setSystemPrompt("");
      setTaskPrompt("");
      setPreprocessAuto(false);
      setPreprocessContrast(false);
      setPreprocessSharpen(false);
      setPreprocessBinarize(false);
      setSelectedDocIds(new Set());
      setSelectedPageIds(new Set());
      toast({ title: "Testrun gestartet" });
    },
    onError: (e: Error) => {
      toast({ title: "Fehler", description: e.message, variant: "destructive" });
    },
  });

  const toggleDoc = (id: number) => {
    setSelectedDocIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const togglePage = (id: number) => {
    setSelectedPageIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const runningCount = runs.filter((r) => r.status === "running").length;
  const canStart = dataSource === "production"
    ? productionPages.length > 0
    : documents.length > 0;

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <h3 className="font-medium mb-4">Neuen Testrun starten</h3>
        <div className="space-y-4">
          <div>
            <Label>Name des Runs</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. v2-suetterlin-prompt-test"
            />
          </div>
          <div>
            <Label>Skripttyp</Label>
            <Select value={scriptType} onValueChange={setScriptType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {documentTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {documentTypeLabels[t as DocumentType]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Provider</Label>
              <Select
                value={provider}
                onValueChange={(v) => {
                  setProvider(v as Provider);
                  setModel("");
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                  <SelectItem value="google">Google (Gemini)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Model</Label>
              <Select value={model || "__default__"} onValueChange={(v) => setModel(v === "__default__" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder={getDefaultModelLabel(provider)} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__default__">{getDefaultModelLabel(provider)}</SelectItem>
                  {getModelsForProvider(provider).map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Max Tokens</Label>
              <Input
                type="number"
                value={maxTokens}
                onChange={(e) => setMaxTokens(e.target.value)}
                placeholder="16384"
                min={256}
                max={200000}
              />
            </div>
            <div>
              <Label>Thinking Budget</Label>
              <Input
                type="number"
                value={thinkingBudget}
                onChange={(e) => setThinkingBudget(e.target.value)}
                placeholder="10000"
                min={0}
                max={50000}
              />
            </div>
          </div>
          <div>
            <Label>Bild-Preprocessing (nur für Bilder, nicht PDF)</Label>
            <div className="flex items-center gap-4 mt-2 mb-3">
              <div className="flex items-center gap-2">
                <Switch
                  id="prep-auto"
                  checked={preprocessAuto}
                  onCheckedChange={setPreprocessAuto}
                />
                <label htmlFor="prep-auto" className="text-sm cursor-pointer font-medium">
                  Regelbasiert (Auto) – für Tests ein-/ausschaltbar
                </label>
              </div>
            </div>
            {!preprocessAuto && (
              <div className="flex flex-wrap gap-4 mt-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="prep-contrast"
                    checked={preprocessContrast}
                    onCheckedChange={(c) => setPreprocessContrast(!!c)}
                  />
                  <label htmlFor="prep-contrast" className="text-sm cursor-pointer">Kontrast</label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="prep-sharpen"
                    checked={preprocessSharpen}
                    onCheckedChange={(c) => setPreprocessSharpen(!!c)}
                  />
                  <label htmlFor="prep-sharpen" className="text-sm cursor-pointer">Schärfen</label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="prep-binarize"
                    checked={preprocessBinarize}
                    onCheckedChange={(c) => setPreprocessBinarize(!!c)}
                  />
                  <label htmlFor="prep-binarize" className="text-sm cursor-pointer">Binarisierung</label>
                </div>
              </div>
            )}
          </div>
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="flex items-center gap-2">
                <ChevronDown className="h-4 w-4" />
                Erweiterte Einstellungen (Custom Prompts)
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
              <div>
                <Label>System-Prompt (optional)</Label>
                <Textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder="Überschreibt den Standard-System-Prompt pro Skripttyp"
                  rows={4}
                  className="mt-1 font-mono text-sm"
                />
              </div>
              <div>
                <Label>Task-Prompt (optional)</Label>
                <Textarea
                  value={taskPrompt}
                  onChange={(e) => setTaskPrompt(e.target.value)}
                  placeholder="Überschreibt den Standard-Task-Prompt pro Skripttyp"
                  rows={4}
                  className="mt-1 font-mono text-sm"
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          <div>
            <Label>Datenquelle</Label>
            <Select value={dataSource} onValueChange={(v) => setDataSource(v as DataSource)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="eval_documents">Testdokumente (mit Ground Truth)</SelectItem>
                <SelectItem value="production">Produktions-Transkriptionen (Claude als Referenz)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              {dataSource === "production"
                ? "Die bestehende Claude-Transkription wird als Referenz für CER/WER verwendet."
                : "Manuell erstellte Ground-Truth-Texte werden als Referenz verwendet."}
            </p>
          </div>

          {dataSource === "eval_documents" ? (
            <div>
              <Label>Dokumente</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Leer = alle. Sonst: ausgewählte Dokumente.
              </p>
              <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-2">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => toggleDoc(doc.id)}
                  >
                    <span onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedDocIds.has(doc.id)}
                        onCheckedChange={() => toggleDoc(doc.id)}
                      />
                    </span>
                    <span className="text-sm">{doc.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {doc.fileType}
                    </Badge>
                  </div>
                ))}
                {documents.length === 0 && (
                  <p className="text-sm text-muted-foreground py-2">
                    Keine Testdokumente. Zuerst im Tab „Testdokumente“ hochladen.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div>
              <Label>Produktions-Transkriptionen</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Leer = alle. ({selectedPageIds.size > 0 ? `${selectedPageIds.size} ausgewählt` : `${productionPages.length} verfügbar`})
              </p>
              {prodPagesLoading ? (
                <div className="flex items-center gap-2 py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Lade Transkriptionen...</span>
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto border rounded-md p-2 space-y-1">
                  {productionPages.map((p) => (
                    <div
                      key={p.pageId}
                      className="flex items-center gap-2 cursor-pointer py-1"
                      onClick={() => togglePage(p.pageId)}
                    >
                      <span onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedPageIds.has(p.pageId)}
                          onCheckedChange={() => togglePage(p.pageId)}
                        />
                      </span>
                      <span className="text-sm truncate flex-1">
                        Job {p.jobId} / Seite {p.pageNumber}
                      </span>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {p.scriptType}
                      </Badge>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {p.transcription ? `${p.transcription.slice(0, 40)}…` : "–"}
                      </span>
                    </div>
                  ))}
                  {productionPages.length === 0 && (
                    <p className="text-sm text-muted-foreground py-2">
                      Keine abgeschlossenen Transkriptionen vorhanden.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <Button
            onClick={() => createRunMutation.mutate()}
            disabled={
              !canStart ||
              createRunMutation.isPending
            }
          >
            {createRunMutation.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            Run starten
          </Button>
          {runningCount > 0 && (
            <p className="text-sm text-muted-foreground">
              {runningCount} Run(s) laufen gerade parallel.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}

function DashboardTab({
  runs,
  isLoading,
  selectedRunId,
  onSelectRun,
  runDetail,
  runDetailLoading,
  onDeleteRun,
}: {
  runs: EvaluationRun[];
  isLoading: boolean;
  selectedRunId: number | null;
  onSelectRun: (id: number | null) => void;
  runDetail: { run: EvaluationRun; results: EvalResultWithDoc[] } | undefined;
  runDetailLoading: boolean;
  onDeleteRun: (id: number) => void;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <h3 className="font-medium mb-4 flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Testruns
        </h3>
        {runs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Noch keine Testruns. Starte einen im Tab „Testrun starten“.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Datum</TableHead>
                <TableHead>Avg CER</TableHead>
                <TableHead>Avg WER</TableHead>
                <TableHead>Dokumente</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((run) => (
                <TableRow
                  key={run.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() =>
                    onSelectRun(selectedRunId === run.id ? null : run.id)
                  }
                >
                  <TableCell className="font-medium">{run.name}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        run.status === "completed"
                          ? "default"
                          : run.status === "failed"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {run.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(run.createdAt)}</TableCell>
                  <TableCell>{formatPct(run.summary?.avgCER)}</TableCell>
                  <TableCell>{formatPct(run.summary?.avgWER)}</TableCell>
                  <TableCell>{run.summary?.documentCount ?? "–"}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteRun(run.id);
                      }}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {selectedRunId && (
        <RunDetailPanel
          runDetail={runDetail}
          isLoading={runDetailLoading}
          onClose={() => onSelectRun(null)}
        />
      )}
    </div>
  );
}

function RunDetailPanel({
  runDetail,
  isLoading,
  onClose,
}: {
  runDetail: { run: EvaluationRun; results: EvalResultWithDoc[] } | undefined;
  isLoading: boolean;
  onClose: () => void;
}) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  if (!runDetail) return null;
  const { run, results } = runDetail;
  const s = run.summary;
  const cfg = run.config as Record<string, unknown> | null;
  const runProvider = (cfg?.provider as string) || "anthropic";
  const runModel = (cfg?.model as string) || (runProvider === "google" ? "gemini-2.5-flash" : "claude-sonnet-4-20250514");
  const runScriptType = (cfg?.scriptType as string) || "auto";

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-medium">{run.name}</h3>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge variant="outline" className="text-xs">
              {runProvider === "google" ? "Gemini" : "Claude"}
            </Badge>
            <Badge variant="secondary" className="text-xs font-mono">
              {runModel}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {runScriptType}
            </Badge>
            {(s as any)?.source === "production" && (
              <Badge variant="outline" className="text-xs text-amber-600 border-amber-400">
                Produktionsdaten
              </Badge>
            )}
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Schließen
        </Button>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Avg CER</p>
              <p className="text-lg font-mono">{formatPct(s?.avgCER)}</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Avg WER</p>
              <p className="text-lg font-mono">{formatPct(s?.avgWER)}</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Token</p>
              <p className="text-lg font-mono">{s?.totalTokens ?? "–"}</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Dauer</p>
              <p className="text-lg font-mono">
                {s?.totalDurationMs != null
                  ? `${(s.totalDurationMs / 1000).toFixed(1)}s`
                  : "–"}
              </p>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead></TableHead>
                <TableHead>Dokument</TableHead>
                <TableHead>Typ</TableHead>
                <TableHead>CER</TableHead>
                <TableHead>WER</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((r) => (
                <React.Fragment key={r.id}>
                  <TableRow
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() =>
                      setExpandedId(expandedId === r.id ? null : r.id)
                    }
                  >
                    <TableCell className="w-8">
                      <ChevronRight
                        className={`h-4 w-4 transition-transform ${
                          expandedId === r.id ? "rotate-90" : ""
                        }`}
                      />
                    </TableCell>
                    <TableCell>
                      {r.document?.name
                        ?? ((r as any).qualityDetails?.source === "production"
                          ? `Seite ${(r as any).qualityDetails?.pageId ?? "?"}`
                          : r.documentId || "–")}
                    </TableCell>
                    <TableCell>
                      {r.document?.fileType
                        ?? ((r as any).qualityDetails?.source === "production" ? "Produktion" : "–")}
                    </TableCell>
                    <TableCell>{formatPct(r.cer)}</TableCell>
                    <TableCell>{formatPct(r.wer)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          r.status === "completed"
                            ? "default"
                            : r.status === "failed"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {r.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                  {expandedId === r.id && (
                    <TableRow>
                      <TableCell colSpan={6} className="bg-muted/30 p-0">
                        <div className="space-y-4 p-4">
                          {(() => {
                            const imgUrl = (r as any).qualityDetails?.imageUrl || r.document?.fileUrl;
                            if (!imgUrl) return null;
                            const isPdf = imgUrl.toLowerCase().endsWith(".pdf");
                            return (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1">
                                  Originaldokument
                                </p>
                                {isPdf ? (
                                  <a href={imgUrl} target="_blank" rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">
                                    PDF anzeigen ↗
                                  </a>
                                ) : (
                                  <img
                                    src={imgUrl}
                                    alt="Original"
                                    className="max-h-72 rounded-md border object-contain bg-white"
                                  />
                                )}
                              </div>
                            );
                          })()}
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">
                                KI-Transkription ({runModel})
                              </p>
                              <pre className="p-3 bg-background rounded-md text-sm whitespace-pre-wrap max-h-64 overflow-y-auto border">
                                {r.transcription || "(leer)"}
                              </pre>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">
                                {(r as any).qualityDetails?.source === "production"
                                  ? "Referenz (Claude-Transkription)"
                                  : "Ground Truth"}
                              </p>
                              <pre className="p-3 bg-background rounded-md text-sm whitespace-pre-wrap max-h-64 overflow-y-auto border">
                                {(r as any).qualityDetails?.groundTruth
                                  || r.document?.groundTruth
                                  || "(leer)"}
                              </pre>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </>
      )}
    </Card>
  );
}

function TestSingleDialog({
  doc,
  scriptType,
  onScriptTypeChange,
  onClose,
}: {
  doc: EvaluationDocument;
  scriptType: string;
  onScriptTypeChange: (v: string) => void;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [provider, setProvider] = useState<Provider>("anthropic");
  const [model, setModel] = useState("");
  const [maxTokens, setMaxTokens] = useState("");
  const [thinkingBudget, setThinkingBudget] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [taskPrompt, setTaskPrompt] = useState("");
  const [preprocessAuto, setPreprocessAuto] = useState(false);
  const [preprocessContrast, setPreprocessContrast] = useState(false);
  const [preprocessSharpen, setPreprocessSharpen] = useState(false);
  const [preprocessBinarize, setPreprocessBinarize] = useState(false);
  const [result, setResult] = useState<{
    transcription: string;
    cer: number;
    wer: number;
    durationMs: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const runTest = async () => {
    setLoading(true);
    setResult(null);
    try {
      const body: Record<string, unknown> = { documentId: doc.id, scriptType };
      if (provider !== "anthropic") body.provider = provider;
      if (model) body.model = model;
      const mt = parseInt(maxTokens, 10);
      if (!isNaN(mt) && mt > 0) body.maxTokens = mt;
      const tb = parseInt(thinkingBudget, 10);
      if (!isNaN(tb) && tb >= 0) body.thinkingBudget = tb;
      if (systemPrompt.trim()) body.systemPrompt = systemPrompt.trim();
      if (taskPrompt.trim()) body.taskPrompt = taskPrompt.trim();
      if (preprocessAuto) {
        body.preprocessing = { preprocessingAuto: true };
      } else if (preprocessContrast || preprocessSharpen || preprocessBinarize) {
        body.preprocessing = {
          contrast: preprocessContrast,
          sharpen: preprocessSharpen,
          binarize: preprocessBinarize,
        };
      }
      const authHeaders = await getAuthHeaders();
      const res = await fetch("/api/admin/eval/test-single", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setResult({
        transcription: data.transcription,
        cer: data.cer,
        wer: data.wer,
        durationMs: data.durationMs,
      });
    } catch (e: unknown) {
      toast({
        title: "Fehler",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Einzeltest: {doc.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Skripttyp</Label>
            <Select value={scriptType} onValueChange={onScriptTypeChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {documentTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {documentTypeLabels[t as DocumentType]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Provider</Label>
              <Select
                value={provider}
                onValueChange={(v) => {
                  setProvider(v as Provider);
                  setModel("");
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                  <SelectItem value="google">Google (Gemini)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Model</Label>
              <Select value={model || "__default__"} onValueChange={(v) => setModel(v === "__default__" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder={getDefaultModelLabel(provider)} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__default__">{getDefaultModelLabel(provider)}</SelectItem>
                  {getModelsForProvider(provider).map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Max Tokens</Label>
              <Input
                type="number"
                value={maxTokens}
                onChange={(e) => setMaxTokens(e.target.value)}
                placeholder="16384"
              />
            </div>
            <div>
              <Label>Thinking Budget</Label>
              <Input
                type="number"
                value={thinkingBudget}
                onChange={(e) => setThinkingBudget(e.target.value)}
                placeholder="10000"
              />
            </div>
          </div>
          <div>
            <Label>Bild-Preprocessing</Label>
            <div className="flex items-center gap-4 mt-2 mb-3">
              <div className="flex items-center gap-2">
                <Switch
                  id="st-prep-auto"
                  checked={preprocessAuto}
                  onCheckedChange={setPreprocessAuto}
                />
                <label htmlFor="st-prep-auto" className="text-sm cursor-pointer font-medium">
                  Regelbasiert (Auto)
                </label>
              </div>
            </div>
            {!preprocessAuto && (
              <div className="flex flex-wrap gap-4 mt-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="st-prep-contrast"
                    checked={preprocessContrast}
                    onCheckedChange={(c) => setPreprocessContrast(!!c)}
                  />
                  <label htmlFor="st-prep-contrast" className="text-sm cursor-pointer">Kontrast</label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="st-prep-sharpen"
                    checked={preprocessSharpen}
                    onCheckedChange={(c) => setPreprocessSharpen(!!c)}
                  />
                  <label htmlFor="st-prep-sharpen" className="text-sm cursor-pointer">Schärfen</label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="st-prep-binarize"
                    checked={preprocessBinarize}
                    onCheckedChange={(c) => setPreprocessBinarize(!!c)}
                  />
                  <label htmlFor="st-prep-binarize" className="text-sm cursor-pointer">Binarisierung</label>
                </div>
              </div>
            )}
          </div>
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="flex items-center gap-2">
                <ChevronDown className="h-4 w-4" />
                Custom Prompts
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
              <div>
                <Label>System-Prompt</Label>
                <Textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder="Optional"
                  rows={3}
                  className="mt-1 font-mono text-sm"
                />
              </div>
              <div>
                <Label>Task-Prompt</Label>
                <Textarea
                  value={taskPrompt}
                  onChange={(e) => setTaskPrompt(e.target.value)}
                  placeholder="Optional"
                  rows={3}
                  className="mt-1 font-mono text-sm"
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
          <Button onClick={runTest} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Transkribieren & CER/WER berechnen
          </Button>
          {result && (
            <div className="space-y-2 pt-4 border-t">
              <div className="flex gap-4 text-sm">
                <span>
                  <strong>CER:</strong> {formatPct(result.cer)}
                </span>
                <span>
                  <strong>WER:</strong> {formatPct(result.wer)}
                </span>
                <span>
                  <strong>Dauer:</strong> {(result.durationMs / 1000).toFixed(1)}s
                </span>
              </div>
              <div>
                <Label>KI-Transkription</Label>
                <pre className="mt-1 p-3 bg-muted rounded-md text-sm whitespace-pre-wrap max-h-64 overflow-y-auto">
                  {result.transcription || "(leer)"}
                </pre>
              </div>
              <div>
                <Label>Ground Truth</Label>
                <pre className="mt-1 p-3 bg-muted rounded-md text-sm whitespace-pre-wrap max-h-64 overflow-y-auto">
                  {doc.groundTruth}
                </pre>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
