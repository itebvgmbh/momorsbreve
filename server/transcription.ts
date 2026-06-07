import Anthropic from "@anthropic-ai/sdk";
import type { DocumentType } from "@shared/models/transcription";
import {
  systemPrompts,
  taskPrompts,
  getSystemPrompt,
  getTaskPrompt,
  getNoAnnotationsRule,
} from "./transcription-prompts";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  timeout: 5 * 60 * 1000, // 5 minutes per request (default is 10 min)
  maxRetries: 0,           // no retries – transcription calls are expensive
});

const DEFAULT_MODEL_PRIMARY = "claude-opus-4-6";
const MODEL_SECONDARY = "claude-sonnet-4-5";
const MAX_TOKENS = 16384;
const THINKING_BUDGET_PRIMARY = 8000;

export type ProductionProvider = "anthropic" | "google";

export interface ProductionConfig {
  provider: ProductionProvider;
  model: string;
}

export interface FallbackConfig {
  enabled: boolean;
  provider: ProductionProvider;
  model: string;
}

let cachedConfig: { config: ProductionConfig; loadedAt: number } | null = null;
let cachedFallback: { config: FallbackConfig; loadedAt: number } | null = null;
const CACHE_TTL_MS = 30_000;

export async function getProductionConfig(): Promise<ProductionConfig> {
  if (cachedConfig && Date.now() - cachedConfig.loadedAt < CACHE_TTL_MS) {
    return cachedConfig.config;
  }
  const { storage } = await import("./storage");
  const provider = ((await storage.getSetting("transcription_provider")) as string) || "anthropic";
  const model = ((await storage.getSetting("transcription_model")) as string) || DEFAULT_MODEL_PRIMARY;
  const config: ProductionConfig = {
    provider: provider as ProductionProvider,
    model,
  };
  cachedConfig = { config, loadedAt: Date.now() };
  return config;
}

export async function getFallbackConfig(): Promise<FallbackConfig> {
  if (cachedFallback && Date.now() - cachedFallback.loadedAt < CACHE_TTL_MS) {
    return cachedFallback.config;
  }
  const { storage } = await import("./storage");
  const enabled = ((await storage.getSetting("fallback_enabled")) as boolean) ?? false;
  const provider = ((await storage.getSetting("fallback_provider")) as string) || "anthropic";
  const model = ((await storage.getSetting("fallback_model")) as string) || MODEL_SECONDARY;
  const config: FallbackConfig = { enabled, provider: provider as ProductionProvider, model };
  cachedFallback = { config, loadedAt: Date.now() };
  return config;
}

export function clearProductionConfigCache() {
  cachedConfig = null;
  cachedFallback = null;
}

export function isOverloadError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const status = (err as any).status ?? (err as any).statusCode;
  if (status === 429 || status === 503 || status === 529) return true;
  const msg = String((err as any).message || "");
  return /overloaded|rate.limit|too many requests|capacity|resource.exhausted/i.test(msg);
}

const noAnnotationsRule = getNoAnnotationsRule();

// ─── Post-processing: strip HTML entities from LLM output ────────────────────

