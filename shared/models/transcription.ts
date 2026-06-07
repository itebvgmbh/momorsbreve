import { sql } from "drizzle-orm";
import {
  pgTable,
  serial,
  integer,
  real,
  text,
  varchar,
  timestamp,
  date,
  jsonb,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./auth";

// Script-based document types – focused on Danish handwriting style & era.
// Optimeret til dansk gotisk håndskrift og senere skrifter.
// VIGTIGT: nøglerne (keys) er bevidst uændrede ift. det tyske udgangspunkt,
// fordi de allerede er gemt i databasen. Kun labels/beskrivelser er danske nu.
export const documentTypes = [
  "suetterlin",
  "post_1945",
  "modern",
  "fraktur",
  "auto",
] as const;

export type DocumentType = (typeof documentTypes)[number];

export const documentTypeLabels: Record<DocumentType, string> = {
  suetterlin: "Gotisk håndskrift",
  post_1945: "Overgangsskrift",
  modern: "Moderne håndskrift",
  fraktur: "Gotisk tryk (fraktur)",
  auto: "Genkend automatisk",
};

/** Time period shown alongside each script type in the UI. */
export const documentTypePeriods: Record<DocumentType, string> = {
  suetterlin: "før ca. 1875",
  post_1945: "ca. 1875 – 1900",
  modern: "efter ca. 1900",
  fraktur: "16. – 19. årh.",
  auto: "",
};

export const documentTypeDescriptions: Record<DocumentType, string> = {
  suetterlin:
    "Den gotiske håndskrift (gotisk skrift), der var standard i Danmark indtil skolereformen ca. 1875 – findes i de fleste gamle breve, dagbøger og kirkebøger.",
  post_1945:
    "Overgangsskrift: latinsk grundform med rester af gotisk håndskrift. Typisk for generationen omkring skolereformen (ca. 1875–1900).",
  modern:
    "Nutidig latinsk håndskrift (efter ca. 1900).",
  fraktur:
    "Gotisk tryk (fraktur) med langt ſ og særlige ligaturer – typisk i ældre trykte bøger og dokumenter.",
  auto:
    "Lad AI genkende skriften automatisk. Bedst egnet til gotisk håndskrift og senere danske skrifter.",
};

// ─── Translation languages ───────────────────────────────────────────────────

export const translationLanguages = [
  { code: "da", label: "Dansk", labelNative: "Dansk" },
  { code: "en", label: "Engelsk", labelNative: "English" },
  { code: "de", label: "Tysk", labelNative: "Deutsch" },
  { code: "sv", label: "Svensk", labelNative: "Svenska" },
  { code: "no", label: "Norsk", labelNative: "Norsk" },
  { code: "fr", label: "Fransk", labelNative: "Français" },
  { code: "es", label: "Spansk", labelNative: "Español" },
  { code: "it", label: "Italiensk", labelNative: "Italiano" },
  { code: "nl", label: "Hollandsk", labelNative: "Nederlands" },
  { code: "pl", label: "Polsk", labelNative: "Polski" },
  { code: "pt", label: "Portugisisk", labelNative: "Português" },
  { code: "ru", label: "Russisk", labelNative: "Русский" },
  { code: "cs", label: "Tjekkisk", labelNative: "Čeština" },
  { code: "hu", label: "Ungarsk", labelNative: "Magyar" },
  { code: "ro", label: "Rumænsk", labelNative: "Română" },
  { code: "tr", label: "Tyrkisk", labelNative: "Türkçe" },
  { code: "ja", label: "Japansk", labelNative: "日本語" },
  { code: "ko", label: "Koreansk", labelNative: "한국어" },
  { code: "zh", label: "Kinesisk (forenklet)", labelNative: "中文" },
  { code: "ar", label: "Arabisk", labelNative: "العربية" },
  { code: "he", label: "Hebraisk", labelNative: "עברית" },
  { code: "uk", label: "Ukrainsk", labelNative: "Українська" },
  { code: "el", label: "Græsk", labelNative: "Ελληνικά" },
  { code: "fi", label: "Finsk", labelNative: "Suomi" },
  { code: "hr", label: "Kroatisk", labelNative: "Hrvatski" },
] as const;

export type TranslationLanguageCode = (typeof translationLanguages)[number]["code"];

export function getTranslationLanguageLabel(code: string): string {
  const lang = translationLanguages.find((l) => l.code === code);
  return lang ? lang.label : code;
}

// ─── TTS: Gemini language support (for voice synthesis) ───────────────────────

export const ttsLanguageMap: Record<string, { bcp47: string; status: "ga" | "preview" }> = {
  de: { bcp47: "de-DE", status: "ga" },
  en: { bcp47: "en-US", status: "ga" },
  fr: { bcp47: "fr-FR", status: "ga" },
  es: { bcp47: "es-ES", status: "ga" },
  it: { bcp47: "it-IT", status: "ga" },
  nl: { bcp47: "nl-NL", status: "ga" },
  pl: { bcp47: "pl-PL", status: "ga" },
  pt: { bcp47: "pt-BR", status: "ga" },
  ro: { bcp47: "ro-RO", status: "ga" },
  ru: { bcp47: "ru-RU", status: "ga" },
  tr: { bcp47: "tr-TR", status: "ga" },
  ja: { bcp47: "ja-JP", status: "ga" },
  ko: { bcp47: "ko-KR", status: "ga" },
  ar: { bcp47: "ar-EG", status: "ga" },
  uk: { bcp47: "uk-UA", status: "ga" },
  cs: { bcp47: "cs-CZ", status: "preview" },
  da: { bcp47: "da-DK", status: "preview" },
  sv: { bcp47: "sv-SE", status: "preview" },
  no: { bcp47: "nb-NO", status: "preview" },
  hu: { bcp47: "hu-HU", status: "preview" },
  zh: { bcp47: "cmn-CN", status: "preview" },
  he: { bcp47: "he-IL", status: "preview" },
  el: { bcp47: "el-GR", status: "preview" },
  fi: { bcp47: "fi-FI", status: "preview" },
  hr: { bcp47: "hr-HR", status: "preview" },
};

// Fallback labels for legacy DB values (old content-based types & early script types)
export const legacyScriptTypeLabels: Record<string, string> = {
  // Legacy content-based types
  diary: "Dagbog",
  letter: "Brev",
  notes: "Noter",
  postcard: "Postkort",
  other: "Andet",
  // Legacy script types (kun til ældre ordrer)
  kurrent: "Ældre gotisk håndskrift",
  kurrent_early: "Ældre gotisk håndskrift",
  kurrent_late: "Ældre gotisk håndskrift",
  kanzlei: "Kancelliskrift",
  mixed: "Blandet",
};

/** Display label for script_type from DB (supports both new document types and legacy script types).
 *  Note: Returns "" for "auto" since every document is auto-detected – showing the label would be redundant. */
export function getScriptTypeDisplayLabel(scriptType: string): string {
  if (scriptType === "auto") return "";
  return documentTypeLabels[scriptType as DocumentType] ?? legacyScriptTypeLabels[scriptType] ?? scriptType;
}

export const creditPackages = pgTable("credit_packages", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  pages: integer("pages").notNull(),
  priceEur: integer("price_eur").notNull(),
  popular: boolean("popular").default(false),
});

