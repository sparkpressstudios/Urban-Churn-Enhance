import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
    ordersTable,
    orderItemsTable,
    locationsTable,
} from "@workspace/db/schema";
import { eq, and, sql, desc, asc } from "drizzle-orm";
import { updateSquareOrderState } from "../../lib/square";
import { classifyOrderPayment } from "../../lib/order-payment";
import {
    buildFulfillmentItemConditions,
    buildFulfillmentOrderConditions,
    generateFulfillmentCsv,
    parseFulfillmentFilters,
    type FulfillmentExportFormat,
} from "../../lib/fulfillment-export";

const router: IRouter = Router();

// Fulfillment summary: aggregate unfulfilled orders by location → flavour × size
router.get("/summary", async (req, res) => {
    const filters = parseFulfillmentFilters(req.query);
    const conditions = buildFulfillmentItemConditions(filters);

    const rows = await db
        .select({
            locationId: ordersTable.locationId,
            locationName: locationsTable.name,
            flavourName: orderItemsTable.flavourName,
            sizeName: orderItemsTable.sizeName,
            totalQuantity:
                sql<number>`COALESCE(SUM(${orderItemsTable.quantity}), 0)`.as(
                    "total_quantity",
                ),
            orderCount:
                sql<number>`COUNT(DISTINCT ${ordersTable.id})`.as("order_count"),
        })
        .from(orderItemsTable)
        .innerJoin(ordersTable, eq(orderItemsTable.orderId, ordersTable.id))
        .innerJoin(
            locationsTable,
            eq(ordersTable.locationId, locationsTable.id),
        )
        .where(and(...conditions))
        .groupBy(
            ordersTable.locationId,
            locationsTable.name,
            orderItemsTable.flavourName,
            orderItemsTable.sizeName,
        )
        .orderBy(
            asc(locationsTable.name),
            asc(orderItemsTable.flavourName),
            asc(orderItemsTable.sizeName),
        );

    const byLocation: Record<
        number,
        {
            locationId: number;
            locationName: string;
            items: {
                flavourName: string;
                sizeName: string;
                totalQuantity: number;
                orderCount: number;
            }[];
        }
    > = {};

    for (const row of rows) {
        if (!byLocation[row.locationId]) {
            byLocation[row.locationId] = {
                locationId: row.locationId,
                locationName: row.locationName,
                items: [],
            };
        }
        byLocation[row.locationId].items.push({
            flavourName: row.flavourName,
            sizeName: row.sizeName,
            totalQuantity: Number(row.totalQuantity),
            orderCount: Number(row.orderCount),
        });
    }

    res.json(Object.values(byLocation));
});

// Fulfillment orders: searchable list of unfulfilled orders for pickup
router.get("/orders", async (req, res) => {
    const filters = parseFulfillmentFilters(req.query);
    const conditions = buildFulfillmentOrderConditions(filters);

    const orders = await db
        .select({
            id: ordersTable.id,
            orderNumber: ordersTable.orderNumber,
            locationId: ordersTable.locationId,
            locationName: locationsTable.name,
            customerName: ordersTable.customerName,
            customerEmail: ordersTable.customerEmail,
            customerPhone: ordersTable.customerPhone,
            status: ordersTable.status,
            totalCents: ordersTable.totalCents,
            paymentStatus: ordersTable.paymentStatus,
            squarePaymentId: ordersTable.squarePaymentId,
            squareOrderId: ordersTable.squareOrderId,
            createdAt: ordersTable.createdAt,
        })
        .from(ordersTable)
        .innerJoin(
            locationsTable,
            eq(ordersTable.locationId, locationsTable.id),
        )
        .where(and(...conditions))
        .orderBy(desc(ordersTable.createdAt))
        .limit(100);

    const orderIds = orders.map((o) => o.id);
    const items =
        orderIds.length > 0
            ? await db
                .select()
                .from(orderItemsTable)
                .where(
                    sql`${orderItemsTable.orderId} IN (${sql.join(
                        orderIds.map((id) => sql`${id}`),
                        sql`, `,
                    )})`,
                )
            : [];

    const itemsByOrder: Record<number, typeof items> = {};
    for (const item of items) {
        if (!itemsByOrder[item.orderId]) itemsByOrder[item.orderId] = [];
        itemsByOrder[item.orderId].push(item);
    }

    res.json(
        orders.map((o) => ({
            ...o,
            paymentValidity: classifyOrderPayment({
                status: o.status,
                paymentStatus: o.paymentStatus,
                totalCents: o.totalCents,
                squarePaymentId: o.squarePaymentId,
            }),
            items: itemsByOrder[o.id] || [],
        })),
    );
});

