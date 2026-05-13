import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
    ordersTable,
    orderItemsTable,
    locationsTable,
} from "@workspace/db/schema";
import { eq, and, sql, desc, asc, or, ilike, gte, lte } from "drizzle-orm";
import { updateSquareOrderState } from "../../lib/square";

const router: IRouter = Router();

// Fulfillment summary: aggregate unfulfilled orders by location → flavour × size
router.get("/summary", async (req, res) => {
    const locationId = req.query.locationId
        ? Number(req.query.locationId)
        : undefined;
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;
    const flavourName = req.query.flavourName as string | undefined;

    const conditions = [
        sql`${ordersTable.status} IN ('pending', 'confirmed', 'ready')`,
    ];
    if (locationId) {
        conditions.push(eq(ordersTable.locationId, locationId));
    }
    if (from) {
        conditions.push(gte(ordersTable.createdAt, new Date(from)));
    }
    if (to) {
        const toEnd = new Date(to);
        toEnd.setHours(23, 59, 59, 999);
        conditions.push(lte(ordersTable.createdAt, toEnd));
    }
    if (flavourName) {
        conditions.push(ilike(orderItemsTable.flavourName, flavourName));
    }

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

    // Group by location for easier frontend consumption
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
    const search = (req.query.search as string) || "";
    const locationId = req.query.locationId
        ? Number(req.query.locationId)
        : undefined;
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;
    const flavourName = req.query.flavourName as string | undefined;

    const conditions = [
        sql`${ordersTable.status} IN ('pending', 'confirmed', 'ready')`,
    ];
    if (locationId) {
        conditions.push(eq(ordersTable.locationId, locationId));
    }
    if (from) {
        conditions.push(gte(ordersTable.createdAt, new Date(from)));
    }
    if (to) {
        const toEnd = new Date(to);
        toEnd.setHours(23, 59, 59, 999);
        conditions.push(lte(ordersTable.createdAt, toEnd));
    }
    if (search) {
        conditions.push(
            or(
                ilike(ordersTable.orderNumber, `%${search}%`),
                ilike(ordersTable.customerName, `%${search}%`),
                ilike(ordersTable.customerEmail, `%${search}%`),
            )!,
        );
    }

    // When filtering by flavour, use a subquery to find matching order IDs
    if (flavourName) {
        conditions.push(
            sql`${ordersTable.id} IN (
                SELECT ${orderItemsTable.orderId} FROM ${orderItemsTable}
                WHERE ${orderItemsTable.flavourName} ILIKE ${flavourName}
            )`,
        );
    }

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

    // Attach items for each order
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
            items: itemsByOrder[o.id] || [],
        })),
    );
});

// Mark order as picked up
router.put("/orders/:id/pickup", async (req, res) => {
    const id = Number(req.params.id);

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

    // Push status to Square POS
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
