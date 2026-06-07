import { PDFDocument, StandardFonts, rgb, PageSizes, type PDFPage, type PDFFont } from "pdf-lib";

interface ExportPage {
  pageNumber: number;
  text: string;
}

export interface CoverPageOptions {
  title?: string;
  subtitle?: string;
  author?: string;
  style: "classic" | "elegant" | "minimal";
}

export interface PdfExportOptions {
  jobId?: number;
  title?: string;
  scriptType: string;
  version: "original" | "completed" | "interpreted";
  pages: ExportPage[];
  createdAt: string;
  coverPage?: CoverPageOptions;
  continuousFlow?: boolean;
  justified?: boolean;
  mergeLines?: boolean;
  showPageLabels?: boolean;
  fontSize?: number;
}

// Harmonious page proportions – more bottom space (classical), binding margin slightly wider
const MARGIN = { top: 72, bottom: 108, left: 80, right: 68 };
const DEFAULT_FONT_SIZE = 12;
const LINE_HEIGHT_FACTOR = 1.45;
const FOOTER_SIZE = 9;
const MIN_ORPHAN_LINES = 2;
const MIN_WIDOW_LINES = 2;
const HEADING_KEEP_LINES = 3;
const MAX_JUSTIFY_STRETCH = 2.5;

const CLR = {
  text: rgb(0.10, 0.10, 0.10),
  heading: rgb(0.18, 0.18, 0.18),
  muted: rgb(0.45, 0.45, 0.45),
  accent: rgb(0.16, 0.44, 0.36),
  accentLight: rgb(0.16, 0.44, 0.36),
  rule: rgb(0.78, 0.78, 0.78),
  ruleLight: rgb(0.88, 0.88, 0.88),
  coverAccent: rgb(0.55, 0.35, 0.15),
};

// Characters supported by WinAnsi encoding beyond Basic Latin + Latin-1 Supplement
const WIN_ANSI_EXTRA = new Set([
  0x0152, 0x0153, 0x0160, 0x0161, 0x0178, 0x017D, 0x017E,
  0x0192, 0x02C6, 0x02DC,
  0x2013, 0x2014, 0x2018, 0x2019, 0x201A, 0x201C, 0x201D, 0x201E,
  0x2020, 0x2021, 0x2022, 0x2026, 0x2030, 0x2039, 0x203A,
  0x20AC, 0x2122,
]);

function safe(input: string): string {
  let s = input;
  s = s.replace(/[\u200B\u200C\u200D\uFEFF]/g, "");
  s = s.replace(/\u02BC/g, "'");
  s = s.replace(/\u201F/g, "\u201C");
  s = s.replace(/\u2015/g, "\u2014");
  s = s.replace(/\u2012/g, "\u2013");
  s = s.replace(/\u00A0/g, " ");
  s = s.replace(
    /[^\x20-\x7E\xA0-\xFF\u0152\u0153\u0160\u0161\u0178\u017D\u017E\u0192\u02C6\u02DC\u2013\u2014\u2018\u2019\u201A\u201C\u201D\u201E\u2020\u2021\u2022\u2026\u2030\u2039\u203A\u20AC\u2122]/g,
    "",
  );
  return s;
}

// ── Typesetting structures ──────────────────────────────────────────────────

interface TypesetLine {
  text: string;
  isFirstInParagraph: boolean;
  isLastInParagraph: boolean;
}

interface TypesetParagraph {
  type: "text" | "blank";
  lines: TypesetLine[];
}

/**
 * Wraps text into paragraph-aware lines.
 * First lines of paragraphs are wrapped at a narrower width (indent),
 * subsequent lines use the full content width.
 * When suppressFirstIndent is true, the very first paragraph gets no indent
 * (standard typographic convention after a heading).
 */
