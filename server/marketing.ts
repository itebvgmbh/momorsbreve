import crypto from "crypto";
import { Resend } from "resend";
import { and, desc, eq, gte, lte, sql, inArray } from "drizzle-orm";
import { db } from "./db";
import {
  emailCampaigns,
  emailFlowSteps,
  emailFlows,
  emailSends,
  emailTemplates,
  paymentOrders,
  userCredits,
  users as usersTable,
  type EmailTemplate,
  type EmailCampaign,
  type EmailFlow,
  type EmailFlowStep,
  type FlowTriggerConfig,
  type FlowTriggerType,
  type SegmentFilter,
} from "@shared/schema";

// ─── Konfiguration ─────────────────────────────────────────────────────────

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_API_BASE = "https://api.resend.com";
const RESEND_MARKETING_SEGMENT_ID = process.env.RESEND_MARKETING_SEGMENT_ID;
const RESEND_WEBHOOK_SECRET = process.env.RESEND_WEBHOOK_SECRET;
const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ?? "MormorsBreve <noreply@mormorsbreve.dk>";
const APP_BASE_URL = (process.env.APP_URL ?? "https://mormorsbreve.dk").replace(
  /\/$/,
  "",
);
const UNSUBSCRIBE_SECRET =
  process.env.UNSUBSCRIBE_SECRET ||
  process.env.SESSION_SECRET ||
  "mormorsbreve-unsubscribe-fallback";

/** Mindestabstand zwischen zwei Marketing-Mails an denselben Nutzer. */
const COOLDOWN_HOURS = 48;
/** Versand-Batch für Broadcasts (Resend-API nicht überfahren). */
const SEND_BATCH_SIZE = 20;
/** Pause zwischen zwei Batches (ms). */
const SEND_BATCH_DELAY_MS = 1000;

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

function isMarketingEnabled(): boolean {
  return resend !== null;
}

function assertValidResendSegmentId(segmentId: string): void {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segmentId)) {
    throw new Error(
      "Bitte eine gültige Resend Segment-ID eintragen. Das ist nicht der Segment-Name, sondern die UUID aus Resend, z. B. 78261eea-8f8b-4381-83c6-79fa7120f1cf.",
    );
  }
}

async function resendApiRequest<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  if (!RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY nicht gesetzt");
  }

  const response = await fetch(`${RESEND_API_BASE}${path}`, {
    method: options.method ?? "GET",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message =
      payload?.message ??
      payload?.error?.message ??
      payload?.error ??
      payload?.name ??
      `Resend API Fehler (${response.status})`;
    const error = new Error(
      typeof message === "string" ? message : `Resend API Fehler (${response.status})`,
    ) as Error & { status?: number; payload?: unknown };
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload as T;
}

// ─── Unsubscribe-Tokens (HMAC, deterministisch) ────────────────────────────

export function buildUnsubscribeToken(userId: string): string {
  return crypto
    .createHmac("sha256", UNSUBSCRIBE_SECRET)
    .update(userId)
    .digest("hex")
    .slice(0, 32);
}

export function verifyUnsubscribeToken(
  userId: string,
  token: string,
): boolean {
  const expected = buildUnsubscribeToken(userId);
  if (expected.length !== token.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token));
}

export function buildUnsubscribeUrl(userId: string): string {
  const token = buildUnsubscribeToken(userId);
  const uid = encodeURIComponent(userId);
  return `${APP_BASE_URL}/api/unsubscribe?uid=${uid}&token=${token}`;
}

// ─── Segment-Auflösung ─────────────────────────────────────────────────────

export interface SegmentRecipient {
  userId: string;
  email: string;
  firstName: string | null;
  credits: number;
}

/**
 * Findet alle Nutzer, die ein Segment erfüllen.
 * Newsletter-Opt-In und eine gültige E-Mail sind IMMER Pflicht.
 */
