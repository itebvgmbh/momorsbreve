import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { storage, UserNotInDatabaseError } from "./storage";
import { setupAuth, registerAuthRoutes, isAuthenticated, tryAuthenticate, authStorage } from "./replit_integrations/auth";
import { transcribePage, transcribePdf, analyzeDocumentOnly, clearProductionConfigCache, isOverloadError } from "./transcription";
import { translatePage } from "./translation";
import { generateSpeech, calculateTtsCredits, TtsServiceUnavailableError } from "./tts";
import {
  runEvaluation,
  testSingleDocument,
} from "./evaluation";
import { splitPdfPages, getPdfPageCount } from "./pdf-utils";
import { generateTranscriptionPdf } from "./pdf-export";
import { getStripeInstance, getStripeOrThrow, getStripeMode, setStripeMode, getStripePublicKey, getWebhookSecret } from "./stripe";
import { sendQuoteEmail, sendSupportNotification, sendHumanTranscriptionRequestNotification, sendExpertRequestAssignedEmail, sendExpertQuoteAcceptedEmail, sendExpertResultCompletedEmail } from "./email";
import {
  createResendBroadcastFromTemplate,
  handleResendWebhook,
  listRecentSends,
  listSendsForCampaign,
  renderTemplate,
  resolveSegment,
  runCampaign,
  runFlowScheduler,
  sendTemplateToUsers,
  sendTestEmail,
  syncResendMarketingSegment,
  verifyUnsubscribeToken,
} from "./marketing";
import {
  createInvoiceForCreditPurchase,
  createInvoiceForSpecialistOrder,
  getInvoicePdfPath,
  generateInvoicePdf,
  ensureInvoicesDir,
  resolveCustomerData,
  INVOICES_DIR,
} from "./invoice";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import sharp from "sharp";
import type { DocumentType } from "@shared/models/transcription";
import {
  getScriptTypeDisplayLabel,
  getCreditPackageDisplayName,
  DEFAULT_PROMOTION,
  getDiscountedPriceCents,
  type CreditPackageWithPromotion,
  type PromotionConfig,
} from "@shared/models/transcription";
import {
  users as usersTable,
  userCredits,
  paymentOrders,
  supportConversations,
  supportMessages,
  humanTranscriptionRequests,
  anonymousAnalyses,
  emailTemplates,
  emailCampaigns,
  emailFlows,
  emailFlowSteps,
  flowTriggerTypes,
  type SegmentFilter,
} from "@shared/schema";
import { transcriptionJobs, transcriptionPages, ttsGenerations, ttsLanguageMap, playlists, playlistItems, usedFreeCredits } from "@shared/models/transcription";
import { db } from "./db";
import { eq, sql, gte, desc, sum, count, max, inArray, and } from "drizzle-orm";
import { getFirebaseAuth } from "./firebase";
import {
  isObjectStorageEnabled,
  putObject,
  getObject,
  deleteObject,
  storageKeyForImageUrl,
} from "./object-storage";

function respondUserNotInDatabase(res: { status: (code: number) => { json: (body: unknown) => void } }) {
  return res.status(401).json({
    message: "Ihr Konto ist nicht mehr verfügbar. Bitte melden Sie sich erneut an.",
    code: "USER_NOT_FOUND",
  });
}
import { z } from "zod";