function typesetText(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number,
  firstLineIndent: number,
  suppressFirstIndent: boolean,
  mergeLines: boolean,
): TypesetParagraph[] {
  const normalised = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  let paragraphTexts: string[];

  if (mergeLines) {
    // Join consecutive non-blank lines into real paragraphs.
    // Only blank lines (\n\n) create paragraph breaks – single \n is treated
    // as a soft break within the same paragraph (better for justified text).
    const rawLines = normalised.split("\n");
    paragraphTexts = [];
    let currentParaText = "";

    for (const line of rawLines) {
      if (line.trim() === "") {
        if (currentParaText) {
          paragraphTexts.push(currentParaText);
          currentParaText = "";
        }
        paragraphTexts.push("");
      } else {
        currentParaText = currentParaText
          ? `${currentParaText} ${line.trim()}`
          : line.trim();
      }
    }
    if (currentParaText) {
      paragraphTexts.push(currentParaText);
    }
  } else {
    // Keep every line break – each \n stays a separate paragraph
    paragraphTexts = normalised.split("\n");
  }

  const result: TypesetParagraph[] = [];
  let isFirstTextPara = suppressFirstIndent;

  for (const para of paragraphTexts) {
    if (para.trim() === "") {
      result.push({ type: "blank", lines: [{ text: "", isFirstInParagraph: true, isLastInParagraph: true }] });
      isFirstTextPara = false;
      continue;
    }

    const words = para.split(/\s+/).filter(Boolean);
    const lines: TypesetLine[] = [];
    let currentLine = "";
    let lineIndex = 0;
    const indent = isFirstTextPara ? 0 : firstLineIndent;
    isFirstTextPara = false;

    for (const word of words) {
      const safeWord = safe(word);
      if (!safeWord) continue;

      const candidate = currentLine ? `${currentLine} ${safeWord}` : safeWord;
      const availWidth = lineIndex === 0 ? maxWidth - indent : maxWidth;

      let width: number;
      try {
        width = font.widthOfTextAtSize(candidate, fontSize);
      } catch {
        if (currentLine) {
          lines.push({ text: currentLine, isFirstInParagraph: lineIndex === 0, isLastInParagraph: false });
          lineIndex++;
        }
        currentLine = safeWord;
        continue;
      }

      if (width > availWidth && currentLine) {
        lines.push({ text: currentLine, isFirstInParagraph: lineIndex === 0, isLastInParagraph: false });
        lineIndex++;
        currentLine = safeWord;
      } else {
        currentLine = candidate;
      }
    }

    if (currentLine) {
      lines.push({ text: currentLine, isFirstInParagraph: lineIndex === 0, isLastInParagraph: true });
    }
    if (lines.length > 0) {
      lines[lines.length - 1].isLastInParagraph = true;
    }

    result.push({ type: "text", lines });
  }

  return result;
}

// ── Drawing helpers ─────────────────────────────────────────────────────────

function drawSafe(
  page: PDFPage,
  text: string,
  opts: { x: number; y: number; size: number; font: PDFFont; color: ReturnType<typeof rgb> },
): void {
  const clean = safe(text);
  if (!clean) return;
  try {
    page.drawText(clean, opts);
  } catch {
    const ascii = clean.replace(/[^\x20-\x7E]/g, "?");
    if (ascii.trim()) {
      try { page.drawText(ascii, opts); } catch { /* give up */ }
    }
  }
}

function measureWord(word: string, font: PDFFont, fontSize: number): number {
  try {
    return font.widthOfTextAtSize(word, fontSize);
  } catch {
    // Fallback: strip to ASCII and measure, then scale up for missing chars
    const ascii = word.replace(/[^\x20-\x7E]/g, "");
    if (ascii.length === 0) return fontSize * 0.6 * word.length;
    try {
      const asciiWidth = font.widthOfTextAtSize(ascii, fontSize);
      return asciiWidth * (word.length / ascii.length);
    } catch {
      return fontSize * 0.5 * word.length;
    }
  }
}