export const creditPackageDisplayNames: Record<string, string> = {
  Starter: "Starter (Brevpakke)",
  Standard: "Standard (Dagbog)",
  Premium: "Premium (Familiearkiv)",
};

export function getCreditPackageDisplayName(name: string): string {
  return creditPackageDisplayNames[name] ?? name;
}

/** Konfiguration der Rabattaktion (wird aus app_settings gelesen, Fallback siehe DEFAULT_PROMOTION). */
export interface PromotionConfig {
  enabled: boolean;
  label: string;
  endDate: string | null;
  discounts: Record<string, number>;
}

/** Default-Werte für die Rabattaktion, wenn in der DB nichts gesetzt ist. */
export const DEFAULT_PROMOTION: PromotionConfig = {
  enabled: false,
  label: "Aktion",
  endDate: null,
  discounts: {
    Starter: 0,
    Standard: 0,
    Premium: 0,
  },
};

export const userCredits = pgTable("user_credits", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id")
    .notNull()
    .unique()
    .references(() => users.id),
  credits: integer("credits").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const usedFreeCredits = pgTable("used_free_credits", {
  id: serial("id").primaryKey(),
  emailHash: varchar("email_hash", { length: 64 }).notNull().unique(),
  blockCount: integer("block_count").notNull().default(0),
  grantedAt: timestamp("granted_at").defaultNow(),
});

export const transcriptionJobs = pgTable("transcription_jobs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id),
  // Optionaler, vom Nutzer vergebener Titel. NULL = noch nie benannt
  // (Anzeige fällt dann auf Textauszug / Schrifttyp zurück).
  title: varchar("title", { length: 200 }),
  scriptType: varchar("script_type", { length: 50 }).notNull(),
  translationLanguage: varchar("translation_language", { length: 10 }),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  totalPages: integer("total_pages").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const transcriptionPages = pgTable("transcription_pages", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id")
    .notNull()
    .references(() => transcriptionJobs.id, { onDelete: "cascade" }),
  pageNumber: integer("page_number").notNull(),
  imageUrl: varchar("image_url", { length: 500 }).notNull(),
  imageData: text("image_data"),
  imageMimeType: varchar("image_mime_type", { length: 100 }),
  transcription: text("transcription"),
  transcriptionCompleted: text("transcription_completed"),
  transcriptionInterpreted: text("transcription_interpreted"),
  transcriptionEdited: text("transcription_edited"),
  transcriptionCompletedEdited: text("transcription_completed_edited"),
  transcriptionInterpretedEdited: text("transcription_interpreted_edited"),
  translation: text("translation"),
  translationCompleted: text("translation_completed"),
  translationInterpreted: text("translation_interpreted"),
  isPreview: boolean("is_preview").default(false),
  qualityScore: integer("quality_score"),
  qualityDetails: jsonb("quality_details"),
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const ttsGenerations = pgTable("tts_generations", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id")
    .notNull()
    .references(() => transcriptionJobs.id, { onDelete: "cascade" }),
  version: varchar("version", { length: 20 }).notNull(),
  lang: varchar("lang", { length: 20 }).notNull(),
  voice: varchar("voice", { length: 50 }).notNull(),
  style: text("style"),
  pages: jsonb("pages").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("generating"),
  failReason: text("fail_reason"),
  audioUrl: varchar("audio_url", { length: 500 }),
  audioData: text("audio_data"),
  audioMimeType: varchar("audio_mime_type", { length: 50 }),
  creditsUsed: integer("credits_used").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Playlists (Hörbuch-Zusammenstellungen) ─────────────────────────────────

export const playlists = pgTable("playlists", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id),
  name: varchar("name", { length: 200 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  lastPosition: jsonb("last_position"),
});

export const playlistItems = pgTable("playlist_items", {
  id: serial("id").primaryKey(),
  playlistId: integer("playlist_id")
    .notNull()
    .references(() => playlists.id, { onDelete: "cascade" }),
  ttsGenerationId: integer("tts_generation_id")
    .notNull()
    .references(() => ttsGenerations.id, { onDelete: "cascade" }),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const insertPlaylistSchema = createInsertSchema(playlists).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertPlaylistItemSchema = createInsertSchema(playlistItems).omit({
  id: true,
});

export type Playlist = typeof playlists.$inferSelect;
export type InsertPlaylist = z.infer<typeof insertPlaylistSchema>;
export type PlaylistItem = typeof playlistItems.$inferSelect;
export type InsertPlaylistItem = z.infer<typeof insertPlaylistItemSchema>;

// Anonymous analyses (kostenlose KI-Analyse ohne Login; Claim-Tracking für Admin)
export const anonymousAnalyses = pgTable("anonymous_analyses", {
  id: serial("id").primaryKey(),
  token: varchar("token", { length: 100 }).notNull().unique(),
  imageUrl: varchar("image_url", { length: 500 }).notNull(),
  imageData: text("image_data"),
  imageMimeType: varchar("image_mime_type", { length: 100 }),
  scriptType: varchar("script_type", { length: 50 }).notNull(),
  qualityDetails: jsonb("quality_details"),
  ctaVariant: integer("cta_variant"),
  claimedByUserId: varchar("claimed_by_user_id").references(() => users.id),
  claimedAt: timestamp("claimed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// CTA-Varianten-Tracking: Impressionen + Claims pro Variante (A/B-Test)
export const ctaVariantStats = pgTable("cta_variant_stats", {
  variantId: integer("variant_id").primaryKey(),
  impressions: integer("impressions").notNull().default(0),
  claims: integer("claims").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type CtaVariantStat = typeof ctaVariantStats.$inferSelect;

// Hero-Varianten-Tracking: Impressionen + Conversions pro Variante (A/B-Test Homepage-Hero)
export const heroVariantStats = pgTable("hero_variant_stats", {
  variantId: integer("variant_id").primaryKey(),
  impressions: integer("impressions").notNull().default(0),
  conversions: integer("conversions").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type HeroVariantStat = typeof heroVariantStats.$inferSelect;

export const insertCreditPackageSchema = createInsertSchema(creditPackages).omit({
  id: true,
});
export const insertUserCreditsSchema = createInsertSchema(userCredits).omit({
  id: true,
  updatedAt: true,
});
export const insertTranscriptionJobSchema = createInsertSchema(
  transcriptionJobs,
).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTranscriptionPageSchema = createInsertSchema(
  transcriptionPages,
).omit({ id: true, createdAt: true });
export const insertAnonymousAnalysisSchema = createInsertSchema(
  anonymousAnalyses,
).omit({ id: true, createdAt: true });

// Stripe payment orders
export const paymentOrders = pgTable("payment_orders", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id),
  packageId: integer("package_id")
    .notNull()
    .references(() => creditPackages.id),
  stripeSessionId: varchar("stripe_session_id", { length: 500 }).notNull(),
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 500 }),
  amountEur: integer("amount_eur").notNull(),
  credits: integer("credits").notNull(),
  status: varchar("status", { length: 30 }).notNull().default("pending"), // pending | completed | failed | expired
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const insertPaymentOrderSchema = createInsertSchema(paymentOrders).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

// Rechnungen (Credit-Kauf + Spezialistenaufträge)
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  invoiceNumber: varchar("invoice_number", { length: 50 }).notNull().unique(),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id),
  type: varchar("type", { length: 30 }).notNull(), // "credit_purchase" | "specialist_order"
  paymentOrderId: integer("payment_order_id").references(() => paymentOrders.id),
  humanRequestId: integer("human_request_id"),
  netAmountEur: integer("net_amount_eur").notNull(),
  vatRate: integer("vat_rate").notNull().default(19),
  vatAmountEur: integer("vat_amount_eur").notNull(),
  grossAmountEur: integer("gross_amount_eur").notNull(),
  description: text("description").notNull(),
  customerName: varchar("customer_name", { length: 200 }),
  customerEmail: varchar("customer_email", { length: 200 }),
  customerStreet: varchar("customer_street", { length: 200 }),
  customerPostalCode: varchar("customer_postal_code", { length: 20 }),
  customerCity: varchar("customer_city", { length: 100 }),
  customerCountry: varchar("customer_country", { length: 100 }),
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 500 }),
  pdfPath: varchar("pdf_path", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  createdAt: true,
});

// ─── Evaluation (Admin: Ground Truth & Test Runs) ─────────────────────────────

export const evaluationDifficulties = ["easy", "medium", "hard"] as const;
export type EvaluationDifficulty = (typeof evaluationDifficulties)[number];

export const evaluationFileTypes = ["image", "pdf"] as const;
export type EvaluationFileType = (typeof evaluationFileTypes)[number];

export const evaluationDocumentStatuses = [
  "pending",
  "running",
  "completed",
  "failed",
] as const;
export type EvaluationRunStatus = (typeof evaluationDocumentStatuses)[number];

export const evaluationDocuments = pgTable("evaluation_documents", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  scriptType: varchar("script_type", { length: 50 }).notNull(),
  difficulty: varchar("difficulty", { length: 20 }).notNull().default("medium"),
  fileUrl: varchar("file_url", { length: 500 }).notNull(),
  fileType: varchar("file_type", { length: 20 }).notNull(),
  groundTruth: text("ground_truth").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const evaluationRuns = pgTable("evaluation_runs", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  config: jsonb("config").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  summary: jsonb("summary"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const evaluationResults = pgTable("evaluation_results", {
  id: serial("id").primaryKey(),
  runId: integer("run_id")
    .notNull()
    .references(() => evaluationRuns.id, { onDelete: "cascade" }),
  documentId: integer("document_id")
    .references(() => evaluationDocuments.id, { onDelete: "cascade" }),
  transcription: text("transcription"),
  cer: real("cer"),
  wer: real("wer"),
  confidence: integer("confidence"),
  qualityDetails: jsonb("quality_details"),
  tokensUsed: integer("tokens_used"),
  durationMs: integer("duration_ms"),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
});

export const insertEvaluationDocumentSchema = createInsertSchema(
  evaluationDocuments
).omit({ id: true, createdAt: true });
export const insertEvaluationRunSchema = createInsertSchema(evaluationRuns).omit(
  { id: true, createdAt: true, completedAt: true }
);
export const insertEvaluationResultSchema = createInsertSchema(
  evaluationResults
).omit({ id: true });

export type EvaluationDocument = typeof evaluationDocuments.$inferSelect;
export type InsertEvaluationDocument = z.infer<
  typeof insertEvaluationDocumentSchema
>;
export type EvaluationRun = typeof evaluationRuns.$inferSelect;
export type InsertEvaluationRun = z.infer<typeof insertEvaluationRunSchema>;
export type EvaluationResult = typeof evaluationResults.$inferSelect;
export type InsertEvaluationResult = z.infer<typeof insertEvaluationResultSchema>;

export type CreditPackage = typeof creditPackages.$inferSelect;
export type InsertCreditPackage = z.infer<typeof insertCreditPackageSchema>;

/** Für API-Response: Paket ggf. mit Rabattinfos (originalPriceEur, discountPercent, promotionLabel); priceEur ist dann der rabattierte Preis. */
export type CreditPackageWithPromotion = CreditPackage & {
  originalPriceEur?: number;
  discountPercent?: number;
  promotionLabel?: string;
};

export function getDiscountedPriceCents(priceEurCents: number, discountFraction: number): number {
  return Math.round(priceEurCents * (1 - discountFraction));
}
export type UserCredits = typeof userCredits.$inferSelect;
export type InsertUserCredits = z.infer<typeof insertUserCreditsSchema>;
export type TranscriptionJob = typeof transcriptionJobs.$inferSelect;
export type TranscriptionJobWithSnippet = TranscriptionJob & {
  textSnippet: string | null;
  completedPages: number;
  hasAudio?: boolean;
};
export type InsertTranscriptionJob = z.infer<
  typeof insertTranscriptionJobSchema
>;
export type TranscriptionPage = typeof transcriptionPages.$inferSelect;
export type InsertTranscriptionPage = z.infer<
  typeof insertTranscriptionPageSchema
>;
export type AnonymousAnalysis = typeof anonymousAnalyses.$inferSelect;
export type InsertAnonymousAnalysis = z.infer<
  typeof insertAnonymousAnalysisSchema
>;
export type PaymentOrder = typeof paymentOrders.$inferSelect;
export type InsertPaymentOrder = z.infer<typeof insertPaymentOrderSchema>;
export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;

// ─── App Settings (key-value store for admin configuration) ─────────────────

export const appSettings = pgTable("app_settings", {
  key: varchar("key", { length: 100 }).primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type AppSetting = typeof appSettings.$inferSelect;

// ─── AdWords Daily Stats (Google Ads import) ─────────────────────────────────

export const adwordsDailyStats = pgTable("adwords_daily_stats", {
  id: serial("id").primaryKey(),
  date: date("date").notNull().unique(),
  costCents: integer("cost_cents").notNull(),
  clicks: integer("clicks").notNull(),
  conversions: integer("conversions").notNull().default(0),
  impressions: integer("impressions").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export type AdwordsDailyStat = typeof adwordsDailyStats.$inferSelect;
