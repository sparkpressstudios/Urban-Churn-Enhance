-- WooCommerce order history for customer dashboard
CREATE TABLE IF NOT EXISTS "woo_order_history" (
    "id" serial PRIMARY KEY,
    "woo_order_id" integer NOT NULL UNIQUE,
    "customer_email" text NOT NULL,
    "customer_id" integer REFERENCES "customers"("id"),
    "customer_name" text NOT NULL DEFAULT '',
    "status" text NOT NULL DEFAULT 'completed',
    "total_cents" integer NOT NULL DEFAULT 0,
    "currency" text NOT NULL DEFAULT 'USD',
    "payment_method" text DEFAULT '',
    "order_date" timestamp with time zone NOT NULL,
    "completed_date" timestamp with time zone,
    "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "woo_order_history_email_idx" ON "woo_order_history" ("customer_email");
CREATE INDEX IF NOT EXISTS "woo_order_history_customer_id_idx" ON "woo_order_history" ("customer_id");
