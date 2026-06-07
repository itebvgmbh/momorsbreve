/**
 * Text-to-Speech via Gemini 2.5 Flash TTS.
 * Credits: 1 per 1000 characters (minimum 1).
 *
 * Chunks are kept short (~1500 chars ≈ 30s audio) to avoid the known
 * Gemini TTS quality degradation (metallic voice / pacing drift) that
 * occurs after ~1-2 min of continuous generation.  PCM chunks are
 * silence-trimmed and crossfaded before MP3 encoding.
 */

import { execFileSync } from "child_process";
import ffmpegStaticPath from "ffmpeg-static";

const TTS_MODEL = "gemini-2.5-flash-preview-tts";
const TTS_CHARS_PER_CREDIT = 1000;
const TTS_MAX_CHARS_PER_REQUEST = 1500;
const TTS_MAX_RETRIES = 3;
const TTS_RETRY_DELAY_MS = 3000;
const TTS_PARALLEL_LIMIT = 2;

export class TtsServiceUnavailableError extends Error {
  public readonly reason: string;
  constructor(reason: string) {
    super("Der Vorlese-Service ist momentan nicht verfügbar. Bitte versuchen Sie es in einigen Minuten erneut. Es wurden keine Credits abgezogen.");
    this.name = "TtsServiceUnavailableError";
    this.reason = reason;
  }
}

export function calculateTtsCredits(text: string): number {
  if (!text || !text.trim()) return 0;
  return Math.max(1, Math.ceil(text.length / TTS_CHARS_PER_CREDIT));
}

export interface TtsOptions {
  text: string;
  voice?: string;
  style?: string;
  languageCode?: string;
}

export interface TtsResult {
  audioBuffer: Buffer;
  mimeType: string;
}

const TTS_SAMPLE_RATE = 24000;
const TTS_CHANNELS = 1;
const TTS_BYTES_PER_SAMPLE = 2; // 16-bit PCM
const TTS_MP3_KBPS = 128;

/** Amplitude below which a sample is considered silence (16-bit PCM). */
const SILENCE_THRESHOLD = 80;
/** Crossfade duration in seconds applied at chunk boundaries. */
const CROSSFADE_SECONDS = 0.008;

// ---------------------------------------------------------------------------
// PCM helpers
// ---------------------------------------------------------------------------

function pcmToMp3(
  pcm: Buffer,
  sampleRate = TTS_SAMPLE_RATE,
  channels = TTS_CHANNELS,
  kbps = TTS_MP3_KBPS,
): Buffer {
  const ffmpegBin = ffmpegStaticPath || "ffmpeg";
  return execFileSync(ffmpegBin, [
    "-f", "s16le",
    "-ar", String(sampleRate),
    "-ac", String(channels),
    "-i", "pipe:0",
    "-b:a", `${kbps}k`,
    "-f", "mp3",
    "-y",
    "pipe:1",
  ], { input: pcm, maxBuffer: 50 * 1024 * 1024, stdio: ["pipe", "pipe", "pipe"] });
}

/**
 * Remove leading/trailing silence from a 16-bit LE PCM buffer.
 * Keeps a tiny margin (2 ms) so the audio doesn't start/end too abruptly.
 */
function trimSilence(pcm: Buffer, sampleRate = TTS_SAMPLE_RATE): Buffer {
  const sampleCount = Math.floor(pcm.length / TTS_BYTES_PER_SAMPLE);
  if (sampleCount === 0) return pcm;

  let firstLoud = -1;
  let lastLoud = -1;
  for (let i = 0; i < sampleCount; i++) {
    const val = Math.abs(pcm.readInt16LE(i * TTS_BYTES_PER_SAMPLE));
    if (val > SILENCE_THRESHOLD) {
      if (firstLoud === -1) firstLoud = i;
      lastLoud = i;
    }
  }

  if (firstLoud === -1) return pcm;

  const marginSamples = Math.floor(sampleRate * 0.002);
  const start = Math.max(0, firstLoud - marginSamples);
  const end = Math.min(sampleCount - 1, lastLoud + marginSamples);
  return pcm.subarray(start * TTS_BYTES_PER_SAMPLE, (end + 1) * TTS_BYTES_PER_SAMPLE);
}