function drawJustifiedLine(
  page: PDFPage,
  lineText: string,
  opts: {
    x: number;
    y: number;
    size: number;
    font: PDFFont;
    color: ReturnType<typeof rgb>;
    targetWidth: number;
  },
): void {
  const words = lineText.split(/\s+/).filter(Boolean);
  if (words.length <= 1) {
    drawSafe(page, lineText, opts);
    return;
  }

  let totalTextWidth = 0;
  const widths: number[] = [];
  for (const word of words) {
    const w = measureWord(word, opts.font, opts.size);
    widths.push(w);
    totalTextWidth += w;
  }

  const gapCount = words.length - 1;
  const spacePerGap = (opts.targetWidth - totalTextWidth) / gapCount;

  let normalSpace: number;
  try {
    normalSpace = opts.font.widthOfTextAtSize(" ", opts.size);
  } catch {
    normalSpace = opts.size * 0.25;
  }

  if (spacePerGap > normalSpace * MAX_JUSTIFY_STRETCH || spacePerGap < normalSpace * 0.4) {
    drawSafe(page, lineText, opts);
    return;
  }

  let curX = opts.x;
  for (let i = 0; i < words.length; i++) {
    const safeWord = safe(words[i]);
    if (safeWord) {
      try {
        page.drawText(safeWord, {
          x: curX,
          y: opts.y,
          size: opts.size,
          font: opts.font,
          color: opts.color,
        });
      } catch {
        const ascii = safeWord.replace(/[^\x20-\x7E]/g, "?");
        try { page.drawText(ascii, { x: curX, y: opts.y, size: opts.size, font: opts.font, color: opts.color }); } catch { /* skip */ }
      }
    }
    curX += widths[i];
    if (i < words.length - 1) curX += spacePerGap;
  }
}

// ── Main PDF generation ─────────────────────────────────────────────────────

