-- Add orders_auto_readied flag to product_pre_orders
-- Tracks whether orders have been automatically transitioned to "ready"
-- when the pickup window starts, preventing duplicate processing.

ALTER TABLE "product_pre_orders"
  ADD COLUMN IF NOT EXISTS "orders_auto_readied" boolean NOT NULL DEFAULT false;