// CSV export for fulfillment (summary or line-item detail)
router.get("/export/csv", async (req, res) => {
    const format: FulfillmentExportFormat =
        req.query.format === "summary" ? "summary" : "detail";
    const filters = parseFulfillmentFilters(req.query);

    const csv = await generateFulfillmentCsv(format, filters);
    const date = new Date().toISOString().split("T")[0];
    const prefix =
        format === "summary" ? "fulfillment-summary" : "fulfillment-orders";

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
        "Content-Disposition",
        `attachment; filename="${prefix}-${date}.csv"`,
    );
    res.send("\uFEFF" + csv);
});

// Mark order as picked up
router.put("/orders/:id/pickup", async (req, res) => {
    const id = Number(req.params.id);

    const [existing] = await db
        .select()
        .from(ordersTable)
        .where(eq(ordersTable.id, id))
        .limit(1);

    if (!existing) {
        res.status(404).json({ error: "Order not found" });
        return;
    }

    const paymentValidity = classifyOrderPayment({
        status: existing.status,
        paymentStatus: existing.paymentStatus,
        totalCents: existing.totalCents,
        squarePaymentId: existing.squarePaymentId,
    });
    if (!paymentValidity.validForFulfillment) {
        res.status(400).json({ error: paymentValidity.reason, paymentValidity });
        return;
    }

    const [order] = await db
        .update(ordersTable)
        .set({ status: "picked_up", updatedAt: new Date() })
        .where(
            and(
                eq(ordersTable.id, id),
                sql`${ordersTable.status} IN ('pending', 'confirmed', 'ready')`,
            ),
        )
        .returning();

    if (!order) {
        res.status(404).json({
            error: "Order not found or already picked up/cancelled",
        });
        return;
    }

    let squareSyncError = false;
    if (order.squareOrderId) {
        const [loc] = await db
            .select({ squareLocationId: locationsTable.squareLocationId })
            .from(locationsTable)
            .where(eq(locationsTable.id, order.locationId))
            .limit(1);
        if (loc?.squareLocationId) {
            try {
                await updateSquareOrderState(order.squareOrderId, loc.squareLocationId, "COMPLETED");
                await db.update(ordersTable).set({ lastSyncSource: "web" }).where(eq(ordersTable.id, order.id));
            } catch (e) {
                console.error("[SQUARE] Failed to update order state:", e);
                squareSyncError = true;
            }
        }
    }

    res.json({ ...order, squareSyncError });
});

// Mark order as ready for pickup
router.put("/orders/:id/ready", async (req, res) => {
    const id = Number(req.params.id);

    const [existing] = await db
        .select()
        .from(ordersTable)
        .where(eq(ordersTable.id, id))
        .limit(1);

    if (!existing) {
        res.status(404).json({ error: "Order not found" });
        return;
    }

    const paymentValidity = classifyOrderPayment({
        status: existing.status,
        paymentStatus: existing.paymentStatus,
        totalCents: existing.totalCents,
        squarePaymentId: existing.squarePaymentId,
    });
    if (!paymentValidity.validForFulfillment) {
        res.status(400).json({ error: paymentValidity.reason, paymentValidity });
        return;
    }

    const [order] = await db
        .update(ordersTable)
        .set({ status: "ready", updatedAt: new Date() })
        .where(
            and(
                eq(ordersTable.id, id),
                sql`${ordersTable.status} IN ('pending', 'confirmed')`,
            ),
        )
        .returning();

    if (!order) {
        res.status(404).json({
            error: "Order not found or cannot be marked ready",
        });
        return;
    }

    res.json(order);
});

export default router;
