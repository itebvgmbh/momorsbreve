/**
 * Einmaliges Script: Alle Produktiv-Rechnungen regenerieren.
 *
 * 1. Test-Rechnungen (vxoooxv@googlemail.com) löschen
 * 2. Kundendaten aus User-Profilen nachziehen
 * 3. Frische PDFs erzeugen
 *
 * Aufruf:  npx tsx script/regenerate-invoices.ts <DATABASE_URL>
 */

import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import fs from "fs";
import path from "path";
import { invoices } from "../shared/models/transcription";
import { users } from "../shared/models/auth";
import { generateInvoicePdf, resolveCustomerData, ensureInvoicesDir, INVOICES_DIR } from "../server/invoice";

const TEST_EMAIL = "vxoooxv@googlemail.com";

async function main() {
  const dbUrl = process.argv[2];
  if (!dbUrl) {
    console.error("Usage: npx tsx script/regenerate-invoices.ts <DATABASE_URL>");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: dbUrl });
  const db = drizzle(pool);

  // --- Schritt 1: Test-Rechnungen löschen ---
  console.log("\n=== Schritt 1: Test-Rechnungen löschen ===");
  const deleted = await db
    .delete(invoices)
    .where(eq(invoices.customerEmail, TEST_EMAIL))
    .returning({ id: invoices.id, invoiceNumber: invoices.invoiceNumber });

  console.log(`${deleted.length} Test-Rechnungen gelöscht:`);
  for (const d of deleted) {
    console.log(`  - ${d.invoiceNumber} (ID ${d.id})`);
  }

  // --- Schritt 2+3: Kundendaten aktualisieren & PDFs generieren ---
  console.log("\n=== Schritt 2+3: Kundendaten aktualisieren & PDFs regenerieren ===");
  ensureInvoicesDir();

  const allInvoices = await db.select().from(invoices).orderBy(invoices.id);
  console.log(`${allInvoices.length} Rechnungen zu verarbeiten.\n`);

  let updatedCount = 0;
  let pdfCount = 0;

  for (const inv of allInvoices) {
    const label = `${inv.invoiceNumber} (ID ${inv.id})`;

    // Kundendaten aus aktuellem User-Profil nachladen
    const [user] = await db.select().from(users).where(eq(users.id, inv.userId));
    if (user) {
      const fresh = resolveCustomerData(user);
      const changed =
        fresh.customerName !== inv.customerName ||
        fresh.customerStreet !== inv.customerStreet ||
        fresh.customerCity !== inv.customerCity ||
        fresh.customerPostalCode !== inv.customerPostalCode ||
        fresh.customerCountry !== inv.customerCountry ||
        fresh.customerEmail !== inv.customerEmail;

      if (changed) {
        await db.update(invoices).set(fresh).where(eq(invoices.id, inv.id));
        Object.assign(inv, fresh);
        updatedCount++;
        console.log(`  [UPDATE] ${label} – Kundendaten aktualisiert`);
      }
    }

    // PDF generieren
    try {
      const pdfBuffer = await generateInvoicePdf(inv);
      const filename = `${inv.invoiceNumber}.pdf`;
      fs.writeFileSync(path.join(INVOICES_DIR, filename), pdfBuffer);

      if (inv.pdfPath !== filename) {
        await db.update(invoices).set({ pdfPath: filename }).where(eq(invoices.id, inv.id));
      }
      pdfCount++;
      console.log(`  [PDF] ${label} – OK`);
    } catch (err) {
      console.error(`  [FEHLER] ${label} – PDF-Generierung fehlgeschlagen:`, err);
    }
  }

  console.log(`\n=== Zusammenfassung ===`);
  console.log(`  Test-Rechnungen gelöscht: ${deleted.length}`);
  console.log(`  Kundendaten aktualisiert: ${updatedCount}`);
  console.log(`  PDFs generiert:           ${pdfCount}/${allInvoices.length}`);

  // Verify
  const remaining = await db.select({ id: invoices.id }).from(invoices);
  console.log(`  Rechnungen in DB:         ${remaining.length}`);

  await pool.end();
  console.log("\nFertig.");
}

main().catch((err) => {
  console.error("Fataler Fehler:", err);
  process.exit(1);
});
