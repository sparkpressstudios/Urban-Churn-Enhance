import {
    pgTable,
    serial,
    text,
    integer,
    timestamp,
    jsonb,
    pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { locationsTable } from "./locations";

export const bakeryOrderStatusEnum = pgEnum("bakery_order_status", [
    "pending",
    "confirmed",
    "in_progress",
    "completed",
    "cancelled",
]);

export const bakeryOrdersTable = pgTable("bakery_orders", {
    id: serial("id").primaryKey(),
    orderNumber: text("order_number").notNull().unique(),
    customerName: text("customer_name").notNull(),
    customerPhone: text("customer_phone").notNull(),
    customerEmail: text("customer_email").notNull(),
    locationId: integer("location_id").references(() => locationsTable.id),
    pickupDate: text("pickup_date").notNull(),
    pickupTime: text("pickup_time").notNull(),
    referral: text("referral").default(""),
    orderType: text("order_type").notNull(),
    orderDetails: jsonb("order_details").notNull().default({}),
    addOns: jsonb("add_ons").notNull().default({}),
    specialRequests: text("special_requests").default(""),
    inspirationPhotoUrl: text("inspiration_photo_url"),
    totalPriceCents: integer("total_price_cents").notNull().default(0),
    status: bakeryOrderStatusEnum("status").notNull().default("pending"),
    adminNotes: text("admin_notes").default(""),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertBakeryOrderSchema = createInsertSchema(bakeryOrdersTable).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});

export type InsertBakeryOrder = z.infer<typeof insertBakeryOrderSchema>;
export type BakeryOrder = typeof bakeryOrdersTable.$inferSelect;
