-- Add payment tracking columns to wholesale orders
ALTER TABLE wholesale_orders ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid';
ALTER TABLE wholesale_orders ADD COLUMN IF NOT EXISTS payment_method text;
ALTER TABLE wholesale_orders ADD COLUMN IF NOT EXISTS payment_notes text NOT NULL DEFAULT '';
ALTER TABLE wholesale_orders ADD COLUMN IF NOT EXISTS square_invoice_id text;
ALTER TABLE wholesale_orders ADD COLUMN IF NOT EXISTS paid_at timestamp;