function cleanTranscriptionText(text: string): string {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

// ─── Types ──────────────────────────────────────────────────────────────────

export type TranscriptionResult = {
  transcription: string;
  transcriptionCompleted?: string;
  transcriptionInterpreted?: string;
  quality?: {
    readability: number;
    confidence: number;
    issues: string[];
    recommendation: string;
    level: "green" | "yellow" | "red";
    optimizationTips?: string[];
  };
  inputTokens: number;
  outputTokens: number;
};

function extractTokenUsage(message: any): { inputTokens: number; outputTokens: number } {
  return {
    inputTokens: (message.usage?.input_tokens ?? 0) + (message.usage?.cache_creation_input_tokens ?? 0) + (message.usage?.cache_read_input_tokens ?? 0),
    outputTokens: message.usage?.output_tokens ?? 0,
  };
}

// ─── Logging helper ─────────────────────────────────────────────────────────

function logApiResponse(label: string, message: any) {
  console.log(`[Transcription API] ${label}:`);
  console.log(`  Model:           ${message.model}`);
  console.log(`  Stop reason:     ${message.stop_reason}`);
  console.log(`  Input tokens:    ${message.usage?.input_tokens}`);
  console.log(`  Output tokens:   ${message.usage?.output_tokens}`);
  if (message.usage?.cache_creation_input_tokens) {
    console.log(`  Cache creation:  ${message.usage.cache_creation_input_tokens}`);
  }
  if (message.usage?.cache_read_input_tokens) {
    console.log(`  Cache read:      ${message.usage.cache_read_input_tokens}`);
  }
  // Log thinking usage if present
  const thinkingBlock = message.content?.find((b: any) => b.type === "thinking");
  if (thinkingBlock) {
    const thinkingLen = thinkingBlock.thinking?.length || 0;
    console.log(`  Thinking:        enabled (${thinkingLen} chars of internal reasoning)`);
  }
  if (message.stop_reason === "max_tokens") {
    console.warn(`  ⚠ Response was TRUNCATED (hit max_tokens=${MAX_TOKENS})`);
  }
}

// ─── Core: call Claude for transcription ────────────────────────────────────

export interface TranscriptionConfig {
  systemPrompt?: string;
  taskPrompt?: string;
  model?: string;
  maxTokens?: number;
  thinkingBudget?: number;
}

/** Call Claude with optional config overrides (for evaluation / A/B testing) */
export async function callTranscriptionWithConfig(
  contentBlock: any,
  scriptType: string,
  label: string,
  config: TranscriptionConfig = {},
): Promise<{ text: string; message: any }> {
  const system =
    config.systemPrompt ??
    (systemPrompts[scriptType as DocumentType] ?? systemPrompts["auto"]);
  const taskBase =
    config.taskPrompt ??
    (taskPrompts[scriptType as DocumentType] ?? taskPrompts["auto"]);
  const task = taskBase + noAnnotationsRule;
  const model = config.model ?? DEFAULT_MODEL_PRIMARY;
  const maxTokens = config.maxTokens ?? MAX_TOKENS;
  const thinkingBudget = config.thinkingBudget ?? THINKING_BUDGET_PRIMARY;

  const message = await anthropic.messages.create({
    model,
    max_tokens: maxTokens,
    thinking: {
      type: "enabled",
      budget_tokens: thinkingBudget,
    },
    system,
    messages: [
      {
        role: "user",
        content: [
          contentBlock,
          {
            type: "text",
            text: task,
          },
        ],
      },
    ],
  } as any);

  logApiResponse(label, message);

  const textBlock = message.content.find((b: any) => b.type === "text");
  const raw = textBlock?.type === "text" ? (textBlock as any).text : "";
  return { text: cleanTranscriptionText(raw), message };
}

// ─── Analysis only (no transcription, for anonymous users) ────────────────────

export type AnalysisOnlyResult = {
  readability: number;
  confidence: number;
  issues: string[];
  recommendation: string;
  contentSummary?: string;
  level: "green" | "yellow" | "red";
  detectedScriptType?: string;
  transcriptionSnippet?: string;
};

const ANALYSIS_SYSTEM_PROMPT = `Du bist ein Experte für historische deutsche Handschriften und KI-gestützte Transkription. Antworte ausschließlich mit dem angeforderten JSON-Objekt.

Bewertungsrichtlinien:
- Unsere KI-Transkription ist sehr leistungsfähig und kann auch schwierige Handschriften (Kurrent, Sütterlin, Fraktur) mit hoher Genauigkeit transkribieren.
- Sei OPTIMISTISCH bei der Bewertung. Die meisten historischen Dokumente lassen sich gut automatisch transkribieren, selbst wenn sie etwas verblasst, fleckig oder in alter Schrift verfasst sind.
- Vergib "level": "green" großzügig – auch bei leichten bis mittleren Qualitätsproblemen.
- Vergib "level": "yellow" nur bei deutlich erschwerter Lesbarkeit (stark verblasst UND beschädigt, sehr unregelmäßige Schrift).
- Vergib "level": "red" NUR in echten Extremfällen: Dokument fast vollständig unleserlich, massiv beschädigt, komplett überdeckt oder zerrissen.
- Die "confidence" sollte in der Regel bei 60–95 liegen. Unter 40 nur bei Dokumenten, die wirklich kaum lesbar sind.
- Die "readability" sollte häufig 3–5 sein. 1–2 nur bei massiven Problemen.
- Liefere zusätzlich eine Transkriptionsprobe ("transcriptionSnippet"): Transkribiere die ersten ca. 400–500 Zeichen des Dokuments originalgetreu. Dies dient als Vorschau für den Nutzer.
- Liefere eine kurze Inhaltszusammenfassung ("contentSummary"): Beschreibe in EINEM kurzen, natürlichen Satz, worum es in dem Dokument geht – z.B. "Ein Brief von 1863 aus St. Genevieve an einen Verwandten namens August" oder "Eine Seite aus einem Kirchenbuch mit Taufeinträgen von 1780". Der Satz soll dem Nutzer zeigen, dass die KI sein Dokument inhaltlich verstanden hat.`;

function buildAnalysisTaskPrompt(scriptType: string): string {
  const transcriptionRules = taskPrompts[scriptType as DocumentType] ?? taskPrompts["auto"];
  return `Analysiere dieses Bild/Dokument einer Handschrift und erstelle eine Transkriptionsprobe.

Du MUSST ALLE folgenden Aufgaben erledigen:
1. Wie gut lesbar ist die Vorlage (1–5)?
2. Welcher Schrifttyp ist erkennbar? (suetterlin, post_1945, modern, fraktur, auto)
3. Welche konkreten Probleme gibt es? Liste alle erkennbaren Probleme auf – sowohl beim Dokumentinhalt (z.B. verblasste Tinte, Flecken, beschädigtes Papier) als auch bei der Bildqualität (z.B. Bild ist gedreht, unscharf, schlecht beleuchtet, Text abgeschnitten, Finger im Bild). Beschreibe nur was du siehst, schlage keine Lösungen vor.
4. Empfehlung: In den allermeisten Fällen KI-Transkription. Nur bei fast unleserlichen Dokumenten einen Experten empfehlen.
5. PFLICHTFELD "transcriptionSnippet": Transkribiere die ersten ca. 400–500 Zeichen des sichtbaren handschriftlichen Textes originalgetreu. Gib den Text so wieder, wie er geschrieben steht. Dieses Feld darf NIEMALS leer sein oder fehlen – es ist ein Pflichtfeld!
   Befolge dabei diese Transkriptionsregeln:
   ${transcriptionRules}
6. PFLICHTFELD "contentSummary": Beschreibe in EINEM kurzen, natürlichen Satz, worum es in dem Dokument geht. Beispiele: "Ein Brief von 1863 aus St. Genevieve an einen Verwandten namens August", "Eine Seite aus einem Kirchenbuch mit Taufeinträgen von 1780", "Ein Feldpostbrief aus dem Ersten Weltkrieg an die Familie". Der Satz soll dem Nutzer zeigen, dass die KI sein Dokument inhaltlich verstanden hat. Dieses Feld darf NIEMALS leer sein oder fehlen!

Antworte NUR mit diesem JSON-Objekt (kein anderer Text). ALLE Felder sind Pflichtfelder:
{
  "readability": <1-5>,
  "confidence": <0-100>,
  "issues": ["Alle erkannten Probleme – Dokument und Bildqualität"],
  "recommendation": "Kurze Empfehlung",
  "level": "green" | "yellow" | "red",
  "detectedScriptType": "suetterlin" | "post_1945" | "modern" | "fraktur" | "auto",
  "transcriptionSnippet": "PFLICHT: Die ersten ~400–500 Zeichen des transkribierten Textes",
  "contentSummary": "PFLICHT: Ein kurzer Satz, der den Inhalt des Dokuments beschreibt"
}`;
}

async function analyzeDocumentOnlyWithProvider(
  contentBlock: { type: "image" | "document"; source: { type: "base64"; media_type: string; data: string } },
  provider: ProductionProvider,
  model: string,
  scriptType: string,
): Promise<AnalysisOnlyResult | undefined> {
  if (provider === "google") {
    return analyzeDocumentOnlyGemini(contentBlock, model, scriptType);
  }

  const taskPrompt = buildAnalysisTaskPrompt(scriptType);

  const message = await anthropic.messages.create({
    model: model || MODEL_SECONDARY,
    max_tokens: 4096,
    thinking: {
      type: "enabled",
      budget_tokens: 4000,
    },
    system: ANALYSIS_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          contentBlock,
          { type: "text", text: taskPrompt },
        ],
      },
    ],
  } as any);

  logApiResponse("Analysis only (no transcription)", message);
  const textBlock = message.content.find((b: any) => b.type === "text");
  const responseText = textBlock?.type === "text" ? (textBlock as any).text : "";
  console.log(`[Anthropic API] Analysis response: ${responseText.substring(0, 500)}`);
  return parseAnalysisJson(responseText);
}

