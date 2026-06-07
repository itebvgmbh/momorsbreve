/**
 * Gemini transcription provider for evaluation / A/B testing.
 * Mirrors the interface of callTranscriptionWithConfig from transcription.ts
 * so it can be used as a drop-in alternative in the evaluation engine.
 */
import { GoogleGenAI } from "@google/genai";
import type { DocumentType } from "@shared/models/transcription";
import type { TranscriptionConfig } from "./transcription";

// Re-use the same prompt maps from the Anthropic module.
// We import them indirectly by duplicating the reference here so the Gemini
// module stays self-contained (the prompts are identical for both providers).
import {
  getSystemPrompt,
  getTaskPrompt,
  getNoAnnotationsRule,
} from "./transcription-prompts";

// ─── SDK initialisation ─────────────────────────────────────────────────────

function getClient(): GoogleGenAI {
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Google API-Key fehlt. Bitte GOOGLE_API_KEY oder GEMINI_API_KEY als Umgebungsvariable setzen."
    );
  }
  return new GoogleGenAI({ apiKey });
}

const DEFAULT_MODEL = "gemini-2.5-flash";

// ─── Logging helper ─────────────────────────────────────────────────────────

function logGeminiResponse(
  label: string,
  model: string,
  usage: { inputTokens: number; outputTokens: number },
) {
  console.log(`[Gemini API] ${label}:`);
  console.log(`  Model:           ${model}`);
  console.log(`  Input tokens:    ${usage.inputTokens}`);
  console.log(`  Output tokens:   ${usage.outputTokens}`);
}

// ─── Content block conversion ───────────────────────────────────────────────

type AnthropicContentBlock =
  | {
      type: "image";
      source: { type: "base64"; media_type: string; data: string };
    }
  | {
      type: "document";
      source: { type: "base64"; media_type: string; data: string };
    };

function toGeminiParts(block: AnthropicContentBlock, taskText: string) {
  const parts: Array<Record<string, unknown>> = [];

  parts.push({
    inlineData: {
      mimeType: block.source.media_type,
      data: block.source.data,
    },
  });

  parts.push({ text: taskText });

  return parts;
}

// ─── Public: call Gemini for transcription ──────────────────────────────────

export async function callGeminiTranscription(
  contentBlock: AnthropicContentBlock,
  scriptType: string,
  label: string,
  config: TranscriptionConfig = {},
): Promise<{ text: string; message: { usage?: { input_tokens: number; output_tokens: number } } }> {
  const ai = getClient();

  const system =
    config.systemPrompt ?? getSystemPrompt(scriptType as DocumentType);
  const taskBase =
    config.taskPrompt ?? getTaskPrompt(scriptType as DocumentType);
  const task = taskBase + getNoAnnotationsRule();

  const model = config.model ?? DEFAULT_MODEL;
  const maxTokens = config.maxTokens ?? 16384;

  const generationConfig: Record<string, unknown> = {
    maxOutputTokens: maxTokens,
  };

  if (config.thinkingBudget != null && config.thinkingBudget > 0) {
    generationConfig.thinkingConfig = {
      thinkingBudget: config.thinkingBudget,
    };
  }

  const parts = toGeminiParts(contentBlock, task);

  const response = await ai.models.generateContent({
    model,
    contents: [{ role: "user", parts }],
    config: {
      systemInstruction: system,
      ...generationConfig,
    },
  });

  const inputTokens = response.usageMetadata?.promptTokenCount ?? 0;
  const outputTokens = response.usageMetadata?.candidatesTokenCount ?? 0;

  logGeminiResponse(label, model, { inputTokens, outputTokens });

  const text = response.text ?? "";

  return {
    text,
    message: {
      usage: {
        input_tokens: inputTokens,
        output_tokens: outputTokens,
      },
    },
  };
}
