ALTER TABLE "anonymous_analyses" ADD COLUMN IF NOT EXISTS "image_data" text;
ALTER TABLE "anonymous_analyses" ADD COLUMN IF NOT EXISTS "image_mime_type" varchar(100);
