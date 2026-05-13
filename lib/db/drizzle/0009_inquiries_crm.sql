-- Inquiry types & statuses
DO $$ BEGIN
    CREATE TYPE "inquiry_type" AS ENUM ('contact', 'wholesale', 'catering', 'fundraising', 'bakery');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "inquiry_status" AS ENUM ('new', 'follow_up', 'contacted', 'completed', 'archived');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Inquiries table (unified CRM leads from all public forms)
CREATE TABLE IF NOT EXISTS "inquiries" (
    "id" serial PRIMARY KEY NOT NULL,
    "type" "inquiry_type" NOT NULL,
    "status" "inquiry_status" NOT NULL DEFAULT 'new',
    "name" text NOT NULL,
    "email" text NOT NULL,
    "phone" text,
    "subject" text,
    "message" text,
    "form_data" jsonb NOT NULL DEFAULT '{}',
    "assigned_to" text,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Inquiry notes (admin activity log / follow-up notes)
CREATE TABLE IF NOT EXISTS "inquiry_notes" (
    "id" serial PRIMARY KEY NOT NULL,
    "inquiry_id" integer NOT NULL REFERENCES "inquiries"("id") ON DELETE CASCADE,
    "content" text NOT NULL,
    "author" text NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS "idx_inquiries_type" ON "inquiries" ("type");
CREATE INDEX IF NOT EXISTS "idx_inquiries_status" ON "inquiries" ("status");
CREATE INDEX IF NOT EXISTS "idx_inquiries_created_at" ON "inquiries" ("created_at");
CREATE INDEX IF NOT EXISTS "idx_inquiry_notes_inquiry_id" ON "inquiry_notes" ("inquiry_id");
