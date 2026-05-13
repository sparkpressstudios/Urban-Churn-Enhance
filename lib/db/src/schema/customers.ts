import {
    pgTable,
    serial,
    text,
    integer,
    timestamp,
    boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { wholesaleCustomersTable } from "./wholesale";

export const customersTable = pgTable("customers", {
    id: serial("id").primaryKey(),
    email: text("email").notNull().unique(),
    firstName: text("first_name").notNull().default(""),
    lastName: text("last_name").notNull().default(""),
    phone: text("phone").notNull().default(""),
    address: text("address").notNull().default(""),
    city: text("city").notNull().default(""),
    state: text("state").notNull().default(""),
    zip: text("zip").notNull().default(""),
    country: text("country").notNull().default("US"),
    wooCustomerId: integer("woo_customer_id"),
    squareCustomerId: text("square_customer_id"),
    ordersCount: integer("orders_count").notNull().default(0),
    totalSpentCents: integer("total_spent_cents").notNull().default(0),
    // Wholesale link
    wholesaleCustomerId: integer("wholesale_customer_id").references(
        () => wholesaleCustomersTable.id,
    ),
    // Auth fields
    passwordHash: text("password_hash"),
    hasAccount: boolean("has_account").notNull().default(false),
    resetToken: text("reset_token"),
    resetTokenExpiresAt: timestamp("reset_token_expires_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCustomerSchema = createInsertSchema(customersTable).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});

export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customersTable.$inferSelect;