export async function resolveSegment(
  filter: SegmentFilter,
  opts: { includeUserIds?: string[] } = {},
): Promise<SegmentRecipient[]> {
  // Subquery: Anzahl completed Orders pro User
  const purchaseCount = db
    .select({
      userId: paymentOrders.userId,
      count: sql<number>`count(*)::int`.as("purchase_count"),
    })
    .from(paymentOrders)
    .where(eq(paymentOrders.status, "completed"))
    .groupBy(paymentOrders.userId)
    .as("pc");

  const conditions = [
    eq(usersTable.newsletterOptIn, true),
    sql`${usersTable.email} IS NOT NULL AND ${usersTable.email} <> ''`,
  ];

  if (filter.registeredAfter) {
    conditions.push(gte(usersTable.createdAt, new Date(filter.registeredAfter)));
  }
  if (filter.registeredBefore) {
    conditions.push(lte(usersTable.createdAt, new Date(filter.registeredBefore)));
  }
  if (filter.registeredAtLeastDaysAgo != null) {
    const cutoff = new Date(
      Date.now() - filter.registeredAtLeastDaysAgo * 24 * 60 * 60 * 1000,
    );
    conditions.push(lte(usersTable.createdAt, cutoff));
  }
  if (filter.registeredAtMostDaysAgo != null) {
    const cutoff = new Date(
      Date.now() - filter.registeredAtMostDaysAgo * 24 * 60 * 60 * 1000,
    );
    conditions.push(gte(usersTable.createdAt, cutoff));
  }
  if (opts.includeUserIds && opts.includeUserIds.length > 0) {
    conditions.push(inArray(usersTable.id, opts.includeUserIds));
  }

  const rows = await db
    .select({
      userId: usersTable.id,
      email: usersTable.email,
      firstName: usersTable.firstName,
      purchaseCount: purchaseCount.count,
      credits: userCredits.credits,
    })
    .from(usersTable)
    .leftJoin(purchaseCount, eq(purchaseCount.userId, usersTable.id))
    .leftJoin(userCredits, eq(userCredits.userId, usersTable.id))
    .where(and(...conditions));

  return rows
    .filter((r) => {
      const count = Number(r.purchaseCount) || 0;
      if (filter.hasPurchased === true && count === 0) return false;
      if (filter.hasPurchased === false && count > 0) return false;
      return !!r.email;
    })
    .map((r) => ({
      userId: r.userId!,
      email: r.email!,
      firstName: r.firstName ?? null,
      credits: r.credits ?? 0,
    }));
}

export async function countSegment(filter: SegmentFilter): Promise<number> {
  const recipients = await resolveSegment(filter);
  return recipients.length;
}

// ─── Resend Marketing-Segment-Sync ─────────────────────────────────────────

export interface ResendMarketingSegmentSyncOptions {
  segmentId?: string;
  registeredAfter?: string;
}

export interface ResendMarketingSegmentSyncResult {
  segmentId: string;
  registeredAfter: string;
  totalEligible: number;
  created: number;
  updated: number;
  addedToSegment: number;
  failed: number;
  errors: Array<{ email: string; message: string }>;
}

async function addContactToResendSegment(
  email: string,
  segmentId: string,
): Promise<void> {
  try {
    await resendApiRequest(
      `/contacts/${encodeURIComponent(email)}/segments/${encodeURIComponent(segmentId)}`,
      { method: "POST" },
    );
  } catch (err) {
    if (!isAlreadyExistsError(err)) throw err;
  }
}

function isAlreadyExistsError(err: unknown): boolean {
  const e = err as { status?: number; message?: string };
  return e.status === 409 || /already exists|existiert bereits/i.test(e.message ?? "");
}

/**
 * Synchronisiert lokale Newsletter-Nutzer in ein Resend-Marketing-Segment.
 *
 * Bereits existierende Resend-Kontakte werden nur mit Namen aktualisiert und
 * dem Segment hinzugefügt. Der globale Resend-Unsubscribe-Status wird dabei
 * nicht zurück auf `false` gesetzt.
 */
export async function syncResendMarketingSegment(
  options: ResendMarketingSegmentSyncOptions = {},
): Promise<ResendMarketingSegmentSyncResult> {
  const segmentId = options.segmentId?.trim() || RESEND_MARKETING_SEGMENT_ID;
  if (!segmentId) {
    throw new Error("RESEND_MARKETING_SEGMENT_ID fehlt");
  }
  assertValidResendSegmentId(segmentId);

  const registeredAfter =
    options.registeredAfter ?? "2026-03-16T00:00:00.000Z";
  const cutoff = new Date(registeredAfter);
  if (Number.isNaN(cutoff.getTime())) {
    throw new Error("registeredAfter ist kein gültiges Datum");
  }

  const rows = await db
    .select({
      email: usersTable.email,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
    })
    .from(usersTable)
    .where(
      and(
        eq(usersTable.newsletterOptIn, true),
        sql`${usersTable.email} IS NOT NULL AND ${usersTable.email} <> ''`,
        gte(usersTable.createdAt, cutoff),
      ),
    );

  const result: ResendMarketingSegmentSyncResult = {
    segmentId,
    registeredAfter: cutoff.toISOString(),
    totalEligible: rows.length,
    created: 0,
    updated: 0,
    addedToSegment: 0,
    failed: 0,
    errors: [],
  };

  for (const row of rows) {
    const email = row.email!;
    const firstName = row.firstName?.trim() || undefined;
    const lastName = row.lastName?.trim() || undefined;

    try {
      try {
        await resendApiRequest("/contacts", {
          method: "POST",
          body: {
            email,
            first_name: firstName,
            last_name: lastName,
            unsubscribed: false,
          },
        });
        result.created++;
      } catch (err) {
        if (!isAlreadyExistsError(err)) throw err;
        if (firstName || lastName) {
          await resendApiRequest(`/contacts/${encodeURIComponent(email)}`, {
            method: "PATCH",
            body: {
              first_name: firstName,
              last_name: lastName,
            },
          });
        }
        result.updated++;
      }

      await addContactToResendSegment(email, segmentId);
      result.addedToSegment++;
    } catch (err: any) {
      result.failed++;
      result.errors.push({
        email,
        message: err?.message ?? "Unbekannter Resend-Fehler",
      });
    }
  }

  return result;
}

