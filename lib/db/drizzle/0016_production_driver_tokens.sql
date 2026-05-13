-- Production tracking timestamps on wholesale orders
ALTER TABLE wholesale_orders ADD COLUMN IF NOT EXISTS production_started_at TIMESTAMP;
ALTER TABLE wholesale_orders ADD COLUMN IF NOT EXISTS production_completed_at TIMESTAMP;

-- Driver token for tokenized mobile access to delivery runs
ALTER TABLE wholesale_delivery_runs ADD COLUMN IF NOT EXISTS driver_token TEXT;

-- Stop completion tracking
ALTER TABLE wholesale_delivery_run_stops ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP;
ALTER TABLE wholesale_delivery_run_stops ADD COLUMN IF NOT EXISTS completion_notes TEXT NOT NULL DEFAULT '';
