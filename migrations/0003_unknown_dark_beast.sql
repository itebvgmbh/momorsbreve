CREATE TABLE "app_settings" (
	"key" varchar(100) PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_number" varchar(50) NOT NULL,
	"user_id" varchar NOT NULL,
	"type" varchar(30) NOT NULL,
	"payment_order_id" integer,
	"human_request_id" integer,
	"net_amount_eur" integer NOT NULL,
	"vat_rate" integer DEFAULT 19 NOT NULL,
	"vat_amount_eur" integer NOT NULL,
	"gross_amount_eur" integer NOT NULL,
	"description" text NOT NULL,
	"customer_name" varchar(200),
	"customer_email" varchar(200),
	"customer_street" varchar(200),
	"customer_postal_code" varchar(20),
	"customer_city" varchar(100),
	"customer_country" varchar(100),
	"stripe_payment_intent_id" varchar(500),
	"pdf_path" varchar(500),
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "invoices_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE "tts_generations" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_id" integer NOT NULL,
	"version" varchar(20) NOT NULL,
	"lang" varchar(20) NOT NULL,
	"voice" varchar(50) NOT NULL,
	"style" text,
	"pages" jsonb NOT NULL,
	"status" varchar(20) DEFAULT 'generating' NOT NULL,
	"fail_reason" text,
	"audio_url" varchar(500),
	"audio_data" text,
	"audio_mime_type" varchar(50),
	"credits_used" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "evaluation_results" ALTER COLUMN "document_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "street" varchar;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "postal_code" varchar;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "city" varchar;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "country" varchar;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "billing_name" varchar;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "billing_street" varchar;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "billing_postal_code" varchar;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "billing_city" varchar;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "billing_country" varchar;--> statement-breakpoint
ALTER TABLE "anonymous_analyses" ADD COLUMN "image_data" text;--> statement-breakpoint
ALTER TABLE "anonymous_analyses" ADD COLUMN "image_mime_type" varchar(100);--> statement-breakpoint
ALTER TABLE "transcription_jobs" ADD COLUMN "translation_language" varchar(10);--> statement-breakpoint
ALTER TABLE "transcription_pages" ADD COLUMN "image_data" text;--> statement-breakpoint
ALTER TABLE "transcription_pages" ADD COLUMN "image_mime_type" varchar(100);--> statement-breakpoint
ALTER TABLE "transcription_pages" ADD COLUMN "transcription_edited" text;--> statement-breakpoint
ALTER TABLE "transcription_pages" ADD COLUMN "transcription_completed_edited" text;--> statement-breakpoint
ALTER TABLE "transcription_pages" ADD COLUMN "transcription_interpreted_edited" text;--> statement-breakpoint
ALTER TABLE "transcription_pages" ADD COLUMN "translation" text;--> statement-breakpoint
ALTER TABLE "transcription_pages" ADD COLUMN "translation_completed" text;--> statement-breakpoint
ALTER TABLE "transcription_pages" ADD COLUMN "translation_interpreted" text;--> statement-breakpoint
ALTER TABLE "human_transcription_requests" ADD COLUMN "service_level" varchar(30) DEFAULT 'experten' NOT NULL;--> statement-breakpoint
ALTER TABLE "human_transcription_requests" ADD COLUMN "stripe_session_id" varchar(500);--> statement-breakpoint
ALTER TABLE "human_transcription_requests" ADD COLUMN "stripe_payment_intent_id" varchar(500);--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_payment_order_id_payment_orders_id_fk" FOREIGN KEY ("payment_order_id") REFERENCES "public"."payment_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tts_generations" ADD CONSTRAINT "tts_generations_job_id_transcription_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."transcription_jobs"("id") ON DELETE cascade ON UPDATE no action;