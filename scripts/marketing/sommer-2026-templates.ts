/**
 * Kampagne „Mindernes sommer" (Juni 2026) – tre e-mails (DÄNISCH).
 *
 * Diese Datei ist die versionierte Quelle der Kampagnen-Inhalte. Eingespielt
 * wird sie mit `scripts/marketing/seed-templates.ts` (Standard: Dry-Run mit
 * HTML-Vorschau, erst --apply schreibt in die DB).
 *
 * Struktur identisch zur OmasTagebuch-Version – nur BRAND, AKTION, Pakete
 * (DKK!) und Texte (dänisch, du-Form) unterscheiden sich. Änderungen am
 * Layout bitte in beiden Repos nachziehen.
 *
 * Platzhalter (ersetzt server/marketing.ts beim Versand):
 *   {{anrede}}   → „Hej Maria," bzw. „Hej," ohne Vornamen
 *   {{firstName}}, {{credits}}, {{appUrl}}, {{unsubscribeUrl}}
 * Footer + Abmeldelink hängt wrapWithFooter() beim Versand automatisch an –
 * die Templates enthalten deshalb KEINEN eigenen Footer.
 */

import {
  getDiscountedPriceCents,
  getCreditPackageDisplayName,
} from "../../shared/models/transcription";

// ─── Marke ──────────────────────────────────────────────────────────────────

export const BRAND = {
  productName: "MormorsBreve",
  domain: "mormorsbreve.dk",
  appUrl: "https://mormorsbreve.dk",
  claim: "Læs & bevar historiske håndskrifter",
  logoUrl: "https://mormorsbreve.dk/logo.png",
  colors: {
    bg: "#f7f1e6",
    card: "#ffffff",
    ink: "#2b2319",
    muted: "#7a6b56",
    accent: "#6B4423",
    accentSoft: "#faf3e7",
    gold: "#b9892e",
    border: "#d9d0c3",
  },
};

// ─── Aktions-Konfiguration (HIER anpassen) ──────────────────────────────────

export const AKTION = {
  label: "Mindernes sommer",
  /** Aktionsende – auch für promotion_config (siehe Runbook). */
  endeIso: "2026-06-28",
  endeLabel: "søndag den 28. juni",
  /** Rabatte pro Paket (Premium am stärksten → Upsell). */
  discounts: { Starter: 0.25, Standard: 0.3, Premium: 0.4 } as Record<string, number>,
};

/** Muss PACKAGE_SPECS in server/routes.ts entsprechen (Beträge in DKK-Øre). */
const PAKETE = [
  { name: "Starter", pages: 35, priceEur: 9900, popular: false },   // 99 kr.
  { name: "Standard", pages: 130, priceEur: 26900, popular: true }, // 269 kr.
  { name: "Premium", pages: 320, priceEur: 54900, popular: false }, // 549 kr.
];

const UTM_BASE = "utm_source=newsletter&utm_medium=email&utm_campaign=sommer-2026";

function kr(oere: number): string {
  return new Intl.NumberFormat("da-DK", { style: "currency", currency: "DKK" }).format(
    oere / 100,
  );
}

const maxRabattProzent = Math.round(
  Math.max(...Object.values(AKTION.discounts)) * 100,
);

// ─── Layout-Bausteine ───────────────────────────────────────────────────────

const F = "Helvetica, Arial, sans-serif";
const C = BRAND.colors;