export async function generateTranscriptionPdf(
  options: PdfExportOptions,
): Promise<Uint8Array> {
  const { jobId, title: explicitTitle, pages, coverPage, continuousFlow, justified, createdAt } = options;

  const bodyFontSize = options.fontSize || DEFAULT_FONT_SIZE;
  const bodyLineHeight = bodyFontSize * LINE_HEIGHT_FACTOR;
  const firstLineIndent = 0;
  const pageHeadingSize = Math.round(bodyFontSize * 1.25);
  const isJustified = justified ?? false;
  const isMergeLines = options.mergeLines ?? false;
  const showPageLabels = options.showPageLabels ?? true;

  const defaultTitle = explicitTitle
    ?? (jobId != null ? `MormorsBreve \u2013 Transkription #${jobId}` : "MormorsBreve \u2013 Sammeltranskription");

  console.log(`[PDF Export] justified=${isJustified}, mergeLines=${isMergeLines}, fontSize=${bodyFontSize}, continuousFlow=${continuousFlow}, pages=${pages.length}`);

  const pdf = await PDFDocument.create();

  pdf.setTitle(coverPage?.title || defaultTitle);
  pdf.setAuthor(coverPage?.author || "MormorsBreve");
  pdf.setSubject("Historische Handschrift-Transkription");
  pdf.setCreator("MormorsBreve (mormorsbreve.dk)");
  pdf.setProducer("pdf-lib");
  pdf.setCreationDate(new Date());

  const serif = await pdf.embedFont(StandardFonts.TimesRoman);
  const serifBold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const serifIt = await pdf.embedFont(StandardFonts.TimesRomanItalic);
  const sans = await pdf.embedFont(StandardFonts.Helvetica);
  const sansBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const [W, H] = PageSizes.A4;
  const contentW = W - MARGIN.left - MARGIN.right;

  let totalPageNum = 0;
  let contentPageNum = 0;
  let frontMatterPages = 0;

  function addRunningHeader(p: PDFPage) {
    const headerText = coverPage?.title
      ? safe(coverPage.title)
      : safe(defaultTitle);
    drawSafe(p, headerText, {
      x: MARGIN.left,
      y: H - MARGIN.top + 28,
      size: 8.5,
      font: sans,
      color: CLR.muted,
    });
    p.drawLine({
      start: { x: MARGIN.left, y: H - MARGIN.top + 16 },
      end: { x: W - MARGIN.right, y: H - MARGIN.top + 16 },
      thickness: 0.4,
      color: CLR.ruleLight,
    });
  }

  function addPageFooter(p: PDFPage, label: string) {
    const t = safe(label);
    const w = sans.widthOfTextAtSize(t, FOOTER_SIZE);

    p.drawLine({
      start: { x: MARGIN.left, y: MARGIN.bottom - 8 },
      end: { x: W - MARGIN.right, y: MARGIN.bottom - 8 },
      thickness: 0.3,
      color: CLR.ruleLight,
    });

    drawSafe(p, label, {
      x: W / 2 - w / 2,
      y: MARGIN.bottom - 26,
      size: FOOTER_SIZE,
      font: sans,
      color: CLR.muted,
    });
  }

  function linesAvailable(currentY: number): number {
    return Math.floor((currentY - MARGIN.bottom - 20) / bodyLineHeight);
  }

  // ── Cover page ──

  if (coverPage && (coverPage.title || coverPage.subtitle || coverPage.author)) {
    const cp = pdf.addPage(PageSizes.A4);
    totalPageNum++;
    frontMatterPages++;

    if (coverPage.style === "classic") {
      drawClassicCover(cp, coverPage, W, H, serif, serifBold, serifIt, sans);
    } else if (coverPage.style === "elegant") {
      drawElegantCover(cp, coverPage, W, H, serif, serifBold, serifIt, sans);
    } else {
      drawMinimalCover(cp, coverPage, W, H, serif, serifBold, serifIt, sans);
    }
  }

  // ── Content pages ──

  let currentPage: PDFPage | null = null;
  let curY = 0;
  let isChapterStartPage = false;

  function newContentPage(chapterStart: boolean): PDFPage {
    const p = pdf.addPage(PageSizes.A4);
    totalPageNum++;
    contentPageNum++;
    curY = H - MARGIN.top;
    isChapterStartPage = chapterStart;

    if (!chapterStart) {
      addRunningHeader(p);
      curY -= 8;
    }

    currentPage = p;
    return p;
  }

  for (let epIdx = 0; epIdx < pages.length; epIdx++) {
    const ep = pages[epIdx];
    const rawText = ep.text || "Keine Transkription verf\u00FCgbar.";

    const paragraphs = typesetText(rawText, serif, bodyFontSize, contentW, firstLineIndent, true, isMergeLines);

    const needNewPage = !continuousFlow || !currentPage || epIdx === 0;
    if (needNewPage) {
      if (currentPage) {
        addPageFooter(currentPage, `\u2013 ${contentPageNum} \u2013`);
      }
      newContentPage(true);
    } else {
      curY -= bodyLineHeight * 1.2;
    }

    if (showPageLabels) {
      const heading = `Seite ${ep.pageNumber}`;
      const headingHeight = pageHeadingSize + 12 + bodyLineHeight * HEADING_KEEP_LINES;
      if (linesAvailable(curY) * bodyLineHeight < headingHeight && currentPage) {
        addPageFooter(currentPage, `\u2013 ${contentPageNum} \u2013`);
        newContentPage(true);
      }

      drawSafe(currentPage!, heading, {
        x: MARGIN.left, y: curY,
        size: pageHeadingSize, font: serifBold, color: CLR.heading,
      });
      curY -= pageHeadingSize + 6;

      currentPage!.drawLine({
        start: { x: MARGIN.left, y: curY },
        end: { x: W - MARGIN.right, y: curY },
        thickness: 0.5,
        color: CLR.rule,
      });
      curY -= 22;
    }

    // Draw paragraphs
    for (const para of paragraphs) {
      if (para.type === "blank") {
        curY -= bodyLineHeight * 0.4;
        continue;
      }

      const paraLines = para.lines;

      // Orphan control: don't leave fewer than MIN_ORPHAN_LINES at page bottom
      if (paraLines.length >= MIN_ORPHAN_LINES + MIN_WIDOW_LINES) {
        const available = linesAvailable(curY);
        if (available > 0 && available < MIN_ORPHAN_LINES) {
          addPageFooter(currentPage!, `\u2013 ${contentPageNum} \u2013`);
          newContentPage(false);
        }
      }

      for (let i = 0; i < paraLines.length; i++) {
        const line = paraLines[i];

        if (curY < MARGIN.bottom + 25) {
          addPageFooter(currentPage!, `\u2013 ${contentPageNum} \u2013`);
          newContentPage(false);
        }

        // Widow control: don't leave fewer than MIN_WIDOW_LINES at page top
        const remainingInPara = paraLines.length - i;
        if (remainingInPara <= MIN_WIDOW_LINES && remainingInPara < paraLines.length) {
          const available = linesAvailable(curY);
          if (available < MIN_WIDOW_LINES && available < remainingInPara) {
            addPageFooter(currentPage!, `\u2013 ${contentPageNum} \u2013`);
            newContentPage(false);
          }
        }

        const xOffset = line.isFirstInParagraph ? firstLineIndent : 0;
        const lineTargetWidth = line.isFirstInParagraph ? contentW - firstLineIndent : contentW;

        if (isJustified && !line.isLastInParagraph && line.text.trim()) {
          drawJustifiedLine(currentPage!, line.text, {
            x: MARGIN.left + xOffset,
            y: curY,
            size: bodyFontSize,
            font: serif,
            color: CLR.text,
            targetWidth: lineTargetWidth,
          });
        } else {
          drawSafe(currentPage!, line.text, {
            x: MARGIN.left + xOffset, y: curY,
            size: bodyFontSize, font: serif, color: CLR.text,
          });
        }

        curY -= bodyLineHeight;
      }
    }
  }

  if (currentPage) {
    addPageFooter(currentPage, `\u2013 ${contentPageNum} \u2013`);
  }

  const bytes = await pdf.save();
  console.log(`[PDF Export] PDF generated: ${bytes.length} bytes, ${pdf.getPageCount()} pages`);
  return bytes;
}

