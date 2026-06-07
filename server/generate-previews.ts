/**
 * One-time script to generate TTS preview audio snippets for all
 * character + style combinations (6 voices x 4 styles = 24 files).
 *
 * Usage:  npx tsx server/generate-previews.ts
 *
 * Requires GEMINI_API_KEY or GOOGLE_API_KEY in the environment.
 * Outputs MP3 files to public/audio/previews/
 */

import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { generateSpeech } from "./tts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CHARACTERS = [
  { voice: "Autonoe" },
  { voice: "Despina" },
  { voice: "Achernar" },
  { voice: "Enceladus" },
  { voice: "Umbriel" },
  { voice: "Algieba" },
];

const STYLES = [
  { id: "warm",      prompt: "Lies ruhig und warm vor, wie eine liebevolle Großmutter die Erinnerungen teilt." },
  { id: "hoerbuch",  prompt: "Lies vor wie ein professioneller Hörbuchsprecher, mit angenehmer Erzählstimme." },
  { id: "langsam",   prompt: "Lies sehr langsam und deutlich, mit klarer Betonung jedes Satzes." },
  { id: "emotional", prompt: "Lies lebendig und emotional, als wärst du die Person, die das geschrieben hat." },
];

const SNIPPET_TEXT =
  "Heute Morgen hat der kleine Karl zum ersten Mal Oma gesagt. Mein Herz war so voll vor Freude, dass mir die Tränen kamen. Nach dem Frühstück sind wir zusammen in den Garten gegangen. Die Rosen blühen dieses Jahr so schön wie lange nicht. Karl hat einen Schmetterling entdeckt und ist ihm durch das ganze Beet hinterhergelaufen. Wie er dabei gelacht hat! Solche Augenblicke sind es, die das Leben so kostbar machen. Ich will sie alle festhalten, bevor die Erinnerung verblasst.";

const OUT_DIR = path.resolve(__dirname, "../client/public/audio/previews");

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const total = CHARACTERS.length * STYLES.length;
  let done = 0;
  let failed = 0;

  for (const char of CHARACTERS) {
    for (const style of STYLES) {
      const filename = `${char.voice.toLowerCase()}-${style.id}.mp3`;
      const outPath = path.join(OUT_DIR, filename);

      if (fs.existsSync(outPath)) {
        console.log(`⏭  ${filename} already exists, skipping`);
        done++;
        continue;
      }

      try {
        console.log(`🎙  Generating ${filename} (${done + 1}/${total})...`);
        const result = await generateSpeech({
          text: SNIPPET_TEXT,
          voice: char.voice,
          style: style.prompt,
        });
        fs.writeFileSync(outPath, result.audioBuffer);
        const sizeKB = Math.round(result.audioBuffer.length / 1024);
        console.log(`   ✅ ${filename} (${sizeKB} KB)`);
      } catch (err: any) {
        console.error(`   ❌ ${filename}: ${err.message}`);
        failed++;
      }

      done++;
      // Small delay between requests to avoid rate limits
      if (done < total) {
        await new Promise((r) => setTimeout(r, 1500));
      }
    }
  }

  console.log(`\nDone: ${done - failed}/${total} generated, ${failed} failed.`);
  if (failed > 0) {
    console.log("Re-run the script to retry failed files (existing ones are skipped).");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