/**
 * Apply a linear fade-out to the last N samples and fade-in to the first N
 * samples of a 16-bit LE PCM buffer (in-place).
 */
function applyFades(pcm: Buffer, fadeSamples: number): void {
  const sampleCount = Math.floor(pcm.length / TTS_BYTES_PER_SAMPLE);
  const n = Math.min(fadeSamples, Math.floor(sampleCount / 2));
  for (let i = 0; i < n; i++) {
    const factor = i / n;
    // fade-in
    const inOff = i * TTS_BYTES_PER_SAMPLE;
    pcm.writeInt16LE(Math.round(pcm.readInt16LE(inOff) * factor), inOff);
    // fade-out
    const outIdx = sampleCount - 1 - i;
    const outOff = outIdx * TTS_BYTES_PER_SAMPLE;
    pcm.writeInt16LE(Math.round(pcm.readInt16LE(outOff) * factor), outOff);
  }
}

// ---------------------------------------------------------------------------
// Parallel execution helper
// ---------------------------------------------------------------------------

async function parallelMap<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIdx = 0;

  async function worker() {
    while (nextIdx < items.length) {
      const idx = nextIdx++;
      results[idx] = await fn(items[idx], idx);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

// ---------------------------------------------------------------------------
// Core
// ---------------------------------------------------------------------------

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateSpeechChunk(
  text: string,
  voice: string,
  style: string | undefined,
  languageCode?: string,
): Promise<{ data: Buffer; mimeType: string }> {
  const { GoogleGenAI } = await import("@google/genai");
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY nicht gesetzt");

  const ai = new GoogleGenAI({ apiKey });
  const isNonGerman = languageCode && !languageCode.startsWith("de");

  const paceHint = isNonGerman
    ? "Keep a steady, calm reading pace throughout"
    : "Halte dabei durchgehend ein gleichmäßiges, ruhiges Sprechtempo";

  let prompt: string;
  if (style) {
    prompt = `${style}. ${paceHint}: ${text}`;
  } else {
    const readAloud = isNonGerman
      ? "Read the following text aloud"
      : "Lies den folgenden Text vor";
    prompt = `${readAloud}. ${paceHint}: ${text}`;
  }

  const speechConfig: Record<string, unknown> = {
    voiceConfig: {
      prebuiltVoiceConfig: { voiceName: voice || "Kore" },
    },
  };
  if (isNonGerman && languageCode) {
    speechConfig.languageCode = languageCode;
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= TTS_MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        const delayMs = TTS_RETRY_DELAY_MS * attempt;
        console.log(`[TTS] Retry ${attempt}/${TTS_MAX_RETRIES} in ${delayMs}ms...`);
        await sleep(delayMs);
      }

      const response = await ai.models.generateContent({
        model: TTS_MODEL,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig,
        },
      });

      const part = response.candidates?.[0]?.content?.parts?.[0];
      const inlineData = part?.inlineData as { data?: string; mimeType?: string } | undefined;
      if (!inlineData?.data) {
        throw new Error("TTS API returned no audio data");
      }

      const data = Buffer.from(inlineData.data, "base64");
      const mimeType = inlineData.mimeType || "audio/wav";
      if (attempt > 0) {
        console.log(`[TTS] Erfolgreich nach ${attempt} Retries`);
      }
      return { data, mimeType };
    } catch (err: any) {
      lastError = err;
      const status = err?.status ?? err?.code;
      const message = err?.message ?? "";
      const isOverloaded = status === 503 || message.includes("overloaded");
      const isServerError = status === 500 || isOverloaded || message.includes("INTERNAL");

      console.error(`[TTS] Versuch ${attempt + 1}/${TTS_MAX_RETRIES + 1} fehlgeschlagen:`, {
        status,
        error: message,
        model: TTS_MODEL,
        isOverloaded,
        isServerError,
      });

      if (isServerError && attempt < TTS_MAX_RETRIES) continue;

      if (isOverloaded) {
        const reason = `Modell ${TTS_MODEL} überlastet (HTTP ${status}). ${TTS_MAX_RETRIES + 1} Versuche fehlgeschlagen.`;
        console.error(`[TTS] Service nicht verfügbar: ${reason}`);
        throw new TtsServiceUnavailableError(reason);
      }
    }
  }

  throw lastError!;
}

