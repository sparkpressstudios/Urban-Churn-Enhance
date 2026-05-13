-- Add email + must_change_password to admin_users for credential emails
ALTER TABLE "admin_users" ADD COLUMN IF NOT EXISTS "email" text;
ALTER TABLE "admin_users" ADD COLUMN IF NOT EXISTS "must_change_password" boolean NOT NULL DEFAULT false;

-- Add per-item pickup date & pre-order window reference for split-pickup orders
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "pickup_date" timestamp with time zone;
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "pre_order_window_id" integer REFERENCES "product_pre_orders"("id");
CREATE INDEX IF NOT EXISTS "order_items_pickup_date_idx" ON "order_items"("pickup_date");

-- Add optional locationId to bakery_orders so store staff can see custom cake orders
ALTER TABLE "bakery_orders" ADD COLUMN IF NOT EXISTS "location_id" integer REFERENCES "locations"("id");
