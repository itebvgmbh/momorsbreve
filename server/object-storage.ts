// Abstraktion über Replit Object Storage (@replit/object-storage).
//
// Ziel: Datei-Bytes (Bilder/PDFs) liegen NICHT mehr als Base64 in der SQL-DB,
// sondern in Replit Object Storage. Die DB speichert nur noch den Storage-Key.
//
// WICHTIG — graceful Fallback: Wenn kein Bucket konfiguriert ist (z. B. lokale
// Entwicklung unter Windows oder ein Repl ohne provisioniertes Object Storage),
// ist Object Storage DEAKTIVIERT und der bisherige Base64-in-DB-Pfad bleibt
// unverändert aktiv. So bricht nichts, solange der Inhaber den Bucket noch nicht
// angelegt hat.
//
// Aktivierung (eine der Bedingungen genügt):
//   - ENV `OBJECT_STORAGE_BUCKET_ID` gesetzt  → wird als bucketId an den Client gereicht
//   - `.replit` enthält `defaultBucketID`     → Replit hat einen Bucket attached, SDK findet ihn selbst
//   - ENV `OBJECT_STORAGE_ENABLED=true`       → erzwingt Aktivierung (Default-Bucket-Discovery)
// Erzwungenes Abschalten: ENV `OBJECT_STORAGE_ENABLED=false`.

import fs from "fs";
import path from "path";
import { Client } from "@replit/object-storage";

const STORAGE_PREFIX = "uploads/";

function readReplitDefaultBucketId(): string | null {
  try {
    const replitPath = path.join(process.cwd(), ".replit");
    if (!fs.existsSync(replitPath)) return null;
    const content = fs.readFileSync(replitPath, "utf8");
    // [objectStorage]\n defaultBucketID = "replit-objstore-..."
    const match = content.match(/defaultBucketID\s*=\s*["']([^"']+)["']/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

let cachedEnabled: boolean | null = null;
let cachedClient: Client | null = null;
let cachedBucketId: string | undefined;

/** True, wenn Object Storage konfiguriert ist und genutzt werden soll. */
export function isObjectStorageEnabled(): boolean {
  if (cachedEnabled !== null) return cachedEnabled;

  const forced = (process.env.OBJECT_STORAGE_ENABLED || "").toLowerCase();
  if (forced === "false" || forced === "0") {
    cachedEnabled = false;
    return cachedEnabled;
  }

  const envBucket = process.env.OBJECT_STORAGE_BUCKET_ID?.trim();
  const replitBucket = readReplitDefaultBucketId();

  if (envBucket) {
    cachedBucketId = envBucket;
    cachedEnabled = true;
  } else if (replitBucket || forced === "true" || forced === "1") {
    // Bucket wird vom SDK über .replit / Replit-Sidecar gefunden.
    cachedBucketId = undefined;
    cachedEnabled = true;
  } else {
    cachedEnabled = false;
  }

  if (cachedEnabled) {
    console.log(
      `[ObjectStorage] aktiviert${cachedBucketId ? ` (bucket=${cachedBucketId})` : " (default bucket)"}`,
    );
  } else {
    console.log("[ObjectStorage] deaktiviert – Fallback auf Base64-in-DB");
  }
  return cachedEnabled;
}

function getClient(): Client {
  if (!cachedClient) {
    cachedClient = cachedBucketId
      ? new Client({ bucketId: cachedBucketId })
      : new Client();
  }
  return cachedClient;
}

/** Aus einer imageUrl wie "/uploads/foo.jpg" den Object-Storage-Key "uploads/foo.jpg" ableiten. */
export function storageKeyForImageUrl(imageUrl: string): string {
  return STORAGE_PREFIX + path.basename(imageUrl);
}

/**
 * Lädt einen Buffer in Object Storage. Wirft bei Fehler (damit der Aufrufer
 * sauber aufräumen kann). Nur aufrufen, wenn isObjectStorageEnabled() true ist.
 */
export async function putObject(key: string, buffer: Buffer): Promise<void> {
  const res = await getClient().uploadFromBytes(key, buffer);
  if (!res.ok) {
    throw new Error(
      `[ObjectStorage] Upload fehlgeschlagen (${key}): ${String(res.error?.message ?? res.error)}`,
    );
  }
}

/**
 * Holt einen Buffer aus Object Storage. Gibt null zurück, wenn das Objekt nicht
 * existiert oder Object Storage nicht aktiv ist (best-effort beim Lesen).
 */
export async function getObject(key: string): Promise<Buffer | null> {
  if (!isObjectStorageEnabled()) return null;
  try {
    const res = await getClient().downloadAsBytes(key);
    if (!res.ok) return null;
    // downloadAsBytes liefert Result<[Buffer]> – Tuple mit genau einem Buffer.
    const value = res.value as unknown;
    if (Array.isArray(value)) return (value[0] as Buffer) ?? null;
    return (value as Buffer) ?? null;
  } catch (err) {
    console.error(`[ObjectStorage] Download-Fehler (${key}):`, err);
    return null;
  }
}

/** Löscht ein Objekt (best-effort, wirft nicht). */
export async function deleteObject(key: string): Promise<void> {
  if (!isObjectStorageEnabled()) return;
  try {
    await getClient().delete(key);
  } catch (err) {
    console.error(`[ObjectStorage] Delete-Fehler (${key}):`, err);
  }
}
