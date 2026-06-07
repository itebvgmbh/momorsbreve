/**
 * Evaluation engine for transcription quality testing.
 * CER/WER metrics and runEvaluation for batch testing.
 */
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import {
  callTranscriptionWithConfig,
  type TranscriptionConfig,
} from "./transcription";
import { callGeminiTranscription } from "./transcription-gemini";
import {
  preprocessImage,
  autoPreprocessImage,
  isImageFile,
  type PreprocessingOptions,
} from "./preprocessing";
import type { EvaluationDocument, EvaluationRun, EvaluationResult } from "@shared/schema";

const uploadDir = path.join(process.cwd(), "uploads");

// ─── Levenshtein distance (for CER) ──────────────────────────────────────────

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

// ─── CER (Character Error Rate) ──────────────────────────────────────────────

/**
 * Character Error Rate: edits / reference_length.
 * Returns value 0–1 (0 = perfect).
 */
export function calculateCER(predicted: string, groundTruth: string): number {
  const ref = (groundTruth || "").trim();
  const pred = (predicted || "").trim();
  if (ref.length === 0) return pred.length > 0 ? 1 : 0;
  const edits = levenshtein(pred, ref);
  return edits / ref.length;
}

// ─── WER (Word Error Rate) ───────────────────────────────────────────────────

/** Levenshtein distance for arrays (e.g. words). */
function levenshteinWords<T>(a: T[], b: T[]): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

/**
 * Word Error Rate: word-level Levenshtein / number of reference words.
 * Returns value 0–1 (0 = perfect).
 */
