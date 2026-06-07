import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import path from "path";
import fs from "fs";
import { getCreditPackageDisplayName } from "@shared/schema";
import type { Invoice, PaymentOrder, CreditPackage } from "@shared/schema";
import type { User } from "@shared/schema";
import type { HumanTranscriptionRequest } from "@shared/schema";
import type { IStorage } from "./storage";

// Firmendaten ITEBV GmbH (ohne Bankverbindung und E-Mail)
const COMPANY = {
  name: "ITEBV GmbH",
  street: "Zehntwerderweg 201 A",
  postalCode: "13469",
  city: "Berlin",
  vatId: "DE348787952",
};

const LOGO_SVG_PATHS = [
  path.join(process.cwd(), "client", "public", "logo.svg"),
  path.join(process.cwd(), "client", "src", "assets", "logo.svg"),
];

export const INVOICES_DIR = path.join(process.cwd(), "invoices");

export function ensureInvoicesDir() {
  if (!fs.existsSync(INVOICES_DIR)) {
    fs.mkdirSync(INVOICES_DIR, { recursive: true });
  }
}

function formatEur(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",") + " €";
}

/** Logo aus SVG als PNG-Buffer laden (für PDF-Einbettung). */
async function loadLogoPng(): Promise<Buffer | null> {
  let svgPath: string | null = null;
  for (const p of LOGO_SVG_PATHS) {
    if (fs.existsSync(p)) {
      svgPath = p;
      break;
    }
  }
  if (!svgPath) return null;
  try {
    const sharp = (await import("sharp")).default;
    const png = await sharp(fs.readFileSync(svgPath))
      .resize(44, 44)
      .png()
      .toBuffer();
    return png;
  } catch {
    return null;
  }
}

