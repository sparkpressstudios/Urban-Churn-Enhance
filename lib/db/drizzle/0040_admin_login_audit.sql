ALTER TABLE "admin_users" ADD COLUMN IF NOT EXISTS "last_login_at" timestamp;
ALTER TABLE "admin_users" ADD COLUMN IF NOT EXISTS "last_failed_login_at" timestamp;

CREATE TABLE IF NOT EXISTS "admin_login_logs" (
    "id" serial PRIMARY KEY NOT NULL,
    "admin_user_id" integer REFERENCES "admin_users"("id") ON DELETE SET NULL,
    "username_attempted" text NOT NULL,
    "success" boolean NOT NULL DEFAULT false,
    "failure_reason" text,
    "ip_address" text,
    "user_agent" text,
    "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "admin_login_logs_created_at_idx" ON "admin_login_logs" ("created_at" DESC);
CREATE INDEX IF NOT EXISTS "admin_login_logs_admin_user_id_idx" ON "admin_login_logs" ("admin_user_id");
CREATE INDEX IF NOT EXISTS "admin_login_logs_username_attempted_idx" ON "admin_login_logs" ("username_attempted");
