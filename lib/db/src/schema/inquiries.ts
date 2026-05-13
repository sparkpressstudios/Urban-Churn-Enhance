import {
    pgTable,
    serial,
    text,
    integer,
    timestamp,
    pgEnum,
    jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// ── Enums ──

export const inquiryTypeEnum = pgEnum("inquiry_type", [
    "contact",
    "wholesale",
    "catering",
    "fundraising",
    "bakery",
]);

export const inquiryStatusEnum = pgEnum("inquiry_status", [
    "new",
    "follow_up",
    "contacted",
    "completed",
    "archived",
]);

// ── Tables ──

export const inquiriesTable = pgTable("inquiries", {
    id: serial("id").primaryKey(),
    type: inquiryTypeEnum("type").notNull(),
    status: inquiryStatusEnum("status").notNull().default("new"),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    subject: text("subject"),
    message: text("message"),
    formData: jsonb("form_data").notNull().default({}),
    assignedTo: text("assigned_to"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const inquiryNotesTable = pgTable("inquiry_notes", {
    id: serial("id").primaryKey(),
    inquiryId: integer("inquiry_id")
        .notNull()
        .references(() => inquiriesTable.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    author: text("author").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Relations ──

export const inquiriesRelations = relations(inquiriesTable, ({ many }) => ({
    notes: many(inquiryNotesTable),
}));

export const inquiryNotesRelations = relations(inquiryNotesTable, ({ one }) => ({
    inquiry: one(inquiriesTable, {
        fields: [inquiryNotesTable.inquiryId],
        references: [inquiriesTable.id],
    }),
}));

// ── Insert Schemas ──

export const insertInquirySchema = createInsertSchema(inquiriesTable).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});

export const insertInquiryNoteSchema = createInsertSchema(inquiryNotesTable).omit({
    id: true,
    createdAt: true,
});

// ── Types ──

export type InsertInquiry = z.infer<typeof insertInquirySchema>;
export type Inquiry = typeof inquiriesTable.$inferSelect;

export type InsertInquiryNote = z.infer<typeof insertInquiryNoteSchema>;
export type InquiryNote = typeof inquiryNotesTable.$inferSelect;
