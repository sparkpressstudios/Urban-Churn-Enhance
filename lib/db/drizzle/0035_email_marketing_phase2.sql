ALTER TYPE "email_segment_type" ADD VALUE IF NOT EXISTS 'dynamic';
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "email_template_revisions" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_id" integer NOT NULL,
	"document" jsonb NOT NULL,
	"label" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "email_topics" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"resend_topic_id" text,
	"default_opt_in" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "email_campaigns" ADD COLUMN IF NOT EXISTS "topic_id" integer;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "email_template_revisions" ADD CONSTRAINT "email_template_revisions_template_id_email_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."email_templates"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "email_template_revisions" ADD CONSTRAINT "email_template_revisions_created_by_admin_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "email_campaigns" ADD CONSTRAINT "email_campaigns_topic_id_email_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."email_topics"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