/** Rahmen: Logo-Kopf + weiße Karte. Footer kommt beim Versand automatisch. */
function layout(inner: string, options: { kicker: string; headline: string }): string {
  return `<!DOCTYPE html>
<html lang="da" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(options.headline)} &ndash; ${BRAND.productName}</title>
  <!--[if mso]><style>table,td{font-family:Arial,sans-serif!important;}</style><![endif]-->
</head>
<body style="margin:0;padding:0;width:100%;background-color:${C.bg};">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${C.bg};">
<tr><td align="center" style="padding:40px 16px;">
  <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;">
    <tr>
      <td align="center" style="padding:0 0 28px 0;">
        <a href="${BRAND.appUrl}" target="_blank" style="text-decoration:none;">
          <img src="${BRAND.logoUrl}" alt="${BRAND.productName}" width="40" height="48" style="display:inline-block;width:40px;height:48px;border:0;vertical-align:middle;" />
        </a>
        <div style="font-family:${F};font-size:18px;font-weight:700;color:${C.ink};padding-top:8px;">${BRAND.productName}.dk</div>
      </td>
    </tr>
    <tr>
      <td>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${C.card};border-radius:4px;border:1px solid ${C.border};">
          <tr><td style="height:3px;background-color:${C.gold};border-radius:4px 4px 0 0;font-size:0;line-height:0;">&nbsp;</td></tr>
          <tr><td style="height:40px;font-size:0;line-height:0;">&nbsp;</td></tr>
          <tr>
            <td style="padding:0 44px;">
              <p style="margin:0 0 10px 0;font-family:${F};font-size:13px;line-height:1;color:${C.muted};text-transform:uppercase;letter-spacing:0.12em;">${escapeHtml(options.kicker)}</p>
              <h1 style="margin:0;font-family:${F};font-size:25px;font-weight:700;color:${C.ink};line-height:1.25;">${options.headline}</h1>
            </td>
          </tr>
          <tr><td style="height:20px;font-size:0;line-height:0;">&nbsp;</td></tr>
          ${inner}
          <tr><td style="height:40px;font-size:0;line-height:0;">&nbsp;</td></tr>
        </table>
      </td>
    </tr>
  </table>
</td></tr>
</table>
</body>
</html>`;
}

function absatz(html: string): string {
  return `<tr><td style="padding:0 44px;">
    <p style="margin:0 0 16px 0;font-family:${F};font-size:15px;line-height:1.7;color:#594a3a;">${html}</p>
  </td></tr>`;
}

function ctaButton(label: string, url: string): string {
  return `<tr><td align="center" style="padding:12px 44px 8px;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
      <tr><td align="center" style="border-radius:6px;background-color:${C.ink};">
        <a href="${url}" target="_blank" style="display:inline-block;padding:15px 40px;font-family:${F};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:0.02em;">${escapeHtml(label)}</a>
      </td></tr>
    </table>
  </td></tr>`;
}

function hinweisZeile(text: string): string {
  return `<tr><td style="padding:6px 44px 0;">
    <p style="margin:0;font-family:${F};font-size:13px;line-height:1.6;color:${C.muted};text-align:center;">${text}</p>
  </td></tr>`;
}

