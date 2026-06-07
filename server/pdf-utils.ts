/**
 * PDF utilities using pdf-lib (pure JS, no native dependencies).
 * Splits a multi-page PDF into single-page PDF buffers.
 */
import { PDFDocument } from "pdf-lib";

export type PdfPageEntry = { pageNumber: number; buffer: Buffer };

/** Get number of pages in a PDF. */
export async function getPdfPageCount(pdfBuffer: Buffer): Promise<number> {
  const doc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  return doc.getPageCount();
}

/**
 * Split a PDF into single-page PDF buffers.
 * Returns one Buffer per page (each is a valid standalone PDF).
 * @param pageNumbers - optional 1-based page indices to extract (e.g. [1, 5]). Omit for all pages.
 */
export async function splitPdfPages(
  pdfBuffer: Buffer,
  pageNumbers?: number[]
): Promise<PdfPageEntry[]> {
  const srcDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const totalPages = srcDoc.getPageCount();
  const indices = pageNumbers
    ? pageNumbers.map((n) => n - 1).filter((i) => i >= 0 && i < totalPages)
    : Array.from({ length: totalPages }, (_, i) => i);

  const results: PdfPageEntry[] = [];

  for (const idx of indices) {
    const newDoc = await PDFDocument.create();
    const [copiedPage] = await newDoc.copyPages(srcDoc, [idx]);
    newDoc.addPage(copiedPage);
    const pdfBytes = await newDoc.save();
    results.push({
      pageNumber: idx + 1,
      buffer: Buffer.from(pdfBytes),
    });
  }

  return results;
}
