import { Resend } from "resend";
import { tr, type EmailLang } from "./email-i18n";

const apiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.RESEND_FROM_EMAIL ?? "MormorsBreve <noreply@mormorsbreve.dk>";
const appBaseUrl = process.env.APP_URL ?? "https://mormorsbreve.dk";

const resend = apiKey ? new Resend(apiKey) : null;

export interface SendQuoteEmailParams {
  to: string;
  firstName?: string;
  quotePriceEur?: number | null;
  quoteMessage?: string | null;
  quoteDeadline?: Date | null;
  requestId: number;
  expert?: {
    companyName?: string | null;
    legalName?: string | null;
    contactName?: string | null;
    street?: string | null;
    postalCode?: string | null;
    city?: string | null;
    country?: string | null;
    invoiceEmail?: string | null;
    phone?: string | null;
  } | null;
  lang?: EmailLang;
}

const LOCALE_BY_LANG: Record<EmailLang, string> = {
  da: "da-DK",
  de: "de-DE",
  en: "en-GB",
};

function formatPriceEur(cents: number | null | undefined, lang: EmailLang = "da"): string {
  if (cents == null) return tr(lang, "common.onRequest");
  // Beträge sind dänische Kronen (Feldname historisch "Eur"); einheitlich "kr." anzeigen.
  return (
    new Intl.NumberFormat(LOCALE_BY_LANG[lang], {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(cents / 100) + " kr."
  );
}

function formatDeadline(date: Date | null | undefined, lang: EmailLang = "da"): string {
  if (!date) return tr(lang, "common.dash");
  return new Date(date).toLocaleDateString(LOCALE_BY_LANG[lang], {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const LOGO_BASE64 = "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";

function buildQuoteEmailHtml(params: SendQuoteEmailParams): string {
  const { firstName, quotePriceEur, quoteMessage, quoteDeadline, requestId, expert } = params;
  const lang: EmailLang = params.lang ?? "da";
  const name = firstName || "";
  const priceStr = formatPriceEur(quotePriceEur ?? null, lang);
  const deadlineStr = formatDeadline(quoteDeadline ?? undefined, lang);
  const viewUrl = `${appBaseUrl.replace(/\/$/, "")}/app/human-transcription`;
  const expertName = expert?.companyName || expert?.legalName || expert?.contactName || tr(lang, "common.yourExpert");

  const f = "Helvetica, Arial, sans-serif";

  return `
<!DOCTYPE html>
<html lang="${lang}" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${tr(lang, "quote.title")} &ndash; MormorsBreve</title>
  <!--[if mso]><style>table,td{font-family:Arial,sans-serif!important;}</style><![endif]-->
</head>
<body style="margin:0;padding:0;width:100%;background-color:#f0ebe3;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f0ebe3;">
<tr><td align="center" style="padding:48px 20px;">

  <!-- Outer wrapper -->
  <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;">

    <!-- Logo area -->
    <tr>
      <td align="center" style="padding:0 0 36px 0;">
        <a href="${escapeHtml(appBaseUrl)}" target="_blank" style="text-decoration:none;">
          <img src="data:image/png;base64,${LOGO_BASE64}" alt="MormorsBreve" width="80" height="80" style="display:block;width:80px;height:80px;border:0;" />
        </a>
      </td>
    </tr>

    <!-- White card -->
    <tr>
      <td>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#ffffff;border-radius:4px;border:1px solid #d9d0c3;">

          <!-- Gold accent line -->
          <tr><td style="height:3px;background-color:#b8860b;border-radius:4px 4px 0 0;font-size:0;line-height:0;">&nbsp;</td></tr>

          <!-- Top padding -->
          <tr><td style="height:44px;font-size:0;line-height:0;">&nbsp;</td></tr>

          <!-- Greeting -->
          <tr>
            <td style="padding:0 48px;">
              <p style="margin:0 0 4px 0;font-family:${f};font-size:13px;line-height:1;color:#9a8c7a;text-transform:uppercase;letter-spacing:0.12em;">${tr(lang, "quote.title")}</p>
            </td>
          </tr>
          <tr><td style="height:12px;font-size:0;line-height:0;">&nbsp;</td></tr>
          <tr>
            <td style="padding:0 48px;">
              <h1 style="margin:0;font-family:${f};font-size:26px;font-weight:700;color:#2a1f14;line-height:1.2;">${name ? tr(lang, "quote.headingWithName", { name: escapeHtml(name) }) : tr(lang, "quote.headingNoName")}</h1>
            </td>
          </tr>
          <tr><td style="height:20px;font-size:0;line-height:0;">&nbsp;</td></tr>
          <tr>
            <td style="padding:0 48px;">
              <p style="margin:0;font-family:${f};font-size:15px;line-height:1.65;color:#594a3a;">${tr(lang, "quote.intro", { expertName: escapeHtml(expertName) })}</p>
            </td>
          </tr>

          <!-- Spacer -->
          <tr><td style="height:32px;font-size:0;line-height:0;">&nbsp;</td></tr>

          <!-- Divider -->
          <tr><td style="padding:0 48px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td style="height:1px;background-color:#e8e0d4;font-size:0;line-height:0;">&nbsp;</td></tr></table></td></tr>

          <!-- Spacer -->
          <tr><td style="height:28px;font-size:0;line-height:0;">&nbsp;</td></tr>

          <!-- Price section -->
          <tr>
            <td style="padding:0 48px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td width="50%" valign="top">
                    <p style="margin:0 0 6px 0;font-family:${f};font-size:11px;color:#9a8c7a;text-transform:uppercase;letter-spacing:0.1em;line-height:1;">${tr(lang, "quote.priceLabel")}</p>
                    <p style="margin:0;font-family:${f};font-size:28px;font-weight:700;color:#2a1f14;line-height:1.2;">${escapeHtml(priceStr)}</p>
                  </td>
                  <td width="50%" valign="top">
                    <p style="margin:0 0 6px 0;font-family:${f};font-size:11px;color:#9a8c7a;text-transform:uppercase;letter-spacing:0.1em;line-height:1;">${tr(lang, "quote.deadlineLabel")}</p>
                    <p style="margin:0;font-family:${f};font-size:18px;font-weight:600;color:#2a1f14;line-height:1.4;">${escapeHtml(deadlineStr)}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Spacer -->
          <tr><td style="height:12px;font-size:0;line-height:0;">&nbsp;</td></tr>

          <!-- Reference -->
          <tr>
            <td style="padding:0 48px;">
              <p style="margin:0;font-family:${f};font-size:13px;color:#9a8c7a;line-height:1.5;">${tr(lang, "quote.referenceLabel")}&nbsp;#${requestId}</p>
            </td>
          </tr>

          ${expert ? `
          <tr><td style="height:24px;font-size:0;line-height:0;">&nbsp;</td></tr>
          <tr><td style="padding:0 48px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td style="height:1px;background-color:#e8e0d4;font-size:0;line-height:0;">&nbsp;</td></tr></table></td></tr>
          <tr><td style="height:20px;font-size:0;line-height:0;">&nbsp;</td></tr>
          <tr>
            <td style="padding:0 48px;">
              <p style="margin:0 0 6px 0;font-family:${f};font-size:11px;color:#9a8c7a;text-transform:uppercase;letter-spacing:0.1em;line-height:1;">${tr(lang, "quote.contractPartnerLabel")}</p>
              <p style="margin:0;font-family:${f};font-size:15px;line-height:1.6;color:#594a3a;">
                <strong>${escapeHtml(expertName)}</strong><br>
                ${expert.street ? `${escapeHtml(expert.street)}<br>` : ""}
                ${expert.postalCode || expert.city ? `${escapeHtml([expert.postalCode, expert.city].filter(Boolean).join(" "))}<br>` : ""}
                ${expert.country ? `${escapeHtml(expert.country)}<br>` : ""}
                ${expert.invoiceEmail ? `${tr(lang, "quote.emailLabel")}: ${escapeHtml(expert.invoiceEmail)}<br>` : ""}
                ${expert.phone ? `${tr(lang, "quote.phoneLabel")}: ${escapeHtml(expert.phone)}` : ""}
              </p>
              <p style="margin:12px 0 0;font-family:${f};font-size:13px;line-height:1.6;color:#9a8c7a;">${tr(lang, "quote.contractNote")}</p>
            </td>
          </tr>
          ` : ""}

          ${quoteMessage ? `
          <!-- Spacer -->
          <tr><td style="height:28px;font-size:0;line-height:0;">&nbsp;</td></tr>

          <!-- Divider -->
          <tr><td style="padding:0 48px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td style="height:1px;background-color:#e8e0d4;font-size:0;line-height:0;">&nbsp;</td></tr></table></td></tr>

          <!-- Spacer -->
          <tr><td style="height:24px;font-size:0;line-height:0;">&nbsp;</td></tr>

          <!-- Expert message -->
          <tr>
            <td style="padding:0 48px;">
              <p style="margin:0 0 10px 0;font-family:${f};font-size:11px;color:#9a8c7a;text-transform:uppercase;letter-spacing:0.1em;line-height:1;">${tr(lang, "quote.expertMessageLabel")}</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="border-left:3px solid #d4c5a9;padding:12px 0 12px 20px;">
                    <p style="margin:0;font-family:${f};font-size:15px;line-height:1.65;color:#594a3a;">${escapeHtml(quoteMessage)}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ` : ""}

          <!-- Spacer -->
          <tr><td style="height:36px;font-size:0;line-height:0;">&nbsp;</td></tr>

          <!-- CTA Button -->
          <tr>
            <td align="center" style="padding:0 48px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
                <tr>
                  <td align="center" style="border-radius:6px;background-color:#2a1f14;">
                    <a href="${escapeHtml(viewUrl)}" target="_blank" style="display:inline-block;padding:16px 44px;font-family:${f};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:0.02em;">${tr(lang, "quote.ctaButton")}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Spacer -->
          <tr><td style="height:28px;font-size:0;line-height:0;">&nbsp;</td></tr>

          <!-- Note -->
          <tr>
            <td style="padding:0 48px;">
              <p style="margin:0;font-family:${f};font-size:13px;line-height:1.6;color:#9a8c7a;text-align:center;">${tr(lang, "quote.note")}</p>
            </td>
          </tr>

          <!-- Bottom padding -->
          <tr><td style="height:44px;font-size:0;line-height:0;">&nbsp;</td></tr>

        </table>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="padding:32px 20px 0 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td align="center">
              <p style="margin:0 0 6px 0;font-family:${f};font-size:13px;color:#9a8c7a;line-height:1.5;">
                <a href="${escapeHtml(appBaseUrl)}" target="_blank" style="color:#7a6b56;text-decoration:none;font-weight:600;">MormorsBreve.de</a>
              </p>
              <p style="margin:0;font-family:${f};font-size:12px;color:#b5a893;line-height:1.5;">
                ${tr(lang, "common.footerTagline")}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

  </table>

</td></tr>
</table>
</body>
</html>
`.trim();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Sendet eine gestaltete E-Mail mit dem Angebot an den Nutzer.
 * Gibt ein Promise zurück; bei fehlendem RESEND_API_KEY wird nichts versendet und das Promise resolved ohne Fehler.
 */
export async function sendQuoteEmail(params: SendQuoteEmailParams): Promise<void> {
  if (!resend) {
    if (process.env.NODE_ENV !== "test") {
      console.warn("Resend: RESEND_API_KEY nicht gesetzt – E-Mail wird nicht versendet.");
    }
    return;
  }

  const lang: EmailLang = params.lang ?? "da";
  const html = buildQuoteEmailHtml(params);
  const subject = tr(lang, "quote.subject");

  await resend.emails.send({
    from: fromEmail,
    to: params.to,
    subject,
    html,
  });
}

const ADMIN_NOTIFICATION_EMAIL = "st@itebv.de";

export interface SupportNotificationParams {
  userName: string;
  userEmail?: string;
  subject: string;
  category: string;
  content: string;
  conversationId: number;
}

export async function sendSupportNotification(params: SupportNotificationParams): Promise<void> {
  if (!resend) {
    if (process.env.NODE_ENV !== "test") {
      console.warn("Resend: RESEND_API_KEY nicht gesetzt – Admin-Benachrichtigung wird nicht versendet.");
    }
    return;
  }

  const { userName, userEmail, subject, category, content, conversationId } = params;
  const adminUrl = `${appBaseUrl.replace(/\/$/, "")}/app/admin/support`;
  const f = "Helvetica, Arial, sans-serif";

  const categoryLabels: Record<string, string> = {
    hilfe: "Hilfe benötigt",
    feedback: "Feedback",
    fehler: "Fehler melden",
    sonstiges: "Sonstiges",
  };

  const html = `
<!DOCTYPE html>
<html lang="de"><head><meta charset="utf-8"><title>Neue Supportanfrage</title></head>
<body style="margin:0;padding:0;background-color:#f0ebe3;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f0ebe3;">
<tr><td align="center" style="padding:40px 20px;">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:4px;border:1px solid #d9d0c3;">
  <tr><td style="height:3px;background-color:#b8860b;border-radius:4px 4px 0 0;">&nbsp;</td></tr>
  <tr><td style="padding:36px 40px 0;">
    <p style="margin:0 0 4px;font-family:${f};font-size:13px;color:#9a8c7a;text-transform:uppercase;letter-spacing:0.12em;">Neue Supportanfrage</p>
    <h1 style="margin:8px 0 0;font-family:${f};font-size:22px;font-weight:700;color:#2a1f14;">${escapeHtml(subject)}</h1>
  </td></tr>
  <tr><td style="padding:20px 40px 0;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
      <tr>
        <td style="padding:8px 0;font-family:${f};font-size:13px;color:#9a8c7a;width:100px;">Nutzer:</td>
        <td style="padding:8px 0;font-family:${f};font-size:14px;color:#2a1f14;">${escapeHtml(userName)}${userEmail ? ` (${escapeHtml(userEmail)})` : ""}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;font-family:${f};font-size:13px;color:#9a8c7a;">Kategorie:</td>
        <td style="padding:8px 0;font-family:${f};font-size:14px;color:#2a1f14;">${escapeHtml(categoryLabels[category] || category)}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;font-family:${f};font-size:13px;color:#9a8c7a;">Ticket&nbsp;#:</td>
        <td style="padding:8px 0;font-family:${f};font-size:14px;color:#2a1f14;">${conversationId}</td>
      </tr>
    </table>
  </td></tr>
  <tr><td style="padding:16px 40px 0;">
    <div style="border-left:3px solid #d4c5a9;padding:12px 20px;background-color:#faf8f5;border-radius:0 4px 4px 0;">
      <p style="margin:0;font-family:${f};font-size:14px;line-height:1.6;color:#594a3a;white-space:pre-wrap;">${escapeHtml(content.length > 500 ? content.slice(0, 500) + "…" : content)}</p>
    </div>
  </td></tr>
  <tr><td align="center" style="padding:28px 40px;">
    <a href="${escapeHtml(adminUrl)}" target="_blank" style="display:inline-block;padding:12px 32px;font-family:${f};font-size:14px;font-weight:600;color:#ffffff;background-color:#2a1f14;border-radius:6px;text-decoration:none;">Im Admin-Bereich antworten</a>
  </td></tr>
  <tr><td style="padding:0 40px 28px;">
    <p style="margin:0;font-family:${f};font-size:12px;color:#b5a893;text-align:center;">MormorsBreve.de – Admin-Benachrichtigung</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`.trim();

  await resend.emails.send({
    from: fromEmail,
    to: ADMIN_NOTIFICATION_EMAIL,
    subject: `[Support] ${subject} – #${conversationId}`,
    html,
  });
}

export interface HumanTranscriptionRequestNotificationParams {
  userName: string;
  userEmail?: string;
  requestId: number;
  jobId: number;
  serviceLevel: string;
  urgency: string;
  accuracyLevel: string;
  budgetRange: string;
  customerNotes?: string | null;
}

export async function sendHumanTranscriptionRequestNotification(params: HumanTranscriptionRequestNotificationParams): Promise<void> {
  if (!resend) {
    if (process.env.NODE_ENV !== "test") {
      console.warn("Resend: RESEND_API_KEY nicht gesetzt – Admin-Benachrichtigung wird nicht versendet.");
    }
    return;
  }

  const { userName, userEmail, requestId, jobId, serviceLevel, urgency, accuracyLevel, budgetRange, customerNotes } = params;
  const adminUrl = `${appBaseUrl.replace(/\/$/, "")}/app/admin/human-transcription`;
  const f = "Helvetica, Arial, sans-serif";

  const serviceLevelLabels: Record<string, string> = {
    ki_geprueft: "KI-geprüft",
    experten: "Experten-Transkription",
  };
  const urgencyLabels: Record<string, string> = {
    standard: "Standard (5–7 Tage)",
    express: "Express (2–3 Tage)",
    priority: "Priorität (24 Std.)",
  };
  const accuracyLabels: Record<string, string> = {
    reading: "Lesefassung",
    scientific: "Wissenschaftlich exakt",
  };
  const budgetLabels: Record<string, string> = {
    bis_100: "Bis 750 kr.",
    "100_250": "750–1.870 kr.",
    "250_500": "1.870–3.730 kr.",
    "500_plus": "3.730 kr. +",
    flexible: "Flexibel",
  };

  const html = `
<!DOCTYPE html>
<html lang="de"><head><meta charset="utf-8"><title>Neue Angebotsanfrage</title></head>
<body style="margin:0;padding:0;background-color:#f0ebe3;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f0ebe3;">
<tr><td align="center" style="padding:40px 20px;">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:4px;border:1px solid #d9d0c3;">
  <tr><td style="height:3px;background-color:#b8860b;border-radius:4px 4px 0 0;">&nbsp;</td></tr>
  <tr><td style="padding:36px 40px 0;">
    <p style="margin:0 0 4px;font-family:${f};font-size:13px;color:#9a8c7a;text-transform:uppercase;letter-spacing:0.12em;">Neue Angebotsanfrage</p>
    <h1 style="margin:8px 0 0;font-family:${f};font-size:22px;font-weight:700;color:#2a1f14;">Anfrage #${requestId} – Job #${jobId}</h1>
  </td></tr>
  <tr><td style="padding:20px 40px 0;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
      <tr>
        <td style="padding:8px 0;font-family:${f};font-size:13px;color:#9a8c7a;width:120px;">Nutzer:</td>
        <td style="padding:8px 0;font-family:${f};font-size:14px;color:#2a1f14;">${escapeHtml(userName)}${userEmail ? ` (${escapeHtml(userEmail)})` : ""}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;font-family:${f};font-size:13px;color:#9a8c7a;">Service-Level:</td>
        <td style="padding:8px 0;font-family:${f};font-size:14px;color:#2a1f14;">${escapeHtml(serviceLevelLabels[serviceLevel] || serviceLevel)}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;font-family:${f};font-size:13px;color:#9a8c7a;">Dringlichkeit:</td>
        <td style="padding:8px 0;font-family:${f};font-size:14px;color:#2a1f14;">${escapeHtml(urgencyLabels[urgency] || urgency)}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;font-family:${f};font-size:13px;color:#9a8c7a;">Genauigkeit:</td>
        <td style="padding:8px 0;font-family:${f};font-size:14px;color:#2a1f14;">${escapeHtml(accuracyLabels[accuracyLevel] || accuracyLevel)}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;font-family:${f};font-size:13px;color:#9a8c7a;">Budget:</td>
        <td style="padding:8px 0;font-family:${f};font-size:14px;color:#2a1f14;">${escapeHtml(budgetLabels[budgetRange] || budgetRange)}</td>
      </tr>
    </table>
  </td></tr>
  ${customerNotes ? `
  <tr><td style="padding:16px 40px 0;">
    <p style="margin:0 0 8px;font-family:${f};font-size:13px;color:#9a8c7a;">Anmerkungen des Kunden:</p>
    <div style="border-left:3px solid #d4c5a9;padding:12px 20px;background-color:#faf8f5;border-radius:0 4px 4px 0;">
      <p style="margin:0;font-family:${f};font-size:14px;line-height:1.6;color:#594a3a;white-space:pre-wrap;">${escapeHtml(customerNotes.length > 500 ? customerNotes.slice(0, 500) + "…" : customerNotes)}</p>
    </div>
  </td></tr>` : ""}
  <tr><td align="center" style="padding:28px 40px;">
    <a href="${escapeHtml(adminUrl)}" target="_blank" style="display:inline-block;padding:12px 32px;font-family:${f};font-size:14px;font-weight:600;color:#ffffff;background-color:#2a1f14;border-radius:6px;text-decoration:none;">Im Admin-Bereich ansehen</a>
  </td></tr>
  <tr><td style="padding:0 40px 28px;">
    <p style="margin:0;font-family:${f};font-size:12px;color:#b5a893;text-align:center;">MormorsBreve.de – Admin-Benachrichtigung</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`.trim();

  await resend.emails.send({
    from: fromEmail,
    to: ADMIN_NOTIFICATION_EMAIL,
    subject: `[Angebotsanfrage] Neue Anfrage #${requestId} – ${escapeHtml(serviceLevelLabels[serviceLevel] || serviceLevel)}`,
    html,
  });
}

export interface ExpertRequestAssignedEmailParams extends HumanTranscriptionRequestNotificationParams {
  to: string;
  expertName?: string | null;
}

export async function sendExpertRequestAssignedEmail(params: ExpertRequestAssignedEmailParams): Promise<void> {
  if (!resend) {
    if (process.env.NODE_ENV !== "test") {
      console.warn("Resend: RESEND_API_KEY nicht gesetzt – Experten-Benachrichtigung wird nicht versendet.");
    }
    return;
  }

  const appUrl = `${appBaseUrl.replace(/\/$/, "")}/app/expert/requests/${params.requestId}`;
  const greeting = params.expertName ? `Hallo ${escapeHtml(params.expertName)},` : "Hallo,";
  const html = `
<!DOCTYPE html>
<html lang="de"><head><meta charset="utf-8"><title>Neue Expertenanfrage</title></head>
<body>
  <p>${greeting}</p>
  <p>Ihnen wurde eine neue Expertenanfrage #${params.requestId} zugewiesen.</p>
  <p><strong>Service:</strong> ${escapeHtml(params.serviceLevel)}<br>
  <strong>Budget:</strong> ${escapeHtml(params.budgetRange)}<br>
  <strong>Dringlichkeit:</strong> ${escapeHtml(params.urgency)}</p>
  ${params.customerNotes ? `<p><strong>Kundennotiz:</strong><br>${escapeHtml(params.customerNotes)}</p>` : ""}
  <p><a href="${escapeHtml(appUrl)}">Anfrage prüfen und Angebot erstellen</a></p>
</body></html>`.trim();

  await resend.emails.send({
    from: fromEmail,
    to: params.to,
    subject: `Neue Expertenanfrage #${params.requestId} – MormorsBreve.de`,
    html,
  });
}

export async function sendExpertQuoteAcceptedEmail(params: {
  to: string;
  requestId: number;
  customerName?: string;
  quotePriceEur?: number | null;
}): Promise<void> {
  if (!resend) return;

  const appUrl = `${appBaseUrl.replace(/\/$/, "")}/app/expert/requests/${params.requestId}`;
  const html = `
    <p>Ihr Angebot #${params.requestId} wurde kostenpflichtig angenommen.</p>
    <p>Vertragspartner des Kunden sind Sie bzw. Ihre Firma. Die Abrechnung erfolgt außerhalb von MormorsBreve.de direkt durch Sie.</p>
    ${params.customerName ? `<p>Kunde: ${escapeHtml(params.customerName)}</p>` : ""}
    <p>Preis: ${escapeHtml(formatPriceEur(params.quotePriceEur, "de"))}</p>
    <p><a href="${escapeHtml(appUrl)}">Auftrag bearbeiten</a></p>
  `;

  await resend.emails.send({
    from: fromEmail,
    to: params.to,
    subject: `Angebot #${params.requestId} angenommen – MormorsBreve.de`,
    html,
  });
}

export async function sendExpertResultCompletedEmail(params: {
  to: string;
  firstName?: string | null;
  requestId: number;
  jobId: number;
  serviceLevel: string;
  lang?: EmailLang;
}): Promise<void> {
  if (!resend) return;

  const lang: EmailLang = params.lang ?? "da";
  const resultUrl = `${appBaseUrl.replace(/\/$/, "")}/app/result/${params.jobId}`;
  const isAi = params.serviceLevel === "ki_geprueft";
  const label = isAi ? tr(lang, "result.labelAi") : tr(lang, "result.labelExpert");
  const subject = isAi ? tr(lang, "result.subjectAi") : tr(lang, "result.subjectExpert");
  const body = params.firstName
    ? tr(lang, "result.bodyWithName", { name: escapeHtml(params.firstName), label: escapeHtml(label) })
    : tr(lang, "result.bodyNoName", { label: escapeHtml(label) });
  const html = `
<!DOCTYPE html>
<html lang="${lang}"><head><meta charset="utf-8"></head><body>
    <p>${body}</p>
    <p>${tr(lang, "result.bodyDownload")}</p>
    <p><a href="${escapeHtml(resultUrl)}">${tr(lang, "result.ctaButton")}</a></p>
</body></html>
  `;

  await resend.emails.send({
    from: fromEmail,
    to: params.to,
    subject,
    html,
  });
}

// ─── Auth-E-Mails (Registrierung bestätigen / Passwort zurücksetzen) ─────────
// Firebase' eigener Vorlagen-Versand ist projektseitig gesperrt
// (EMAIL_TEMPLATE_UPDATE_NOT_ALLOWED). Die Links erzeugt das Admin SDK in
// routes.ts; Gestaltung und Versand übernehmen wir hier selbst via Resend.

/**
 * Hebt einen vom Admin SDK generierten Aktionslink
 * (https://<projekt>.firebaseapp.com/__/auth/action?...) auf unsere eigene,
 * lokalisierte Action-Seite um. Der oobCode ist domänenunabhängig gültig.
 */
export function rewriteAuthActionLink(link: string): string {
  const u = new URL(link);
  return `${appBaseUrl}/__/auth/action${u.search}`;
}

interface AuthMailParams {
  to: string;
  link: string;
  lang?: EmailLang;
}

function authMailHtml(lang: EmailLang, ns: "authVerify" | "authReset", link: string): string {
  const f = "Helvetica, Arial, sans-serif";
  return `
<!DOCTYPE html>
<html lang="${lang}"><head><meta charset="utf-8"><title>${tr(lang, `${ns}.subject`)}</title></head>
<body style="margin:0;padding:0;background-color:#f0ebe3;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f0ebe3;">
<tr><td align="center" style="padding:40px 20px;">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:4px;border:1px solid #d9d0c3;">
  <tr><td style="height:3px;background-color:#b8860b;border-radius:4px 4px 0 0;">&nbsp;</td></tr>
  <tr><td style="padding:36px 40px 0;">
    <p style="margin:0 0 4px;font-family:${f};font-size:13px;color:#9a8c7a;text-transform:uppercase;letter-spacing:0.12em;">${tr(lang, `${ns}.tag`)}</p>
    <h1 style="margin:8px 0 0;font-family:${f};font-size:22px;font-weight:700;color:#2a1f14;">${tr(lang, `${ns}.heading`)}</h1>
  </td></tr>
  <tr><td style="padding:20px 40px 0;">
    <p style="margin:0;font-family:${f};font-size:14px;line-height:1.7;color:#594a3a;">${tr(lang, `${ns}.body`)}</p>
  </td></tr>
  <tr><td align="center" style="padding:28px 40px;">
    <a href="${escapeHtml(link)}" target="_blank" style="display:inline-block;padding:12px 32px;font-family:${f};font-size:14px;font-weight:600;color:#ffffff;background-color:#2a1f14;border-radius:6px;text-decoration:none;">${tr(lang, `${ns}.button`)}</a>
  </td></tr>
  <tr><td style="padding:0 40px 28px;">
    <p style="margin:0 0 12px;font-family:${f};font-size:12px;line-height:1.6;color:#9a8c7a;">${tr(lang, `${ns}.ignoreNote`)}</p>
    <p style="margin:0;font-family:${f};font-size:12px;color:#b5a893;text-align:center;">MormorsBreve – ${tr(lang, "common.footerTagline")}</p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

async function sendAuthMail(ns: "authVerify" | "authReset", { to, link, lang = "da" }: AuthMailParams) {
  if (!resend) {
    throw new Error("RESEND_API_KEY ist nicht gesetzt – Auth-E-Mail kann nicht versendet werden.");
  }
  const { error } = await resend.emails.send({
    from: fromEmail,
    to,
    subject: tr(lang, `${ns}.subject`),
    html: authMailHtml(lang, ns, link),
  });
  if (error) throw new Error(`Resend-Fehler: ${error.message ?? JSON.stringify(error)}`);
}

export async function sendAuthVerificationEmail(params: AuthMailParams) {
  await sendAuthMail("authVerify", params);
}

export async function sendAuthPasswordResetEmail(params: AuthMailParams) {
  await sendAuthMail("authReset", params);
}
