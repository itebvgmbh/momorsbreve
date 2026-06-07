import type { TranscriptionPage } from "@shared/models/transcription";

export type TextVersion = "original" | "completed" | "interpreted";
export type DisplayLanguage = "de" | "translation";

type PageRecord = TranscriptionPage & Record<string, unknown>;

export function getPageInterpreted(page: PageRecord): string | null | undefined {
  return page.transcriptionInterpreted ?? (page.transcription_interpreted as string) ?? null;
}

export function getPageEdited(page: PageRecord, version: TextVersion, lang: DisplayLanguage = "de"): string | null | undefined {
  if (lang === "translation") {
    if (version === "original") return (page as any).translationEdited ?? (page as any).translation_edited ?? null;
    if (version === "completed") return (page as any).translationCompletedEdited ?? (page as any).translation_completed_edited ?? null;
    return (page as any).translationInterpretedEdited ?? (page as any).translation_interpreted_edited ?? null;
  }
  if (version === "original") return page.transcriptionEdited ?? (page.transcription_edited as string) ?? null;
  if (version === "completed") return page.transcriptionCompletedEdited ?? (page.transcription_completed_edited as string) ?? null;
  return page.transcriptionInterpretedEdited ?? (page.transcription_interpreted_edited as string) ?? null;
}

export function getPageDisplayText(page: PageRecord, version: TextVersion, lang: DisplayLanguage = "de"): string | null {
  const edited = getPageEdited(page, version, lang);
  if (edited != null && edited !== "") return edited;

  if (lang === "translation") {
    if (version === "interpreted") return (page as any).translationInterpreted || (page as any).translation_interpreted || (page as any).translationCompleted || (page as any).translation_completed || (page as any).translation || null;
    if (version === "completed") return (page as any).translationCompleted || (page as any).translation_completed || (page as any).translation || null;
    return (page as any).translation || null;
  }
  if (version === "interpreted") return getPageInterpreted(page) || page.transcriptionCompleted || page.transcription || null;
  if (version === "completed" && page.transcriptionCompleted) return page.transcriptionCompleted;
  return page.transcription ?? null;
}

export function getPageHasEdited(page: PageRecord, version: TextVersion, lang: DisplayLanguage = "de"): boolean {
  const v = getPageEdited(page, version, lang);
  return v != null && v !== "";
}
