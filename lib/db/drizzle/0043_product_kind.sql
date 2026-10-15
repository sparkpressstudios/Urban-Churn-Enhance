-- Distinguish ice cream pints from ice cream cakes so each catalog
-- only offers the sizes that belong to that product type.
DO $$ BEGIN
    CREATE TYPE "product_kind" AS ENUM ('ice_cream', 'cake');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "flavours"
    ADD COLUMN IF NOT EXISTS "product_kind" "product_kind" NOT NULL DEFAULT 'ice_cream';

ALTER TABLE "sizes"
    ADD COLUMN IF NOT EXISTS "product_kind" "product_kind" NOT NULL DEFAULT 'ice_cream';

UPDATE "sizes"
SET "product_kind" = 'cake'
WHERE "slug" ILIKE '%cake%' OR "name" ILIKE '%cake%';

UPDATE "flavours"
SET "product_kind" = 'cake'
WHERE "name" ~* 'ice[[:space:]]*cream[[:space:]]*cake'
   OR "slug" ILIKE '%ice-cream-cake%';

-- Drop dummy cross-type variants that were only used to mark the
-- other catalog's sizes as sold out.
DELETE FROM "products" p
USING "flavours" f, "sizes" s
WHERE p.flavour_id = f.id
  AND p.size_id = s.id
  AND f.product_kind IS DISTINCT FROM s.product_kind;
