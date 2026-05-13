-- Switch pre-order windows from per-product-variation (product_id) to per-flavour (flavour_id).
-- Pre-orders apply to all sizes of a flavour, not individual size variants.

-- 1. Add flavour_id column
ALTER TABLE "product_pre_orders" ADD COLUMN "flavour_id" INTEGER REFERENCES "flavours"("id") ON DELETE CASCADE;

-- 2. Backfill flavour_id from the products table
UPDATE "product_pre_orders"
SET "flavour_id" = p."flavour_id"
FROM "products" p
WHERE p."id" = "product_pre_orders"."product_id";

-- 3. Drop the old product_id column
ALTER TABLE "product_pre_orders" DROP COLUMN IF EXISTS "product_id";
