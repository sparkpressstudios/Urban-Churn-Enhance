import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
    ordersTable,
    orderItemsTable,
    locationsTable,
    orderNotesTable,
} from "@workspace/db/schema";
import { eq, desc, asc, and, gte, lte, sql, count, ne, or, isNull } from "drizzle-orm";
import { sendOrderStatusUpdate } from "../../lib/email";
import { updateSquareOrderState, refundPayment, createSquareOrder, getOnlineSalesLocationId } from "../../lib/square";

const router: IRouter = Router();

// Dashboard stats
router.get("/stats", async (_req, res) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalOrders] = await db
        .select({ count: count() })
        .from(ordersTable);

    const [todayOrders] = await db
        .select({ count: count() })
        .from(ordersTable)
        .where(gte(ordersTable.createdAt, today));

    const [pendingOrders] = await db
        .select({ count: count() })
        .from(ordersTable)
        .where(eq(ordersTable.status, "pending"));

    const [totalRevenue] = await db
        .select({ total: sql<number>`COALESCE(SUM(${ordersTable.totalCents}), 0)` })
        .from(ordersTable)
        .where(
            and(
                sql`${ordersTable.status} NOT IN ('cancelled', 'refunded')`,
            ),
        );

    res.json({
        totalOrders: totalOrders.count,
        todayOrders: todayOrders.count,
        pendingOrders: pendingOrders.count,
        totalRevenueCents: totalRevenue.total,
    });
});

// List orders with filters and pagination
router.get("/", async (req, res) => {
    const status = req.query.status as string | undefined;
    const locationId = req.query.locationId
        ? Number(req.query.locationId)
        : undefined;
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    const conditions = [];
    if (status) conditions.push(eq(ordersTable.status, status as any));
    if (locationId) conditions.push(eq(ordersTable.locationId, locationId));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult] = await db
        .select({ count: count() })
        .from(ordersTable)
        .where(whereClause);

    const orders = await db
        .select({
            id: ordersTable.id,
            orderNumber: ordersTable.orderNumber,
            locationId: ordersTable.locationId,
            locationName: locationsTable.name,
            customerName: ordersTable.customerName,
            customerEmail: ordersTable.customerEmail,
            customerPhone: ordersTable.customerPhone,
            notes: ordersTable.notes,
            status: ordersTable.status,
            totalCents: ordersTable.totalCents,
            squarePaymentId: ordersTable.squarePaymentId,
            paymentStatus: ordersTable.paymentStatus,
            lastSyncSource: ordersTable.lastSyncSource,
            createdAt: ordersTable.createdAt,
            updatedAt: ordersTable.updatedAt,
        })
        .from(ordersTable)
        .leftJoin(locationsTable, eq(ordersTable.locationId, locationsTable.id))
        .where(whereClause)
        .orderBy(desc(ordersTable.createdAt))
        .limit(limit)
        .offset(offset);

    res.json({ data: orders, total: totalResult.count, limit, offset });
});

// Get single order with items
router.get("/:id", async (req, res) => {
    const id = Number(req.params.id);

    const [order] = await db
        .select({
            id: ordersTable.id,
            orderNumber: ordersTable.orderNumber,
            locationId: ordersTable.locationId,
            locationName: locationsTable.name,
            customerName: ordersTable.customerName,
            customerEmail: ordersTable.customerEmail,
            customerPhone: ordersTable.customerPhone,
            notes: ordersTable.notes,
            status: ordersTable.status,
            totalCents: ordersTable.totalCents,
            squareOrderId: ordersTable.squareOrderId,
            squarePaymentId: ordersTable.squarePaymentId,
            paymentStatus: ordersTable.paymentStatus,
            lastSyncSource: ordersTable.lastSyncSource,
            createdAt: ordersTable.createdAt,
            updatedAt: ordersTable.updatedAt,
        })
        .from(ordersTable)
        .leftJoin(locationsTable, eq(ordersTable.locationId, locationsTable.id))
        .where(eq(ordersTable.id, id))
        .limit(1);

    if (!order) {
        res.status(404).json({ error: "Order not found" });
        return;
    }

    const items = await db
        .select()
        .from(orderItemsTable)
        .where(eq(orderItemsTable.orderId, id));

    const notes = await db
        .select()
        .from(orderNotesTable)
        .where(eq(orderNotesTable.orderId, id))
        .orderBy(desc(orderNotesTable.createdAt));

    res.json({ ...order, items, notes });
});

