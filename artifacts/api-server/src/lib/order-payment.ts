import { db } from "@workspace/db";
import {
    couponsTable,
    flavoursTable,
    ordersTable,
    orderItemsTable,
    productsTable,
    sizesTable,
} from "@workspace/db/schema";
import { and, eq, sql, type SQL } from "drizzle-orm";

export type OrderPaymentCategory =
    | "valid_paid"
    | "free_order"
    | "unpaid"
    | "payment_failed"
    | "missing_square"
    | "cancelled"
    | "refunded";

export type OrderPaymentValidity = {
    category: OrderPaymentCategory;
    label: string;
    reason: string;
    validForFulfillment: boolean;
};

type OrderPaymentInput = {
    status: string;
    paymentStatus: string | null;
    totalCents: number;
    squarePaymentId?: string | null;
};

/** SQL condition: order is eligible for fulfillment / store pickup queues. */
export function validForFulfillmentSql(): SQL {
    return sql`(
        ${ordersTable.status} NOT IN ('cancelled', 'refunded')
        AND (
            ${ordersTable.totalCents} = 0
            OR (
                ${ordersTable.paymentStatus} = 'paid'
                AND ${ordersTable.squarePaymentId} IS NOT NULL
            )
        )
    )`;
}

export function classifyOrderPayment(order: OrderPaymentInput): OrderPaymentValidity {
    if (order.status === "refunded" || order.paymentStatus === "refunded") {
        return {
            category: "refunded",
            label: "Refunded",
            reason: "This order was refunded and is not eligible for pickup.",
            validForFulfillment: false,
        };
    }

    if (order.status === "cancelled" || order.paymentStatus === "payment_failed") {
        return {
            category: order.paymentStatus === "payment_failed" ? "payment_failed" : "cancelled",
            label: order.paymentStatus === "payment_failed" ? "Payment failed" : "Cancelled",
            reason:
                order.paymentStatus === "payment_failed"
                    ? "Checkout did not complete payment. Do not fulfill this order."
                    : "This order was cancelled and is not eligible for pickup.",
            validForFulfillment: false,
        };
    }

    if (order.totalCents === 0) {
        return {
            category: "free_order",
            label: "Free order",
            reason: "No payment was required for this order.",
            validForFulfillment: true,
        };
    }

    if (!order.paymentStatus || order.paymentStatus !== "paid") {
        return {
            category: "unpaid",
            label: "Unpaid",
            reason: "No successful payment was recorded. The customer was not charged.",
            validForFulfillment: false,
        };
    }

    if (!order.squarePaymentId) {
        return {
            category: "missing_square",
            label: "Missing Square payment",
            reason:
                "Marked paid locally but no Square payment ID is linked. Verify in Square before fulfilling.",
            validForFulfillment: false,
        };
    }

    return {
        category: "valid_paid",
        label: "Paid",
        reason: "Payment confirmed and linked to Square.",
        validForFulfillment: true,
    };
}

export function isOrderValidForFulfillment(order: OrderPaymentInput): boolean {
    return classifyOrderPayment(order).validForFulfillment;
}

/** @deprecated Use isOrderValidForFulfillment */
export function orderIsPaidForFulfillment(paymentStatus: string | null, totalCents: number) {
    return isOrderValidForFulfillment({
        status: "pending",
        paymentStatus,
        totalCents,
        squarePaymentId: paymentStatus === "paid" && totalCents > 0 ? "linked" : null,
    });
}

export type ResolvedOrderLine = {
    flavourName: string;
    sizeName: string;
    priceCents: number;
    quantity: number;
    productId: number | null;
};

/** Resolve authoritative line price from the products catalog (not client-submitted prices). */
export async function resolveOrderLineFromCatalog(
    flavourName: string,
    sizeName: string,
    productId?: number | null,
): Promise<ResolvedOrderLine | null> {
    const baseQuery = db
        .select({
            productId: productsTable.id,
            flavourName: flavoursTable.name,
            sizeName: sizesTable.name,
            priceOverride: productsTable.priceOverride,
            sizePrice: sizesTable.price,
        })
        .from(productsTable)
        .innerJoin(flavoursTable, eq(productsTable.flavourId, flavoursTable.id))
        .innerJoin(sizesTable, eq(productsTable.sizeId, sizesTable.id));

    const [row] = await (productId
        ? baseQuery.where(
              and(eq(productsTable.id, productId), eq(productsTable.available, true)),
          )
        : baseQuery.where(
              and(
                  eq(flavoursTable.name, flavourName),
                  eq(sizesTable.name, sizeName),
                  eq(productsTable.available, true),
              ),
          )
    ).limit(1);

    if (!row) return null;

    const unitPrice =
        row.priceOverride != null && row.priceOverride !== ""
            ? parseFloat(String(row.priceOverride))
            : parseFloat(String(row.sizePrice));
    if (Number.isNaN(unitPrice) || unitPrice < 0) return null;

    return {
        flavourName: row.flavourName,
        sizeName: row.sizeName,
        priceCents: Math.round(unitPrice * 100),
        quantity: 1,
        productId: row.productId,
    };
}

/** Look up a successfully paid order for idempotent checkout retries. */
export async function findPaidOrderByCheckoutId(checkoutId: string) {
    const [order] = await db
        .select()
        .from(ordersTable)
        .where(and(eq(ordersTable.checkoutId, checkoutId), eq(ordersTable.paymentStatus, "paid")))
        .limit(1);
    if (!order) return null;

    const items = await db
        .select()
        .from(orderItemsTable)
        .where(eq(orderItemsTable.orderId, order.id));

    return { order, items };
}

/** Cancel an unpaid order and restore inventory / coupon usage after a failed charge. */
export async function revertUnpaidOrder(
    orderId: number,
    couponId: number | null,
    items: { productId: number | null; quantity: number }[],
) {
    await db.transaction(async (tx) => {
        if (couponId) {
            await tx
                .update(couponsTable)
                .set({
                    usageCount: sql`GREATEST(${couponsTable.usageCount} - 1, 0)`,
                })
                .where(eq(couponsTable.id, couponId));
        }

        for (const item of items) {
            if (!item.productId) continue;
            await tx
                .update(productsTable)
                .set({
                    stockQuantity: sql`${productsTable.stockQuantity} + ${item.quantity}`,
                })
                .where(
                    and(
                        eq(productsTable.id, item.productId),
                        eq(productsTable.manageStock, true),
                    ),
                );
        }

        await tx
            .update(ordersTable)
            .set({
                status: "cancelled",
                paymentStatus: "payment_failed",
                updatedAt: new Date(),
            })
            .where(eq(ordersTable.id, orderId));
    });
}

/** Verify managed-stock products have enough quantity before charging the card. */
export async function assertOrderStockAvailable(
    items: { productId: number | null; quantity: number; flavourName: string; sizeName: string }[],
) {
    const { db } = await import("@workspace/db");
    const { productsTable } = await import("@workspace/db/schema");
    const { eq, and } = await import("drizzle-orm");

    for (const item of items) {
        if (!item.productId) continue;
        const [product] = await db
            .select({
                manageStock: productsTable.manageStock,
                stockQuantity: productsTable.stockQuantity,
            })
            .from(productsTable)
            .where(eq(productsTable.id, item.productId))
            .limit(1);
        if (product?.manageStock && product.stockQuantity < item.quantity) {
            throw new Error(
                `STOCK_ERROR:Not enough stock for ${item.flavourName} (${item.sizeName}). Please reduce quantity or remove the item.`,
            );
        }
    }
}
