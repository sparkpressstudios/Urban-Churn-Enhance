import {
    pgTable,
    serial,
    text,
    integer,
    boolean,
    timestamp,
    jsonb,
    pgEnum,
    real,
    date,
    unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { flavoursTable } from "./flavours";
import { locationsTable } from "./locations";

// ── Enums ──

export const wholesaleCustomerStatusEnum = pgEnum("wholesale_customer_status", [
    "active",
    "inactive",
    "pending",
]);

export const wholesaleDeliveryMethodEnum = pgEnum("wholesale_delivery_method", [
    "delivery",
    "pickup",
]);

export const wholesaleOrderStatusEnum = pgEnum("wholesale_order_status", [
    "pending_review",
    "confirmed",
    "in_production",
    "ready",
    "delivered",
    "cancelled",
]);

export const wholesaleEmailProcessingStatusEnum = pgEnum(
    "wholesale_email_processing_status",
    ["received", "parsed", "failed", "ignored"],
);

export const wholesaleDeliveryRunStatusEnum = pgEnum(
    "wholesale_delivery_run_status",
    ["planned", "in_progress", "completed", "cancelled"],
);

export const wholesaleSizeCategoryEnum = pgEnum("wholesale_size_category", [
    "3_gallon",
    "half_gallon",
    "pint",
]);

// ── Tables ──

export const wholesaleCustomersTable = pgTable("wholesale_customers", {
    id: serial("id").primaryKey(),
    businessName: text("business_name").notNull(),
    contactName: text("contact_name").notNull().default(""),
    email: text("email").notNull().unique(),
    emailAliases: jsonb("email_aliases").notNull().default([]),
    phone: text("phone").notNull().default(""),
    address: text("address").notNull().default(""),
    city: text("city").notNull().default(""),
    state: text("state").notNull().default("PA"),
    zip: text("zip").notNull().default(""),
    deliveryMethod: wholesaleDeliveryMethodEnum("delivery_method")
        .notNull()
        .default("delivery"),
    defaultLocationId: integer("default_location_id").references(
        () => locationsTable.id,
    ),
    deliveryNotes: text("delivery_notes").notNull().default(""),
    status: wholesaleCustomerStatusEnum("status").notNull().default("pending"),
    adminNotes: text("admin_notes").notNull().default(""),
    inviteToken: text("invite_token"),
    inviteTokenExpiresAt: timestamp("invite_token_expires_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const wholesaleFlavoursTable = pgTable(
    "wholesale_flavours",
    {
        id: serial("id").primaryKey(),
        flavourId: integer("flavour_id")
            .notNull()
            .references(() => flavoursTable.id, { onDelete: "cascade" })
            .unique(),
        description: text("description").notNull().default(""),
        allergens: text("allergens").notNull().default(""),
        isSeasonal: boolean("is_seasonal").notNull().default(false),
        active: boolean("active").notNull().default(true),
        sortOrder: integer("sort_order").notNull().default(0),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at").defaultNow().notNull(),
    },
);

export const wholesaleSizesTable = pgTable(
    "wholesale_sizes",
    {
        id: serial("id").primaryKey(),
        name: text("name").notNull(),
        slug: text("slug").notNull().unique(),
        description: text("description").notNull().default(""),
        sizeCategory: wholesaleSizeCategoryEnum("size_category"),
        active: boolean("active").notNull().default(true),
        sortOrder: integer("sort_order").notNull().default(0),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at").defaultNow().notNull(),
    },
);

export const wholesaleProductsTable = pgTable("wholesale_products", {
    id: serial("id").primaryKey(),
    flavourId: integer("flavour_id")
        .notNull()
        .references(() => flavoursTable.id, { onDelete: "cascade" }),
    wholesaleSizeId: integer("wholesale_size_id").references(
        () => wholesaleSizesTable.id,
    ),
    name: text("name").notNull(), // e.g. "2.5 Gallon Tub", "Case of 8 Pints"
    sizeCategory: wholesaleSizeCategoryEnum("size_category"),
    unitDescription: text("unit_description").notNull().default(""), // human label for AI matching
    priceCents: integer("price_cents").notNull(),
    available: boolean("available").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [unique().on(t.flavourId, t.wholesaleSizeId)]);

export const wholesaleOrdersTable = pgTable("wholesale_orders", {
    id: serial("id").primaryKey(),
    orderNumber: text("order_number").notNull().unique(),
    wholesaleCustomerId: integer("wholesale_customer_id")
        .notNull()
        .references(() => wholesaleCustomersTable.id),
    status: wholesaleOrderStatusEnum("status")
        .notNull()
        .default("pending_review"),
    requestedDeliveryDate: date("requested_delivery_date"),
    confirmedDeliveryDate: date("confirmed_delivery_date"),
    deliveryMethod: wholesaleDeliveryMethodEnum("delivery_method")
        .notNull()
        .default("delivery"),
    subtotalCents: integer("subtotal_cents").notNull().default(0),
    adminNotes: text("admin_notes").notNull().default(""),
    originalEmailSubject: text("original_email_subject").notNull().default(""),
    originalEmailBody: text("original_email_body").notNull().default(""),
    aiParseConfidence: real("ai_parse_confidence"),
    aiParseNotes: text("ai_parse_notes").notNull().default(""),
    paymentStatus: text("payment_status").notNull().default("unpaid"), // unpaid, invoiced, paid, partial
    paymentMethod: text("payment_method"),  // square_invoice, manual, check, cash, wire
    paymentNotes: text("payment_notes").notNull().default(""),
    squareInvoiceId: text("square_invoice_id"),
    paidAt: timestamp("paid_at"),
    productionStartedAt: timestamp("production_started_at"),
    productionCompletedAt: timestamp("production_completed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const wholesaleOrderItemsTable = pgTable("wholesale_order_items", {
    id: serial("id").primaryKey(),
    wholesaleOrderId: integer("wholesale_order_id")
        .notNull()
        .references(() => wholesaleOrdersTable.id, { onDelete: "cascade" }),
    wholesaleProductId: integer("wholesale_product_id").references(
        () => wholesaleProductsTable.id,
    ),
    flavourId: integer("flavour_id").references(() => flavoursTable.id),
    productDescription: text("product_description").notNull().default(""),
    quantity: integer("quantity").notNull().default(1),
    unitPriceCents: integer("unit_price_cents").notNull().default(0),
    matched: boolean("matched").notNull().default(false),
    notes: text("notes").notNull().default(""),
});

export const wholesaleEmailLogTable = pgTable("wholesale_email_log", {
    id: serial("id").primaryKey(),
    fromEmail: text("from_email").notNull(),
    toEmail: text("to_email").notNull().default(""),
    subject: text("subject").notNull().default(""),
    bodyText: text("body_text").notNull().default(""),
    bodyHtml: text("body_html").notNull().default(""),
    attachments: jsonb("attachments").notNull().default([]),
    wholesaleOrderId: integer("wholesale_order_id").references(
        () => wholesaleOrdersTable.id,
    ),
    processingStatus: wholesaleEmailProcessingStatusEnum("processing_status")
        .notNull()
        .default("received"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const wholesaleDeliveryRunsTable = pgTable("wholesale_delivery_runs", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    scheduledDate: date("scheduled_date").notNull(),
    driverName: text("driver_name").notNull().default(""),
    driverEmail: text("driver_email").notNull().default(""),
    vehicleNotes: text("vehicle_notes").notNull().default(""),
    status: wholesaleDeliveryRunStatusEnum("status")
        .notNull()
        .default("planned"),
    notes: text("notes").notNull().default(""),
    driverToken: text("driver_token"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const wholesaleDeliveryRunStopsTable = pgTable(
    "wholesale_delivery_run_stops",
    {
        id: serial("id").primaryKey(),
        deliveryRunId: integer("delivery_run_id")
            .notNull()
            .references(() => wholesaleDeliveryRunsTable.id, {
                onDelete: "cascade",
            }),
        wholesaleOrderId: integer("wholesale_order_id")
            .notNull()
            .references(() => wholesaleOrdersTable.id),
        stopOrder: integer("stop_order").notNull().default(0),
        status: text("status").notNull().default("pending"), // pending, completed, skipped
        notes: text("notes").notNull().default(""),
        deliveredAt: timestamp("delivered_at"),
        completionNotes: text("completion_notes").notNull().default(""),
    },
);

// ── Junction table: wholesale customer ↔ locations ──

export const wholesaleCustomerLocationsTable = pgTable(
    "wholesale_customer_locations",
    {
        id: serial("id").primaryKey(),
        wholesaleCustomerId: integer("wholesale_customer_id")
            .notNull()
            .references(() => wholesaleCustomersTable.id, { onDelete: "cascade" }),
        locationId: integer("location_id")
            .notNull()
            .references(() => locationsTable.id, { onDelete: "cascade" }),
        createdAt: timestamp("created_at").defaultNow().notNull(),
    },
    (t) => [unique().on(t.wholesaleCustomerId, t.locationId)],
);

export const wholesaleCustomerLocationsRelations = relations(
    wholesaleCustomerLocationsTable,
    ({ one }) => ({
        customer: one(wholesaleCustomersTable, {
            fields: [wholesaleCustomerLocationsTable.wholesaleCustomerId],
            references: [wholesaleCustomersTable.id],
        }),
        location: one(locationsTable, {
            fields: [wholesaleCustomerLocationsTable.locationId],
            references: [locationsTable.id],
        }),
    }),
);

// ── Relations ──

export const wholesaleCustomersRelations = relations(
    wholesaleCustomersTable,
    ({ one, many }) => ({
        defaultLocation: one(locationsTable, {
            fields: [wholesaleCustomersTable.defaultLocationId],
            references: [locationsTable.id],
        }),
        orders: many(wholesaleOrdersTable),
        locations: many(wholesaleCustomerLocationsTable),
        vendorLocations: many(wholesaleVendorLocationsTable),
    }),
);

export const wholesaleProductsRelations = relations(
    wholesaleProductsTable,
    ({ one }) => ({
        flavour: one(flavoursTable, {
            fields: [wholesaleProductsTable.flavourId],
            references: [flavoursTable.id],
        }),
        wholesaleSize: one(wholesaleSizesTable, {
            fields: [wholesaleProductsTable.wholesaleSizeId],
            references: [wholesaleSizesTable.id],
        }),
    }),
);

export const wholesaleFlavoursRelations = relations(
    wholesaleFlavoursTable,
    ({ one }) => ({
        flavour: one(flavoursTable, {
            fields: [wholesaleFlavoursTable.flavourId],
            references: [flavoursTable.id],
        }),
    }),
);

export const wholesaleSizesRelations = relations(
    wholesaleSizesTable,
    ({ many }) => ({
        products: many(wholesaleProductsTable),
    }),
);

export const wholesaleOrdersRelations = relations(
    wholesaleOrdersTable,
    ({ one, many }) => ({
        customer: one(wholesaleCustomersTable, {
            fields: [wholesaleOrdersTable.wholesaleCustomerId],
            references: [wholesaleCustomersTable.id],
        }),
        items: many(wholesaleOrderItemsTable),
        emailLogs: many(wholesaleEmailLogTable),
        deliveryRunStops: many(wholesaleDeliveryRunStopsTable),
    }),
);

export const wholesaleOrderItemsRelations = relations(
    wholesaleOrderItemsTable,
    ({ one }) => ({
        order: one(wholesaleOrdersTable, {
            fields: [wholesaleOrderItemsTable.wholesaleOrderId],
            references: [wholesaleOrdersTable.id],
        }),
        product: one(wholesaleProductsTable, {
            fields: [wholesaleOrderItemsTable.wholesaleProductId],
            references: [wholesaleProductsTable.id],
        }),
        flavour: one(flavoursTable, {
            fields: [wholesaleOrderItemsTable.flavourId],
            references: [flavoursTable.id],
        }),
    }),
);

export const wholesaleEmailLogRelations = relations(
    wholesaleEmailLogTable,
    ({ one }) => ({
        order: one(wholesaleOrdersTable, {
            fields: [wholesaleEmailLogTable.wholesaleOrderId],
            references: [wholesaleOrdersTable.id],
        }),
    }),
);

export const wholesaleDeliveryRunsRelations = relations(
    wholesaleDeliveryRunsTable,
    ({ many }) => ({
        stops: many(wholesaleDeliveryRunStopsTable),
    }),
);

export const wholesaleDeliveryRunStopsRelations = relations(
    wholesaleDeliveryRunStopsTable,
    ({ one }) => ({
        run: one(wholesaleDeliveryRunsTable, {
            fields: [wholesaleDeliveryRunStopsTable.deliveryRunId],
            references: [wholesaleDeliveryRunsTable.id],
        }),
        order: one(wholesaleOrdersTable, {
            fields: [wholesaleDeliveryRunStopsTable.wholesaleOrderId],
            references: [wholesaleOrdersTable.id],
        }),
    }),
);

// ── Insert Schemas ──

export const insertWholesaleCustomerSchema = createInsertSchema(
    wholesaleCustomersTable,
).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});

export const insertWholesaleFlavourSchema = createInsertSchema(
    wholesaleFlavoursTable,
).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});

export const insertWholesaleSizeSchema = createInsertSchema(
    wholesaleSizesTable,
).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});

export const insertWholesaleProductSchema = createInsertSchema(
    wholesaleProductsTable,
).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});

export const insertWholesaleOrderSchema = createInsertSchema(
    wholesaleOrdersTable,
).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});

