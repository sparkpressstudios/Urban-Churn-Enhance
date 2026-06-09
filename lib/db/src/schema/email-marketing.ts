import {
    pgTable,
    serial,
    text,
    integer,
    timestamp,
    pgEnum,
    jsonb,
    boolean,
    uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { adminUsersTable } from "./admin-users";

export const emailMarketingStatusEnum = pgEnum("email_marketing_status", [
    "subscribed",
    "unsubscribed",
    "bounced",
    "complained",
]);

export const emailContactSourceEnum = pgEnum("email_contact_source", [
    "manual",
    "import",
    "customer_sync",
    "inquiry_sync",
    "square_sync",
]);

export const emailSegmentTypeEnum = pgEnum("email_segment_type", ["static", "dynamic"]);

export const emailTemplateStatusEnum = pgEnum("email_template_status", [
    "draft",
    "published",
]);

export const emailCampaignStatusEnum = pgEnum("email_campaign_status", [
    "draft",
    "scheduled",
    "sending",
    "sent",
    "cancelled",
]);

export const emailImportStatusEnum = pgEnum("email_import_status", [
    "pending",
    "processing",
    "completed",
    "failed",
]);

const EMPTY_EMAIL_DOCUMENT = { version: 1, sections: [], globalStyles: {} } as const;

export const emailContactsTable = pgTable(
    "email_contacts",
    {
        id: serial("id").primaryKey(),
        email: text("email").notNull(),
        firstName: text("first_name").notNull().default(""),
        lastName: text("last_name").notNull().default(""),
        phone: text("phone").notNull().default(""),
        address: text("address").notNull().default(""),
        city: text("city").notNull().default(""),
        state: text("state").notNull().default(""),
        zip: text("zip").notNull().default(""),
        country: text("country").notNull().default("US"),
        customProperties: jsonb("custom_properties").notNull().default({}),
        marketingStatus: emailMarketingStatusEnum("marketing_status")
            .notNull()
            .default("subscribed"),
        consentSource: text("consent_source").notNull().default(""),
        consentAt: timestamp("consent_at"),
        resendContactId: text("resend_contact_id"),
        source: emailContactSourceEnum("source").notNull().default("manual"),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at").defaultNow().notNull(),
    },
    (table) => [uniqueIndex("email_contacts_email_unique").on(table.email)],
);

export const emailSegmentsTable = pgTable("email_segments", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    type: emailSegmentTypeEnum("type").notNull().default("static"),
    rules: jsonb("rules"),
    resendSegmentId: text("resend_segment_id"),
    contactCount: integer("contact_count").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const emailSegmentMembersTable = pgTable(
    "email_segment_members",
    {
        id: serial("id").primaryKey(),
        segmentId: integer("segment_id")
            .notNull()
            .references(() => emailSegmentsTable.id, { onDelete: "cascade" }),
        contactId: integer("contact_id")
            .notNull()
            .references(() => emailContactsTable.id, { onDelete: "cascade" }),
        addedAt: timestamp("added_at").defaultNow().notNull(),
    },
    (table) => [
        uniqueIndex("email_segment_members_unique").on(
            table.segmentId,
            table.contactId,
        ),
    ],
);

export const emailTemplateRevisionsTable = pgTable("email_template_revisions", {
    id: serial("id").primaryKey(),
    templateId: integer("template_id")
        .notNull()
        .references(() => emailTemplatesTable.id, { onDelete: "cascade" }),
    document: jsonb("document").notNull(),
    label: text("label"),
    createdBy: integer("created_by").references(() => adminUsersTable.id, {
        onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const emailTopicsTable = pgTable("email_topics", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    resendTopicId: text("resend_topic_id"),
    defaultOptIn: boolean("default_opt_in").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const emailTemplatesTable = pgTable("email_templates", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    document: jsonb("document").notNull().default(EMPTY_EMAIL_DOCUMENT),
    compiledHtml: text("compiled_html").notNull().default(""),
    status: emailTemplateStatusEnum("status").notNull().default("draft"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const emailCampaignsTable = pgTable("email_campaigns", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    subject: text("subject").notNull().default(""),
    previewText: text("preview_text").notNull().default(""),
    templateId: integer("template_id").references(() => emailTemplatesTable.id, {
        onDelete: "set null",
    }),
    segmentId: integer("segment_id").references(() => emailSegmentsTable.id, {
        onDelete: "set null",
    }),
    topicId: integer("topic_id").references(() => emailTopicsTable.id, {
        onDelete: "set null",
    }),
    fromEmail: text("from_email").notNull().default(""),
    replyTo: text("reply_to").notNull().default(""),
    status: emailCampaignStatusEnum("status").notNull().default("draft"),
    resendBroadcastId: text("resend_broadcast_id"),
    scheduledAt: timestamp("scheduled_at"),
    sentAt: timestamp("sent_at"),
    stats: jsonb("stats").notNull().default({
        sent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        bounced: 0,
        complained: 0,
    }),
    createdBy: integer("created_by").references(() => adminUsersTable.id, {
        onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const emailCampaignEventsTable = pgTable("email_campaign_events", {
    id: serial("id").primaryKey(),
    campaignId: integer("campaign_id")
        .notNull()
        .references(() => emailCampaignsTable.id, { onDelete: "cascade" }),
    contactId: integer("contact_id").references(() => emailContactsTable.id, {
        onDelete: "set null",
    }),
    email: text("email").notNull().default(""),
    eventType: text("event_type").notNull(),
    resendEmailId: text("resend_email_id"),
    resendEventId: text("resend_event_id"),
    metadata: jsonb("metadata").notNull().default({}),
    occurredAt: timestamp("occurred_at").defaultNow().notNull(),
});

export const emailImportJobsTable = pgTable("email_import_jobs", {
    id: serial("id").primaryKey(),
    filename: text("filename").notNull(),
    totalRows: integer("total_rows").notNull().default(0),
    importedRows: integer("imported_rows").notNull().default(0),
    skippedRows: integer("skipped_rows").notNull().default(0),
    errorsJson: text("errors_json").notNull().default("[]"),
    status: emailImportStatusEnum("status").notNull().default("pending"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"),
});

export const insertEmailContactSchema = createInsertSchema(emailContactsTable).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});

export type InsertEmailContact = z.infer<typeof insertEmailContactSchema>;
export type EmailContact = typeof emailContactsTable.$inferSelect;
export type EmailSegment = typeof emailSegmentsTable.$inferSelect;
export type EmailTemplate = typeof emailTemplatesTable.$inferSelect;
export type EmailCampaign = typeof emailCampaignsTable.$inferSelect;