/** Analyse document quality and script type without transcribing. Uses the admin-configured production model. */
export async function analyzeDocumentOnly(
  contentBlock: { type: "image" | "document"; source: { type: "base64"; media_type: string; data: string } },
  scriptType: string,
): Promise<AnalysisOnlyResult | undefined> {
  try {
    const prodConfig = await getProductionConfig();

    try {
      return await analyzeDocumentOnlyWithProvider(contentBlock, prodConfig.provider, prodConfig.model, scriptType);
    } catch (err) {
      if (!isOverloadError(err)) throw err;

      const fallback = await getFallbackConfig();
      if (!fallback.enabled) {
        console.error("[Transcription API] analyzeDocumentOnly: API überlastet, kein Fallback konfiguriert");
        throw err;
      }

      console.warn(
        `[Transcription API] analyzeDocumentOnly: Primärmodell überlastet ` +
        `→ Fallback auf ${fallback.provider}/${fallback.model}`
      );
      return await analyzeDocumentOnlyWithProvider(contentBlock, fallback.provider, fallback.model, scriptType);
    }
  } catch (err) {
    console.error("[Transcription API] analyzeDocumentOnly failed:", err);
  }
  return undefined;
}

async function analyzeDocumentOnlyGemini(
  contentBlock: { type: "image" | "document"; source: { type: "base64"; media_type: string; data: string } },
  model: string,
  scriptType: string,
): Promise<AnalysisOnlyResult | undefined> {
  const { GoogleGenAI } = await import("@google/genai");
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY nicht gesetzt");
  const ai = new GoogleGenAI({ apiKey });

  const taskPrompt = buildAnalysisTaskPrompt(scriptType);

  const parts: Array<Record<string, unknown>> = [];
  parts.push({
    inlineData: {
      mimeType: contentBlock.source.media_type,
      data: contentBlock.source.data,
    },
  });
  parts.push({ text: taskPrompt });

  const response = await ai.models.generateContent({
    model,
    contents: [{ role: "user", parts }],
    config: {
      systemInstruction: ANALYSIS_SYSTEM_PROMPT,
      responseMimeType: "application/json",
      thinkingConfig: {
        thinkingBudget: 4000,
      },
      maxOutputTokens: 4096,
    },
  });

  const inputTokens = response.usageMetadata?.promptTokenCount ?? 0;
  const outputTokens = response.usageMetadata?.candidatesTokenCount ?? 0;
  const rawText = response.text ?? "";
  console.log(`[Gemini API] Analysis only:`);
  console.log(`  Model:           ${model}`);
  console.log(`  Input tokens:    ${inputTokens}`);
  console.log(`  Output tokens:   ${outputTokens}`);
  console.log(`  Response:        ${rawText.substring(0, 500)}`);

  return parseAnalysisJson(rawText);
}

