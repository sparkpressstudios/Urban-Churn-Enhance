ALTER TABLE "customers" ADD COLUMN "password_hash" text;
ALTER TABLE "customers" ADD COLUMN "has_account" boolean NOT NULL DEFAULT false;
ALTER TABLE "customers" ADD COLUMN "reset_token" text;
ALTER TABLE "customers" ADD COLUMN "reset_token_expires_at" timestamp;
