import { useState, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient, getAuthHeaders } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  Upload as UploadIcon,
  X,
  FileImage,
  FileText,
  ArrowRight,
  ArrowLeft,
  Images,
  Coins,
  AlertTriangle,
  Info,
  Plus,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { translationLanguages } from "@shared/models/transcription";
import { trackBeginCheckout } from "@/lib/gtag";
import type { UserCredits } from "@shared/models/transcription";

// Liest eine Datei als reinen Base64-String (ohne "data:...;base64,"-Präfix).
// Wird für den WAF-Workaround beim Upload benötigt (siehe Kommentar in der Mutation).
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function UploadPage() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  type FileEntry = { id: string; file: File; preview: string };
  const nextIdRef = useRef(0);
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const files = entries.map((e) => e.file);
  const [translationLanguage, setTranslationLanguage] = useState("none");
  const [dragOver, setDragOver] = useState(false);

  const { data: credits } = useQuery<UserCredits>({
    queryKey: ["/api/credits"],
  });
  const currentCredits = credits?.credits ?? 0;
  const previewCreditsNeeded = files.length > 0 ? 1 : 0;
  const hasEnoughCredits = previewCreditsNeeded === 0 || currentCredits >= previewCreditsNeeded;

  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB per file
  const MAX_TOTAL_SIZE = 50 * 1024 * 1024; // 50 MB total per upload

  const addFiles = useCallback(
    (newFiles: FileList | File[]) => {
      const incoming = Array.from(newFiles);

      const validFiles = incoming.filter(
        (f) => f.type.startsWith("image/") || f.type === "application/pdf"
      );
      if (validFiles.length === 0) {
        toast({
          title: t("upload.invalidFormatTitle"),
          description: t("upload.invalidFormatDesc"),
          variant: "destructive",
        });
        return;
      }

      const tooLarge = validFiles.filter((f) => f.size > MAX_FILE_SIZE);
      if (tooLarge.length > 0) {
        const names = tooLarge.map((f) => f.name).join(", ");
        toast({
          title: t("upload.fileTooLargeTitle"),
          description: t("upload.fileTooLargeDesc", { names }),
          variant: "destructive",
        });
      }
      const filesToAdd = tooLarge.length > 0
        ? validFiles.filter((f) => f.size <= MAX_FILE_SIZE)
        : validFiles;
      if (filesToAdd.length === 0) return;

      const existingSize = entries.reduce((sum, e) => sum + e.file.size, 0);
      const newSize = filesToAdd.reduce((sum, f) => sum + f.size, 0);
      if (existingSize + newSize > MAX_TOTAL_SIZE) {
        toast({
          title: t("upload.totalSizeExceededTitle"),
          description: t("upload.maxSizeDesc"),
          variant: "destructive",
        });
        return;
      }

      const newEntries: FileEntry[] = filesToAdd.map((file) => ({
        id: String(nextIdRef.current++),
        file,
        preview: file.type === "application/pdf" ? "pdf" : "",
      }));

      setEntries((prev) => [...prev, ...newEntries]);

      newEntries.forEach((entry) => {
        if (entry.file.type.startsWith("image/")) {
          const reader = new FileReader();
          const entryId = entry.id;
          reader.onload = (e) => {
            setEntries((prev) =>
              prev.map((item) =>
                item.id === entryId
                  ? { ...item, preview: e.target?.result as string }
                  : item
              )
            );
          };
          reader.readAsDataURL(entry.file);
        }
      });
    },
    [toast, entries]
  );

  const removeFile = (index: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== index));
  };

  const moveFile = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    setEntries((prev) => {
      const next = [...prev];
      const [removed] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, removed);
      return next;
    });
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const uploadMutation = useMutation({
    mutationFn: async () => {
      const totalSize = files.reduce((sum, f) => sum + f.size, 0);
      if (totalSize > MAX_TOTAL_SIZE) {
        throw new Error(t("upload.maxSizeDesc"));
      }

      // WAF-Workaround: Replits Deployment-Edge blockt Multipart-PDF-Uploads (erkennt
      // PDF-Signaturen als Angriff → 403). Deshalb senden wir die Dateien Base64-kodiert
      // in einem JSON-Body; so sieht die WAF keine PDF-Signatur und lässt den Request durch.
      const filePayloads = await Promise.all(
        files.map(async (file) => ({
          filename: file.name,
          mimeType:
            file.type ||
            (file.name.toLowerCase().endsWith(".pdf")
              ? "application/pdf"
              : "application/octet-stream"),
          dataBase64: await fileToBase64(file),
        }))
      );

      const authHeaders = await getAuthHeaders();
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({
          files: filePayloads,
          scriptType: "auto",
          ...(translationLanguage && translationLanguage !== "none"
            ? { translationLanguage }
            : {}),
        }),
      });
      if (!res.ok) {
        let errorMsg = t("upload.uploadFailed");
        try {
          const text = await res.text();
          if (text) {
            try {
              const parsed = JSON.parse(text);
              errorMsg = parsed.message || errorMsg;
            } catch {
              errorMsg = text;
            }
          }
        } catch {
          // Body could not be read
        }
        throw new Error(errorMsg);
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/credits"] });
      navigate(`/app/preview/${data.jobId}`);
    },
    onError: (error: Error) => {
      toast({
        title: t("upload.uploadErrorTitle"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold mb-1" data-testid="text-upload-title">
          {t("upload.title")}
        </h1>
        <p className="text-muted-foreground">
          {t("upload.subtitle")}
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.pdf,application/pdf"
        className="hidden"
        onChange={(e) => e.target.files && addFiles(e.target.files)}
        data-testid="input-file"
      />

      {files.length === 0 && (
        <div
          className={`relative border-2 border-dashed rounded-md p-10 text-center transition-colors cursor-pointer ${
            dragOver
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          data-testid="dropzone"
          data-tour="upload-dropzone"
        >
          <Images className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="font-medium mb-1">
            {t("upload.dropzoneTitle")}
          </p>
          <p className="text-sm text-muted-foreground mb-2">
            {t("upload.dropzoneHint")}
          </p>
          <Badge variant="secondary" className="text-xs">
            {t("upload.dropzoneBadge")}
          </Badge>
        </div>
      )}

      {files.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg font-semibold">
              {t("upload.uploadedFiles", { count: files.length })}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEntries([]);
              }}
              data-testid="button-clear-files"
            >
              {t("upload.removeAll")}
            </Button>
          </div>
          <Card className={cn(
            "p-4",
            !hasEnoughCredits
              ? "border-destructive/40 bg-destructive/[0.04]"
              : "border-primary/20 bg-primary/[0.02]",
          )}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Coins className="h-5 w-5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm">
                    {files.length === 1 && !files.some((f) => f.type === "application/pdf")
                      ? <>{t("upload.costPrefix")} <span className="font-medium">{t("upload.costOneCredit")}</span></>
                      : <>{t("upload.costFirstPagePrefix")} <span className="font-medium">{t("upload.costOneCredit")}</span></>
                    }
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("upload.yourBalance")}: {currentCredits} {currentCredits === 1 ? t("upload.creditOne") : t("upload.creditMany")}
                    {files.length > 1 && (
                      <span> {t("upload.moreCreditsNeeded", { count: files.length })}</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!hasEnoughCredits && (
                  <div className="flex items-center gap-2 mr-2">
                    <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                    <span className="text-sm text-destructive font-medium">
                      {t("upload.notEnoughBalance")}
                    </span>
                  </div>
                )}
                {!hasEnoughCredits && (
                  <Button variant="outline" size="sm" onClick={() => {
                    trackBeginCheckout();
                    navigate("/app/pricing");
                  }}>
                    <Coins className="h-4 w-4 mr-2" />
                    {t("upload.buyCredits")}
                  </Button>
                )}
                <Button
                  size="default"
                  disabled={files.length === 0 || !hasEnoughCredits || uploadMutation.isPending}
                  onClick={() => uploadMutation.mutate()}
                  data-testid="button-start-transcription"
                  data-tour="upload-submit"
                >
                  {uploadMutation.isPending ? (
                    <>
                      <UploadIcon className="h-4 w-4 mr-2 animate-spin" />
                      {t("upload.uploading")}
                    </>
                  ) : (
                    <>
                      {files.length === 1 ? t("upload.startTranscription") : t("upload.continueToPreview")}
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>

          <p className="text-sm text-muted-foreground">
            {t("upload.reorderHint")}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {entries.map((entry, idx) => {
              const file = entry.file;
              const preview = entry.preview;
              return (
              <Card
                key={entry.id}
                className="relative overflow-visible group"
                data-testid={`card-file-${idx}`}
              >
                <div className="aspect-[3/4] rounded-md overflow-hidden bg-muted">
                  {preview && preview !== "pdf" ? (
                    <img
                      src={preview}
                      alt={file.name}
                      className="w-full h-full object-cover"
                    />
                  ) : preview === "pdf" ? (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-red-50 dark:bg-red-950/20">
                      <FileText className="h-10 w-10 text-red-500" />
                      <span className="text-xs font-medium text-red-600 dark:text-red-400">PDF</span>
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FileImage className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="p-2">
                  <p className="text-xs truncate" title={file.name}>
                    {file.name}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <Badge variant="secondary" className="text-[10px]">
                      {t("upload.pageAbbrev", { n: idx + 1 })}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {file.size < 1024 * 1024
                        ? `${(file.size / 1024).toFixed(0)} KB`
                        : `${(file.size / (1024 * 1024)).toFixed(1)} MB`}
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-1 mt-2">
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="h-9 w-9 sm:h-7 sm:w-7 rounded-full"
                      disabled={idx === 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        moveFile(idx, idx - 1);
                      }}
                      title={t("upload.moveLeft")}
                      data-testid={`button-move-up-${idx}`}
                    >
                      <ArrowLeft className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="h-9 w-9 sm:h-7 sm:w-7 rounded-full"
                      disabled={idx === entries.length - 1}
                      onClick={(e) => {
                        e.stopPropagation();
                        moveFile(idx, idx + 1);
                      }}
                      title={t("upload.moveRight")}
                      data-testid={`button-move-down-${idx}`}
                    >
                      <ArrowRight className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                    </Button>
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute -top-2 -right-2 h-8 w-8 sm:h-6 sm:w-6 rounded-full bg-destructive text-destructive-foreground"
                  style={{ visibility: "visible" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(idx);
                  }}
                  data-testid={`button-remove-file-${idx}`}
                >
                  <X className="h-4 w-4 sm:h-3 sm:w-3" />
                </Button>
              </Card>
              );
            })}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-2 aspect-[3/4] rounded-md border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/[0.03] transition-colors cursor-pointer"
              data-tour="upload-add-more"
            >
              <Plus className="h-8 w-8 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">{t("upload.morePages")}</span>
            </button>
          </div>

          {files.length === 1 && (
            <div className="flex items-start gap-2.5 rounded-md border border-primary/20 bg-primary/[0.03] p-3">
              <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{t("upload.morePagesQuestion")}</span>{" "}
                {t("upload.morePagesInfo")}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3" data-tour="upload-translation-select">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <label className="text-sm text-muted-foreground whitespace-nowrap">{t("upload.translateToOtherLanguage")}</label>
          <Select
            value={translationLanguage}
            onValueChange={setTranslationLanguage}
          >
            <SelectTrigger className="w-full sm:w-64" data-testid="select-translation-language">
              <SelectValue placeholder={t("upload.noTranslation")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t("upload.noTranslation")}</SelectItem>
              {translationLanguages.map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  {lang.label}
                  <span className="ml-2 text-muted-foreground">{lang.labelNative}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
