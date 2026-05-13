-- Remove bakery order type integration from pre-order windows.
-- Pre-orders should only be for individual ice cream products.

-- 1. Drop the pre_order_id FK from bakery_orders (bakery orders don't link to pre-order windows)
ALTER TABLE "bakery_orders" DROP COLUMN IF EXISTS "pre_order_id";

-- 2. Delete any pre-order rows that were bakery-type (not product-based)
DELETE FROM "product_pre_orders" WHERE "bakery_order_type" IS NOT NULL;

-- 3. Drop the bakery_order_type column from pre-order windows
ALTER TABLE "product_pre_orders" DROP COLUMN IF EXISTS "bakery_order_type";