function parseAnalysisJson(responseText: string): AnalysisOnlyResult | undefined {
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return undefined;

  try {
    const parsed = JSON.parse(jsonMatch[0]) as AnalysisOnlyResult;
    if (!parsed.transcriptionSnippet) {
      console.warn("[Analysis] Model did not return transcriptionSnippet field");
    }
    return parsed;
  } catch (firstErr) {
    console.warn("[Analysis] JSON parse failed, attempting truncated-JSON recovery:", (firstErr as Error).message);
    return recoverTruncatedAnalysisJson(jsonMatch[0]);
  }
}

/**
 * Tries to salvage usable data from a truncated JSON response.
 * Common when the model runs out of output tokens mid-string.
 */
function recoverTruncatedAnalysisJson(raw: string): AnalysisOnlyResult | undefined {
  const result: Record<string, unknown> = {};

  const numberFields = ["readability", "confidence"] as const;
  for (const field of numberFields) {
    const m = raw.match(new RegExp(`"${field}"\\s*:\\s*(\\d+)`));
    if (m) result[field] = Number(m[1]);
  }

  const stringFields = ["recommendation", "level", "detectedScriptType", "transcriptionSnippet"] as const;
  for (const field of stringFields) {
    const m = raw.match(new RegExp(`"${field}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)(?:"|$)`));
    if (m) result[field] = m[1].replace(/\\n/g, "\n").replace(/\\"/g, '"');
  }

  const issuesMatch = raw.match(/"issues"\s*:\s*\[([\s\S]*?)(?:\]|$)/);
  if (issuesMatch) {
    const items = [...issuesMatch[1].matchAll(/"((?:[^"\\]|\\.)*)"/g)].map(m => m[1]);
    result.issues = items;
  }

  if (!result.readability && !result.confidence && !result.level) {
    console.error("[Analysis] Could not recover any fields from truncated JSON");
    return undefined;
  }

  console.log("[Analysis] Recovered fields from truncated JSON:", Object.keys(result).join(", "));
  return result as unknown as AnalysisOnlyResult;
}

