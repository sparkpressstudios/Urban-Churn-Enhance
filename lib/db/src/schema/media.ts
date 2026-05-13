import {
    pgTable,
    serial,
    text,
    timestamp,
    integer,
    customType,
} from "drizzle-orm/pg-core";

// Custom bytea type for storing binary image data
const bytea = customType<{ data: Buffer; driverParam: Buffer }>({
    dataType() {
        return "bytea";
    },
});

export const mediaTable = pgTable("media", {
    id: serial("id").primaryKey(),
    filename: text("filename").notNull().unique(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    data: bytea("data").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Media = typeof mediaTable.$inferSelect;
