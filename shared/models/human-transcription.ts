import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  varchar,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./auth";
import { transcriptionJobs, transcriptionPages } from "./transcription";

export const humanTranscriptionRequestStatuses = [
  "pending",
  "quoted",
  "accepted",
  "in_progress",
  "completed",
  "declined",
  "cancelled",
] as const;
export type HumanTranscriptionRequestStatus =
  (typeof humanTranscriptionRequestStatuses)[number];

export const urgencyOptions = ["standard", "express", "priority"] as const;
export type UrgencyOption = (typeof urgencyOptions)[number];

export const accuracyLevels = ["reading", "scientific"] as const;
export type AccuracyLevel = (typeof accuracyLevels)[number];

export const budgetRanges = [
  "bis_100",
  "100_250",
  "250_500",
  "500_plus",
  "flexible",
] as const;
export type BudgetRange = (typeof budgetRanges)[number];

export const serviceLevels = ["ki_geprueft", "experten"] as const;
export type ServiceLevel = (typeof serviceLevels)[number];

export const expertAccounts = pgTable("expert_accounts", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  userId: varchar("user_id").references(() => users.id),
  isActive: boolean("is_active").notNull().default(true),
  companyName: varchar("company_name", { length: 200 }),
  legalName: varchar("legal_name", { length: 200 }),
  contactName: varchar("contact_name", { length: 200 }),
  street: varchar("street", { length: 200 }),
  postalCode: varchar("postal_code", { length: 20 }),
  city: varchar("city", { length: 100 }),
  country: varchar("country", { length: 100 }),
  vatId: varchar("vat_id", { length: 50 }),
  taxNumber: varchar("tax_number", { length: 50 }),
  website: varchar("website", { length: 300 }),
  phone: varchar("phone", { length: 50 }),
  invoiceEmail: varchar("invoice_email", { length: 255 }),
  businessType: varchar("business_type", { length: 50 }),
  tradeRegisterName: varchar("trade_register_name", { length: 100 }),
  tradeRegisterNumber: varchar("trade_register_number", { length: 100 }),
  legalComplianceConfirmed: boolean("legal_compliance_confirmed").notNull().default(false),
  actsAsBusinessConfirmed: boolean("acts_as_business_confirmed").notNull().default(false),
  externalBillingConfirmed: boolean("external_billing_confirmed").notNull().default(false),
  confidentialityConfirmed: boolean("confidentiality_confirmed").notNull().default(false),
  dataProtectionConfirmed: boolean("data_protection_confirmed").notNull().default(false),
  liabilityInsuranceConfirmed: boolean("liability_insurance_confirmed").notNull().default(false),
  termsText: text("terms_text"),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const humanTranscriptionRequests = pgTable(
  "human_transcription_requests",
  {
    id: serial("id").primaryKey(),
    jobId: integer("job_id")
      .notNull()
      .references(() => transcriptionJobs.id, { onDelete: "cascade" }),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id),
    status: varchar("status", { length: 30 })
      .notNull()
      .default("pending"),
    serviceLevel: varchar("service_level", { length: 30 })
      .notNull()
      .default("experten"),
    urgency: varchar("urgency", { length: 20 }).notNull(),
    accuracyLevel: varchar("accuracy_level", { length: 20 }).notNull(),
    budgetRange: varchar("budget_range", { length: 20 }).notNull(),
    customerNotes: text("customer_notes"),
    quotePriceEur: integer("quote_price_eur"),
    quoteMessage: text("quote_message"),
    quoteDeadline: timestamp("quote_deadline"),
    quotedAt: timestamp("quoted_at"),
    respondedAt: timestamp("responded_at"),
    completedAt: timestamp("completed_at"),
    expertAccountId: integer("expert_account_id").references(
      () => expertAccounts.id
    ),
    assignedAt: timestamp("assigned_at"),
    customerAcceptedAt: timestamp("customer_accepted_at"),
    expertStartedAt: timestamp("expert_started_at"),
    externalBillingNoticeAccepted: boolean(
      "external_billing_notice_accepted"
    ).notNull().default(false),
    stripeSessionId: varchar("stripe_session_id", { length: 500 }),
    stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 500 }),
    createdAt: timestamp("created_at").defaultNow(),
  }
);

export const humanTranscriptionResults = pgTable(
  "human_transcription_results",
  {
    id: serial("id").primaryKey(),
    requestId: integer("request_id")
      .notNull()
      .references(() => humanTranscriptionRequests.id, { onDelete: "cascade" }),
    jobId: integer("job_id")
      .notNull()
      .references(() => transcriptionJobs.id, { onDelete: "cascade" }),
    pageId: integer("page_id").references(() => transcriptionPages.id, {
      onDelete: "cascade",
    }),
    pageNumber: integer("page_number").notNull(),
    resultType: varchar("result_type", { length: 30 }).notNull(),
    text: text("text").notNull(),
    expertNotes: text("expert_notes"),
    savedByExpertAccountId: integer("saved_by_expert_account_id").references(
      () => expertAccounts.id
    ),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  }
);

export const insertExpertAccountSchema = createInsertSchema(
  expertAccounts
).omit({ id: true, createdAt: true, updatedAt: true });
export const insertHumanTranscriptionRequestSchema = createInsertSchema(
  humanTranscriptionRequests
).omit({ id: true, createdAt: true });
export const insertHumanTranscriptionResultSchema = createInsertSchema(
  humanTranscriptionResults
).omit({ id: true, createdAt: true, updatedAt: true });

export type ExpertAccount = typeof expertAccounts.$inferSelect;
export type InsertExpertAccount = z.infer<typeof insertExpertAccountSchema>;
export type HumanTranscriptionRequest =
  typeof humanTranscriptionRequests.$inferSelect;
export type InsertHumanTranscriptionRequest = z.infer<
  typeof insertHumanTranscriptionRequestSchema
>;
export type HumanTranscriptionResult =
  typeof humanTranscriptionResults.$inferSelect;
export type InsertHumanTranscriptionResult = z.infer<
  typeof insertHumanTranscriptionResultSchema
>;