/** Erzeugt das Rechnungs-PDF und gibt den Buffer zurück. */
export async function generateInvoicePdf(invoice: Invoice): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([595, 842]);
  const { width, height } = page.getSize();
  let y = height - 45;
  const lineHeight = 14;
  const small = 9;
  const margin = 50;

  // Kopf: Logo + App-Name
  const logoPng = await loadLogoPng();
  if (logoPng) {
    const image = await doc.embedPng(logoPng);
    const logoH = 36;
    const logoW = (image.width / image.height) * logoH;
    page.drawImage(image, {
      x: margin,
      y: y - logoH,
      width: logoW,
      height: logoH,
    });
    page.drawText("MormorsBreve", {
      x: margin + logoW + 10,
      y: y - 24,
      size: 20,
      font: fontBold,
      color: rgb(0.42, 0.27, 0.14),
    });
  } else {
    page.drawText("MormorsBreve", {
      x: margin,
      y,
      size: 20,
      font: fontBold,
      color: rgb(0.42, 0.27, 0.14),
    });
  }
  y -= 52;

  // Rechnungsersteller (links) + Rechnungsnummer & Datum (rechts)
  const createdAt = invoice.createdAt ? new Date(invoice.createdAt) : new Date();
  const dateStr = createdAt.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const metaX = width - margin - 180;
  page.drawText(`Rechnungsnummer: ${invoice.invoiceNumber}`, {
    x: metaX,
    y,
    size: 10,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
  page.drawText("Rechnungsersteller", {
    x: margin,
    y,
    size: small,
    font: fontBold,
    color: rgb(0.2, 0.2, 0.2),
  });
  y -= lineHeight;
  page.drawText(`Rechnungsdatum: ${dateStr}`, {
    x: metaX,
    y,
    size: 10,
    font,
    color: rgb(0.2, 0.2, 0.2),
  });
  page.drawText(COMPANY.name, {
    x: margin,
    y,
    size: 11,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
  y -= lineHeight;
  page.drawText(COMPANY.street, {
    x: margin,
    y,
    size: 10,
    font,
    color: rgb(0.2, 0.2, 0.2),
  });
  y -= lineHeight;
  page.drawText(`${COMPANY.postalCode} ${COMPANY.city}`, {
    x: margin,
    y,
    size: 10,
    font,
    color: rgb(0.2, 0.2, 0.2),
  });
  y -= lineHeight;
  page.drawText(`USt-IdNr. ${COMPANY.vatId}`, {
    x: margin,
    y,
    size: 10,
    font,
    color: rgb(0.2, 0.2, 0.2),
  });
  y -= lineHeight * 2;

  // Rechnungsempfänger (Kundendaten)
  page.drawText("Rechnungsempfänger", {
    x: margin,
    y,
    size: small,
    font: fontBold,
    color: rgb(0.2, 0.2, 0.2),
  });
  y -= lineHeight;
  const recipientName = invoice.customerName || "—";
  page.drawText(recipientName, {
    x: margin,
    y,
    size: 11,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
  y -= lineHeight;
  if (invoice.customerStreet) {
    page.drawText(invoice.customerStreet, {
      x: margin,
      y,
      size: 10,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });
    y -= lineHeight;
  }
  const cityLine = [invoice.customerPostalCode, invoice.customerCity]
    .filter(Boolean)
    .join(" ");
  if (cityLine) {
    page.drawText(cityLine, {
      x: margin,
      y,
      size: 10,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });
    y -= lineHeight;
  }
  if (invoice.customerCountry && invoice.customerCountry !== "Deutschland" && invoice.customerCountry !== "DE") {
    page.drawText(invoice.customerCountry, {
      x: margin,
      y,
      size: 10,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });
    y -= lineHeight;
  }
  if (invoice.customerEmail) {
    page.drawText(invoice.customerEmail, {
      x: margin,
      y,
      size: 10,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });
    y -= lineHeight;
  }
  y -= lineHeight * 0.5;

  // Tabelle: Position, Beschreibung, Betrag
  page.drawText("Position", {
    x: margin,
    y,
    size: small,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
  page.drawText("Beschreibung", {
    x: margin + 120,
    y,
    size: small,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
  page.drawText("Betrag", {
    x: width - margin - 80,
    y,
    size: small,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
  y -= lineHeight;
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 0.5,
    color: rgb(0.5, 0.5, 0.5),
  });
  y -= lineHeight;

  page.drawText("1", {
    x: margin,
    y,
    size: 10,
    font,
    color: rgb(0.2, 0.2, 0.2),
  });
  const descText = invoice.description.split("\n")[0] ?? invoice.description;
  page.drawText(descText.slice(0, 55), {
    x: margin + 120,
    y,
    size: 10,
    font,
    color: rgb(0.2, 0.2, 0.2),
  });
  page.drawText(formatEur(invoice.netAmountEur), {
    x: width - margin - 80,
    y,
    size: 10,
    font,
    color: rgb(0.2, 0.2, 0.2),
  });
  y -= lineHeight * 1.5;

  // Summen (rechtsbündig)
  const rightX = width - margin - 100;
  y -= 12;
  page.drawText("Nettobetrag:", {
    x: rightX - 75,
    y,
    size: 10,
    font,
    color: rgb(0.2, 0.2, 0.2),
  });
  page.drawText(formatEur(invoice.netAmountEur), {
    x: rightX,
    y,
    size: 10,
    font,
    color: rgb(0.2, 0.2, 0.2),
  });
  y -= lineHeight;
  page.drawText(`MwSt. ${invoice.vatRate} %:`, {
    x: rightX - 75,
    y,
    size: 10,
    font,
    color: rgb(0.2, 0.2, 0.2),
  });
  page.drawText(formatEur(invoice.vatAmountEur), {
    x: rightX,
    y,
    size: 10,
    font,
    color: rgb(0.2, 0.2, 0.2),
  });
  y -= lineHeight;
  page.drawText("Bruttobetrag:", {
    x: rightX - 75,
    y,
    size: 10,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
  page.drawText(formatEur(invoice.grossAmountEur), {
    x: rightX,
    y,
    size: 10,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
  y -= lineHeight * 2;

  // Zahlungsvermerk
  page.drawText(
    "Zahlung erfolgte über Stripe. Vielen Dank für Ihren Auftrag.",
    {
      x: margin,
      y,
      size: small,
      font,
      color: rgb(0.25, 0.25, 0.25),
    }
  );
  y -= lineHeight * 2;

  // Kleingedrucktes (ohne Bankverbindung und E-Mail)
  page.drawText(
    `${COMPANY.name} · ${COMPANY.street} · ${COMPANY.postalCode} ${COMPANY.city} · USt-IdNr. ${COMPANY.vatId}`,
    {
      x: margin,
      y: 42,
      size: 8,
      font,
      color: rgb(0.4, 0.4, 0.4),
    }
  );

  const pdfBytes = await doc.save();
  return Buffer.from(pdfBytes);
}

/** Kundendaten aus User-Profil extrahieren (Billing-Felder mit Fallback auf reguläre Adresse). */
export function resolveCustomerData(user: User) {
  const u = user as any;
  const name =
    u.billingName ||
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
    user.email ||
    "";
  return {
    customerName: name || null,
    customerEmail: user.email ?? null,
    customerStreet: u.billingStreet || u.street || null,
    customerPostalCode: u.billingPostalCode || u.postalCode || null,
    customerCity: u.billingCity || u.city || null,
    customerCountry: u.billingCountry || u.country || null,
  };
}

/** Rechnung für Credit-Kauf anlegen und PDF speichern. */
export async function createInvoiceForCreditPurchase(
  storage: IStorage,
  order: PaymentOrder,
  user: User,
  pkg: CreditPackage
): Promise<Invoice> {
  const invoiceNumber = await storage.getNextInvoiceNumber();
  const grossCents = order.amountEur;
  const netCents = Math.round(grossCents / 1.19);
  const vatCents = grossCents - netCents;

  const customer = resolveCustomerData(user);

  const invoice = await storage.createInvoice({
    invoiceNumber,
    userId: order.userId,
    type: "credit_purchase",
    paymentOrderId: order.id,
    humanRequestId: null,
    netAmountEur: netCents,
    vatRate: 19,
    vatAmountEur: vatCents,
    grossAmountEur: grossCents,
    description: `Transkriptions-Credits: ${getCreditPackageDisplayName(pkg.name)} (${pkg.pages} Credits)`,
    ...customer,
    stripePaymentIntentId: order.stripePaymentIntentId ?? null,
    pdfPath: null,
  });

  const pdfBuffer = await generateInvoicePdf(invoice);
  ensureInvoicesDir();
  const filename = `${invoice.invoiceNumber}.pdf`;
  fs.writeFileSync(path.join(INVOICES_DIR, filename), pdfBuffer);

  return storage.updateInvoice(invoice.id, { pdfPath: filename });
}

/** Rechnung für Spezialistenauftrag anlegen und PDF speichern. */
export async function createInvoiceForSpecialistOrder(
  storage: IStorage,
  request: HumanTranscriptionRequest,
  user: User,
  description: string
): Promise<Invoice> {
  const quotePriceEur = request.quotePriceEur ?? 0;
  if (quotePriceEur <= 0) {
    throw new Error("Spezialistenauftrag hat keinen Rechnungsbetrag");
  }

  const invoiceNumber = await storage.getNextInvoiceNumber();
  const grossCents = quotePriceEur;
  const netCents = Math.round(grossCents / 1.19);
  const vatCents = grossCents - netCents;

  const customer = resolveCustomerData(user);

  const invoice = await storage.createInvoice({
    invoiceNumber,
    userId: request.userId,
    type: "specialist_order",
    paymentOrderId: null,
    humanRequestId: request.id,
    netAmountEur: netCents,
    vatRate: 19,
    vatAmountEur: vatCents,
    grossAmountEur: grossCents,
    description,
    ...customer,
    stripePaymentIntentId: request.stripePaymentIntentId ?? null,
    pdfPath: null,
  });

  const pdfBuffer = await generateInvoicePdf(invoice);
  ensureInvoicesDir();
  const filename = `${invoice.invoiceNumber}.pdf`;
  fs.writeFileSync(path.join(INVOICES_DIR, filename), pdfBuffer);

  return storage.updateInvoice(invoice.id, { pdfPath: filename });
}

/** Absoluten Pfad zur gespeicherten Rechnungs-PDF. */
export function getInvoicePdfPath(pdfPath: string | null): string | null {
  if (!pdfPath) return null;
  const full = path.join(INVOICES_DIR, path.basename(pdfPath));
  return fs.existsSync(full) ? full : null;
}