// ─── Unclear passage detection ───────────────────────────────────────────────

/** Check whether a transcription contains unclear-passage markers ([...] or [?]) */
export function hasUnclearPassages(text: string): boolean {
  return /\[\.\.\.\]|\[\?\]/.test(text);
}

// ─── Combined transcription constants & helpers ─────────────────────────────

const MAX_TOKENS_COMBINED = 24576;

const combinedSystemSuffix = `

Zusätzlich zu deiner Transkriptionsexpertise bist du auch Experte für:
- Qualitätsbewertung historischer Dokumente und deren Scans
- Kontextbasierte Vervollständigung unklarer Textstellen ([...] und [?])
- Interpretation und Korrektur typischer Lesefehler in historischen Handschriften

Du lieferst in einem einzigen Durchgang alle Ergebnisse strukturiert mit XML-Tags.`;

function buildCombinedTask(scriptType: string): string {
  const taskBase = taskPrompts[scriptType as DocumentType] ?? taskPrompts["auto"];

  return `${taskBase}

Verwende KEINE HTML-Entitäten (wie &nbsp;, &amp;, &lt; usw.) und KEINE HTML-Tags im transkribierten Text. Für Einrückungen und Abstände verwende ausschließlich normale Leerzeichen und Zeilenumbrüche.

---

Erstelle in EINEM Durchgang alle folgenden Ergebnisse. Strukturiere deinen Output EXAKT mit diesen XML-Tags:

1. ORIGINALTREUE TRANSKRIPTION in <transcription>...</transcription>:
   - So genau und vollständig wie möglich
   - Markiere unleserliche Stellen mit [...], unsichere Lesungen mit [?]
   - Behalte Absätze, Zeilenumbrüche und die Struktur des Originals bei
   - Füge KEINE eigenen Anmerkungen, Kommentare oder Metadaten hinzu

2. VERVOLLSTÄNDIGTE VERSION in <completed>...</completed> (NUR falls die Transkription [...] oder [?] enthält, sonst diesen Block WEGLASSEN):
   - Nimm den Text der originaltreuen Transkription als Grundlage und ersetze NUR die [...] und [?]-Markierungen durch sinngemäße Ergänzungen.
   - Ergänzungen müssen zum Gesamtzusammenhang, zur Epoche und zum Sprachstil passen.
   - STRIKT: Ändere KEINE bereits erkannten Wörter. Schreibe KEINE Abkürzungen aus. Korrigiere KEINE Wörter. Der gesamte restliche Text muss WORT FÜR WORT identisch mit der originaltreuen Transkription sein – nur die Lücken ([...] und [?]) werden durch Ergänzungen ersetzt.
   - Übernimm den VOLLSTÄNDIGEN Text – lasse KEINE Textteile weg (z. B. Anschriften, Adressen, Absender, Grußformeln, Unterschriften, Randbemerkungen).
   - Keine Anmerkungen oder Metadaten – nur den vervollständigten Text.

3. INTERPRETIERTE VERSION in <interpreted>...</interpreted>:
   - Schreibe gängige Abkürzungen aus: Wochentage (Mo.→Montag, Di.→Dienstag …), Monate (Jan.→Januar …), Datumsangaben (d.→den, ds.→dieses), Ortsangaben (Bhf.→Bahnhof, Str.→Straße), Anreden (Hr.→Herr, Fr.→Frau), Maße/Währungen (Pfd.→Pfund, Mk.→Mark, Thlr.→Thaler) und sonstige zeitgenössische Abkürzungen.
   - Prüfe systematisch JEDES Wort, ob es in den Satz- und Textzusammenhang passt – auch Wörter, die für sich genommen korrekt aussehen.
   - Prüfe jeden Satz als Ganzes auf Sinnhaftigkeit. Ergibt ein Satz offensichtlich keinen Sinn, identifiziere das einzelne Wort, das dafür verantwortlich ist, und ersetze es durch ein Wort, das im Kontext des Dokuments und des Satzes Sinn ergibt.
   - Wenn ein Wort aus dem Kontext fällt (inhaltlich nicht zu den übrigen Wörtern passt, den Satz sinnlos macht oder thematisch herausfällt): Behandle es als mögliches Verlesen (Lesefehler bei der Entzifferung). Überlege, welches Wort an dieser Stelle am wahrscheinlichsten gemeint war (z. B. durch typische Buchstabenverwechslungen: n↔u, e↔n, a↔o, s↔f, d↔cl, Haus↔Hans, und↔nur, aus↔ans, ähnliche Form in Kurrent/Sütterlin) und ersetze es durch dieses wahrscheinlichste Wort.
   - Ersetze alle [...] und [?] durch sinngemäße Ergänzungen.
   - Korrigiere falsche Wortgrenzen (zusammengeschriebene oder falsch getrennte Wörter).
   - Bewahre den Sprachstil und Ton der Epoche – NICHT ins moderne Deutsch umschreiben.
   - WICHTIG: Übernimm den VOLLSTÄNDIGEN Text aus der Transkription – lasse KEINE Textteile weg (z. B. Anschriften, Adressen, Absender, Grußformeln, Unterschriften, Randbemerkungen). Jeder Textteil, der in der originaltreuen Transkription steht, muss auch hier enthalten sein.
   - Erfinde keine neuen Inhalte – korrigiere nur Lesefehler, kontextfremde Verlesungen und schreibe Abkürzungen aus.
   - Keine Anmerkungen oder Metadaten – nur den korrigierten Text.

4. QUALITÄTSBEWERTUNG in <quality>...</quality>:
   - Antworte NUR mit einem JSON-Objekt (kein anderer Text in diesem Block):
   {"readability": <1-5>, "confidence": <0-100>, "issues": ["Liste konkreter Probleme"], "recommendation": "Kurze Einschätzung der Ergebnisqualität", "contentSummary": "Ein kurzer Satz, der den Inhalt des Dokuments beschreibt (z.B. 'Ein Brief von 1863 aus St. Genevieve an einen Verwandten namens August')", "level": "green" oder "yellow" oder "red", "optimizationTips": ["Tipps zur Bildoptimierung"]}

   WICHTIG zur Qualitätsbewertung:
   - Sei OPTIMISTISCH. Du bist ein leistungsfähiges KI-System, das auch schwierige Handschriften gut transkribieren kann.
   - Vergib "level": "green" großzügig – auch bei leichten bis mittleren Qualitätsproblemen.
   - Vergib "level": "yellow" nur bei deutlich erschwerter Lesbarkeit.
   - Vergib "level": "red" NUR in echten Extremfällen (fast vollständig unleserlich, massiv beschädigt).
   - Die "confidence" sollte in der Regel bei 60–95 liegen. Unter 40 nur bei wirklich kaum lesbaren Dokumenten.
   - Die "readability" sollte häufig 3–5 sein. 1–2 nur bei massiven Problemen.
   - Empfehle einen menschlichen Experten NUR wenn das Dokument wirklich kaum zu entziffern ist.

   OPTIMIERUNGSTIPPS (Feld "optimizationTips"):
   - Prüfe ob die Bildqualität des Uploads das Ergebnis einschränkt: z.B. Bild gedreht, unscharf, schlecht beleuchtet, Text teilweise abgeschnitten, Finger verdecken Text, Papier stark gewellt.
   - Beschreibe erkannte Bildprobleme ehrlich und konkret, aber freundlich (z.B. "Das Bild scheint gedreht zu sein", "Teile des Textes sind unscharf").
   - Nenne keine konkreten Lösungsschritte (z.B. NICHT "drehen Sie um 90° nach rechts") – nur das Problem beschreiben. Der Nutzer weiß selbst am besten, wie er es beheben kann.
   - Maximal 3 Tipps, nur bei echten Problemen. Bei guter Bildqualität: leeres Array [].`;
}

