/**
 * Spielt die Kampagnen-Templates aus sommer-2026-templates.ts in die DB ein.
 *
 *   npx tsx scripts/marketing/seed-templates.ts            → Dry-Run:
 *       zeigt, was passieren würde, und erzeugt HTML-Vorschauen unter
 *       scripts/marketing/preview/ (im Browser öffnen).
 *
 *   npx tsx scripts/marketing/seed-templates.ts --apply    → Schreibt die
 *       Templates in email_templates (Upsert per Name, braucht DATABASE_URL).
 *
 * Es wird NICHTS versendet – der Versand läuft danach bewusst manuell über
 * den Admin-Bereich (/app/admin/marketing), siehe docs/marketing-runbook.md.
 */

import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { BRAND, TEMPLATES, PROMOTION_CONFIG_VORSCHLAG } from "./sommer-2026-templates";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apply = process.argv.includes("--apply");

// ─── Vorschau erzeugen (immer) ──────────────────────────────────────────────

const previewDir = path.join(__dirname, "preview");
fs.mkdirSync(previewDir, { recursive: true });

function renderPreview(html: string): string {
  const substituted = html
    .replace(/\{\{\s*anrede\s*\}\}/g, "Hej Maria,")
    .replace(/\{\{\s*firstName\s*\}\}/g, "Maria")
    .replace(/\{\{\s*credits\s*\}\}/g, "3")
    .replace(/\{\{\s*appUrl\s*\}\}/g, BRAND.appUrl)
    .replace(/\{\{\s*unsubscribeUrl\s*\}\}/g, "#afmeld");

  const footerHinweis = `
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:24px;">
  <tr><td align="center" style="padding:16px;font-family:Helvetica,Arial,sans-serif;font-size:12px;color:#9a8c7a;">
    — Beim Versand fügt das System hier automatisch den Footer mit Abmeldelink ein (dänisch) —
  </td></tr>
</table>`;
  return substituted.replace(/<\/body>/i, `${footerHinweis}</body>`);
}

for (const [i, t] of TEMPLATES.entries()) {
  const file = path.join(previewDir, `mail-${i + 1}.html`);
  fs.writeFileSync(file, renderPreview(t.htmlBody), "utf8");
}

console.log(`Vorschau erzeugt: ${previewDir}\\mail-1.html bis mail-${TEMPLATES.length}.html\n`);
console.log("Templates in dieser Kampagne:");
for (const t of TEMPLATES) {
  console.log(`  • ${t.name}`);
  console.log(`      Betreff:   ${t.subject}`);
  console.log(`      Preheader: ${t.preheader}`);
}
console.log(
  `\nPromotion-Vorschlag für PUT /api/admin/settings:\n${JSON.stringify(PROMOTION_CONFIG_VORSCHLAG, null, 2)}`,
);

// ─── Apply: Upsert in die DB ────────────────────────────────────────────────

if (!apply) {
  console.log("\nDry-Run beendet. Mit --apply werden die Templates in die DB geschrieben.");
  process.exit(0);
}

const { db } = await import("../../server/db");
const { emailTemplates } = await import("../../shared/models/marketing");
const { eq } = await import("drizzle-orm");

for (const t of TEMPLATES) {
  const [existing] = await db
    .select({ id: emailTemplates.id })
    .from(emailTemplates)
    .where(eq(emailTemplates.name, t.name));

  if (existing) {
    await db
      .update(emailTemplates)
      .set({
        subject: t.subject,
        preheader: t.preheader,
        htmlBody: t.htmlBody,
        textBody: t.textBody,
        updatedAt: new Date(),
      })
      .where(eq(emailTemplates.id, existing.id));
    console.log(`Aktualisiert: #${existing.id} ${t.name}`);
  } else {
    const [created] = await db
      .insert(emailTemplates)
      .values({
        name: t.name,
        subject: t.subject,
        preheader: t.preheader,
        htmlBody: t.htmlBody,
        textBody: t.textBody,
      })
      .returning({ id: emailTemplates.id });
    console.log(`Angelegt:     #${created.id} ${t.name}`);
  }
}

console.log("\nFertig. Nächster Schritt: Test-Versand im Admin-Bereich (siehe Runbook).");
process.exit(0);
