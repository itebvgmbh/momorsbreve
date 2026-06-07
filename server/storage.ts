import {
  userCredits,
  creditPackages,
  transcriptionJobs,
  transcriptionPages,
  paymentOrders,
  invoices,
  evaluationDocuments,
  evaluationRuns,
  evaluationResults,
  supportConversations,
  supportMessages,
  users,
  usedFreeCredits,
  type UserCredits,
  type InsertUserCredits,
  type CreditPackage,
  type InsertCreditPackage,
  type TranscriptionJob,
  type InsertTranscriptionJob,
  type TranscriptionPage,
  type InsertTranscriptionPage,
  type PaymentOrder,
  type InsertPaymentOrder,
  type Invoice,
  type InsertInvoice,
  type EvaluationDocument,
  type InsertEvaluationDocument,
  type EvaluationRun,
  type InsertEvaluationRun,
  type EvaluationResult,
  type InsertEvaluationResult,
  type SupportConversation,
  type InsertSupportConversation,
  type SupportMessage,
  type InsertSupportMessage,
  type TranscriptionJobWithSnippet,
  ttsGenerations,
  expertAccounts,
  humanTranscriptionRequests,
  humanTranscriptionResults,
  type ExpertAccount,
  type InsertExpertAccount,
  type HumanTranscriptionRequest,
  type InsertHumanTranscriptionRequest,
  type HumanTranscriptionResult,
  type InsertHumanTranscriptionResult,
  anonymousAnalyses,
  type AnonymousAnalysis,
  type InsertAnonymousAnalysis,
  type User,
  type TourState,
  appSettings,
  adwordsDailyStats,
  type AdwordsDailyStat,
  ctaVariantStats,
  heroVariantStats,
} from "@shared/schema";
import { db } from "./db";
import {
  eq,
  asc,
  desc,
  and,
  or,
  sql,
  ne,
  inArray,
  lt,
  gte,
  isNull,
  like,
  sum,
} from "drizzle-orm";
import crypto from "crypto";

export const INITIAL_FREE_CREDITS = 3;

const TEST_EMAILS = ["vxoooxv@googlemail.com"];

/** Thrown when a valid auth token references a user_id that no longer exists in `users` (e.g. after account deletion). */
export class UserNotInDatabaseError extends Error {
  constructor() {
    super("USER_NOT_IN_DATABASE");
    this.name = "UserNotInDatabaseError";
  }
}

function hashEmail(email: string): string {
  return crypto.createHash("sha256").update(email.toLowerCase().trim()).digest("hex");
}

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