// ─── Template-Rendering ────────────────────────────────────────────────────

export interface RenderContext {
  firstName?: string | null;
  email: string;
  userId: string;
  credits?: number;
}

function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/(p|div|tr|h[1-6]|li)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function wrapWithFooter(
  html: string,
  unsubscribeUrl: string,
  preheader?: string | null,
): string {
  const preheaderHtml = preheader
    ? `<div style="display:none;font-size:1px;color:#f0ebe3;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(preheader)}</div>`
    : "";

  const footer = `
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:24px;">
  <tr><td align="center" style="padding:24px 20px;font-family:Helvetica,Arial,sans-serif;font-size:12px;color:#9a8c7a;line-height:1.5;">
    <p style="margin:0 0 6px 0;">
      <a href="${escapeHtml(APP_BASE_URL)}" style="color:#7a6b56;text-decoration:none;font-weight:600;">MormorsBreve.de</a> &middot;
      Historische Handschriften lesen &amp; bewahren
    </p>
    <p style="margin:0;color:#b5a893;">
      Diese E-Mail erhalten Sie, weil Sie sich bei MormorsBreve registriert haben.
      <br>
      <a href="${escapeHtml(unsubscribeUrl)}" style="color:#7a6b56;text-decoration:underline;">Newsletter abbestellen</a>
    </p>
  </td></tr>
</table>`;

  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, `${footer}</body>`);
  }
  return `${preheaderHtml}${html}${footer}`;
}

export function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export interface RenderedBroadcast {
  subject: string;
  html: string;
  text?: string;
}

function renderBroadcastTemplate(template: EmailTemplate): RenderedBroadcast {
  const vars: Record<string, string> = {
    firstName: "{{{contact.first_name|}}}",
    email: "{{{contact.email}}}",
    credits: "",
    unsubscribeUrl: "{{{RESEND_UNSUBSCRIBE_URL}}}",
    appUrl: APP_BASE_URL,
  };

  const substitute = (input: string): string =>
    input.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, key: string) =>
      key in vars ? vars[key] : "",
    );

  const subject = substitute(template.subject);
  const htmlInner = substitute(template.htmlBody);
  const html = wrapWithFooter(
    htmlInner,
    "{{{RESEND_UNSUBSCRIBE_URL}}}",
    template.preheader,
  );
  const text = template.textBody
    ? (() => {
        const renderedText = substitute(template.textBody);
        if (renderedText.includes("{{{RESEND_UNSUBSCRIBE_URL}}}")) {
          return renderedText;
        }
        return `${renderedText}\n\nNewsletter abbestellen: {{{RESEND_UNSUBSCRIBE_URL}}}`;
      })()
    : undefined;

  return { subject, html, text };
}

/** Ersetzt {{firstName}} etc. im Body/Subject und hängt den Footer an. */
export function renderTemplate(
  template: EmailTemplate,
  ctx: RenderContext,
): RenderedEmail {
  const unsubscribeUrl = buildUnsubscribeUrl(ctx.userId);
  const vars: Record<string, string> = {
    firstName: ctx.firstName?.trim() || "",
    email: ctx.email,
    credits: String(ctx.credits ?? 0),
    unsubscribeUrl,
    appUrl: APP_BASE_URL,
  };

  const substitute = (input: string): string =>
    input.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, key: string) =>
      key in vars ? vars[key] : "",
    );

  const subject = substitute(template.subject);
  const htmlInner = substitute(template.htmlBody);
  const html = wrapWithFooter(htmlInner, unsubscribeUrl, template.preheader);
  const text = template.textBody
    ? substitute(template.textBody)
    : htmlToText(html);

  return { subject, html, text };
}

