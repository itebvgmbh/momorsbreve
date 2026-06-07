import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./auth";

// ─── Marketing / E-Mail-Kampagnen ──────────────────────────────────────────
//
// Drei Säulen:
//  1. email_templates  – wiederverwendbare Vorlagen mit Platzhaltern
//  2. email_campaigns  – einmaliger Broadcast an ein Segment
//  3. email_flows      – automatisierte Funnel-Sequenzen mit Triggern
//
// Jeder Versand wird in email_sends protokolliert (Idempotenz, Cooldown,
// Tracking). Abmeldungen laufen zusätzlich über einen HMAC-Token ab, der
// pro Nutzer deterministisch berechnet wird – dafür brauchen wir keine
// eigene Tabelle, wohl aber eine optionale revoke-Liste wäre möglich.

/** Filter-JSON für ein Nutzer-Segment. */
export interface SegmentFilter {
  /** Gekaufte Status: undefined = egal, true = hat mind. 1× gekauft, false = nichts gekauft. */
  hasPurchased?: boolean;
  /** ISO-Datum – Nutzer muss am oder nach diesem Datum registriert sein. */
  registeredAfter?: string | null;
  /** ISO-Datum – Nutzer muss am oder vor diesem Datum registriert sein. */
  registeredBefore?: string | null;
  /** Registrierung liegt mindestens N Tage zurück (optional, für Funnels). */
  registeredAtLeastDaysAgo?: number | null;
  /** Registrierung liegt höchstens N Tage zurück. */
  registeredAtMostDaysAgo?: number | null;
}

export const emailTemplates = pgTable("email_templates", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  subject: varchar("subject", { length: 300 }).notNull(),
  preheader: varchar("preheader", { length: 300 }),
  /** Vollständiger HTML-Body. Platzhalter {{firstName}}, {{unsubscribeUrl}}, {{appUrl}}. */
  htmlBody: text("html_body").notNull(),
  /** Optional: reine Textfassung. Wenn leer, wird automatisch aus htmlBody generiert. */
  textBody: text("text_body"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const campaignStatuses = [
  "draft",
  "scheduled",
  "sending",
  "sent",
  "failed",
] as const;
export type CampaignStatus = (typeof campaignStatuses)[number];

export const emailCampaigns = pgTable("email_campaigns", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  templateId: integer("template_id")
    .notNull()
    .references(() => emailTemplates.id, { onDelete: "restrict" }),
  /** SegmentFilter als JSON – s. SegmentFilter. */
  segmentFilter: jsonb("segment_filter").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("draft"),
  /** Geplanter Versandzeitpunkt (optional). */
  scheduledAt: timestamp("scheduled_at"),
  startedAt: timestamp("started_at"),
  sentAt: timestamp("sent_at"),
  /** Aggregierte Statistik – wird während und nach dem Versand aktualisiert. */
  stats: jsonb("stats"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const flowTriggerTypes = [
  // Sofort beim Event
  "registration",
  "first_purchase",
  // Zeitgesteuert: Nutzer erfüllt Bedingung seit N Tagen
  "no_purchase_after_days",
  "credits_low",
  "inactive_since_days",
] as const;
export type FlowTriggerType = (typeof flowTriggerTypes)[number];

export interface FlowTriggerConfig {
  /** Für no_purchase_after_days / inactive_since_days. */
  days?: number;
  /** Für credits_low: Schwellwert. */
  threshold?: number;
}

export const emailFlows = pgTable("email_flows", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  triggerType: varchar("trigger_type", { length: 50 }).notNull(),
  triggerConfig: jsonb("trigger_config"),
  enabled: boolean("enabled").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const emailFlowSteps = pgTable("email_flow_steps", {
  id: serial("id").primaryKey(),
  flowId: integer("flow_id")
    .notNull()
    .references(() => emailFlows.id, { onDelete: "cascade" }),
  stepOrder: integer("step_order").notNull().default(0),
  /** Verzögerung in Stunden nach dem Trigger bzw. nach dem vorherigen Step. */
  delayHours: integer("delay_hours").notNull().default(0),
  templateId: integer("template_id")
    .notNull()
    .references(() => emailTemplates.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sendStatuses = [
  "queued",
  "sent",
  "delivered",
  "opened",
  "clicked",
  "bounced",
  "failed",
  "skipped",
] as const;
export type SendStatus = (typeof sendStatuses)[number];

export const emailSends = pgTable(
  "email_sends",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    /** Ziel-Adresse (für Test-Versand an beliebige Mail-Adressen). */
    toEmail: varchar("to_email", { length: 320 }).notNull(),
    templateId: integer("template_id").references(() => emailTemplates.id, {
      onDelete: "set null",
    }),
    campaignId: integer("campaign_id").references(() => emailCampaigns.id, {
      onDelete: "set null",
    }),
    flowId: integer("flow_id").references(() => emailFlows.id, {
      onDelete: "set null",
    }),
    flowStepId: integer("flow_step_id").references(() => emailFlowSteps.id, {
      onDelete: "set null",
    }),
    /** Unterscheidet z. B. Test-Mails von echten. */
    kind: varchar("kind", { length: 20 }).notNull().default("campaign"),
    status: varchar("status", { length: 20 }).notNull().default("queued"),
    subject: varchar("subject", { length: 300 }),
    resendMessageId: varchar("resend_message_id", { length: 200 }),
    errorMessage: text("error_message"),
    sentAt: timestamp("sent_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("email_sends_user_idx").on(table.userId),
    campaignIdx: index("email_sends_campaign_idx").on(table.campaignId),
    flowStepIdx: index("email_sends_flow_step_idx").on(table.flowStepId),
    createdIdx: index("email_sends_created_idx").on(table.createdAt),
  }),
);

// ─── Zod / Insert-Schemas ──────────────────────────────────────────────────

export const insertEmailTemplateSchema = createInsertSchema(emailTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEmailCampaignSchema = createInsertSchema(emailCampaigns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  startedAt: true,
  sentAt: true,
  stats: true,
  errorMessage: true,
});

export const insertEmailFlowSchema = createInsertSchema(emailFlows).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEmailFlowStepSchema = createInsertSchema(emailFlowSteps).omit({
  id: true,
  createdAt: true,
});

export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailTemplate = z.infer<typeof insertEmailTemplateSchema>;
export type EmailCampaign = typeof emailCampaigns.$inferSelect;
export type InsertEmailCampaign = z.infer<typeof insertEmailCampaignSchema>;
export type EmailFlow = typeof emailFlows.$inferSelect;
export type InsertEmailFlow = z.infer<typeof insertEmailFlowSchema>;
export type EmailFlowStep = typeof emailFlowSteps.$inferSelect;
export type InsertEmailFlowStep = z.infer<typeof insertEmailFlowStepSchema>;
export type EmailSend = typeof emailSends.$inferSelect;

export const flowTriggerLabels: Record<FlowTriggerType, string> = {
  registration: "Neue Registrierung",
  first_purchase: "Erster Kauf",
  no_purchase_after_days: "Kein Kauf nach X Tagen",
  credits_low: "Credits fast aufgebraucht",
  inactive_since_days: "Inaktiv seit X Tagen",
};