function getExpertMissingFields(expert: Partial<ExpertAccount>): string[] {
  const missing: string[] = [];
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

export interface IStorage {
  getUser(userId: string): Promise<User | undefined>;
  getUserTourState(userId: string): Promise<TourState>;
  updateUserTourState(userId: string, partial: Partial<TourState>): Promise<TourState>;
  getUserCredits(userId: string): Promise<UserCredits | undefined>;
  ensureUserCredits(userId: string): Promise<UserCredits>;
  setUserCredits(userId: string, credits: number): Promise<UserCredits>;
  addCredits(userId: string, amount: number): Promise<UserCredits>;
  deductCredits(userId: string, amount: number): Promise<UserCredits>;

  getCreditPackages(): Promise<CreditPackage[]>;
  getCreditPackage(id: number): Promise<CreditPackage | undefined>;
  createCreditPackage(pkg: InsertCreditPackage): Promise<CreditPackage>;
  updateCreditPackage(id: number, data: Partial<CreditPackage>): Promise<CreditPackage>;

  getTranscriptionJob(id: number): Promise<TranscriptionJob | undefined>;
  getTranscriptionJobsByUser(userId: string): Promise<TranscriptionJobWithSnippet[]>;
  createTranscriptionJob(job: InsertTranscriptionJob): Promise<TranscriptionJob>;
  updateTranscriptionJob(id: number, data: Partial<TranscriptionJob>): Promise<TranscriptionJob>;
  updateTranscriptionJobStatus(id: number, status: string): Promise<TranscriptionJob>;
  getStuckJobs(excludeJobIds?: number[]): Promise<{ job: TranscriptionJob; pagesToProcess: TranscriptionPage[] }[]>;
  getStuckPreviewPages(excludeJobIds?: number[]): Promise<{ job: TranscriptionJob; page: TranscriptionPage }[]>;

  getTranscriptionPages(jobId: number): Promise<TranscriptionPage[]>;
  getTranscriptionPage(id: number): Promise<TranscriptionPage | undefined>;
  getTranscriptionPageByImageUrl(imageUrl: string): Promise<TranscriptionPage | undefined>;
  createTranscriptionPage(page: InsertTranscriptionPage): Promise<TranscriptionPage>;
  createTranscriptionPages(pages: InsertTranscriptionPage[]): Promise<TranscriptionPage[]>;
  updateTranscriptionPage(
    id: number,
    data: Partial<TranscriptionPage>
  ): Promise<TranscriptionPage>;

  // Payment Orders
  createPaymentOrder(order: InsertPaymentOrder): Promise<PaymentOrder>;
  getPaymentOrderBySessionId(sessionId: string): Promise<PaymentOrder | undefined>;
  updatePaymentOrderStatus(
    id: number,
    status: string,
    paymentIntentId?: string
  ): Promise<PaymentOrder>;
  completePaymentOrder(
    orderId: number,
    paymentIntentId?: string
  ): Promise<PaymentOrder | undefined>;
  getPaymentOrdersByUser(userId: string): Promise<PaymentOrder[]>;
  getStalePendingOrders(olderThanMinutes: number): Promise<PaymentOrder[]>;

  // Invoices
  createInvoice(data: InsertInvoice): Promise<Invoice>;
  getAllInvoices(): Promise<Invoice[]>;
  getInvoicesByUser(userId: string): Promise<Invoice[]>;
  getInvoiceById(id: number): Promise<Invoice | undefined>;
  updateInvoice(id: number, data: Partial<Invoice>): Promise<Invoice>;
  deleteInvoice(id: number): Promise<Invoice | undefined>;
  getNextInvoiceNumber(): Promise<string>;

  // Evaluation Documents
  getEvaluationDocuments(): Promise<EvaluationDocument[]>;
  getEvaluationDocument(id: number): Promise<EvaluationDocument | undefined>;
  createEvaluationDocument(
    doc: InsertEvaluationDocument
  ): Promise<EvaluationDocument>;
  updateEvaluationDocument(
    id: number,
    data: Partial<EvaluationDocument>
  ): Promise<EvaluationDocument>;
  deleteEvaluationDocument(id: number): Promise<void>;

  // Evaluation Runs
  getEvaluationRuns(): Promise<EvaluationRun[]>;
  getEvaluationRun(id: number): Promise<EvaluationRun | undefined>;
  createEvaluationRun(run: InsertEvaluationRun): Promise<EvaluationRun>;
  updateEvaluationRun(
    id: number,
    data: Partial<EvaluationRun>
  ): Promise<EvaluationRun>;
  deleteEvaluationRun(id: number): Promise<void>;

  // Evaluation Results
  getEvaluationResultsByRunId(runId: number): Promise<EvaluationResult[]>;
  createEvaluationResult(
    result: InsertEvaluationResult
  ): Promise<EvaluationResult>;
  updateEvaluationResult(
    id: number,
    data: Partial<EvaluationResult>
  ): Promise<EvaluationResult>;

  // Support Messages
  getSupportConversationsByUser(userId: string): Promise<(SupportConversation & { lastMessage?: SupportMessage; unreadCount: number })[]>;
  getAllSupportConversations(statusFilter?: string): Promise<(SupportConversation & { lastMessage?: SupportMessage; userName?: string; userEmail?: string })[]>;
  getSupportConversation(id: number): Promise<SupportConversation | undefined>;
  createSupportConversation(data: InsertSupportConversation): Promise<SupportConversation>;
  getSupportMessages(conversationId: number): Promise<SupportMessage[]>;
  createSupportMessage(data: InsertSupportMessage): Promise<SupportMessage>;
  updateConversationStatus(id: number, status: string): Promise<SupportConversation>;
  getUnreadCountForUser(userId: string): Promise<number>;

  // Expert Accounts
  getExpertAccounts(): Promise<ExpertAccount[]>;
  getExpertAccount(id: number): Promise<ExpertAccount | undefined>;
  getActiveExpertAccountByEmail(email: string): Promise<ExpertAccount | undefined>;
  getFirstActiveExpertAccount(): Promise<ExpertAccount | undefined>;
  createExpertAccount(data: InsertExpertAccount): Promise<ExpertAccount>;
  updateExpertAccount(id: number, data: Partial<ExpertAccount>): Promise<ExpertAccount>;

  // Human Transcription Requests
  createHumanTranscriptionRequest(
    data: InsertHumanTranscriptionRequest
  ): Promise<HumanTranscriptionRequest>;
  getHumanTranscriptionRequest(
    id: number
  ): Promise<HumanTranscriptionRequest | undefined>;
  getHumanTranscriptionRequestsByUser(
    userId: string
  ): Promise<HumanTranscriptionRequest[]>;
  getAllHumanTranscriptionRequests(): Promise<HumanTranscriptionRequest[]>;
  getHumanTranscriptionRequestsByExpert(
    expertAccountId: number
  ): Promise<HumanTranscriptionRequest[]>;
  getCompletedHumanTranscriptionRequestForJob(
    jobId: number,
    userId: string
  ): Promise<HumanTranscriptionRequest | undefined>;
  updateHumanTranscriptionRequest(
    id: number,
    data: Partial<HumanTranscriptionRequest>
  ): Promise<HumanTranscriptionRequest>;
  getHumanTranscriptionRequestBySessionId(
    sessionId: string
  ): Promise<HumanTranscriptionRequest | undefined>;
  getHumanTranscriptionResultsByRequest(
    requestId: number
  ): Promise<HumanTranscriptionResult[]>;
  upsertHumanTranscriptionResults(
    requestId: number,
    results: InsertHumanTranscriptionResult[]
  ): Promise<HumanTranscriptionResult[]>;

  // Anonymous analyses (kostenlose KI-Analyse ohne Login)
  createAnonymousAnalysis(data: InsertAnonymousAnalysis): Promise<AnonymousAnalysis>;
  getAnonymousAnalysisByToken(token: string): Promise<AnonymousAnalysis | undefined>;
  getAnonymousAnalysis(id: number): Promise<AnonymousAnalysis | undefined>;
  updateAnonymousAnalysis(id: number, data: Partial<AnonymousAnalysis>): Promise<AnonymousAnalysis>;
  deleteAnonymousAnalysis(id: number): Promise<void>;
  getAllAnonymousAnalyses(options?: { limit?: number; offset?: number }): Promise<AnonymousAnalysis[]>;
  getAnonymousAnalysisByImageUrl(imageUrl: string): Promise<AnonymousAnalysis | undefined>;
  getExpiredAnonymousAnalysisIds(olderThanHours?: number): Promise<number[]>;

  // Revenue Stats (Admin Dashboard)
  getRevenueStats(includeAdmin?: boolean): Promise<RevenueStats>;

  // User Stats (Admin Dashboard)
  getUserStats(): Promise<UserStats>;

  // Paying-user registration heatmap (weekday x hour)
  getPayingUserRegistrationHeatmap(): Promise<PayingUserHeatmapPoint[]>;

  // AdWords daily stats
  getAdwordsDailyStats(): Promise<AdwordsDailyStat[]>;
  upsertAdwordsDaily(rows: AdwordsImportRow[]): Promise<number>;

  // App Settings
  getSetting(key: string): Promise<unknown | undefined>;
  setSetting(key: string, value: unknown): Promise<void>;
  getAllSettings(): Promise<Record<string, unknown>>;

  // CTA-Varianten-Statistiken (A/B-Test)
  getCtaStats(): Promise<{ variantId: number; impressions: number; claims: number }[]>;
  incrementCtaImpression(variantId: number): Promise<void>;
  incrementCtaClaim(variantId: number): Promise<void>;
  resetCtaStats(): Promise<void>;
  getHeroStats(): Promise<{ variantId: number; impressions: number; conversions: number }[]>;
  incrementHeroImpression(variantId: number): Promise<void>;
  incrementHeroConversion(variantId: number): Promise<void>;
  resetHeroStats(): Promise<void>;
}

export interface RevenuePeriod {
  grossEur: number;
  netEur: number;
  vatEur: number;
  count: number;
}

export interface RevenueTimeSeriesPoint {
  date: string;
  grossEur: number;
  netEur: number;
  purchases: number;
}

export interface RevenueRecentInvoice {
  id: number;
  invoiceNumber: string;
  createdAt: string;
  type: string;
  grossAmountEur: number;
  netAmountEur: number;
  description: string;
  customerEmail: string | null;
}

export interface RevenueStats {
  today: RevenuePeriod;
  thisWeek: RevenuePeriod;
  thisMonth: RevenuePeriod;
  allTime: RevenuePeriod;
  timeSeries: RevenueTimeSeriesPoint[];
  /** Letzte Rechnungen (neueste zuerst) für die Admin-Historie */
  recentInvoices: RevenueRecentInvoice[];
}

export interface PurchaseDistribution {
  noPurchase: number;
  onePurchase: number;
  twoPlusPurchases: number;
}

export interface RegistrationTimeSeriesPoint {
  date: string;
  count: number;
}

export interface UserListItem {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  credits: number;
  totalPurchasedCredits: number;
  newsletterOptIn: boolean;
  createdAt: string;
  updatedAt: string;
  purchaseCount: number;
  audioCount: number;
}

export interface UserStats {
  purchaseDistribution: PurchaseDistribution;
  registrationTimeSeries: RegistrationTimeSeriesPoint[];
  userList: UserListItem[];
}

export interface PayingUserHeatmapPoint {
  dow: number;
  hour: number;
  count: number;
  revenueCents: number;
}

export interface AdwordsImportRow {
  date: string;
  costCents: number;
  clicks: number;
  conversions: number;
  impressions: number;
}

function revenueNum(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "bigint") return Number(v);
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

class DatabaseStorage implements IStorage {
  async getUser(userId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    return user;
  }

  async getUserTourState(userId: string): Promise<TourState> {
    const user = await this.getUser(userId);
    return (user?.tourState as TourState | null) ?? {};
  }

  async updateUserTourState(
    userId: string,
    partial: Partial<TourState>
  ): Promise<TourState> {
    const current = await this.getUserTourState(userId);
    const merged: TourState = { ...current, ...partial };
    if (partial.completedTours) {
      const set = new Set([
        ...(current.completedTours ?? []),
        ...partial.completedTours,
      ]);
      merged.completedTours = Array.from(set);
    }
    if (partial.dismissedTours) {
      const set = new Set([
        ...(current.dismissedTours ?? []),
        ...partial.dismissedTours,
      ]);
      merged.dismissedTours = Array.from(set);
    }
    merged.lastSeenAt = new Date().toISOString();
    await db
      .update(users)
      .set({ tourState: merged, updatedAt: new Date() })
      .where(eq(users.id, userId));
    return merged;
  }

  async getUserCredits(userId: string): Promise<UserCredits | undefined> {
    const [result] = await db
      .select()
      .from(userCredits)
      .where(eq(userCredits.userId, userId));
    return result;
  }

  async ensureUserCredits(userId: string): Promise<UserCredits> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new UserNotInDatabaseError();
    }

    const existing = await this.getUserCredits(userId);
    if (existing) {
      return existing;
    }

    let initialCredits = INITIAL_FREE_CREDITS;

    if (user.email) {
      const emailHash = hashEmail(user.email);

      const [hashRecord] = await db
        .select()
        .from(usedFreeCredits)
        .where(eq(usedFreeCredits.emailHash, emailHash));

      if (hashRecord) {
        initialCredits = 0;
        await db
          .update(usedFreeCredits)
          .set({ blockCount: sql`${usedFreeCredits.blockCount} + 1` })
          .where(eq(usedFreeCredits.emailHash, emailHash));
      } else {
        await db
          .insert(usedFreeCredits)
          .values({ emailHash })
          .onConflictDoNothing({ target: usedFreeCredits.emailHash });
      }
    }

    await db
      .insert(userCredits)
      .values({ userId, credits: initialCredits })
      .onConflictDoNothing({ target: userCredits.userId });

    const result = await this.getUserCredits(userId);
    if (!result) {
      throw new Error("Failed to ensure user credits");
    }
    return result;
  }

  async setUserCredits(userId: string, credits: number): Promise<UserCredits> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new UserNotInDatabaseError();
    }

    const [result] = await db
      .insert(userCredits)
      .values({ userId, credits, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: userCredits.userId,
        set: {
          credits,
          updatedAt: new Date(),
        },
      })
      .returning();

    if (!result) {
      throw new Error("Failed to set user credits");
    }
    return result;
  }

  async isReturningUser(userId: string): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user?.email || !user.createdAt) return false;

    const emailHash = hashEmail(user.email);
    const [record] = await db
      .select()
      .from(usedFreeCredits)
      .where(eq(usedFreeCredits.emailHash, emailHash));

    if (!record?.grantedAt) return false;

    const userCreatedMs = new Date(user.createdAt).getTime();
    const hashGrantedMs = record.grantedAt.getTime();
    return userCreatedMs - hashGrantedMs > 60_000;
  }

  async addCredits(userId: string, amount: number): Promise<UserCredits> {
    await this.ensureUserCredits(userId);
    const [result] = await db
      .update(userCredits)
      .set({
        credits: sql`${userCredits.credits} + ${amount}`,
        updatedAt: new Date(),
      })
      .where(eq(userCredits.userId, userId))
      .returning();
    return result;
  }

  async deductCredits(userId: string, amount: number): Promise<UserCredits> {
    const [result] = await db
      .update(userCredits)
      .set({
        credits: sql`${userCredits.credits} - ${amount}`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(userCredits.userId, userId),
          sql`${userCredits.credits} >= ${amount}`
        )
      )
      .returning();

    if (!result) {
      throw new Error("Nicht genügend Credits");
    }
    return result;
  }

  async getCreditPackages(): Promise<CreditPackage[]> {
    return db.select().from(creditPackages).orderBy(asc(creditPackages.pages));
  }

  async getCreditPackage(id: number): Promise<CreditPackage | undefined> {
    const [pkg] = await db
      .select()
      .from(creditPackages)
      .where(eq(creditPackages.id, id));
    return pkg;
  }

  async createCreditPackage(pkg: InsertCreditPackage): Promise<CreditPackage> {
    const [created] = await db
      .insert(creditPackages)
      .values(pkg)
      .returning();
    return created;
  }

  async updateCreditPackage(
    id: number,
    data: Partial<CreditPackage>
  ): Promise<CreditPackage> {
    const [updated] = await db
      .update(creditPackages)
      .set(data)
      .where(eq(creditPackages.id, id))
      .returning();
    if (!updated) throw new Error("Credit package not found");
    return updated;
  }

  async getTranscriptionJob(
    id: number
  ): Promise<TranscriptionJob | undefined> {
    const [job] = await db
      .select()
      .from(transcriptionJobs)
      .where(eq(transcriptionJobs.id, id));
    return job;
  }

  async getTranscriptionJobsByUser(
    userId: string
  ): Promise<TranscriptionJobWithSnippet[]> {
    const jobs = await db
      .select()
      .from(transcriptionJobs)
      .where(eq(transcriptionJobs.userId, userId))
      .orderBy(desc(transcriptionJobs.createdAt));

    if (jobs.length === 0) return [];

    const jobIds = jobs.map((j) => j.id);
    const pages = await db
      .select({
        jobId: transcriptionPages.jobId,
        pageNumber: transcriptionPages.pageNumber,
        transcription: transcriptionPages.transcription,
        transcriptionCompleted: transcriptionPages.transcriptionCompleted,
        status: transcriptionPages.status,
      })
      .from(transcriptionPages)
      .where(inArray(transcriptionPages.jobId, jobIds))
      .orderBy(transcriptionPages.jobId, transcriptionPages.pageNumber);

    const snippetMap = new Map<number, string>();
    const completedMap = new Map<number, number>();
    for (const page of pages) {
      if (!snippetMap.has(page.jobId)) {
        const text = page.transcriptionCompleted || page.transcription || "";
        if (text) snippetMap.set(page.jobId, text.slice(0, 100));
      }
      if (page.status === "completed") {
        completedMap.set(page.jobId, (completedMap.get(page.jobId) ?? 0) + 1);
      }
    }

    const audioRows = await db
      .select({ jobId: ttsGenerations.jobId })
      .from(ttsGenerations)
      .where(
        and(
          inArray(ttsGenerations.jobId, jobIds),
          eq(ttsGenerations.status, "completed"),
        ),
      );
    const audioSet = new Set(audioRows.map((r) => r.jobId));

    return jobs.map((job) => ({
      ...job,
      textSnippet: snippetMap.get(job.id) ?? null,
      completedPages: completedMap.get(job.id) ?? 0,
      hasAudio: audioSet.has(job.id),
    }));
  }

  async createTranscriptionJob(
    job: InsertTranscriptionJob
  ): Promise<TranscriptionJob> {
    const [created] = await db
      .insert(transcriptionJobs)
      .values(job)
      .returning();
    return created;
  }

  async updateTranscriptionJob(
    id: number,
    data: Partial<TranscriptionJob>
  ): Promise<TranscriptionJob> {
    const [updated] = await db
      .update(transcriptionJobs)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(transcriptionJobs.id, id))
      .returning();
    return updated;
  }

  async updateTranscriptionJobStatus(
    id: number,
    status: string
  ): Promise<TranscriptionJob> {
    return this.updateTranscriptionJob(id, { status });
  }

  async getStuckJobs(excludeJobIds: number[] = []): Promise<{ job: TranscriptionJob; pagesToProcess: TranscriptionPage[] }[]> {
    const stuckJobs = await db
      .select()
      .from(transcriptionJobs)
      .where(eq(transcriptionJobs.status, "processing"));
    if (stuckJobs.length === 0) return [];

    const excluded = new Set(excludeJobIds);
    const candidates = stuckJobs.filter((j) => !excluded.has(j.id));
    if (candidates.length === 0) return [];

    const result: { job: TranscriptionJob; pagesToProcess: TranscriptionPage[] }[] = [];
    for (const job of candidates) {
      await db
        .update(transcriptionPages)
        .set({ status: "pending" })
        .where(and(eq(transcriptionPages.jobId, job.id), eq(transcriptionPages.status, "processing")));
      const pagesToProcess = await db
        .select()
        .from(transcriptionPages)
        .where(and(eq(transcriptionPages.jobId, job.id), eq(transcriptionPages.status, "pending")))
        .orderBy(transcriptionPages.pageNumber);
      if (pagesToProcess.length > 0) {
        result.push({ job, pagesToProcess });
      } else {
        await this.updateTranscriptionJobStatus(job.id, "completed");
      }
    }
    return result;
  }

  async getStuckPreviewPages(excludeJobIds: number[] = []): Promise<{ job: TranscriptionJob; page: TranscriptionPage }[]> {
    const stuckPages = await db
      .select({
        page: transcriptionPages,
        job: transcriptionJobs,
      })
      .from(transcriptionPages)
      .innerJoin(transcriptionJobs, eq(transcriptionPages.jobId, transcriptionJobs.id))
      .where(
        and(
          eq(transcriptionJobs.status, "preview"),
          eq(transcriptionPages.status, "processing")
        )
      );
    if (stuckPages.length === 0) return [];

    const excluded = new Set(excludeJobIds);
    const candidates = stuckPages.filter(({ job }) => !excluded.has(job.id));
    if (candidates.length === 0) return [];

    const result: { job: TranscriptionJob; page: TranscriptionPage }[] = [];
    for (const { page, job } of candidates) {
      await db
        .update(transcriptionPages)
        .set({ status: "pending" })
        .where(eq(transcriptionPages.id, page.id));
      result.push({ job, page: { ...page, status: "pending" } });
    }
    return result;
  }

  async getTranscriptionPages(
    jobId: number
  ): Promise<TranscriptionPage[]> {
    const rows = await db
      .select()
      .from(transcriptionPages)
      .where(eq(transcriptionPages.jobId, jobId))
      .orderBy(transcriptionPages.pageNumber);
    return rows.map(({ imageData, ...rest }) => ({ ...rest, imageData: null }));
  }

  async getTranscriptionPage(
    id: number
  ): Promise<TranscriptionPage | undefined> {
    const [page] = await db
      .select()
      .from(transcriptionPages)
      .where(eq(transcriptionPages.id, id));
    return page;
  }

  async getTranscriptionPageByImageUrl(
    imageUrl: string
  ): Promise<TranscriptionPage | undefined> {
    const [page] = await db
      .select()
      .from(transcriptionPages)
      .where(eq(transcriptionPages.imageUrl, imageUrl))
      .limit(1);
    return page;
  }

  async getCompletedTranscriptionPagesForEval(opts: {
    limit: number;
    offset: number;
  }): Promise<
    {
      pageId: number;
      jobId: number;
      pageNumber: number;
      imageUrl: string;
      scriptType: string;
      transcription: string;
      inputTokens: number | null;
      outputTokens: number | null;
      createdAt: Date | null;
    }[]
  > {
    const rows = await db
      .select({
        pageId: transcriptionPages.id,
        jobId: transcriptionPages.jobId,
        pageNumber: transcriptionPages.pageNumber,
        imageUrl: transcriptionPages.imageUrl,
        scriptType: transcriptionJobs.scriptType,
        transcription: transcriptionPages.transcription,
        inputTokens: transcriptionPages.inputTokens,
        outputTokens: transcriptionPages.outputTokens,
        createdAt: transcriptionPages.createdAt,
      })
      .from(transcriptionPages)
      .innerJoin(
        transcriptionJobs,
        eq(transcriptionPages.jobId, transcriptionJobs.id)
      )
      .where(
        and(
          eq(transcriptionPages.status, "completed"),
          sql`${transcriptionPages.transcription} IS NOT NULL`,
          sql`${transcriptionPages.transcription} != ''`
        )
      )
      .orderBy(desc(transcriptionPages.createdAt))
      .limit(opts.limit)
      .offset(opts.offset);
    return rows as any;
  }

  async createTranscriptionPage(
    page: InsertTranscriptionPage
  ): Promise<TranscriptionPage> {
    const [created] = await db
      .insert(transcriptionPages)
      .values(page)
      .returning();
    return created;
  }

  async createTranscriptionPages(
    pages: InsertTranscriptionPage[]
  ): Promise<TranscriptionPage[]> {
    if (pages.length === 0) return [];
    const created = await db
      .insert(transcriptionPages)
      .values(pages)
      .returning();
    return created;
  }

  async updateTranscriptionPage(
    id: number,
    data: Partial<TranscriptionPage>
  ): Promise<TranscriptionPage> {
    const [updated] = await db
      .update(transcriptionPages)
      .set(data)
      .where(eq(transcriptionPages.id, id))
      .returning();
    return updated;
  }

  async deleteTranscriptionJob(id: number): Promise<void> {
    await db
      .delete(transcriptionPages)
      .where(eq(transcriptionPages.jobId, id));
    await db
      .delete(transcriptionJobs)
      .where(eq(transcriptionJobs.id, id));
  }

  // Payment Orders
  async createPaymentOrder(order: InsertPaymentOrder): Promise<PaymentOrder> {
    const [created] = await db
      .insert(paymentOrders)
      .values(order)
      .returning();
    return created;
  }

  async getPaymentOrderBySessionId(
    sessionId: string
  ): Promise<PaymentOrder | undefined> {
    const [order] = await db
      .select()
      .from(paymentOrders)
      .where(eq(paymentOrders.stripeSessionId, sessionId));
    return order;
  }

  async updatePaymentOrderStatus(
    id: number,
    status: string,
    paymentIntentId?: string
  ): Promise<PaymentOrder> {
    const updateData: Partial<PaymentOrder> = { status };
    if (paymentIntentId) {
      updateData.stripePaymentIntentId = paymentIntentId;
    }
    if (status === "completed") {
      updateData.completedAt = new Date();
    }
    const [updated] = await db
      .update(paymentOrders)
      .set(updateData)
      .where(eq(paymentOrders.id, id))
      .returning();
    return updated;
  }

  async completePaymentOrder(
    orderId: number,
    paymentIntentId?: string
  ): Promise<PaymentOrder | undefined> {
    const updateData: Partial<PaymentOrder> = {
      status: "completed",
      completedAt: new Date(),
    };
    if (paymentIntentId) {
      updateData.stripePaymentIntentId = paymentIntentId;
    }
    const [updated] = await db
      .update(paymentOrders)
      .set(updateData)
      .where(
        and(
          eq(paymentOrders.id, orderId),
          eq(paymentOrders.status, "pending")
        )
      )
      .returning();
    return updated;
  }

  async getPaymentOrdersByUser(userId: string): Promise<PaymentOrder[]> {
    return db
      .select()
      .from(paymentOrders)
      .where(eq(paymentOrders.userId, userId))
      .orderBy(desc(paymentOrders.createdAt));
  }

  async getStalePendingOrders(olderThanMinutes: number): Promise<PaymentOrder[]> {
    return db
      .select()
      .from(paymentOrders)
      .where(
        and(
          eq(paymentOrders.status, "pending"),
          lt(paymentOrders.createdAt, new Date(Date.now() - olderThanMinutes * 60 * 1000))
        )
      )
      .orderBy(paymentOrders.createdAt);
  }

  // Invoices
  async createInvoice(data: InsertInvoice): Promise<Invoice> {
    const [created] = await db.insert(invoices).values(data).returning();
    if (!created) throw new Error("Failed to create invoice");
    return created;
  }

  async getAllInvoices(): Promise<Invoice[]> {
    return db.select().from(invoices).orderBy(desc(invoices.createdAt));
  }

  async getInvoicesByUser(userId: string): Promise<Invoice[]> {
    return db
      .select()
      .from(invoices)
      .where(eq(invoices.userId, userId))
      .orderBy(desc(invoices.createdAt));
  }

  async getInvoiceById(id: number): Promise<Invoice | undefined> {
    const [row] = await db.select().from(invoices).where(eq(invoices.id, id));
    return row;
  }

  async updateInvoice(id: number, data: Partial<Invoice>): Promise<Invoice> {
    const [updated] = await db
      .update(invoices)
      .set(data)
      .where(eq(invoices.id, id))
      .returning();
    if (!updated) throw new Error("Invoice not found");
    return updated;
  }

  async deleteInvoice(id: number): Promise<Invoice | undefined> {
    const [deleted] = await db
      .delete(invoices)
      .where(eq(invoices.id, id))
      .returning();
    return deleted;
  }

  async getNextInvoiceNumber(): Promise<string> {
    const now = new Date();
    const prefix = `OT-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}-`;
    const rows = await db
      .select({ invoiceNumber: invoices.invoiceNumber })
      .from(invoices)
      .where(like(invoices.invoiceNumber, prefix + "%"));
    let maxSeq = 0;
    for (const r of rows) {
      const match = r.invoiceNumber.match(/-(\d+)$/);
      if (match) maxSeq = Math.max(maxSeq, parseInt(match[1], 10));
    }
    const nextSeq = maxSeq + 1;
    return `${prefix}${String(nextSeq).padStart(4, "0")}`;
  }

  // Evaluation Documents
  async getEvaluationDocuments(): Promise<EvaluationDocument[]> {
    return db
      .select()
      .from(evaluationDocuments)
      .orderBy(desc(evaluationDocuments.createdAt));
  }

  async getEvaluationDocument(
    id: number
  ): Promise<EvaluationDocument | undefined> {
    const [doc] = await db
      .select()
      .from(evaluationDocuments)
      .where(eq(evaluationDocuments.id, id));
    return doc;
  }

  async createEvaluationDocument(
    doc: InsertEvaluationDocument
  ): Promise<EvaluationDocument> {
    const [created] = await db
      .insert(evaluationDocuments)
      .values(doc)
      .returning();
    return created;
  }

  async updateEvaluationDocument(
    id: number,
    data: Partial<EvaluationDocument>
  ): Promise<EvaluationDocument> {
    const [updated] = await db
      .update(evaluationDocuments)
      .set(data)
      .where(eq(evaluationDocuments.id, id))
      .returning();
    return updated;
  }

  async deleteEvaluationDocument(id: number): Promise<void> {
    await db.delete(evaluationDocuments).where(eq(evaluationDocuments.id, id));
  }

  // Evaluation Runs
  async getEvaluationRuns(): Promise<EvaluationRun[]> {
    return db
      .select()
      .from(evaluationRuns)
      .orderBy(desc(evaluationRuns.createdAt));
  }

  async getEvaluationRun(id: number): Promise<EvaluationRun | undefined> {
    const [run] = await db
      .select()
      .from(evaluationRuns)
      .where(eq(evaluationRuns.id, id));
    return run;
  }

  async createEvaluationRun(
    run: InsertEvaluationRun
  ): Promise<EvaluationRun> {
    const [created] = await db
      .insert(evaluationRuns)
      .values(run)
      .returning();
    return created;
  }

  async updateEvaluationRun(
    id: number,
    data: Partial<EvaluationRun>
  ): Promise<EvaluationRun> {
    const [updated] = await db
      .update(evaluationRuns)
      .set(data)
      .where(eq(evaluationRuns.id, id))
      .returning();
    return updated;
  }

  async deleteEvaluationRun(id: number): Promise<void> {
    await db.delete(evaluationRuns).where(eq(evaluationRuns.id, id));
  }

  // Evaluation Results
  async getEvaluationResultsByRunId(
    runId: number
  ): Promise<EvaluationResult[]> {
    return db
      .select()
      .from(evaluationResults)
      .where(eq(evaluationResults.runId, runId));
  }

  async createEvaluationResult(
    result: InsertEvaluationResult
  ): Promise<EvaluationResult> {
    const [created] = await db
      .insert(evaluationResults)
      .values(result)
      .returning();
    return created;
  }

  async updateEvaluationResult(
    id: number,
    data: Partial<EvaluationResult>
  ): Promise<EvaluationResult> {
    const [updated] = await db
      .update(evaluationResults)
      .set(data)
      .where(eq(evaluationResults.id, id))
      .returning();
    return updated;
  }

  // Support Messages
  async getSupportConversationsByUser(
    userId: string
  ): Promise<(SupportConversation & { lastMessage?: SupportMessage; unreadCount: number })[]> {
    const convos = await db
      .select()
      .from(supportConversations)
      .where(eq(supportConversations.userId, userId))
      .orderBy(desc(supportConversations.updatedAt));

    const results = [];
    for (const convo of convos) {
      const msgs = await db
        .select()
        .from(supportMessages)
        .where(eq(supportMessages.conversationId, convo.id))
        .orderBy(desc(supportMessages.createdAt))
        .limit(1);

      const lastMessage = msgs[0];

      const adminMsgs = await db
        .select()
        .from(supportMessages)
        .where(
          and(
            eq(supportMessages.conversationId, convo.id),
            eq(supportMessages.isAdmin, true)
          )
        );

      const userRepliesAfterAdmin = lastMessage?.isAdmin ? 0 : 0;
      const unreadCount = convo.status === "answered" ? adminMsgs.length > 0 ? 1 : 0 : 0;

      results.push({ ...convo, lastMessage, unreadCount });
    }
    return results;
  }

  async getAllSupportConversations(
    statusFilter?: string
  ): Promise<(SupportConversation & { lastMessage?: SupportMessage; userName?: string; userEmail?: string })[]> {
    const conditions = statusFilter && statusFilter !== "all"
      ? eq(supportConversations.status, statusFilter)
      : undefined;

    const convos = conditions
      ? await db.select().from(supportConversations).where(conditions).orderBy(desc(supportConversations.updatedAt))
      : await db.select().from(supportConversations).orderBy(desc(supportConversations.updatedAt));

    const results = [];
    for (const convo of convos) {
      const msgs = await db
        .select()
        .from(supportMessages)
        .where(eq(supportMessages.conversationId, convo.id))
        .orderBy(desc(supportMessages.createdAt))
        .limit(1);

      const [user] = await db
        .select({ firstName: users.firstName, lastName: users.lastName, email: users.email })
        .from(users)
        .where(eq(users.id, convo.userId));

      const userName = user ? [user.firstName, user.lastName].filter(Boolean).join(" ") || undefined : undefined;

      results.push({
        ...convo,
        lastMessage: msgs[0],
        userName,
        userEmail: user?.email || undefined,
      });
    }
    return results;
  }

  async getSupportConversation(id: number): Promise<SupportConversation | undefined> {
    const [convo] = await db
      .select()
      .from(supportConversations)
      .where(eq(supportConversations.id, id));
    return convo;
  }

  async createSupportConversation(data: InsertSupportConversation): Promise<SupportConversation> {
    const [created] = await db
      .insert(supportConversations)
      .values(data)
      .returning();
    return created;
  }

  async getSupportMessages(conversationId: number): Promise<SupportMessage[]> {
    return db
      .select()
      .from(supportMessages)
      .where(eq(supportMessages.conversationId, conversationId))
      .orderBy(supportMessages.createdAt);
  }

  async createSupportMessage(data: InsertSupportMessage): Promise<SupportMessage> {
    const [created] = await db
      .insert(supportMessages)
      .values(data)
      .returning();

    await db
      .update(supportConversations)
      .set({ updatedAt: new Date() })
      .where(eq(supportConversations.id, data.conversationId));

    return created;
  }

  async updateConversationStatus(id: number, status: string): Promise<SupportConversation> {
    const [updated] = await db
      .update(supportConversations)
      .set({ status, updatedAt: new Date() })
      .where(eq(supportConversations.id, id))
      .returning();
    return updated;
  }

  async getUnreadCountForUser(userId: string): Promise<number> {
    const convos = await db
      .select()
      .from(supportConversations)
      .where(
        and(
          eq(supportConversations.userId, userId),
          eq(supportConversations.status, "answered")
        )
      );
    return convos.length;
  }

  // Expert Accounts
  async getExpertAccounts(): Promise<ExpertAccount[]> {
    return db.select().from(expertAccounts).orderBy(desc(expertAccounts.createdAt));
  }

  async getExpertAccount(id: number): Promise<ExpertAccount | undefined> {
    const [row] = await db
      .select()
      .from(expertAccounts)
      .where(eq(expertAccounts.id, id));
    return row;
  }

  async getActiveExpertAccountByEmail(email: string): Promise<ExpertAccount | undefined> {
    const [row] = await db
      .select()
      .from(expertAccounts)
      .where(
        and(
          eq(expertAccounts.email, normalizeEmail(email)),
          eq(expertAccounts.isActive, true)
        )
      );
    return row;
  }

  async getFirstActiveExpertAccount(): Promise<ExpertAccount | undefined> {
    const rows = await db
      .select()
      .from(expertAccounts)
      .where(eq(expertAccounts.isActive, true))
      .orderBy(asc(expertAccounts.createdAt));
    return rows.find((expert) => getExpertMissingFields(expert).length === 0);
  }

  async createExpertAccount(data: InsertExpertAccount): Promise<ExpertAccount> {
    const [created] = await db
      .insert(expertAccounts)
      .values({
        ...data,
        email: normalizeEmail(data.email),
        updatedAt: new Date(),
      })
      .returning();
    if (!created) throw new Error("Failed to create expert account");
    return created;
  }

  async updateExpertAccount(
    id: number,
    data: Partial<ExpertAccount>
  ): Promise<ExpertAccount> {
    const values = {
      ...data,
      email: data.email ? normalizeEmail(data.email) : undefined,
      updatedAt: new Date(),
    };
    const [updated] = await db
      .update(expertAccounts)
      .set(values)
      .where(eq(expertAccounts.id, id))
      .returning();
    if (!updated) throw new Error("Expert account not found");
    return updated;
  }

  // Human Transcription Requests
  async createHumanTranscriptionRequest(
    data: InsertHumanTranscriptionRequest
  ): Promise<HumanTranscriptionRequest> {
    const [created] = await db
      .insert(humanTranscriptionRequests)
      .values(data)
      .returning();
    if (!created) throw new Error("Failed to create human transcription request");
    return created;
  }

  async getHumanTranscriptionRequest(
    id: number
  ): Promise<HumanTranscriptionRequest | undefined> {
    const [row] = await db
      .select()
      .from(humanTranscriptionRequests)
      .where(eq(humanTranscriptionRequests.id, id));
    return row;
  }

  async getHumanTranscriptionRequestsByUser(
    userId: string
  ): Promise<HumanTranscriptionRequest[]> {
    return db
      .select()
      .from(humanTranscriptionRequests)
      .where(eq(humanTranscriptionRequests.userId, userId))
      .orderBy(desc(humanTranscriptionRequests.createdAt));
  }

  async getAllHumanTranscriptionRequests(): Promise<HumanTranscriptionRequest[]> {
    return db
      .select()
      .from(humanTranscriptionRequests)
      .orderBy(desc(humanTranscriptionRequests.createdAt));
  }

  async getHumanTranscriptionRequestsByExpert(
    expertAccountId: number
  ): Promise<HumanTranscriptionRequest[]> {
    return db
      .select()
      .from(humanTranscriptionRequests)
      .where(eq(humanTranscriptionRequests.expertAccountId, expertAccountId))
      .orderBy(desc(humanTranscriptionRequests.createdAt));
  }

  async getCompletedHumanTranscriptionRequestForJob(
    jobId: number,
    userId: string
  ): Promise<HumanTranscriptionRequest | undefined> {
    const [row] = await db
      .select()
      .from(humanTranscriptionRequests)
      .where(
        and(
          eq(humanTranscriptionRequests.jobId, jobId),
          eq(humanTranscriptionRequests.userId, userId),
          eq(humanTranscriptionRequests.status, "completed")
        )
      )
      .orderBy(desc(humanTranscriptionRequests.completedAt))
      .limit(1);
    return row;
  }

  async updateHumanTranscriptionRequest(
    id: number,
    data: Partial<HumanTranscriptionRequest>
  ): Promise<HumanTranscriptionRequest> {
    const [updated] = await db
      .update(humanTranscriptionRequests)
      .set(data)
      .where(eq(humanTranscriptionRequests.id, id))
      .returning();
    if (!updated) throw new Error("Human transcription request not found");
    return updated;
  }

  async getHumanTranscriptionRequestBySessionId(
    sessionId: string
  ): Promise<HumanTranscriptionRequest | undefined> {
    const [row] = await db
      .select()
      .from(humanTranscriptionRequests)
      .where(eq(humanTranscriptionRequests.stripeSessionId, sessionId));
    return row;
  }

  async getHumanTranscriptionResultsByRequest(
    requestId: number
  ): Promise<HumanTranscriptionResult[]> {
    return db
      .select()
      .from(humanTranscriptionResults)
      .where(eq(humanTranscriptionResults.requestId, requestId))
      .orderBy(asc(humanTranscriptionResults.pageNumber));
  }

  async upsertHumanTranscriptionResults(
    requestId: number,
    results: InsertHumanTranscriptionResult[]
  ): Promise<HumanTranscriptionResult[]> {
    await db
      .delete(humanTranscriptionResults)
      .where(eq(humanTranscriptionResults.requestId, requestId));

    if (results.length === 0) return [];

    return db
      .insert(humanTranscriptionResults)
      .values(
        results.map((result) => ({
          ...result,
          updatedAt: new Date(),
        }))
      )
      .returning();
  }

  // Anonymous analyses
  async createAnonymousAnalysis(data: InsertAnonymousAnalysis): Promise<AnonymousAnalysis> {
    const [created] = await db
      .insert(anonymousAnalyses)
      .values(data)
      .returning();
    return created;
  }

  async getAnonymousAnalysisByToken(token: string): Promise<AnonymousAnalysis | undefined> {
    const [row] = await db
      .select()
      .from(anonymousAnalyses)
      .where(eq(anonymousAnalyses.token, token));
    return row;
  }

  async getAnonymousAnalysis(id: number): Promise<AnonymousAnalysis | undefined> {
    const [row] = await db
      .select()
      .from(anonymousAnalyses)
      .where(eq(anonymousAnalyses.id, id));
    return row;
  }

  async updateAnonymousAnalysis(id: number, data: Partial<AnonymousAnalysis>): Promise<AnonymousAnalysis> {
    const [updated] = await db
      .update(anonymousAnalyses)
      .set(data)
      .where(eq(anonymousAnalyses.id, id))
      .returning();
    if (!updated) throw new Error("Anonymous analysis not found");
    return updated;
  }

  async deleteAnonymousAnalysis(id: number): Promise<void> {
    await db.delete(anonymousAnalyses).where(eq(anonymousAnalyses.id, id));
  }

  async getAllAnonymousAnalyses(options?: { limit?: number; offset?: number }): Promise<AnonymousAnalysis[]> {
    const limit = options?.limit ?? 500;
    const offset = options?.offset ?? 0;
    const rows = await db
      .select({
        id: anonymousAnalyses.id,
        token: anonymousAnalyses.token,
        imageUrl: anonymousAnalyses.imageUrl,
        imageMimeType: anonymousAnalyses.imageMimeType,
        scriptType: anonymousAnalyses.scriptType,
        qualityDetails: anonymousAnalyses.qualityDetails,
        claimedByUserId: anonymousAnalyses.claimedByUserId,
        claimedAt: anonymousAnalyses.claimedAt,
        createdAt: anonymousAnalyses.createdAt,
      })
      .from(anonymousAnalyses)
      .orderBy(desc(anonymousAnalyses.createdAt))
      .limit(limit)
      .offset(offset);
    return rows as AnonymousAnalysis[];
  }

  async getAnonymousAnalysisByImageUrl(imageUrl: string): Promise<AnonymousAnalysis | undefined> {
    const [row] = await db
      .select()
      .from(anonymousAnalyses)
      .where(eq(anonymousAnalyses.imageUrl, imageUrl));
    return row;
  }

  async getExpiredAnonymousAnalysisIds(olderThanHours: number = 24): Promise<number[]> {
    const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    const rows = await db
      .select({ id: anonymousAnalyses.id })
      .from(anonymousAnalyses)
      .where(
        and(
          lt(anonymousAnalyses.createdAt, cutoff),
          isNull(anonymousAnalyses.claimedByUserId)
        )
      );
    return rows.map((r) => r.id);
  }

  async getRevenueStats(includeAdmin = true): Promise<RevenueStats> {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - 7);
    const startOfMonth = new Date(startOfToday);
    startOfMonth.setDate(startOfMonth.getDate() - 30);

    const emailFilter = includeAdmin
      ? undefined
      : or(
          isNull(invoices.customerEmail),
          sql`${invoices.customerEmail} NOT IN (${sql.join(TEST_EMAILS.map((e) => sql`${e}`), sql`, `)})`
        );

    const sumPeriod = async (since: Date): Promise<RevenuePeriod> => {
      const conditions = [gte(invoices.createdAt, since), emailFilter].filter(Boolean);
      const [row] = await db
        .select({
          gross: sum(invoices.grossAmountEur),
          net: sum(invoices.netAmountEur),
          vat: sum(invoices.vatAmountEur),
          count: sql<number>`count(*)`,
        })
        .from(invoices)
        .where(conditions.length > 1 ? and(...conditions) : conditions[0]);
      return {
        grossEur: revenueNum(row?.gross),
        netEur: revenueNum(row?.net),
        vatEur: revenueNum(row?.vat),
        count: revenueNum(row?.count),
      };
    };

    const [allTimeRow] = await db
      .select({
        gross: sum(invoices.grossAmountEur),
        net: sum(invoices.netAmountEur),
        vat: sum(invoices.vatAmountEur),
        count: sql<number>`count(*)`,
      })
      .from(invoices)
      .where(emailFilter);

    const timeSeriesRows = await db
      .select({
        date: sql<string>`to_char(${invoices.createdAt}, 'YYYY-MM-DD')`,
        gross: sum(invoices.grossAmountEur),
        net: sum(invoices.netAmountEur),
        purchases: sql<number>`count(*)`,
      })
      .from(invoices)
      .where(emailFilter)
      .groupBy(sql`to_char(${invoices.createdAt}, 'YYYY-MM-DD')`)
      .orderBy(sql`to_char(${invoices.createdAt}, 'YYYY-MM-DD')`);

    const timeSeries: RevenueTimeSeriesPoint[] = timeSeriesRows.map((row) => ({
      date: row.date.trim(),
      grossEur: revenueNum(row.gross),
      netEur: revenueNum(row.net),
      purchases: revenueNum(row.purchases),
    }));

    const todayBase = await sumPeriod(startOfToday);
    const weekBase = await sumPeriod(startOfWeek);
    const monthBase = await sumPeriod(startOfMonth);
    const allTime: RevenuePeriod = {
      grossEur: revenueNum(allTimeRow?.gross),
      netEur: revenueNum(allTimeRow?.net),
      vatEur: revenueNum(allTimeRow?.vat),
      count: revenueNum(allTimeRow?.count),
    };

    const recentRows = await db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        createdAt: invoices.createdAt,
        type: invoices.type,
        grossAmountEur: invoices.grossAmountEur,
        netAmountEur: invoices.netAmountEur,
        description: invoices.description,
        customerEmail: invoices.customerEmail,
      })
      .from(invoices)
      .where(emailFilter)
      .orderBy(desc(invoices.createdAt))
      .limit(150);

    const recentInvoices: RevenueRecentInvoice[] = recentRows.map((r) => ({
      id: r.id,
      invoiceNumber: r.invoiceNumber,
      createdAt:
        r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
      type: r.type,
      grossAmountEur: r.grossAmountEur,
      netAmountEur: r.netAmountEur,
      description: r.description,
      customerEmail: r.customerEmail,
    }));

    return {
      today: todayBase,
      thisWeek: weekBase,
      thisMonth: monthBase,
      allTime,
      timeSeries,
      recentInvoices,
    };
  }

  async getUserStats(): Promise<UserStats> {
    const excludeTestUser = or(
      isNull(users.email),
      sql`${users.email} NOT IN (${sql.join(TEST_EMAILS.map((e) => sql`${e}`), sql`, `)})`
    );

    const purchaseCountSubquery = db
      .select({
        userId: paymentOrders.userId,
        cnt: sql<number>`count(*)`.as("cnt"),
      })
      .from(paymentOrders)
      .where(eq(paymentOrders.status, "completed"))
      .groupBy(paymentOrders.userId)
      .as("po");

    // Purchase distribution (excluding test users)
    const bucketRows = await db
      .select({
        bucket: sql<string>`CASE
          WHEN COALESCE(po.cnt, 0) = 0 THEN 'none'
          WHEN po.cnt = 1 THEN 'one'
          ELSE 'two_plus'
        END`.as("bucket"),
        userCount: sql<number>`count(*)`.as("user_count"),
      })
      .from(users)
      .leftJoin(purchaseCountSubquery, eq(users.id, purchaseCountSubquery.userId))
      .where(excludeTestUser)
      .groupBy(sql`CASE
          WHEN COALESCE(po.cnt, 0) = 0 THEN 'none'
          WHEN po.cnt = 1 THEN 'one'
          ELSE 'two_plus'
        END`);

    const dist: PurchaseDistribution = { noPurchase: 0, onePurchase: 0, twoPlusPurchases: 0 };
    for (const r of bucketRows) {
      const c = Number(r.userCount) || 0;
      if (r.bucket === "none") dist.noPurchase = c;
      else if (r.bucket === "one") dist.onePurchase = c;
      else if (r.bucket === "two_plus") dist.twoPlusPurchases = c;
    }

    // Registration time series (excluding test users)
    const regRows = await db
      .select({
        date: sql<string>`to_char(${users.createdAt}, 'YYYY-MM-DD')`.as("date"),
        count: sql<number>`count(*)`.as("count"),
      })
      .from(users)
      .where(excludeTestUser)
      .groupBy(sql`to_char(${users.createdAt}, 'YYYY-MM-DD')`)
      .orderBy(sql`to_char(${users.createdAt}, 'YYYY-MM-DD')`);

    const registrationTimeSeries: RegistrationTimeSeriesPoint[] = regRows.map((r) => ({
      date: (r.date ?? "").trim(),
      count: Number(r.count) || 0,
    }));

    // Subquery: total purchased credits per user
    const purchasedCreditsSubquery = db
      .select({
        userId: paymentOrders.userId,
        total: sql<number>`COALESCE(SUM(${paymentOrders.credits}), 0)`.as("total"),
      })
      .from(paymentOrders)
      .where(eq(paymentOrders.status, "completed"))
      .groupBy(paymentOrders.userId)
      .as("pc");

    // Subquery: total completed TTS audio generations per user
    // (join tts_generations -> transcription_jobs, group by job.userId)
    // NOTE: inner alias must differ from purchaseCountSubquery's "cnt"
    // to avoid PG error 42702 "column reference 'cnt' is ambiguous".
    const audioCountSubquery = db
      .select({
        userId: transcriptionJobs.userId,
        audioCnt: sql<number>`count(*)`.as("audio_cnt"),
      })
      .from(ttsGenerations)
      .innerJoin(transcriptionJobs, eq(ttsGenerations.jobId, transcriptionJobs.id))
      .where(eq(ttsGenerations.status, "completed"))
      .groupBy(transcriptionJobs.userId)
      .as("ac");

    // User list with credits and purchase count
    const userRows = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        newsletterOptIn: users.newsletterOptIn,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        credits: userCredits.credits,
        purchaseCount: purchaseCountSubquery.cnt,
        totalPurchasedCredits: purchasedCreditsSubquery.total,
        audioCount: audioCountSubquery.audioCnt,
      })
      .from(users)
      .leftJoin(userCredits, eq(users.id, userCredits.userId))
      .leftJoin(purchaseCountSubquery, eq(users.id, purchaseCountSubquery.userId))
      .leftJoin(purchasedCreditsSubquery, eq(users.id, purchasedCreditsSubquery.userId))
      .leftJoin(audioCountSubquery, eq(users.id, audioCountSubquery.userId))
      .orderBy(desc(users.createdAt));

    const userList: UserListItem[] = userRows.map((r) => ({
      id: r.id,
      email: r.email,
      firstName: r.firstName,
      lastName: r.lastName,
      credits: r.credits ?? 0,
      totalPurchasedCredits: Number(r.totalPurchasedCredits) || 0,
      newsletterOptIn: r.newsletterOptIn ?? false,
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt ?? ""),
      updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : String(r.updatedAt ?? ""),
      purchaseCount: Number(r.purchaseCount) || 0,
      audioCount: Number(r.audioCount) || 0,
    }));

    return { purchaseDistribution: dist, registrationTimeSeries, userList };
  }

  async getPayingUserRegistrationHeatmap(): Promise<PayingUserHeatmapPoint[]> {
    const rows = await db
      .select({
        dow: sql<number>`(EXTRACT(ISODOW FROM ${users.createdAt} AT TIME ZONE 'Europe/Berlin') - 1)::int`.as("dow"),
        hour: sql<number>`EXTRACT(HOUR FROM ${users.createdAt} AT TIME ZONE 'Europe/Berlin')::int`.as("hour"),
        count: sql<number>`count(*)::int`.as("count"),
        revenueCents: sql<number>`COALESCE(SUM((SELECT COALESCE(SUM(inv.gross_amount_eur), 0) FROM invoices inv WHERE inv.user_id = ${users.id}::text)), 0)::int`.as("revenue_cents"),
      })
      .from(users)
      .where(
        and(
          or(
            isNull(users.email),
            sql`${users.email} NOT IN (${sql.join(TEST_EMAILS.map((e) => sql`${e}`), sql`, `)})`
          ),
          sql`EXISTS (SELECT 1 FROM payment_orders po WHERE po.user_id = ${users.id} AND po.status = 'completed')`
        )
      )
      .groupBy(sql`dow`, sql`hour`)
      .orderBy(sql`dow`, sql`hour`);

    return rows.map((r) => ({
      dow: Number(r.dow),
      hour: Number(r.hour),
      count: Number(r.count),
      revenueCents: Number(r.revenueCents),
    }));
  }

  async getSetting(key: string): Promise<unknown | undefined> {
    const [row] = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, key));
    return row?.value;
  }

  async setSetting(key: string, value: unknown): Promise<void> {
    await db
      .insert(appSettings)
      .values({ key, value, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: appSettings.key,
        set: { value, updatedAt: new Date() },
      });
  }

  async getAllSettings(): Promise<Record<string, unknown>> {
    const rows = await db.select().from(appSettings);
    const result: Record<string, unknown> = {};
    for (const row of rows) {
      result[row.key] = row.value;
    }
    return result;
  }

  async getAdwordsDailyStats(): Promise<AdwordsDailyStat[]> {
    return db
      .select()
      .from(adwordsDailyStats)
      .orderBy(asc(adwordsDailyStats.date));
  }

  async upsertAdwordsDaily(rows: AdwordsImportRow[]): Promise<number> {
    if (rows.length === 0) return 0;
    let upserted = 0;
    for (const row of rows) {
      await db
        .insert(adwordsDailyStats)
        .values({
          date: row.date,
          costCents: row.costCents,
          clicks: row.clicks,
          conversions: row.conversions,
          impressions: row.impressions,
        })
        .onConflictDoUpdate({
          target: adwordsDailyStats.date,
          set: {
            costCents: row.costCents,
            clicks: row.clicks,
            conversions: row.conversions,
            impressions: row.impressions,
          },
        });
      upserted++;
    }
    return upserted;
  }

  async getCtaStats(): Promise<{ variantId: number; impressions: number; claims: number }[]> {
    const rows = await db.select().from(ctaVariantStats);
    return rows.map((r) => ({
      variantId: r.variantId,
      impressions: r.impressions,
      claims: r.claims,
    }));
  }

  async incrementCtaImpression(variantId: number): Promise<void> {
    await db
      .insert(ctaVariantStats)
      .values({ variantId, impressions: 1, claims: 0, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: ctaVariantStats.variantId,
        set: {
          impressions: sql`${ctaVariantStats.impressions} + 1`,
          updatedAt: new Date(),
        },
      });
  }

  async incrementCtaClaim(variantId: number): Promise<void> {
    await db
      .insert(ctaVariantStats)
      .values({ variantId, impressions: 0, claims: 1, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: ctaVariantStats.variantId,
        set: {
          claims: sql`${ctaVariantStats.claims} + 1`,
          updatedAt: new Date(),
        },
      });
  }

  async resetCtaStats(): Promise<void> {
    await db.delete(ctaVariantStats);
  }

  // ─── Hero-Varianten-Statistiken (A/B-Test Homepage-Hero) ──────────────────

  async getHeroStats(): Promise<{ variantId: number; impressions: number; conversions: number }[]> {
    const rows = await db.select().from(heroVariantStats);
    return rows.map((r) => ({
      variantId: r.variantId,
      impressions: r.impressions,
      conversions: r.conversions,
    }));
  }

  async incrementHeroImpression(variantId: number): Promise<void> {
    await db
      .insert(heroVariantStats)
      .values({ variantId, impressions: 1, conversions: 0, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: heroVariantStats.variantId,
        set: {
          impressions: sql`${heroVariantStats.impressions} + 1`,
          updatedAt: new Date(),
        },
      });
  }

  async incrementHeroConversion(variantId: number): Promise<void> {
    await db
      .insert(heroVariantStats)
      .values({ variantId, impressions: 0, conversions: 1, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: heroVariantStats.variantId,
        set: {
          conversions: sql`${heroVariantStats.conversions} + 1`,
          updatedAt: new Date(),
        },
      });
  }

  async resetHeroStats(): Promise<void> {
    await db.delete(heroVariantStats);
  }
}

export const storage = new DatabaseStorage();
