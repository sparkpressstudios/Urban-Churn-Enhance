-- Allow per-location pickup start overrides for pre-order windows.
ALTER TABLE "pre_order_locations"
  ADD COLUMN IF NOT EXISTS "pickup_start_date" timestamp with time zone;
