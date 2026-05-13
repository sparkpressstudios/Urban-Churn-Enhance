CREATE TYPE "vendor_category" AS ENUM ('scoop_shop', 'grocery', 'restaurant', 'cafe', 'market', 'other');
ALTER TABLE "locations" ADD COLUMN "vendor_category" "vendor_category";
