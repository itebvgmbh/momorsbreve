-- Object-Storage-Migration: Datei-Bytes wandern von Base64-in-DB nach Replit
-- Object Storage. Die DB speichert künftig nur noch den Storage-Key.
-- Additiv & idempotent (nullable Spalten) – kein Datenverlust, bestehende
-- Base64-Zeilen bleiben als Fallback erhalten und werden NICHT migriert.

ALTER TABLE "transcription_pages" ADD COLUMN IF NOT EXISTS "storage_key" varchar(500);
--> statement-breakpoint
ALTER TABLE "anonymous_analyses" ADD COLUMN IF NOT EXISTS "storage_key" varchar(500);
