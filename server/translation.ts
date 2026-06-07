import Anthropic from "@anthropic-ai/sdk";
import { getTranslationLanguageLabel } from "@shared/models/transcription";
import { getProductionConfig, getFallbackConfig, type ProductionProvider } from "./transcription";

export interface TranslationInput {
  original: string;
  completed?: string | null;
  interpreted?: string | null;
}

export interface TranslationResult {
  translation: string;
  translationCompleted?: string;
  translationInterpreted?: string;
  inputTokens: number;
  outputTokens: number;
}

function buildTranslationPrompt(texts: TranslationInput, targetLanguage: string): string {
  const langLabel =
    targetLanguage === "da"
      ? "moderne dansk"
      : getTranslationLanguageLabel(targetLanguage);
  const parts: string[] = [];

  parts.push(`Oversæt følgende versioner af en transskriberet historisk dansk tekst til ${langLabel}.
Bevar afsnitsstruktur og linjeskift.
Gengiv KUN oversættelserne, uden forklaringer eller bemærkninger.
Svar i samme XML-format.`);

  parts.push(`\n<original>\n${texts.original}\n</original>`);

  if (texts.completed) {
    parts.push(`\n<completed>\n${texts.completed}\n</completed>`);
  }
  if (texts.interpreted) {
    parts.push(`\n<interpreted>\n${texts.interpreted}\n</interpreted>`);
  }

  return parts.join("\n");
}

function extractXmlTag(text: string, tag: string): string | undefined {
  const regex = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`);
  const match = text.match(regex);
  return match ? match[1].trim() : undefined;
}

function parseTranslationResponse(raw: string): Omit<TranslationResult, "inputTokens" | "outputTokens"> {
  const translationRaw = extractXmlTag(raw, "original");
  const completedRaw = extractXmlTag(raw, "completed");
  const interpretedRaw = extractXmlTag(raw, "interpreted");

  return {
    translation: translationRaw ?? raw.trim(),
    translationCompleted: completedRaw || undefined,
    translationInterpreted: interpretedRaw || undefined,
  };
}

async function translateWithGoogle(
  prompt: string,
  model: string,
): Promise<TranslationResult> {
  const { GoogleGenAI } = await import("@google/genai");
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_API_KEY / GEMINI_API_KEY nicht gesetzt");

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: { maxOutputTokens: 16384 },
  });

  const inputTokens = response.usageMetadata?.promptTokenCount ?? 0;
  const outputTokens = response.usageMetadata?.candidatesTokenCount ?? 0;
  const raw = response.text ?? "";

  return { ...parseTranslationResponse(raw), inputTokens, outputTokens };
}

async function translateWithAnthropic(
  prompt: string,
  model: string,
): Promise<TranslationResult> {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    timeout: 3 * 60 * 1000,
    maxRetries: 0,
  });

  const response = await anthropic.messages.create({
    model,
    max_tokens: 16384,
    messages: [{ role: "user", content: prompt }],
  });

  const inputTokens = response.usage?.input_tokens ?? 0;
  const outputTokens = response.usage?.output_tokens ?? 0;
  const raw = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  return { ...parseTranslationResponse(raw), inputTokens, outputTokens };
}

async function callProvider(
  provider: ProductionProvider,
  model: string,
  prompt: string,
): Promise<TranslationResult> {
  if (provider === "google") {
    return translateWithGoogle(prompt, model);
  }
  return translateWithAnthropic(prompt, model);
}

export async function translatePage(
  texts: TranslationInput,
  targetLanguage: string,
): Promise<TranslationResult> {
  const prompt = buildTranslationPrompt(texts, targetLanguage);
  const prodConfig = await getProductionConfig();
  const fallbackConfig = await getFallbackConfig();

  let result: TranslationResult;
  let usedProvider: string;

  try {
    result = await callProvider(prodConfig.provider, prodConfig.model, prompt);
    usedProvider = `${prodConfig.provider}/${prodConfig.model}`;
  } catch (primaryErr: any) {
    if (!fallbackConfig.enabled) throw primaryErr;

    console.warn(
      `[Translation] Primary (${prodConfig.provider}/${prodConfig.model}) failed: ${primaryErr?.message || primaryErr}` +
      ` – trying fallback (${fallbackConfig.provider}/${fallbackConfig.model})`,
    );
    result = await callProvider(fallbackConfig.provider, fallbackConfig.model, prompt);
    usedProvider = `${fallbackConfig.provider}/${fallbackConfig.model} (fallback)`;
  }

  console.log(`[Translation] ${targetLanguage}:`);
  console.log(`  Provider:        ${usedProvider}`);
  console.log(`  Input tokens:    ${result.inputTokens}`);
  console.log(`  Output tokens:   ${result.outputTokens}`);
  console.log(`  Has translation: ${!!result.translation}`);

  if (!result.translation) {
    throw new Error(`Übersetzung leer – Provider: ${usedProvider}`);
  }

  return result;
}
