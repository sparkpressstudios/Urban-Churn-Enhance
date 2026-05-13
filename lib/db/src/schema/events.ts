import {
    pgTable,
    serial,
    text,
    boolean,
    integer,
    timestamp,
    date,
    pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { locationsTable } from "./locations";

// ── Enums ──

export const eventCategoryEnum = pgEnum("event_category", [
    "tasting",
    "festival",
    "pop_up",
    "trivia",
    "party",
    "other",
]);

export const eventStatusEnum = pgEnum("event_status", [
    "draft",
    "published",
    "sold_out",
    "cancelled",
    "completed",
]);

export const eventOrderStatusEnum = pgEnum("event_order_status", [
    "pending",
    "confirmed",
    "cancelled",
    "refunded",
]);

export const eventTicketStatusEnum = pgEnum("event_ticket_status", [
    "active",
    "cancelled",
    "refunded",
]);

// ── Tables ──

export const eventsTable = pgTable("events", {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description").notNull().default(""),
    imageUrl: text("image_url"),
    locationId: integer("location_id").references(() => locationsTable.id),
    venueName: text("venue_name"),
    venueAddress: text("venue_address"),
    eventDate: date("event_date").notNull(),
    startTime: text("start_time").notNull(),
    endTime: text("end_time"),
    category: eventCategoryEnum("category").notNull().default("other"),
    status: eventStatusEnum("status").notNull().default("draft"),
    isPrivate: boolean("is_private").notNull().default(false),
    recurringGroupId: text("recurring_group_id"),
    accentColor: text("accent_color").default("#A1AB74"),
    sortOrder: integer("sort_order").notNull().default(0),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const eventTicketTypesTable = pgTable("event_ticket_types", {
    id: serial("id").primaryKey(),
    eventId: integer("event_id")
        .notNull()
        .references(() => eventsTable.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    priceCents: integer("price_cents").notNull(),
    quantity: integer("quantity").notNull(),
    quantitySold: integer("quantity_sold").notNull().default(0),
    maxPerOrder: integer("max_per_order").notNull().default(10),
    sortOrder: integer("sort_order").notNull().default(0),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const eventOrdersTable = pgTable("event_orders", {
    id: serial("id").primaryKey(),
    orderNumber: text("order_number").notNull().unique(),
    eventId: integer("event_id")
        .notNull()
        .references(() => eventsTable.id),
    customerName: text("customer_name").notNull(),
    customerEmail: text("customer_email").notNull(),
    customerPhone: text("customer_phone").notNull().default(""),
    status: eventOrderStatusEnum("status").notNull().default("pending"),
    totalCents: integer("total_cents").notNull().default(0),
    squareOrderId: text("square_order_id"),
    squarePaymentId: text("square_payment_id"),
    notes: text("notes").default(""),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const eventOrderItemsTable = pgTable("event_order_items", {
    id: serial("id").primaryKey(),
    eventOrderId: integer("event_order_id")
        .notNull()
        .references(() => eventOrdersTable.id, { onDelete: "cascade" }),
    ticketTypeId: integer("ticket_type_id")
        .notNull()
        .references(() => eventTicketTypesTable.id),
    ticketTypeName: text("ticket_type_name").notNull(),
    priceCents: integer("price_cents").notNull(),
    quantity: integer("quantity").notNull().default(1),
});

export const eventTicketsTable = pgTable("event_tickets", {
    id: serial("id").primaryKey(),
    eventOrderId: integer("event_order_id")
        .notNull()
        .references(() => eventOrdersTable.id, { onDelete: "cascade" }),
    eventId: integer("event_id")
        .notNull()
        .references(() => eventsTable.id),
    ticketTypeId: integer("ticket_type_id")
        .notNull()
        .references(() => eventTicketTypesTable.id),
    ticketCode: text("ticket_code").notNull().unique(),
    attendeeName: text("attendee_name"),
    attendeeEmail: text("attendee_email"),
    status: eventTicketStatusEnum("status").notNull().default("active"),
    checkedIn: boolean("checked_in").notNull().default(false),
    checkedInAt: timestamp("checked_in_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const eventQuestionsTable = pgTable("event_questions", {
    id: serial("id").primaryKey(),
    eventId: integer("event_id")
        .notNull()
        .references(() => eventsTable.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    message: text("message").notNull(),
    read: boolean("read").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Relations ──

export const eventsRelations = relations(eventsTable, ({ one, many }) => ({
    location: one(locationsTable, {
        fields: [eventsTable.locationId],
        references: [locationsTable.id],
    }),
    ticketTypes: many(eventTicketTypesTable),
    orders: many(eventOrdersTable),
    tickets: many(eventTicketsTable),
    questions: many(eventQuestionsTable),
}));

export const eventTicketTypesRelations = relations(
    eventTicketTypesTable,
    ({ one, many }) => ({
        event: one(eventsTable, {
            fields: [eventTicketTypesTable.eventId],
            references: [eventsTable.id],
        }),
        orderItems: many(eventOrderItemsTable),
    }),
);

export const eventOrdersRelations = relations(
    eventOrdersTable,
    ({ one, many }) => ({
        event: one(eventsTable, {
            fields: [eventOrdersTable.eventId],
            references: [eventsTable.id],
        }),
        items: many(eventOrderItemsTable),
        tickets: many(eventTicketsTable),
    }),
);

export const eventOrderItemsRelations = relations(
    eventOrderItemsTable,
    ({ one }) => ({
        order: one(eventOrdersTable, {
            fields: [eventOrderItemsTable.eventOrderId],
            references: [eventOrdersTable.id],
        }),
        ticketType: one(eventTicketTypesTable, {
            fields: [eventOrderItemsTable.ticketTypeId],
            references: [eventTicketTypesTable.id],
        }),
    }),
);

export const eventTicketsRelations = relations(
    eventTicketsTable,
    ({ one }) => ({
        order: one(eventOrdersTable, {
            fields: [eventTicketsTable.eventOrderId],
            references: [eventOrdersTable.id],
        }),
        event: one(eventsTable, {
            fields: [eventTicketsTable.eventId],
            references: [eventsTable.id],
        }),
        ticketType: one(eventTicketTypesTable, {
            fields: [eventTicketsTable.ticketTypeId],
            references: [eventTicketTypesTable.id],
        }),
    }),
);

export const eventQuestionsRelations = relations(
    eventQuestionsTable,
    ({ one }) => ({
        event: one(eventsTable, {
            fields: [eventQuestionsTable.eventId],
            references: [eventsTable.id],
        }),
    }),
);

// ── Insert Schemas ──

export const insertEventSchema = createInsertSchema(eventsTable).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});

export const insertEventTicketTypeSchema = createInsertSchema(
    eventTicketTypesTable,
).omit({
    id: true,
    quantitySold: true,
    createdAt: true,
    updatedAt: true,
});

export const insertEventOrderSchema = createInsertSchema(
    eventOrdersTable,
).omit({
    id: true,
    orderNumber: true,
    createdAt: true,
    updatedAt: true,
});

export const insertEventOrderItemSchema = createInsertSchema(
    eventOrderItemsTable,
).omit({
    id: true,
});

export const insertEventTicketSchema = createInsertSchema(
    eventTicketsTable,
).omit({
    id: true,
    checkedIn: true,
    checkedInAt: true,
    createdAt: true,
    updatedAt: true,
});

// ── Types ──

export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof eventsTable.$inferSelect;

export type InsertEventTicketType = z.infer<typeof insertEventTicketTypeSchema>;
export type EventTicketType = typeof eventTicketTypesTable.$inferSelect;

export type InsertEventOrder = z.infer<typeof insertEventOrderSchema>;
export type EventOrder = typeof eventOrdersTable.$inferSelect;

export type InsertEventOrderItem = z.infer<typeof insertEventOrderItemSchema>;
export type EventOrderItem = typeof eventOrderItemsTable.$inferSelect;

export type InsertEventTicket = z.infer<typeof insertEventTicketSchema>;
export type EventTicket = typeof eventTicketsTable.$inferSelect;

export type EventQuestion = typeof eventQuestionsTable.$inferSelect;
