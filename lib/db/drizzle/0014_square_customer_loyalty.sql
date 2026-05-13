-- Add Square customer ID to customers table for loyalty/rewards integration
ALTER TABLE customers ADD COLUMN IF NOT EXISTS square_customer_id text;