export function calculateWER(predicted: string, groundTruth: string): number {
  const refWords = (groundTruth || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const predWords = (predicted || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (refWords.length === 0) return predWords.length > 0 ? 1 : 0;
  const edits = levenshteinWords(predWords, refWords);
  return edits / refWords.length;
}

// ─── Transcribe single document (image or PDF) ───────────────────────────────

export type EvalProvider = "anthropic" | "google";

type EvalRunConfig = {
  provider?: EvalProvider;
  scriptType: string;
  systemPrompt?: string;
  taskPrompt?: string;
  model?: string;
  maxTokens?: number;
  thinkingBudget?: number;
  preprocessing?: PreprocessingOptions;
};

async function transcribeDocument(
  doc: EvaluationDocument,
  config: EvalRunConfig,
  uploadDirPath: string
): Promise<{
  transcription: string;
  confidence?: number;
  qualityDetails?: unknown;
  tokensUsed?: number;
  durationMs: number;
}> {
  const filePath = path.join(
    uploadDirPath,
    path.basename(doc.fileUrl)
  );
  if (!fs.existsSync(filePath)) {
    throw new Error(`Datei nicht gefunden: ${filePath}`);
  }

  let buffer = fs.readFileSync(filePath);
  const ext = path.extname(doc.fileUrl).toLowerCase();
  const isPdf = ext === ".pdf";

  let mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif" =
    ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";

  const prep = config.preprocessing;
  if (!isPdf && prep && isImageFile(doc.fileUrl)) {
    if (prep.preprocessingAuto) {
      const preprocessed = await autoPreprocessImage(buffer, true);
      buffer = preprocessed.buffer;
      mediaType = "image/png";
    } else {
      const hasManual = prep.contrast || prep.sharpen || prep.binarize;
      if (hasManual) {
        const preprocessed = await preprocessImage(buffer, prep);
        buffer = preprocessed.buffer;
        mediaType = "image/png";
      }
    }
  }

  const base64 = buffer.toString("base64");

  const txConfig: TranscriptionConfig = {};
  if (config.systemPrompt) txConfig.systemPrompt = config.systemPrompt;
  if (config.taskPrompt) txConfig.taskPrompt = config.taskPrompt;
  if (config.model) txConfig.model = config.model;
  if (config.maxTokens) txConfig.maxTokens = config.maxTokens;
  if (config.thinkingBudget) txConfig.thinkingBudget = config.thinkingBudget;

  const contentBlock = isPdf
    ? {
        type: "document" as const,
        source: {
          type: "base64" as const,
          media_type: "application/pdf" as const,
          data: base64,
        },
      }
    : {
        type: "image" as const,
        source: {
          type: "base64" as const,
          media_type: mediaType,
          data: base64,
        },
      };

  const label = `Eval (${doc.name}, ${isPdf ? "PDF" : "Image"})`;
  const start = Date.now();

  const useGemini = config.provider === "google";
  const { text, message } = useGemini
    ? await callGeminiTranscription(contentBlock, config.scriptType, label, txConfig)
    : await callTranscriptionWithConfig(contentBlock, config.scriptType, label, txConfig);

  const durationMs = Date.now() - start;

  const inputTokens = message?.usage?.input_tokens ?? 0;
  const outputTokens = message?.usage?.output_tokens ?? 0;
  const tokensUsed = inputTokens + outputTokens;

  return {
    transcription: text,
    tokensUsed,
    durationMs,
  };
}

// ─── Transcribe from production transcription page ──────────────────────────

async function transcribeFromProductionPage(
  pageId: number,
  config: EvalRunConfig,
  uploadDirPath: string
): Promise<{
  transcription: string;
  groundTruth: string;
  imageUrl: string;
  tokensUsed?: number;
  durationMs: number;
}> {
  const page = await storage.getTranscriptionPage(pageId);
  if (!page) throw new Error(`Seite ${pageId} nicht gefunden`);
  if (!page.transcription) throw new Error(`Seite ${pageId} hat keine Transkription`);

  const groundTruth = page.transcription;

  const filePath = path.join(uploadDirPath, path.basename(page.imageUrl));
  let base64: string;
  if (fs.existsSync(filePath)) {
    base64 = fs.readFileSync(filePath).toString("base64");
  } else if (page.imageData) {
    base64 = page.imageData;
  } else {
    throw new Error(`Bilddaten für Seite ${pageId} nicht gefunden`);
  }

  const ext = path.extname(page.imageUrl).toLowerCase();
  const isPdf = ext === ".pdf";
  let mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif" =
    ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";

  const prep = config.preprocessing;
  if (!isPdf && prep && isImageFile(page.imageUrl)) {
    if (prep.preprocessingAuto) {
      const buffer = Buffer.from(base64, "base64");
      const preprocessed = await autoPreprocessImage(buffer, true);
      base64 = preprocessed.buffer.toString("base64");
      mediaType = "image/png";
    } else {
      const hasManual = prep.contrast || prep.sharpen || prep.binarize;
      if (hasManual) {
        const buffer = Buffer.from(base64, "base64");
        const preprocessed = await preprocessImage(buffer, prep);
        base64 = preprocessed.buffer.toString("base64");
        mediaType = "image/png";
      }
    }
  }

  const txConfig: TranscriptionConfig = {};
  if (config.systemPrompt) txConfig.systemPrompt = config.systemPrompt;
  if (config.taskPrompt) txConfig.taskPrompt = config.taskPrompt;
  if (config.model) txConfig.model = config.model;
  if (config.maxTokens) txConfig.maxTokens = config.maxTokens;
  if (config.thinkingBudget) txConfig.thinkingBudget = config.thinkingBudget;

  const contentBlock = isPdf
    ? {
        type: "document" as const,
        source: { type: "base64" as const, media_type: "application/pdf" as const, data: base64 },
      }
    : {
        type: "image" as const,
        source: { type: "base64" as const, media_type: mediaType, data: base64 },
      };

  const label = `Eval-Prod (page ${pageId}, ${isPdf ? "PDF" : "Image"})`;
  const start = Date.now();

  const useGemini = config.provider === "google";
  const { text, message } = useGemini
    ? await callGeminiTranscription(contentBlock, config.scriptType, label, txConfig)
    : await callTranscriptionWithConfig(contentBlock, config.scriptType, label, txConfig);

  const durationMs = Date.now() - start;
  const inputTokens = message?.usage?.input_tokens ?? 0;
  const outputTokens = message?.usage?.output_tokens ?? 0;

  return {
    transcription: text,
    groundTruth,
    imageUrl: page.imageUrl,
    tokensUsed: inputTokens + outputTokens,
    durationMs,
  };
}

// ─── Run evaluation ──────────────────────────────────────────────────────────

export interface RunEvaluationOptions {
  runId: number;
  documentIds?: number[];
  productionPageIds?: number[];
}

export async function runEvaluation(
  options: RunEvaluationOptions
): Promise<void> {
  const { runId, documentIds, productionPageIds } = options;
  const run = await storage.getEvaluationRun(runId);
  if (!run) throw new Error(`Run ${runId} nicht gefunden`);

  await storage.updateEvaluationRun(runId, { status: "running" });

  try {
    await runEvaluationInner(runId, run, documentIds, productionPageIds);
  } catch (err) {
    console.error(`[Eval] Run ${runId} global error:`, err);
    await storage.updateEvaluationRun(runId, {
      status: "failed",
      completedAt: new Date(),
    });
    throw err;
  }
}

async function runEvaluationInner(
  runId: number,
  run: EvaluationRun,
  documentIds?: number[],
  productionPageIds?: number[],
): Promise<void> {
  const config = run.config as EvalRunConfig;
  const scriptType = config.scriptType ?? "auto";

  const useProductionPages = productionPageIds && productionPageIds.length > 0;

  const totalStart = Date.now();
  let totalTokens = 0;
  const cers: number[] = [];
  const wers: number[] = [];

  if (useProductionPages) {
    const CONCURRENCY = 3;
    const processPage = async (pageId: number) => {
      const created = await storage.createEvaluationResult({
        runId,
        documentId: null,
        status: "processing",
      });
      const resultId = created.id;

      try {
        const result = await transcribeFromProductionPage(pageId, config, uploadDir);
        const cer = calculateCER(result.transcription, result.groundTruth);
        const wer = calculateWER(result.transcription, result.groundTruth);

        cers.push(cer);
        wers.push(wer);
        totalTokens += result.tokensUsed ?? 0;

        await storage.updateEvaluationResult(resultId, {
          transcription: result.transcription,
          cer,
          wer,
          tokensUsed: result.tokensUsed ?? null,
          durationMs: result.durationMs,
          status: "completed",
          qualityDetails: {
            source: "production",
            pageId,
            groundTruth: result.groundTruth,
            imageUrl: result.imageUrl,
          },
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[Eval] Production page ${pageId} failed:`, msg);
        await storage.updateEvaluationResult(resultId, {
          transcription: msg,
          status: "failed",
          qualityDetails: { source: "production", pageId },
        });
      }
    };

    for (let i = 0; i < productionPageIds.length; i += CONCURRENCY) {
      const batch = productionPageIds.slice(i, i + CONCURRENCY);
      await Promise.allSettled(batch.map(processPage));
    }
  } else {
    let documents: EvaluationDocument[];
    if (documentIds && documentIds.length > 0) {
      documents = [];
      for (const id of documentIds) {
        const doc = await storage.getEvaluationDocument(id);
        if (doc) documents.push(doc);
      }
    } else {
      documents = await storage.getEvaluationDocuments();
    }

    const CONCURRENCY = 3;
    const processDoc = async (doc: EvaluationDocument) => {
      const created = await storage.createEvaluationResult({
        runId,
        documentId: doc.id,
        status: "processing",
      });
      const resultId = created.id;

      try {
        const result = await transcribeDocument(doc, config, uploadDir);
        const cer = calculateCER(result.transcription, doc.groundTruth);
        const wer = calculateWER(result.transcription, doc.groundTruth);

        cers.push(cer);
        wers.push(wer);
        totalTokens += result.tokensUsed ?? 0;

        await storage.updateEvaluationResult(resultId, {
          transcription: result.transcription,
          cer,
          wer,
          confidence: result.confidence ?? null,
          qualityDetails: {
            ...(result.qualityDetails as Record<string, unknown> ?? {}),
            imageUrl: doc.fileUrl,
          },
          tokensUsed: result.tokensUsed ?? null,
          durationMs: result.durationMs,
          status: "completed",
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[Eval] Document ${doc.id} failed:`, msg);
        await storage.updateEvaluationResult(resultId, {
          transcription: msg,
          status: "failed",
        });
      }
    };

    for (let i = 0; i < documents.length; i += CONCURRENCY) {
      const batch = documents.slice(i, i + CONCURRENCY);
      await Promise.allSettled(batch.map(processDoc));
    }
  }

  const totalDuration = Date.now() - totalStart;
  const avgCER =
    cers.length > 0 ? cers.reduce((a, b) => a + b, 0) / cers.length : null;
  const avgWER =
    wers.length > 0 ? wers.reduce((a, b) => a + b, 0) / wers.length : null;

  const docCount = useProductionPages ? productionPageIds.length : (documentIds?.length || 0);

  await storage.updateEvaluationRun(runId, {
    status: "completed",
    completedAt: new Date(),
    summary: {
      avgCER: avgCER ?? undefined,
      avgWER: avgWER ?? undefined,
      totalTokens,
      totalDurationMs: totalDuration,
      documentCount: docCount || cers.length + wers.length - cers.length,
      source: useProductionPages ? "production" : "evaluation",
    },
  });
}

// ─── Single-document test (on-demand) ────────────────────────────────────────

export interface TestSingleOptions {
  documentId: number;
  scriptType: string;
  provider?: EvalProvider;
  model?: string;
  maxTokens?: number;
  thinkingBudget?: number;
  systemPrompt?: string;
  taskPrompt?: string;
  preprocessing?: PreprocessingOptions;
}

export interface TestSingleResult {
  transcription: string;
  cer: number;
  wer: number;
  confidence?: number;
  tokensUsed?: number;
  durationMs: number;
}

export async function testSingleDocument(
  options: TestSingleOptions
): Promise<TestSingleResult> {
  const doc = await storage.getEvaluationDocument(options.documentId);
  if (!doc) throw new Error(`Dokument ${options.documentId} nicht gefunden`);

  const config: EvalRunConfig = {
    provider: options.provider,
    scriptType: options.scriptType,
    model: options.model,
    maxTokens: options.maxTokens,
    thinkingBudget: options.thinkingBudget,
    systemPrompt: options.systemPrompt,
    taskPrompt: options.taskPrompt,
    preprocessing: options.preprocessing,
  };

  const result = await transcribeDocument(doc, config, uploadDir);
  const cer = calculateCER(result.transcription, doc.groundTruth);
  const wer = calculateWER(result.transcription, doc.groundTruth);

  return {
    transcription: result.transcription,
    cer,
    wer,
    confidence: result.confidence,
    tokensUsed: result.tokensUsed,
    durationMs: result.durationMs,
  };
}