// Bulk update order statuses
router.put("/bulk/status", async (req, res) => {
    const { orderIds, status } = req.body;

    const validStatuses = ["pending", "confirmed", "ready", "picked_up", "cancelled", "refunded"];
    if (!validStatuses.includes(status) || !Array.isArray(orderIds) || orderIds.length === 0) {
        res.status(400).json({ error: "Valid orderIds array and status are required" });
        return;
    }

    const user = req.user;
    let updated = 0;

    for (const orderId of orderIds) {
        const [order] = await db
            .update(ordersTable)
            .set({ status, updatedAt: new Date() })
            .where(eq(ordersTable.id, orderId))
            .returning();
        if (order) {
            updated++;
            await db.insert(orderNotesTable).values({
                orderId,
                type: "system",
                content: `Bulk status changed to "${status}"`,
                author: user?.username || "System",
            });
        }
    }

    res.json({ updated });
});

// Update order status
router.put("/:id/status", async (req, res) => {
    const id = Number(req.params.id);
    const { status } = req.body;

    const validStatuses = [
        "pending",
        "confirmed",
        "ready",
        "picked_up",
        "cancelled",
        "refunded",
    ];
    if (!validStatuses.includes(status)) {
        res.status(400).json({ error: "Invalid status" });
        return;
    }

    const [order] = await db
        .update(ordersTable)
        .set({ status, updatedAt: new Date() })
        .where(eq(ordersTable.id, id))
        .returning();

    if (!order) {
        res.status(404).json({ error: "Order not found" });
        return;
    }

    // Auto-create system note for status change
    const user = req.user;
    await db.insert(orderNotesTable).values({
        orderId: id,
        type: "system",
        content: `Status changed to "${status}"`,
        author: user?.username || "System",
    });

    // Send status update email to customer
    if (order.customerEmail && ["confirmed", "ready", "picked_up", "cancelled", "refunded"].includes(status)) {
        const [location] = await db
            .select({
                name: locationsTable.name,
                address: locationsTable.address,
                city: locationsTable.city,
                state: locationsTable.state,
                zip: locationsTable.zip,
                phone: locationsTable.phone,
                mapUrl: locationsTable.mapUrl,
            })
            .from(locationsTable)
            .where(eq(locationsTable.id, order.locationId))
            .limit(1);

        const orderItemRows = await db
            .select({
                flavourName: orderItemsTable.flavourName,
                sizeName: orderItemsTable.sizeName,
                quantity: orderItemsTable.quantity,
            })
            .from(orderItemsTable)
            .where(eq(orderItemsTable.orderId, id));

        sendOrderStatusUpdate({
            orderNumber: order.orderNumber,
            customerName: order.customerName,
            customerEmail: order.customerEmail,
            status,
            location: location ?? { name: "", address: "", city: "", state: "", zip: "", phone: "", mapUrl: null },
            items: orderItemRows,
            totalCents: order.totalCents,
        }).catch((e) => console.error("[EMAIL] Status update failed:", e));
    }

    // Push status to Square POS
    let squareSyncError = false;
    if (order.squareOrderId && ["picked_up", "cancelled"].includes(status)) {
        const [loc] = await db
            .select({ squareLocationId: locationsTable.squareLocationId })
            .from(locationsTable)
            .where(eq(locationsTable.id, order.locationId))
            .limit(1);
        if (loc?.squareLocationId) {
            const squareState = status === "cancelled" ? "CANCELED" : "COMPLETED";
            try {
                await updateSquareOrderState(order.squareOrderId, loc.squareLocationId, squareState as "COMPLETED" | "CANCELED");
                await db.update(ordersTable).set({ lastSyncSource: "web" }).where(eq(ordersTable.id, order.id));
            } catch (e) {
                console.error("[SQUARE] Failed to update order state:", e);
                squareSyncError = true;
            }
        }
    }

    res.json({ ...order, squareSyncError });
});

// Get notes for an order
router.get("/:id/notes", async (req, res) => {
    const id = Number(req.params.id);
    const notes = await db
        .select()
        .from(orderNotesTable)
        .where(eq(orderNotesTable.orderId, id))
        .orderBy(desc(orderNotesTable.createdAt));
    res.json(notes);
});

// Add note to an order
router.post("/:id/notes", async (req, res) => {
    const id = Number(req.params.id);
    const { content, type } = req.body;
    const user = req.user;

    if (!content?.trim()) {
        res.status(400).json({ error: "Content is required" });
        return;
    }

    const [note] = await db
        .insert(orderNotesTable)
        .values({
            orderId: id,
            type: type || "internal",
            content: content.trim(),
            author: user?.username || "Admin",
        })
        .returning();

    res.status(201).json(note);
});

