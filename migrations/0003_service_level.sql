ALTER TABLE "human_transcription_requests" ADD COLUMN IF NOT EXISTS "service_level" varchar(30) DEFAULT 'experten' NOT NULL;