/**
 * Split text at natural boundaries (paragraphs > sentences > clauses).
 * Prefers cuts at double-newlines, then sentence-ending punctuation,
 * then clause-level punctuation (semicolons, commas, dashes).
 */
function splitTextIntoChunks(text: string, maxLen: number): string[] {
  if (text.length <= maxLen) return [text];
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= maxLen) {
      chunks.push(remaining);
      break;
    }

    let cut = remaining.lastIndexOf("\n\n", maxLen);

    if (cut < maxLen * 0.3) {
      cut = Math.max(
        remaining.lastIndexOf(". ", maxLen),
        remaining.lastIndexOf("! ", maxLen),
        remaining.lastIndexOf("? ", maxLen),
      );
    }

    if (cut < maxLen * 0.3) {
      cut = Math.max(
        remaining.lastIndexOf("; ", maxLen),
        remaining.lastIndexOf(", ", maxLen),
        remaining.lastIndexOf(" – ", maxLen),
        remaining.lastIndexOf(" - ", maxLen),
      );
    }

    if (cut < maxLen * 0.3) {
      cut = remaining.lastIndexOf(" ", maxLen);
    }

    if (cut < maxLen * 0.3) cut = maxLen;

    if (cut === maxLen) {
      chunks.push(remaining.slice(0, maxLen));
      remaining = remaining.slice(maxLen).trimStart();
    } else {
      chunks.push(remaining.slice(0, cut + 1).trimEnd());
      remaining = remaining.slice(cut + 1).trimStart();
    }
  }
  return chunks;
}

/**
 * Generate speech for the given text.
 *
 * Long text is split into small chunks (~1500 chars) to prevent the
 * Gemini TTS quality degradation that happens after ~1-2 min.  Each
 * chunk's PCM is silence-trimmed and crossfaded, then all chunks are
 * concatenated and encoded to MP3.
 */
export async function generateSpeech(options: TtsOptions): Promise<TtsResult> {
  const { text, voice = "Kore", style, languageCode } = options;
  const trimmed = text.trim();
  if (!trimmed) throw new Error("TTS: Text darf nicht leer sein");

  const chunks = splitTextIntoChunks(trimmed, TTS_MAX_CHARS_PER_REQUEST);
  console.log(`[TTS] Text aufgeteilt in ${chunks.length} Chunk(s) (${trimmed.length} Zeichen gesamt)`);

  if (chunks.length === 1) {
    const { data, mimeType } = await generateSpeechChunk(chunks[0], voice, style, languageCode);
    if (mimeType === "audio/mpeg") {
      return { audioBuffer: data, mimeType };
    }
    const mp3 = pcmToMp3(data);
    return { audioBuffer: mp3, mimeType: "audio/mpeg" };
  }

  const fadeSamples = Math.floor(TTS_SAMPLE_RATE * CROSSFADE_SECONDS);

  const rawBuffers = await parallelMap(
    chunks,
    TTS_PARALLEL_LIMIT,
    async (chunk, idx) => {
      console.log(`[TTS] Generiere Chunk ${idx + 1}/${chunks.length} (${chunk.length} Zeichen)`);
      const { data } = await generateSpeechChunk(chunk, voice, style, languageCode);
      return data;
    },
  );

  const processedBuffers = rawBuffers.map((raw) => {
    const trimmed = trimSilence(raw);
    const buf = Buffer.from(trimmed);
    applyFades(buf, fadeSamples);
    return buf;
  });

  const pcm = Buffer.concat(processedBuffers);
  const mp3 = pcmToMp3(pcm);
  return { audioBuffer: mp3, mimeType: "audio/mpeg" };
}
