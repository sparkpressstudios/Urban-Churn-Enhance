ALTER TABLE "admin_users" ADD COLUMN IF NOT EXISTS "reset_token" text;
ALTER TABLE "admin_users" ADD COLUMN IF NOT EXISTS "reset_token_expires_at" timestamp;
