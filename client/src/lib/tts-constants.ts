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

export const TTS_STYLE_PRESETS: { label: string; value: string }[] = [
  { label: "Varm & rolig", value: "Læs roligt og varmt op, som en kærlig mormor der deler sine minder." },
  { label: "Sagligt", value: "Læs sagligt og klart op, som en nyhedsoplæser." },
  { label: "Følelsesfuldt", value: "Læs levende og følelsesfuldt op, som var du den person, der skrev det." },
  { label: "Langsomt & tydeligt", value: "Læs meget langsomt og tydeligt op, med klar betoning af hver sætning." },
  { label: "Lydbog", value: "Læs op som en professionel lydbogsoplæser, med en behagelig fortællestemme." },
];

// ---------------------------------------------------------------------------
// Curated characters & styles for the new streamlined TTS UI
// ---------------------------------------------------------------------------

export type Gender = "Weiblich" | "Männlich";

export interface TtsCharacter {
  voice: string;
  gender: Gender;
  label: string;
  description: string;
}

export interface TtsCharacterStyle {
  id: string;
  label: string;
  prompt: string;
}

export const TTS_CHARACTERS: TtsCharacter[] = [
  { voice: "Autonoe",   gender: "Weiblich",  label: "Autonoe",   description: "Sanft & einfühlsam" },
  { voice: "Despina",   gender: "Weiblich",  label: "Despina",   description: "Lebendig & frisch" },
  { voice: "Achernar",  gender: "Weiblich",  label: "Achernar",  description: "Ruhig & besonnen" },
  { voice: "Enceladus", gender: "Männlich",  label: "Enceladus", description: "Warm & väterlich" },
  { voice: "Umbriel",   gender: "Männlich",  label: "Umbriel",   description: "Tief & gelassen" },
  { voice: "Algieba",   gender: "Männlich",  label: "Algieba",   description: "Kraftvoll & klar" },
];

export const TTS_CHARACTER_STYLES: TtsCharacterStyle[] = [
  { id: "warm",       label: "Varm & rolig",         prompt: "Læs roligt og varmt op, som en kærlig mormor der deler sine minder." },
  { id: "hoerbuch",   label: "Lydbog",               prompt: "Læs op som en professionel lydbogsoplæser, med en behagelig fortællestemme." },
  { id: "langsam",    label: "Langsomt & tydeligt",  prompt: "Læs meget langsomt og tydeligt op, med klar betoning af hver sætning." },
  { id: "emotional",  label: "Følelsesfuldt",        prompt: "Læs levende og følelsesfuldt op, som var du den person, der skrev det." },
];

export const TTS_PREVIEW_SNIPPET =
  "I morges sagde lille Karl »mormor« for første gang. Mit hjerte var så fyldt af glæde, at tårerne kom. Efter morgenmaden gik vi sammen ud i haven. Roserne blomstrer i år, så smukt som længe ikke set. Karl opdagede en sommerfugl og løb efter den gennem hele bedet. Hvor han dog lo! Det er sådanne øjeblikke, der gør livet så dyrebart. Jeg vil holde fast i dem alle, før erindringen falmer.";

export function previewAudioUrl(voice: string, styleId: string): string {
  return `/audio/previews/${voice.toLowerCase()}-${styleId}.mp3`;
}

export function ttsCreditsForText(text: string): number {
  const len = (text || "").trim().length;
  return len === 0 ? 0 : Math.max(1, Math.ceil(len / 1000));
}
