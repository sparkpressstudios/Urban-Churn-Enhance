import {
    pgTable,
    serial,
    text,
    integer,
    timestamp,
    pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { customersTable } from "./customers";

export const giftCardStatusEnum = pgEnum("gift_card_status", [
    "pending",
    "active",
    "delivered",
    "failed",
]);

export const giftCardPurchasesTable = pgTable("gift_card_purchases", {
    id: serial("id").primaryKey(),
    orderNumber: text("order_number").notNull().unique(),
    buyerName: text("buyer_name").notNull(),
    buyerEmail: text("buyer_email").notNull(),
    buyerPhone: text("buyer_phone").default(""),
    recipientName: text("recipient_name").notNull(),
    recipientEmail: text("recipient_email").notNull(),
    personalMessage: text("personal_message"),
    amountCents: integer("amount_cents").notNull(),
    squareGiftCardId: text("square_gift_card_id"),
    gan: text("gan"),
    squarePaymentId: text("square_payment_id"),
    squareOrderId: text("square_order_id"),
    status: giftCardStatusEnum("status").notNull().default("pending"),
    deliveredAt: timestamp("delivered_at"),
    customerId: integer("customer_id").references(() => customersTable.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const giftCardPurchasesRelations = relations(giftCardPurchasesTable, ({ one }) => ({
    customer: one(customersTable, {
        fields: [giftCardPurchasesTable.customerId],
        references: [customersTable.id],
    }),
}));

export const insertGiftCardPurchaseSchema = createInsertSchema(giftCardPurchasesTable).omit({
    id: true,
    orderNumber: true,
    createdAt: true,
    updatedAt: true,
});

export type InsertGiftCardPurchase = z.infer<typeof insertGiftCardPurchaseSchema>;
export type GiftCardPurchase = typeof giftCardPurchasesTable.$inferSelect;