// ─── Resend Broadcasts (Marketing-Limits) ──────────────────────────────────

export interface CreateResendBroadcastOptions {
  templateId: number;
  segmentId?: string;
  send?: boolean;
  scheduledAt?: string | null;
  name?: string | null;
}

export interface CreateResendBroadcastResult {
  id: string;
  segmentId: string;
  subject: string;
  send: boolean;
  scheduledAt: string | null;
}

export async function createResendBroadcastFromTemplate(
  options: CreateResendBroadcastOptions,
): Promise<CreateResendBroadcastResult> {
  const segmentId = options.segmentId?.trim() || RESEND_MARKETING_SEGMENT_ID;
  if (!segmentId) {
    throw new Error("RESEND_MARKETING_SEGMENT_ID fehlt");
  }
  assertValidResendSegmentId(segmentId);

  const [template] = await db
    .select()
    .from(emailTemplates)
    .where(eq(emailTemplates.id, options.templateId));
  if (!template) {
    throw new Error("Template nicht gefunden");
  }

  const rendered = renderBroadcastTemplate(template);
  const body: Record<string, unknown> = {
    segment_id: segmentId,
    from: FROM_EMAIL,
    subject: rendered.subject,
    html: rendered.html,
  };
  if (rendered.text) body.text = rendered.text;

  const name = options.name?.trim() || template.name;
  if (name) body.name = name;

  if (options.send) {
    body.send = true;
    if (options.scheduledAt) {
      body.scheduled_at = options.scheduledAt;
    }
  }

  const response = await resendApiRequest<{ id: string }>("/broadcasts", {
    method: "POST",
    body,
  });

  return {
    id: response.id,
    segmentId,
    subject: rendered.subject,
    send: options.send === true,
    scheduledAt: options.scheduledAt ?? null,
  };
}

// ─── Resend Webhooks ───────────────────────────────────────────────────────

type ResendWebhookEvent = {
  type?: string;
  data?: {
    email?: string;
    unsubscribed?: boolean;
  };
};

export interface ResendWebhookResult {
  ok: true;
  action: "ignored" | "unsubscribed";
  eventType?: string;
  email?: string;
  updatedUsers?: number;
}

function readHeader(
  headers: Record<string, string | string[] | undefined>,
  name: string,
): string | undefined {
  const value = headers[name] ?? headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

async function verifyResendWebhook(
  payload: string,
  headers: Record<string, string | string[] | undefined>,
): Promise<ResendWebhookEvent> {
  if (!RESEND_WEBHOOK_SECRET) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("RESEND_WEBHOOK_SECRET fehlt");
    }
    console.warn("[Resend Webhook] Ohne Signaturprüfung verarbeitet (dev mode). RESEND_WEBHOOK_SECRET nicht gesetzt.");
    return JSON.parse(payload) as ResendWebhookEvent;
  }

  const id = readHeader(headers, "svix-id");
  const timestamp = readHeader(headers, "svix-timestamp");
  const signature = readHeader(headers, "svix-signature");
  if (!id || !timestamp || !signature) {
    throw new Error("Resend Webhook Signatur-Header fehlen");
  }

  if (!resend || !(resend as any).webhooks?.verify) {
    throw new Error("Resend Webhook-Verifikation ist nicht verfügbar");
  }

  return await Promise.resolve(
    (resend as any).webhooks.verify({
      payload,
      headers: { id, timestamp, signature },
      webhookSecret: RESEND_WEBHOOK_SECRET,
    }),
  );
}

export async function handleResendWebhook(
  rawBody: unknown,
  parsedBody: unknown,
  headers: Record<string, string | string[] | undefined>,
): Promise<ResendWebhookResult> {
  const payload = Buffer.isBuffer(rawBody)
    ? rawBody.toString("utf8")
    : typeof rawBody === "string"
      ? rawBody
      : JSON.stringify(parsedBody ?? {});

  const event = await verifyResendWebhook(payload, headers);
  if (event.type !== "contact.updated") {
    return { ok: true, action: "ignored", eventType: event.type };
  }

  const email = event.data?.email?.trim();
  if (!email || event.data?.unsubscribed !== true) {
    return { ok: true, action: "ignored", eventType: event.type, email };
  }

  const updated = await db
    .update(usersTable)
    .set({ newsletterOptIn: false, updatedAt: new Date() })
    .where(sql`lower(${usersTable.email}) = lower(${email})`)
    .returning({ id: usersTable.id });

  return {
    ok: true,
    action: "unsubscribed",
    eventType: event.type,
    email,
    updatedUsers: updated.length,
  };
}

