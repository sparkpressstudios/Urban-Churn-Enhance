-- Career management tables
CREATE TYPE "public"."job_type" AS ENUM('full_time', 'part_time', 'seasonal');

CREATE TABLE "job_postings" (
    "id" serial PRIMARY KEY NOT NULL,
    "title" text NOT NULL,
    "locations" text NOT NULL DEFAULT '',
    "type" "job_type" NOT NULL DEFAULT 'part_time',
    "description" text NOT NULL DEFAULT '',
    "highlights" json NOT NULL DEFAULT '[]'::json,
    "active" boolean NOT NULL DEFAULT true,
    "sort_order" integer NOT NULL DEFAULT 0,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "career_benefits" (
    "id" serial PRIMARY KEY NOT NULL,
    "title" text NOT NULL,
    "description" text NOT NULL DEFAULT '',
    "icon_name" text NOT NULL DEFAULT 'star',
    "icon_color" text NOT NULL DEFAULT '#d4a853',
    "active" boolean NOT NULL DEFAULT true,
    "sort_order" integer NOT NULL DEFAULT 0,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Seed default job postings (from current hardcoded data)
INSERT INTO "job_postings" ("title", "locations", "type", "description", "highlights", "sort_order") VALUES
('Part-Time Scooper', 'Carlisle, Mechanicsburg', 'part_time', 'Serve ice cream, prep toppings, and create memorable experiences for our guests. No experience required — we''ll train you.', '["Flexible hours", "Weekends & evenings", "Team-oriented culture"]', 0),
('Part-Time Shift Lead', 'Carlisle, Mechanicsburg', 'part_time', 'Lead the team during your shift, manage opening/closing procedures and ensure every guest has a great experience.', '["Leadership opportunity", "Higher hourly rate", "Path to management"]', 1);

-- Seed default career benefits (from current hardcoded data)
INSERT INTO "career_benefits" ("title", "description", "icon_name", "icon_color", "sort_order") VALUES
('Free Ice Cream', 'Enjoy Urban Churn on us during your shift. Yes, really.', 'coffee', '#d4a853', 0),
('Flexible Scheduling', 'We work around school, family and other commitments.', 'calendar', '#A1AB74', 1),
('Supportive Team', 'A community of people who genuinely care about quality and each other.', 'users', '#d4a853', 2),
('Growth Opportunities', 'Start as a scooper, grow into shift lead, and beyond.', 'trending-up', '#A1AB74', 3);