// Retry Square sync for an order
router.post("/:id/retry-square-sync", async (req, res) => {
    const id = Number(req.params.id);

    const [order] = await db
        .select()
        .from(ordersTable)
        .where(eq(ordersTable.id, id))
        .limit(1);

    if (!order) {
        res.status(404).json({ error: "Order not found" });
        return;
    }

    try {
        let squareOrderId = order.squareOrderId;

        // If no Square order exists yet, create one
        if (!squareOrderId) {
            const onlineSalesSquareLocationId = await getOnlineSalesLocationId();
            if (!onlineSalesSquareLocationId) {
                res.status(400).json({ error: "No Square online sales location configured" });
                return;
            }

            const items = await db
                .select()
                .from(orderItemsTable)
                .where(eq(orderItemsTable.orderId, id));

            if (items.length === 0) {
                res.status(400).json({ error: "Order has no items" });
                return;
            }

            const isPreOrder = items.some((item) => item.preOrderWindowId !== null);

            const sqOrder = await createSquareOrder(
                onlineSalesSquareLocationId,
                order.orderNumber,
                items.map((item) => ({
                    name: `${item.flavourName} - ${item.sizeName}`,
                    quantity: item.quantity,
                    priceCents: item.priceCents,
                })),
                order.discountCents > 0 ? order.discountCents : undefined,
                { isPreOrder },
            );

            squareOrderId = sqOrder.id ?? null;

            if (!squareOrderId) {
                res.status(502).json({ error: "Square order creation returned no ID" });
                return;
            }

            await db
                .update(ordersTable)
                .set({ squareOrderId, lastSyncSource: "web" })
                .where(eq(ordersTable.id, order.id));
        }

        // Now sync the state if applicable
        const squareState =
            order.status === "cancelled" || order.status === "refunded"
                ? "CANCELED"
                : ["picked_up", "completed"].includes(order.status as string)
                    ? "COMPLETED"
                    : null;

        if (squareState) {
            const [loc] = await db
                .select({ squareLocationId: locationsTable.squareLocationId })
                .from(locationsTable)
                .where(eq(locationsTable.id, order.locationId))
                .limit(1);

            if (loc?.squareLocationId) {
                await updateSquareOrderState(squareOrderId, loc.squareLocationId, squareState as "COMPLETED" | "CANCELED");
            }
        }

        await db.update(ordersTable).set({ lastSyncSource: "web" }).where(eq(ordersTable.id, order.id));
        res.json({ success: true, squareOrderId });
    } catch (e: any) {
        console.error("[SQUARE] Retry sync failed:", e);
        res.status(502).json({ error: "Square sync failed", detail: e?.message || "Unknown error" });
    }
});

// Refund an order via Square
router.post("/:id/refund", async (req, res) => {
    const id = Number(req.params.id);

    const [order] = await db
        .select()
        .from(ordersTable)
        .where(eq(ordersTable.id, id))
        .limit(1);

    if (!order) {
        res.status(404).json({ error: "Order not found" });
        return;
    }

    if (order.status === "refunded") {
        res.status(400).json({ error: "Order is already refunded" });
        return;
    }

    let refundError: string | null = null;

    // Attempt Square refund if payment exists
    if (order.squarePaymentId) {
        try {
            await refundPayment(order.squarePaymentId, order.totalCents);
        } catch (e: any) {
            console.error("[SQUARE] Order refund failed:", e);
            refundError = e?.message || "Square refund failed";
        }
    }

    // Update order status to refunded
    const [updated] = await db
        .update(ordersTable)
        .set({ status: "refunded", paymentStatus: "refunded", updatedAt: new Date() })
        .where(eq(ordersTable.id, id))
        .returning();

    // Add system note
    const user = req.user;
    await db.insert(orderNotesTable).values({
        orderId: id,
        type: "system",
        content: refundError
            ? `Refund initiated (Square refund failed: ${refundError})`
            : "Order refunded via Square",
        author: user?.username || "System",
    });

    // Send refund email
    if (updated.customerEmail) {
        const [location] = await db
            .select({
                name: locationsTable.name,
                address: locationsTable.address,
                city: locationsTable.city,
                state: locationsTable.state,
                zip: locationsTable.zip,
                phone: locationsTable.phone,
                mapUrl: locationsTable.mapUrl,
            })
            .from(locationsTable)
            .where(eq(locationsTable.id, updated.locationId))
            .limit(1);

        const orderItemRows = await db
            .select({
                flavourName: orderItemsTable.flavourName,
                sizeName: orderItemsTable.sizeName,
                quantity: orderItemsTable.quantity,
            })
            .from(orderItemsTable)
            .where(eq(orderItemsTable.orderId, id));

        sendOrderStatusUpdate({
            orderNumber: updated.orderNumber,
            customerName: updated.customerName,
            customerEmail: updated.customerEmail,
            status: "refunded",
            location: location ?? { name: "", address: "", city: "", state: "", zip: "", phone: "", mapUrl: null },
            items: orderItemRows,
            totalCents: updated.totalCents,
        }).catch((e) => console.error("[EMAIL] Refund status email failed:", e));
    }

    res.json({ ...updated, refundError });
});

export default router;