/** Paket-Karte mit durchgestrichenem Preis und Rabatt-Badge. */
function paketKarte(p: (typeof PAKETE)[number]): string {
  const rabatt = AKTION.discounts[p.name] ?? 0;
  const neu = getDiscountedPriceCents(p.priceEur, rabatt);
  const pct = Math.round(rabatt * 100);
  const displayName = getCreditPackageDisplayName(p.name);
  const badge = p.popular
    ? `<span style="display:inline-block;background:${C.accent};color:#ffffff;font-family:${F};font-size:10px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;padding:3px 9px;border-radius:999px;">Mest populær</span><br>`
    : "";
  return `<tr><td style="padding:0 44px 12px;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${C.accentSoft};border:1px solid ${C.border};border-radius:6px;">
      <tr>
        <td style="padding:16px 20px;">
          ${badge}
          <span style="font-family:${F};font-size:16px;font-weight:700;color:${C.ink};">${escapeHtml(displayName)}</span>
          <span style="font-family:${F};font-size:13px;color:${C.muted};">&nbsp;&middot;&nbsp;${p.pages} sider</span>
        </td>
        <td align="right" style="padding:16px 20px;white-space:nowrap;">
          <span style="font-family:${F};font-size:13px;color:${C.muted};text-decoration:line-through;">${kr(p.priceEur)}</span>
          <span style="font-family:${F};font-size:18px;font-weight:700;color:${C.ink};">&nbsp;${kr(neu)}</span><br>
          <span style="font-family:${F};font-size:12px;font-weight:700;color:${C.gold};">&minus;${pct}&nbsp;%</span>
        </td>
      </tr>
    </table>
  </td></tr>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─── Template-Definitionen ──────────────────────────────────────────────────

export interface SeedTemplate {
  name: string;
  subject: string;
  preheader: string;
  htmlBody: string;
  textBody: string;
}

// Mail 1 – Story & Neuigkeiten (kein Rabatt, Re-Engagement)
const mail1: SeedTemplate = {
  name: "Sommer 2026 – 1: Kassen på loftet",
  subject: "Kassen på loftet har ventet længe nok",
  preheader:
    "Sommer er familietid – det perfekte tidspunkt at gøre gamle breve læselige igen. Nyt: oplæsningsfunktionen.",
  htmlBody: layout(
    [
      absatz(`{{anrede}}`),
      absatz(
        `kender du det? Ved bes&oslash;get hjemme hos familien st&aring;r den der stadig: kassen med gamle breve, postkort og dagb&oslash;ger. Skrevet med gotisk h&aring;ndskrift &ndash; og i &aring;rtier har ingen kunnet l&aelig;se dem.`,
      ),
      absatz(
        `Det er pr&aelig;cis derfor, ${BRAND.productName}.dk findes: Du fotograferer siderne med din telefon, uploader dem &ndash; og f&aring;r p&aring; f&aring; minutter en l&aelig;selig tekst. <strong>Den f&oslash;rste pr&oslash;veside er gratis.</strong>`,
      ),
      absatz(
        `Det nyeste hos os:<br><br>
        &#128214;&nbsp;&nbsp;<strong>Opl&aelig;sningsfunktion</strong> &ndash; mormors breve bliver til lydfort&aelig;llinger for hele familien<br>
        &#129528;&nbsp;&nbsp;<strong>Ekspert-transskription</strong> &ndash; til s&aelig;rligt sv&aelig;re eller beskadigede h&aring;ndskrifter<br>
        &#128218;&nbsp;&nbsp;<strong>PDF-eksport med forside</strong> &ndash; en lille mindebog, perfekt som gave`,
      ),
      ctaButton("Upload et dokument nu", `{{appUrl}}/app/upload?${UTM_BASE}&utm_content=mail1`),
      hinweisZeile(
        `Tip til n&aelig;ste familiebes&oslash;g: Tag bare billeder af brevene med telefonen &ndash; det er rigeligt.`,
      ),
    ].join("\n"),
    {
      kicker: "Nyt fra MormorsBreve.dk",
      headline: "Sommeren samler familien &ndash; og bringer gamle skatte frem i lyset.",
    },
  ),
  textBody: `{{anrede}}

kender du det? Ved besøget hjemme hos familien står den der stadig: kassen med gamle breve, postkort og dagbøger. Skrevet med gotisk håndskrift – og i årtier har ingen kunnet læse dem.

Det er præcis derfor, ${BRAND.productName}.dk findes: Du fotograferer siderne med din telefon, uploader dem – og får på få minutter en læselig tekst. Den første prøveside er gratis.

Det nyeste hos os:
- Oplæsningsfunktion – mormors breve bliver til lydfortællinger for hele familien
- Ekspert-transskription – til særligt svære eller beskadigede håndskrifter
- PDF-eksport med forside – en lille mindebog, perfekt som gave

Upload et dokument nu:
{{appUrl}}/app/upload?${UTM_BASE}&utm_content=mail1

Tip til næste familiebesøg: Tag bare billeder af brevene med telefonen – det er rigeligt.`,
};