// ── Cover page renderers ────────────────────────────────────────────────────

function drawClassicCover(
  page: PDFPage,
  cover: CoverPageOptions,
  W: number, H: number,
  serif: PDFFont, serifBold: PDFFont, serifIt: PDFFont, sans: PDFFont,
) {
  const borderInset = 40;

  page.drawRectangle({
    x: borderInset,
    y: borderInset,
    width: W - borderInset * 2,
    height: H - borderInset * 2,
    borderColor: CLR.coverAccent,
    borderWidth: 1.5,
    color: undefined,
  });

  page.drawRectangle({
    x: borderInset + 6,
    y: borderInset + 6,
    width: W - (borderInset + 6) * 2,
    height: H - (borderInset + 6) * 2,
    borderColor: CLR.ruleLight,
    borderWidth: 0.5,
    color: undefined,
  });

  let y = H - 250;

  if (cover.title) {
    const titleLines = wrapLinesForCover(cover.title, serifBold, 32, W - 160);
    for (const line of titleLines) {
      const tw = serifBold.widthOfTextAtSize(safe(line), 32);
      drawSafe(page, line, {
        x: W / 2 - tw / 2, y,
        size: 32, font: serifBold, color: CLR.text,
      });
      y -= 44;
    }
  }

  y -= 10;
  const ornLen = 60;
  page.drawLine({
    start: { x: W / 2 - ornLen / 2, y },
    end: { x: W / 2 + ornLen / 2, y },
    thickness: 1.5,
    color: CLR.coverAccent,
  });
  y -= 5;
  page.drawLine({
    start: { x: W / 2 - ornLen / 3, y },
    end: { x: W / 2 + ornLen / 3, y },
    thickness: 0.8,
    color: CLR.coverAccent,
  });
  y -= 35;

  if (cover.subtitle) {
    const subLines = wrapLinesForCover(cover.subtitle, serifIt, 16, W - 160);
    for (const line of subLines) {
      const sw = serifIt.widthOfTextAtSize(safe(line), 16);
      drawSafe(page, line, {
        x: W / 2 - sw / 2, y,
        size: 16, font: serifIt, color: CLR.muted,
      });
      y -= 24;
    }
  }

  if (cover.author) {
    const ay = 150;
    const aw = sans.widthOfTextAtSize(safe(cover.author), 13);
    drawSafe(page, cover.author, {
      x: W / 2 - aw / 2, y: ay,
      size: 13, font: sans, color: CLR.heading,
    });
  }
}

