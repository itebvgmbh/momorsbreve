import "dotenv/config";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "../server/db";
import { transcriptionPages } from "../shared/models/transcription";
import { isObjectStorageEnabled, getObject } from "../server/object-storage";

// Prüft, ob neue Uploads korrekt in Object Storage statt als Base64 in der DB
// landen. Aufruf:
//   tsx scripts/check-object-storage.ts            # letzte 10 Seiten
//   tsx scripts/check-object-storage.ts 8          # nur Seiten von Job 8
//   tsx scripts/check-object-storage.ts 8 25       # Job 8, max. 25 Seiten

async function main() {
  const jobIdArg = process.argv[2] ? Number(process.argv[2]) : null;
  const limit = process.argv[3] ? Number(process.argv[3]) : 10;

  console.log("─".repeat(72));
  console.log(
    `Object Storage: ${isObjectStorageEnabled() ? "AKTIV ✅" : "deaktiviert (Base64-Fallback)"}`,
  );
  console.log("─".repeat(72));

  const rows = await db
    .select({
      id: transcriptionPages.id,
      jobId: transcriptionPages.jobId,
      pageNumber: transcriptionPages.pageNumber,
      imageUrl: transcriptionPages.imageUrl,
      storageKey: transcriptionPages.storageKey,
      // Inhalt NICHT laden (kann riesig sein) – nur die Länge messen.
      imageDataLen: sql<number>`coalesce(length(${transcriptionPages.imageData}), 0)`,
      mime: transcriptionPages.imageMimeType,
    })
    .from(transcriptionPages)
    .where(jobIdArg ? eq(transcriptionPages.jobId, jobIdArg) : undefined)
    .orderBy(desc(transcriptionPages.id))
    .limit(limit);

  if (rows.length === 0) {
    console.log("Keine Seiten gefunden.");
    process.exit(0);
  }

  let inBucket = 0;
  let inBase64 = 0;

  for (const r of rows) {
    const loc = r.storageKey
      ? "Object Storage"
      : r.imageDataLen > 0
        ? "Base64-in-DB"
        : "—";
    if (r.storageKey) inBucket++;
    else if (r.imageDataLen > 0) inBase64++;

    let bucketCheck = "";
    if (r.storageKey) {
      // End-to-End: kann das Objekt tatsächlich aus dem Bucket gelesen werden?
      const buf = await getObject(r.storageKey);
      bucketCheck = buf
        ? `  → Bucket-Read OK (${buf.length} bytes)`
        : "  → ⚠️ Bucket-Read FEHLGESCHLAGEN (Objekt nicht gefunden)";
    }

    console.log(
      `page #${r.id} (job ${r.jobId}, S.${r.pageNumber}) [${r.mime ?? "?"}] ` +
        `${loc} | image_data=${r.imageDataLen}B | storage_key=${r.storageKey ?? "NULL"}${bucketCheck}`,
    );
  }

  console.log("─".repeat(72));
  console.log(
    `Zusammenfassung: ${inBucket} in Object Storage, ${inBase64} als Base64 in der DB (von ${rows.length} geprüften Seiten).`,
  );
  if (isObjectStorageEnabled() && inBucket > 0 && inBase64 === 0) {
    console.log("✅ Neue Uploads gehen in den Bucket, image_data bleibt leer.");
  }
  process.exit(0);
}

main().catch((err) => {
  console.error("Fehler beim Prüfen:", err);
  process.exit(1);
});