const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (_req, file, cb) => {
      const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname)}`;
      cb(null, uniqueName);
    },
  }),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB per file
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/tiff",
      "application/pdf",
    ];
    cb(null, allowed.includes(file.mimetype));
  },
});

/**
 * Legt die Bytes einer Seite/eines Dokuments ab und liefert die zu speichernden
 * DB-Felder zurück:
 *   - Object Storage aktiv → in den Bucket hochladen, nur `storageKey` setzen
 *     (kein Base64 in der DB → löst das Problem der zu großen SQL-DB).
 *   - sonst (Fallback)     → Base64 in `imageData` (bisheriges Verhalten).
 * Wirft, wenn ein Object-Storage-Upload fehlschlägt, damit der Aufrufer aufräumen kann.
 */
async function persistImageBytes(
  imageUrl: string,
  buffer: Buffer,
): Promise<{ storageKey: string | null; imageData: string | null }> {
  if (isObjectStorageEnabled()) {
    const key = storageKeyForImageUrl(imageUrl);
    await putObject(key, buffer);
    return { storageKey: key, imageData: null };
  }
  return { storageKey: null, imageData: buffer.toString("base64") };
}

/** Minimal-Form einer hochgeladenen Datei (kompatibel zu Multer + Chunk-Reassembly). */
type UploadedFile = {
  mimetype: string;
  path: string;
  filename: string;
};

/**
 * Gemeinsamer Downstream für Datei-Uploads: Seitenzahl ermitteln, Credits prüfen
 * & abbuchen, Job anlegen, sofort antworten, dann im Hintergrund PDFs splitten,
 * Seiten ablegen (Object Storage statt Base64-DB) und die Vorschau starten.
 *
 * Wird sowohl vom Direkt-Upload `/api/upload` (Fallback für kleine Dateien) als
 * auch vom Chunked-Upload `/api/upload/complete` genutzt.
 */
async function startUploadJob(
  res: any,
  userId: string,
  files: UploadedFile[],
  scriptType: DocumentType | string,
  translationLanguage: string | null,
): Promise<void> {
  if (!files || files.length === 0) {
    res.status(400).json({ message: "Keine Dateien hochgeladen" });
    return;
  }

  // Quick page count without splitting (fast)
  let totalPages = 0;
  for (const file of files) {
    if (file.mimetype === "application/pdf") {
      const pdfBuffer = fs.readFileSync(file.path);
      totalPages += await getPdfPageCount(pdfBuffer);
    } else {
      totalPages += 1;
    }
  }

  const previewCreditsNeeded = 1;

  const userCredits = await storage.ensureUserCredits(userId);
  const availableCredits = userCredits.credits;
  if (availableCredits < previewCreditsNeeded) {
    for (const file of files) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    }
    res.status(402).json({
      message: `Nicht genügend Credits für die Vorschau. Sie benötigen ${previewCreditsNeeded} ${previewCreditsNeeded === 1 ? "Credit" : "Credits"}, haben aber nur ${availableCredits}.`,
      creditsRequired: previewCreditsNeeded,
      currentCredits: availableCredits,
    });
    return;
  }

  await storage.deductCredits(userId, previewCreditsNeeded);

  const job = await storage.createTranscriptionJob({
    userId,
    scriptType,
    translationLanguage,
    status: "preview",
    totalPages,
  });

  // Respond immediately – heavy processing happens in background
  res.json({ jobId: job.id });

  // Background: split PDFs, store pages, start preview
  (async () => {
    try {
      const pageEntries: {
        imageUrl: string;
        storageKey: string | null;
        imageData: string | null;
        imageMimeType: string;
      }[] = [];
      for (const file of files) {
        if (file.mimetype === "application/pdf") {
          const pdfBuffer = fs.readFileSync(file.path);
          const singlePages = await splitPdfPages(pdfBuffer);
          const baseName = path.basename(file.filename, path.extname(file.filename));
          for (const sp of singlePages) {
            const filename = `${baseName}-page-${sp.pageNumber}.pdf`;
            const fullPath = path.join(uploadDir, filename);
            fs.writeFileSync(fullPath, sp.buffer);
            const imageUrl = `/uploads/${filename}`;
            const persisted = await persistImageBytes(imageUrl, sp.buffer);
            pageEntries.push({
              imageUrl,
              ...persisted,
              imageMimeType: "application/pdf",
            });
          }
          fs.unlinkSync(file.path);
          console.log(`[Upload] Split PDF into ${singlePages.length} single-page PDFs`);
        } else {
          const fileBuffer = fs.readFileSync(file.path);
          const imageUrl = `/uploads/${file.filename}`;
          const persisted = await persistImageBytes(imageUrl, fileBuffer);
          pageEntries.push({
            imageUrl,
            ...persisted,
            imageMimeType: file.mimetype,
          });
        }
      }

      await storage.createTranscriptionPages(
        pageEntries.map((entry, i) => ({
          jobId: job.id,
          pageNumber: i + 1,
          imageUrl: entry.imageUrl,
          storageKey: entry.storageKey,
          imageData: entry.imageData,
          imageMimeType: entry.imageMimeType,
          isPreview: i === 0,
          status: "pending" as const,
        }))
      );

      const pages = await storage.getTranscriptionPages(job.id);
      console.log(`[Upload] Starting preview transcription for job ${job.id} (${pages.length} pages, preview: page 1 only), documentType=${scriptType}`);

      const previewPage = pages[0];
      const controller = new AbortController();
      registerAbortController(job.id, controller);
      try {
        await processPages(job.id, scriptType, [previewPage], {
          includeQuality: true,
          setJobCompletedAtEnd: false,
          logLabel: "Upload",
          signal: controller.signal,
          userId,
          translationLanguage,
        });
      } finally {
        unregisterAbortController(job.id, controller);
      }
    } catch (err) {
      console.error(`[Upload] Background processing failed for job ${job.id}:`, err);
      await storage.updateTranscriptionJob(job.id, { status: "failed" });
    }
  })();
}

// ─── Chunked Upload ──────────────────────────────────────────────────────────
// Große Dateien werden vom Client in 5-MB-Chunks (Base64-JSON) hochgeladen, um
// 413-Fehler an der Replit-WAF/Edge zu vermeiden. Chunks landen temporär auf der
// Disk und werden in /api/upload/complete zusammengesetzt.
const CHUNK_DIR = path.join(uploadDir, ".chunks");
const MAX_CHUNK_BYTES = 6 * 1024 * 1024; // 5-MB-Chunk + Base64-Overhead-Reserve
const MAX_UPLOAD_FILE_BYTES = 100 * 1024 * 1024; // 100 MB pro Datei (Soft-Limit-Obergrenze)
const MAX_CHUNKS_PER_FILE = 1000;
const ALLOWED_UPLOAD_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/tiff",
  "application/pdf",
];
const UPLOAD_EXT_BY_MIME: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/tiff": ".tiff",
  "image/jpeg": ".jpg",
};

/** Verhindert Path-Traversal: uploadId nur aus unbedenklichen Zeichen. */
function isValidUploadId(id: unknown): id is string {
  return typeof id === "string" && /^[A-Za-z0-9_-]{1,100}$/.test(id);
}

function chunkSessionDir(uploadId: string): string {
  return path.join(CHUNK_DIR, uploadId);
}

function chunkFilePath(uploadId: string, fileIndex: number, chunkIndex: number): string {
  return path.join(chunkSessionDir(uploadId), `${fileIndex}-${chunkIndex}.part`);
}

/** Räumt alle temporären Chunks einer Upload-Session auf (best-effort). */
function cleanupChunkSession(uploadId: string): void {
  try {
    const dir = chunkSessionDir(uploadId);
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  } catch (err) {
    console.error(`[ChunkUpload] Cleanup für ${uploadId} fehlgeschlagen:`, err);
  }
}

// ADMIN_EMAIL darf eine Komma-getrennte Liste sein, z. B.
// "name@googlemail.com,name@gmail.com" – nützlich, da Google beide Formen mischt.
function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = (process.env.ADMIN_EMAIL ?? "")
    .split(",")
    .map((e) => e.toLowerCase().trim())
    .filter(Boolean);
  return list.includes(email.toLowerCase().trim());
}

async function isAdmin(req: any, _res: any, next: any) {
  try {
    const userId = req.user?.uid;
    if (!userId) return next(new Error("Unauthorized"));
    const user = await authStorage.getUser(userId);
    if (!isAdminEmail(user?.email)) {
      const configured = (process.env.ADMIN_EMAIL ?? "").trim();
      console.warn(
        `[admin-check] Zugriff verweigert. Eingeloggte E-Mail="${user?.email ?? "(keine)"}" | ADMIN_EMAIL ${configured ? `gesetzt auf "${configured}"` : "NICHT gesetzt"}`,
      );
      return next(new Error("Unauthorized"));
    }
    return next();
  } catch (err) {
    return next(err);
  }
}

async function checkIsAdmin(req: any): Promise<boolean> {
  try {
    const userId = req.user?.uid;
    if (!userId) return false;
    const user = await authStorage.getUser(userId);
    return isAdminEmail(user?.email);
  } catch {
    return false;
  }
}

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

function publicExpertAccount(expert: any) {
  if (!expert) return null;
  return {
    id: expert.id,
    email: expert.email,
    isActive: expert.isActive,
    companyName: expert.companyName,
    legalName: expert.legalName,
    contactName: expert.contactName,
    street: expert.street,
    postalCode: expert.postalCode,
    city: expert.city,
    country: expert.country,
    vatId: expert.vatId,
    businessType: expert.businessType,
    tradeRegisterName: expert.tradeRegisterName,
    tradeRegisterNumber: expert.tradeRegisterNumber,
    website: expert.website,
    phone: expert.phone,
    invoiceEmail: expert.invoiceEmail,
    termsText: expert.termsText,
    legalComplianceConfirmed: expert.legalComplianceConfirmed,
    actsAsBusinessConfirmed: expert.actsAsBusinessConfirmed,
    externalBillingConfirmed: expert.externalBillingConfirmed,
    confidentialityConfirmed: expert.confidentialityConfirmed,
    dataProtectionConfirmed: expert.dataProtectionConfirmed,
    liabilityInsuranceConfirmed: expert.liabilityInsuranceConfirmed,
  };
}

function getExpertMissingFields(expert: any): string[] {
  const missing: string[] = [];
  if (!expert) return ["Expertenkonto"];
  if (!expert.companyName && !expert.legalName) missing.push("Firma oder rechtlicher Name");
  if (!expert.street) missing.push("Straße");
  if (!expert.postalCode) missing.push("PLZ");
  if (!expert.city) missing.push("Ort");
  if (!expert.country) missing.push("Land");
  if (!expert.phone) missing.push("Telefon");
  if (!expert.invoiceEmail) missing.push("Rechnungs-E-Mail");
  if (!expert.businessType) missing.push("Anbieterart");
  if (!expert.actsAsBusinessConfirmed) missing.push("Unternehmerstatus bestätigt");
  if (!expert.externalBillingConfirmed) missing.push("Externe Abrechnung bestätigt");
  if (!expert.legalComplianceConfirmed) missing.push("Einhaltung geltenden Rechts bestätigt");
  if (!expert.confidentialityConfirmed) missing.push("Vertraulichkeit bestätigt");
  if (!expert.dataProtectionConfirmed) missing.push("Datenschutz bestätigt");
  return missing;
}

function expertCanQuote(expert: any): boolean {
  return !!expert?.isActive && getExpertMissingFields(expert).length === 0;
}

async function getCurrentExpertAccount(req: any) {
  const userId = req.user?.uid;
  if (!userId) return undefined;
  const user = await authStorage.getUser(userId);
  if (!user?.email) return undefined;
  const expert = await storage.getActiveExpertAccountByEmail(user.email);
  if (expert && expert.userId !== userId) {
    return storage.updateExpertAccount(expert.id, { userId });
  }
  return expert;
}

async function canCurrentExpertAccessJob(req: any, jobId: number): Promise<boolean> {
  const expert = await getCurrentExpertAccount(req);
  if (!expert) return false;
  const requests = await storage.getHumanTranscriptionRequestsByExpert(expert.id);
  return requests.some((request) => request.jobId === jobId);
}

// Priser i DKK (øre). Feltnavnet "priceEur" er bevidst uændret for at undgå
// at omdøbe DB-kolonnen og alle referencer – værdierne er nu danske kroner i øre.
// Stripe-valutaen er sat til "dkk" nedenfor.
const PACKAGE_SPECS = [
  { name: "Starter", pages: 35, priceEur: 9900, popular: false },   // 99 DKK
  { name: "Standard", pages: 130, priceEur: 26900, popular: true }, // 269 DKK
  { name: "Premium", pages: 320, priceEur: 54900, popular: false }, // 549 DKK
] as const;

async function getActivePromotion(): Promise<PromotionConfig> {
  const raw = await storage.getSetting("promotion_config");
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return DEFAULT_PROMOTION;
  }
  const o = raw as Record<string, unknown>;
  const discounts = o.discounts as Record<string, unknown> | undefined;
  const isLegacySpringPromotion =
    o.enabled === true &&
    o.label === "Frühlingsrabatt" &&
    discounts?.Starter === 0.4 &&
    discounts?.Standard === 0.45 &&
    discounts?.Premium === 0.55;
  if (isLegacySpringPromotion) {
    return DEFAULT_PROMOTION;
  }
  return {
    enabled: typeof o.enabled === "boolean" ? o.enabled : DEFAULT_PROMOTION.enabled,
    label: typeof o.label === "string" ? o.label : DEFAULT_PROMOTION.label,
    endDate: typeof o.endDate === "string" || o.endDate === null ? o.endDate : DEFAULT_PROMOTION.endDate,
    discounts: o.discounts && typeof o.discounts === "object" && !Array.isArray(o.discounts)
      ? { ...DEFAULT_PROMOTION.discounts, ...(o.discounts as Record<string, number>) }
      : DEFAULT_PROMOTION.discounts,
  };
}

async function seedPackages() {
  const existing = await storage.getCreditPackages();
  if (existing.length === 0) {
    for (const spec of PACKAGE_SPECS) {
      await storage.createCreditPackage(spec);
    }
  } else {
    for (const spec of PACKAGE_SPECS) {
      const pkg = existing.find((p) => p.name === spec.name);
      if (pkg && (pkg.pages !== spec.pages || pkg.priceEur !== spec.priceEur || pkg.popular !== spec.popular)) {
        await storage.updateCreditPackage(pkg.id, { pages: spec.pages, priceEur: spec.priceEur, popular: spec.popular });
      }
    }
  }
}

const MIME_MAP: Record<string, "image/jpeg" | "image/png" | "image/webp" | "image/gif"> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

function isPdfBuffer(buffer: Buffer): boolean {
  // PDF header starts with "%PDF"
  return buffer.length >= 4 && buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46;
}

async function normalizeImageForTranscription(
  input: Buffer,
): Promise<{ buffer: Buffer; mediaType: "image/jpeg" }> {
  // Re-encode to a clean baseline JPEG to strip problematic metadata/chunks.
  const output = await sharp(input, { failOn: "none", sequentialRead: true })
    .rotate() // honor EXIF orientation if present
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer();
  return { buffer: output, mediaType: "image/jpeg" };
}

const PAGE_TRANSCRIPTION_TIMEOUT_MS = 3 * 60 * 1000;
const PAGE_TRANSLATION_TIMEOUT_MS = 2 * 60 * 1000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    promise
      .then((value) => {
        clearTimeout(timeout);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timeout);
        reject(error);
      });
  });
}

// Rate limit for anonymous analyze: 3 per IP per day. Authed users bypass entirely.
const analyzeRateLimit = new Map<string, { count: number; resetAt: number }>();
const ANALYZE_RATE_LIMIT_PER_WINDOW = 3;
const ANALYZE_RATE_WINDOW_MS = 24 * 60 * 60 * 1000;

function checkAnalyzeRateLimit(ip: string): boolean {
  const now = Date.now();
  let entry = analyzeRateLimit.get(ip);
  if (entry && now >= entry.resetAt) {
    analyzeRateLimit.delete(ip);
    entry = undefined;
  }
  if (!entry) {
    analyzeRateLimit.set(ip, { count: 1, resetAt: now + ANALYZE_RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= ANALYZE_RATE_LIMIT_PER_WINDOW) return false;
  entry.count += 1;
  return true;
}

/**
 * JobId -> Set of AbortControllers for in-progress workers.
 * A job can legitimately have multiple workers (e.g. recovery + manual retry of single page),
 * so we track them as a Set instead of overwriting a single reference.
 * Cancel aborts ALL controllers; the set also doubles as an "is active" indicator
 * to prevent recoverStuckJobs from kicking off duplicate work.
 */
const jobAbortControllers = new Map<number, Set<AbortController>>();

function registerAbortController(jobId: number, controller: AbortController): void {
  let set = jobAbortControllers.get(jobId);
  if (!set) {
    set = new Set();
    jobAbortControllers.set(jobId, set);
  }
  set.add(controller);
}

function unregisterAbortController(jobId: number, controller: AbortController): void {
  const set = jobAbortControllers.get(jobId);
  if (!set) return;
  set.delete(controller);
  if (set.size === 0) jobAbortControllers.delete(jobId);
}

function abortJob(jobId: number): boolean {
  const set = jobAbortControllers.get(jobId);
  if (!set || set.size === 0) return false;
  for (const c of set) {
    try { c.abort(); } catch { /* ignore */ }
  }
  return true;
}

function isJobActive(jobId: number): boolean {
  const set = jobAbortControllers.get(jobId);
  return !!set && set.size > 0;
}

function getActiveJobIds(): number[] {
  return Array.from(jobAbortControllers.keys());
}

type ProcessPagesOptions = {
  includeQuality?: boolean;
  setJobCompletedAtEnd?: boolean;
  logLabel?: string;
  signal?: AbortSignal;
  userId?: string;
  translationLanguage?: string | null;
};

/** Shared page processing for full transcription and preview. Used by POST transcribe, upload preview, and job recovery. */
async function processPages(
  jobId: number,
  scriptType: string,
  pages: { id: number; pageNumber: number; imageUrl: string; imageMimeType?: string | null }[],
  options: ProcessPagesOptions = {}
): Promise<void> {
  const { includeQuality = false, setJobCompletedAtEnd = true, logLabel = "Transcription", signal, userId, translationLanguage } = options;
  let aborted = false;
  let failedCount = 0;
  for (const page of pages) {
    if (signal?.aborted) {
      aborted = true;
      break;
    }
    // #region agent log
    fetch('http://localhost:7451/ingest/da4f1dcd-f617-424b-8f7d-867380948ac6',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'220336'},body:JSON.stringify({sessionId:'220336',runId:'live-file-fail-1',hypothesisId:'H2',location:'server/routes.ts:processPages:loop-start',message:'processPages page start',data:{jobId,pageId:page.id,pageNumber:page.pageNumber,imageUrl:page.imageUrl,imageMimeType:page.imageMimeType??null,scriptType,logLabel},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    try {
      await storage.updateTranscriptionPage(page.id, { status: "processing" });
      const filePath = path.join(uploadDir, path.basename(page.imageUrl));
      let sourceBuffer: Buffer;
      let sourceMediaType: string | undefined = page.imageMimeType ?? undefined;
      if (fs.existsSync(filePath)) {
        sourceBuffer = fs.readFileSync(filePath);
      } else {
        // Disk-Kopie fehlt (Replit-Deploy ist ephemer). Reihenfolge:
        //   1) Replit Object Storage (neuer Speicherpfad)
        //   2) Base64 in der DB (Altbestand / Object Storage deaktiviert)
        const dbPage = await storage.getTranscriptionPageByImageUrl(page.imageUrl);
        sourceMediaType = dbPage?.imageMimeType ?? sourceMediaType;
        const storageKey = dbPage?.storageKey ?? storageKeyForImageUrl(page.imageUrl);
        let buf = await getObject(storageKey);
        if (!buf && dbPage?.imageData) {
          buf = Buffer.from(dbPage.imageData, "base64");
        }
        if (!buf) {
          failedCount++;
          await storage.updateTranscriptionPage(page.id, {
            status: "failed",
            transcription: "Datei nicht gefunden.",
          });
          continue;
        }
        sourceBuffer = buf;
      }
      const ext = path.extname(page.imageUrl).toLowerCase();
      const extMediaType = ext === ".pdf" ? "application/pdf" : (MIME_MAP[ext] || "image/jpeg");
      const detectedIsPdf = isPdfBuffer(sourceBuffer);
      const isPdf = detectedIsPdf || sourceMediaType === "application/pdf" || ext === ".pdf";
      // #region agent log
      fetch('http://localhost:7451/ingest/da4f1dcd-f617-424b-8f7d-867380948ac6',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'220336'},body:JSON.stringify({sessionId:'220336',runId:'live-file-fail-1',hypothesisId:'H2',location:'server/routes.ts:processPages:source-inspect',message:'source media inspection',data:{jobId,pageId:page.id,fileExists:fs.existsSync(filePath),sourceBytes:sourceBuffer.length,ext,extMediaType,sourceMediaType:sourceMediaType??null,detectedIsPdf,isPdf},timestamp:Date.now()})}).catch(()=>{});
      // #endregion

      let result;
      if (isPdf) {
        const base64 = sourceBuffer.toString("base64");
        // #region agent log
        fetch('http://localhost:7451/ingest/da4f1dcd-f617-424b-8f7d-867380948ac6',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'220336'},body:JSON.stringify({sessionId:'220336',runId:'live-file-fail-1',hypothesisId:'H3',location:'server/routes.ts:processPages:before-transcribe-pdf',message:'before transcribe pdf',data:{jobId,pageId:page.id,pageNumber:page.pageNumber,base64Length:base64.length,timeoutMs:PAGE_TRANSCRIPTION_TIMEOUT_MS},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        result = await withTimeout(
          transcribePdf(base64, scriptType, includeQuality),
          PAGE_TRANSCRIPTION_TIMEOUT_MS,
          `Transcription page ${page.pageNumber} (pdf)`
        );
      } else {
        const sourceType = sourceMediaType || extMediaType;
        let modelBuffer = sourceBuffer;
        let mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif" =
          (sourceType === "image/png" || sourceType === "image/webp" || sourceType === "image/gif")
            ? sourceType
            : "image/jpeg";

        try {
          // Normalize image input to reduce provider crashes on edge-case JPEG/PNG encodings.
          const normalized = await normalizeImageForTranscription(sourceBuffer);
          modelBuffer = normalized.buffer;
          mediaType = normalized.mediaType;
        } catch (normalizeErr: any) {
          console.warn(
            `[${logLabel}] Page ${page.pageNumber} normalization skipped for job ${jobId}:`,
            normalizeErr?.message || normalizeErr
          );
        }

        const base64 = modelBuffer.toString("base64");
        // #region agent log
        fetch('http://localhost:7451/ingest/da4f1dcd-f617-424b-8f7d-867380948ac6',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'220336'},body:JSON.stringify({sessionId:'220336',runId:'live-file-fail-1',hypothesisId:'H3',location:'server/routes.ts:processPages:before-transcribe-image',message:'before transcribe image',data:{jobId,pageId:page.id,pageNumber:page.pageNumber,modelBytes:modelBuffer.length,mediaType,base64Length:base64.length,timeoutMs:PAGE_TRANSCRIPTION_TIMEOUT_MS},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        result = await withTimeout(
          transcribePage(base64, scriptType, includeQuality, mediaType),
          PAGE_TRANSCRIPTION_TIMEOUT_MS,
          `Transcription page ${page.pageNumber} (image)`
        );
      }
      if (!result.transcription || result.outputTokens === 0) {
        console.error(`[${logLabel}] Page ${page.pageNumber} for job ${jobId}: KI returned empty response (outputTokens=${result.outputTokens}), marking as failed`);
        failedCount++;
        await storage.updateTranscriptionPage(page.id, {
          status: "failed",
          transcription: "AI'en kunne ikke genkende nogen tekst. Prøv igen, eller upload et tydeligere billede.",
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
        });
        continue;
      }

      const pageUpdate: Record<string, unknown> = {
        transcription: result.transcription,
        transcriptionCompleted: result.transcriptionCompleted ?? null,
        transcriptionInterpreted: result.transcriptionInterpreted ?? null,
        qualityScore: result.quality?.readability ?? null,
        qualityDetails: result.quality ?? null,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        status: "completed",
      };

      if (translationLanguage) {
        try {
          const translationResult = await withTimeout(
            translatePage(
              {
                original: result.transcription,
                completed: result.transcriptionCompleted,
                interpreted: result.transcriptionInterpreted,
              },
              translationLanguage,
            ),
            PAGE_TRANSLATION_TIMEOUT_MS,
            `Translation page ${page.pageNumber}`
          );
          pageUpdate.translation = translationResult.translation;
          pageUpdate.translationCompleted = translationResult.translationCompleted ?? null;
          pageUpdate.translationInterpreted = translationResult.translationInterpreted ?? null;
          pageUpdate.inputTokens = (result.inputTokens) + translationResult.inputTokens;
          pageUpdate.outputTokens = (result.outputTokens) + translationResult.outputTokens;
          console.log(`[${logLabel}] Page ${page.pageNumber} translated to ${translationLanguage} for job ${jobId}`);
        } catch (translationErr: any) {
          console.error(`[${logLabel}] Translation failed for page ${page.pageNumber} job ${jobId}:`, translationErr?.message || translationErr);
          const translationErrorMsg = isOverloadError(translationErr)
            ? "AI-modellen er i øjeblikket overbelastet. Prøv oversættelsen igen senere."
            : "Oversættelsen kunne ikke oprettes. Prøv igen senere.";
          const existingQuality = (pageUpdate.qualityDetails as Record<string, unknown>) ?? {};
          pageUpdate.qualityDetails = { ...existingQuality, translationError: translationErrorMsg };
        }
      }

      await storage.updateTranscriptionPage(page.id, pageUpdate);
      // #region agent log
      fetch('http://localhost:7451/ingest/da4f1dcd-f617-424b-8f7d-867380948ac6',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'220336'},body:JSON.stringify({sessionId:'220336',runId:'live-file-fail-1',hypothesisId:'H5',location:'server/routes.ts:processPages:page-completed',message:'page completed and persisted',data:{jobId,pageId:page.id,inputTokens:pageUpdate.inputTokens??null,outputTokens:pageUpdate.outputTokens??null,hasTranslation:!!pageUpdate.translation,status:pageUpdate.status},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      console.log(`[${logLabel}] Page ${page.pageNumber} completed for job ${jobId} (tokens: ${pageUpdate.inputTokens} in / ${pageUpdate.outputTokens} out)`);
    } catch (err: any) {
      // #region agent log
      fetch('http://localhost:7451/ingest/da4f1dcd-f617-424b-8f7d-867380948ac6',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'220336'},body:JSON.stringify({sessionId:'220336',runId:'live-file-fail-1',hypothesisId:'H4',location:'server/routes.ts:processPages:catch',message:'page processing catch',data:{jobId,pageId:page.id,errorName:err?.name??null,errorMessage:err?.message??String(err),status:err?.status??err?.statusCode??null},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      console.error(`[${logLabel}] Page ${page.pageNumber} failed for job ${jobId}:`, err?.message || err);
      let errorMsg: string;
      if (isOverloadError(err)) {
        errorMsg = "AI-modellen er i øjeblikket overbelastet. Prøv igen om et par minutter.";
      } else if (err?.message?.includes("timed out") || err?.message?.includes("timeout")) {
        errorMsg = "Behandlingen tog for lang tid. Prøv igen.";
      } else {
        errorMsg = includeQuality
          ? "Forhåndsvisningen kunne ikke oprettes. Prøv igen."
          : "Transskriptionen kunne ikke oprettes. Prøv igen.";
      }
      failedCount++;
      try {
        await storage.updateTranscriptionPage(page.id, {
          status: "failed",
          transcription: errorMsg,
        });
      } catch (dbErr) {
        console.error(`[${logLabel}] Could not update page ${page.id} to failed:`, dbErr);
      }
    }
  }

  if (failedCount > 0 && userId) {
    try {
      await storage.addCredits(userId, failedCount);
      console.log(`[${logLabel}] ${failedCount} credit(s) refunded to user ${userId} for failed page(s) in job ${jobId}`);
    } catch (refundErr) {
      console.error(`[${logLabel}] Failed to refund ${failedCount} credit(s) for job ${jobId}:`, refundErr);
    }
  }

  if (setJobCompletedAtEnd && !aborted) {
    await storage.updateTranscriptionJobStatus(jobId, "completed");
  }
}

/**
 * On server start (and every 5 min): find jobs/previews stuck in "processing" and resume them.
 *
 * IMPORTANT: Jobs that already have an active in-process worker (tracked via jobAbortControllers)
 * are EXCLUDED. Otherwise recovery would spawn duplicate workers every interval and reset
 * mid-flight "processing" pages back to "pending" — causing the same page to be sent
 * to the LLM multiple times (real money, real duplicate API calls).
 */
async function recoverStuckJobs(): Promise<void> {
  try {
    const activeJobIds = getActiveJobIds();
    const stuckFull = await storage.getStuckJobs(activeJobIds);
    const stuckPreview = await storage.getStuckPreviewPages(activeJobIds);
    if (stuckFull.length === 0 && stuckPreview.length === 0) return;

    if (stuckFull.length > 0) {
      console.log(`[Recovery] Resuming ${stuckFull.length} stuck full transcription job(s).`);
      for (const { job, pagesToProcess } of stuckFull) {
        (async () => {
          const controller = new AbortController();
          registerAbortController(job.id, controller);
          try {
            await processPages(job.id, job.scriptType, pagesToProcess, {
              setJobCompletedAtEnd: true,
              logLabel: "Recovery",
              signal: controller.signal,
              userId: job.userId,
              translationLanguage: job.translationLanguage,
            });
          } finally {
            unregisterAbortController(job.id, controller);
          }
        })();
      }
    }
    if (stuckPreview.length > 0) {
      console.log(`[Recovery] Resuming ${stuckPreview.length} stuck preview(s).`);
      for (const { job, page } of stuckPreview) {
        (async () => {
          const controller = new AbortController();
          registerAbortController(job.id, controller);
          try {
            await processPages(job.id, job.scriptType, [page], {
              includeQuality: true,
              setJobCompletedAtEnd: false,
              logLabel: "Recovery",
              signal: controller.signal,
              userId: job.userId,
              translationLanguage: job.translationLanguage,
            });
          } finally {
            unregisterAbortController(job.id, controller);
          }
        })();
      }
    }
  } catch (err) {
    console.error("[Recovery] Failed to recover stuck jobs:", err);
  }
}

async function recoverStuckTtsGenerations(): Promise<void> {
  try {
    const stuck = await db
      .select()
      .from(ttsGenerations)
      .where(eq(ttsGenerations.status, "generating"));
    if (stuck.length === 0) return;

    console.log(`[Recovery] Marking ${stuck.length} stuck TTS generation(s) as failed and refunding credits.`);
    for (const gen of stuck) {
      try {
        await db.update(ttsGenerations)
          .set({ status: "failed" })
          .where(eq(ttsGenerations.id, gen.id));
        if (gen.creditsUsed > 0) {
          const job = await storage.getTranscriptionJob(gen.jobId);
          if (job?.userId) {
            await storage.addCredits(job.userId, gen.creditsUsed);
            console.log(`[Recovery] TTS gen ${gen.id}: refunded ${gen.creditsUsed} credits to user ${job.userId}`);
          }
        }
      } catch (err) {
        console.error(`[Recovery] Failed to recover TTS generation ${gen.id}:`, err);
      }
    }
  } catch (err) {
    console.error("[Recovery] Failed to recover stuck TTS generations:", err);
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth();
  registerAuthRoutes(app);

  app.use("/uploads", async (req, res, next) => {
    const safePath = path.normalize(req.path).replace(/^(\.\.[/\\])+/, "");
    const filePath = path.join(uploadDir, safePath);
    if (!filePath.startsWith(uploadDir)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    // Temporäre Chunk-Dateien des Chunked-Uploads nie ausliefern.
    if (safePath.split(/[/\\]/).includes(".chunks")) {
      return res.status(403).json({ message: "Forbidden" });
    }
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      return res.sendFile(filePath);
    }

    const filename = path.basename(req.path);
    // Normalize the request path so the DB lookup matches what we stored
    // in ttsGenerations.audioUrl (e.g. "/uploads/tts-...mp3" or
    // "/uploads/examples/example-...mp3"). On Replit the uploads/ directory is
    // ephemeral and wiped on republish, so we must fall back to the DB copy.
    const normalizedUploadPath = `/uploads/${path
      .normalize(req.path)
      .replace(/^[\\/]+/, "")
      .replace(/\\/g, "/")}`;

    if (filename.startsWith("tts-") || filename.startsWith("example-")) {
      try {
        const gen = await db
          .select({ audioData: ttsGenerations.audioData, audioMimeType: ttsGenerations.audioMimeType })
          .from(ttsGenerations)
          .where(eq(ttsGenerations.audioUrl, normalizedUploadPath))
          .limit(1);
        if (gen[0]?.audioData && gen[0]?.audioMimeType) {
          const buffer = Buffer.from(gen[0].audioData, "base64");
          res.setHeader("Content-Type", gen[0].audioMimeType);
          res.setHeader("Content-Length", buffer.length);
          res.setHeader("Cache-Control", "public, max-age=86400");
          return res.send(buffer);
        }
      } catch (err) {
        console.error("[Uploads] DB fallback error (tts_generations):", err);
      }
    }

    try {
      const page = await storage.getTranscriptionPageByImageUrl(`/uploads/${filename}`);
      if (page && page.imageMimeType) {
        // Object Storage (neuer Pfad) vor Base64-DB (Altbestand) versuchen.
        let buffer: Buffer | null = page.storageKey
          ? await getObject(page.storageKey)
          : null;
        if (!buffer && page.imageData) {
          buffer = Buffer.from(page.imageData, "base64");
        }
        if (buffer) {
          res.setHeader("Content-Type", page.imageMimeType);
          res.setHeader("Content-Length", buffer.length);
          res.setHeader("Cache-Control", "public, max-age=86400");
          return res.send(buffer);
        }
      }
    } catch (err) {
      console.error("[Uploads] DB fallback error (transcription_pages):", err);
    }

    try {
      const analysis = await storage.getAnonymousAnalysisByImageUrl(`/uploads/${filename}`);
      if (analysis && analysis.imageMimeType) {
        let buffer: Buffer | null = analysis.storageKey
          ? await getObject(analysis.storageKey)
          : null;
        if (!buffer && analysis.imageData) {
          buffer = Buffer.from(analysis.imageData, "base64");
        }
        if (buffer) {
          res.setHeader("Content-Type", analysis.imageMimeType);
          res.setHeader("Content-Length", buffer.length);
          res.setHeader("Cache-Control", "public, max-age=86400");
          return res.send(buffer);
        }
      }
    } catch (err) {
      console.error("[Uploads] DB fallback error (anonymous_analyses):", err);
    }

    res.status(404).json({ message: "File not found" });
  });

  app.get("/api/credits", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.uid;
      const credits = await storage.ensureUserCredits(userId);
      const freeCreditsBlocked = await storage.isReturningUser(userId);
      res.json({ ...credits, freeCreditsBlocked });
    } catch (error) {
      if (error instanceof UserNotInDatabaseError) {
        return respondUserNotInDatabase(res);
      }
      console.error("Error getting credits:", error);
      res.status(500).json({ message: "Credits konnten nicht geladen werden" });
    }
  });

  const tourStatePatchSchema = z.object({
    welcomeSeen: z.boolean().optional(),
    welcomeAnswer: z.enum(["yes", "no", "later"]).optional(),
    completedTours: z.array(z.string().max(64)).max(32).optional(),
    dismissedTours: z.array(z.string().max(64)).max(32).optional(),
  });

  app.get("/api/tours/state", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.uid;
      const state = await storage.getUserTourState(userId);
      res.json(state);
    } catch (error) {
      if (error instanceof UserNotInDatabaseError) {
        return respondUserNotInDatabase(res);
      }
      console.error("Error getting tour state:", error);
      res.status(500).json({ message: "Tour-Status konnte nicht geladen werden" });
    }
  });

  app.patch("/api/tours/state", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.uid;
      const parsed = tourStatePatchSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Ungültige Daten", errors: parsed.error.flatten() });
      }
      const updated = await storage.updateUserTourState(userId, parsed.data);
      res.json(updated);
    } catch (error) {
      if (error instanceof UserNotInDatabaseError) {
        return respondUserNotInDatabase(res);
      }
      console.error("Error updating tour state:", error);
      res.status(500).json({ message: "Tour-Status konnte nicht gespeichert werden" });
    }
  });

  const updateProfileSchema = z.object({
    firstName: z.string().max(100).optional(),
    lastName: z.string().max(100).optional(),
    street: z.string().max(200).optional(),
    postalCode: z.string().max(20).optional(),
    city: z.string().max(100).optional(),
    country: z.string().max(100).optional(),
    billingName: z.string().max(200).optional(),
    billingStreet: z.string().max(200).optional(),
    billingPostalCode: z.string().max(20).optional(),
    billingCity: z.string().max(100).optional(),
    billingCountry: z.string().max(100).optional(),
    newsletterOptIn: z.boolean().optional(),
  });

  app.patch("/api/user/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.uid;
      const parsed = updateProfileSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Ungültige Daten", errors: parsed.error.flatten() });
      }
      const data = parsed.data;
      const [updated] = await db
        .update(usersTable)
        .set({
          ...(data.firstName !== undefined && { firstName: data.firstName || null }),
          ...(data.lastName !== undefined && { lastName: data.lastName || null }),
          ...(data.street !== undefined && { street: data.street || null }),
          ...(data.postalCode !== undefined && { postalCode: data.postalCode || null }),
          ...(data.city !== undefined && { city: data.city || null }),
          ...(data.country !== undefined && { country: data.country || null }),
          ...(data.billingName !== undefined && { billingName: data.billingName || null }),
          ...(data.billingStreet !== undefined && { billingStreet: data.billingStreet || null }),
          ...(data.billingPostalCode !== undefined && { billingPostalCode: data.billingPostalCode || null }),
          ...(data.billingCity !== undefined && { billingCity: data.billingCity || null }),
          ...(data.billingCountry !== undefined && { billingCountry: data.billingCountry || null }),
          ...(data.newsletterOptIn !== undefined && { newsletterOptIn: data.newsletterOptIn }),
          updatedAt: new Date(),
        })
        .where(eq(usersTable.id, userId))
        .returning();
      if (!updated) {
        return res.status(404).json({ message: "Benutzer nicht gefunden" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Profil konnte nicht aktualisiert werden" });
    }
  });

  app.delete("/api/user/account", isAuthenticated, async (req: any, res) => {
    const userId = req.user.uid;
    try {
      const jobs = await db.select().from(transcriptionJobs).where(eq(transcriptionJobs.userId, userId));
      const jobIds = jobs.map((j) => j.id);

      for (const job of jobs) {
        const pages = await storage.getTranscriptionPages(job.id);
        for (const page of pages) {
          if (page.imageUrl) {
            const filename = path.basename(page.imageUrl);
            const filePath = path.join(uploadDir, filename);
            if (fs.existsSync(filePath)) {
              try {
                fs.unlinkSync(filePath);
              } catch {
                // ignore single file errors
              }
            }
          }
        }
      }

      await db.transaction(async (tx) => {
        await tx.delete(humanTranscriptionRequests).where(eq(humanTranscriptionRequests.userId, userId));
        if (jobIds.length > 0) {
          await tx.delete(transcriptionPages).where(inArray(transcriptionPages.jobId, jobIds));
          await tx.delete(transcriptionJobs).where(eq(transcriptionJobs.userId, userId));
        }
        await tx.delete(userCredits).where(eq(userCredits.userId, userId));
        await tx.delete(paymentOrders).where(eq(paymentOrders.userId, userId));

        const convos = await tx.select({ id: supportConversations.id }).from(supportConversations).where(eq(supportConversations.userId, userId));
        const convIds = convos.map((c) => c.id);
        if (convIds.length > 0) {
          await tx.delete(supportMessages).where(inArray(supportMessages.conversationId, convIds));
          await tx.delete(supportConversations).where(eq(supportConversations.userId, userId));
        }

        await tx.update(anonymousAnalyses).set({ claimedByUserId: null }).where(eq(anonymousAnalyses.claimedByUserId, userId));
        await tx.delete(usersTable).where(eq(usersTable.id, userId));
      });

      try {
        await getFirebaseAuth().deleteUser(userId);
      } catch (firebaseErr) {
        console.error("Firebase deleteUser failed (user may already be deleted):", firebaseErr);
      }

      res.status(200).json({ message: "Konto wurde gelöscht" });
    } catch (error) {
      console.error("Error deleting account:", error);
      res.status(500).json({ message: "Konto konnte nicht gelöscht werden" });
    }
  });

  app.get("/api/promotion", async (_req, res) => {
    try {
      const promotion = await getActivePromotion();
      res.json(promotion);
    } catch (error) {
      console.error("Error getting promotion:", error);
      res.status(500).json({ message: "Fehler beim Laden der Aktion" });
    }
  });

  app.get("/api/cta-variant", async (_req, res) => {
    try {
      const variant = await storage.getSetting("cta_variant");
      res.json({ variant: typeof variant === "number" ? variant : 9 });
    } catch (error) {
      res.json({ variant: 9 });
    }
  });

  /**
   * Wählt die CTA-Variante für eine neue anonyme Analyse:
   *  - Wenn `cta_rotation_enabled === true` und Whitelist nicht leer → zufällig aus Whitelist
   *  - Sonst → fixe Default-Variante aus `cta_variant` (Fallback: 9)
   * Gültige IDs sind 0..13.
   */
  async function pickCtaVariantForAnalysis(): Promise<number> {
    const DEFAULT = 9;
    try {
      const rotationEnabled = await storage.getSetting("cta_rotation_enabled");
      const rotationVariants = await storage.getSetting("cta_rotation_variants");
      const defaultVariant = await storage.getSetting("cta_variant");
      const defaultNumeric =
        typeof defaultVariant === "number" && defaultVariant >= 0 && defaultVariant <= 13
          ? defaultVariant
          : DEFAULT;

      if (rotationEnabled === true && Array.isArray(rotationVariants)) {
        const whitelist = (rotationVariants as unknown[])
          .map((v) => (typeof v === "number" ? v : Number(v)))
          .filter((v) => Number.isInteger(v) && v >= 0 && v <= 13);
        if (whitelist.length > 0) {
          return whitelist[Math.floor(Math.random() * whitelist.length)];
        }
      }
      return defaultNumeric;
    } catch {
      return DEFAULT;
    }
  }

  // ─── Hero-A/B-Test (Homepage) ─────────────────────────────────────────────

  /**
   * Wählt die Hero-Variante für einen anonymen Besucher der Startseite:
   *  - Wenn `hero_rotation_enabled === true` und Whitelist nicht leer → zufällig aus Whitelist
   *  - Sonst → fixe Default-Variante aus `hero_variant` (Fallback: 0)
   * Gültige IDs sind 0..4.
   */
  async function pickHeroVariant(): Promise<number> {
    const DEFAULT = 0;
    try {
      const rotationEnabled = await storage.getSetting("hero_rotation_enabled");
      const rotationVariants = await storage.getSetting("hero_rotation_variants");
      const defaultVariant = await storage.getSetting("hero_variant");
      const defaultNumeric =
        typeof defaultVariant === "number" && defaultVariant >= 0 && defaultVariant <= 4
          ? defaultVariant
          : DEFAULT;

      if (rotationEnabled === true && Array.isArray(rotationVariants)) {
        const whitelist = (rotationVariants as unknown[])
          .map((v) => (typeof v === "number" ? v : Number(v)))
          .filter((v) => Number.isInteger(v) && v >= 0 && v <= 4);
        if (whitelist.length > 0) {
          return whitelist[Math.floor(Math.random() * whitelist.length)];
        }
      }
      return defaultNumeric;
    } catch {
      return DEFAULT;
    }
  }

  app.get("/api/hero-variant", async (_req, res) => {
    try {
      const variant = await pickHeroVariant();
      res.json({ variant });
    } catch (error) {
      res.json({ variant: 0 });
    }
  });

  app.post("/api/hero/impression", async (req, res) => {
    try {
      const variant = Number((req.body as { variant?: unknown })?.variant);
      if (!Number.isInteger(variant) || variant < 0 || variant > 4) {
        return res.status(400).json({ message: "Ungültige Variante" });
      }
      storage.incrementHeroImpression(variant).catch((e) =>
        console.error("Error incrementing hero impression:", e),
      );
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ message: "Fehler" });
    }
  });

  app.post("/api/hero/conversion", async (req, res) => {
    try {
      const variant = Number((req.body as { variant?: unknown })?.variant);
      if (!Number.isInteger(variant) || variant < 0 || variant > 4) {
        return res.status(400).json({ message: "Ungültige Variante" });
      }
      storage.incrementHeroConversion(variant).catch((e) =>
        console.error("Error incrementing hero conversion:", e),
      );
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ message: "Fehler" });
    }
  });

  app.get("/api/packages", async (_req, res) => {
    try {
      const packages = await storage.getCreditPackages();
      const promotion = await getActivePromotion();
      if (!promotion.enabled) {
        return res.json(packages);
      }
      const result: CreditPackageWithPromotion[] = packages.map((pkg) => {
        const discountFraction = promotion.discounts[pkg.name];
        if (discountFraction == null || discountFraction <= 0) {
          return pkg;
        }
        const originalPriceEur = pkg.priceEur;
        const discountedPriceCents = getDiscountedPriceCents(originalPriceEur, discountFraction);
        return {
          ...pkg,
          priceEur: discountedPriceCents,
          originalPriceEur,
          discountPercent: Math.round(discountFraction * 100),
          promotionLabel: promotion.label,
        };
      });
      res.json(result);
    } catch (error) {
      console.error("Error getting packages:", error);
      res.status(500).json({ message: "Pakete konnten nicht geladen werden" });
    }
  });

  // ─── Public Examples (Showcase-Dokumente aus Admin-Konfiguration) ──────────

  app.get("/api/examples", async (_req, res) => {
    try {
      const raw = await storage.getSetting("example_config") as Record<string, unknown> | undefined;
      if (!raw || !Array.isArray(raw.documents) || raw.documents.length === 0) {
        return res.json({ examples: [], maxVisible: 0 });
      }

      const maxVisible = typeof raw.maxVisible === "number" ? raw.maxVisible : raw.documents.length;
      const docs = (raw.documents as Array<Record<string, unknown>>).slice(0, maxVisible);

      const examples: Array<Record<string, unknown>> = [];
      for (const doc of docs) {
        const jobId = doc.jobId as number;
        if (!jobId) continue;

        // Backfill: if this example has an audio file on disk but no matching
        // ttsGenerations row, copy the bytes into the DB so the audio will
        // survive the next republish (uploads/ is ephemeral on deploy).
        const audioUrlRaw = typeof doc.audioUrl === "string" ? doc.audioUrl : null;
        if (audioUrlRaw && audioUrlRaw.startsWith("/uploads/")) {
          try {
            const existing = await db
              .select({ id: ttsGenerations.id })
              .from(ttsGenerations)
              .where(eq(ttsGenerations.audioUrl, audioUrlRaw))
              .limit(1);
            if (existing.length === 0) {
              const relPath = audioUrlRaw.replace(/^\/uploads\//, "");
              const diskPath = path.join(uploadDir, relPath);
              if (fs.existsSync(diskPath) && fs.statSync(diskPath).isFile()) {
                const buf = fs.readFileSync(diskPath);
                await db.insert(ttsGenerations).values({
                  jobId,
                  version: "interpreted",
                  lang: "de",
                  voice: "example",
                  style: null,
                  pages: [],
                  status: "completed",
                  audioUrl: audioUrlRaw,
                  audioData: buf.toString("base64"),
                  audioMimeType: "audio/mpeg",
                  creditsUsed: 0,
                });
                console.log(`[Examples] Backfilled audio into DB for job ${jobId}: ${audioUrlRaw}`);
              }
            }
          } catch (err) {
            console.error(`[Examples] Audio backfill failed for job ${jobId}:`, err);
          }
        }

        const [job] = await db
          .select()
          .from(transcriptionJobs)
          .where(eq(transcriptionJobs.id, jobId))
          .limit(1);
        if (!job || job.status !== "completed") continue;

        const pages = await db
          .select({
            pageNumber: transcriptionPages.pageNumber,
            imageUrl: transcriptionPages.imageUrl,
            transcription: transcriptionPages.transcription,
            transcriptionCompleted: transcriptionPages.transcriptionCompleted,
            transcriptionInterpreted: transcriptionPages.transcriptionInterpreted,
            transcriptionEdited: transcriptionPages.transcriptionEdited,
            transcriptionCompletedEdited: transcriptionPages.transcriptionCompletedEdited,
            transcriptionInterpretedEdited: transcriptionPages.transcriptionInterpretedEdited,
            translation: transcriptionPages.translation,
            translationCompleted: transcriptionPages.translationCompleted,
            translationInterpreted: transcriptionPages.translationInterpreted,
            qualityDetails: transcriptionPages.qualityDetails,
            status: transcriptionPages.status,
          })
          .from(transcriptionPages)
          .where(eq(transcriptionPages.jobId, jobId))
          .orderBy(transcriptionPages.pageNumber);

        examples.push({
          id: jobId,
          title: (doc.title as string) || `Dokument #${jobId}`,
          description: (doc.description as string) || "",
          source: (doc.source as string) || "",
          scriptType: job.scriptType,
          translationLanguage: job.translationLanguage,
          totalPages: job.totalPages,
          audioUrl: (doc.audioUrl as string) || null,
          pages,
        });
      }

      res.json({ examples, maxVisible });
    } catch (error) {
      console.error("Error loading examples:", error);
      res.status(500).json({ message: "Fehler beim Laden der Beispiele" });
    }
  });

  async function isConfiguredExampleJob(jobId: number): Promise<boolean> {
    const raw = await storage.getSetting("example_config") as Record<string, unknown> | undefined;
    if (!raw || !Array.isArray(raw.documents)) return false;
    return (raw.documents as Array<Record<string, unknown>>).some((d) => d.jobId === jobId);
  }

  async function buildExamplePdfBytes(req: any, res: any, jobId: number) {
    if (!(await isConfiguredExampleJob(jobId))) {
      res.status(404).json({ message: "Beispiel nicht gefunden" });
      return null;
    }

    const job = await storage.getTranscriptionJob(jobId);
    if (!job || job.status !== "completed") {
      res.status(404).json({ message: "Job nicht gefunden" });
      return null;
    }

    const body = req.body || {};
    const version = body.version || req.query.version || "original";
    const lang = body.lang || req.query.lang || "de";
    const useCompleted = version === "completed";
    const useInterpreted = version === "interpreted";
    const useTranslation = lang === "translation" && !!job.translationLanguage;

    const pages = await storage.getTranscriptionPages(jobId);
    const exportPages = pages
      .filter((p) => p.transcription && p.status === "completed")
      .map((p) => {
        let text: string;
        if (useTranslation) {
          if (useInterpreted) {
            text = ((p as any).translationInterpreted ?? (p as any).translationCompleted ?? (p as any).translation ?? p.transcription) ?? "";
          } else if (useCompleted) {
            text = ((p as any).translationCompleted ?? (p as any).translation ?? p.transcription) ?? "";
          } else {
            text = ((p as any).translation ?? p.transcription) ?? "";
          }
        } else if (useInterpreted) {
          text = (p.transcriptionInterpretedEdited ?? p.transcriptionInterpreted ?? p.transcriptionCompleted ?? p.transcription) ?? "";
        } else if (useCompleted) {
          text = (p.transcriptionCompletedEdited ?? p.transcriptionCompleted ?? p.transcription) ?? "";
        } else {
          text = (p.transcriptionEdited ?? p.transcription) ?? "";
        }
        return { pageNumber: p.pageNumber, text };
      });

    if (exportPages.length === 0) {
      res.status(400).json({ message: "Keine transkribierten Seiten vorhanden." });
      return null;
    }

    const createdAt = job.createdAt
      ? (typeof job.createdAt === "string" ? job.createdAt : job.createdAt.toISOString())
      : new Date().toISOString();

    const coverPage = body.coverPage || undefined;
    const continuousFlow = body.continuousFlow ?? false;
    const justified = body.justified ?? false;
    const mergeLines = body.mergeLines ?? false;
    const showPageLabels = body.showPageLabels ?? true;
    const fontSize = body.fontSize ? Number(body.fontSize) : undefined;

    const pdfBytes = await generateTranscriptionPdf({
      jobId,
      scriptType: getScriptTypeDisplayLabel(job.scriptType),
      version: useInterpreted ? "interpreted" : useCompleted ? "completed" : "original",
      pages: exportPages,
      createdAt,
      coverPage,
      continuousFlow,
      justified,
      mergeLines,
      showPageLabels,
      fontSize,
    });

    return { pdfBytes, useCompleted, useInterpreted, useTranslation, translationLanguage: job.translationLanguage };
  }

  app.post("/api/examples/:id/preview-pdf", async (req: any, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const result = await buildExamplePdfBytes(req, res, jobId);
      if (!result) return;
      res.setHeader("Content-Type", "application/pdf");
      res.send(Buffer.from(result.pdfBytes));
    } catch (error) {
      console.error("Error generating example PDF preview:", error);
      res.status(500).json({ message: "PDF-Vorschau fehlgeschlagen" });
    }
  });

  app.post("/api/examples/:id/export-pdf", async (req: any, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const result = await buildExamplePdfBytes(req, res, jobId);
      if (!result) return;

      const suffix = result.useInterpreted ? "-interpretation" : result.useCompleted ? "-ergaenzt" : "";
      const langSuffix = result.useTranslation ? `-${result.translationLanguage}` : "";
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="mormorsbreve-beispiel-${jobId}${suffix}${langSuffix}.pdf"`,
      );
      res.send(Buffer.from(result.pdfBytes));
    } catch (error) {
      console.error("Error exporting example PDF:", error);
      res.status(500).json({ message: "PDF-Export fehlgeschlagen" });
    }
  });

  // ─── Anonymous analyze (kostenlose KI-Analyse ohne Login) ─────────────────
  // Authed users (especially paying ones) bypass the per-IP rate limit. The
  // limit exists solely to prevent abuse of the free anonymous preview.
  app.post(
    "/api/analyze",
    tryAuthenticate,
    (req: any, res: any, next: any) => {
      if (!req.user) {
        const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket?.remoteAddress || "unknown";
        if (!checkAnalyzeRateLimit(ip)) {
          return res.status(429).json({
            message: "Sie haben das Tageslimit von 3 kostenlosen Analysen erreicht. Bitte melden Sie sich an oder versuchen Sie es morgen erneut.",
          });
        }
      }
      upload.single("file")(req, res, (err: any) => {
        if (err) {
          if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(413).json({ message: "Datei zu groß. Maximale Dateigröße: 50 MB." });
          }
          return res.status(400).json({ message: err.message || "Fehler beim Hochladen." });
        }
        next();
      });
    },
    async (req: any, res) => {
      const file = req.file as Express.Multer.File | undefined;
      const scriptType = (req.body.scriptType as DocumentType | string) || "auto";
      if (!file) {
        return res.status(400).json({ message: "Keine Datei hochgeladen" });
      }
      try {
        const filePath = path.join(uploadDir, file.filename);
        const fileBuffer = fs.readFileSync(filePath);
        const base64 = fileBuffer.toString("base64");
        const ext = path.extname(file.filename).toLowerCase();
        const isPdf = ext === ".pdf";
        const contentBlock = isPdf
          ? { type: "document" as const, source: { type: "base64" as const, media_type: "application/pdf" as const, data: base64 } }
          : {
              type: "image" as const,
              source: {
                type: "base64" as const,
                media_type: (MIME_MAP[ext] || "image/jpeg") as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
                data: base64,
              },
            };
        const quality = await analyzeDocumentOnly(contentBlock, scriptType);
        const token = crypto.randomUUID();
        const imageUrl = `/uploads/${file.filename}`;
        const mimeType = isPdf ? "application/pdf" : (MIME_MAP[ext] || "image/jpeg");
        const ctaVariant = await pickCtaVariantForAnalysis();
        // Bytes nach Object Storage (oder Base64-Fallback) auslagern.
        const stored = await persistImageBytes(imageUrl, fileBuffer);
        await storage.createAnonymousAnalysis({
          token,
          imageUrl,
          storageKey: stored.storageKey,
          imageData: stored.imageData,
          imageMimeType: mimeType,
          scriptType,
          qualityDetails: quality ?? undefined,
          ctaVariant,
        });
        // Impression-Counter erhöhen (best-effort, soll Response nicht blockieren)
        storage.incrementCtaImpression(ctaVariant).catch((err) => {
          console.error("Failed to increment CTA impression:", err);
        });
        const detectedScript = quality?.detectedScriptType || scriptType;
        const transcriptionSnippet = quality?.transcriptionSnippet ?? null;
        res.json({ token, quality: quality ?? null, imageUrl, scriptType: detectedScript, transcriptionSnippet, ctaVariant });
      } catch (error: any) {
        console.error("Error in /api/analyze:", error);
        const toDelete = file && path.join(uploadDir, file.filename);
        if (toDelete && fs.existsSync(toDelete)) fs.unlinkSync(toDelete);
        const userMsg = isOverloadError(error)
          ? "AI-modellen er i øjeblikket overbelastet. Prøv igen om et par minutter."
          : "Analysen kunne ikke gennemføres. Prøv igen.";
        res.status(500).json({ message: userMsg });
      }
    }
  );

  app.get("/api/analyze/:token", async (req: any, res) => {
    try {
      const { token } = req.params;
      const row = await storage.getAnonymousAnalysisByToken(token);
      if (!row) {
        return res.status(404).json({ message: "Analyse nicht gefunden oder abgelaufen" });
      }
      if (row.claimedByUserId) {
        return res.status(400).json({ message: "Diese Analyse wurde bereits verwendet" });
      }
      const qualityData = row.qualityDetails as Record<string, unknown> | null;
      res.json({
        token: row.token,
        quality: row.qualityDetails,
        imageUrl: row.imageUrl,
        scriptType: row.scriptType,
        transcriptionSnippet: qualityData?.transcriptionSnippet ?? null,
        ctaVariant: row.ctaVariant ?? null,
      });
    } catch (error: any) {
      console.error("Error GET /api/analyze/:token:", error);
      res.status(500).json({ message: "Fehler beim Abrufen" });
    }
  });

  app.post("/api/claim-analysis", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.uid;
      const { token, action, translationLanguage } = req.body as {
        token?: string;
        action?: "transcribe" | "expert";
        translationLanguage?: string;
      };
      if (!token || !action || !["transcribe", "expert"].includes(action)) {
        return res.status(400).json({ message: "Ungültige Anfrage (token und action erforderlich)" });
      }
      const analysis = await storage.getAnonymousAnalysisByToken(token);
      if (!analysis) {
        return res.status(404).json({ message: "Analyse nicht gefunden oder abgelaufen" });
      }
      if (analysis.claimedByUserId) {
        return res.status(400).json({ message: "Diese Analyse wurde bereits verwendet" });
      }
      const createdAt = analysis.createdAt ? new Date(analysis.createdAt).getTime() : 0;
      const ageHours = (Date.now() - createdAt) / (60 * 60 * 1000);
      if (ageHours > 24) {
        return res.status(400).json({ message: "Analyse abgelaufen. Bitte laden Sie das Dokument erneut hoch." });
      }
      const filePath = path.join(uploadDir, path.basename(analysis.imageUrl));
      const ext = path.extname(analysis.imageUrl).toLowerCase();
      const isPdf = ext === ".pdf";

      // Quelldatei der Analyse laden: Disk → Object Storage → Base64-DB.
      let sourceBuffer: Buffer | null = fs.existsSync(filePath)
        ? fs.readFileSync(filePath)
        : null;
      if (!sourceBuffer) {
        const key = analysis.storageKey ?? storageKeyForImageUrl(analysis.imageUrl);
        sourceBuffer = await getObject(key);
      }
      if (!sourceBuffer && analysis.imageData) {
        sourceBuffer = Buffer.from(analysis.imageData, "base64");
      }

      const pageEntries: {
        imageUrl: string;
        storageKey: string | null;
        imageData: string | null;
        imageMimeType: string;
      }[] = [];
      if (isPdf && sourceBuffer) {
        const singlePages = await splitPdfPages(sourceBuffer);
        const baseName = path.basename(analysis.imageUrl, ext);
        for (const sp of singlePages) {
          const filename = `${baseName}-page-${sp.pageNumber}.pdf`;
          const fullPath = path.join(uploadDir, filename);
          fs.writeFileSync(fullPath, sp.buffer);
          const imageUrl = `/uploads/${filename}`;
          const persisted = await persistImageBytes(imageUrl, sp.buffer);
          pageEntries.push({
            imageUrl,
            ...persisted,
            imageMimeType: "application/pdf",
          });
        }
        console.log(`[Claim] Split PDF into ${singlePages.length} single-page PDFs`);
      } else {
        const mimeType = isPdf ? "application/pdf" : (MIME_MAP[ext] || "image/jpeg");
        // Liegt die Analyse schon in Object Storage, denselben Key wiederverwenden;
        // sonst die Bytes (neu) ablegen.
        let persisted: { storageKey: string | null; imageData: string | null };
        if (analysis.storageKey) {
          persisted = { storageKey: analysis.storageKey, imageData: null };
        } else if (sourceBuffer) {
          persisted = await persistImageBytes(analysis.imageUrl, sourceBuffer);
        } else {
          persisted = { storageKey: null, imageData: analysis.imageData ?? "" };
        }
        pageEntries.push({
          imageUrl: analysis.imageUrl,
          ...persisted,
          imageMimeType: mimeType,
        });
      }

      const job = await storage.createTranscriptionJob({
        userId,
        scriptType: analysis.scriptType,
        status: "preview",
        totalPages: pageEntries.length,
        ...(translationLanguage && translationLanguage !== "none"
          ? { translationLanguage }
          : {}),
      });

      for (let i = 0; i < pageEntries.length; i++) {
        await storage.createTranscriptionPage({
          jobId: job.id,
          pageNumber: i + 1,
          imageUrl: pageEntries[i].imageUrl,
          storageKey: pageEntries[i].storageKey,
          imageData: pageEntries[i].imageData,
          imageMimeType: pageEntries[i].imageMimeType,
          isPreview: i === 0,
          status: "pending",
        });
      }

      if (action === "transcribe") {
        const userCredits = await storage.ensureUserCredits(userId);
        if (userCredits.credits < 1) {
          return res.status(402).json({
            message: "Nicht genügend Credits. Die Vorschau kostet 1 Credit.",
            creditsRequired: 1,
            currentCredits: userCredits.credits,
          });
        }
        await storage.deductCredits(userId, 1);
        const pages = await storage.getTranscriptionPages(job.id);
        const previewPage = pages[0];
        (async () => {
          const controller = new AbortController();
          registerAbortController(job.id, controller);
          try {
            await processPages(job.id, analysis.scriptType, [previewPage], {
              includeQuality: true,
              setJobCompletedAtEnd: false,
              logLabel: "Claim",
              signal: controller.signal,
              translationLanguage: job.translationLanguage,
            });
          } finally {
            unregisterAbortController(job.id, controller);
          }
        })();
      }
      await storage.updateAnonymousAnalysis(analysis.id, {
        claimedByUserId: userId,
        claimedAt: new Date(),
      });
      // Claim-Counter für die zugewiesene CTA-Variante erhöhen (best-effort)
      if (typeof analysis.ctaVariant === "number") {
        storage.incrementCtaClaim(analysis.ctaVariant).catch((err) => {
          console.error("Failed to increment CTA claim:", err);
        });
      }
      res.json({ jobId: job.id });
    } catch (error: any) {
      if (error instanceof UserNotInDatabaseError) {
        return respondUserNotInDatabase(res);
      }
      console.error("Error in /api/claim-analysis:", error);
      res.status(500).json({ message: error.message || "Fehler beim Übernehmen" });
    }
  });

  // Stripe: Checkout-Session erstellen
  app.post("/api/checkout", isAuthenticated, async (req: any, res) => {
    try {
      const stripeInstance = getStripeOrThrow();
      const userId = req.user.uid;
      const { packageId, consentImmediateDelivery } = req.body;

      // DK-Forbrugeraftalelov: udtrykkeligt samtykke til straks-levering af
      // digitalt indhold (fortrydelsesretten bortfalder) er obligatorisk.
      if (consentImmediateDelivery !== true) {
        return res.status(400).json({
          message:
            "Du skal acceptere, at leveringen begynder med det samme, og at fortrydelsesretten dermed bortfalder.",
        });
      }

      const pkg = await storage.getCreditPackage(packageId);
      if (!pkg) {
        return res.status(404).json({ message: "Paket nicht gefunden" });
      }

      const promotion = await getActivePromotion();
      const discountFraction = promotion.enabled ? promotion.discounts[pkg.name] : undefined;
      const amountCents =
        discountFraction != null && discountFraction > 0
          ? getDiscountedPriceCents(pkg.priceEur, discountFraction)
          : pkg.priceEur;
      const displayName = getCreditPackageDisplayName(pkg.name);
      const description =
        promotion.enabled && discountFraction != null && discountFraction > 0
          ? `${pkg.pages} Transkriptions-Credits für MormorsBreve (${promotion.label})`
          : `${pkg.pages} Transkriptions-Credits für MormorsBreve`;

      // Basis-URL für Redirects
      const protocol = req.headers["x-forwarded-proto"] || req.protocol;
      const host = req.headers["x-forwarded-host"] || req.headers.host;
      const baseUrl = `${protocol}://${host}`;

      const session = await stripeInstance.checkout.sessions.create({
        // Keine payment_method_types: Stripe zeigt die im Dashboard aktivierten
        // Zahlarten dynamisch an (Karte, MobilePay, PayPal … ohne Code-Deploy).
        line_items: [
          {
            price_data: {
              currency: "dkk",
              product_data: {
                name: `${displayName} – ${pkg.pages} Credits`,
                description,
              },
              unit_amount: amountCents,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${baseUrl}/app/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/app/payment/cancel`,
        metadata: {
          userId,
          packageId: String(pkg.id),
          credits: String(pkg.pages),
          // Nachweis des aktiven Samtykke (Fortrydelsesret) zum Kaufzeitpunkt
          consent_immediate_delivery: "yes",
          consent_at: new Date().toISOString(),
        },
      });

      // Payment Order in DB anlegen (amountEur = tatsächlich gezahlter Betrag in Cent)
      await storage.createPaymentOrder({
        userId,
        packageId: pkg.id,
        stripeSessionId: session.id,
        amountEur: amountCents,
        credits: pkg.pages,
        status: "pending",
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({ message: error.message || "Fehler beim Erstellen der Checkout-Session" });
    }
  });

  // ─── Stripe Webhook ──────────────────────────────────────────────────────────

  async function fulfillCreditOrder(session: any): Promise<boolean> {
    const metadata = session.metadata || {};
    const sessionId = session.id;
    const paymentIntent = session.payment_intent as string | null;

    const order = await storage.getPaymentOrderBySessionId(sessionId);
    if (!order) {
      console.error(`[Stripe Webhook] FEHLER: Keine payment_order für session ${sessionId} gefunden (metadata: ${JSON.stringify(metadata)})`);
      return false;
    }

    const completed = await storage.completePaymentOrder(order.id, paymentIntent || undefined);
    if (!completed) {
      console.log(`[Stripe Webhook] Order ${order.id} bereits verarbeitet, überspringe`);
      return true;
    }

    await storage.addCredits(completed.userId, completed.credits);
    console.log(`[Stripe Webhook] ✓ ${completed.credits} Credits an User ${completed.userId} gutgeschrieben (Order ${completed.id}, session ${sessionId})`);

    try {
      const user = await storage.getUser(completed.userId);
      const pkg = await storage.getCreditPackage(completed.packageId);
      if (user && pkg) {
        await createInvoiceForCreditPurchase(storage, completed, user, pkg);
        console.log(`[Stripe Webhook] Rechnung für Order ${completed.id} erstellt`);
      }
    } catch (invErr) {
      console.error("[Stripe Webhook] Rechnungserstellung fehlgeschlagen (Credits wurden gutgeschrieben):", invErr);
    }
    return true;
  }

  async function handleSpecialistOrder(session: any): Promise<boolean> {
    const metadata = session.metadata || {};
    const humanRequestId = parseInt(metadata.humanRequestId);
    if (!humanRequestId) {
      console.error(`[Stripe Webhook] Specialist order: missing humanRequestId`);
      return false;
    }

    const htRequest = await storage.getHumanTranscriptionRequest(humanRequestId);
    if (!htRequest) {
      console.error(`[Stripe Webhook] Specialist order: request ${humanRequestId} not found`);
      return false;
    }

    if (htRequest.status === "accepted" || htRequest.status === "in_progress" || htRequest.status === "completed") {
      console.log(`[Stripe Webhook] Specialist order ${humanRequestId} already processed, skipping`);
      return true;
    }

    const updated = await storage.updateHumanTranscriptionRequest(humanRequestId, {
      status: "accepted",
      respondedAt: new Date(),
      stripePaymentIntentId: session.payment_intent as string,
    });
    console.log(`[Stripe Webhook] Specialist order ${humanRequestId} accepted`);

    try {
      const user = await storage.getUser(htRequest.userId);
      if (user) {
        const job = await storage.getTranscriptionJob(htRequest.jobId);
        const desc = job
          ? `Manuelle Transkription durch Spezialisten (Auftrag #${htRequest.jobId})`
          : `Manuelle Transkription durch Spezialisten (Anfrage #${humanRequestId})`;
        await createInvoiceForSpecialistOrder(storage, updated, user, desc);
        console.log(`[Stripe Webhook] Rechnung für Spezialistenauftrag ${humanRequestId} erstellt`);
      }
    } catch (invErr) {
      console.error("[Stripe Webhook] Rechnungserstellung für Spezialistenauftrag fehlgeschlagen:", invErr);
    }
    return true;
  }

  app.post("/api/stripe/webhook", async (req: any, res) => {
    const stripeWh = getStripeInstance();
    if (!stripeWh) {
      return res.status(503).json({ message: "Stripe nicht konfiguriert" });
    }

    const sig = req.headers["stripe-signature"];
    const webhookSecret = getWebhookSecret();

    let event;

    try {
      if (webhookSecret && sig) {
        event = stripeWh.webhooks.constructEvent(
          req.rawBody as Buffer,
          sig,
          webhookSecret
        );
      } else {
        event = req.body;
        console.warn("[Stripe Webhook] Ohne Signaturprüfung verarbeitet (dev mode). STRIPE_WEBHOOK_SECRET / STRIPE_WEBHOOK_SECRET_LIVE nicht gesetzt?");
      }
    } catch (err: any) {
      console.error(`[Stripe Webhook] Signaturprüfung fehlgeschlagen (mode=${getStripeMode()}):`, err.message);
      return res.status(400).json({ message: `Webhook Error: ${err.message}` });
    }

    const eventType = event.type;
    const session = event.data?.object;
    const metadata = session?.metadata || {};
    console.log(`[Stripe Webhook] Event: ${eventType}, session: ${session?.id}, payment_status: ${session?.payment_status}, mode: ${getStripeMode()}, type: ${metadata.type || "credit_purchase"}`);

    try {
      switch (eventType) {
        case "checkout.session.completed": {
          if (metadata.type === "specialist_order") {
            const ok = await handleSpecialistOrder(session);
            if (!ok) return res.status(500).json({ message: "Specialist order processing failed" });
          } else {
            if (session.payment_status === "paid") {
              const ok = await fulfillCreditOrder(session);
              if (!ok) return res.status(500).json({ message: "Credit fulfillment failed" });
            } else {
              console.log(`[Stripe Webhook] Session ${session.id} completed mit payment_status="${session.payment_status}" (async Zahlung, warte auf async_payment_succeeded)`);
            }
          }
          break;
        }

        case "checkout.session.async_payment_succeeded": {
          console.log(`[Stripe Webhook] Async-Zahlung erfolgreich für session ${session.id}`);
          if (metadata.type === "specialist_order") {
            const ok = await handleSpecialistOrder(session);
            if (!ok) return res.status(500).json({ message: "Specialist order processing failed" });
          } else {
            const ok = await fulfillCreditOrder(session);
            if (!ok) return res.status(500).json({ message: "Credit fulfillment failed" });
          }
          break;
        }

        case "checkout.session.async_payment_failed": {
          console.error(`[Stripe Webhook] Async-Zahlung FEHLGESCHLAGEN für session ${session.id}`);
          const order = await storage.getPaymentOrderBySessionId(session.id);
          if (order && order.status === "pending") {
            await storage.updatePaymentOrderStatus(order.id, "failed");
            console.log(`[Stripe Webhook] Order ${order.id} als failed markiert`);
          }
          break;
        }

        case "checkout.session.expired": {
          if (metadata.type === "specialist_order") {
            const humanRequestId = parseInt(metadata.humanRequestId);
            if (humanRequestId) {
              const htReq = await storage.getHumanTranscriptionRequest(humanRequestId);
              if (htReq && htReq.status === "quoted") {
                await storage.updateHumanTranscriptionRequest(humanRequestId, {
                  stripeSessionId: null,
                });
                console.log(`[Stripe Webhook] Specialist checkout ${humanRequestId} expired, session cleared`);
              }
            }
          } else {
            const order = await storage.getPaymentOrderBySessionId(session.id);
            if (order && order.status === "pending") {
              await storage.updatePaymentOrderStatus(order.id, "expired");
              console.log(`[Stripe Webhook] Order ${order.id} expired`);
            }
          }
          break;
        }

        default:
          console.log(`[Stripe Webhook] Unbekanntes Event: ${eventType}`);
      }
    } catch (error) {
      console.error(`[Stripe Webhook] Fehler bei Verarbeitung von ${eventType}:`, error);
      return res.status(500).json({ message: "Webhook processing error" });
    }

    res.json({ received: true });
  });

  // Payment-Status abfragen (für Success-Seite)
  app.get("/api/payment/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.uid;
      const sessionId = req.query.session_id as string;

      if (!sessionId) {
        return res.status(400).json({ message: "session_id fehlt" });
      }

      const order = await storage.getPaymentOrderBySessionId(sessionId);
      if (!order || order.userId !== userId) {
        return res.status(404).json({ message: "Bestellung nicht gefunden" });
      }

      // Wenn noch pending, versuche den Status bei Stripe abzufragen
      if (order.status === "pending") {
        const stripeInst = getStripeInstance();
        let stripeConfirmed = false;
        let completedOrder: Awaited<ReturnType<typeof storage.completePaymentOrder>> = undefined;

        if (stripeInst) {
          try {
            const session = await stripeInst.checkout.sessions.retrieve(sessionId);
            if (session.payment_status === "paid") {
              stripeConfirmed = true;
              completedOrder = await storage.completePaymentOrder(
                order.id,
                session.payment_intent as string
              );
              if (completedOrder) {
                await storage.addCredits(completedOrder.userId, completedOrder.credits);
                console.log(`[Stripe] Order ${order.id} via Retrieve abgeschlossen, ${completedOrder.credits} Credits gutgeschrieben`);
              }
            }
          } catch (err) {
            // Bewusst NICHT gutschreiben: Ein fehlgeschlagener Abruf (z. B.
            // Test-/Live-Mode-Mismatch, Stripe nicht erreichbar) ist KEINE
            // Zahlungsbestätigung. Die Order bleibt pending — die Success-
            // Seite pollt weiter und der Webhook schließt verlässlich ab.
            console.error(`[Stripe] Session-Abruf fehlgeschlagen (mode=${getStripeMode()}), Order ${order.id} bleibt pending:`, err);
          }
        } else {
          console.error(`[Stripe] Keine Stripe-Instanz für Modus "${getStripeMode()}" – Order ${order.id} bleibt pending.`);
        }

        if (stripeConfirmed && completedOrder) {
          try {
            const user = await storage.getUser(completedOrder.userId);
            const pkg = await storage.getCreditPackage(completedOrder.packageId);
            if (user && pkg) {
              await createInvoiceForCreditPurchase(storage, completedOrder, user, pkg);
              console.log(`[Stripe] Rechnung für Order ${completedOrder.id} erstellt (via Payment-Status)`);
            }
          } catch (invErr) {
            console.error("[Stripe] Rechnungserstellung via Payment-Status fehlgeschlagen:", invErr);
          }
        }

        if (stripeConfirmed) {
          const credits = await storage.getUserCredits(userId);
          const pkg = await storage.getCreditPackage(order.packageId);
          const promotion = await getActivePromotion();
          const wasDiscounted = pkg ? order.amountEur < pkg.priceEur : false;
          return res.json({
            status: "completed",
            credits: order.credits,
            pages: order.credits,
            packageName: pkg ? getCreditPackageDisplayName(pkg.name) : "",
            currentCredits: credits?.credits ?? 0,
            amountEur: order.amountEur,
            originalPriceEur: pkg?.priceEur ?? order.amountEur,
            discountPercent: wasDiscounted && pkg
              ? Math.round((1 - order.amountEur / pkg.priceEur) * 100)
              : 0,
            promotionLabel: wasDiscounted ? (promotion.label ?? "") : "",
          });
        }
      }

      const credits = await storage.getUserCredits(userId);
      const pkg = await storage.getCreditPackage(order.packageId);
      const promotion = await getActivePromotion();
      const wasDiscounted = pkg ? order.amountEur < pkg.priceEur : false;

      res.json({
        status: order.status,
        credits: order.credits,
        pages: order.credits,
        packageName: pkg ? getCreditPackageDisplayName(pkg.name) : "",
        currentCredits: credits?.credits ?? 0,
        amountEur: order.amountEur,
        originalPriceEur: pkg?.priceEur ?? order.amountEur,
        discountPercent: wasDiscounted && pkg
          ? Math.round((1 - order.amountEur / pkg.priceEur) * 100)
          : 0,
        promotionLabel: wasDiscounted ? (promotion.label ?? "") : "",
      });
    } catch (error) {
      console.error("Error getting payment status:", error);
      res.status(500).json({ message: "Fehler beim Abrufen des Zahlungsstatus" });
    }
  });

  // Rechnungen: Liste und PDF-Download (inkl. Backfill für ältere Zahlungen ohne Rechnung)
  app.get("/api/invoices", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.uid;
      let list = await storage.getInvoicesByUser(userId);
      const orders = await storage.getPaymentOrdersByUser(userId);
      const completedOrders = orders.filter((o) => o.status === "completed");
      const invoiceOrderIds = new Set(
        list.map((inv) => inv.paymentOrderId).filter(Boolean)
      );
      for (const order of completedOrders) {
        if (invoiceOrderIds.has(order.id)) continue;
        try {
          const user = await storage.getUser(order.userId);
          const pkg = await storage.getCreditPackage(order.packageId);
          if (user && pkg) {
            const invoice = await createInvoiceForCreditPurchase(
              storage,
              order,
              user,
              pkg
            );
            invoiceOrderIds.add(order.id);
            list = [invoice, ...list];
          }
        } catch (err) {
          console.error("[Invoices] Backfill für Order", order.id, "fehlgeschlagen:", err);
        }
      }
      list.sort(
        (a, b) =>
          (b.createdAt ? new Date(b.createdAt).getTime() : 0) -
          (a.createdAt ? new Date(a.createdAt).getTime() : 0)
      );
      res.json(list);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      res.status(500).json({ message: "Fehler beim Abrufen der Rechnungen" });
    }
  });

  app.get("/api/invoices/:id/pdf", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.uid;
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        return res.status(400).json({ message: "Ungültige Rechnungs-ID" });
      }
      const invoice = await storage.getInvoiceById(id);
      if (!invoice || invoice.userId !== userId) {
        return res.status(404).json({ message: "Rechnung nicht gefunden" });
      }

      let fullPath = getInvoicePdfPath(invoice.pdfPath);

      if (!fullPath) {
        try {
          const hasAddress = invoice.customerStreet || invoice.customerCity;
          if (!hasAddress) {
            const user = await storage.getUser(invoice.userId);
            if (user) {
              const fresh = resolveCustomerData(user);
              Object.assign(invoice, fresh);
              await storage.updateInvoice(invoice.id, fresh);
            }
          }
          const pdfBuffer = await generateInvoicePdf(invoice);
          ensureInvoicesDir();
          const filename = `${invoice.invoiceNumber}.pdf`;
          const dest = path.join(INVOICES_DIR, filename);
          fs.writeFileSync(dest, pdfBuffer);
          if (!invoice.pdfPath) {
            await storage.updateInvoice(invoice.id, { pdfPath: filename });
          }
          fullPath = dest;
          console.log(`[Invoices] PDF für ${invoice.invoiceNumber} on-demand regeneriert`);
        } catch (regenErr) {
          console.error(`[Invoices] PDF-Regenerierung für ${invoice.invoiceNumber} fehlgeschlagen:`, regenErr);
          return res.status(500).json({ message: "Rechnungs-PDF konnte nicht erstellt werden" });
        }
      }

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${invoice.invoiceNumber}.pdf"`
      );
      res.sendFile(fullPath);
    } catch (error) {
      console.error("Error serving invoice PDF:", error);
      res.status(500).json({ message: "Fehler beim Abrufen der Rechnung" });
    }
  });

  app.post(
    "/api/upload",
    isAuthenticated,
    // WAF-Workaround: Replits Deployment-Edge blockt Multipart-PDF-Uploads (die WAF
    // erkennt PDF-Binärsignaturen wie "%PDF"/"/JavaScript" als Angriff → 403, bevor
    // der Request die App erreicht). Deshalb sendet der Client die Dateien jetzt
    // Base64-kodiert in einem JSON-Body – darin tauchen diese Signaturen nicht auf.
    // Limit großzügig: 50 MB Datei → ~67 MB Base64 + JSON-Overhead.
    express.json({ limit: "75mb" }),
    (req: any, res: any, next: any) => {
      try {
        const incoming = Array.isArray(req.body?.files) ? req.body.files : null;
        if (!incoming || incoming.length === 0) {
          return res.status(400).json({ message: "Keine Dateien hochgeladen" });
        }
        if (incoming.length > 50) {
          return res.status(413).json({
            message: "Zu viele Dateien. Maximal 50 Dateien pro Upload.",
          });
        }

        const allowed = [
          "image/jpeg",
          "image/png",
          "image/webp",
          "image/tiff",
          "application/pdf",
        ];
        const MAX_FILE = 50 * 1024 * 1024; // 50 MB pro Datei
        const extByMime: Record<string, string> = {
          "application/pdf": ".pdf",
          "image/png": ".png",
          "image/webp": ".webp",
          "image/tiff": ".tiff",
          "image/jpeg": ".jpg",
        };

        const written: {
          mimetype: string;
          path: string;
          filename: string;
          size: number;
          originalname: string;
        }[] = [];
        const cleanup = () => {
          for (const w of written) {
            try {
              if (fs.existsSync(w.path)) fs.unlinkSync(w.path);
            } catch {
              // ignore
            }
          }
        };

        for (const f of incoming) {
          const mimetype = typeof f?.mimeType === "string" ? f.mimeType : "";
          const dataBase64 = typeof f?.dataBase64 === "string" ? f.dataBase64 : "";
          if (!allowed.includes(mimetype) || !dataBase64) {
            cleanup();
            return res
              .status(400)
              .json({ message: "Ungültiges Dateiformat oder leere Datei." });
          }
          const buffer = Buffer.from(dataBase64, "base64");
          if (buffer.length === 0) {
            cleanup();
            return res.status(400).json({ message: "Leere Datei." });
          }
          if (buffer.length > MAX_FILE) {
            cleanup();
            return res.status(413).json({
              message: "Datei zu groß. Maximale Dateigröße: 50 MB pro Datei.",
            });
          }
          const origName = typeof f?.filename === "string" ? f.filename : "";
          const ext = path.extname(origName) || extByMime[mimetype] || "";
          const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
          const fullPath = path.join(uploadDir, uniqueName);
          fs.writeFileSync(fullPath, buffer);
          written.push({
            mimetype,
            path: fullPath,
            filename: uniqueName,
            size: buffer.length,
            originalname: origName,
          });
        }

        // Kompatibel zur bisherigen Multer-Struktur, damit der Handler unverändert bleibt.
        req.files = written;
        next();
      } catch (err) {
        console.error("Error decoding upload payload:", err);
        return res
          .status(400)
          .json({ message: "Fehler beim Hochladen der Datei." });
      }
    },
    async (req: any, res) => {
      try {
        const userId = req.user.uid;
        const files = req.files as UploadedFile[];
        const scriptType = req.body.scriptType as DocumentType | string;
        const translationLanguage = (req.body.translationLanguage as string) || null;
        await startUploadJob(res, userId, files, scriptType, translationLanguage);
      } catch (error) {
        if (error instanceof UserNotInDatabaseError) {
          return respondUserNotInDatabase(res);
        }
        console.error("Error uploading:", error);
        res.status(500).json({ message: "Upload fehlgeschlagen" });
      }
    }
  );

  // ─── Chunked Upload: einzelnen Chunk entgegennehmen ────────────────────────
  // Body (JSON): { uploadId, fileIndex, chunkIndex, dataBase64 }
  // Speichert den Chunk temporär auf der Disk. Reassembly erst in /complete.
  app.post(
    "/api/upload/chunk",
    isAuthenticated,
    express.json({ limit: "10mb" }),
    (req: any, res) => {
      try {
        const { uploadId, fileIndex, chunkIndex, dataBase64 } = req.body ?? {};
        if (!isValidUploadId(uploadId)) {
          return res.status(400).json({ message: "Ungültige uploadId." });
        }
        const fi = Number(fileIndex);
        const ci = Number(chunkIndex);
        if (
          !Number.isInteger(fi) || fi < 0 || fi >= 50 ||
          !Number.isInteger(ci) || ci < 0 || ci >= MAX_CHUNKS_PER_FILE
        ) {
          return res.status(400).json({ message: "Ungültiger Chunk-Index." });
        }
        if (typeof dataBase64 !== "string" || dataBase64.length === 0) {
          return res.status(400).json({ message: "Leerer Chunk." });
        }
        const buffer = Buffer.from(dataBase64, "base64");
        if (buffer.length === 0 || buffer.length > MAX_CHUNK_BYTES) {
          return res.status(413).json({ message: "Chunk zu groß." });
        }
        const dir = chunkSessionDir(uploadId);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(chunkFilePath(uploadId, fi, ci), buffer);
        return res.json({ ok: true });
      } catch (err) {
        console.error("[ChunkUpload] Fehler beim Speichern eines Chunks:", err);
        return res.status(500).json({ message: "Chunk konnte nicht gespeichert werden." });
      }
    }
  );

  // ─── Chunked Upload: Chunks zusammensetzen & Job starten ───────────────────
  // Body (JSON): { uploadId, files: [{ filename, mimeType, fileIndex, totalChunks }],
  //               scriptType, translationLanguage? }
  app.post(
    "/api/upload/complete",
    isAuthenticated,
    express.json({ limit: "1mb" }),
    async (req: any, res) => {
      const uploadId = req.body?.uploadId;
      if (!isValidUploadId(uploadId)) {
        return res.status(400).json({ message: "Ungültige uploadId." });
      }
      const assembled: UploadedFile[] = [];
      try {
        const userId = req.user.uid;
        const scriptType = (req.body?.scriptType as DocumentType | string) || "auto";
        const translationLanguage = (req.body?.translationLanguage as string) || null;
        const fileSpecs = Array.isArray(req.body?.files) ? req.body.files : null;
        if (!fileSpecs || fileSpecs.length === 0) {
          cleanupChunkSession(uploadId);
          return res.status(400).json({ message: "Keine Dateien angegeben." });
        }
        if (fileSpecs.length > 50) {
          cleanupChunkSession(uploadId);
          return res.status(413).json({ message: "Zu viele Dateien. Maximal 50 Dateien pro Upload." });
        }

        for (const spec of fileSpecs) {
          const fi = Number(spec?.fileIndex);
          const totalChunks = Number(spec?.totalChunks);
          const mimeType = typeof spec?.mimeType === "string" ? spec.mimeType : "";
          if (
            !Number.isInteger(fi) || fi < 0 ||
            !Number.isInteger(totalChunks) || totalChunks < 1 || totalChunks > MAX_CHUNKS_PER_FILE
          ) {
            throw new Error("Ungültige Datei-Metadaten.");
          }
          if (!ALLOWED_UPLOAD_MIMES.includes(mimeType)) {
            throw new Error("Ungültiges Dateiformat.");
          }
          const origName = typeof spec?.filename === "string" ? spec.filename : "";
          const ext = path.extname(origName) || UPLOAD_EXT_BY_MIME[mimeType] || "";
          const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
          const targetPath = path.join(uploadDir, uniqueName);

          // Chunks 0..totalChunks-1 der Reihe nach an die Zieldatei anhängen.
          const out = fs.createWriteStream(targetPath);
          let total = 0;
          try {
            for (let ci = 0; ci < totalChunks; ci++) {
              const partPath = chunkFilePath(uploadId, fi, ci);
              if (!fs.existsSync(partPath)) {
                throw new Error(`Fehlender Chunk ${ci} von Datei ${fi}.`);
              }
              const part = fs.readFileSync(partPath);
              total += part.length;
              if (total > MAX_UPLOAD_FILE_BYTES) {
                throw new Error("Datei zu groß. Maximale Dateigröße: 100 MB pro Datei.");
              }
              out.write(part);
            }
          } finally {
            out.end();
          }
          await new Promise<void>((resolve, reject) => {
            out.on("finish", () => resolve());
            out.on("error", reject);
          });
          if (total === 0) throw new Error("Leere Datei.");

          assembled.push({ mimetype: mimeType, path: targetPath, filename: uniqueName });
        }

        // Temporäre Chunks aufräumen – die fertigen Dateien liegen jetzt in uploadDir.
        cleanupChunkSession(uploadId);

        await startUploadJob(res, userId, assembled, scriptType, translationLanguage);
      } catch (error: any) {
        // Aufräumen: Chunks + bereits zusammengesetzte Dateien entfernen.
        cleanupChunkSession(uploadId);
        for (const f of assembled) {
          try { if (fs.existsSync(f.path)) fs.unlinkSync(f.path); } catch { /* ignore */ }
        }
        if (error instanceof UserNotInDatabaseError) {
          return respondUserNotInDatabase(res);
        }
        console.error("[ChunkUpload] Fehler beim Zusammensetzen:", error);
        if (!res.headersSent) {
          return res.status(400).json({ message: error?.message || "Upload fehlgeschlagen." });
        }
      }
    }
  );

  app.get("/api/jobs", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.uid;
      const jobs = await storage.getTranscriptionJobsByUser(userId);
      res.json(jobs);
    } catch (error) {
      console.error("Error getting jobs:", error);
      res.status(500).json({ message: "Failed to get jobs" });
    }
  });

  app.delete("/api/jobs/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.uid;
      const jobId = parseInt(req.params.id);
      const job = await storage.getTranscriptionJob(jobId);

      if (!job || job.userId !== userId) {
        return res.status(404).json({ message: "Job nicht gefunden" });
      }

      const pages = await storage.getTranscriptionPages(jobId);
      for (const page of pages) {
        if (page.imageUrl) {
          const filePath = path.join(uploadDir, path.basename(page.imageUrl));
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        }
      }

      await storage.deleteTranscriptionJob(jobId);
      res.json({ message: "Dokument gelöscht" });
    } catch (error) {
      console.error("Error deleting job:", error);
      res.status(500).json({ message: "Löschen fehlgeschlagen" });
    }
  });

  // Umbenennen: setzt einen vom Nutzer vergebenen Titel (oder löscht ihn bei leerem String).
  app.patch("/api/jobs/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.uid;
      const jobId = parseInt(req.params.id);
      if (Number.isNaN(jobId)) {
        return res.status(400).json({ message: "Ungültige ID" });
      }
      const job = await storage.getTranscriptionJob(jobId);
      if (!job || job.userId !== userId) {
        return res.status(404).json({ message: "Job nicht gefunden" });
      }

      const rawTitle = typeof req.body?.title === "string" ? req.body.title : "";
      const trimmed = rawTitle.trim().slice(0, 200);
      // Leerer Titel => zurück auf NULL (Anzeige fällt auf Textauszug zurück).
      const title = trimmed.length > 0 ? trimmed : null;

      const updated = await storage.updateTranscriptionJob(jobId, { title });
      res.json(updated);
    } catch (error) {
      console.error("Error renaming job:", error);
      res.status(500).json({ message: "Umbenennen fehlgeschlagen" });
    }
  });

  app.get("/api/jobs/:id/preview", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.uid;
      const jobId = parseInt(req.params.id);
      const job = await storage.getTranscriptionJob(jobId);
      const isAdminUser = await checkIsAdmin(req);
      if (!job || (job.userId !== userId && !isAdminUser)) {
        return res.status(404).json({ message: "Job nicht gefunden" });
      }

      const pages = await storage.getTranscriptionPages(jobId);
      const previewPage = pages.find((p) => p.isPreview) ?? pages[0];
      const credits = await storage.getUserCredits(userId);

      // Credits needed for remaining (non-preview) pages
      const remainingPages = pages.filter(p => p.status === "pending").length;

      // Race condition guard: directly after POST /api/upload, large PDFs are still
      // being split into per-page files (async). The client starts polling immediately,
      // so `pages` can be empty for a brief moment. Return a "processing" placeholder
      // instead of crashing on undefined.previewPage.status.
      if (!previewPage) {
        return res.json({
          jobId: job.id,
          previewPageId: null,
          imageUrl: null,
          transcription: null,
          quality: null,
          totalPages: job.totalPages,
          creditsRequired: remainingPages,
          currentCredits: credits?.credits ?? 0,
          progress: { completed: 0, processing: 1, failed: 0, total: 1 },
        });
      }

      const previewDone = previewPage.status === "completed" || previewPage.status === "failed";

      // Still processing
      if (!previewDone) {
        return res.json({
          jobId: job.id,
          previewPageId: previewPage.id,
          imageUrl: previewPage.imageUrl,
          transcription: null,
          quality: null,
          totalPages: job.totalPages,
          creditsRequired: remainingPages,
          currentCredits: credits?.credits ?? 0,
          progress: { completed: 0, processing: 1, failed: 0, total: 1 },
        });
      }

      // Preview failed
      if (previewPage.status === "failed") {
        return res.json({
          jobId: job.id,
          previewPageId: previewPage.id,
          imageUrl: previewPage.imageUrl,
          transcription: previewPage.transcription || "Vorschau konnte nicht erstellt werden.",
          quality: null,
          totalPages: job.totalPages,
          creditsRequired: remainingPages,
          currentCredits: credits?.credits ?? 0,
          progress: { completed: 0, processing: 0, failed: 1, total: 1 },
          failed: true,
        });
      }

      // Preview completed (include edited versions so frontend can show edited ?? original)
      const transcription = previewPage.transcription || null;
      const transcriptionCompleted = previewPage.transcriptionCompleted || null;
      const transcriptionInterpreted = previewPage.transcriptionInterpreted || null;
      const transcriptionEdited = previewPage.transcriptionEdited ?? null;
      const transcriptionCompletedEdited = previewPage.transcriptionCompletedEdited ?? null;
      const transcriptionInterpretedEdited = previewPage.transcriptionInterpretedEdited ?? null;

      res.json({
        jobId: job.id,
        previewPageId: previewPage.id,
        imageUrl: previewPage.imageUrl,
        transcription,
        transcriptionCompleted,
        transcriptionInterpreted,
        transcriptionEdited,
        transcriptionCompletedEdited,
        transcriptionInterpretedEdited,
        translation: previewPage.translation ?? null,
        translationCompleted: previewPage.translationCompleted ?? null,
        translationInterpreted: previewPage.translationInterpreted ?? null,
        translationLanguage: job.translationLanguage ?? null,
        quality: previewPage.qualityDetails ?? null,
        totalPages: job.totalPages,
        creditsRequired: remainingPages,
        currentCredits: credits?.credits ?? 0,
        progress: { completed: 1, processing: 0, failed: 0, total: 1 },
      });
    } catch (error) {
      console.error("Error getting preview:", error);
      res.status(500).json({ message: "Failed to get preview" });
    }
  });

  app.post("/api/jobs/:id/transcribe", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.uid;
      const jobId = parseInt(req.params.id);
      // #region agent log
      fetch('http://localhost:7451/ingest/da4f1dcd-f617-424b-8f7d-867380948ac6',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'220336'},body:JSON.stringify({sessionId:'220336',runId:'live-file-fail-2',hypothesisId:'H0',location:'server/routes.ts:/api/jobs/:id/transcribe:entry',message:'transcribe endpoint hit',data:{jobId,userIdPresent:!!userId},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      const job = await storage.getTranscriptionJob(jobId);

      if (!job || job.userId !== userId) {
        return res.status(404).json({ message: "Job nicht gefunden" });
      }

      const pages = await storage.getTranscriptionPages(jobId);
      const pagesToProcess = pages.filter((p) => p.status === "pending");

      // Deduct credits for remaining (non-preview) pages
      const remainingCredits = pagesToProcess.length;
      if (remainingCredits > 0) {
        const credits = await storage.ensureUserCredits(userId);
        const available = credits.credits;
        if (available < remainingCredits) {
          return res.status(402).json({
            message: `Nicht genügend Credits. Sie benötigen noch ${remainingCredits} ${remainingCredits === 1 ? "Credit" : "Credits"}, haben aber nur ${available}.`,
            creditsRequired: remainingCredits,
            currentCredits: available,
          });
        }
        await storage.deductCredits(userId, remainingCredits);
      }

      await storage.updateTranscriptionJobStatus(jobId, "processing");

      (async () => {
        const controller = new AbortController();
        registerAbortController(jobId, controller);
        try {
          await processPages(jobId, job.scriptType, pagesToProcess, {
            setJobCompletedAtEnd: true,
            logLabel: "Transcription",
            signal: controller.signal,
            userId,
            translationLanguage: job.translationLanguage,
          });
        } finally {
          unregisterAbortController(jobId, controller);
        }
      })();

      res.json({ message: "Transkription gestartet" });
    } catch (error: any) {
      if (error instanceof UserNotInDatabaseError) {
        return respondUserNotInDatabase(res);
      }
      console.error("Error starting transcription:", error);
      res.status(400).json({ message: error.message || "Fehler" });
    }
  });

  app.post("/api/jobs/:id/pages/:pageId/retry", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.uid;
      const jobId = parseInt(req.params.id);
      const pageId = parseInt(req.params.pageId);

      const job = await storage.getTranscriptionJob(jobId);
      if (!job || job.userId !== userId) {
        return res.status(404).json({ message: "Job nicht gefunden" });
      }

      const page = await storage.getTranscriptionPage(pageId);
      if (!page || page.jobId !== jobId) {
        return res.status(404).json({ message: "Seite nicht gefunden" });
      }
      if (page.status !== "failed") {
        return res.status(400).json({ message: "Nur fehlgeschlagene Seiten können erneut transkribiert werden." });
      }

      const credits = await storage.ensureUserCredits(userId);
      if (credits.credits < 1) {
        return res.status(402).json({
          message: "Nicht genügend Credits. Sie benötigen 1 Credit.",
          creditsRequired: 1,
          currentCredits: credits.credits,
        });
      }
      await storage.deductCredits(userId, 1);

      await storage.updateTranscriptionPage(pageId, {
        status: "pending",
        transcription: null,
        transcriptionCompleted: null,
        transcriptionInterpreted: null,
        translation: null,
        translationCompleted: null,
        translationInterpreted: null,
        qualityScore: null,
        qualityDetails: null,
        inputTokens: null,
        outputTokens: null,
      });

      (async () => {
        const controller = new AbortController();
        registerAbortController(jobId, controller);
        try {
          await processPages(jobId, job.scriptType, [{
            id: page.id,
            pageNumber: page.pageNumber,
            imageUrl: page.imageUrl,
            imageMimeType: page.imageMimeType,
          }], {
            setJobCompletedAtEnd: false,
            logLabel: "Retry",
            signal: controller.signal,
            userId,
            translationLanguage: job.translationLanguage,
          });
        } finally {
          unregisterAbortController(jobId, controller);
        }
      })();

      res.json({ message: "Erneute Transkription gestartet" });
    } catch (error: any) {
      if (error instanceof UserNotInDatabaseError) {
        return respondUserNotInDatabase(res);
      }
      console.error("Error retrying page:", error);
      res.status(400).json({ message: error.message || "Fehler" });
    }
  });

  app.post("/api/jobs/:id/retry-failed", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.uid;
      const jobId = parseInt(req.params.id);

      const job = await storage.getTranscriptionJob(jobId);
      if (!job || job.userId !== userId) {
        return res.status(404).json({ message: "Job nicht gefunden" });
      }

      const pages = await storage.getTranscriptionPages(jobId);
      const failedPages = pages.filter((p) => p.status === "failed");

      if (failedPages.length === 0) {
        return res.status(400).json({ message: "Keine fehlgeschlagenen Seiten vorhanden." });
      }

      const credits = await storage.ensureUserCredits(userId);
      if (credits.credits < failedPages.length) {
        return res.status(402).json({
          message: `Nicht genügend Credits. Sie benötigen ${failedPages.length} ${failedPages.length === 1 ? "Credit" : "Credits"}, haben aber nur ${credits.credits}.`,
          creditsRequired: failedPages.length,
          currentCredits: credits.credits,
        });
      }
      await storage.deductCredits(userId, failedPages.length);

      for (const p of failedPages) {
        await storage.updateTranscriptionPage(p.id, {
          status: "pending",
          transcription: null,
          transcriptionCompleted: null,
          transcriptionInterpreted: null,
          translation: null,
          translationCompleted: null,
          translationInterpreted: null,
          qualityScore: null,
          qualityDetails: null,
          inputTokens: null,
          outputTokens: null,
        });
      }

      const pagesToProcess = failedPages.map((p) => ({
        id: p.id,
        pageNumber: p.pageNumber,
        imageUrl: p.imageUrl,
        imageMimeType: p.imageMimeType,
      }));

      (async () => {
        const controller = new AbortController();
        registerAbortController(jobId, controller);
        try {
          await processPages(jobId, job.scriptType, pagesToProcess, {
            setJobCompletedAtEnd: false,
            logLabel: "RetryFailed",
            signal: controller.signal,
            userId,
            translationLanguage: job.translationLanguage,
          });
        } finally {
          unregisterAbortController(jobId, controller);
        }
      })();

      res.json({ message: "Erneute Transkription gestartet", pageCount: failedPages.length });
    } catch (error: any) {
      if (error instanceof UserNotInDatabaseError) {
        return respondUserNotInDatabase(res);
      }
      console.error("Error retrying failed pages:", error);
      res.status(400).json({ message: error.message || "Fehler" });
    }
  });

  app.post("/api/jobs/:id/cancel", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.uid;
      const jobId = parseInt(req.params.id);
      const job = await storage.getTranscriptionJob(jobId);

      if (!job || job.userId !== userId) {
        return res.status(404).json({ message: "Job nicht gefunden" });
      }
      if (job.status !== "processing") {
        return res.status(400).json({ message: "Der Job wird nicht mehr verarbeitet." });
      }

      await storage.updateTranscriptionJobStatus(jobId, "cancelled");

      abortJob(jobId);

      const pages = await storage.getTranscriptionPages(jobId);
      const pendingPages = pages.filter((p) => p.status === "pending");
      const refundCount = pendingPages.length;

      for (const page of pages) {
        if (page.status === "pending" || page.status === "processing") {
          await storage.updateTranscriptionPage(page.id, { status: "cancelled" });
        }
      }

      if (refundCount > 0) {
        await storage.addCredits(userId, refundCount);
        console.log(`[Cancel] Job ${jobId} cancelled, ${refundCount} credits refunded to user ${userId}`);
      }

      res.json({ refundedCredits: refundCount });
    } catch (error: any) {
      console.error("Error cancelling job:", error);
      res.status(500).json({ message: error.message || "Fehler" });
    }
  });

  app.patch("/api/jobs/:id/pages/:pageId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.uid;
      const jobId = parseInt(req.params.id);
      const pageId = parseInt(req.params.pageId);
      const body = req.body || {};
      const version = body.version as string;
      const text = body.text as string | null | undefined;

      if (Number.isNaN(jobId) || Number.isNaN(pageId)) {
        return res.status(400).json({ message: "Ungültige Job- oder Seiten-ID" });
      }
      if (!["original", "completed", "interpreted"].includes(version)) {
        return res.status(400).json({ message: "Ungültige version. Erlaubt: original, completed, interpreted" });
      }

      const job = await storage.getTranscriptionJob(jobId);
      const expertCanAccess = job ? await canCurrentExpertAccessJob(req, jobId) : false;
      if (!job || (job.userId !== userId && !expertCanAccess)) {
        return res.status(404).json({ message: "Job nicht gefunden" });
      }

      const page = await storage.getTranscriptionPage(pageId);
      if (!page || page.jobId !== jobId) {
        return res.status(404).json({ message: "Seite nicht gefunden" });
      }

      const updatePayload: Record<string, string | null> = {};
      if (version === "original") updatePayload.transcriptionEdited = text ?? null;
      else if (version === "completed") updatePayload.transcriptionCompletedEdited = text ?? null;
      else updatePayload.transcriptionInterpretedEdited = text ?? null;

      const updated = await storage.updateTranscriptionPage(pageId, updatePayload as any);
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating transcription page:", error);
      res.status(500).json({ message: error.message || "Fehler" });
    }
  });

  app.get("/api/jobs/:id/result", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.uid;
      const jobId = parseInt(req.params.id);
      const job = await storage.getTranscriptionJob(jobId);
      const isAdminUser = await checkIsAdmin(req);
      const expertCanAccess = job ? await canCurrentExpertAccessJob(req, jobId) : false;
      if (!job || (job.userId !== userId && !isAdminUser && !expertCanAccess)) {
        return res.status(404).json({ message: "Job nicht gefunden" });
      }

      const pages = await storage.getTranscriptionPages(jobId);
      const completedExpertRequest = await storage.getCompletedHumanTranscriptionRequestForJob(
        jobId,
        job.userId
      );
      const expertResults = completedExpertRequest
        ? await storage.getHumanTranscriptionResultsByRequest(completedExpertRequest.id)
        : [];

      const progress = {
        completed: pages.filter(p => p.status === "completed").length,
        processing: pages.filter(p => p.status === "processing").length,
        failed: pages.filter(p => p.status === "failed").length,
        pending: pages.filter(p => p.status === "pending").length,
        total: pages.length,
      };

      res.json({
        job,
        pages,
        progress,
        expertResult: completedExpertRequest && expertResults.length > 0
          ? {
              request: completedExpertRequest,
              results: expertResults,
            }
          : null,
      });
    } catch (error) {
      console.error("Error getting result:", error);
      res.status(500).json({ message: "Failed to get result" });
    }
  });

  app.get("/api/jobs/:id/export", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.uid;
      const jobId = parseInt(req.params.id);
      const version = (req.query.version as string) || "original";
      const lang = (req.query.lang as string) || "de";
      const job = await storage.getTranscriptionJob(jobId);
      const isAdminUser = await checkIsAdmin(req);
      const expertCanAccess = job ? await canCurrentExpertAccessJob(req, jobId) : false;
      if (!job || (job.userId !== userId && !isAdminUser && !expertCanAccess)) {
        return res.status(404).json({ message: "Job nicht gefunden" });
      }

      const completedExpertRequest = await storage.getCompletedHumanTranscriptionRequestForJob(
        jobId,
        job.userId
      );
      if (completedExpertRequest) {
        const expertResults = await storage.getHumanTranscriptionResultsByRequest(completedExpertRequest.id);
        if (expertResults.length > 0) {
          const textContent = expertResults
            .map((p) => `--- Seite ${p.pageNumber} ---\n\n${p.text}`)
            .join("\n\n\n");
          const suffix = completedExpertRequest.serviceLevel === "ki_geprueft"
            ? "-ki-geprueft"
            : "-expertentranskription";
          res.setHeader("Content-Type", "text/plain; charset=utf-8");
          res.setHeader(
            "Content-Disposition",
            `attachment; filename="mormorsbreve-${jobId}${suffix}.txt"`
          );
          return res.send(textContent);
        }
      }

      const pages = await storage.getTranscriptionPages(jobId);
      const useCompleted = version === "completed";
      const useInterpreted = version === "interpreted";
      const useTranslation = lang === "translation" && !!job.translationLanguage;
      const textContent = pages
        .filter((p) => p.transcription)
        .map((p) => {
          let text: string;
          if (useTranslation) {
            if (useInterpreted) {
              text = (p.translationInterpreted ?? p.translationCompleted ?? p.translation ?? p.transcription) ?? "";
            } else if (useCompleted) {
              text = (p.translationCompleted ?? p.translation ?? p.transcription) ?? "";
            } else {
              text = (p.translation ?? p.transcription) ?? "";
            }
          } else if (useInterpreted) {
            text = (p.transcriptionInterpretedEdited ?? p.transcriptionInterpreted ?? p.transcriptionCompleted ?? p.transcription) ?? "";
          } else if (useCompleted) {
            text = (p.transcriptionCompletedEdited ?? p.transcriptionCompleted ?? p.transcription) ?? "";
          } else {
            text = (p.transcriptionEdited ?? p.transcription) ?? "";
          }
          return `--- Seite ${p.pageNumber} ---\n\n${text}`;
        })
        .join("\n\n\n");

      const langSuffix = useTranslation ? `-${job.translationLanguage}` : "";
      const suffix = useInterpreted ? "-interpretiert" : useCompleted ? "-ergaenzt" : "";
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="mormorsbreve-${jobId}${suffix}${langSuffix}.txt"`
      );
      res.send(textContent);
    } catch (error) {
      console.error("Error exporting:", error);
      res.status(500).json({ message: "Export fehlgeschlagen" });
    }
  });

  async function buildPdfBytes(req: any, res: any, jobId: number) {
    const userId = req.user.uid;
    const job = await storage.getTranscriptionJob(jobId);
    const isAdminUser = await checkIsAdmin(req);
    const expertCanAccess = job ? await canCurrentExpertAccessJob(req, jobId) : false;
    if (!job || (job.userId !== userId && !isAdminUser && !expertCanAccess)) {
      res.status(404).json({ message: "Job nicht gefunden" });
      return null;
    }

    const body = req.body || {};
    const version = body.version || req.query.version || "original";
    const lang = body.lang || req.query.lang || "de";
    const useCompleted = version === "completed";
    const useInterpreted = version === "interpreted";
    const useTranslation = lang === "translation" && !!job.translationLanguage;

    const completedExpertRequest = await storage.getCompletedHumanTranscriptionRequestForJob(
      jobId,
      job.userId
    );
    if (completedExpertRequest) {
      const expertResults = await storage.getHumanTranscriptionResultsByRequest(completedExpertRequest.id);
      if (expertResults.length > 0) {
        const createdAt = job.createdAt
          ? (typeof job.createdAt === "string" ? job.createdAt : job.createdAt.toISOString())
          : new Date().toISOString();
        const pdfBytes = await generateTranscriptionPdf({
          jobId,
          scriptType: getScriptTypeDisplayLabel(job.scriptType),
          version: completedExpertRequest.serviceLevel === "ki_geprueft" ? "completed" : "interpreted",
          pages: expertResults.map((p) => ({ pageNumber: p.pageNumber, text: p.text })),
          createdAt,
          coverPage: body.coverPage || undefined,
          continuousFlow: body.continuousFlow ?? false,
          justified: body.justified ?? false,
          mergeLines: body.mergeLines ?? false,
          showPageLabels: body.showPageLabels ?? true,
          fontSize: body.fontSize ? Number(body.fontSize) : undefined,
        });
        return {
          pdfBytes,
          useCompleted: completedExpertRequest.serviceLevel === "ki_geprueft",
          useInterpreted: completedExpertRequest.serviceLevel !== "ki_geprueft",
          useTranslation: false,
          translationLanguage: null,
        };
      }
    }

    const pages = await storage.getTranscriptionPages(jobId);
    const exportPages = pages
      .filter((p) => p.transcription && p.status === "completed")
      .map((p) => {
        let text: string;
        if (useTranslation) {
          if (useInterpreted) {
            text = (p.translationInterpreted ?? p.translationCompleted ?? p.translation ?? p.transcription) ?? "";
          } else if (useCompleted) {
            text = (p.translationCompleted ?? p.translation ?? p.transcription) ?? "";
          } else {
            text = (p.translation ?? p.transcription) ?? "";
          }
        } else if (useInterpreted) {
          text = (p.transcriptionInterpretedEdited ?? p.transcriptionInterpreted ?? p.transcriptionCompleted ?? p.transcription) ?? "";
        } else if (useCompleted) {
          text = (p.transcriptionCompletedEdited ?? p.transcriptionCompleted ?? p.transcription) ?? "";
        } else {
          text = (p.transcriptionEdited ?? p.transcription) ?? "";
        }
        return { pageNumber: p.pageNumber, text };
      });

    if (exportPages.length === 0) {
      res.status(400).json({ message: "Keine transkribierten Seiten vorhanden." });
      return null;
    }

    const createdAt = job.createdAt
      ? (typeof job.createdAt === "string" ? job.createdAt : job.createdAt.toISOString())
      : new Date().toISOString();

    const coverPage = body.coverPage || undefined;
    const continuousFlow = body.continuousFlow ?? false;
    const justified = body.justified ?? false;
    const mergeLines = body.mergeLines ?? false;
    const showPageLabels = body.showPageLabels ?? true;
    const fontSize = body.fontSize ? Number(body.fontSize) : undefined;

    const pdfBytes = await generateTranscriptionPdf({
      jobId,
      scriptType: getScriptTypeDisplayLabel(job.scriptType),
      version: useInterpreted ? "interpreted" : useCompleted ? "completed" : "original",
      pages: exportPages,
      createdAt,
      coverPage,
      continuousFlow,
      justified,
      mergeLines,
      showPageLabels,
      fontSize,
    });

    return { pdfBytes, useCompleted, useInterpreted, useTranslation, translationLanguage: job.translationLanguage };
  }

  app.get("/api/jobs/:id/export-pdf", isAuthenticated, async (req: any, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const result = await buildPdfBytes(req, res, jobId);
      if (!result) return;

      const suffix = result.useInterpreted ? "-interpretiert" : result.useCompleted ? "-ergaenzt" : "";
      const langSuffix = result.useTranslation && result.translationLanguage ? `-${result.translationLanguage}` : "";
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="mormorsbreve-${jobId}${suffix}${langSuffix}.pdf"`,
      );
      res.send(Buffer.from(result.pdfBytes));
    } catch (error) {
      console.error("Error exporting PDF:", error);
      res.status(500).json({ message: "PDF-Export fehlgeschlagen" });
    }
  });

  app.post("/api/jobs/:id/export-pdf", isAuthenticated, async (req: any, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const result = await buildPdfBytes(req, res, jobId);
      if (!result) return;

      const suffix = result.useInterpreted ? "-interpretiert" : result.useCompleted ? "-ergaenzt" : "";
      const langSuffix = result.useTranslation && result.translationLanguage ? `-${result.translationLanguage}` : "";
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="mormorsbreve-${jobId}${suffix}${langSuffix}.pdf"`,
      );
      res.send(Buffer.from(result.pdfBytes));
    } catch (error) {
      console.error("Error exporting PDF:", error);
      res.status(500).json({ message: "PDF-Export fehlgeschlagen" });
    }
  });

  // ─── Combined PDF export (multiple jobs) ────────────────────────────────────

  async function buildCombinedPdfBytes(req: any, res: any) {
    const userId = req.user.uid;
    const body = req.body || {};

    const version = body.version || "original";
    const lang = body.lang || "de";
    const useCompleted = version === "completed";
    const useInterpreted = version === "interpreted";

    let allExportPages: { pageNumber: number; text: string }[];
    let firstTranslationLang: string | null = null;

    if (body.rawText && typeof body.rawText === "string") {
      allExportPages = [{ pageNumber: 1, text: body.rawText }];
    } else {
      const jobIds: number[] = body.jobIds;

      if (!Array.isArray(jobIds) || jobIds.length === 0) {
        res.status(400).json({ message: "Keine Jobs angegeben." });
        return null;
      }
      if (jobIds.length > 100) {
        res.status(400).json({ message: "Maximal 100 Dokumente gleichzeitig." });
        return null;
      }

      allExportPages = [];
      let globalPageNum = 0;
      const isAdminUser = await checkIsAdmin(req);

      for (const jid of jobIds) {
        const job = await storage.getTranscriptionJob(jid);
        if (!job || (job.userId !== userId && !isAdminUser)) {
          res.status(404).json({ message: `Job #${jid} nicht gefunden.` });
          return null;
        }

        const useTranslation = lang === "translation" && !!job.translationLanguage;
        if (useTranslation && !firstTranslationLang) {
          firstTranslationLang = job.translationLanguage;
        }

        const pages = await storage.getTranscriptionPages(jid);
        const completed = pages
          .filter((p) => p.transcription && p.status === "completed")
          .map((p) => {
            let text: string;
            if (useTranslation) {
              if (useInterpreted) {
                text = (p.translationInterpreted ?? p.translationCompleted ?? p.translation ?? p.transcription) ?? "";
              } else if (useCompleted) {
                text = (p.translationCompleted ?? p.translation ?? p.transcription) ?? "";
              } else {
                text = (p.translation ?? p.transcription) ?? "";
              }
            } else if (useInterpreted) {
              text = (p.transcriptionInterpretedEdited ?? p.transcriptionInterpreted ?? p.transcriptionCompleted ?? p.transcription) ?? "";
            } else if (useCompleted) {
              text = (p.transcriptionCompletedEdited ?? p.transcriptionCompleted ?? p.transcription) ?? "";
            } else {
              text = (p.transcriptionEdited ?? p.transcription) ?? "";
            }
            globalPageNum++;
            return { pageNumber: globalPageNum, text };
          });

        allExportPages.push(...completed);
      }
    }

    if (allExportPages.length === 0) {
      res.status(400).json({ message: "Keine transkribierten Seiten vorhanden." });
      return null;
    }

    const coverPage = body.coverPage || undefined;
    const continuousFlow = body.continuousFlow ?? false;
    const justified = body.justified ?? false;
    const mergeLines = body.mergeLines ?? false;
    const showPageLabels = body.showPageLabels ?? true;
    const fontSize = body.fontSize ? Number(body.fontSize) : undefined;

    const pdfBytes = await generateTranscriptionPdf({
      title: coverPage?.title || "Sammeltranskription",
      scriptType: "Gemischt",
      version: useInterpreted ? "interpreted" : useCompleted ? "completed" : "original",
      pages: allExportPages,
      createdAt: new Date().toISOString(),
      coverPage,
      continuousFlow,
      justified,
      mergeLines,
      showPageLabels,
      fontSize,
    });

    const suffix = useInterpreted ? "-interpretiert" : useCompleted ? "-ergaenzt" : "";
    const langSuffix = firstTranslationLang && lang === "translation" ? `-${firstTranslationLang}` : "";
    return { pdfBytes, suffix, langSuffix };
  }

  app.post("/api/export-combined-pdf", isAuthenticated, async (req: any, res) => {
    try {
      const result = await buildCombinedPdfBytes(req, res);
      if (!result) return;

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="mormorsbreve-sammel${result.suffix}${result.langSuffix}.pdf"`,
      );
      res.send(Buffer.from(result.pdfBytes));
    } catch (error) {
      console.error("Error exporting combined PDF:", error);
      res.status(500).json({ message: "PDF-Export fehlgeschlagen" });
    }
  });

  app.post("/api/preview-combined-pdf", isAuthenticated, async (req: any, res) => {
    try {
      const result = await buildCombinedPdfBytes(req, res);
      if (!result) return;

      res.setHeader("Content-Type", "application/pdf");
      res.send(Buffer.from(result.pdfBytes));
    } catch (error) {
      console.error("Error previewing combined PDF:", error);
      res.status(500).json({ message: "PDF-Vorschau fehlgeschlagen" });
    }
  });

  // ─── TTS (Vorlesen) ─────────────────────────────────────────────────────────
  function getTtsTextPerPage(
    pages: Array<{
      pageNumber: number;
      transcription: string | null;
      transcriptionCompleted: string | null;
      transcriptionInterpreted: string | null;
      transcriptionEdited: string | null;
      transcriptionCompletedEdited: string | null;
      transcriptionInterpretedEdited: string | null;
      translation: string | null;
      translationCompleted: string | null;
      translationInterpreted: string | null;
    }>,
    version: string,
    useTranslation: boolean
  ): { pageNumber: number; text: string }[] {
    const useCompleted = version === "completed";
    const useInterpreted = version === "interpreted";
    return pages
      .filter((p) => p.transcription)
      .map((p) => {
        let text: string;
        if (useTranslation) {
          if (useInterpreted) {
            text = (p.translationInterpreted ?? p.translationCompleted ?? p.translation ?? p.transcription) ?? "";
          } else if (useCompleted) {
            text = (p.translationCompleted ?? p.translation ?? p.transcription) ?? "";
          } else {
            text = (p.translation ?? p.transcription) ?? "";
          }
        } else if (useInterpreted) {
          text = (p.transcriptionInterpretedEdited ?? p.transcriptionInterpreted ?? p.transcriptionCompleted ?? p.transcription) ?? "";
        } else if (useCompleted) {
          text = (p.transcriptionCompletedEdited ?? p.transcriptionCompleted ?? p.transcription) ?? "";
        } else {
          text = (p.transcriptionEdited ?? p.transcription) ?? "";
        }
        return { pageNumber: p.pageNumber, text };
      })
      .filter((x) => x.text.trim().length > 0);
  }

  app.get("/api/jobs/:id/tts-cost", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.uid;
      const jobId = parseInt(req.params.id);
      const version = (req.query.version as string) || "original";
      const lang = (req.query.lang as string) || "de";
      const pagesParam = req.query.pages as string; // "all" or "1,2,3"
      const job = await storage.getTranscriptionJob(jobId);
      const isAdminUser = await checkIsAdmin(req);
      if (!job || (job.userId !== userId && !isAdminUser)) {
        return res.status(404).json({ message: "Job nicht gefunden" });
      }
      const useTranslation = lang === "translation" && !!job.translationLanguage;
      const pages = await storage.getTranscriptionPages(jobId);
      const withText = getTtsTextPerPage(pages, version, useTranslation);
      let selected = withText;
      if (pagesParam && pagesParam !== "all") {
        const pageNumbers = pagesParam.split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => !Number.isNaN(n));
        if (pageNumbers.length > 0) {
          selected = withText.filter((x) => pageNumbers.includes(x.pageNumber));
        }
      }
      const totalCharacters = selected.reduce((sum, p) => sum + p.text.length, 0);
      const creditsRequired = totalCharacters === 0 ? 0 : calculateTtsCredits(selected.map((p) => p.text).join(""));
      const credits = await storage.ensureUserCredits(userId);
      const pageDetails = selected.map((p) => ({
        page: p.pageNumber,
        characters: p.text.length,
        credits: calculateTtsCredits(p.text),
      }));
      res.json({
        totalCharacters,
        creditsRequired,
        currentCredits: credits.credits,
        pages: pageDetails,
      });
    } catch (error) {
      if (error instanceof UserNotInDatabaseError) {
        return respondUserNotInDatabase(res);
      }
      console.error("Error getting TTS cost:", error);
      res.status(500).json({ message: "Kostenberechnung fehlgeschlagen" });
    }
  });

  app.get("/api/jobs/:id/tts-history", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.uid;
      const jobId = parseInt(req.params.id);
      const job = await storage.getTranscriptionJob(jobId);
      const isAdminUser = await checkIsAdmin(req);
      if (!job || (job.userId !== userId && !isAdminUser)) {
        return res.status(404).json({ message: "Job nicht gefunden" });
      }
      const generations = await db
        .select({
          id: ttsGenerations.id,
          jobId: ttsGenerations.jobId,
          version: ttsGenerations.version,
          lang: ttsGenerations.lang,
          voice: ttsGenerations.voice,
          style: ttsGenerations.style,
          pages: ttsGenerations.pages,
          status: ttsGenerations.status,
          failReason: ttsGenerations.failReason,
          audioUrl: ttsGenerations.audioUrl,
          audioMimeType: ttsGenerations.audioMimeType,
          creditsUsed: ttsGenerations.creditsUsed,
          createdAt: ttsGenerations.createdAt,
        })
        .from(ttsGenerations)
        .where(eq(ttsGenerations.jobId, jobId))
        .orderBy(desc(ttsGenerations.createdAt));
      res.json({ generations });
    } catch (error: any) {
      console.error("Error getting TTS history:", error);
      res.status(500).json({ message: "TTS-Verlauf konnte nicht geladen werden." });
    }
  });

  function ttsParamsMatch(
    gen: { version: string; lang: string; voice: string; style: string | null; pages: unknown },
    params: { version: string; lang: string; voice: string; style: string | null; pages: unknown },
  ): boolean {
    if (gen.version !== params.version || gen.lang !== params.lang || gen.voice !== params.voice) return false;
    if ((gen.style || "") !== (params.style || "")) return false;
    const a = JSON.stringify(gen.pages);
    const b = JSON.stringify(params.pages);
    return a === b;
  }

  app.post("/api/jobs/:id/tts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.uid;
      const jobId = parseInt(req.params.id);
      const body = req.body || {};
      const version = (body.version as string) || "original";
      const lang = (body.lang as string) || "de";
      const voice = (body.voice as string) || "Kore";
      const style: string | null = (body.style as string) || null;
      const pagesParam = body.pages; // number[] or "all"
      const job = await storage.getTranscriptionJob(jobId);
      const isAdminUser = await checkIsAdmin(req);
      if (!job || (job.userId !== userId && !isAdminUser)) {
        return res.status(404).json({ message: "Job nicht gefunden" });
      }

      const existing = await db
        .select()
        .from(ttsGenerations)
        .where(eq(ttsGenerations.jobId, jobId));
      const matchParams = { version, lang, voice, style, pages: pagesParam };

      const inProgress = existing.find((g) => g.status === "generating" && ttsParamsMatch(g, matchParams));
      if (inProgress) {
        return res.json({ generationId: inProgress.id, status: "generating", creditsUsed: 0 });
      }

      const alreadyDone = existing.find((g) => g.status === "completed" && ttsParamsMatch(g, matchParams));
      if (alreadyDone) {
        return res.json({ generationId: alreadyDone.id, status: "completed", audioUrl: alreadyDone.audioUrl, creditsUsed: 0 });
      }

      const useTranslation = lang === "translation" && !!job.translationLanguage;
      const ttsLangCode = useTranslation && job.translationLanguage
        ? (ttsLanguageMap[job.translationLanguage]?.bcp47 ?? undefined)
        : undefined;
      const pages = await storage.getTranscriptionPages(jobId);
      const withText = getTtsTextPerPage(pages, version, useTranslation);
      let selected = withText;
      if (Array.isArray(pagesParam) && pagesParam.length > 0) {
        const pageNumbers = pagesParam.map((n: unknown) => (typeof n === "number" ? n : parseInt(String(n), 10))).filter((n: number) => !Number.isNaN(n));
        if (pageNumbers.length > 0) {
          selected = withText.filter((x) => pageNumbers.includes(x.pageNumber));
        }
      }
      const fullText = selected.map((p) => p.text).join("\n\n");
      if (!fullText.trim()) {
        return res.status(400).json({ message: "Kein Text zum Vorlesen vorhanden." });
      }
      const creditsNeeded = calculateTtsCredits(fullText);
      const userCredits = await storage.ensureUserCredits(userId);
      if (userCredits.credits < creditsNeeded) {
        return res.status(402).json({
          message: `Nicht genügend Credits für Vorlesen. Sie benötigen ${creditsNeeded} ${creditsNeeded === 1 ? "Credit" : "Credits"}, haben aber nur ${userCredits.credits}.`,
          creditsRequired: creditsNeeded,
          currentCredits: userCredits.credits,
        });
      }
      await storage.deductCredits(userId, creditsNeeded);

      const [genRow] = await db.insert(ttsGenerations).values({
        jobId,
        version,
        lang,
        voice,
        style,
        pages: pagesParam,
        status: "generating",
        creditsUsed: creditsNeeded,
      }).returning();

      res.json({ generationId: genRow.id, status: "generating", creditsUsed: creditsNeeded });

      (async () => {
        try {
          const { audioBuffer, mimeType } = await generateSpeech({ text: fullText, voice, style: style || undefined, languageCode: ttsLangCode });
          const ext = mimeType === "audio/mpeg" ? "mp3" : "wav";
          const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
          const filename = `tts-${jobId}-${uniqueId}.${ext}`;
          const filePath = path.join(uploadDir, filename);
          fs.writeFileSync(filePath, audioBuffer);
          const audioUrl = `/uploads/${filename}`;
          await db.update(ttsGenerations)
            .set({ status: "completed", audioUrl, audioData: audioBuffer.toString("base64"), audioMimeType: mimeType })
            .where(eq(ttsGenerations.id, genRow.id));
          console.log(`[TTS] Generation ${genRow.id} for job ${jobId} completed → ${audioUrl}`);
        } catch (ttsError: any) {
          const isUnavailable = ttsError instanceof TtsServiceUnavailableError;
          if (isUnavailable) {
            console.warn(`[TTS] Generation ${genRow.id} für Job ${jobId}: Service nicht verfügbar (${ttsError.reason}). ${creditsNeeded} Credits werden erstattet.`);
          } else {
            console.error(`[TTS] Generation ${genRow.id} für Job ${jobId} fehlgeschlagen, ${creditsNeeded} Credits werden erstattet:`, ttsError?.message || ttsError);
          }
          try {
            const reason = isUnavailable
              ? ttsError.reason
              : (ttsError?.message || "Unbekannter Fehler bei der Audio-Erzeugung");
            await db.update(ttsGenerations)
              .set({ status: "failed", failReason: reason })
              .where(eq(ttsGenerations.id, genRow.id));
            await storage.addCredits(userId, creditsNeeded);
          } catch (refundErr) {
            console.error(`[TTS] Fehler beim Erstatten/Update von Generation ${genRow.id}:`, refundErr);
          }
        }
      })();
    } catch (error: any) {
      if (error instanceof UserNotInDatabaseError) {
        return respondUserNotInDatabase(res);
      }
      console.error("Error generating TTS:", error);
      res.status(500).json({ message: error.message || "Vorlesen fehlgeschlagen" });
    }
  });

  // ─── Audio overview: all TTS generations for the current user ─────────────
  app.get("/api/audio", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.uid;
      const generations = await db
        .select({
          id: ttsGenerations.id,
          jobId: ttsGenerations.jobId,
          version: ttsGenerations.version,
          lang: ttsGenerations.lang,
          voice: ttsGenerations.voice,
          style: ttsGenerations.style,
          pages: ttsGenerations.pages,
          status: ttsGenerations.status,
          audioUrl: ttsGenerations.audioUrl,
          audioMimeType: ttsGenerations.audioMimeType,
          creditsUsed: ttsGenerations.creditsUsed,
          createdAt: ttsGenerations.createdAt,
        })
        .from(ttsGenerations)
        .innerJoin(transcriptionJobs, eq(ttsGenerations.jobId, transcriptionJobs.id))
        .where(and(
          eq(transcriptionJobs.userId, userId),
          eq(ttsGenerations.status, "completed"),
        ))
        .orderBy(desc(ttsGenerations.createdAt));

      const jobIds = [...new Set(generations.map((g) => g.jobId))];
      const snippetMap = new Map<number, string>();
      if (jobIds.length > 0) {
        const pages = await db
          .select({
            jobId: transcriptionPages.jobId,
            pageNumber: transcriptionPages.pageNumber,
            transcription: transcriptionPages.transcription,
            transcriptionCompleted: transcriptionPages.transcriptionCompleted,
          })
          .from(transcriptionPages)
          .where(inArray(transcriptionPages.jobId, jobIds))
          .orderBy(transcriptionPages.jobId, transcriptionPages.pageNumber);
        for (const page of pages) {
          if (!snippetMap.has(page.jobId)) {
            const text = page.transcriptionCompleted || page.transcription || "";
            if (text) snippetMap.set(page.jobId, text.slice(0, 120));
          }
        }
      }

      const result = generations.map((g) => ({
        ...g,
        textSnippet: snippetMap.get(g.jobId) ?? null,
      }));
      res.json({ generations: result });
    } catch (error: any) {
      console.error("Error getting audio list:", error);
      res.status(500).json({ message: "Audio-Liste konnte nicht geladen werden." });
    }
  });

  app.delete("/api/audio/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.uid;
      const genId = parseInt(req.params.id);
      if (isNaN(genId)) return res.status(400).json({ message: "Ungültige ID" });

      const [gen] = await db
        .select({
          id: ttsGenerations.id,
          audioUrl: ttsGenerations.audioUrl,
          jobId: ttsGenerations.jobId,
        })
        .from(ttsGenerations)
        .innerJoin(transcriptionJobs, eq(ttsGenerations.jobId, transcriptionJobs.id))
        .where(and(eq(ttsGenerations.id, genId), eq(transcriptionJobs.userId, userId)));

      if (!gen) return res.status(404).json({ message: "Audio nicht gefunden" });

      if (gen.audioUrl) {
        const filename = gen.audioUrl.replace(/^\/uploads\//, "");
        const filePath = path.join(uploadDir, filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      await db.delete(ttsGenerations).where(eq(ttsGenerations.id, genId));
      res.json({ message: "Audio gelöscht" });
    } catch (error: any) {
      console.error("Error deleting audio:", error);
      res.status(500).json({ message: "Audio konnte nicht gelöscht werden." });
    }
  });

  // ─── Playlists ──────────────────────────────────────────────────────────────

  app.get("/api/playlists", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.uid;
      const rows = await db
        .select()
        .from(playlists)
        .where(eq(playlists.userId, userId))
        .orderBy(desc(playlists.updatedAt));

      const playlistIds = rows.map((p) => p.id);
      let itemsByPlaylist = new Map<number, number>();
      if (playlistIds.length > 0) {
        const counts = await db
          .select({ playlistId: playlistItems.playlistId, count: count() })
          .from(playlistItems)
          .where(inArray(playlistItems.playlistId, playlistIds))
          .groupBy(playlistItems.playlistId);
        for (const c of counts) itemsByPlaylist.set(c.playlistId, c.count);
      }

      res.json(rows.map((p) => ({ ...p, itemCount: itemsByPlaylist.get(p.id) ?? 0 })));
    } catch (error: any) {
      console.error("Error getting playlists:", error);
      res.status(500).json({ message: "Playlists konnten nicht geladen werden." });
    }
  });

  app.post("/api/playlists", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.uid;
      const name = String(req.body.name || "").trim() || "Neue Playlist";
      const ttsIds: number[] = Array.isArray(req.body.ttsIds) ? req.body.ttsIds : [];

      const [playlist] = await db.insert(playlists).values({ userId, name }).returning();

      if (ttsIds.length > 0) {
        const validGens = await db
          .select({ id: ttsGenerations.id })
          .from(ttsGenerations)
          .innerJoin(transcriptionJobs, eq(ttsGenerations.jobId, transcriptionJobs.id))
          .where(and(
            inArray(ttsGenerations.id, ttsIds),
            eq(transcriptionJobs.userId, userId),
            eq(ttsGenerations.status, "completed"),
          ));
        const validIds = new Set(validGens.map((g) => g.id));
        const items = ttsIds
          .filter((id) => validIds.has(id))
          .map((id, idx) => ({ playlistId: playlist.id, ttsGenerationId: id, sortOrder: idx }));
        if (items.length > 0) {
          await db.insert(playlistItems).values(items);
        }
      }

      res.status(201).json(playlist);
    } catch (error: any) {
      console.error("Error creating playlist:", error);
      res.status(500).json({ message: "Playlist konnte nicht erstellt werden." });
    }
  });

  app.get("/api/playlists/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.uid;
      const playlistId = parseInt(req.params.id);
      if (isNaN(playlistId)) return res.status(400).json({ message: "Ungültige ID" });

      const [playlist] = await db.select().from(playlists).where(and(eq(playlists.id, playlistId), eq(playlists.userId, userId)));
      if (!playlist) return res.status(404).json({ message: "Playlist nicht gefunden" });

      const items = await db
        .select({
          id: playlistItems.id,
          ttsGenerationId: playlistItems.ttsGenerationId,
          sortOrder: playlistItems.sortOrder,
          voice: ttsGenerations.voice,
          style: ttsGenerations.style,
          lang: ttsGenerations.lang,
          version: ttsGenerations.version,
          pages: ttsGenerations.pages,
          audioUrl: ttsGenerations.audioUrl,
          audioMimeType: ttsGenerations.audioMimeType,
          jobId: ttsGenerations.jobId,
          createdAt: ttsGenerations.createdAt,
        })
        .from(playlistItems)
        .innerJoin(ttsGenerations, eq(playlistItems.ttsGenerationId, ttsGenerations.id))
        .where(eq(playlistItems.playlistId, playlistId))
        .orderBy(playlistItems.sortOrder);

      const jobIds = [...new Set(items.map((i) => i.jobId))];
      const snippetMap = new Map<number, string>();
      if (jobIds.length > 0) {
        const pages = await db
          .select({ jobId: transcriptionPages.jobId, transcription: transcriptionPages.transcription, transcriptionCompleted: transcriptionPages.transcriptionCompleted })
          .from(transcriptionPages)
          .where(inArray(transcriptionPages.jobId, jobIds))
          .orderBy(transcriptionPages.jobId, transcriptionPages.pageNumber);
        for (const p of pages) {
          if (!snippetMap.has(p.jobId)) {
            const text = p.transcriptionCompleted || p.transcription || "";
            if (text) snippetMap.set(p.jobId, text.slice(0, 120));
          }
        }
      }

      res.json({
        ...playlist,
        items: items.map((i) => ({ ...i, textSnippet: snippetMap.get(i.jobId) ?? null })),
      });
    } catch (error: any) {
      console.error("Error getting playlist:", error);
      res.status(500).json({ message: "Playlist konnte nicht geladen werden." });
    }
  });

  app.patch("/api/playlists/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.uid;
      const playlistId = parseInt(req.params.id);
      if (isNaN(playlistId)) return res.status(400).json({ message: "Ungültige ID" });

      const [existing] = await db.select().from(playlists).where(and(eq(playlists.id, playlistId), eq(playlists.userId, userId)));
      if (!existing) return res.status(404).json({ message: "Playlist nicht gefunden" });

      const updates: any = { updatedAt: new Date() };
      if (req.body.name !== undefined) updates.name = String(req.body.name).slice(0, 200);
      if (req.body.lastPosition !== undefined) updates.lastPosition = req.body.lastPosition;
      if (req.body.items !== undefined && Array.isArray(req.body.items)) {
        await db.delete(playlistItems).where(eq(playlistItems.playlistId, playlistId));
        const newItems = (req.body.items as number[]).map((ttsId, idx) => ({
          playlistId,
          ttsGenerationId: ttsId,
          sortOrder: idx,
        }));
        if (newItems.length > 0) {
          await db.insert(playlistItems).values(newItems);
        }
      }

      const [updated] = await db.update(playlists).set(updates).where(eq(playlists.id, playlistId)).returning();
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating playlist:", error);
      res.status(500).json({ message: "Playlist konnte nicht aktualisiert werden." });
    }
  });

  app.delete("/api/playlists/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.uid;
      const playlistId = parseInt(req.params.id);
      if (isNaN(playlistId)) return res.status(400).json({ message: "Ungültige ID" });

      const [existing] = await db.select().from(playlists).where(and(eq(playlists.id, playlistId), eq(playlists.userId, userId)));
      if (!existing) return res.status(404).json({ message: "Playlist nicht gefunden" });

      await db.delete(playlists).where(eq(playlists.id, playlistId));
      res.json({ message: "Playlist gelöscht" });
    } catch (error: any) {
      console.error("Error deleting playlist:", error);
      res.status(500).json({ message: "Playlist konnte nicht gelöscht werden." });
    }
  });

  app.get("/api/jobs/:id/tts/:filename", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.uid;
      const jobId = parseInt(req.params.id);
      const filename = req.params.filename;
      if (!filename || !filename.startsWith(`tts-${jobId}-`) || filename.includes("..")) {
        return res.status(400).json({ message: "Ungültiger Dateiname" });
      }
      const job = await storage.getTranscriptionJob(jobId);
      const isAdminUser = await checkIsAdmin(req);
      if (!job || (job.userId !== userId && !isAdminUser)) {
        return res.status(404).json({ message: "Job nicht gefunden" });
      }
      const filePath = path.join(uploadDir, filename);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "Audio-Datei nicht gefunden" });
      }
      const ext = path.extname(filename).toLowerCase();
      const contentType = ext === ".mp3" ? "audio/mpeg" : "audio/wav";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.send(fs.readFileSync(filePath));
    } catch (error) {
      console.error("Error serving TTS file:", error);
      res.status(500).json({ message: "Datei konnte nicht ausgeliefert werden" });
    }
  });

  app.post("/api/jobs/:id/preview-pdf", isAuthenticated, async (req: any, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const result = await buildPdfBytes(req, res, jobId);
      if (!result) return;

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "inline");
      res.send(Buffer.from(result.pdfBytes));
    } catch (error) {
      console.error("Error previewing PDF:", error);
      res.status(500).json({ message: "PDF-Vorschau fehlgeschlagen" });
    }
  });

  // ─── Human Transcription Requests (Kunde) ───────────────────────────────────
  app.post("/api/human-transcription/request", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.uid;
      const { jobId, urgency, accuracyLevel, budgetRange, customerNotes, serviceLevel: serviceLevelBody } = req.body;

      const jobIdNum = parseInt(jobId);
      if (Number.isNaN(jobIdNum)) {
        return res.status(400).json({ message: "Ungültige jobId" });
      }

      const job = await storage.getTranscriptionJob(jobIdNum);
      if (!job || job.userId !== userId) {
        return res.status(404).json({ message: "Job nicht gefunden" });
      }

      if (job.status !== "preview" && job.status !== "completed") {
        return res.status(400).json({
          message: "Experten-Anfrage ist nur für Jobs mit Vorschau oder fertiger Transkription möglich.",
        });
      }

      const validServiceLevel = ["ki_geprueft", "experten"].includes(serviceLevelBody);
      const serviceLevel = validServiceLevel ? serviceLevelBody : "experten";

      const validUrgency = ["standard", "express", "priority"].includes(urgency);
      const validAccuracy = ["reading", "scientific"].includes(accuracyLevel);
      const validBudget = ["bis_100", "100_250", "250_500", "500_plus", "flexible"].includes(budgetRange);
      if (!validUrgency || !validAccuracy || !validBudget) {
        return res.status(400).json({ message: "Ungültige Angaben (urgency, accuracyLevel oder budgetRange)" });
      }

      const assignedExpert = await storage.getFirstActiveExpertAccount();
      const request = await storage.createHumanTranscriptionRequest({
        jobId: jobIdNum,
        userId,
        status: "pending",
        serviceLevel,
        urgency,
        accuracyLevel,
        budgetRange,
        customerNotes: customerNotes || null,
        expertAccountId: assignedExpert?.id ?? null,
        assignedAt: assignedExpert ? new Date() : null,
      });

      const user = await storage.getUser(userId);
      sendHumanTranscriptionRequestNotification({
        userName: user?.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : userId,
        userEmail: user?.email || undefined,
        requestId: request.id,
        jobId: jobIdNum,
        serviceLevel,
        urgency,
        accuracyLevel,
        budgetRange,
        customerNotes: customerNotes || undefined,
      }).catch((err) => console.error("Failed to send human transcription request notification:", err));

      if (assignedExpert?.email) {
        sendExpertRequestAssignedEmail({
          to: assignedExpert.email,
          expertName: assignedExpert.contactName || assignedExpert.companyName,
          userName: user?.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : userId,
          userEmail: user?.email || undefined,
          requestId: request.id,
          jobId: jobIdNum,
          serviceLevel,
          urgency,
          accuracyLevel,
          budgetRange,
          customerNotes: customerNotes || undefined,
        }).catch((err) => console.error("Failed to send assigned expert notification:", err));
      }

      res.status(201).json({
        ...request,
        expert: request.expertAccountId ? publicExpertAccount(assignedExpert) : null,
      });
    } catch (error: any) {
      console.error("Error creating human transcription request:", error);
      res.status(500).json({ message: error.message || "Anfrage konnte nicht erstellt werden" });
    }
  });

  app.get("/api/human-transcription/requests", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.uid;
      const requests = await storage.getHumanTranscriptionRequestsByUser(userId);
      const enriched = await Promise.all(requests.map(async (request) => {
        const expert = request.expertAccountId
          ? await storage.getExpertAccount(request.expertAccountId)
          : null;
        return {
          ...request,
          expert: request.status === "quoted" || ["accepted", "in_progress", "completed"].includes(request.status)
            ? publicExpertAccount(expert)
            : null,
        };
      }));
      res.json(enriched);
    } catch (error) {
      console.error("Error listing human transcription requests:", error);
      res.status(500).json({ message: "Anfragen konnten nicht geladen werden" });
    }
  });

  app.get("/api/human-transcription/requests/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.uid;
      const id = parseInt(req.params.id);
      if (Number.isNaN(id)) {
        return res.status(400).json({ message: "Ungültige Anfrage-ID" });
      }

      const request = await storage.getHumanTranscriptionRequest(id);
      if (!request || request.userId !== userId) {
        return res.status(404).json({ message: "Anfrage nicht gefunden" });
      }

      const expert = request.expertAccountId
        ? await storage.getExpertAccount(request.expertAccountId)
        : null;
      const results = await storage.getHumanTranscriptionResultsByRequest(request.id);
      res.json({
        ...request,
        expert: request.status === "quoted" || ["accepted", "in_progress", "completed"].includes(request.status)
          ? publicExpertAccount(expert)
          : null,
        results,
      });
    } catch (error) {
      console.error("Error getting human transcription request:", error);
      res.status(500).json({ message: "Anfrage konnte nicht geladen werden" });
    }
  });

  // Angebot ablehnen (ohne Zahlung)
  app.post("/api/human-transcription/requests/:id/respond", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.uid;
      const id = parseInt(req.params.id);
      const { accept } = req.body;

      if (Number.isNaN(id)) {
        return res.status(400).json({ message: "Ungültige Anfrage-ID" });
      }

      const request = await storage.getHumanTranscriptionRequest(id);
      if (!request || request.userId !== userId) {
        return res.status(404).json({ message: "Anfrage nicht gefunden" });
      }

      if (request.status !== "quoted") {
        return res.status(400).json({ message: "Nur auf ein Angebot kann reagiert werden" });
      }

      if (accept === true) {
        return res.status(400).json({
          message: "Annahme eines Angebots erfordert eine Zahlung. Bitte nutzen Sie den Checkout-Endpunkt.",
        });
      }

      const updated = await storage.updateHumanTranscriptionRequest(id, {
        status: "declined",
        respondedAt: new Date(),
      });

      res.json(updated);
    } catch (error: any) {
      console.error("Error responding to quote:", error);
      res.status(500).json({ message: error.message || "Antwort konnte nicht gespeichert werden" });
    }
  });

  // Angebot extern annehmen (Vertrag und Abrechnung direkt mit dem Experten)
  app.post("/api/human-transcription/requests/:id/accept-external", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.uid;
      const id = parseInt(req.params.id);
      const { externalBillingNoticeAccepted } = req.body || {};

      if (Number.isNaN(id)) {
        return res.status(400).json({ message: "Ungültige Anfrage-ID" });
      }

      const request = await storage.getHumanTranscriptionRequest(id);
      if (!request || request.userId !== userId) {
        return res.status(404).json({ message: "Anfrage nicht gefunden" });
      }

      if (request.status !== "quoted") {
        return res.status(400).json({ message: "Nur ein vorliegendes Angebot kann angenommen werden" });
      }

      if (externalBillingNoticeAccepted !== true) {
        return res.status(400).json({
          message: "Bitte bestätigen Sie, dass Vertragspartner und Abrechnung direkt beim Experten liegen.",
        });
      }

      const updated = await storage.updateHumanTranscriptionRequest(id, {
        status: "accepted",
        respondedAt: new Date(),
        customerAcceptedAt: new Date(),
        externalBillingNoticeAccepted: true,
      });

      const expert = request.expertAccountId ? await storage.getExpertAccount(request.expertAccountId) : null;
      if (!expertCanQuote(expert)) {
        return res.status(400).json({
          message: "Dieses Angebot kann aktuell nicht angenommen werden, weil der Experte nicht aktiv ist oder Pflichtangaben fehlen.",
          missingFields: getExpertMissingFields(expert),
        });
      }
      const user = await storage.getUser(userId);
      if (expert?.email) {
        sendExpertQuoteAcceptedEmail({
          to: expert.email,
          requestId: request.id,
          customerName: user?.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : user?.email ?? undefined,
          quotePriceEur: request.quotePriceEur,
        }).catch((err) => console.error("Failed to send expert quote accepted email:", err));
      }

      res.json(updated);
    } catch (error: any) {
      console.error("Error accepting external expert quote:", error);
      res.status(500).json({ message: error.message || "Angebot konnte nicht angenommen werden" });
    }
  });

  // Angebot annehmen → Stripe Checkout Session erstellen
  app.post("/api/human-transcription/requests/:id/checkout", isAuthenticated, async (req: any, res) => {
    try {
      const stripeInstance = getStripeOrThrow();
      const userId = req.user.uid;
      const id = parseInt(req.params.id);

      if (Number.isNaN(id)) {
        return res.status(400).json({ message: "Ungültige Anfrage-ID" });
      }

      const request = await storage.getHumanTranscriptionRequest(id);
      if (!request || request.userId !== userId) {
        return res.status(404).json({ message: "Anfrage nicht gefunden" });
      }

      if (request.status !== "quoted") {
        return res.status(400).json({ message: "Nur auf ein Angebot kann bezahlt werden" });
      }

      const priceCents = request.quotePriceEur;
      if (!priceCents || priceCents <= 0) {
        return res.status(400).json({ message: "Kein gültiger Angebotspreis vorhanden" });
      }

      const protocol = req.headers["x-forwarded-proto"] || req.protocol;
      const host = req.headers["x-forwarded-host"] || req.headers.host;
      const baseUrl = `${protocol}://${host}`;

      const session = await stripeInstance.checkout.sessions.create({
        // Keine payment_method_types: Stripe zeigt die im Dashboard aktivierten
        // Zahlarten dynamisch an (Karte, MobilePay, PayPal … ohne Code-Deploy).
        line_items: [
          {
            price_data: {
              currency: "dkk",
              product_data: {
                name: `Experten-Transkription – Auftrag #${request.id}`,
                description: "Manuelle Transkription durch einen Spezialisten für historische Handschriften",
              },
              unit_amount: priceCents,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${baseUrl}/app/specialist-payment/success?session_id={CHECKOUT_SESSION_ID}&request_id=${request.id}`,
        cancel_url: `${baseUrl}/app/human-transcription`,
        metadata: {
          type: "specialist_order",
          userId,
          humanRequestId: String(request.id),
          jobId: String(request.jobId),
        },
      });

      await storage.updateHumanTranscriptionRequest(id, {
        stripeSessionId: session.id,
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Error creating specialist checkout session:", error);
      res.status(500).json({ message: error.message || "Fehler beim Erstellen der Checkout-Session" });
    }
  });

  // Payment-Status für Spezialistenauftrag abfragen (Polling von Success-Seite)
  app.get("/api/human-transcription/requests/:id/payment-status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.uid;
      const id = parseInt(req.params.id);

      if (Number.isNaN(id)) {
        return res.status(400).json({ message: "Ungültige Anfrage-ID" });
      }

      const request = await storage.getHumanTranscriptionRequest(id);
      if (!request || request.userId !== userId) {
        return res.status(404).json({ message: "Anfrage nicht gefunden" });
      }

      if (request.status === "accepted" || request.status === "in_progress" || request.status === "completed") {
        return res.json({
          status: "completed",
          requestId: request.id,
          pricePaid: request.quotePriceEur,
        });
      }

      if (request.status !== "quoted" || !request.stripeSessionId) {
        return res.json({ status: request.status });
      }

      const stripeInst = getStripeInstance();
      if (stripeInst) {
        try {
          const session = await stripeInst.checkout.sessions.retrieve(request.stripeSessionId);
          if (session.payment_status === "paid") {
            const updated = await storage.updateHumanTranscriptionRequest(id, {
              status: "accepted",
              respondedAt: new Date(),
              stripePaymentIntentId: session.payment_intent as string,
            });

            try {
              const user = await storage.getUser(userId);
              if (user) {
                const job = await storage.getTranscriptionJob(request.jobId);
                const desc = job
                  ? `Manuelle Transkription durch Spezialisten (Auftrag #${request.jobId})`
                  : `Manuelle Transkription durch Spezialisten (Anfrage #${id})`;
                await createInvoiceForSpecialistOrder(storage, updated, user, desc);
                console.log(`[Specialist] Rechnung für Anfrage ${id} erstellt (via Payment-Status)`);
              }
            } catch (invErr) {
              console.error("[Specialist] Rechnungserstellung via Payment-Status fehlgeschlagen:", invErr);
            }

            return res.json({
              status: "completed",
              requestId: request.id,
              pricePaid: request.quotePriceEur,
            });
          }
        } catch (err) {
          console.error("[Specialist] Error checking Stripe session:", err);
        }
      }

      res.json({ status: "pending" });
    } catch (error: any) {
      console.error("Error checking specialist payment status:", error);
      res.status(500).json({ message: error.message || "Fehler bei der Statusprüfung" });
    }
  });

  // ─── Admin: Evaluation ─────────────────────────────────────────────────────
  const adminEval = [isAuthenticated, (req: any, res: any, next: any) => {
    isAdmin(req, res, (err: any) => {
      if (err) return res.status(403).json({ message: "Zugriff verweigert" });
      next();
    });
  }];

  app.get("/api/admin/check", ...adminEval, async (_req, res) => {
    res.json({ admin: true });
  });

  // ─── Admin: Expert Accounts ────────────────────────────────────────────────
  app.get("/api/admin/experts", ...adminEval, async (_req, res) => {
    try {
      const experts = await storage.getExpertAccounts();
      res.json(experts);
    } catch (error: any) {
      console.error("Error listing expert accounts:", error);
      res.status(500).json({ message: "Experten konnten nicht geladen werden" });
    }
  });

  app.post("/api/admin/experts", ...adminEval, async (req: any, res) => {
    try {
      const email = typeof req.body?.email === "string" ? normalizeEmail(req.body.email) : "";
      if (!email) {
        return res.status(400).json({ message: "E-Mail ist erforderlich" });
      }

      const created = await storage.createExpertAccount({
        email,
        isActive: req.body?.isActive ?? true,
        companyName: req.body?.companyName ?? null,
        legalName: req.body?.legalName ?? null,
        contactName: req.body?.contactName ?? null,
        street: req.body?.street ?? null,
        postalCode: req.body?.postalCode ?? null,
        city: req.body?.city ?? null,
        country: req.body?.country ?? null,
        vatId: req.body?.vatId ?? null,
        taxNumber: req.body?.taxNumber ?? null,
        website: req.body?.website ?? null,
        phone: req.body?.phone ?? null,
        invoiceEmail: req.body?.invoiceEmail ?? null,
        businessType: req.body?.businessType ?? null,
        tradeRegisterName: req.body?.tradeRegisterName ?? null,
        tradeRegisterNumber: req.body?.tradeRegisterNumber ?? null,
        legalComplianceConfirmed: req.body?.legalComplianceConfirmed ?? false,
        actsAsBusinessConfirmed: req.body?.actsAsBusinessConfirmed ?? false,
        externalBillingConfirmed: req.body?.externalBillingConfirmed ?? false,
        confidentialityConfirmed: req.body?.confidentialityConfirmed ?? false,
        dataProtectionConfirmed: req.body?.dataProtectionConfirmed ?? false,
        liabilityInsuranceConfirmed: req.body?.liabilityInsuranceConfirmed ?? false,
        termsText: req.body?.termsText ?? null,
        adminNotes: req.body?.adminNotes ?? null,
      });
      res.status(201).json(created);
    } catch (error: any) {
      console.error("Error creating expert account:", error);
      res.status(500).json({ message: error.message || "Experte konnte nicht angelegt werden" });
    }
  });

  app.patch("/api/admin/experts/:id", ...adminEval, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (Number.isNaN(id)) {
        return res.status(400).json({ message: "Ungültige Experten-ID" });
      }

      const allowed = [
        "email",
        "isActive",
        "companyName",
        "legalName",
        "contactName",
        "street",
        "postalCode",
        "city",
        "country",
        "vatId",
        "taxNumber",
        "website",
        "phone",
        "invoiceEmail",
        "businessType",
        "tradeRegisterName",
        "tradeRegisterNumber",
        "legalComplianceConfirmed",
        "actsAsBusinessConfirmed",
        "externalBillingConfirmed",
        "confidentialityConfirmed",
        "dataProtectionConfirmed",
        "liabilityInsuranceConfirmed",
        "termsText",
        "adminNotes",
      ];
      const data: Record<string, unknown> = {};
      for (const key of allowed) {
        if (key in req.body) data[key] = key === "email" ? normalizeEmail(String(req.body[key])) : req.body[key];
      }

      const updated = await storage.updateExpertAccount(id, data as any);
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating expert account:", error);
      res.status(500).json({ message: error.message || "Experte konnte nicht gespeichert werden" });
    }
  });

  // ─── Expert Portal API ─────────────────────────────────────────────────────
  app.get("/api/expert/me", isAuthenticated, async (req: any, res) => {
    try {
      const expert = await getCurrentExpertAccount(req);
      const missingFields = getExpertMissingFields(expert);
      res.json({
        expert: publicExpertAccount(expert),
        canQuote: expertCanQuote(expert),
        missingFields,
      });
    } catch (error: any) {
      console.error("Error resolving expert account:", error);
      res.status(500).json({ message: "Expertenkonto konnte nicht geladen werden" });
    }
  });

  app.patch("/api/expert/profile", isAuthenticated, async (req: any, res) => {
    try {
      const expert = await getCurrentExpertAccount(req);
      if (!expert) return res.status(403).json({ message: "Kein aktives Expertenkonto" });

      const allowed = [
        "companyName",
        "legalName",
        "contactName",
        "street",
        "postalCode",
        "city",
        "country",
        "vatId",
        "taxNumber",
        "website",
        "phone",
        "invoiceEmail",
        "businessType",
        "tradeRegisterName",
        "tradeRegisterNumber",
        "legalComplianceConfirmed",
        "actsAsBusinessConfirmed",
        "externalBillingConfirmed",
        "confidentialityConfirmed",
        "dataProtectionConfirmed",
        "liabilityInsuranceConfirmed",
        "termsText",
      ];
      const data: Record<string, unknown> = {};
      for (const key of allowed) {
        if (key in req.body) {
          data[key] = typeof req.body[key] === "boolean" ? req.body[key] : req.body[key] || null;
        }
      }

      const updated = await storage.updateExpertAccount(expert.id, data as any);
      res.json({
        expert: publicExpertAccount(updated),
        canQuote: expertCanQuote(updated),
        missingFields: getExpertMissingFields(updated),
      });
    } catch (error: any) {
      console.error("Error updating expert profile:", error);
      res.status(500).json({ message: error.message || "Profil konnte nicht gespeichert werden" });
    }
  });

  app.get("/api/expert/requests", isAuthenticated, async (req: any, res) => {
    try {
      const expert = await getCurrentExpertAccount(req);
      if (!expert) return res.status(403).json({ message: "Kein aktives Expertenkonto" });
      const requests = await storage.getHumanTranscriptionRequestsByExpert(expert.id);
      res.json(requests);
    } catch (error: any) {
      console.error("Error listing expert requests:", error);
      res.status(500).json({ message: "Anfragen konnten nicht geladen werden" });
    }
  });

  app.get("/api/expert/requests/:id", isAuthenticated, async (req: any, res) => {
    try {
      const expert = await getCurrentExpertAccount(req);
      if (!expert) return res.status(403).json({ message: "Kein aktives Expertenkonto" });
      const id = parseInt(req.params.id);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Ungültige Anfrage-ID" });

      const request = await storage.getHumanTranscriptionRequest(id);
      if (!request || request.expertAccountId !== expert.id) {
        return res.status(404).json({ message: "Anfrage nicht gefunden" });
      }

      const job = await storage.getTranscriptionJob(request.jobId);
      const pages = job ? await storage.getTranscriptionPages(request.jobId) : [];
      const results = await storage.getHumanTranscriptionResultsByRequest(request.id);
      res.json({ request, expert: publicExpertAccount(expert), job: job ?? null, pages, results });
    } catch (error: any) {
      console.error("Error loading expert request:", error);
      res.status(500).json({ message: "Anfrage konnte nicht geladen werden" });
    }
  });

  app.post("/api/expert/requests/:id/quote", isAuthenticated, async (req: any, res) => {
    try {
      const expert = await getCurrentExpertAccount(req);
      if (!expert) return res.status(403).json({ message: "Kein aktives Expertenkonto" });
      const missingFields = getExpertMissingFields(expert);
      if (!expertCanQuote(expert)) {
        return res.status(400).json({
          message: expert.isActive
            ? "Bitte vervollständigen Sie zuerst Ihr Expertenprofil."
            : "Ihr Expertenkonto ist nicht aktiv.",
          missingFields,
        });
      }
      const id = parseInt(req.params.id);
      const { quotePriceEur, quoteMessage, quoteDeadline } = req.body || {};
      if (Number.isNaN(id)) return res.status(400).json({ message: "Ungültige Anfrage-ID" });

      const request = await storage.getHumanTranscriptionRequest(id);
      if (!request || request.expertAccountId !== expert.id) {
        return res.status(404).json({ message: "Anfrage nicht gefunden" });
      }
      if (request.status !== "pending") {
        return res.status(400).json({ message: "Nur offene Anfragen können angeboten werden" });
      }

      const priceEur = quotePriceEur != null ? parseInt(String(quotePriceEur), 10) : null;
      if (priceEur != null && (Number.isNaN(priceEur) || priceEur < 0)) {
        return res.status(400).json({ message: "Ungültiger Angebotspreis" });
      }
      const deadline = quoteDeadline ? new Date(quoteDeadline) : null;

      const updated = await storage.updateHumanTranscriptionRequest(id, {
        status: "quoted",
        quotePriceEur: priceEur ?? undefined,
        quoteMessage: quoteMessage ?? undefined,
        quoteDeadline: deadline ?? undefined,
        quotedAt: new Date(),
      });

      const user = await storage.getUser(request.userId);
      if (user?.email) {
        sendQuoteEmail({
          to: user.email,
          firstName: user.firstName ?? undefined,
          quotePriceEur: priceEur ?? undefined,
          quoteMessage: quoteMessage ?? undefined,
          quoteDeadline: deadline ?? undefined,
          requestId: id,
          expert: publicExpertAccount(expert),
          lang: (user.language ?? "da") as any,
        } as any).catch((err) => console.error("Failed to send expert quote email:", err));
      }

      res.json(updated);
    } catch (error: any) {
      console.error("Error creating expert quote:", error);
      res.status(500).json({ message: error.message || "Angebot konnte nicht gespeichert werden" });
    }
  });

  app.post("/api/expert/requests/:id/start", isAuthenticated, async (req: any, res) => {
    try {
      const expert = await getCurrentExpertAccount(req);
      if (!expert) return res.status(403).json({ message: "Kein aktives Expertenkonto" });
      const id = parseInt(req.params.id);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Ungültige Anfrage-ID" });

      const request = await storage.getHumanTranscriptionRequest(id);
      if (!request || request.expertAccountId !== expert.id) {
        return res.status(404).json({ message: "Anfrage nicht gefunden" });
      }
      if (request.status !== "accepted" && request.status !== "in_progress") {
        return res.status(400).json({ message: "Nur angenommene Anfragen können bearbeitet werden" });
      }

      const updated = await storage.updateHumanTranscriptionRequest(id, {
        status: "in_progress",
        expertStartedAt: request.expertStartedAt ?? new Date(),
      });
      res.json(updated);
    } catch (error: any) {
      console.error("Error starting expert request:", error);
      res.status(500).json({ message: error.message || "Bearbeitung konnte nicht gestartet werden" });
    }
  });

  app.post("/api/expert/requests/:id/results", isAuthenticated, async (req: any, res) => {
    try {
      const expert = await getCurrentExpertAccount(req);
      if (!expert) return res.status(403).json({ message: "Kein aktives Expertenkonto" });
      const id = parseInt(req.params.id);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Ungültige Anfrage-ID" });

      const request = await storage.getHumanTranscriptionRequest(id);
      if (!request || request.expertAccountId !== expert.id) {
        return res.status(404).json({ message: "Anfrage nicht gefunden" });
      }
      if (!["accepted", "in_progress", "completed"].includes(request.status)) {
        return res.status(400).json({ message: "Ergebnisse können erst nach Annahme gespeichert werden" });
      }
      if (!Array.isArray(req.body?.results)) {
        return res.status(400).json({ message: "Ergebnisse fehlen" });
      }

      const rows = req.body.results
        .map((result: any) => ({
          requestId: request.id,
          jobId: request.jobId,
          pageId: result.pageId ?? null,
          pageNumber: Number(result.pageNumber),
          resultType: request.serviceLevel,
          text: String(result.text ?? "").trim(),
          expertNotes: result.expertNotes ? String(result.expertNotes) : null,
          savedByExpertAccountId: expert.id,
        }))
        .filter((result: any) => result.pageNumber > 0 && result.text.length > 0);

      const saved = await storage.upsertHumanTranscriptionResults(request.id, rows);
      const updatedRequest = request.status === "accepted"
        ? await storage.updateHumanTranscriptionRequest(request.id, {
            status: "in_progress",
            expertStartedAt: request.expertStartedAt ?? new Date(),
          })
        : request;
      res.json({ request: updatedRequest, results: saved });
    } catch (error: any) {
      console.error("Error saving expert results:", error);
      res.status(500).json({ message: error.message || "Ergebnisse konnten nicht gespeichert werden" });
    }
  });

  app.post("/api/expert/requests/:id/complete", isAuthenticated, async (req: any, res) => {
    try {
      const expert = await getCurrentExpertAccount(req);
      if (!expert) return res.status(403).json({ message: "Kein aktives Expertenkonto" });
      const id = parseInt(req.params.id);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Ungültige Anfrage-ID" });

      const request = await storage.getHumanTranscriptionRequest(id);
      if (!request || request.expertAccountId !== expert.id) {
        return res.status(404).json({ message: "Anfrage nicht gefunden" });
      }
      if (!["accepted", "in_progress"].includes(request.status)) {
        return res.status(400).json({ message: "Nur angenommene oder laufende Anfragen können abgeschlossen werden" });
      }
      const results = await storage.getHumanTranscriptionResultsByRequest(request.id);
      if (results.length === 0) {
        return res.status(400).json({ message: "Vor Abschluss muss mindestens ein Ergebnis gespeichert werden" });
      }

      const updated = await storage.updateHumanTranscriptionRequest(id, {
        status: "completed",
        completedAt: new Date(),
      });
      const user = await storage.getUser(request.userId);
      if (user?.email) {
        sendExpertResultCompletedEmail({
          to: user.email,
          firstName: user.firstName,
          requestId: request.id,
          jobId: request.jobId,
          serviceLevel: request.serviceLevel,
          lang: (user.language ?? "da") as any,
        }).catch((err) => console.error("Failed to send expert result completed email:", err));
      }
      res.json(updated);
    } catch (error: any) {
      console.error("Error completing expert request:", error);
      res.status(500).json({ message: error.message || "Anfrage konnte nicht abgeschlossen werden" });
    }
  });

  // ─── Admin: Revenue Dashboard ─────────────────────────────────────────────

  app.get("/api/admin/revenue", ...adminEval, async (req: any, res) => {
    try {
      const includeAdmin = req.query.includeAdmin === "true";
      const stats = await storage.getRevenueStats(includeAdmin);
      res.json(
        JSON.parse(
          JSON.stringify(stats, (_k, v) => (typeof v === "bigint" ? Number(v) : v))
        )
      );
    } catch (err: any) {
      console.error("Revenue stats error:", err);
      res.status(500).json({ message: "Fehler beim Laden der Umsatzdaten" });
    }
  });

  // ─── Admin: AdWords Daily Stats ──────────────────────────────────────────

  app.get("/api/admin/adwords", ...adminEval, async (_req, res) => {
    try {
      const stats = await storage.getAdwordsDailyStats();
      res.json(stats);
    } catch (err: any) {
      console.error("AdWords stats error:", err);
      res.status(500).json({ message: "Fehler beim Laden der AdWords-Daten" });
    }
  });

  app.post("/api/admin/adwords/import", ...adminEval, async (req: any, res) => {
    try {
      const csvText: string = typeof req.body === "string" ? req.body : req.body?.csv;
      if (!csvText || typeof csvText !== "string") {
        return res.status(400).json({ message: "CSV-Text fehlt. Sende { csv: '...' } im Body." });
      }

      const lines = csvText.split(/\r?\n/).filter((l: string) => l.trim());
      const rows: { date: string; costCents: number; clicks: number; conversions: number; impressions: number }[] = [];

      for (const line of lines) {
        const match = line.match(/^(\d{4}-\d{2}-\d{2}),EUR,"?([\d.,]+)"?,(\d+),"?([\d.,]+)"?,([.\d]+)$/);
        if (!match) continue;
        const [, dateStr, costStr, clicksStr, convStr, impStr] = match;
        const parseDe = (s: string) => parseFloat(s.replace(/\./g, "").replace(",", "."));
        const costEur = parseDe(costStr);
        const clicks = parseInt(clicksStr, 10);
        const conversions = Math.round(parseDe(convStr));
        const impressions = parseInt(impStr.replace(/\./g, ""), 10);
        if (Number.isNaN(costEur) || Number.isNaN(clicks)) continue;
        rows.push({
          date: dateStr,
          costCents: Math.round(costEur * 100),
          clicks,
          conversions,
          impressions,
        });
      }

      if (rows.length === 0) {
        return res.status(400).json({ message: "Keine gültigen Zeilen in der CSV gefunden." });
      }

      const upserted = await storage.upsertAdwordsDaily(rows);
      res.json({ imported: upserted, message: `${upserted} Tage importiert/aktualisiert.` });
    } catch (err: any) {
      console.error("AdWords import error:", err);
      res.status(500).json({ message: "Fehler beim Import der AdWords-Daten" });
    }
  });

  // ─── Admin: User Stats ───────────────────────────────────────────────────

  app.get("/api/admin/users", ...adminEval, async (_req, res) => {
    try {
      const stats = await storage.getUserStats();
      res.json(
        JSON.parse(
          JSON.stringify(stats, (_k, v) => (typeof v === "bigint" ? Number(v) : v))
        )
      );
    } catch (err: any) {
      console.error("User stats error:", err);
      res.status(500).json({ message: "Fehler beim Laden der Nutzerdaten" });
    }
  });

  app.patch("/api/admin/users/:userId/credits", ...adminEval, async (req: any, res) => {
    try {
      const userIdRaw = req.params.userId;
      const userId = Array.isArray(userIdRaw) ? userIdRaw[0] : userIdRaw;
      const { credits } = req.body ?? {};

      if (!userId || typeof userId !== "string") {
        return res.status(400).json({ message: "Ungültige User-ID" });
      }
      if (!Number.isInteger(credits) || credits < 0) {
        return res.status(400).json({ message: "credits muss eine ganze Zahl ab 0 sein" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Nutzer nicht gefunden" });
      }

      const creditsBefore = await storage.getUserCredits(userId);
      const updated = await storage.setUserCredits(userId, credits);
      const adminId = req.user.uid;

      console.log(
        `[Admin] Credit-Stand gesetzt: ${user.email ?? userId} (${userId}) durch Admin ${adminId}. Vorher: ${creditsBefore?.credits ?? 0}, Nachher: ${updated.credits}`
      );

      res.json({
        success: true,
        userId,
        email: user.email,
        creditsBefore: creditsBefore?.credits ?? 0,
        creditsAfter: updated.credits,
      });
    } catch (err: any) {
      if (err instanceof UserNotInDatabaseError) {
        return res.status(404).json({ message: "Nutzer nicht gefunden" });
      }
      console.error("Error setting user credits:", err);
      res.status(500).json({ message: "Fehler beim Setzen des Credit-Stands" });
    }
  });

  // ─── Admin: Paying-user registration heatmap ──────────────────────────────

  app.get("/api/admin/paying-user-heatmap", ...adminEval, async (_req, res) => {
    try {
      const heatmap = await storage.getPayingUserRegistrationHeatmap();
      res.json(heatmap);
    } catch (err: any) {
      console.error("Paying-user heatmap error:", err);
      res.status(500).json({ message: "Fehler beim Laden der Heatmap-Daten" });
    }
  });

  // ─── Admin: Audio files for a specific user ────────────────────────────────
  app.get("/api/admin/users/:userId/audio", ...adminEval, async (req, res) => {
    try {
      const userIdRaw = req.params.userId;
      const userId = Array.isArray(userIdRaw) ? userIdRaw[0] : userIdRaw;
      if (!userId || typeof userId !== "string") {
        return res.status(400).json({ message: "Ungültige User-ID" });
      }

      const user = await authStorage.getUser(userId);
      if (!user) return res.status(404).json({ message: "Nutzer nicht gefunden" });

      const generations = await db
        .select({
          id: ttsGenerations.id,
          jobId: ttsGenerations.jobId,
          version: ttsGenerations.version,
          lang: ttsGenerations.lang,
          voice: ttsGenerations.voice,
          style: ttsGenerations.style,
          pages: ttsGenerations.pages,
          status: ttsGenerations.status,
          audioUrl: ttsGenerations.audioUrl,
          audioMimeType: ttsGenerations.audioMimeType,
          creditsUsed: ttsGenerations.creditsUsed,
          createdAt: ttsGenerations.createdAt,
          jobScriptType: transcriptionJobs.scriptType,
          jobTotalPages: transcriptionJobs.totalPages,
        })
        .from(ttsGenerations)
        .innerJoin(transcriptionJobs, eq(ttsGenerations.jobId, transcriptionJobs.id))
        .where(and(
          eq(transcriptionJobs.userId, userId),
          eq(ttsGenerations.status, "completed"),
        ))
        .orderBy(desc(ttsGenerations.createdAt));

      const jobIds = [...new Set(generations.map((g) => g.jobId))];
      const snippetMap = new Map<number, string>();
      if (jobIds.length > 0) {
        const pages = await db
          .select({
            jobId: transcriptionPages.jobId,
            pageNumber: transcriptionPages.pageNumber,
            transcription: transcriptionPages.transcription,
            transcriptionCompleted: transcriptionPages.transcriptionCompleted,
          })
          .from(transcriptionPages)
          .where(inArray(transcriptionPages.jobId, jobIds))
          .orderBy(transcriptionPages.jobId, transcriptionPages.pageNumber);
        for (const page of pages) {
          if (!snippetMap.has(page.jobId)) {
            const text = page.transcriptionCompleted || page.transcription || "";
            if (text) snippetMap.set(page.jobId, text.slice(0, 200));
          }
        }
      }

      const result = generations.map((g) => ({
        ...g,
        textSnippet: snippetMap.get(g.jobId) ?? null,
      }));

      res.json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
        generations: result,
      });
    } catch (err: any) {
      console.error("Admin user audio error:", err);
      res.status(500).json({ message: "Fehler beim Laden der Audios" });
    }
  });

  // ─── Admin: Abuse / Free-Credit-Farming Stats ────────────────────────────

  app.get("/api/admin/abuse-stats", ...adminEval, async (_req, res) => {
    try {
      const rows = await db
        .select({
          totalBlocked: sql<number>`COALESCE(SUM(${usedFreeCredits.blockCount}), 0)`,
          affectedEmails: sql<number>`COUNT(*) FILTER (WHERE ${usedFreeCredits.blockCount} > 0)`,
        })
        .from(usedFreeCredits);
      const row = rows[0];
      res.json({
        totalBlocked: Number(row?.totalBlocked) || 0,
        affectedEmails: Number(row?.affectedEmails) || 0,
      });
    } catch (err: any) {
      console.error("Abuse stats error:", err);
      res.status(500).json({ message: "Fehler beim Laden der Missbrauchs-Statistik" });
    }
  });

  // ─── Admin: App Settings ──────────────────────────────────────────────────

  app.get("/api/admin/settings", ...adminEval, async (_req, res) => {
    try {
      const settings = await storage.getAllSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error loading settings:", error);
      res.status(500).json({ message: "Fehler beim Laden der Einstellungen" });
    }
  });

  app.put("/api/admin/settings", ...adminEval, async (req: any, res) => {
    try {
      const updates = req.body as Record<string, unknown>;
      if (!updates || typeof updates !== "object") {
        return res.status(400).json({ message: "Ungültige Daten" });
      }
      for (const [key, value] of Object.entries(updates)) {
        await storage.setSetting(key, value);
      }
      clearProductionConfigCache();
      const settings = await storage.getAllSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error saving settings:", error);
      res.status(500).json({ message: "Fehler beim Speichern" });
    }
  });

  // ─── Admin: CTA-Varianten-Statistiken (A/B-Test) ─────────────────────────
  app.get("/api/admin/cta-stats", ...adminEval, async (_req, res) => {
    try {
      const rows = await storage.getCtaStats();
      const byId = new Map(rows.map((r) => [r.variantId, r]));
      // Immer alle 14 Varianten zurückgeben (auch mit 0-Werten), damit das UI
      // unabhängig vom DB-Stand jede Kachel rendern kann.
      const stats = Array.from({ length: 14 }, (_, id) => {
        const r = byId.get(id);
        const impressions = r?.impressions ?? 0;
        const claims = r?.claims ?? 0;
        const conversionRate = impressions > 0 ? claims / impressions : null;
        return { variantId: id, impressions, claims, conversionRate };
      });
      res.json(stats);
    } catch (error) {
      console.error("Error loading CTA stats:", error);
      res.status(500).json({ message: "Fehler beim Laden der CTA-Statistik" });
    }
  });

  app.post("/api/admin/cta-stats/reset", ...adminEval, async (_req, res) => {
    try {
      await storage.resetCtaStats();
      res.json({ ok: true });
    } catch (error) {
      console.error("Error resetting CTA stats:", error);
      res.status(500).json({ message: "Fehler beim Zurücksetzen" });
    }
  });

  // ─── Admin: Hero-Varianten-Statistiken (A/B-Test Homepage) ───────────────
  app.get("/api/admin/hero-stats", ...adminEval, async (_req, res) => {
    try {
      const rows = await storage.getHeroStats();
      const byId = new Map(rows.map((r) => [r.variantId, r]));
      // Immer alle 5 Varianten zurückgeben (auch mit 0-Werten).
      const stats = Array.from({ length: 5 }, (_, id) => {
        const r = byId.get(id);
        const impressions = r?.impressions ?? 0;
        const conversions = r?.conversions ?? 0;
        const conversionRate = impressions > 0 ? conversions / impressions : null;
        return { variantId: id, impressions, conversions, conversionRate };
      });
      res.json(stats);
    } catch (error) {
      console.error("Error loading hero stats:", error);
      res.status(500).json({ message: "Fehler beim Laden der Hero-Statistik" });
    }
  });

  app.post("/api/admin/hero-stats/reset", ...adminEval, async (_req, res) => {
    try {
      await storage.resetHeroStats();
      res.json({ ok: true });
    } catch (error) {
      console.error("Error resetting hero stats:", error);
      res.status(500).json({ message: "Fehler beim Zurücksetzen" });
    }
  });

  // ─── Admin: Completed Jobs (für Beispiel-Konfiguration) ──────────────────
  app.get("/api/admin/completed-jobs", ...adminEval, async (_req, res) => {
    try {
      const jobs = await db
        .select({
          id: transcriptionJobs.id,
          scriptType: transcriptionJobs.scriptType,
          translationLanguage: transcriptionJobs.translationLanguage,
          totalPages: transcriptionJobs.totalPages,
          createdAt: transcriptionJobs.createdAt,
        })
        .from(transcriptionJobs)
        .where(eq(transcriptionJobs.status, "completed"))
        .orderBy(desc(transcriptionJobs.createdAt))
        .limit(100);

      const jobsWithSnippet = await Promise.all(
        jobs.map(async (job) => {
          const [firstPage] = await db
            .select({ transcription: transcriptionPages.transcription })
            .from(transcriptionPages)
            .where(eq(transcriptionPages.jobId, job.id))
            .orderBy(transcriptionPages.pageNumber)
            .limit(1);
          return {
            ...job,
            textSnippet: firstPage?.transcription?.slice(0, 120) || null,
          };
        }),
      );

      res.json(jobsWithSnippet);
    } catch (error) {
      console.error("Error fetching completed jobs:", error);
      res.status(500).json({ message: "Fehler beim Laden der Jobs" });
    }
  });

  // ─── Admin: TTS für Beispieldokument generieren ───────────────────────────
  app.post("/api/admin/examples/generate-tts", ...adminEval, async (req: any, res) => {
    try {
      const { jobId, voice, style, version } = req.body as {
        jobId: number;
        voice: string;
        style?: string;
        version?: "original" | "completed" | "interpreted";
      };
      if (!jobId || !voice) {
        return res.status(400).json({ message: "jobId und voice sind erforderlich" });
      }

      const [job] = await db
        .select()
        .from(transcriptionJobs)
        .where(eq(transcriptionJobs.id, jobId))
        .limit(1);
      if (!job) {
        return res.status(404).json({ message: "Job nicht gefunden" });
      }

      const pages = await db
        .select()
        .from(transcriptionPages)
        .where(eq(transcriptionPages.jobId, jobId))
        .orderBy(transcriptionPages.pageNumber);

      const useTranslation = !!job.translationLanguage;
      const textVersion = version || "interpreted";

      const fullText = pages
        .filter((p) => p.transcription && p.status === "completed")
        .map((p) => {
          if (useTranslation) {
            if (textVersion === "interpreted") return (p as any).translationInterpreted || (p as any).translationCompleted || (p as any).translation || p.transcriptionInterpreted || p.transcriptionCompleted || p.transcription;
            if (textVersion === "completed") return (p as any).translationCompleted || (p as any).translation || p.transcriptionCompleted || p.transcription;
            return (p as any).translation || p.transcription;
          }
          if (textVersion === "interpreted") return p.transcriptionInterpreted || p.transcriptionCompleted || p.transcription;
          if (textVersion === "completed") return p.transcriptionCompleted || p.transcription;
          return p.transcription;
        })
        .join("\n\n");

      if (!fullText.trim()) {
        return res.status(400).json({ message: "Kein Transkriptionstext für diesen Job verfügbar" });
      }

      const langEntry = useTranslation
        ? ttsLanguageMap[job.translationLanguage!]
        : ttsLanguageMap["de"];
      const languageCode = langEntry?.bcp47 || "de-DE";

      const result = await generateSpeech({
        text: fullText,
        voice,
        style: style || undefined,
        languageCode,
      });

      const examplesDir = path.join(uploadDir, "examples");
      if (!fs.existsSync(examplesDir)) {
        fs.mkdirSync(examplesDir, { recursive: true });
      }
      const filename = `example-${jobId}-${Date.now()}.mp3`;
      const filePath = path.join(examplesDir, filename);
      fs.writeFileSync(filePath, result.audioBuffer);
      const audioUrl = `/uploads/examples/${filename}`;

      // Persist audio in DB so it survives republish (uploads/ is ephemeral on deploy).
      // A matching ttsGenerations row lets the /uploads fallback handler serve the
      // bytes from the database when the file on disk has been wiped.
      await db.insert(ttsGenerations).values({
        jobId,
        version: textVersion,
        lang: useTranslation ? (job.translationLanguage || "de") : "de",
        voice,
        style: style || null,
        pages: [],
        status: "completed",
        audioUrl,
        audioData: result.audioBuffer.toString("base64"),
        audioMimeType: result.mimeType,
        creditsUsed: 0,
      });

      const raw = (await storage.getSetting("example_config")) as Record<string, unknown> | undefined;
      if (raw && Array.isArray(raw.documents)) {
        const docs = raw.documents as Array<Record<string, unknown>>;
        const docEntry = docs.find((d) => d.jobId === jobId);
        if (docEntry) {
          docEntry.audioUrl = audioUrl;
          await storage.setSetting("example_config", raw);
        }
      }

      res.json({ audioUrl, size: result.audioBuffer.length });
    } catch (error: any) {
      console.error("Error generating example TTS:", error);
      res.status(500).json({ message: error.message || "TTS-Generierung fehlgeschlagen" });
    }
  });

  // ─── Admin: Stripe Modus ──────────────────────────────────────────────────
  app.get("/api/admin/stripe-mode", ...adminEval, async (_req, res) => {
    res.json({
      mode: getStripeMode(),
      publicKey: getStripePublicKey(),
    });
  });

  app.post("/api/admin/stripe-mode", ...adminEval, async (req: any, res) => {
    try {
      const { mode } = req.body;
      if (mode !== "live" && mode !== "test") {
        return res.status(400).json({ message: "Ungültiger Modus. Erlaubt: 'live' oder 'test'" });
      }
      setStripeMode(mode);
      res.json({
        mode: getStripeMode(),
        publicKey: getStripePublicKey(),
      });
    } catch (error: any) {
      console.error("Error setting stripe mode:", error);
      res.status(500).json({ message: error.message || "Fehler beim Umschalten" });
    }
  });

  app.get("/api/admin/eval/documents", ...adminEval, async (_req, res) => {
    try {
      const docs = await storage.getEvaluationDocuments();
      res.json(docs);
    } catch (error) {
      console.error("Error listing eval documents:", error);
      res.status(500).json({ message: "Fehler beim Laden der Dokumente" });
    }
  });

  app.post(
    "/api/admin/eval/documents",
    (req: any, res: any, next: any) => {
      upload.array("files", 50)(req, res, (err: any) => {
        if (err) {
          if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(413).json({ message: "Datei zu groß" });
          }
          return res.status(400).json({ message: err?.message || "Upload fehlgeschlagen" });
        }
        next();
      });
    },
    ...adminEval,
    async (req: any, res) => {
      try {
        const files = (req.files ?? []) as Express.Multer.File[];
        const { scriptType, difficulty, entries: entriesJson } = req.body;

        if (!files.length || !scriptType) {
          return res.status(400).json({
            message: "Mindestens eine Datei, scriptType und entries sind erforderlich",
          });
        }

        let parsed: { name: string; groundTruth: string; notes: string | null }[];
        try {
          parsed = JSON.parse(entriesJson);
        } catch {
          return res.status(400).json({ message: "Ungültiges entries-JSON" });
        }

        if (parsed.length !== files.length) {
          return res.status(400).json({
            message: `Anzahl Dateien (${files.length}) stimmt nicht mit Einträgen (${parsed.length}) überein`,
          });
        }

        const created = [];
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const entry = parsed[i];
          if (!entry.name || !entry.groundTruth) {
            return res.status(400).json({
              message: `Eintrag ${i + 1}: Name und Ground Truth sind erforderlich`,
            });
          }
          const ext = path.extname(file.filename).toLowerCase();
          const fileType = ext === ".pdf" ? "pdf" : "image";
          const fileUrl = `/uploads/${file.filename}`;
          const doc = await storage.createEvaluationDocument({
            name: String(entry.name).slice(0, 200),
            scriptType: String(scriptType).slice(0, 50),
            difficulty: difficulty ? String(difficulty).slice(0, 20) : "medium",
            fileUrl,
            fileType,
            groundTruth: String(entry.groundTruth),
            notes: entry.notes ? String(entry.notes) : null,
          });
          created.push(doc);
        }
        res.json(created);
      } catch (error) {
        console.error("Error creating eval documents:", error);
        res.status(500).json({ message: "Fehler beim Erstellen" });
      }
    }
  );

  app.put("/api/admin/eval/documents/:id", ...adminEval, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const { name, scriptType, difficulty, groundTruth, notes } = req.body;
      const updates: Record<string, unknown> = {};
      if (name !== undefined) updates.name = String(name).slice(0, 200);
      if (scriptType !== undefined) updates.scriptType = String(scriptType).slice(0, 50);
      if (difficulty !== undefined) updates.difficulty = String(difficulty).slice(0, 20);
      if (groundTruth !== undefined) updates.groundTruth = String(groundTruth);
      if (notes !== undefined) updates.notes = notes ? String(notes) : null;
      const doc = await storage.updateEvaluationDocument(id, updates);
      res.json(doc);
    } catch (error) {
      console.error("Error updating eval document:", error);
      res.status(500).json({ message: "Fehler beim Aktualisieren" });
    }
  });

  app.delete("/api/admin/eval/documents/:id", ...adminEval, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteEvaluationDocument(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting eval document:", error);
      res.status(500).json({ message: "Fehler beim Löschen" });
    }
  });

  app.get("/api/admin/eval/runs", ...adminEval, async (_req, res) => {
    try {
      const runs = await storage.getEvaluationRuns();
      res.json(runs);
    } catch (error) {
      console.error("Error listing eval runs:", error);
      res.status(500).json({ message: "Fehler beim Laden der Runs" });
    }
  });

  app.get("/api/admin/eval/runs/:id", ...adminEval, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const run = await storage.getEvaluationRun(id);
      if (!run) return res.status(404).json({ message: "Run nicht gefunden" });
      const results = await storage.getEvaluationResultsByRunId(id);
      const documents = await Promise.all(
        results.map(async (r) => ({
          ...r,
          document: r.documentId ? await storage.getEvaluationDocument(r.documentId) : null,
        }))
      );
      res.json({ run, results: documents });
    } catch (error) {
      console.error("Error getting eval run:", error);
      res.status(500).json({ message: "Fehler beim Laden" });
    }
  });

  app.post("/api/admin/eval/runs", ...adminEval, async (req: any, res) => {
    try {
      const { name, config, documentIds, productionPageIds } = req.body;
      if (!name || !config) {
        return res.status(400).json({ message: "name und config erforderlich" });
      }
      const run = await storage.createEvaluationRun({
        name: String(name).slice(0, 200),
        config: typeof config === "object" ? config : {},
        status: "pending",
      });
      runEvaluation({ runId: run.id, documentIds, productionPageIds }).catch(async (err) => {
        console.error("[Eval] Run failed:", err);
        try {
          await storage.updateEvaluationRun(run.id, { status: "failed", completedAt: new Date() });
        } catch (_) { /* best-effort */ }
      });
      res.json(run);
    } catch (error) {
      console.error("Error creating eval run:", error);
      res.status(500).json({ message: "Fehler beim Erstellen" });
    }
  });

  app.delete("/api/admin/eval/runs/:id", ...adminEval, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteEvaluationRun(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting eval run:", error);
      res.status(500).json({ message: "Fehler beim Löschen" });
    }
  });

  app.get("/api/admin/eval/production-pages", ...adminEval, async (req: any, res) => {
    try {
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
      const offset = (page - 1) * limit;
      const rows = await storage.getCompletedTranscriptionPagesForEval({ limit, offset });
      res.json(rows);
    } catch (error) {
      console.error("Error listing production pages:", error);
      res.status(500).json({ message: "Fehler beim Laden der Produktions-Transkriptionen" });
    }
  });

  app.post("/api/admin/eval/test-single", ...adminEval, async (req: any, res) => {
    try {
      const { documentId, scriptType, provider, model, maxTokens, thinkingBudget, systemPrompt, taskPrompt, preprocessing } = req.body;
      if (!documentId || !scriptType) {
        return res.status(400).json({ message: "documentId und scriptType erforderlich" });
      }
      const result = await testSingleDocument({
        documentId: parseInt(documentId),
        scriptType: String(scriptType),
        provider: provider === "google" ? "google" : undefined,
        model: model ? String(model) : undefined,
        maxTokens: maxTokens != null ? Number(maxTokens) : undefined,
        thinkingBudget: thinkingBudget != null ? Number(thinkingBudget) : undefined,
        systemPrompt: systemPrompt ? String(systemPrompt) : undefined,
        taskPrompt: taskPrompt ? String(taskPrompt) : undefined,
        preprocessing: preprocessing && typeof preprocessing === "object" ? preprocessing : undefined,
      });
      res.json(result);
    } catch (error: any) {
      console.error("Error in test-single:", error);
      res.status(500).json({
        message: error?.message || "Fehler beim Einzeltest",
      });
    }
  });

  // ─── Support Messages (User) ─────────────────────────────────────────────
  app.get("/api/messages", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.uid;
      const conversations = await storage.getSupportConversationsByUser(userId);
      res.json(conversations);
    } catch (error) {
      console.error("Error getting user conversations:", error);
      res.status(500).json({ message: "Fehler beim Laden der Nachrichten" });
    }
  });

  app.get("/api/messages/unread", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.uid;
      const count = await storage.getUnreadCountForUser(userId);
      res.json({ count });
    } catch (error) {
      console.error("Error getting unread count:", error);
      res.status(500).json({ message: "Fehler" });
    }
  });

  app.post("/api/messages", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.uid;
      const { subject, category, content } = req.body;

      if (!subject || !content) {
        return res.status(400).json({ message: "Betreff und Nachricht sind erforderlich" });
      }

      const conversation = await storage.createSupportConversation({
        userId,
        subject: String(subject).slice(0, 200),
        category: category ? String(category).slice(0, 50) : "sonstiges",
        status: "open",
      });

      await storage.createSupportMessage({
        conversationId: conversation.id,
        senderId: userId,
        isAdmin: false,
        content: String(content),
      });

      const user = await storage.getUser(userId);
      sendSupportNotification({
        userName: user?.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : userId,
        userEmail: user?.email || undefined,
        subject: String(subject).slice(0, 200),
        category: category ? String(category).slice(0, 50) : "sonstiges",
        content: String(content),
        conversationId: conversation.id,
      }).catch((err) => console.error("Failed to send support notification email:", err));

      res.json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ message: "Fehler beim Senden der Nachricht" });
    }
  });

  app.get("/api/messages/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.uid;
      const id = parseInt(req.params.id);
      const conversation = await storage.getSupportConversation(id);

      if (!conversation || conversation.userId !== userId) {
        return res.status(404).json({ message: "Konversation nicht gefunden" });
      }

      const messages = await storage.getSupportMessages(id);

      if (conversation.status === "answered") {
        await storage.updateConversationStatus(id, "open");
      }

      res.json({ conversation, messages });
    } catch (error) {
      console.error("Error getting conversation:", error);
      res.status(500).json({ message: "Fehler beim Laden der Konversation" });
    }
  });

  app.post("/api/messages/:id/reply", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.uid;
      const id = parseInt(req.params.id);
      const { content } = req.body;

      if (!content) {
        return res.status(400).json({ message: "Nachricht ist erforderlich" });
      }

      const conversation = await storage.getSupportConversation(id);
      if (!conversation || conversation.userId !== userId) {
        return res.status(404).json({ message: "Konversation nicht gefunden" });
      }

      if (conversation.status === "closed") {
        return res.status(400).json({ message: "Diese Konversation ist geschlossen" });
      }

      const message = await storage.createSupportMessage({
        conversationId: id,
        senderId: userId,
        isAdmin: false,
        content: String(content),
      });

      if (conversation.status === "answered") {
        await storage.updateConversationStatus(id, "open");
      }

      res.json(message);
    } catch (error) {
      console.error("Error replying:", error);
      res.status(500).json({ message: "Fehler beim Senden der Antwort" });
    }
  });

  // ─── Admin: Support Messages ───────────────────────────────────────────────

  // Must be registered before /api/admin/messages/:id to avoid Express matching "unread" as :id
  app.get("/api/admin/messages/unread", ...adminEval, async (_req, res) => {
    try {
      const [row] = await db
        .select({ count: sql<number>`count(*)` })
        .from(supportConversations)
        .where(eq(supportConversations.status, "open"));
      res.json({ count: Number(row?.count) || 0 });
    } catch (error) {
      console.error("Error getting admin unread count:", error);
      res.status(500).json({ message: "Fehler" });
    }
  });

  app.get("/api/admin/messages", ...adminEval, async (req: any, res) => {
    try {
      const statusFilter = req.query.status as string | undefined;
      const conversations = await storage.getAllSupportConversations(statusFilter);
      res.json(conversations);
    } catch (error) {
      console.error("Error getting admin conversations:", error);
      res.status(500).json({ message: "Fehler beim Laden der Nachrichten" });
    }
  });

  app.get("/api/admin/messages/:id", ...adminEval, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const conversation = await storage.getSupportConversation(id);
      if (!conversation) {
        return res.status(404).json({ message: "Konversation nicht gefunden" });
      }

      const messages = await storage.getSupportMessages(id);

      const [user] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, conversation.userId));

      res.json({
        conversation,
        messages,
        user: user ? {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        } : null,
      });
    } catch (error) {
      console.error("Error getting admin conversation:", error);
      res.status(500).json({ message: "Fehler beim Laden der Konversation" });
    }
  });

  app.post("/api/admin/messages/:id/reply", ...adminEval, async (req: any, res) => {
    try {
      const adminUserId = req.user.uid;
      const id = parseInt(req.params.id);
      const { content } = req.body;

      if (!content) {
        return res.status(400).json({ message: "Nachricht ist erforderlich" });
      }

      const conversation = await storage.getSupportConversation(id);
      if (!conversation) {
        return res.status(404).json({ message: "Konversation nicht gefunden" });
      }

      const message = await storage.createSupportMessage({
        conversationId: id,
        senderId: adminUserId,
        isAdmin: true,
        content: String(content),
      });

      await storage.updateConversationStatus(id, "answered");

      res.json(message);
    } catch (error) {
      console.error("Error admin replying:", error);
      res.status(500).json({ message: "Fehler beim Senden der Antwort" });
    }
  });

  app.patch("/api/admin/messages/:id/status", ...adminEval, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;

      if (!["open", "answered", "closed"].includes(status)) {
        return res.status(400).json({ message: "Ungültiger Status" });
      }

      const conversation = await storage.updateConversationStatus(id, status);
      res.json(conversation);
    } catch (error) {
      console.error("Error updating status:", error);
      res.status(500).json({ message: "Fehler beim Aktualisieren des Status" });
    }
  });

  app.post("/api/admin/messages/create", ...adminEval, async (req: any, res) => {
    try {
      const adminUserId = req.user.uid;
      const { userId, subject, content } = req.body;

      if (!userId || !subject || !content) {
        return res.status(400).json({ message: "userId, Betreff und Nachricht sind erforderlich" });
      }

      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ message: "Nutzer nicht gefunden" });
      }

      const conversation = await storage.createSupportConversation({
        userId,
        subject: String(subject).slice(0, 200),
        category: "admin",
        status: "answered",
      });

      await storage.createSupportMessage({
        conversationId: conversation.id,
        senderId: adminUserId,
        isAdmin: true,
        content: String(content),
      });

      res.json({ conversationId: conversation.id });
    } catch (error) {
      console.error("Error creating admin conversation:", error);
      res.status(500).json({ message: "Fehler beim Erstellen der Nachricht" });
    }
  });

  // ─── Admin: Token-Verbrauch ──────────────────────────────────────────────
  const PRICE_INPUT_PER_M = 5.0;   // $5.00 / 1M input tokens (claude-opus-4-6)
  const PRICE_OUTPUT_PER_M = 25.0; // $25.00 / 1M output tokens

  app.get("/api/admin/token-usage", ...adminEval, async (req: any, res) => {
    try {
      const days = req.query.days ? parseInt(req.query.days as string) : undefined;
      const dateFilter = days
        ? gte(transcriptionPages.createdAt, new Date(Date.now() - days * 86400000))
        : undefined;

      const conditions = dateFilter
        ? sql`${eq(transcriptionJobs.id, transcriptionPages.jobId)} AND ${dateFilter}`
        : eq(transcriptionJobs.id, transcriptionPages.jobId);

      const rows = await db
        .select({
          userId: transcriptionJobs.userId,
          totalInputTokens: sum(transcriptionPages.inputTokens).mapWith(Number),
          totalOutputTokens: sum(transcriptionPages.outputTokens).mapWith(Number),
          pageCount: count(transcriptionPages.id),
          jobCount: sql<number>`COUNT(DISTINCT ${transcriptionJobs.id})`.mapWith(Number),
          lastActivity: max(transcriptionPages.createdAt),
        })
        .from(transcriptionPages)
        .innerJoin(transcriptionJobs, conditions)
        .where(sql`${transcriptionPages.inputTokens} IS NOT NULL`)
        .groupBy(transcriptionJobs.userId)
        .orderBy(desc(sum(transcriptionPages.inputTokens)));

      const userIds = rows.map(r => r.userId);
      const userMap = new Map<string, { firstName: string | null; lastName: string | null; email: string | null }>();
      if (userIds.length > 0) {
        const userRows = await db
          .select({ id: usersTable.id, firstName: usersTable.firstName, lastName: usersTable.lastName, email: usersTable.email })
          .from(usersTable);
        for (const u of userRows) {
          userMap.set(u.id, { firstName: u.firstName, lastName: u.lastName, email: u.email });
        }
      }

      let grandInputTokens = 0;
      let grandOutputTokens = 0;
      let grandPages = 0;

      const users = rows.map(row => {
        const inputTokens = row.totalInputTokens ?? 0;
        const outputTokens = row.totalOutputTokens ?? 0;
        const costUsd = (inputTokens / 1_000_000) * PRICE_INPUT_PER_M + (outputTokens / 1_000_000) * PRICE_OUTPUT_PER_M;
        grandInputTokens += inputTokens;
        grandOutputTokens += outputTokens;
        grandPages += row.pageCount;

        const user = userMap.get(row.userId);
        const name = user
          ? [user.firstName, user.lastName].filter(Boolean).join(" ") || null
          : null;

        return {
          userId: row.userId,
          name,
          email: user?.email ?? null,
          inputTokens,
          outputTokens,
          totalTokens: inputTokens + outputTokens,
          costUsd: Math.round(costUsd * 10000) / 10000,
          pageCount: row.pageCount,
          jobCount: row.jobCount,
          lastActivity: row.lastActivity,
        };
      });

      const grandCostUsd = (grandInputTokens / 1_000_000) * PRICE_INPUT_PER_M + (grandOutputTokens / 1_000_000) * PRICE_OUTPUT_PER_M;

      res.json({
        users,
        totals: {
          inputTokens: grandInputTokens,
          outputTokens: grandOutputTokens,
          totalTokens: grandInputTokens + grandOutputTokens,
          costUsd: Math.round(grandCostUsd * 10000) / 10000,
          pageCount: grandPages,
        },
        pricing: {
          model: "claude-opus-4-6 + claude-sonnet-4-5",
          inputPricePerM: PRICE_INPUT_PER_M,
          outputPricePerM: PRICE_OUTPUT_PER_M,
        },
      });
    } catch (error) {
      console.error("Error getting token usage:", error);
      res.status(500).json({ message: "Fehler beim Laden der Token-Daten" });
    }
  });

  app.get("/api/admin/token-usage/:userId/jobs", ...adminEval, async (req: any, res) => {
    try {
      const userId = req.params.userId as string;
      const days = req.query.days ? parseInt(req.query.days as string) : undefined;
      const dateFilter = days
        ? gte(transcriptionPages.createdAt, new Date(Date.now() - days * 86400000))
        : undefined;

      const jobs = await db
        .select()
        .from(transcriptionJobs)
        .where(eq(transcriptionJobs.userId, userId))
        .orderBy(desc(transcriptionJobs.createdAt));

      if (jobs.length === 0) {
        return res.json({ jobs: [] });
      }

      const jobIds = jobs.map((j) => j.id);
      const tokenWhere = dateFilter
        ? and(inArray(transcriptionPages.jobId, jobIds), dateFilter)
        : inArray(transcriptionPages.jobId, jobIds);

      const tokenRows = await db
        .select({
          jobId: transcriptionJobs.id,
          inputTokens: sum(transcriptionPages.inputTokens).mapWith(Number),
          outputTokens: sum(transcriptionPages.outputTokens).mapWith(Number),
          completedPages: sql<number>`COUNT(CASE WHEN ${transcriptionPages.status} = 'completed' THEN 1 END)`.mapWith(Number),
        })
        .from(transcriptionPages)
        .innerJoin(transcriptionJobs, eq(transcriptionPages.jobId, transcriptionJobs.id))
        .where(tokenWhere)
        .groupBy(transcriptionJobs.id);

      const tokenMap = new Map<number, { inputTokens: number; outputTokens: number; completedPages: number }>();
      for (const row of tokenRows) {
        tokenMap.set(row.jobId, {
          inputTokens: row.inputTokens ?? 0,
          outputTokens: row.outputTokens ?? 0,
          completedPages: row.completedPages ?? 0,
        });
      }

      const snippetRows = await db
        .select({
          jobId: transcriptionPages.jobId,
          transcription: transcriptionPages.transcription,
          transcriptionCompleted: transcriptionPages.transcriptionCompleted,
        })
        .from(transcriptionPages)
        .where(inArray(transcriptionPages.jobId, jobIds))
        .orderBy(transcriptionPages.jobId, transcriptionPages.pageNumber);

      const snippetMap = new Map<number, string>();
      for (const row of snippetRows) {
        if (!snippetMap.has(row.jobId)) {
          const text = row.transcriptionCompleted || row.transcription || "";
          if (text) snippetMap.set(row.jobId, text.slice(0, 100));
        }
      }

      const jobsOut = jobs.map((job) => {
        const tokens = tokenMap.get(job.id) ?? { inputTokens: 0, outputTokens: 0, completedPages: 0 };
        const totalTokens = tokens.inputTokens + tokens.outputTokens;
        const costUsd =
          (tokens.inputTokens / 1_000_000) * PRICE_INPUT_PER_M +
          (tokens.outputTokens / 1_000_000) * PRICE_OUTPUT_PER_M;
        return {
          id: job.id,
          scriptType: job.scriptType,
          status: job.status,
          totalPages: job.totalPages,
          createdAt: job.createdAt,
          inputTokens: tokens.inputTokens,
          outputTokens: tokens.outputTokens,
          totalTokens,
          costUsd: Math.round(costUsd * 10000) / 10000,
          textSnippet: snippetMap.get(job.id) ?? null,
          completedPages: tokens.completedPages,
        };
      });

      res.json({ jobs: jobsOut });
    } catch (error) {
      console.error("Error getting token usage jobs:", error);
      res.status(500).json({ message: "Fehler beim Laden der Job-Daten" });
    }
  });

  // ─── Admin: Human Transcription Requests ───────────────────────────────────
  app.get("/api/admin/human-transcription/requests", ...adminEval, async (_req, res) => {
    try {
      const requests = await storage.getAllHumanTranscriptionRequests();
      const enriched = await Promise.all(requests.map(async (request) => {
        const expert = request.expertAccountId
          ? await storage.getExpertAccount(request.expertAccountId)
          : null;
        return { ...request, expert: publicExpertAccount(expert) };
      }));
      res.json(enriched);
    } catch (error) {
      console.error("Error listing admin human transcription requests:", error);
      res.status(500).json({ message: "Anfragen konnten nicht geladen werden" });
    }
  });

  app.get("/api/admin/human-transcription/requests/:id", ...adminEval, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (Number.isNaN(id)) {
        return res.status(400).json({ message: "Ungültige Anfrage-ID" });
      }

      const request = await storage.getHumanTranscriptionRequest(id);
      if (!request) {
        return res.status(404).json({ message: "Anfrage nicht gefunden" });
      }

      const job = await storage.getTranscriptionJob(request.jobId);
      const pages = job ? await storage.getTranscriptionPages(request.jobId) : [];
      const previewPage = pages.find((p) => p.isPreview) ?? pages[0];
      const expert = request.expertAccountId
        ? await storage.getExpertAccount(request.expertAccountId)
        : null;
      const results = await storage.getHumanTranscriptionResultsByRequest(request.id);

      res.json({
        request,
        expert: publicExpertAccount(expert),
        job: job ?? null,
        pages,
        previewPage: previewPage ?? null,
        results,
      });
    } catch (error) {
      console.error("Error getting admin human transcription request:", error);
      res.status(500).json({ message: "Anfrage konnte nicht geladen werden" });
    }
  });

  app.post("/api/admin/human-transcription/requests/:id/assign", ...adminEval, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const expertAccountId = req.body?.expertAccountId != null ? parseInt(String(req.body.expertAccountId), 10) : null;
      if (Number.isNaN(id)) {
        return res.status(400).json({ message: "Ungültige Anfrage-ID" });
      }
      if (expertAccountId == null || Number.isNaN(expertAccountId)) {
        return res.status(400).json({ message: "Ungültige Experten-ID" });
      }

      const request = await storage.getHumanTranscriptionRequest(id);
      if (!request) {
        return res.status(404).json({ message: "Anfrage nicht gefunden" });
      }
      const expert = await storage.getExpertAccount(expertAccountId);
      if (!expert || !expert.isActive) {
        return res.status(400).json({ message: "Experte ist nicht aktiv" });
      }
      const missingFields = getExpertMissingFields(expert);
      if (missingFields.length > 0) {
        return res.status(400).json({
          message: "Expertenprofil ist noch unvollständig",
          missingFields,
        });
      }

      const updated = await storage.updateHumanTranscriptionRequest(id, {
        expertAccountId: expert.id,
        assignedAt: new Date(),
      });

      const user = await storage.getUser(request.userId);
      if (expert.email) {
        sendExpertRequestAssignedEmail({
          to: expert.email,
          expertName: expert.contactName || expert.companyName,
          userName: user?.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : request.userId,
          userEmail: user?.email || undefined,
          requestId: request.id,
          jobId: request.jobId,
          serviceLevel: request.serviceLevel,
          urgency: request.urgency,
          accuracyLevel: request.accuracyLevel,
          budgetRange: request.budgetRange,
          customerNotes: request.customerNotes || undefined,
        }).catch((err) => console.error("Failed to send reassigned expert notification:", err));
      }
      res.json({ ...updated, expert: publicExpertAccount(expert) });
    } catch (error: any) {
      console.error("Error assigning expert:", error);
      res.status(500).json({ message: error.message || "Experte konnte nicht zugewiesen werden" });
    }
  });

  app.post("/api/admin/human-transcription/requests/:id/quote", ...adminEval, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const { quotePriceEur, quoteMessage, quoteDeadline } = req.body;

      if (Number.isNaN(id)) {
        return res.status(400).json({ message: "Ungültige Anfrage-ID" });
      }

      const request = await storage.getHumanTranscriptionRequest(id);
      if (!request) {
        return res.status(404).json({ message: "Anfrage nicht gefunden" });
      }

      if (request.status !== "pending") {
        return res.status(400).json({ message: "Nur bei ausstehenden Anfragen kann ein Angebot erstellt werden" });
      }

      const priceEur = quotePriceEur != null ? parseInt(String(quotePriceEur), 10) : null;
      if (priceEur != null && (Number.isNaN(priceEur) || priceEur < 0)) {
        return res.status(400).json({ message: "Ungültiger Angebotspreis" });
      }

      const deadline = quoteDeadline ? new Date(quoteDeadline) : null;

      const updated = await storage.updateHumanTranscriptionRequest(id, {
        status: "quoted",
        quotePriceEur: priceEur ?? undefined,
        quoteMessage: quoteMessage ?? undefined,
        quoteDeadline: deadline ?? undefined,
        quotedAt: new Date(),
      });

      const user = await storage.getUser(request.userId);
      if (user?.email) {
        sendQuoteEmail({
          to: user.email,
          firstName: user.firstName ?? undefined,
          quotePriceEur: priceEur ?? undefined,
          quoteMessage: quoteMessage ?? undefined,
          quoteDeadline: deadline ?? undefined,
          requestId: id,
          lang: (user.language ?? "da") as any,
        }).catch((err) => console.error("Failed to send quote email:", err));
      }

      res.json(updated);
    } catch (error: any) {
      console.error("Error creating quote:", error);
      res.status(500).json({ message: error.message || "Angebot konnte nicht gespeichert werden" });
    }
  });

  app.post("/api/admin/human-transcription/requests/:id/complete", ...adminEval, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);

      if (Number.isNaN(id)) {
        return res.status(400).json({ message: "Ungültige Anfrage-ID" });
      }

      const request = await storage.getHumanTranscriptionRequest(id);
      if (!request) {
        return res.status(404).json({ message: "Anfrage nicht gefunden" });
      }

      if (request.status !== "accepted" && request.status !== "in_progress") {
        return res.status(400).json({
          message: "Nur angenommene oder in Bearbeitung befindliche Anfragen können abgeschlossen werden",
        });
      }

      const updated = await storage.updateHumanTranscriptionRequest(id, {
        status: "completed",
        completedAt: new Date(),
      });

      res.json(updated);
    } catch (error: any) {
      console.error("Error completing human transcription request:", error);
      res.status(500).json({ message: error.message || "Anfrage konnte nicht abgeschlossen werden" });
    }
  });

  // ─── Admin: Bezahlte Aufträge (accepted / in_progress / completed) ──────────
  app.get("/api/admin/orders", ...adminEval, async (_req, res) => {
    try {
      const allRequests = await storage.getAllHumanTranscriptionRequests();
      const orders = allRequests.filter((r) =>
        ["accepted", "in_progress", "completed"].includes(r.status)
      );

      const enriched = await Promise.all(
        orders.map(async (req) => {
          const [user, job] = await Promise.all([
            storage.getUser(req.userId),
            storage.getTranscriptionJob(req.jobId),
          ]);

          const userInvoices = await storage.getInvoicesByUser(req.userId);
          const invoice = userInvoices.find(
            (inv) => inv.type === "specialist_order" && inv.humanRequestId === req.id
          );

          return {
            ...req,
            customer: user
              ? {
                  name:
                    [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
                    user.email ||
                    "Unbekannt",
                  email: user.email,
                }
              : null,
            job: job
              ? {
                  id: job.id,
                  scriptType: job.scriptType,
                  totalPages: job.totalPages,
                  status: job.status,
                }
              : null,
            invoice: invoice
              ? {
                  id: invoice.id,
                  invoiceNumber: invoice.invoiceNumber,
                  grossAmountEur: invoice.grossAmountEur,
                  pdfPath: invoice.pdfPath,
                }
              : null,
          };
        })
      );

      res.json(enriched);
    } catch (error) {
      console.error("Error listing admin orders:", error);
      res.status(500).json({ message: "Aufträge konnten nicht geladen werden" });
    }
  });

  // ─── Admin: Rechnungen (alle) ──────────────────────────────────────────────
  app.get("/api/admin/invoices", ...adminEval, async (_req, res) => {
    try {
      const allInvoices = await storage.getAllInvoices();

      const enriched = await Promise.all(
        allInvoices.map(async (inv) => {
          const user = await storage.getUser(inv.userId);
          return {
            ...inv,
            customerEmailFromUser: user?.email ?? null,
          };
        })
      );

      res.json(enriched);
    } catch (error) {
      console.error("Error listing admin invoices:", error);
      res.status(500).json({ message: "Rechnungen konnten nicht geladen werden" });
    }
  });

  app.get("/api/admin/invoices/:id/pdf", ...adminEval, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        return res.status(400).json({ message: "Ungültige Rechnungs-ID" });
      }
      const invoice = await storage.getInvoiceById(id);
      if (!invoice) {
        return res.status(404).json({ message: "Rechnung nicht gefunden" });
      }
      let fullPath = getInvoicePdfPath(invoice.pdfPath);

      if (!fullPath) {
        try {
          const hasAddress = invoice.customerStreet || invoice.customerCity;
          if (!hasAddress) {
            const user = await storage.getUser(invoice.userId);
            if (user) {
              const fresh = resolveCustomerData(user);
              Object.assign(invoice, fresh);
              await storage.updateInvoice(invoice.id, fresh);
            }
          }
          const pdfBuffer = await generateInvoicePdf(invoice);
          ensureInvoicesDir();
          const filename = `${invoice.invoiceNumber}.pdf`;
          const dest = path.join(INVOICES_DIR, filename);
          fs.writeFileSync(dest, pdfBuffer);
          if (!invoice.pdfPath) {
            await storage.updateInvoice(invoice.id, { pdfPath: filename });
          }
          fullPath = dest;
          console.log(`[Admin Invoices] PDF für ${invoice.invoiceNumber} on-demand regeneriert`);
        } catch (regenErr) {
          console.error(`[Admin Invoices] PDF-Regenerierung für ${invoice.invoiceNumber} fehlgeschlagen:`, regenErr);
          return res.status(500).json({ message: "Rechnungs-PDF konnte nicht erstellt werden" });
        }
      }

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${invoice.invoiceNumber}.pdf"`
      );
      res.sendFile(fullPath);
    } catch (error) {
      console.error("Error serving admin invoice PDF:", error);
      res.status(500).json({ message: "Fehler beim Abrufen der Rechnung" });
    }
  });

  // Rechnung löschen (Admin). Optional zusätzlich den zugehörigen Payment-Order
  // auf Status "test" setzen, damit der Auto-Backfill in GET /api/invoices die
  // Rechnung nicht beim nächsten Aufruf neu anlegt.
  app.delete("/api/admin/invoices/:id", ...adminEval, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        return res.status(400).json({ message: "Ungültige Rechnungs-ID" });
      }

      const invoice = await storage.getInvoiceById(id);
      if (!invoice) {
        return res.status(404).json({ message: "Rechnung nicht gefunden" });
      }

      const markOrderAsTest = req.body?.markOrderAsTest !== false;

      if (invoice.pdfPath) {
        const fullPath = path.join(INVOICES_DIR, path.basename(invoice.pdfPath));
        try {
          if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
        } catch (pdfErr) {
          console.warn(`[Admin Invoices] PDF konnte nicht gelöscht werden (${fullPath}):`, pdfErr);
        }
      }

      let orderUpdated = false;
      if (markOrderAsTest && invoice.paymentOrderId) {
        try {
          await storage.updatePaymentOrderStatus(invoice.paymentOrderId, "test");
          orderUpdated = true;
        } catch (orderErr) {
          console.warn(
            `[Admin Invoices] PaymentOrder ${invoice.paymentOrderId} konnte nicht auf "test" gesetzt werden:`,
            orderErr
          );
        }
      }

      const deleted = await storage.deleteInvoice(id);
      if (!deleted) {
        return res.status(404).json({ message: "Rechnung nicht gefunden" });
      }

      console.log(
        `[Admin Invoices] Rechnung ${invoice.invoiceNumber} gelöscht (Order ${invoice.paymentOrderId ?? "–"}, markedAsTest=${orderUpdated})`
      );

      res.json({
        success: true,
        deletedInvoiceNumber: invoice.invoiceNumber,
        paymentOrderId: invoice.paymentOrderId ?? null,
        paymentOrderMarkedAsTest: orderUpdated,
      });
    } catch (error) {
      console.error("Error deleting admin invoice:", error);
      res.status(500).json({ message: "Rechnung konnte nicht gelöscht werden" });
    }
  });

  // ─── Admin: Manuelle Credit-Gutschrift ────────────────────────────────────────
  app.post("/api/admin/credits/grant", ...adminEval, async (req: any, res) => {
    try {
      const { userId, email, amount, reason } = req.body;

      if (!amount || typeof amount !== "number" || amount <= 0) {
        return res.status(400).json({ message: "amount muss eine positive Zahl sein" });
      }
      if (!reason || typeof reason !== "string") {
        return res.status(400).json({ message: "reason ist erforderlich" });
      }

      let targetUserId = userId;
      if (!targetUserId && email) {
        const [user] = await db
          .select()
          .from(usersTable)
          .where(eq(usersTable.email, email));
        if (!user) {
          return res.status(404).json({ message: `Kein User mit E-Mail ${email} gefunden` });
        }
        targetUserId = user.id;
      }

      if (!targetUserId) {
        return res.status(400).json({ message: "userId oder email erforderlich" });
      }

      const user = await storage.getUser(targetUserId);
      if (!user) {
        return res.status(404).json({ message: `User ${targetUserId} nicht gefunden` });
      }

      const creditsBefore = await storage.getUserCredits(targetUserId);
      await storage.addCredits(targetUserId, amount);
      const creditsAfter = await storage.getUserCredits(targetUserId);

      const adminId = req.user.uid;
      console.log(`[Admin] Credit-Gutschrift: ${amount} Credits an ${user.email} (${targetUserId}) durch Admin ${adminId}. Grund: ${reason}. Vorher: ${creditsBefore?.credits ?? 0}, Nachher: ${creditsAfter?.credits ?? 0}`);

      res.json({
        success: true,
        userId: targetUserId,
        email: user.email,
        amount,
        creditsBefore: creditsBefore?.credits ?? 0,
        creditsAfter: creditsAfter?.credits ?? 0,
        reason,
      });
    } catch (error) {
      console.error("Error granting credits:", error);
      res.status(500).json({ message: "Fehler bei der Credit-Gutschrift" });
    }
  });

  // ─── Admin: Reconciliation manuell auslösen ─────────────────────────────────
  app.post("/api/admin/reconcile-orders", ...adminEval, async (_req, res) => {
    try {
      const stripeInst = getStripeInstance();
      if (!stripeInst) {
        return res.status(503).json({ message: "Stripe nicht konfiguriert" });
      }

      const mode = getStripeMode();
      const sessionPrefix = mode === "test" ? "cs_test_" : "cs_live_";
      const allOrders = await storage.getStalePendingOrders(5);
      const staleOrders = allOrders.filter((o) => o.stripeSessionId.startsWith(sessionPrefix));
      const results: Array<{ orderId: number; sessionId: string; action: string; userId?: string; credits?: number }> = [];

      for (const order of staleOrders) {
        try {
          const session = await stripeInst.checkout.sessions.retrieve(order.stripeSessionId);
          if (session.payment_status === "paid") {
            const completed = await storage.completePaymentOrder(
              order.id,
              (session.payment_intent as string) || undefined
            );
            if (completed) {
              await storage.addCredits(completed.userId, completed.credits);
              results.push({ orderId: order.id, sessionId: order.stripeSessionId, action: "completed", userId: completed.userId, credits: completed.credits });

              try {
                const user = await storage.getUser(completed.userId);
                const pkg = await storage.getCreditPackage(completed.packageId);
                if (user && pkg) {
                  await createInvoiceForCreditPurchase(storage, completed, user, pkg);
                }
              } catch {}
            } else {
              results.push({ orderId: order.id, sessionId: order.stripeSessionId, action: "already_completed" });
            }
          } else if (session.status === "expired") {
            await storage.updatePaymentOrderStatus(order.id, "expired");
            results.push({ orderId: order.id, sessionId: order.stripeSessionId, action: "expired" });
          } else {
            results.push({ orderId: order.id, sessionId: order.stripeSessionId, action: `no_action (payment_status=${session.payment_status}, status=${session.status})` });
          }
        } catch (err: any) {
          results.push({ orderId: order.id, sessionId: order.stripeSessionId, action: `error: ${err.message}` });
        }
      }

      console.log(`[Admin] Manuelle Reconciliation: ${results.length} Orders geprüft`);
      res.json({ total: staleOrders.length, results });
    } catch (error) {
      console.error("Error in manual reconciliation:", error);
      res.status(500).json({ message: "Fehler bei der Reconciliation" });
    }
  });

  // ─── Admin: Anonymous Analyses ─────────────────────────────────────────────
  app.get("/api/admin/anonymous-analyses", ...adminEval, async (req: any, res) => {
    try {
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
      const offset = (page - 1) * limit;
      const rows = await storage.getAllAnonymousAnalyses({ limit, offset });
      const claimedIds = [...new Set(rows.map((r) => r.claimedByUserId).filter(Boolean))] as string[];
      const userMap = new Map<string, string>();
      if (claimedIds.length > 0) {
        const userRows = await db.select({ id: usersTable.id, email: usersTable.email }).from(usersTable).where(inArray(usersTable.id, claimedIds));
        for (const u of userRows) userMap.set(u.id, u.email ?? "");
      }
      const now = Date.now();
      const list = rows.map((r) => {
        const createdAt = r.createdAt ? new Date(r.createdAt).getTime() : 0;
        const ageHours = (now - createdAt) / (60 * 60 * 1000);
        let status: "aktiv" | "geclaimed" | "abgelaufen" = "aktiv";
        if (r.claimedByUserId) status = "geclaimed";
        else if (ageHours >= 24) status = "abgelaufen";
        const { imageData: _omit, ...rest } = r;
        return {
          ...rest,
          status,
          claimedByUserEmail: r.claimedByUserId ? userMap.get(r.claimedByUserId) ?? null : null,
        };
      });
      res.json({ analyses: list });
    } catch (error: any) {
      console.error("Error listing anonymous analyses:", error);
      res.status(500).json({ message: "Analysen konnten nicht geladen werden" });
    }
  });

  app.delete("/api/admin/anonymous-analyses/:id", ...adminEval, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (Number.isNaN(id)) return res.status(400).json({ message: "Ungültige ID" });
      const row = await storage.getAnonymousAnalysis(id);
      if (!row) return res.status(404).json({ message: "Analyse nicht gefunden" });
      const filePath = path.join(uploadDir, path.basename(row.imageUrl));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      await storage.deleteAnonymousAnalysis(id);
      res.json({ ok: true });
    } catch (error: any) {
      console.error("Error deleting anonymous analysis:", error);
      res.status(500).json({ message: "Löschen fehlgeschlagen" });
    }
  });

  async function cleanupExpiredAnonymousAnalyses(): Promise<void> {
    try {
      const ids = await storage.getExpiredAnonymousAnalysisIds(24);
      for (const id of ids) {
        const row = await storage.getAnonymousAnalysis(id);
        if (row) {
          const filePath = path.join(uploadDir, path.basename(row.imageUrl));
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
          await storage.deleteAnonymousAnalysis(id);
        }
      }
      if (ids.length > 0) console.log(`[Cleanup] ${ids.length} abgelaufene anonyme Analysen entfernt`);
    } catch (err) {
      console.error("[Cleanup] Anonymous analyses:", err);
    }
  }

  // ─── Reconciliation: Pending Orders gegen Stripe prüfen ─────────────────────
  async function reconcilePendingOrders() {
    const stripeInst = getStripeInstance();
    if (!stripeInst) return;

    const mode = getStripeMode();
    const sessionPrefix = mode === "test" ? "cs_test_" : "cs_live_";

    try {
      const allStale = await storage.getStalePendingOrders(10);
      const staleOrders = allStale.filter((o) => o.stripeSessionId.startsWith(sessionPrefix));
      if (staleOrders.length === 0) return;

      console.log(`[Reconciliation] ${staleOrders.length} pending Orders (${mode}) älter als 10 Min. gefunden, prüfe bei Stripe...`);

      for (const order of staleOrders) {
        try {
          const session = await stripeInst.checkout.sessions.retrieve(order.stripeSessionId);

          if (session.payment_status === "paid") {
            const completed = await storage.completePaymentOrder(
              order.id,
              (session.payment_intent as string) || undefined
            );
            if (completed) {
              await storage.addCredits(completed.userId, completed.credits);
              console.log(`[Reconciliation] ✓ Order ${order.id} nachträglich abgeschlossen: ${completed.credits} Credits an User ${completed.userId}`);

              try {
                const user = await storage.getUser(completed.userId);
                const pkg = await storage.getCreditPackage(completed.packageId);
                if (user && pkg) {
                  await createInvoiceForCreditPurchase(storage, completed, user, pkg);
                }
              } catch (invErr) {
                console.error(`[Reconciliation] Rechnungserstellung für Order ${order.id} fehlgeschlagen:`, invErr);
              }
            }
          } else if (session.status === "expired") {
            await storage.updatePaymentOrderStatus(order.id, "expired");
            console.log(`[Reconciliation] Order ${order.id} als expired markiert (Stripe session expired)`);
          } else if (session.payment_status === "unpaid" && session.status === "complete") {
            console.log(`[Reconciliation] Order ${order.id}: session complete aber unpaid (async Zahlung ausstehend)`);
          }
        } catch (err) {
          console.error(`[Reconciliation] Fehler bei Order ${order.id} (session ${order.stripeSessionId}):`, err);
        }
      }
    } catch (err) {
      console.error("[Reconciliation] Gesamtfehler:", err);
    }
  }

  // ─── Admin: Marketing / E-Mail-Kampagnen ─────────────────────────────────

  const segmentFilterSchema = z
    .object({
      hasPurchased: z.boolean().optional(),
      registeredAfter: z.string().datetime().nullish(),
      registeredBefore: z.string().datetime().nullish(),
      registeredAtLeastDaysAgo: z.number().int().min(0).nullish(),
      registeredAtMostDaysAgo: z.number().int().min(0).nullish(),
    })
    .strict();

  const templateBodySchema = z.object({
    name: z.string().min(1).max(200),
    subject: z.string().min(1).max(300),
    preheader: z.string().max(300).nullish(),
    htmlBody: z.string().min(1),
    textBody: z.string().nullish(),
  });

  // Templates
  app.get("/api/admin/marketing/templates", ...adminEval, async (_req, res) => {
    const rows = await db
      .select()
      .from(emailTemplates)
      .orderBy(desc(emailTemplates.updatedAt));
    res.json(rows);
  });

  app.post("/api/admin/marketing/templates", ...adminEval, async (req: any, res) => {
    try {
      const data = templateBodySchema.parse(req.body);
      const [row] = await db
        .insert(emailTemplates)
        .values({ ...data, updatedAt: new Date() })
        .returning();
      res.json(row);
    } catch (err: any) {
      res.status(400).json({ message: err?.message ?? "Ungültige Daten" });
    }
  });

  app.get("/api/admin/marketing/templates/:id", ...adminEval, async (req: any, res) => {
    const id = parseInt(req.params.id, 10);
    const [row] = await db
      .select()
      .from(emailTemplates)
      .where(eq(emailTemplates.id, id));
    if (!row) return res.status(404).json({ message: "Nicht gefunden" });
    res.json(row);
  });

  app.put("/api/admin/marketing/templates/:id", ...adminEval, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const data = templateBodySchema.parse(req.body);
      const [row] = await db
        .update(emailTemplates)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(emailTemplates.id, id))
        .returning();
      if (!row) return res.status(404).json({ message: "Nicht gefunden" });
      res.json(row);
    } catch (err: any) {
      res.status(400).json({ message: err?.message ?? "Ungültige Daten" });
    }
  });

  app.delete("/api/admin/marketing/templates/:id", ...adminEval, async (req: any, res) => {
    const id = parseInt(req.params.id, 10);
    try {
      await db.delete(emailTemplates).where(eq(emailTemplates.id, id));
      res.json({ ok: true });
    } catch (err: any) {
      res.status(409).json({
        message:
          "Template wird noch von einer Kampagne oder einem Flow verwendet und kann nicht gelöscht werden.",
      });
    }
  });

  /** Rendert Subject + HTML für Preview ohne Versand. */
  app.post("/api/admin/marketing/templates/:id/preview", ...adminEval, async (req: any, res) => {
    const id = parseInt(req.params.id, 10);
    const [template] = await db
      .select()
      .from(emailTemplates)
      .where(eq(emailTemplates.id, id));
    if (!template) return res.status(404).json({ message: "Nicht gefunden" });

    const rendered = renderTemplate(template, {
      firstName: req.body?.firstName || "Max",
      email: req.body?.email || "beispiel@example.com",
      userId: "preview-user",
      credits: req.body?.credits ?? 3,
    });
    res.json(rendered);
  });

  /** Testmail an beliebige Adresse. */
  app.post("/api/admin/marketing/templates/:id/test", ...adminEval, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const toEmail = z.string().email().parse(req.body?.to);
      await sendTestEmail(id, toEmail);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(400).json({ message: err?.message ?? "Testversand fehlgeschlagen" });
    }
  });

  // On-demand: Vorlage an ausgewählte Nutzer (aus der Nutzer-Übersicht)
  const directSendSchema = z.object({
    templateId: z.number().int().positive(),
    userIds: z.array(z.string().min(1)).min(1).max(500),
    ignoreCooldown: z.boolean().optional(),
    ignoreOptIn: z.boolean().optional(),
  });

  app.post("/api/admin/marketing/send-to-users", ...adminEval, async (req: any, res) => {
    try {
      const body = directSendSchema.parse(req.body ?? {});
      const result = await sendTemplateToUsers(body.templateId, body.userIds, {
        ignoreCooldown: body.ignoreCooldown,
        ignoreOptIn: body.ignoreOptIn,
      });
      res.json(result);
    } catch (err: any) {
      console.error("[Marketing] send-to-users Fehler:", err);
      res.status(400).json({ message: err?.message ?? "Versand fehlgeschlagen" });
    }
  });

  // Segment-Preview
  app.post("/api/admin/marketing/segments/preview", ...adminEval, async (req: any, res) => {
    try {
      const filter = segmentFilterSchema.parse(req.body ?? {}) as SegmentFilter;
      const recipients = await resolveSegment(filter);
      res.json({
        count: recipients.length,
        sample: recipients.slice(0, 10).map((r) => ({
          email: r.email,
          firstName: r.firstName,
        })),
      });
    } catch (err: any) {
      res.status(400).json({ message: err?.message ?? "Ungültiger Filter" });
    }
  });

  const resendSegmentSyncSchema = z.object({
    segmentId: z.string().trim().min(1).optional(),
    registeredAfter: z.string().datetime().optional(),
  });

  app.post("/api/admin/marketing/resend-segment/sync", ...adminEval, async (req: any, res) => {
    try {
      const body = resendSegmentSyncSchema.parse(req.body ?? {});
      const result = await syncResendMarketingSegment(body);
      res.json(result);
    } catch (err: any) {
      console.error("[Marketing] Resend segment sync Fehler:", err);
      res.status(400).json({ message: err?.message ?? "Resend-Sync fehlgeschlagen" });
    }
  });

  const resendBroadcastSchema = z.object({
    templateId: z.number().int().positive(),
    segmentId: z.string().trim().min(1).optional(),
    send: z.boolean().optional(),
    scheduledAt: z.string().trim().min(1).nullable().optional(),
    name: z.string().trim().min(1).max(200).nullable().optional(),
  });

  app.post("/api/admin/marketing/resend-broadcasts", ...adminEval, async (req: any, res) => {
    try {
      const body = resendBroadcastSchema.parse(req.body ?? {});
      const result = await createResendBroadcastFromTemplate(body);
      res.json(result);
    } catch (err: any) {
      console.error("[Marketing] Resend broadcast Fehler:", err);
      res.status(400).json({ message: err?.message ?? "Resend-Broadcast fehlgeschlagen" });
    }
  });

  // Campaigns
  const campaignBodySchema = z.object({
    name: z.string().min(1).max(200),
    templateId: z.number().int().positive(),
    segmentFilter: segmentFilterSchema,
  });

  app.get("/api/admin/marketing/campaigns", ...adminEval, async (_req, res) => {
    const rows = await db
      .select()
      .from(emailCampaigns)
      .orderBy(desc(emailCampaigns.createdAt));
    res.json(rows);
  });

  app.post("/api/admin/marketing/campaigns", ...adminEval, async (req: any, res) => {
    try {
      const data = campaignBodySchema.parse(req.body);
      const [row] = await db
        .insert(emailCampaigns)
        .values({
          name: data.name,
          templateId: data.templateId,
          segmentFilter: data.segmentFilter,
          status: "draft",
          updatedAt: new Date(),
        })
        .returning();
      res.json(row);
    } catch (err: any) {
      res.status(400).json({ message: err?.message ?? "Ungültige Daten" });
    }
  });

  app.get("/api/admin/marketing/campaigns/:id", ...adminEval, async (req: any, res) => {
    const id = parseInt(req.params.id, 10);
    const [row] = await db
      .select()
      .from(emailCampaigns)
      .where(eq(emailCampaigns.id, id));
    if (!row) return res.status(404).json({ message: "Nicht gefunden" });
    res.json(row);
  });

  app.put("/api/admin/marketing/campaigns/:id", ...adminEval, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const [existing] = await db
        .select()
        .from(emailCampaigns)
        .where(eq(emailCampaigns.id, id));
      if (!existing) return res.status(404).json({ message: "Nicht gefunden" });
      if (existing.status !== "draft") {
        return res
          .status(400)
          .json({ message: "Nur Entwürfe können bearbeitet werden." });
      }
      const data = campaignBodySchema.parse(req.body);
      const [row] = await db
        .update(emailCampaigns)
        .set({
          name: data.name,
          templateId: data.templateId,
          segmentFilter: data.segmentFilter,
          updatedAt: new Date(),
        })
        .where(eq(emailCampaigns.id, id))
        .returning();
      res.json(row);
    } catch (err: any) {
      res.status(400).json({ message: err?.message ?? "Ungültige Daten" });
    }
  });

  app.delete("/api/admin/marketing/campaigns/:id", ...adminEval, async (req: any, res) => {
    const id = parseInt(req.params.id, 10);
    await db.delete(emailCampaigns).where(eq(emailCampaigns.id, id));
    res.json({ ok: true });
  });

  /** Kampagne starten – läuft asynchron im Hintergrund. */
  app.post("/api/admin/marketing/campaigns/:id/send", ...adminEval, async (req: any, res) => {
    const id = parseInt(req.params.id, 10);
    const [existing] = await db
      .select()
      .from(emailCampaigns)
      .where(eq(emailCampaigns.id, id));
    if (!existing) return res.status(404).json({ message: "Nicht gefunden" });
    if (existing.status === "sending" || existing.status === "sent") {
      return res.status(400).json({ message: `Status ist ${existing.status}` });
    }
    // Fire-and-forget, damit die UI nicht blockiert.
    runCampaign(id).catch((err) =>
      console.error(`[Marketing] runCampaign(${id}) Fehler:`, err),
    );
    res.json({ ok: true, message: "Versand gestartet" });
  });

  app.get("/api/admin/marketing/campaigns/:id/sends", ...adminEval, async (req: any, res) => {
    const id = parseInt(req.params.id, 10);
    const rows = await listSendsForCampaign(id);
    res.json(rows);
  });

  // Flows
  const flowTriggerSchema = z.enum(flowTriggerTypes);
  const flowBodySchema = z.object({
    name: z.string().min(1).max(200),
    description: z.string().nullish(),
    triggerType: flowTriggerSchema,
    triggerConfig: z
      .object({
        days: z.number().int().min(0).optional(),
        threshold: z.number().int().min(0).optional(),
      })
      .nullish(),
    enabled: z.boolean().optional(),
  });
  const flowStepBodySchema = z.object({
    stepOrder: z.number().int().min(0),
    delayHours: z.number().int().min(0),
    templateId: z.number().int().positive(),
  });

  app.get("/api/admin/marketing/flows", ...adminEval, async (_req, res) => {
    const flows = await db
      .select()
      .from(emailFlows)
      .orderBy(desc(emailFlows.updatedAt));
    const steps = await db.select().from(emailFlowSteps);
    const stepsByFlow = new Map<number, typeof steps>();
    for (const s of steps) {
      const arr = stepsByFlow.get(s.flowId) ?? [];
      arr.push(s);
      stepsByFlow.set(s.flowId, arr);
    }
    res.json(
      flows.map((f) => ({
        ...f,
        steps: (stepsByFlow.get(f.id) ?? []).sort(
          (a, b) => a.stepOrder - b.stepOrder,
        ),
      })),
    );
  });

  app.post("/api/admin/marketing/flows", ...adminEval, async (req: any, res) => {
    try {
      const data = flowBodySchema.parse(req.body);
      const [row] = await db
        .insert(emailFlows)
        .values({
          name: data.name,
          description: data.description ?? null,
          triggerType: data.triggerType,
          triggerConfig: data.triggerConfig ?? null,
          enabled: data.enabled ?? false,
          updatedAt: new Date(),
        })
        .returning();
      res.json(row);
    } catch (err: any) {
      res.status(400).json({ message: err?.message ?? "Ungültige Daten" });
    }
  });

  app.put("/api/admin/marketing/flows/:id", ...adminEval, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const data = flowBodySchema.parse(req.body);
      const [row] = await db
        .update(emailFlows)
        .set({
          name: data.name,
          description: data.description ?? null,
          triggerType: data.triggerType,
          triggerConfig: data.triggerConfig ?? null,
          enabled: data.enabled ?? false,
          updatedAt: new Date(),
        })
        .where(eq(emailFlows.id, id))
        .returning();
      if (!row) return res.status(404).json({ message: "Nicht gefunden" });
      res.json(row);
    } catch (err: any) {
      res.status(400).json({ message: err?.message ?? "Ungültige Daten" });
    }
  });

  app.delete("/api/admin/marketing/flows/:id", ...adminEval, async (req: any, res) => {
    const id = parseInt(req.params.id, 10);
    await db.delete(emailFlows).where(eq(emailFlows.id, id));
    res.json({ ok: true });
  });

  app.post("/api/admin/marketing/flows/:id/steps", ...adminEval, async (req: any, res) => {
    try {
      const flowId = parseInt(req.params.id, 10);
      const data = flowStepBodySchema.parse(req.body);
      const [row] = await db
        .insert(emailFlowSteps)
        .values({
          flowId,
          stepOrder: data.stepOrder,
          delayHours: data.delayHours,
          templateId: data.templateId,
        })
        .returning();
      res.json(row);
    } catch (err: any) {
      res.status(400).json({ message: err?.message ?? "Ungültige Daten" });
    }
  });

  app.put(
    "/api/admin/marketing/flows/:flowId/steps/:stepId",
    ...adminEval,
    async (req: any, res) => {
      try {
        const stepId = parseInt(req.params.stepId, 10);
        const data = flowStepBodySchema.parse(req.body);
        const [row] = await db
          .update(emailFlowSteps)
          .set({
            stepOrder: data.stepOrder,
            delayHours: data.delayHours,
            templateId: data.templateId,
          })
          .where(eq(emailFlowSteps.id, stepId))
          .returning();
        if (!row) return res.status(404).json({ message: "Nicht gefunden" });
        res.json(row);
      } catch (err: any) {
        res.status(400).json({ message: err?.message ?? "Ungültige Daten" });
      }
    },
  );

  app.delete(
    "/api/admin/marketing/flows/:flowId/steps/:stepId",
    ...adminEval,
    async (req: any, res) => {
      const stepId = parseInt(req.params.stepId, 10);
      await db.delete(emailFlowSteps).where(eq(emailFlowSteps.id, stepId));
      res.json({ ok: true });
    },
  );

  /** Manuell einen Scheduler-Tick auslösen (für Tests). */
  app.post("/api/admin/marketing/flows/run-now", ...adminEval, async (_req, res) => {
    runFlowScheduler().catch((err) =>
      console.error("[Marketing] manual flow tick failed:", err),
    );
    res.json({ ok: true });
  });

  // Sends-Log
  app.get("/api/admin/marketing/sends", ...adminEval, async (req: any, res) => {
    const limit = Math.min(
      500,
      Math.max(1, parseInt(String(req.query.limit ?? "100"), 10)),
    );
    const rows = await listRecentSends(limit);
    res.json(rows);
  });

  // ─── Öffentliche Unsubscribe-Route ───────────────────────────────────────

  app.get("/api/unsubscribe", async (req, res) => {
    const uid = typeof req.query.uid === "string" ? req.query.uid : "";
    const token = typeof req.query.token === "string" ? req.query.token : "";

    const renderPage = (title: string, body: string) => {
      res
        .type("html")
        .send(`<!DOCTYPE html><html lang="de"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} – MormorsBreve</title>
<style>
  body{margin:0;font-family:Helvetica,Arial,sans-serif;background:#f0ebe3;color:#2a1f14;}
  .wrap{max-width:520px;margin:80px auto;padding:40px;background:#fff;border:1px solid #d9d0c3;border-radius:6px;box-shadow:0 2px 12px rgba(0,0,0,.04);}
  h1{margin:0 0 12px;font-size:22px;}
  p{line-height:1.6;font-size:15px;color:#594a3a;margin:0 0 12px;}
  a{color:#7a6b56;}
</style></head><body><div class="wrap">${body}</div></body></html>`);
    };

    if (!uid || !token || !verifyUnsubscribeToken(uid, token)) {
      return renderPage(
        "Ungültiger Link",
        `<h1>Ungültiger Abmeldelink</h1><p>Dieser Link ist ungültig oder abgelaufen. Bitte melden Sie sich in Ihrem Konto an und passen Sie den Newsletter-Empfang in den Einstellungen an.</p><p><a href="${APP_BASE_URL_FALLBACK()}">Zur Startseite</a></p>`,
      );
    }

    try {
      const [user] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, uid));
      if (!user) {
        return renderPage(
          "Nicht gefunden",
          `<h1>Konto nicht gefunden</h1><p>Wir konnten Ihr Konto nicht finden. Möglicherweise wurde es bereits gelöscht.</p>`,
        );
      }

      await db
        .update(usersTable)
        .set({ newsletterOptIn: false, updatedAt: new Date() })
        .where(eq(usersTable.id, uid));

      return renderPage(
        "Abgemeldet",
        `<h1>Sie sind abgemeldet.</h1>
        <p>Die E-Mail-Adresse <strong>${(user.email || "").replace(/</g, "&lt;")}</strong> erhält keine Marketing-Mails mehr von MormorsBreve.</p>
        <p>Wichtige Transaktionsmails (z. B. zu Ihren Aufträgen oder Zahlungen) bekommen Sie weiterhin.</p>
        <p>Sie können den Newsletter jederzeit in Ihren <a href="${APP_BASE_URL_FALLBACK()}/app/settings">Einstellungen</a> wieder aktivieren.</p>`,
      );
    } catch (err: any) {
      console.error("[Unsubscribe]", err);
      return renderPage(
        "Fehler",
        `<h1>Abmeldung fehlgeschlagen</h1><p>Bitte versuchen Sie es später erneut oder passen Sie den Newsletter-Empfang in Ihren <a href="${APP_BASE_URL_FALLBACK()}/app/settings">Einstellungen</a> an.</p>`,
      );
    }
  });

  // POST für List-Unsubscribe-One-Click (RFC 8058) – dieselbe Logik.
  app.post("/api/unsubscribe", async (req, res) => {
    const uid =
      (typeof req.query.uid === "string" && req.query.uid) ||
      (typeof req.body?.uid === "string" && req.body.uid) ||
      "";
    const token =
      (typeof req.query.token === "string" && req.query.token) ||
      (typeof req.body?.token === "string" && req.body.token) ||
      "";
    if (!uid || !token || !verifyUnsubscribeToken(uid, token)) {
      return res.status(400).json({ ok: false });
    }
    try {
      await db
        .update(usersTable)
        .set({ newsletterOptIn: false, updatedAt: new Date() })
        .where(eq(usersTable.id, uid));
      res.json({ ok: true });
    } catch (err) {
      console.error("[Unsubscribe POST]", err);
      res.status(500).json({ ok: false });
    }
  });

  // Resend Contact Webhook: spiegelt Broadcast-Abmeldungen zurück in die App.
  app.post("/api/webhooks/resend", async (req: any, res) => {
    try {
      const result = await handleResendWebhook(
        req.rawBody,
        req.body,
        req.headers as Record<string, string | string[] | undefined>,
      );
      if (result.action === "unsubscribed") {
        console.log(
          `[Resend Webhook] ${result.email} lokal abgemeldet (${result.updatedUsers ?? 0} Nutzer)`,
        );
      }
      res.json(result);
    } catch (err: any) {
      console.error("[Resend Webhook] Fehler:", err);
      res.status(400).json({ ok: false, message: err?.message ?? "Webhook ungültig" });
    }
  });

  // Mockup-Vorschau (Conversion Quick Wins) – nur für Admin-Zugriff via direkter URL
  app.get("/api/mockup-vorschau", (_req, res) => {
    const mockupPath = path.resolve(process.cwd(), "mockups", "index.html");
    if (fs.existsSync(mockupPath)) {
      res.sendFile(mockupPath);
    } else {
      res.status(404).send("Mockup-Datei nicht gefunden.");
    }
  });

  // Seed data and recover stuck jobs on startup
  seedPackages().catch(console.error);
  recoverStuckJobs().catch(console.error);
  recoverStuckTtsGenerations().catch(console.error);
  cleanupExpiredAnonymousAnalyses().catch(console.error);
  setInterval(() => recoverStuckJobs().catch(console.error), 5 * 60 * 1000);
  setInterval(() => recoverStuckTtsGenerations().catch(console.error), 5 * 60 * 1000);
  setInterval(() => cleanupExpiredAnonymousAnalyses().catch(console.error), 30 * 60 * 1000);
  setInterval(() => reconcilePendingOrders().catch(console.error), 5 * 60 * 1000);
  // Marketing-Flow-Scheduler: alle 15 Minuten prüfen
  setInterval(
    () =>
      runFlowScheduler().catch((err) =>
        console.error("[Marketing] flow scheduler tick failed:", err),
      ),
    15 * 60 * 1000,
  );

  return httpServer;
}

function APP_BASE_URL_FALLBACK(): string {
  return (process.env.APP_URL ?? "https://mormorsbreve.dk").replace(/\/$/, "");
}
