CREATE TABLE IF NOT EXISTS "wholesale_flavours" (
  "id" serial PRIMARY KEY,
  "flavour_id" integer NOT NULL UNIQUE REFERENCES "flavours"("id") ON DELETE CASCADE,
  "description" text NOT NULL DEFAULT '',
  "allergens" text NOT NULL DEFAULT '',
  "is_seasonal" boolean NOT NULL DEFAULT false,
  "active" boolean NOT NULL DEFAULT true,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

INSERT INTO "wholesale_flavours" ("flavour_id", "description", "allergens", "is_seasonal", "active", "sort_order")
SELECT
  f."id",
  COALESCE(f."description", ''),
  '',
  CASE WHEN f."tag" = 'seasonal' THEN true ELSE false END,
  true,
  COALESCE(f."sort_order", 0)
FROM "flavours" f
ON CONFLICT ("flavour_id") DO NOTHING;
