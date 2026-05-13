CREATE TABLE "sent_emails_log" (
    "id" serial PRIMARY KEY NOT NULL,
    "to_email" text NOT NULL,
    "subject" text NOT NULL DEFAULT '',
    "email_type" text NOT NULL DEFAULT 'general',
    "resend_id" text,
    "status" text NOT NULL DEFAULT 'sent',
    "error_message" text,
    "created_at" timestamp DEFAULT now() NOT NULL
);
