CREATE TABLE IF NOT EXISTS "wholesale_sizes" (
  "id" serial PRIMARY KEY,
  "name" text NOT NULL,
  "slug" text NOT NULL UNIQUE,
  "description" text NOT NULL DEFAULT '',
  "size_category" "wholesale_size_category",
  "active" boolean NOT NULL DEFAULT true,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "wholesale_products"
  ADD COLUMN IF NOT EXISTS "wholesale_size_id" integer REFERENCES "wholesale_sizes"("id");

CREATE UNIQUE INDEX IF NOT EXISTS "wholesale_products_flavour_size_unique"
  ON "wholesale_products" ("flavour_id", "wholesale_size_id")
  WHERE "wholesale_size_id" IS NOT NULL;

INSERT INTO "wholesale_sizes" ("name", "slug", "description", "size_category", "active", "sort_order")
VALUES
  ('3 Gallon', '3-gallon', '3 gallon wholesale bucket', '3_gallon', true, 10),
  ('1.5 Gallon', '1-5-gallon', '1.5 gallon wholesale bucket', null, true, 20),
  ('Half Gallon', 'half-gallon', 'Legacy half gallon wholesale size', 'half_gallon', false, 90),
  ('Pint', 'pint', 'Legacy pint wholesale size', 'pint', false, 100)
ON CONFLICT ("slug") DO NOTHING;

UPDATE "wholesale_products" wp
SET "wholesale_size_id" = ws."id"
FROM "wholesale_sizes" ws
WHERE wp."wholesale_size_id" IS NULL
  AND ws."size_category" IS NOT NULL
  AND wp."size_category" = ws."size_category";