// ─── Cooldown-Prüfung ──────────────────────────────────────────────────────

/**
 * Prüft, ob der Nutzer in den letzten COOLDOWN_HOURS schon eine Marketing-Mail
 * bekommen hat (egal ob Kampagne oder Flow). Test-Mails (kind='test') werden
 * ignoriert.
 */
async function isUserOnCooldown(
  userId: string,
  now: Date = new Date(),
): Promise<boolean> {
  const cutoff = new Date(now.getTime() - COOLDOWN_HOURS * 60 * 60 * 1000);
  const [row] = await db
    .select({ id: emailSends.id })
    .from(emailSends)
    .where(
      and(
        eq(emailSends.userId, userId),
        gte(emailSends.createdAt, cutoff),
        inArray(emailSends.kind, ["campaign", "flow", "direct"]),
        inArray(emailSends.status, ["sent", "delivered", "opened", "clicked"]),
      ),
    )
    .limit(1);
  return !!row;
}

// ─── Versand ───────────────────────────────────────────────────────────────

interface SendOneParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
  userId: string | null;
  templateId: number | null;
  campaignId?: number | null;
  flowId?: number | null;
  flowStepId?: number | null;
  kind: "campaign" | "flow" | "test" | "direct";
}

async function sendOne(params: SendOneParams): Promise<"sent" | "failed"> {
  if (!resend) {
    await db.insert(emailSends).values({
      userId: params.userId,
      toEmail: params.to,
      templateId: params.templateId,
      campaignId: params.campaignId ?? null,
      flowId: params.flowId ?? null,
      flowStepId: params.flowStepId ?? null,
      kind: params.kind,
      status: "failed",
      subject: params.subject,
      errorMessage: "RESEND_API_KEY nicht gesetzt",
    });
    return "failed";
  }

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
      headers: params.userId
        ? {
            "List-Unsubscribe": `<${buildUnsubscribeUrl(params.userId)}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          }
        : undefined,
    });

    await db.insert(emailSends).values({
      userId: params.userId,
      toEmail: params.to,
      templateId: params.templateId,
      campaignId: params.campaignId ?? null,
      flowId: params.flowId ?? null,
      flowStepId: params.flowStepId ?? null,
      kind: params.kind,
      status: "sent",
      subject: params.subject,
      resendMessageId: result.data?.id ?? null,
      sentAt: new Date(),
    });
    return "sent";
  } catch (err: any) {
    const message = err?.message ?? String(err);
    console.error("[Marketing] Resend send failed:", message);
    await db.insert(emailSends).values({
      userId: params.userId,
      toEmail: params.to,
      templateId: params.templateId,
      campaignId: params.campaignId ?? null,
      flowId: params.flowId ?? null,
      flowStepId: params.flowStepId ?? null,
      kind: params.kind,
      status: "failed",
      subject: params.subject,
      errorMessage: message.slice(0, 2000),
    });
    return "failed";
  }
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Test-Versand (an beliebige Adresse) ───────────────────────────────────

export async function sendTestEmail(
  templateId: number,
  toEmail: string,
): Promise<void> {
  const [template] = await db
    .select()
    .from(emailTemplates)
    .where(eq(emailTemplates.id, templateId));
  if (!template) throw new Error("Template nicht gefunden");

  // Für Test: synthetischen Kontext – firstName=Max, credits=3
  const rendered = renderTemplate(template, {
    firstName: "Max",
    email: toEmail,
    userId: `test-${Date.now()}`,
    credits: 3,
  });

  await sendOne({
    to: toEmail,
    subject: `[TEST] ${rendered.subject}`,
    html: rendered.html,
    text: rendered.text,
    userId: null,
    templateId: template.id,
    kind: "test",
  });
}

// ─── Direkt-Versand an einzelne Nutzer (manuell aus Nutzerübersicht) ──────

export interface DirectSendPerUserResult {
  userId: string;
  email: string;
  status: "sent" | "failed" | "skipped_optin" | "skipped_no_email" | "skipped_cooldown" | "skipped_not_found";
  error?: string;
}

export interface DirectSendResult {
  totalRequested: number;
  sent: number;
  failed: number;
  skipped: number;
  perUser: DirectSendPerUserResult[];
}

export interface DirectSendOptions {
  /** Cooldown ignorieren (z. B. wenn Admin sich bewusst entscheidet). Default: false. */
  ignoreCooldown?: boolean;
  /** Opt-In ignorieren (z. B. für transaktionale Info-Mails an bestimmte Nutzer). Default: false – rechtlich heikel! */
  ignoreOptIn?: boolean;
}

/**
 * Schickt eine Vorlage on-demand an ausgewählte Nutzer.
 * - Respektiert standardmäßig Newsletter-Opt-In und 48h-Cooldown.
 * - Loggt jeden Versuch (auch übersprungene) in `email_sends` mit `kind='direct'`.
 */
export async function sendTemplateToUsers(
  templateId: number,
  userIds: string[],
  options: DirectSendOptions = {},
): Promise<DirectSendResult> {
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
  const result: DirectSendResult = {
    totalRequested: uniqueIds.length,
    sent: 0,
    failed: 0,
    skipped: 0,
    perUser: [],
  };

  if (uniqueIds.length === 0) return result;

  const [template] = await db
    .select()
    .from(emailTemplates)
    .where(eq(emailTemplates.id, templateId));
  if (!template) {
    throw new Error("Template nicht gefunden");
  }

  // Nutzerdaten inkl. Credits laden
  const rows = await db
    .select({
      userId: usersTable.id,
      email: usersTable.email,
      firstName: usersTable.firstName,
      newsletterOptIn: usersTable.newsletterOptIn,
      credits: userCredits.credits,
    })
    .from(usersTable)
    .leftJoin(userCredits, eq(userCredits.userId, usersTable.id))
    .where(inArray(usersTable.id, uniqueIds));

  const byId = new Map(rows.map((r) => [r.userId, r]));

  for (const userId of uniqueIds) {
    const row = byId.get(userId);
    if (!row) {
      result.skipped++;
      result.perUser.push({
        userId,
        email: "",
        status: "skipped_not_found",
        error: "Nutzer existiert nicht mehr",
      });
      continue;
    }

    if (!row.email) {
      result.skipped++;
      result.perUser.push({
        userId,
        email: "",
        status: "skipped_no_email",
        error: "Nutzer hat keine E-Mail-Adresse",
      });
      await db.insert(emailSends).values({
        userId,
        toEmail: "",
        templateId: template.id,
        kind: "direct",
        status: "skipped",
        subject: template.subject,
        errorMessage: "Keine E-Mail-Adresse",
      });
      continue;
    }

    if (!row.newsletterOptIn && !options.ignoreOptIn) {
      result.skipped++;
      result.perUser.push({
        userId,
        email: row.email,
        status: "skipped_optin",
        error: "Nutzer hat Newsletter nicht bestätigt",
      });
      await db.insert(emailSends).values({
        userId,
        toEmail: row.email,
        templateId: template.id,
        kind: "direct",
        status: "skipped",
        subject: template.subject,
        errorMessage: "Newsletter-Opt-In fehlt",
      });
      continue;
    }

    if (!options.ignoreCooldown && (await isUserOnCooldown(userId))) {
      result.skipped++;
      result.perUser.push({
        userId,
        email: row.email,
        status: "skipped_cooldown",
        error: "48h-Cooldown aktiv",
      });
      await db.insert(emailSends).values({
        userId,
        toEmail: row.email,
        templateId: template.id,
        kind: "direct",
        status: "skipped",
        subject: template.subject,
        errorMessage: "Cooldown aktiv",
      });
      continue;
    }

    const rendered = renderTemplate(template, {
      firstName: row.firstName,
      email: row.email,
      userId,
      credits: row.credits ?? 0,
    });

    const status = await sendOne({
      to: row.email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      userId,
      templateId: template.id,
      kind: "direct",
    });

    if (status === "sent") {
      result.sent++;
      result.perUser.push({ userId, email: row.email, status: "sent" });
    } else {
      result.failed++;
      result.perUser.push({
        userId,
        email: row.email,
        status: "failed",
        error: "Resend-Versand fehlgeschlagen",
      });
    }
  }

  return result;
}

// ─── Broadcast-Kampagne versenden ──────────────────────────────────────────

export interface CampaignRunResult {
  totalRecipients: number;
  sent: number;
  failed: number;
  skippedCooldown: number;
}

/**
 * Führt eine Kampagne aus: löst das Segment auf, rendert pro Nutzer und
 * versendet in kleinen Batches. Aktualisiert Status und Stats auf der
 * Kampagne. Ist idempotent: setzt beim Start status='sending', am Ende
 * 'sent' oder 'failed'.
 */
export async function runCampaign(campaignId: number): Promise<CampaignRunResult> {
  const [campaign] = await db
    .select()
    .from(emailCampaigns)
    .where(eq(emailCampaigns.id, campaignId));
  if (!campaign) throw new Error("Kampagne nicht gefunden");

  if (campaign.status === "sending" || campaign.status === "sent") {
    throw new Error(`Kampagne ist bereits im Status ${campaign.status}`);
  }

  const [template] = await db
    .select()
    .from(emailTemplates)
    .where(eq(emailTemplates.id, campaign.templateId));
  if (!template) throw new Error("Template für Kampagne nicht gefunden");

  await db
    .update(emailCampaigns)
    .set({
      status: "sending",
      startedAt: new Date(),
      errorMessage: null,
      updatedAt: new Date(),
    })
    .where(eq(emailCampaigns.id, campaignId));

  const filter = (campaign.segmentFilter as SegmentFilter) ?? {};
  const recipients = await resolveSegment(filter);

  const result: CampaignRunResult = {
    totalRecipients: recipients.length,
    sent: 0,
    failed: 0,
    skippedCooldown: 0,
  };

  try {
    for (let i = 0; i < recipients.length; i += SEND_BATCH_SIZE) {
      const batch = recipients.slice(i, i + SEND_BATCH_SIZE);
      await Promise.all(
        batch.map(async (recipient) => {
          if (await isUserOnCooldown(recipient.userId)) {
            await db.insert(emailSends).values({
              userId: recipient.userId,
              toEmail: recipient.email,
              templateId: template.id,
              campaignId: campaign.id,
              kind: "campaign",
              status: "skipped",
              subject: template.subject,
              errorMessage: "Cooldown aktiv",
            });
            result.skippedCooldown++;
            return;
          }
          const rendered = renderTemplate(template, {
            firstName: recipient.firstName,
            email: recipient.email,
            userId: recipient.userId,
            credits: recipient.credits,
          });
          const status = await sendOne({
            to: recipient.email,
            subject: rendered.subject,
            html: rendered.html,
            text: rendered.text,
            userId: recipient.userId,
            templateId: template.id,
            campaignId: campaign.id,
            kind: "campaign",
          });
          if (status === "sent") result.sent++;
          else result.failed++;
        }),
      );
      if (i + SEND_BATCH_SIZE < recipients.length) {
        await sleep(SEND_BATCH_DELAY_MS);
      }
    }

    await db
      .update(emailCampaigns)
      .set({
        status: "sent",
        sentAt: new Date(),
        stats: result as unknown as Record<string, number>,
        updatedAt: new Date(),
      })
      .where(eq(emailCampaigns.id, campaignId));
  } catch (err: any) {
    console.error("[Marketing] Campaign run failed:", err);
    await db
      .update(emailCampaigns)
      .set({
        status: "failed",
        errorMessage: (err?.message ?? String(err)).slice(0, 2000),
        stats: result as unknown as Record<string, number>,
        updatedAt: new Date(),
      })
      .where(eq(emailCampaigns.id, campaignId));
  }

  return result;
}

// ─── Flow-Scheduler (Trigger) ──────────────────────────────────────────────

/**
 * Findet für einen Flow-Step alle Nutzer, die den Trigger aktuell erfüllen
 * und diesen Step noch NICHT erhalten haben. Verzögerung des Steps wird
 * berücksichtigt.
 */
async function findEligibleForFlowStep(
  flow: EmailFlow,
  step: EmailFlowStep,
): Promise<SegmentRecipient[]> {
  const trigger = flow.triggerType as FlowTriggerType;
  const cfg = (flow.triggerConfig as FlowTriggerConfig) ?? {};

  // Basis-Filter: Opt-In, gültige Mail
  const baseFilter: SegmentFilter = {};

  // Der Step hat eine Verzögerung – die Trigger-Bedingung muss seit mindestens
  // (step.delayHours in Tagen) erfüllt sein.
  const delayDays = step.delayHours / 24;

  switch (trigger) {
    case "registration": {
      // Alle Opt-In-Nutzer, deren Registrierung mindestens delayDays zurückliegt.
      baseFilter.registeredAtLeastDaysAgo = delayDays;
      break;
    }
    case "no_purchase_after_days": {
      // Nutzer, registriert vor mindestens (days + delayDays) Tagen und ohne Kauf.
      baseFilter.hasPurchased = false;
      baseFilter.registeredAtLeastDaysAgo = (cfg.days ?? 0) + delayDays;
      break;
    }
    case "inactive_since_days": {
      // Ohne echte "last_active" Spalte approximieren wir über Registrierung + keine Käufe.
      baseFilter.registeredAtLeastDaysAgo = (cfg.days ?? 0) + delayDays;
      break;
    }
    case "first_purchase": {
      // Alle Käufer; Dedup via email_sends verhindert Doppelversand.
      baseFilter.hasPurchased = true;
      break;
    }
    case "credits_low":
      // Wird separat behandelt (braucht credits-Schwellwert).
      break;
  }

  let candidates = await resolveSegment(baseFilter);

  if (trigger === "credits_low") {
    const threshold = cfg.threshold ?? 1;
    candidates = candidates.filter((c) => c.credits <= threshold);
  }

  if (candidates.length === 0) return [];

  // Bereits versandt? -> einmaliger Versand pro (user, flowStep)
  const userIds = candidates.map((c) => c.userId);
  const alreadySent = await db
    .select({ userId: emailSends.userId })
    .from(emailSends)
    .where(
      and(
        eq(emailSends.flowStepId, step.id),
        inArray(emailSends.userId, userIds),
      ),
    );
  const sentSet = new Set(alreadySent.map((r) => r.userId!).filter(Boolean));

  return candidates.filter((c) => !sentSet.has(c.userId));
}

/**
 * Läuft regelmäßig, prüft alle aktiven Flows und versendet fällige Steps.
 */
export async function runFlowScheduler(): Promise<void> {
  if (!isMarketingEnabled()) return;

  const activeFlows = await db
    .select()
    .from(emailFlows)
    .where(eq(emailFlows.enabled, true));
  if (activeFlows.length === 0) return;

  for (const flow of activeFlows) {
    const steps = await db
      .select()
      .from(emailFlowSteps)
      .where(eq(emailFlowSteps.flowId, flow.id))
      .orderBy(emailFlowSteps.stepOrder);
    if (steps.length === 0) continue;

    for (const step of steps) {
      let recipients: SegmentRecipient[];
      try {
        recipients = await findEligibleForFlowStep(flow, step);
      } catch (err) {
        console.error(
          `[Marketing] Flow ${flow.id} Step ${step.id} eligibility error:`,
          err,
        );
        continue;
      }
      if (recipients.length === 0) continue;

      const [template] = await db
        .select()
        .from(emailTemplates)
        .where(eq(emailTemplates.id, step.templateId));
      if (!template) {
        console.warn(
          `[Marketing] Flow ${flow.id} Step ${step.id}: Template ${step.templateId} fehlt`,
        );
        continue;
      }

      console.log(
        `[Marketing] Flow "${flow.name}" step ${step.stepOrder}: ${recipients.length} Nutzer fällig`,
      );

      for (let i = 0; i < recipients.length; i += SEND_BATCH_SIZE) {
        const batch = recipients.slice(i, i + SEND_BATCH_SIZE);
        await Promise.all(
          batch.map(async (recipient) => {
            if (await isUserOnCooldown(recipient.userId)) {
              await db.insert(emailSends).values({
                userId: recipient.userId,
                toEmail: recipient.email,
                templateId: template.id,
                flowId: flow.id,
                flowStepId: step.id,
                kind: "flow",
                status: "skipped",
                subject: template.subject,
                errorMessage: "Cooldown aktiv",
              });
              return;
            }
            const rendered = renderTemplate(template, {
              firstName: recipient.firstName,
              email: recipient.email,
              userId: recipient.userId,
              credits: recipient.credits,
            });
            await sendOne({
              to: recipient.email,
              subject: rendered.subject,
              html: rendered.html,
              text: rendered.text,
              userId: recipient.userId,
              templateId: template.id,
              flowId: flow.id,
              flowStepId: step.id,
              kind: "flow",
            });
          }),
        );
        if (i + SEND_BATCH_SIZE < recipients.length) {
          await sleep(SEND_BATCH_DELAY_MS);
        }
      }
    }
  }
}

// ─── Log-Query-Helfer ──────────────────────────────────────────────────────

export async function listRecentSends(limit = 100) {
  return db
    .select()
    .from(emailSends)
    .orderBy(desc(emailSends.createdAt))
    .limit(limit);
}

export async function listSendsForCampaign(campaignId: number) {
  return db
    .select()
    .from(emailSends)
    .where(eq(emailSends.campaignId, campaignId))
    .orderBy(desc(emailSends.createdAt));
}
