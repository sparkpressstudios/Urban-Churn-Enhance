import { pgTable, serial, text, integer, timestamp, pgEnum, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { locationsTable } from "./locations";
import { wholesaleCustomersTable } from "./wholesale";

export const adminRoleEnum = pgEnum("admin_role", [
    "admin",
    "manager",
    "staff",
]);

export const adminUsersTable = pgTable("admin_users", {
    id: serial("id").primaryKey(),
    username: text("username").notNull().unique(),
    email: text("email"),
    passwordHash: text("password_hash").notNull(),
    role: adminRoleEnum("role").notNull().default("staff"),
    assignedLocationId: integer("assigned_location_id").references(() => locationsTable.id),
    wholesaleCustomerId: integer("wholesale_customer_id").references(() => wholesaleCustomersTable.id),
    mustChangePassword: boolean("must_change_password").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAdminUserSchema = createInsertSchema(adminUsersTable).omit({
    id: true,
    createdAt: true,
});

export type InsertAdminUser = z.infer<typeof insertAdminUserSchema>;
export type AdminUser = typeof adminUsersTable.$inferSelect;
