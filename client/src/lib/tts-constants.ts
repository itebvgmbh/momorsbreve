import { type Localized } from "@/i18n/localized";

export const TTS_VOICES = [
  { name: "Kore", gender: "Weiblich" },
  { name: "Aoede", gender: "Weiblich" },
  { name: "Leda", gender: "Weiblich" },
  { name: "Callirrhoe", gender: "Weiblich" },
  { name: "Despina", gender: "Weiblich" },
  { name: "Pulcherrima", gender: "Weiblich" },
  { name: "Sulafat", gender: "Weiblich" },
  { name: "Vindemiatrix", gender: "Weiblich" },
  { name: "Zephyr", gender: "Weiblich" },
  { name: "Achernar", gender: "Weiblich" },
  { name: "Autonoe", gender: "Weiblich" },
  { name: "Erinome", gender: "Weiblich" },
  { name: "Gacrux", gender: "Weiblich" },
  { name: "Laomedeia", gender: "Weiblich" },
  { name: "Puck", gender: "Männlich" },
  { name: "Charon", gender: "Männlich" },
  { name: "Fenrir", gender: "Männlich" },
  { name: "Orus", gender: "Männlich" },
  { name: "Achird", gender: "Männlich" },
  { name: "Algenib", gender: "Männlich" },
  { name: "Algieba", gender: "Männlich" },
  { name: "Alnilam", gender: "Männlich" },
  { name: "Enceladus", gender: "Männlich" },
  { name: "Iapetus", gender: "Männlich" },
  { name: "Rasalgethi", gender: "Männlich" },
  { name: "Sadachbia", gender: "Männlich" },
  { name: "Sadaltager", gender: "Männlich" },
  { name: "Schedar", gender: "Männlich" },
  { name: "Umbriel", gender: "Männlich" },
  { name: "Zubenelgenubi", gender: "Männlich" },
] as const;

export const TTS_STYLE_PRESETS: { label: Localized; value: string }[] = [
  { label: { da: "Varm & rolig", de: "Warm & ruhig", en: "Warm & calm" }, value: "Læs roligt og varmt op, som en kærlig mormor der deler sine minder." },
  { label: { da: "Sagligt", de: "Sachlich", en: "Matter-of-fact" }, value: "Læs sagligt og klart op, som en nyhedsoplæser." },
  { label: { da: "Følelsesfuldt", de: "Gefühlvoll", en: "Emotional" }, value: "Læs levende og følelsesfuldt op, som var du den person, der skrev det." },
  { label: { da: "Langsomt & tydeligt", de: "Langsam & deutlich", en: "Slow & clear" }, value: "Læs meget langsomt og tydeligt op, med klar betoning af hver sætning." },
  { label: { da: "Lydbog", de: "Hörbuch", en: "Audiobook" }, value: "Læs op som en professionel lydbogsoplæser, med en behagelig fortællestemme." },
];

// ---------------------------------------------------------------------------
// Curated characters & styles for the new streamlined TTS UI
// ---------------------------------------------------------------------------

export type Gender = "Weiblich" | "Männlich";

export interface TtsCharacter {
  voice: string;
  gender: Gender;
  label: string;
  description: Localized;
}

export interface TtsCharacterStyle {
  id: string;
  label: Localized;
  prompt: string;
}

export const TTS_CHARACTERS: TtsCharacter[] = [
  { voice: "Autonoe",   gender: "Weiblich",  label: "Autonoe",   description: { de: "Sanft & einfühlsam",  da: "Blid & indfølende",  en: "Gentle & empathetic" } },
  { voice: "Despina",   gender: "Weiblich",  label: "Despina",   description: { de: "Lebendig & frisch",   da: "Levende & frisk",    en: "Lively & fresh" } },
  { voice: "Achernar",  gender: "Weiblich",  label: "Achernar",  description: { de: "Ruhig & besonnen",    da: "Rolig & sindig",     en: "Calm & composed" } },
  { voice: "Enceladus", gender: "Männlich",  label: "Enceladus", description: { de: "Warm & väterlich",    da: "Varm & faderlig",    en: "Warm & fatherly" } },
  { voice: "Umbriel",   gender: "Männlich",  label: "Umbriel",   description: { de: "Tief & gelassen",     da: "Dyb & afslappet",    en: "Deep & relaxed" } },
  { voice: "Algieba",   gender: "Männlich",  label: "Algieba",   description: { de: "Kraftvoll & klar",    da: "Kraftfuld & klar",   en: "Powerful & clear" } },
];

export const TTS_CHARACTER_STYLES: TtsCharacterStyle[] = [
  { id: "warm",       label: { da: "Varm & rolig",        de: "Warm & ruhig",          en: "Warm & calm" },     prompt: "Læs roligt og varmt op, som en kærlig mormor der deler sine minder." },
  { id: "hoerbuch",   label: { da: "Lydbog",              de: "Hörbuch",               en: "Audiobook" },       prompt: "Læs op som en professionel lydbogsoplæser, med en behagelig fortællestemme." },
  { id: "langsam",    label: { da: "Langsomt & tydeligt", de: "Langsam & deutlich",    en: "Slow & clear" },    prompt: "Læs meget langsomt og tydeligt op, med klar betoning af hver sætning." },
  { id: "emotional",  label: { da: "Følelsesfuldt",       de: "Gefühlvoll",            en: "Emotional" },       prompt: "Læs levende og følelsesfuldt op, som var du den person, der skrev det." },
];

export const TTS_PREVIEW_SNIPPET: Localized = {
  da: "I morges sagde lille Karl »mormor« for første gang. Mit hjerte var så fyldt af glæde, at tårerne kom. Efter morgenmaden gik vi sammen ud i haven. Roserne blomstrer i år, så smukt som længe ikke set. Karl opdagede en sommerfugl og løb efter den gennem hele bedet. Hvor han dog lo! Det er sådanne øjeblikke, der gør livet så dyrebart. Jeg vil holde fast i dem alle, før erindringen falmer.",
  de: "Heute Morgen sagte der kleine Karl zum ersten Mal »Oma«. Mein Herz war so voller Freude, dass mir die Tränen kamen. Nach dem Frühstück gingen wir zusammen hinaus in den Garten. Die Rosen blühen dieses Jahr so schön wie lange nicht mehr. Karl entdeckte einen Schmetterling und lief ihm durch das ganze Beet hinterher. Wie er da lachte! Es sind solche Augenblicke, die das Leben so kostbar machen. Ich will sie alle festhalten, bevor die Erinnerung verblasst.",
  en: "This morning little Karl said »grandma« for the very first time. My heart was so full of joy that the tears came. After breakfast we went out into the garden together. The roses are blooming this year, more beautifully than they have in a long time. Karl spotted a butterfly and ran after it across the whole flower bed. How he laughed! It is moments like these that make life so precious. I want to hold on to them all, before the memory fades.",
};

export function previewAudioUrl(voice: string, styleId: string): string {
  return `/audio/previews/${voice.toLowerCase()}-${styleId}.mp3`;
}

export function ttsCreditsForText(text: string): number {
  const len = (text || "").trim().length;
  return len === 0 ? 0 : Math.max(1, Math.ceil(len / 1000));
}
