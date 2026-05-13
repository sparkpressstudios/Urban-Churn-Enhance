import {
    pgTable,
    serial,
    text,
    integer,
    boolean,
    timestamp,
    pgEnum,
    numeric,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const couponTypeEnum = pgEnum("coupon_type", [
    "percentage",
    "fixed",
]);

export const couponsTable = pgTable("coupons", {
    id: serial("id").primaryKey(),
    code: text("code").notNull().unique(),
    description: text("description").notNull().default(""),
    type: couponTypeEnum("type").notNull().default("percentage"),
    value: numeric("value", { precision: 10, scale: 2 }).notNull(),
    minOrderCents: integer("min_order_cents").notNull().default(0),
    maxUsageCount: integer("max_usage_count"),
    usageCount: integer("usage_count").notNull().default(0),
    active: boolean("active").notNull().default(true),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCouponSchema = createInsertSchema(couponsTable).omit({
    id: true,
    usageCount: true,
    createdAt: true,
});

export type InsertCoupon = z.infer<typeof insertCouponSchema>;
export type Coupon = typeof couponsTable.$inferSelect;