export const insertWholesaleOrderItemSchema = createInsertSchema(
    wholesaleOrderItemsTable,
).omit({
    id: true,
});

// ── Vendor delivery locations (the vendor's own delivery addresses) ──

export const wholesaleVendorLocationsTable = pgTable(
    "wholesale_vendor_locations",
    {
        id: serial("id").primaryKey(),
        wholesaleCustomerId: integer("wholesale_customer_id")
            .notNull()
            .references(() => wholesaleCustomersTable.id, { onDelete: "cascade" }),
        name: text("name").notNull().default("Main"),
        address: text("address").notNull().default(""),
        city: text("city").notNull().default(""),
        state: text("state").notNull().default("PA"),
        zip: text("zip").notNull().default(""),
        phone: text("phone").notNull().default(""),
        notes: text("notes").notNull().default(""),
        isDefault: boolean("is_default").notNull().default(false),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at").defaultNow().notNull(),
    },
    (t) => [unique().on(t.wholesaleCustomerId, t.name)],
);

export const wholesaleVendorLocationsRelations = relations(
    wholesaleVendorLocationsTable,
    ({ one }) => ({
        customer: one(wholesaleCustomersTable, {
            fields: [wholesaleVendorLocationsTable.wholesaleCustomerId],
            references: [wholesaleCustomersTable.id],
        }),
    }),
);

