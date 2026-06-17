ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "square_receipt_number" text;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "square_location_id" text;
ALTER TABLE "event_orders" ADD COLUMN IF NOT EXISTS "square_receipt_number" text;
