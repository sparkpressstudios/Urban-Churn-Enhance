import {
    pgTable,
    serial,
    text,
    integer,
    timestamp,
    pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const importStatusEnum = pgEnum("import_status", [
    "pending",
    "processing",
    "completed",
    "failed",
]);

export const importTypeEnum = pgEnum("import_type", [
    "products",
    "orders",
    "customers",
    "coupons",
]);

export const importLogsTable = pgTable("import_logs", {
    id: serial("id").primaryKey(),
    type: importTypeEnum("type").notNull(),
    filename: text("filename").notNull(),
    totalRows: integer("total_rows").notNull().default(0),
    importedRows: integer("imported_rows").notNull().default(0),
    skippedRows: integer("skipped_rows").notNull().default(0),
    errorsJson: text("errors_json").default("[]"),
    status: importStatusEnum("status").notNull().default("pending"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"),
});

export const insertImportLogSchema = createInsertSchema(importLogsTable).omit({
    id: true,
    createdAt: true,
    completedAt: true,
});

export type InsertImportLog = z.infer<typeof insertImportLogSchema>;
export type ImportLog = typeof importLogsTable.$inferSelect;
