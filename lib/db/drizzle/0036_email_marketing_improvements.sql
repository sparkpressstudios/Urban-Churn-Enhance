ALTER TABLE "email_campaign_events" ADD COLUMN IF NOT EXISTS "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "email_campaign_events" ADD COLUMN IF NOT EXISTS "resend_event_id" text;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "email_campaign_events_resend_event_id_unique" ON "email_campaign_events" USING btree ("resend_event_id") WHERE "resend_event_id" IS NOT NULL;
