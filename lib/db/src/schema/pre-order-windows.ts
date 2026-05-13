import {
    pgTable,
    serial,
    text,
    integer,
    boolean,
    timestamp,
    jsonb,
    pgEnum,
    unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { flavoursTable } from "./flavours";
import { locationsTable } from "./locations";

// ── Enums ──

export const preOrderWindowStatusEnum = pgEnum("pre_order_window_status", [
    "draft",
    "scheduled",
    "open",
    "closed",
    "cancelled",
]);

export const emailNotificationTypeEnum = pgEnum("email_notification_type", [
    "window_closing_report",
    "admin_orders_closed",
    "customer_pickup_reminder",
    "customer_pickup_started",
    "customer_last_chance_pickup",
]);

export const emailNotificationStatusEnum = pgEnum("email_notification_status", [
    "sent",
    "failed",
]);

// ── Tables ──

/**
 * Each row represents a single product's pre-order configuration
 * with its own ordering window and pickup dates.
 */
export const productPreOrdersTable = pgTable("product_pre_orders", {
    id: serial("id").primaryKey(),
    flavourId: integer("flavour_id").references(() => flavoursTable.id, {
        onDelete: "cascade",
    }),
    preOrderStart: timestamp("pre_order_start", { withTimezone: true }).notNull(),
    preOrderEnd: timestamp("pre_order_end", { withTimezone: true }).notNull(),
    pickupDate: timestamp("pickup_date", { withTimezone: true }).notNull(),
    pickupEndDate: timestamp("pickup_end_date", { withTimezone: true }),
    status: preOrderWindowStatusEnum("status").notNull().default("draft"),
    isRecurring: boolean("is_recurring").notNull().default(false),
    recurringRule: jsonb("recurring_rule"),
    adminNotified: boolean("admin_notified").notNull().default(false),
    customerNotified: boolean("customer_notified").notNull().default(false),
    ordersAutoReadied: boolean("orders_auto_readied").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const emailNotificationsLogTable = pgTable("email_notifications_log", {
    id: serial("id").primaryKey(),
    preOrderId: integer("pre_order_id").references(() => productPreOrdersTable.id, {
        onDelete: "set null",
    }),
    type: emailNotificationTypeEnum("type").notNull(),
    recipientEmail: text("recipient_email").notNull(),
    sentAt: timestamp("sent_at").defaultNow().notNull(),
    status: emailNotificationStatusEnum("status").notNull().default("sent"),
    errorMessage: text("error_message"),
});

// ── Relations ──

export const productPreOrdersRelations = relations(
    productPreOrdersTable,
    ({ one, many }) => ({
        flavour: one(flavoursTable, {
            fields: [productPreOrdersTable.flavourId],
            references: [flavoursTable.id],
        }),
        emailLogs: many(emailNotificationsLogTable),
        locations: many(preOrderLocationsTable),
    }),
);

export const emailNotificationsLogRelations = relations(
    emailNotificationsLogTable,
    ({ one }) => ({
        preOrder: one(productPreOrdersTable, {
            fields: [emailNotificationsLogTable.preOrderId],
            references: [productPreOrdersTable.id],
        }),
    }),
);

// ── Junction table: pre-order ↔ locations ──

export const preOrderLocationsTable = pgTable(
    "pre_order_locations",
    {
        id: serial("id").primaryKey(),
        preOrderId: integer("pre_order_id")
            .notNull()
            .references(() => productPreOrdersTable.id, { onDelete: "cascade" }),
        locationId: integer("location_id")
            .notNull()
            .references(() => locationsTable.id, { onDelete: "cascade" }),
        pickupStartDate: timestamp("pickup_start_date", { withTimezone: true }),
        createdAt: timestamp("created_at").defaultNow().notNull(),
    },
    (t) => [unique().on(t.preOrderId, t.locationId)],
);

export const preOrderLocationsRelations = relations(
    preOrderLocationsTable,
    ({ one }) => ({
        preOrder: one(productPreOrdersTable, {
            fields: [preOrderLocationsTable.preOrderId],
            references: [productPreOrdersTable.id],
        }),
        location: one(locationsTable, {
            fields: [preOrderLocationsTable.locationId],
            references: [locationsTable.id],
        }),
    }),
);

// ── Insert Schemas ──

export const insertProductPreOrderSchema = createInsertSchema(
    productPreOrdersTable,
).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});

export type InsertProductPreOrder = z.infer<typeof insertProductPreOrderSchema>;
export type ProductPreOrder = typeof productPreOrdersTable.$inferSelect;
export type PreOrderLocation = typeof preOrderLocationsTable.$inferSelect;
