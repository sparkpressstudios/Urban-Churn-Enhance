CREATE TABLE IF NOT EXISTS "media" (
    "id" serial PRIMARY KEY NOT NULL,
    "filename" text NOT NULL UNIQUE,
    "mime_type" text NOT NULL,
    "size_bytes" integer NOT NULL,
    "data" bytea NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL
);
