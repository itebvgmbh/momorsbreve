import "dotenv/config";
import fs from "fs";
import path from "path";
import { eq } from "drizzle-orm";
import { db } from "../server/db";
import { emailTemplates } from "../shared/models/marketing";
import {
  appSettings,
  creditPackages,
  DEFAULT_PROMOTION,
  getDiscountedPriceCents,
  type PromotionConfig,
} from "../shared/models/transcription";

const APP_URL = (process.env.APP_URL ?? "https://mormorsbreve.dk").replace(/\/$/, "");
const CHECKOUT_URL = `${APP_URL}/#pricing`;

// Logo inline als Base64 einbetten – kein externer URL, kein Cache-Problem
const logoPath = path.resolve(process.cwd(), "logo-new.png");
const logoBase64 = fs.readFileSync(logoPath).toString("base64");
const LOGO_DATA_URI = `data:image/png;base64,${logoBase64}`;

/** Liest Rabattaktion aus app_settings, fällt auf Default zurück. */
async function loadPromotion(): Promise<PromotionConfig> {
  const rows = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.key, "promotion"));
  const raw = rows[0]?.value as PromotionConfig | undefined;
  if (!raw) return DEFAULT_PROMOTION;
  return {
    ...DEFAULT_PROMOTION,
    ...raw,
    discounts: { ...DEFAULT_PROMOTION.discounts, ...(raw.discounts ?? {}) },
  };
}