export const insertWholesaleVendorLocationSchema = createInsertSchema(
    wholesaleVendorLocationsTable,
).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});

export const insertWholesaleEmailLogSchema = createInsertSchema(
    wholesaleEmailLogTable,
).omit({
    id: true,
    createdAt: true,
});

// ── Types ──

export type InsertWholesaleCustomer = z.infer<
    typeof insertWholesaleCustomerSchema
>;
export type WholesaleCustomer = typeof wholesaleCustomersTable.$inferSelect;

export type InsertWholesaleFlavour = z.infer<typeof insertWholesaleFlavourSchema>;
export type WholesaleFlavour = typeof wholesaleFlavoursTable.$inferSelect;

export type InsertWholesaleSize = z.infer<typeof insertWholesaleSizeSchema>;
export type WholesaleSize = typeof wholesaleSizesTable.$inferSelect;

export type InsertWholesaleProduct = z.infer<
    typeof insertWholesaleProductSchema
>;
export type WholesaleProduct = typeof wholesaleProductsTable.$inferSelect;

export type InsertWholesaleOrder = z.infer<typeof insertWholesaleOrderSchema>;
export type WholesaleOrder = typeof wholesaleOrdersTable.$inferSelect;

export type InsertWholesaleOrderItem = z.infer<
    typeof insertWholesaleOrderItemSchema
>;
export type WholesaleOrderItem = typeof wholesaleOrderItemsTable.$inferSelect;

export type InsertWholesaleEmailLog = z.infer<
    typeof insertWholesaleEmailLogSchema
>;
export type WholesaleEmailLog = typeof wholesaleEmailLogTable.$inferSelect;
