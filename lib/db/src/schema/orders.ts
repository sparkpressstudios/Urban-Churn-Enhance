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
import { locationsTable } from "./locations";
import { couponsTable } from "./coupons";
import { customersTable } from "./customers";
import { adminUsersTable } from "./admin-users";

export const orderStatusEnum = pgEnum("order_status", [
    "pending",
    "confirmed",
    "ready",
    "partially_picked_up",
    "picked_up",
    "cancelled",
    "refunded",
]);

export const ordersTable = pgTable("orders", {
    id: serial("id").primaryKey(),
    orderNumber: text("order_number").notNull().unique(),
    locationId: integer("location_id")
        .notNull()
        .references(() => locationsTable.id),
    customerName: text("customer_name").notNull(),
    customerEmail: text("customer_email").notNull(),
    customerPhone: text("customer_phone").notNull().default(""),
    customerId: integer("customer_id").references(() => customersTable.id),
    notes: text("notes").default(""),
    status: orderStatusEnum("status").notNull().default("pending"),
    totalCents: integer("total_cents").notNull().default(0),
    couponId: integer("coupon_id").references(() => couponsTable.id),
    discountCents: integer("discount_cents").notNull().default(0),
    squareOrderId: text("square_order_id"),
    squarePaymentId: text("square_payment_id"),
    squareReceiptNumber: text("square_receipt_number"),
    squareLocationId: text("square_location_id"),
    paymentStatus: text("payment_status"),
    lastSyncSource: text("last_sync_source"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const orderItemsTable = pgTable("order_items", {
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
        .notNull()
        .references(() => ordersTable.id, { onDelete: "cascade" }),
    productId: integer("product_id"),
    flavourName: text("flavour_name").notNull(),
    sizeName: text("size_name").notNull(),
    priceCents: integer("price_cents").notNull(),
    quantity: integer("quantity").notNull().default(1),
    pickedUpQuantity: integer("picked_up_quantity").notNull().default(0),
    pickedUpAt: timestamp("picked_up_at"),
    pickedUpByStaffId: integer("picked_up_by_staff_id").references(() => adminUsersTable.id),
    pickupDate: timestamp("pickup_date", { withTimezone: true }),
    preOrderWindowId: integer("pre_order_window_id"),
});

export const ordersRelations = relations(ordersTable, ({ one, many }) => ({
    location: one(locationsTable, {
        fields: [ordersTable.locationId],
        references: [locationsTable.id],
    }),
    coupon: one(couponsTable, {
        fields: [ordersTable.couponId],
        references: [couponsTable.id],
    }),
    customer: one(customersTable, {
        fields: [ordersTable.customerId],
        references: [customersTable.id],
    }),
    items: many(orderItemsTable),
}));

export const orderItemsRelations = relations(orderItemsTable, ({ one }) => ({
    order: one(ordersTable, {
        fields: [orderItemsTable.orderId],
        references: [ordersTable.id],
    }),
}));

export const insertOrderSchema = createInsertSchema(ordersTable).omit({
    id: true,
    orderNumber: true,
    createdAt: true,
    updatedAt: true,
});

export const insertOrderItemSchema = createInsertSchema(orderItemsTable).omit({
    id: true,
});

export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type OrderItem = typeof orderItemsTable.$inferSelect;
