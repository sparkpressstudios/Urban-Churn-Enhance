CREATE TYPE "public"."bakery_order_status" AS ENUM('pending', 'confirmed', 'in_progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TABLE "settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value" text DEFAULT '' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "bakery_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_number" text NOT NULL,
	"customer_name" text NOT NULL,
	"customer_phone" text NOT NULL,
	"customer_email" text NOT NULL,
	"pickup_date" text NOT NULL,
	"pickup_time" text NOT NULL,
	"referral" text DEFAULT '',
	"order_type" text NOT NULL,
	"order_details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"add_ons" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"special_requests" text DEFAULT '',
	"inspiration_photo_url" text,
	"total_price_cents" integer DEFAULT 0 NOT NULL,
	"status" "bakery_order_status" DEFAULT 'pending' NOT NULL,
	"admin_notes" text DEFAULT '',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bakery_orders_order_number_unique" UNIQUE("order_number")
);
--> statement-breakpoint
ALTER TABLE "admin_users" ADD COLUMN "assigned_location_id" integer;--> statement-breakpoint
ALTER TABLE "location_hours" ADD COLUMN "set_number" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "locations" ADD COLUMN "square_location_id" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "square_order_id" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "square_payment_id" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_status" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "last_sync_source" text;--> statement-breakpoint
ALTER TABLE "admin_users" ADD CONSTRAINT "admin_users_assigned_location_id_locations_id_fk" FOREIGN KEY ("assigned_location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;