-- Ensure wholesale enums exist
DO $$ BEGIN
  CREATE TYPE "wholesale_customer_status" AS ENUM('active', 'inactive', 'pending');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "wholesale_delivery_method" AS ENUM('delivery', 'pickup');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "wholesale_order_status" AS ENUM('pending_review', 'confirmed', 'in_production', 'ready', 'delivered', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "wholesale_email_processing_status" AS ENUM('received', 'parsed', 'failed', 'ignored');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "wholesale_delivery_run_status" AS ENUM('planned', 'in_progress', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "wholesale_size_category" AS ENUM('3_gallon', 'half_gallon', 'pint');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Create wholesale_customers table if not exists
CREATE TABLE IF NOT EXISTS "wholesale_customers" (
  "id" serial PRIMARY KEY,
  "business_name" text NOT NULL,
  "contact_name" text NOT NULL DEFAULT '',
  "email" text NOT NULL UNIQUE,
  "email_aliases" jsonb NOT NULL DEFAULT '[]',
  "phone" text NOT NULL DEFAULT '',
  "address" text NOT NULL DEFAULT '',
  "city" text NOT NULL DEFAULT '',
  "state" text NOT NULL DEFAULT 'PA',
  "zip" text NOT NULL DEFAULT '',
  "delivery_method" "wholesale_delivery_method" NOT NULL DEFAULT 'delivery',
  "default_location_id" integer REFERENCES "locations"("id"),
  "delivery_notes" text NOT NULL DEFAULT '',
  "status" "wholesale_customer_status" NOT NULL DEFAULT 'pending',
  "admin_notes" text NOT NULL DEFAULT '',
  "invite_token" text,
  "invite_token_expires_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Add any potentially missing columns to wholesale_customers
ALTER TABLE "wholesale_customers" ADD COLUMN IF NOT EXISTS "email_aliases" jsonb NOT NULL DEFAULT '[]';
ALTER TABLE "wholesale_customers" ADD COLUMN IF NOT EXISTS "admin_notes" text NOT NULL DEFAULT '';
ALTER TABLE "wholesale_customers" ADD COLUMN IF NOT EXISTS "invite_token" text;
ALTER TABLE "wholesale_customers" ADD COLUMN IF NOT EXISTS "invite_token_expires_at" timestamp;

-- Create wholesale_products table if not exists
CREATE TABLE IF NOT EXISTS "wholesale_products" (
  "id" serial PRIMARY KEY,
  "flavour_id" integer NOT NULL REFERENCES "flavours"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "size_category" "wholesale_size_category",
  "unit_description" text NOT NULL DEFAULT '',
  "price_cents" integer NOT NULL,
  "available" boolean NOT NULL DEFAULT true,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "wholesale_products" ADD COLUMN IF NOT EXISTS "size_category" "wholesale_size_category";
ALTER TABLE "wholesale_products" ADD COLUMN IF NOT EXISTS "unit_description" text NOT NULL DEFAULT '';

-- Create wholesale_orders table if not exists
CREATE TABLE IF NOT EXISTS "wholesale_orders" (
  "id" serial PRIMARY KEY,
  "order_number" text NOT NULL UNIQUE,
  "wholesale_customer_id" integer NOT NULL REFERENCES "wholesale_customers"("id"),
  "status" "wholesale_order_status" NOT NULL DEFAULT 'pending_review',
  "requested_delivery_date" date,
  "confirmed_delivery_date" date,
  "delivery_method" "wholesale_delivery_method" NOT NULL DEFAULT 'delivery',
  "subtotal_cents" integer NOT NULL DEFAULT 0,
  "admin_notes" text NOT NULL DEFAULT '',
  "original_email_subject" text NOT NULL DEFAULT '',
  "original_email_body" text NOT NULL DEFAULT '',
  "ai_parse_confidence" real,
  "ai_parse_notes" text NOT NULL DEFAULT '',
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create wholesale_order_items table if not exists
CREATE TABLE IF NOT EXISTS "wholesale_order_items" (
  "id" serial PRIMARY KEY,
  "wholesale_order_id" integer NOT NULL REFERENCES "wholesale_orders"("id") ON DELETE CASCADE,
  "wholesale_product_id" integer REFERENCES "wholesale_products"("id"),
  "flavour_id" integer REFERENCES "flavours"("id"),
  "product_description" text NOT NULL DEFAULT '',
  "quantity" integer NOT NULL DEFAULT 1,
  "unit_price_cents" integer NOT NULL DEFAULT 0,
  "matched" boolean NOT NULL DEFAULT false,
  "notes" text NOT NULL DEFAULT ''
);

-- Create wholesale_email_log table if not exists
CREATE TABLE IF NOT EXISTS "wholesale_email_log" (
  "id" serial PRIMARY KEY,
  "from_email" text NOT NULL,
  "to_email" text NOT NULL DEFAULT '',
  "subject" text NOT NULL DEFAULT '',
  "body_text" text NOT NULL DEFAULT '',
  "body_html" text NOT NULL DEFAULT '',
  "attachments" jsonb NOT NULL DEFAULT '[]',
  "wholesale_order_id" integer REFERENCES "wholesale_orders"("id"),
  "processing_status" "wholesale_email_processing_status" NOT NULL DEFAULT 'received',
  "error_message" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Create wholesale_delivery_runs table if not exists
CREATE TABLE IF NOT EXISTS "wholesale_delivery_runs" (
  "id" serial PRIMARY KEY,
  "name" text NOT NULL,
  "scheduled_date" date NOT NULL,
  "driver_name" text NOT NULL DEFAULT '',
  "driver_email" text NOT NULL DEFAULT '',
  "vehicle_notes" text NOT NULL DEFAULT '',
  "status" "wholesale_delivery_run_status" NOT NULL DEFAULT 'planned',
  "notes" text NOT NULL DEFAULT '',
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create wholesale_delivery_run_stops table if not exists
CREATE TABLE IF NOT EXISTS "wholesale_delivery_run_stops" (
  "id" serial PRIMARY KEY,
  "delivery_run_id" integer NOT NULL REFERENCES "wholesale_delivery_runs"("id") ON DELETE CASCADE,
  "wholesale_order_id" integer NOT NULL REFERENCES "wholesale_orders"("id"),
  "stop_order" integer NOT NULL DEFAULT 0,
  "status" text NOT NULL DEFAULT 'pending',
  "notes" text NOT NULL DEFAULT ''
);

-- Ensure customers table has wholesale_customer_id
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "wholesale_customer_id" integer REFERENCES "wholesale_customers"("id");