// Mail 2 – Das Angebot
const mail2: SeedTemplate = {
  name: `Sommer 2026 – 2: Kampagne (op til ${maxRabattProzent} %)`,
  subject: `Sommerkampagne: spar op til ${maxRabattProzent} % på alle sidepakker`,
  preheader: `Kun til og med ${AKTION.endeLabel}: Brevpakke, Dagbog og Familiearkiv til nedsat pris.`,
  htmlBody: layout(
    [
      absatz(`{{anrede}}`),
      absatz(
        `for at endnu flere minder kan finde vej tilbage til familien denne sommer, k&oslash;rer vi nu kampagnen <strong>&bdquo;${AKTION.label}&ldquo;</strong>:`,
      ),
      ...PAKETE.map((p) => [paketKarte(p)]).flat(),
      absatz(
        `Dine sider udl&oslash;ber ikke &ndash; k&oslash;b nu, og brug dem, n&aring;r det passer dig. Ogs&aring; n&aring;r den n&aelig;ste kasse dukker op.`,
      ),
      ctaButton("Se pakker & spar", `{{appUrl}}/?${UTM_BASE}&utm_content=mail2#pricing`),
      hinweisZeile(`Kampagnen slutter <strong>${AKTION.endeLabel}</strong> kl. 23:59.`),
    ].join("\n"),
    {
      kicker: AKTION.label,
      headline: `Op til ${maxRabattProzent}&nbsp;% rabat p&aring; alle pakker &ndash; kun til ${AKTION.endeLabel}.`,
    },
  ),
  textBody: `{{anrede}}

for at endnu flere minder kan finde vej tilbage til familien denne sommer, kører vi nu kampagnen „${AKTION.label}":

${PAKETE.map((p) => {
    const rabatt = AKTION.discounts[p.name] ?? 0;
    const neu = getDiscountedPriceCents(p.priceEur, rabatt);
    return `- ${getCreditPackageDisplayName(p.name)} (${p.pages} sider): ${kr(neu)} i stedet for ${kr(p.priceEur)} (−${Math.round(rabatt * 100)} %)`;
  }).join("\n")}

Dine sider udløber ikke – køb nu, og brug dem, når det passer dig.

Se pakker & spar:
{{appUrl}}/?${UTM_BASE}&utm_content=mail2#pricing

Kampagnen slutter ${AKTION.endeLabel} kl. 23:59.`,
};

// Mail 3 – Letzte Chance (kurz & dringlich)
const mail3: SeedTemplate = {
  name: "Sommer 2026 – 3: Sidste chance",
  subject: `Kun til søndag: spar op til ${maxRabattProzent} %`,
  preheader: "Fra mandag gælder de normale priser igen – en venlig påmindelse.",
  htmlBody: layout(
    [
      absatz(`{{anrede}}`),
      absatz(
        `en venlig p&aring;mindelse: Vores kampagne <strong>&bdquo;${AKTION.label}&ldquo;</strong> slutter <strong>${AKTION.endeLabel} kl. 23:59</strong>. Derefter g&aelig;lder de normale priser igen.`,
      ),
      ...PAKETE.map((p) => [paketKarte(p)]).flat(),
      ctaButton("Sikr dig dine sider nu", `{{appUrl}}/?${UTM_BASE}&utm_content=mail3#pricing`),
      hinweisZeile(
        `Siderne udl&oslash;ber ikke &ndash; du kan ogs&aring; bruge dem efter sommeren.`,
      ),
    ].join("\n"),
    {
      kicker: "Sidste chance",
      headline: "Sommerkampagnen slutter p&aring; s&oslash;ndag.",
    },
  ),
  textBody: `{{anrede}}

en venlig påmindelse: Vores kampagne „${AKTION.label}" slutter ${AKTION.endeLabel} kl. 23:59. Derefter gælder de normale priser igen.

${PAKETE.map((p) => {
    const rabatt = AKTION.discounts[p.name] ?? 0;
    const neu = getDiscountedPriceCents(p.priceEur, rabatt);
    return `- ${getCreditPackageDisplayName(p.name)} (${p.pages} sider): ${kr(neu)} i stedet for ${kr(p.priceEur)} (−${Math.round(rabatt * 100)} %)`;
  }).join("\n")}

Sikr dig dine sider nu:
{{appUrl}}/?${UTM_BASE}&utm_content=mail3#pricing

Siderne udløber ikke – du kan også bruge dem efter sommeren.`,
};

export const TEMPLATES: SeedTemplate[] = [mail1, mail2, mail3];

/** Vorschlag für PUT /api/admin/settings (siehe docs/marketing-runbook.md). */
export const PROMOTION_CONFIG_VORSCHLAG = {
  promotion_config: {
    enabled: true,
    label: AKTION.label,
    endDate: AKTION.endeIso,
    discounts: AKTION.discounts,
  },
};
