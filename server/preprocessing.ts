/**
 * Image preprocessing for transcription evaluation.
 * Applies optional transforms (contrast, sharpen, binarize) before sending to Claude.
 * Only for images (JPG, PNG, WebP) – PDFs are sent without preprocessing.
 */
import sharp from "sharp";

export interface PreprocessingOptions {
  /** Kontrast verbessern (normalize – streckt Luminanz auf vollen Bereich) */
  contrast?: boolean;
  /** Bild schärfen */
  sharpen?: boolean;
  /** Binarisierung (Graustufen → Schwarz/Weiß) – gut für verblasste Schriften */
  binarize?: boolean;
  /** Regelbasiert: KI entscheidet automatisch, welche Schritte nötig sind */
  preprocessingAuto?: boolean;
}

/** Ergebnis der regelbasierten Analyse – welche Schritte angewendet wurden */
export interface AutoPreprocessResult {
  contrast: boolean;
  sharpen: boolean;
  binarize: boolean;
  metrics?: { dynamicRange: number; sharpness: number; stdev: number };
}

/** Schwellenwerte für Auto-Preprocessing (anpassbar) */
const AUTO_THRESHOLDS = {
  contrastMaxRange: 180,
  sharpenMinSharpness: 150,
  binarizeMaxRange: 100,
};

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

export function isImageFile(fileUrl: string): boolean {
  const ext = fileUrl.toLowerCase().split(".").pop() ?? "";
  return IMAGE_EXTENSIONS.has(`.${ext}`);
}

/**
 * Wendet optionales Preprocessing auf ein Bild an.
 * @param buffer Rohdaten des Bildes
 * @param options Preprocessing-Optionen
 * @returns Buffer des verarbeiteten Bildes (immer PNG nach Verarbeitung)
 */
export async function preprocessImage(
  buffer: Buffer,
  options: PreprocessingOptions
): Promise<{ buffer: Buffer; mediaType: "image/png" }> {
  const hasAny = options.contrast || options.sharpen || options.binarize;
  if (!hasAny) {
    return { buffer, mediaType: "image/png" };
  }

  let pipeline = sharp(buffer);

  if (options.contrast) {
    pipeline = pipeline.normalize();
  }
  if (options.sharpen) {
    pipeline = pipeline.sharpen({ sigma: 1 });
  }
  if (options.binarize) {
    pipeline = pipeline.threshold(128);
  }

  const out = await pipeline.png().toBuffer();
  return { buffer: out, mediaType: "image/png" };
}

/**
 * Analysiert ein Bild regelbasiert und entscheidet, welche Preprocessing-Schritte
 * sinnvoll sind.
 */
export async function analyzeImageForPreprocessing(
  buffer: Buffer,
  includeMetrics = false
): Promise<AutoPreprocessResult> {
  const img = sharp(buffer);
  const stats = await img.stats();
  const ch = stats.channels[0];
  const dynamicRange = (ch?.max ?? 255) - (ch?.min ?? 0);
  const stdev = ch?.stdev ?? 0;
  const sharpnessVal = (stats as { sharpness?: number }).sharpness ?? 0;

  const contrast = dynamicRange < AUTO_THRESHOLDS.contrastMaxRange;
  const sharpen =
    sharpnessVal >= 0 && sharpnessVal < AUTO_THRESHOLDS.sharpenMinSharpness;
  const binarize = dynamicRange < AUTO_THRESHOLDS.binarizeMaxRange;

  return {
    contrast,
    sharpen,
    binarize,
    ...(includeMetrics && { metrics: { dynamicRange, sharpness: sharpnessVal, stdev } }),
  };
}

/**
 * Wendet regelbasiertes Auto-Preprocessing an.
 */
export async function autoPreprocessImage(
  buffer: Buffer,
  includeMetrics = false
): Promise<{ buffer: Buffer; mediaType: "image/png"; applied: AutoPreprocessResult }> {
  const decision = await analyzeImageForPreprocessing(buffer, includeMetrics);
  const result = await preprocessImage(buffer, {
    contrast: decision.contrast,
    sharpen: decision.sharpen,
    binarize: decision.binarize,
  });
  return { ...result, applied: decision };
}
