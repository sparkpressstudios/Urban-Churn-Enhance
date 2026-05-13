import {
    pgTable,
    serial,
    text,
    integer,
    timestamp,
    pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { ordersTable } from "./orders";

export const noteTypeEnum = pgEnum("note_type", [
    "internal",
    "customer_visible",
    "system",
]);

export const orderNotesTable = pgTable("order_notes", {
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
        .notNull()
        .references(() => ordersTable.id, { onDelete: "cascade" }),
    type: noteTypeEnum("type").notNull().default("internal"),
    content: text("content").notNull(),
    author: text("author").notNull().default("System"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const orderNotesRelations = relations(orderNotesTable, ({ one }) => ({
    order: one(ordersTable, {
        fields: [orderNotesTable.orderId],
        references: [ordersTable.id],
    }),
}));

export const insertOrderNoteSchema = createInsertSchema(orderNotesTable).omit({
    id: true,
    createdAt: true,
});

export type InsertOrderNote = z.infer<typeof insertOrderNoteSchema>;
export type OrderNote = typeof orderNotesTable.$inferSelect;
