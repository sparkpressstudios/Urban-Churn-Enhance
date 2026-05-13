import {
    pgTable,
    serial,
    text,
    integer,
    timestamp,
} from "drizzle-orm/pg-core";
import { customersTable } from "./customers";

/**
 * Historical WooCommerce orders imported from the WordPress XML export.
 * These don't have line-item detail (WXR doesn't export that), but
 * we store the order-level summary so returning customers can see
 * what they bought in the old system.
 */
export const wooOrderHistoryTable = pgTable("woo_order_history", {
    id: serial("id").primaryKey(),
    wooOrderId: integer("woo_order_id").notNull().unique(),
    customerEmail: text("customer_email").notNull(),
    customerId: integer("customer_id").references(() => customersTable.id),
    customerName: text("customer_name").notNull().default(""),
    status: text("status").notNull().default("completed"),
    totalCents: integer("total_cents").notNull().default(0),
    currency: text("currency").notNull().default("USD"),
    paymentMethod: text("payment_method").default(""),
    orderDate: timestamp("order_date", { withTimezone: true }).notNull(),
    completedDate: timestamp("completed_date", { withTimezone: true }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type WooOrderHistory = typeof wooOrderHistoryTable.$inferSelect;
