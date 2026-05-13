import {
    pgTable,
    serial,
    text,
    boolean,
    integer,
    numeric,
    timestamp,
    pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const flavourTagEnum = pgEnum("flavour_tag", [
    "classic",
    "limited",
    "seasonal",
    "fan-favorite",
    "adventurous",
    "bestseller",
    "coming-soon",
]);

export const flavoursTable = pgTable("flavours", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description").notNull().default(""),
    htmlContent: text("html_content").notNull().default(""),
    imageUrl: text("image_url"),
    tag: flavourTagEnum("tag").notNull().default("classic"),
    emoji: text("emoji").notNull().default("🍦"),
    basePrice: numeric("base_price", { precision: 10, scale: 2 })
        .notNull()
        .default("7.00"),
    available: boolean("available").notNull().default(true),
    heroPosition: integer("hero_position"),
    sortOrder: integer("sort_order").notNull().default(0),
    publishedAt: timestamp("published_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertFlavourSchema = createInsertSchema(flavoursTable).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});

export type InsertFlavour = z.infer<typeof insertFlavourSchema>;
export type Flavour = typeof flavoursTable.$inferSelect;
