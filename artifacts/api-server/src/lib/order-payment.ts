import { db } from "@workspace/db";
import {
    couponsTable,
    flavoursTable,
    ordersTable,
    productsTable,
    sizesTable,
} from "@workspace/db/schema";
import { and, eq, sql } from "drizzle-orm";

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

/** Orders eligible for fulfillment emails and auto-ready transitions. */
export function orderIsPaidForFulfillment(paymentStatus: string | null, totalCents: number) {
    return paymentStatus === "paid" || totalCents === 0;
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
