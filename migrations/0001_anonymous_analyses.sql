CREATE TABLE "anonymous_analyses" (
	"id" serial PRIMARY KEY NOT NULL,
	"token" varchar(100) NOT NULL,
	"image_url" varchar(500) NOT NULL,
	"script_type" varchar(50) NOT NULL,
	"quality_details" jsonb,
	"claimed_by_user_id" varchar,
	"claimed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "anonymous_analyses_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "anonymous_analyses" ADD CONSTRAINT "anonymous_analyses_claimed_by_user_id_users_id_fk" FOREIGN KEY ("claimed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;