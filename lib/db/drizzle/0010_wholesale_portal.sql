-- Add size category enum
DO $$ BEGIN
  CREATE TYPE "wholesale_size_category" AS ENUM('3_gallon', 'half_gallon', 'pint');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Add sizeCategory to wholesale_products
ALTER TABLE "wholesale_products" ADD COLUMN IF NOT EXISTS "size_category" "wholesale_size_category";

-- Add invite token fields to wholesale_customers
ALTER TABLE "wholesale_customers" ADD COLUMN IF NOT EXISTS "invite_token" text;
ALTER TABLE "wholesale_customers" ADD COLUMN IF NOT EXISTS "invite_token_expires_at" timestamp;

-- Add wholesaleCustomerId to customers table
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "wholesale_customer_id" integer REFERENCES "wholesale_customers"("id");
