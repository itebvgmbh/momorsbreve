CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "credit_packages" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"pages" integer NOT NULL,
	"price_eur" integer NOT NULL,
	"popular" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "evaluation_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"script_type" varchar(50) NOT NULL,
	"difficulty" varchar(20) DEFAULT 'medium' NOT NULL,
	"file_url" varchar(500) NOT NULL,
	"file_type" varchar(20) NOT NULL,
	"ground_truth" text NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "evaluation_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_id" integer NOT NULL,
	"document_id" integer NOT NULL,
	"transcription" text,
	"cer" real,
	"wer" real,
	"confidence" integer,
	"quality_details" jsonb,
	"tokens_used" integer,
	"duration_ms" integer,
	"status" varchar(20) DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evaluation_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"config" jsonb NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"summary" jsonb,
	"created_at" timestamp DEFAULT now(),
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "payment_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"package_id" integer NOT NULL,
	"stripe_session_id" varchar(500) NOT NULL,
	"stripe_payment_intent_id" varchar(500),
	"amount_eur" integer NOT NULL,
	"credits" integer NOT NULL,
	"status" varchar(30) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "transcription_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"script_type" varchar(50) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"total_pages" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "transcription_pages" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_id" integer NOT NULL,
	"page_number" integer NOT NULL,
	"image_url" varchar(500) NOT NULL,
	"transcription" text,
	"transcription_completed" text,
	"transcription_interpreted" text,
	"is_preview" boolean DEFAULT false,
	"quality_score" integer,
	"quality_details" jsonb,
	"input_tokens" integer,
	"output_tokens" integer,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_credits" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"credits" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "user_credits_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "human_transcription_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_id" integer NOT NULL,
	"user_id" varchar NOT NULL,
	"status" varchar(30) DEFAULT 'pending' NOT NULL,
	"urgency" varchar(20) NOT NULL,
	"accuracy_level" varchar(20) NOT NULL,
	"budget_range" varchar(20) NOT NULL,
	"customer_notes" text,
	"quote_price_eur" integer,
	"quote_message" text,
	"quote_deadline" timestamp,
	"quoted_at" timestamp,
	"responded_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "support_conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"subject" varchar(200) NOT NULL,
	"category" varchar(50) DEFAULT 'sonstiges' NOT NULL,
	"status" varchar(20) DEFAULT 'open' NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"sender_id" varchar NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "evaluation_results" ADD CONSTRAINT "evaluation_results_run_id_evaluation_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."evaluation_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_results" ADD CONSTRAINT "evaluation_results_document_id_evaluation_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."evaluation_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_orders" ADD CONSTRAINT "payment_orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_orders" ADD CONSTRAINT "payment_orders_package_id_credit_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."credit_packages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transcription_jobs" ADD CONSTRAINT "transcription_jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transcription_pages" ADD CONSTRAINT "transcription_pages_job_id_transcription_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."transcription_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_credits" ADD CONSTRAINT "user_credits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "human_transcription_requests" ADD CONSTRAINT "human_transcription_requests_job_id_transcription_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."transcription_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "human_transcription_requests" ADD CONSTRAINT "human_transcription_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_conversations" ADD CONSTRAINT "support_conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_conversation_id_support_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."support_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;