function formatEur(cents: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

function formatGermanDate(d: Date): string {
  return d.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Festes Aktionsende: Sonntag, 26. April 2026 */
function campaignDeadline(): Date {
  return new Date("2026-04-26T23:59:59");
}

async function main() {
  const promotion = await loadPromotion();
  const packages = await db
    .select()
    .from(creditPackages)
    .orderBy(creditPackages.pages);

  if (packages.length === 0) {
    throw new Error("Keine credit_packages in der DB gefunden.");
  }

  const deadline = campaignDeadline();
  const deadlineLabel = formatGermanDate(deadline);

  type Row = {
    name: string;
    pages: number;
    original: number;
    discounted: number;
    discountPct: number;
    popular: boolean;
    pricePerPage: number;
  };

  const rows: Row[] = packages.map((p) => {
    const discount = promotion.discounts[p.name] ?? 0;
    const original = p.priceEur;
    const discounted = discount > 0 ? getDiscountedPriceCents(original, discount) : original;
    return {
      name: p.name,
      pages: p.pages,
      original,
      discounted,
      discountPct: Math.round(discount * 100),
      popular: !!p.popular,
      pricePerPage: Math.round(discounted / p.pages),
    };
  });

  const maxDiscount = Math.max(...rows.map((r) => r.discountPct));

  const subject = `Nur noch bis Sonntag: bis zu ${maxDiscount}% Frühlingsrabatt`;
  const preheader = `Letzte Chance – alle Pakete bis ${deadlineLabel} reduziert.`;

  // Einheitliche Farbpalette – WICHTIG: Nur EINE Hintergrundfarbe für den Body,
  // um "Streifen" in Outlook zu vermeiden.
  const BG = "#f7f1e6";         // ganz außen
  const CARD = "#ffffff";       // Mail-Container
  const INK = "#2b2319";        // Haupttext (dunkles Braun statt Schwarz – weicher)
  const MUTED = "#7a6b56";      // sekundärer Text
  const ACCENT = "#6B4423";     // Primär (Markenbraun)
  const ACCENT_SOFT = "#faf3e7"; // sehr heller Akzent
  const GOLD = "#b9892e";       // Rabatt-Akzent

  // Produkt-Karten
  const productCards = rows
    .map((r) => {
      const popularRow = r.popular
        ? `<tr>
            <td colspan="2" style="padding:0 0 8px 0;">
              <span style="display:inline-block;background:${ACCENT};color:#ffffff;font-family:Helvetica,Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;padding:4px 10px;border-radius:999px;">
                Beliebteste Wahl
              </span>
            </td>
          </tr>`
        : "";
      const discountBadge =
        r.discountPct > 0
          ? `<span style="display:inline-block;background:${GOLD};color:#ffffff;font-family:Helvetica,Arial,sans-serif;font-size:12px;font-weight:700;padding:4px 10px;border-radius:4px;white-space:nowrap;">−${r.discountPct}%</span>`
          : "";
      const priceOld =
        r.discountPct > 0
          ? `<span style="color:${MUTED};text-decoration:line-through;font-size:15px;margin-left:8px;font-family:Helvetica,Arial,sans-serif;">${formatEur(r.original)}</span>`
          : "";
      const borderStyle = r.popular
        ? `border:2px solid ${ACCENT};`
        : `border:1px solid #eadfcb;`;

      return `
<tr>
  <td style="padding:0 32px 16px 32px;background:${CARD};">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="${borderStyle}border-radius:10px;background:${CARD};">
      <tr>
        <td style="padding:18px 20px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
            ${popularRow}
            <tr>
              <td style="font-family:Helvetica,Arial,sans-serif;font-size:17px;font-weight:700;color:${INK};line-height:1.3;">
                ${escapeHtml(r.name)}
              </td>
              <td align="right" style="white-space:nowrap;">${discountBadge}</td>
            </tr>
            <tr>
              <td colspan="2" style="font-family:Helvetica,Arial,sans-serif;font-size:13px;color:${MUTED};padding-top:6px;line-height:1.5;">
                ${r.pages} Seiten · ca. ${formatEur(r.pricePerPage)} / Seite
              </td>
            </tr>
            <tr>
              <td colspan="2" style="padding-top:10px;">
                <span style="font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:700;color:${ACCENT};letter-spacing:-0.5px;">${formatEur(r.discounted)}</span>
                ${priceOld}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </td>
</tr>`;
    })
    .join("\n");

  // HTML – eine einzige vertikale Tabelle, durchgehend CARD-Hintergrund,
  // keine „Inseln" mit abweichendem bg → keine horizontalen Streifen.
  const htmlBody = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html lang="de" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<meta name="format-detection" content="telephone=no,date=no,address=no,email=no">
<meta name="x-apple-disable-message-reformatting">
<title>${escapeHtml(subject)}</title>
<!--[if mso]>
<style type="text/css">
  table,td,div,h1,h2,h3,p { font-family: Arial, Helvetica, sans-serif !important; }
</style>
<![endif]-->
<style>
  /* Nur defensives CSS – alles Wichtige ist inline. */
  body { margin:0 !important; padding:0 !important; width:100% !important; background:${BG} !important; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
  table { border-collapse:collapse !important; mso-table-lspace:0pt; mso-table-rspace:0pt; }
  img { border:0; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic; display:block; }
  a { color:${ACCENT}; }
  /* Datumsangaben & Adressen nicht automatisch verlinken (iOS/Outlook) */
  a[x-apple-data-detectors], .appleLinks a, u + #body a, #MessageViewBody a {
    color:inherit !important; text-decoration:none !important; font-family:inherit !important;
    font-size:inherit !important; font-weight:inherit !important; line-height:inherit !important;
  }
  @media (max-width:620px) {
    .container { width:100% !important; }
    .px-lg { padding-left:20px !important; padding-right:20px !important; }
    .h1 { font-size:26px !important; line-height:1.2 !important; }
  }
</style>
</head>
<body id="body" style="margin:0;padding:0;background:${BG};">
<!-- Preheader (unsichtbar, zeigt in Inbox-Vorschau) -->
<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">
  ${escapeHtml(preheader)}
</div>

<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${BG};">
  <tr>
    <td align="center" style="padding:32px 12px;">

      <!-- Mail-Container: durchgehend EINE Hintergrundfarbe -->
      <table role="presentation" class="container" width="600" cellspacing="0" cellpadding="0" border="0" style="width:600px;max-width:600px;background:${CARD};border-radius:14px;overflow:hidden;box-shadow:0 2px 12px rgba(92,66,36,0.08);">

        <!-- Logo + Wordmark (Base64 inline – kein externer Fetch, kein Cache) -->
        <tr>
          <td align="center" style="padding:36px 32px 4px 32px;background:${CARD};">
            <img src="${LOGO_DATA_URI}" width="110" height="93" alt="MormorsBreve Logo"
                 style="width:110px;height:auto;display:block;border:0;margin:0 auto;">
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:8px 32px 0 32px;background:${CARD};">
            <div style="font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:700;color:${INK};letter-spacing:-0.3px;">
              MormorsBreve
            </div>
          </td>
        </tr>

        <!-- Rabatt-Label -->
        <tr>
          <td align="center" style="padding:8px 32px 0 32px;background:${CARD};">
            <span style="display:inline-block;background:${ACCENT_SOFT};color:${GOLD};font-family:Helvetica,Arial,sans-serif;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;padding:8px 16px;border-radius:999px;">
              Frühlingsrabatt · nur noch bis Sonntag
            </span>
          </td>
        </tr>

        <!-- Headline -->
        <tr>
          <td class="px-lg" style="padding:20px 32px 8px 32px;background:${CARD};" align="center">
            <h1 class="h1" style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:32px;line-height:1.2;color:${INK};font-weight:700;letter-spacing:-0.5px;">
              Bis zu ${maxDiscount}% sparen<br>&ndash; nur noch bis Sonntag
            </h1>
          </td>
        </tr>

        <!-- Subline -->
        <tr>
          <td class="px-lg" style="padding:12px 32px 24px 32px;background:${CARD};" align="center">
            <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:${MUTED};">
              Alte Familienbriefe und Tagebücher verdienen es, wieder gelesen zu werden.
              Damit diese Schätze jetzt entziffert werden können, gibt es noch
              <strong style="color:${INK};">bis ${deadlineLabel}</strong>
              unseren Frühlingsrabatt auf alle Credit-Pakete.
            </p>
          </td>
        </tr>

        <!-- Produkt-Karten -->
        ${productCards}

        <!-- CTA -->
        <tr>
          <td align="center" style="padding:20px 32px 16px 32px;background:${CARD};">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0">
              <tr>
                <td align="center" bgcolor="${ACCENT}" style="border-radius:10px;">
                  <!--[if mso]>
                  <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word"
                    href="${CHECKOUT_URL}" style="height:54px;v-text-anchor:middle;width:260px;" arcsize="20%" strokecolor="${ACCENT}" fillcolor="${ACCENT}">
                    <w:anchorlock/>
                    <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:700;">Rabatt jetzt sichern</center>
                  </v:roundrect>
                  <![endif]-->
                  <!--[if !mso]><!-- -->
                  <a href="${CHECKOUT_URL}"
                     style="display:inline-block;padding:16px 36px;font-family:Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;background:${ACCENT};border-radius:10px;white-space:nowrap;mso-padding-alt:0;">
                    Rabatt jetzt sichern
                  </a>
                  <!--<![endif]-->
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Hinweis -->
        <tr>
          <td align="center" style="padding:0 32px 24px 32px;background:${CARD};">
            <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:${MUTED};">
              Aktion endet am ${deadlineLabel} um 23:59 Uhr. Rabatte gelten nur für neue Käufe.
            </p>
          </td>
        </tr>

        <!-- Signatur -->
        <tr>
          <td class="px-lg" style="padding:8px 32px 24px 32px;background:${CARD};border-top:1px solid #eadfcb;">
            <p style="margin:20px 0 0 0;font-family:Georgia,'Times New Roman',serif;font-size:14px;line-height:1.6;color:${INK};font-style:italic;">
              Viel Freude beim Entziffern Ihrer Familiengeschichte,<br>
              Ihr Team von MormorsBreve
            </p>
          </td>
        </tr>


      </table>

    </td>
  </tr>
</table>
</body>
</html>`;

  const textBody = `Nur noch bis ${deadlineLabel}: bis zu ${maxDiscount}% Frühlingsrabatt auf alle Credit-Pakete von MormorsBreve.

${rows
  .map((r) => {
    const old = r.discountPct > 0 ? ` (statt ${formatEur(r.original)}, −${r.discountPct}%)` : "";
    return `- ${r.name}: ${r.pages} Seiten für ${formatEur(r.discounted)}${old}`;
  })
  .join("\n")}

Jetzt sichern: ${CHECKOUT_URL}

Aktion endet am ${deadlineLabel} um 23:59 Uhr.

Viel Freude beim Entziffern Ihrer Familiengeschichte,
Ihr Team von MormorsBreve

Newsletter abmelden: {{unsubscribeUrl}}
`;

  const name = "Frühlingsrabatt – endet Sonntag 26.4.";

  // Update wenn vorhanden, sonst insert
  const [existing] = await db
    .select({ id: emailTemplates.id })
    .from(emailTemplates)
    .where(eq(emailTemplates.name, name));

  if (existing) {
    await db
      .update(emailTemplates)
      .set({
        subject,
        preheader,
        htmlBody,
        textBody,
        updatedAt: new Date(),
      })
      .where(eq(emailTemplates.id, existing.id));
    console.log(`✓ Template aktualisiert (id=${existing.id}): ${name}`);
  } else {
    const [inserted] = await db
      .insert(emailTemplates)
      .values({ name, subject, preheader, htmlBody, textBody })
      .returning({ id: emailTemplates.id });
    console.log(`✓ Template angelegt (id=${inserted.id}): ${name}`);
  }

  console.log(`  Subject:   ${subject}`);
  console.log(`  Preheader: ${preheader}`);
  console.log(`  Deadline:  ${deadlineLabel}`);
  console.log(`  Logo:      inline base64 (${Math.round(logoBase64.length / 1024)} KB)`);
  console.log(`  CTA-URL:   ${CHECKOUT_URL}`);
  console.log(`  Pakete:    ${rows.length}`);
  process.exit(0);
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
