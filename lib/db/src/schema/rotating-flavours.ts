import {
    pgTable,
    serial,
    text,
    boolean,
    integer,
    timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// ── Tables ──

export const rotatingFlavoursTable = pgTable("rotating_flavours", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    imageUrl: text("image_url"),
    month: integer("month").notNull(), // 1–12
    year: integer("year").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Insert Schema ──

export const insertRotatingFlavourSchema = createInsertSchema(rotatingFlavoursTable).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});

// ── Types ──

export type InsertRotatingFlavour = z.infer<typeof insertRotatingFlavourSchema>;
export type RotatingFlavour = typeof rotatingFlavoursTable.$inferSelect;