function drawElegantCover(
  page: PDFPage,
  cover: CoverPageOptions,
  W: number, H: number,
  serif: PDFFont, serifBold: PDFFont, serifIt: PDFFont, sans: PDFFont,
) {
  page.drawRectangle({
    x: 0,
    y: H - 220,
    width: W,
    height: 220,
    color: rgb(0.96, 0.94, 0.90),
  });

  page.drawLine({
    start: { x: 0, y: H - 220 },
    end: { x: W, y: H - 220 },
    thickness: 2,
    color: CLR.coverAccent,
  });

  let y = H - 320;

  if (cover.title) {
    const titleLines = wrapLinesForCover(cover.title, serifBold, 36, W - 140);
    for (const line of titleLines) {
      const tw = serifBold.widthOfTextAtSize(safe(line), 36);
      drawSafe(page, line, {
        x: W / 2 - tw / 2, y,
        size: 36, font: serifBold, color: CLR.text,
      });
      y -= 50;
    }
  }

  y -= 15;

  if (cover.subtitle) {
    const subLines = wrapLinesForCover(cover.subtitle, serifIt, 18, W - 140);
    for (const line of subLines) {
      const sw = serifIt.widthOfTextAtSize(safe(line), 18);
      drawSafe(page, line, {
        x: W / 2 - sw / 2, y,
        size: 18, font: serifIt, color: CLR.muted,
      });
      y -= 28;
    }
  }

  page.drawRectangle({
    x: 0,
    y: 0,
    width: W,
    height: 120,
    color: rgb(0.96, 0.94, 0.90),
  });

  page.drawLine({
    start: { x: 0, y: 120 },
    end: { x: W, y: 120 },
    thickness: 2,
    color: CLR.coverAccent,
  });

  if (cover.author) {
    const ay = 60;
    const aw = sans.widthOfTextAtSize(safe(cover.author), 14);
    drawSafe(page, cover.author, {
      x: W / 2 - aw / 2, y: ay,
      size: 14, font: sans, color: CLR.heading,
    });
  }
}

function drawMinimalCover(
  page: PDFPage,
  cover: CoverPageOptions,
  W: number, H: number,
  _serif: PDFFont, _serifBold: PDFFont, _serifIt: PDFFont, sans: PDFFont,
) {
  const sansBold = sans;

  let y = H / 2 + 60;

  if (cover.title) {
    const titleLines = wrapLinesForCover(cover.title, sansBold, 30, W - 140);
    for (const line of titleLines) {
      const tw = sansBold.widthOfTextAtSize(safe(line), 30);
      drawSafe(page, line, {
        x: W / 2 - tw / 2, y,
        size: 30, font: sansBold, color: CLR.text,
      });
      y -= 42;
    }
  }

  y -= 10;
  const lineLen = 40;
  page.drawLine({
    start: { x: W / 2 - lineLen / 2, y },
    end: { x: W / 2 + lineLen / 2, y },
    thickness: 1,
    color: CLR.rule,
  });
  y -= 30;

  if (cover.subtitle) {
    const subLines = wrapLinesForCover(cover.subtitle, sans, 14, W - 140);
    for (const line of subLines) {
      const sw = sans.widthOfTextAtSize(safe(line), 14);
      drawSafe(page, line, {
        x: W / 2 - sw / 2, y,
        size: 14, font: sans, color: CLR.muted,
      });
      y -= 22;
    }
  }

  if (cover.author) {
    const ay = 120;
    const aw = sans.widthOfTextAtSize(safe(cover.author), 12);
    drawSafe(page, cover.author, {
      x: W / 2 - aw / 2, y: ay,
      size: 12, font: sans, color: CLR.muted,
    });
  }
}

function wrapLinesForCover(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const safeText = safe(text);
  const words = safeText.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    try {
      const w = font.widthOfTextAtSize(candidate, fontSize);
      if (w > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    } catch {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}
