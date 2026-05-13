-- Link orders to customer records
ALTER TABLE "orders" ADD COLUMN "customer_id" integer REFERENCES "customers"("id");
CREATE INDEX "orders_customer_id_idx" ON "orders" ("customer_id");
