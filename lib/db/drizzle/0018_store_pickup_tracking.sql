-- Add partially_picked_up to order_status enum
ALTER TYPE "order_status" ADD VALUE IF NOT EXISTS 'partially_picked_up' BEFORE 'picked_up';

-- Add item-level pickup tracking columns to order_items
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "picked_up_quantity" integer NOT NULL DEFAULT 0;
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "picked_up_at" timestamp;
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "picked_up_by_staff_id" integer REFERENCES "admin_users"("id");