// ─── Gemini combined transcription ───────────────────────────────────────────

async function transcribeCompleteGemini(
  contentBlock: any,
  scriptType: string,
  label: string,
  model: string,
): Promise<TranscriptionResult> {
  const { GoogleGenAI } = await import("@google/genai");
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY nicht gesetzt");
  const ai = new GoogleGenAI({ apiKey });

  const baseSystem = systemPrompts[scriptType as DocumentType] ?? systemPrompts["auto"];
  const system = baseSystem + combinedSystemSuffix;
  const task = buildCombinedTask(scriptType);

  const parts: Array<Record<string, unknown>> = [];
  parts.push({
    inlineData: {
      mimeType: contentBlock.source.media_type,
      data: contentBlock.source.data,
    },
  });
  parts.push({ text: task });

  const response = await ai.models.generateContent({
    model,
    contents: [{ role: "user", parts }],
    config: {
      systemInstruction: system,
      maxOutputTokens: MAX_TOKENS_COMBINED,
    },
  });

  const inputTokens = response.usageMetadata?.promptTokenCount ?? 0;
  const outputTokens = response.usageMetadata?.candidatesTokenCount ?? 0;
  console.log(`[Gemini API] ${label}:`);
  console.log(`  Model:           ${model}`);
  console.log(`  Input tokens:    ${inputTokens}`);
  console.log(`  Output tokens:   ${outputTokens}`);

  const raw = response.text ?? "";

  const transcriptionRaw = extractXmlTag(raw, "transcription");
  const completedRaw = extractXmlTag(raw, "completed");
  const interpretedRaw = extractXmlTag(raw, "interpreted");
  const qualityRaw = extractXmlTag(raw, "quality");

  const transcription = cleanTranscriptionText(transcriptionRaw ?? raw);
  const transcriptionCompleted = completedRaw ? cleanTranscriptionText(completedRaw) : undefined;
  const transcriptionInterpreted = interpretedRaw ? cleanTranscriptionText(interpretedRaw) : undefined;

  let quality: TranscriptionResult["quality"];
  if (qualityRaw) {
    try {
      const jsonMatch = qualityRaw.match(/\{[\s\S]*\}/);
      if (jsonMatch) quality = JSON.parse(jsonMatch[0]);
    } catch (err) {
      console.error(`[Transcription] ${label}: failed to parse quality JSON:`, err);
    }
  }

  return {
    transcription,
    transcriptionCompleted,
    transcriptionInterpreted,
    quality,
    inputTokens,
    outputTokens,
  };
}

