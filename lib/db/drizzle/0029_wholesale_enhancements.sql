-- Rush orders, optional stock tracking, vendor location on orders, invoice URL
ALTER TABLE "wholesale_orders" ADD COLUMN IF NOT EXISTS "is_rush_order" boolean DEFAULT false NOT NULL;
ALTER TABLE "wholesale_orders" ADD COLUMN IF NOT EXISTS "rush_notes" text DEFAULT '' NOT NULL;
ALTER TABLE "wholesale_orders" ADD COLUMN IF NOT EXISTS "square_invoice_public_url" text;
ALTER TABLE "wholesale_orders" ADD COLUMN IF NOT EXISTS "vendor_location_id" integer REFERENCES "wholesale_vendor_locations"("id");

ALTER TABLE "wholesale_products" ADD COLUMN IF NOT EXISTS "manage_stock" boolean DEFAULT false NOT NULL;
ALTER TABLE "wholesale_products" ADD COLUMN IF NOT EXISTS "stock_quantity" integer DEFAULT 0 NOT NULL;
ALTER TABLE "wholesale_products" ADD COLUMN IF NOT EXISTS "low_stock_threshold" integer DEFAULT 5 NOT NULL;
