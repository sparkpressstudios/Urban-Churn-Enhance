CREATE TYPE "public"."email_notification_status" AS ENUM('sent', 'failed');--> statement-breakpoint
CREATE TYPE "public"."email_notification_type" AS ENUM('window_closing_report', 'admin_orders_closed', 'customer_pickup_reminder', 'customer_pickup_started');--> statement-breakpoint
CREATE TYPE "public"."pre_order_window_status" AS ENUM('draft', 'scheduled', 'open', 'closed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."job_type" AS ENUM('full_time', 'part_time', 'seasonal');--> statement-breakpoint
CREATE TABLE "event_questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"message" text NOT NULL,
	"read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_notifications_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"pre_order_id" integer,
	"type" "email_notification_type" NOT NULL,
	"recipient_email" text NOT NULL,
	"sent_at" timestamp DEFAULT now() NOT NULL,
	"status" "email_notification_status" DEFAULT 'sent' NOT NULL,
	"error_message" text
);
--> statement-breakpoint
CREATE TABLE "product_pre_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"flavour_id" integer,
	"pre_order_start" timestamp with time zone NOT NULL,
	"pre_order_end" timestamp with time zone NOT NULL,
	"pickup_date" timestamp with time zone NOT NULL,
	"pickup_end_date" timestamp with time zone,
	"status" "pre_order_window_status" DEFAULT 'draft' NOT NULL,
	"is_recurring" boolean DEFAULT false NOT NULL,
	"recurring_rule" jsonb,
	"admin_notified" boolean DEFAULT false NOT NULL,
	"customer_notified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "career_benefits" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"icon_name" text DEFAULT 'star' NOT NULL,
	"icon_color" text DEFAULT '#d4a853' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_postings" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"locations" text DEFAULT '' NOT NULL,
	"type" "job_type" DEFAULT 'part_time' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"highlights" json DEFAULT '[]'::json NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rotating_flavours" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"image_url" text,
	"month" integer NOT NULL,
	"year" integer NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "locations" ADD COLUMN "menu_url" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "password_hash" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "has_account" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "reset_token" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "reset_token_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "event_questions" ADD CONSTRAINT "event_questions_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_notifications_log" ADD CONSTRAINT "email_notifications_log_pre_order_id_product_pre_orders_id_fk" FOREIGN KEY ("pre_order_id") REFERENCES "public"."product_pre_orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_pre_orders" ADD CONSTRAINT "product_pre_orders_flavour_id_flavours_id_fk" FOREIGN KEY ("flavour_id") REFERENCES "public"."flavours"("id") ON DELETE cascade ON UPDATE no action;