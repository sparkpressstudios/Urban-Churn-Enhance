-- Client-exclusive wholesale flavours (visible only to assigned customers)
ALTER TABLE "wholesale_flavours" ADD COLUMN IF NOT EXISTS "is_exclusive" boolean DEFAULT false NOT NULL;

CREATE TABLE IF NOT EXISTS "wholesale_customer_exclusive_flavours" (
    "id" serial PRIMARY KEY NOT NULL,
    "wholesale_customer_id" integer NOT NULL REFERENCES "wholesale_customers"("id") ON DELETE CASCADE,
    "flavour_id" integer NOT NULL REFERENCES "flavours"("id") ON DELETE CASCADE,
    "created_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "wholesale_customer_exclusive_flavours_unique" UNIQUE("wholesale_customer_id", "flavour_id")
);

CREATE INDEX IF NOT EXISTS "wholesale_customer_exclusive_flavours_customer_idx"
    ON "wholesale_customer_exclusive_flavours" ("wholesale_customer_id");
CREATE INDEX IF NOT EXISTS "wholesale_customer_exclusive_flavours_flavour_idx"
    ON "wholesale_customer_exclusive_flavours" ("flavour_id");
