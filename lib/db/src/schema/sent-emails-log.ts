import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const sentEmailsLogTable = pgTable("sent_emails_log", {
    id: serial("id").primaryKey(),
    toEmail: text("to_email").notNull(),
    subject: text("subject").notNull().default(""),
    emailType: text("email_type").notNull().default("general"),
    resendId: text("resend_id"),
    status: text("status").notNull().default("sent"), // sent | failed
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});