function extractXmlTag(text: string, tag: string): string | undefined {
  const regex = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`);
  const match = text.match(regex);
  return match ? match[1].trim() : undefined;
}

async function transcribeCompleteWithProvider(
  contentBlock: any,
  scriptType: string,
  label: string,
  provider: ProductionProvider,
  model: string,
): Promise<TranscriptionResult> {
  if (provider === "google") {
    return transcribeCompleteGemini(contentBlock, scriptType, label, model);
  }

  const baseSystem = systemPrompts[scriptType as DocumentType] ?? systemPrompts["auto"];
  const system = baseSystem + combinedSystemSuffix;
  const task = buildCombinedTask(scriptType);

  const message = await anthropic.messages.create({
    model: model || DEFAULT_MODEL_PRIMARY,
    max_tokens: MAX_TOKENS_COMBINED,
    thinking: {
      type: "enabled",
      budget_tokens: THINKING_BUDGET_PRIMARY,
    },
    system,
    messages: [
      {
        role: "user",
        content: [
          contentBlock,
          { type: "text", text: task },
        ],
      },
    ],
  } as any);

  logApiResponse(label, message);
  const tokens = extractTokenUsage(message);

  const textBlock = message.content.find((b: any) => b.type === "text");
  const raw = textBlock?.type === "text" ? (textBlock as any).text : "";

  const transcriptionRaw = extractXmlTag(raw, "transcription");
  const completedRaw = extractXmlTag(raw, "completed");
  const interpretedRaw = extractXmlTag(raw, "interpreted");
  const qualityRaw = extractXmlTag(raw, "quality");

  const transcription = cleanTranscriptionText(transcriptionRaw ?? raw);
  const transcriptionCompleted = completedRaw ? cleanTranscriptionText(completedRaw) : undefined;
  const transcriptionInterpreted = interpretedRaw ? cleanTranscriptionText(interpretedRaw) : undefined;

  let quality: TranscriptionResult["quality"];
  if (qualityRaw) {
    try {
      const jsonMatch = qualityRaw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        quality = JSON.parse(jsonMatch[0]);
      }
    } catch (err) {
      console.error(`[Transcription] ${label}: failed to parse quality JSON:`, err);
    }
  }

  if (!transcriptionRaw) {
    console.warn(`[Transcription] ${label}: no <transcription> tag found, using raw output as fallback`);
  }
  if (transcriptionCompleted) {
    console.log(`[Transcription] ${label}: completed version included`);
  }
  if (transcriptionInterpreted) {
    console.log(`[Transcription] ${label}: interpreted version included`);
  }
  if (quality) {
    console.log(`[Transcription] ${label}: quality assessment included (readability=${quality.readability}, confidence=${quality.confidence}, level=${quality.level})`);
  }

  return {
    transcription,
    transcriptionCompleted,
    transcriptionInterpreted,
    quality,
    inputTokens: tokens.inputTokens,
    outputTokens: tokens.outputTokens,
  };
}

async function transcribeComplete(
  contentBlock: any,
  scriptType: string,
  label: string,
): Promise<TranscriptionResult> {
  const prodConfig = await getProductionConfig();

  try {
    const result = await transcribeCompleteWithProvider(contentBlock, scriptType, label, prodConfig.provider, prodConfig.model);

    if (!result.transcription || result.outputTokens === 0) {
      const fallback = await getFallbackConfig();
      if (fallback.enabled) {
        console.warn(
          `[Transcription] ${label}: Primärmodell ${prodConfig.provider}/${prodConfig.model} gab leere Antwort (0 Tokens) ` +
          `→ Fallback auf ${fallback.provider}/${fallback.model}`
        );
        return transcribeCompleteWithProvider(contentBlock, scriptType, `${label} [FALLBACK]`, fallback.provider, fallback.model);
      }
      console.warn(`[Transcription] ${label}: Leere Antwort von ${prodConfig.provider}/${prodConfig.model}, kein Fallback konfiguriert`);
    }

    return result;
  } catch (err) {
    if (!isOverloadError(err)) throw err;

    const fallback = await getFallbackConfig();
    if (!fallback.enabled) {
      console.error(`[Transcription] ${label}: API überlastet, kein Fallback konfiguriert – Fehler wird weitergeleitet`);
      throw err;
    }

    console.warn(
      `[Transcription] ${label}: Primärmodell ${prodConfig.provider}/${prodConfig.model} überlastet ` +
      `→ Fallback auf ${fallback.provider}/${fallback.model}`
    );

    return transcribeCompleteWithProvider(contentBlock, scriptType, `${label} [FALLBACK]`, fallback.provider, fallback.model);
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

/** Transcribe a single image (JPG, PNG, WebP, GIF) – single API call for all outputs */
export async function transcribePage(
  imageBase64: string,
  scriptType: string,
  _includeQuality: boolean = false,
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif" = "image/jpeg"
): Promise<TranscriptionResult> {
  const contentBlock = {
    type: "image" as const,
    source: {
      type: "base64" as const,
      media_type: mediaType,
      data: imageBase64,
    },
  };

  return transcribeComplete(contentBlock, scriptType, `Image transcription (${scriptType})`);
}

/** Transcribe a PDF document natively – single API call for all outputs */
export async function transcribePdf(
  pdfBase64: string,
  scriptType: string,
  _includeQuality: boolean = false,
): Promise<TranscriptionResult> {
  const contentBlock = {
    type: "document" as const,
    source: {
      type: "base64" as const,
      media_type: "application/pdf" as const,
      data: pdfBase64,
    },
  };

  return transcribeComplete(contentBlock, scriptType, `PDF transcription (${scriptType})`);
}
