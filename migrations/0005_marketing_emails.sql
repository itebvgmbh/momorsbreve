CREATE TABLE IF NOT EXISTS "email_templates" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" varchar(200) NOT NULL,
  "subject" varchar(300) NOT NULL,
  "preheader" varchar(300),
  "html_body" text NOT NULL,
  "text_body" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "email_campaigns" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" varchar(200) NOT NULL,
  "template_id" integer NOT NULL REFERENCES "email_templates"("id") ON DELETE RESTRICT,
  "segment_filter" jsonb NOT NULL,
  "status" varchar(20) NOT NULL DEFAULT 'draft',
  "scheduled_at" timestamp,
  "started_at" timestamp,
  "sent_at" timestamp,
  "stats" jsonb,
  "error_message" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "email_flows" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" varchar(200) NOT NULL,
  "description" text,
  "trigger_type" varchar(50) NOT NULL,
  "trigger_config" jsonb,
  "enabled" boolean NOT NULL DEFAULT false,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "email_flow_steps" (
  "id" serial PRIMARY KEY NOT NULL,
  "flow_id" integer NOT NULL REFERENCES "email_flows"("id") ON DELETE CASCADE,
  "step_order" integer NOT NULL DEFAULT 0,
  "delay_hours" integer NOT NULL DEFAULT 0,
  "template_id" integer NOT NULL REFERENCES "email_templates"("id") ON DELETE RESTRICT,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "email_sends" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" varchar REFERENCES "users"("id") ON DELETE SET NULL,
  "to_email" varchar(320) NOT NULL,
  "template_id" integer REFERENCES "email_templates"("id") ON DELETE SET NULL,
  "campaign_id" integer REFERENCES "email_campaigns"("id") ON DELETE SET NULL,
  "flow_id" integer REFERENCES "email_flows"("id") ON DELETE SET NULL,
  "flow_step_id" integer REFERENCES "email_flow_steps"("id") ON DELETE SET NULL,
  "kind" varchar(20) NOT NULL DEFAULT 'campaign',
  "status" varchar(20) NOT NULL DEFAULT 'queued',
  "subject" varchar(300),
  "resend_message_id" varchar(200),
  "error_message" text,
  "sent_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "email_sends_user_idx" ON "email_sends" ("user_id");
CREATE INDEX IF NOT EXISTS "email_sends_campaign_idx" ON "email_sends" ("campaign_id");
CREATE INDEX IF NOT EXISTS "email_sends_flow_step_idx" ON "email_sends" ("flow_step_id");
CREATE INDEX IF NOT EXISTS "email_sends_created_idx" ON "email_sends" ("created_at");
