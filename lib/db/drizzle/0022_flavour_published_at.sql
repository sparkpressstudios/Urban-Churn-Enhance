-- Add published_at column to flavours for controlling display order by publication date
ALTER TABLE "flavours" ADD COLUMN IF NOT EXISTS "published_at" timestamp DEFAULT now() NOT NULL;
