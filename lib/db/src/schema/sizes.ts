import {
    pgTable,
    serial,
    text,
    integer,
    numeric,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const sizesTable = pgTable("sizes", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    volumeOz: integer("volume_oz").notNull(),
    price: numeric("price", { precision: 10, scale: 2 }).notNull(),
    description: text("description").notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(0),
});

export const insertSizeSchema = createInsertSchema(sizesTable).omit({
    id: true,
});

export type InsertSize = z.infer<typeof insertSizeSchema>;
export type Size = typeof sizesTable.$inferSelect;
