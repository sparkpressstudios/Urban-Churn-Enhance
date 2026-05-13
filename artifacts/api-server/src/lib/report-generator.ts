import { db } from "@workspace/db";
import {
    productPreOrdersTable,
    ordersTable,
    orderItemsTable,
    flavoursTable,
} from "@workspace/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";

export interface FulfillmentLineItem {
    orderType: string;
    details: string;
    quantity: number;
    orderCount: number;
}

export interface FulfillmentReport {
    preOrderId: number;
    label: string;
    totalOrders: number;
    totalRevenueCents: number;
    lineItems: FulfillmentLineItem[];
}

export async function generateFulfillmentReport(
    preOrderId: number,
): Promise<FulfillmentReport> {
    const [preOrder] = await db
        .select()
        .from(productPreOrdersTable)
        .where(eq(productPreOrdersTable.id, preOrderId))
        .limit(1);

    if (!preOrder) {
        throw new Error(`Pre-order ${preOrderId} not found`);
    }

    // Get the flavour name for this pre-order window
    let flavourName: string | null = null;
    if (preOrder.flavourId) {
        const [flavour] = await db
            .select({ name: flavoursTable.name })
            .from(flavoursTable)
            .where(eq(flavoursTable.id, preOrder.flavourId))
            .limit(1);
        flavourName = flavour?.name ?? null;
    }

    const label = `Pre-Order #${preOrder.id}${flavourName ? ` — ${flavourName}` : ""}`;

    // Find orders created during this pre-order window period
    // that contain items matching the pre-order's flavour
    const windowStart = preOrder.preOrderStart;
    const windowEnd = preOrder.preOrderEnd;

    // Get all orders placed during the window
    const orders = await db
        .select({
            id: ordersTable.id,
            totalCents: ordersTable.totalCents,
        })
        .from(ordersTable)
        .where(
            and(
                gte(ordersTable.createdAt, windowStart),
                lte(ordersTable.createdAt, windowEnd),
            ),
        );

    if (orders.length === 0) {
        return {
            preOrderId,
            label,
            totalOrders: 0,
            totalRevenueCents: 0,
            lineItems: [],
        };
    }

    const orderIds = orders.map((o) => o.id);

    // Get items from those orders, optionally filtered by flavour name
    const itemConditions = [
        sql`${orderItemsTable.orderId} IN (${sql.join(orderIds.map((id) => sql`${id}`), sql`, `)})`,
    ];
    if (flavourName) {
        itemConditions.push(eq(orderItemsTable.flavourName, flavourName));
    }

    const items = await db
        .select({
            flavourName: orderItemsTable.flavourName,
            sizeName: orderItemsTable.sizeName,
            quantity: orderItemsTable.quantity,
            orderId: orderItemsTable.orderId,
        })
        .from(orderItemsTable)
        .where(and(...itemConditions));

    // Aggregate by flavour+size
    const aggregated = new Map<string, { quantity: number; orderIds: Set<number> }>();
    for (const item of items) {
        const key = `${item.flavourName}|||${item.sizeName}`;
        const existing = aggregated.get(key);
        if (existing) {
            existing.quantity += item.quantity;
            existing.orderIds.add(item.orderId);
        } else {
            aggregated.set(key, {
                quantity: item.quantity,
                orderIds: new Set([item.orderId]),
            });
        }
    }

    const lineItems: FulfillmentLineItem[] = [];
    for (const [key, data] of aggregated) {
        const [fName, sName] = key.split("|||");
        lineItems.push({
            orderType: fName,
            details: sName,
            quantity: data.quantity,
            orderCount: data.orderIds.size,
        });
    }

    // Sort by quantity descending
    lineItems.sort((a, b) => b.quantity - a.quantity);

    // Calculate totals — count unique orders that had matching items
    const uniqueOrderIds = new Set(items.map((i) => i.orderId));
    const matchingOrders = orders.filter((o) => uniqueOrderIds.has(o.id));
    const totalRevenueCents = matchingOrders.reduce((sum, o) => sum + o.totalCents, 0);

    return {
        preOrderId,
        label,
        totalOrders: uniqueOrderIds.size,
        totalRevenueCents,
        lineItems,
    };
}

export async function generateFulfillmentCsv(preOrderId: number): Promise<string> {
    const report = await generateFulfillmentReport(preOrderId);

    const headers = ["Order Type", "Details", "Quantity", "Order Count"];
    const rows = report.lineItems.map((item) => [
        item.orderType,
        item.details,
        item.quantity.toString(),
        item.orderCount.toString(),
    ]);

    rows.push([]);
    rows.push(["SUMMARY"]);
    rows.push(["Total Orders", report.totalOrders.toString()]);
    rows.push(["Total Revenue", `$${(report.totalRevenueCents / 100).toFixed(2)}`]);

    const csvContent = [
        headers.join(","),
        ...rows.map((r) =>
            Array.isArray(r) && r.length > 0
                ? r.map((v) => `"${(v || "").replace(/"/g, '""')}"`).join(",")
                : "",
        ),
    ].join("\n");

    return csvContent;
}
