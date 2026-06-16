ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "checkout_id" text;
CREATE UNIQUE INDEX IF NOT EXISTS "orders_checkout_id_unique" ON "orders" ("checkout_id") WHERE "checkout_id" IS NOT NULL;
