import {
    pgTable,
    serial,
    integer,
    numeric,
    boolean,
    timestamp,
    unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { flavoursTable } from "./flavours";
import { sizesTable } from "./sizes";

export const productsTable = pgTable(
    "products",
    {
        id: serial("id").primaryKey(),
        flavourId: integer("flavour_id")
            .notNull()
            .references(() => flavoursTable.id, { onDelete: "cascade" }),
        sizeId: integer("size_id")
            .notNull()
            .references(() => sizesTable.id, { onDelete: "cascade" }),
        priceOverride: numeric("price_override", { precision: 10, scale: 2 }),
        available: boolean("available").notNull().default(true),
        manageStock: boolean("manage_stock").notNull().default(false),
        stockQuantity: integer("stock_quantity").notNull().default(0),
        lowStockThreshold: integer("low_stock_threshold").notNull().default(5),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at").defaultNow().notNull(),
    },
    (t) => [unique().on(t.flavourId, t.sizeId)],
);

export const productsRelations = relations(productsTable, ({ one }) => ({
    flavour: one(flavoursTable, {
        fields: [productsTable.flavourId],
        references: [flavoursTable.id],
    }),
    size: one(sizesTable, {
        fields: [productsTable.sizeId],
        references: [sizesTable.id],
    }),
}));

export const insertProductSchema = createInsertSchema(productsTable).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});

export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;
