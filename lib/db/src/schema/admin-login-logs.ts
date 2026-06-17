import { pgTable, serial, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { adminUsersTable } from "./admin-users";

export const adminLoginLogsTable = pgTable("admin_login_logs", {
    id: serial("id").primaryKey(),
    adminUserId: integer("admin_user_id").references(() => adminUsersTable.id, { onDelete: "set null" }),
    usernameAttempted: text("username_attempted").notNull(),
    success: boolean("success").notNull().default(false),
    failureReason: text("failure_reason"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const adminLoginLogsRelations = relations(adminLoginLogsTable, ({ one }) => ({
    adminUser: one(adminUsersTable, {
        fields: [adminLoginLogsTable.adminUserId],
        references: [adminUsersTable.id],
    }),
}));

export type AdminLoginLog = typeof adminLoginLogsTable.$inferSelect;
