import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
    ordersTable,
    orderItemsTable,
    orderNotesTable,
    locationsTable,
    adminUsersTable,
} from "@workspace/db/schema";
import { eq, and, sql, desc, asc, or, ilike, gte, lte, count } from "drizzle-orm";
import { refundPayment } from "../../lib/square";

const router: IRouter = Router();

// Helper: build location filter condition
function locationCondition(storeLocationId: number | null | undefined) {
    return storeLocationId ? eq(ordersTable.locationId, storeLocationId) : undefined;
}

// ─── Dashboard stats ───────────────────────────────────────────────
router.get("/dashboard", async (req, res) => {
    const locId = req.storeLocationId;
    const locCond = locationCondition(locId);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Status counts for unfulfilled orders
    const statusCounts = await db
        .select({
            status: ordersTable.status,
            count: sql<number>`count(*)`.as("count"),
        })
        .from(ordersTable)
        .where(
            and(
                locCond,
                sql`${ordersTable.status} IN ('pending', 'confirmed', 'ready', 'partially_picked_up')`,
            ),
        )
        .groupBy(ordersTable.status);

    // Completed today
    const [completedToday] = await db
        .select({ count: sql<number>`count(*)`.as("count") })
        .from(ordersTable)
        .where(
            and(
                locCond,
                eq(ordersTable.status, "picked_up"),
                gte(ordersTable.updatedAt, todayStart),
            ),
        );

    // Flavour × size breakdown for unfulfilled orders
    const itemBreakdown = await db
        .select({
            flavourName: orderItemsTable.flavourName,
            sizeName: orderItemsTable.sizeName,
            totalQuantity: sql<number>`COALESCE(SUM(${orderItemsTable.quantity}), 0)`.as("total_quantity"),
            pickedUpQuantity: sql<number>`COALESCE(SUM(${orderItemsTable.pickedUpQuantity}), 0)`.as("picked_up_quantity"),
            orderCount: sql<number>`COUNT(DISTINCT ${ordersTable.id})`.as("order_count"),
        })
        .from(orderItemsTable)
        .innerJoin(ordersTable, eq(orderItemsTable.orderId, ordersTable.id))
        .where(
            and(
                locCond,
                sql`${ordersTable.status} IN ('pending', 'confirmed', 'ready', 'partially_picked_up')`,
            ),
        )
        .groupBy(orderItemsTable.flavourName, orderItemsTable.sizeName)
        .orderBy(asc(orderItemsTable.flavourName), asc(orderItemsTable.sizeName));

    const counts: Record<string, number> = {};
    for (const row of statusCounts) {
        counts[row.status] = Number(row.count);
    }

    // Ready-today: items with pickup_date <= today 23:59 that are not yet fully picked up
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    const [readyToday] = await db
        .select({
            itemCount: sql<number>`COALESCE(SUM(${orderItemsTable.quantity} - ${orderItemsTable.pickedUpQuantity}), 0)`.as("item_count"),
            orderCount: sql<number>`COUNT(DISTINCT ${ordersTable.id})`.as("order_count"),
        })
        .from(orderItemsTable)
        .innerJoin(ordersTable, eq(orderItemsTable.orderId, ordersTable.id))
        .where(
            and(
                locCond,
                sql`${orderItemsTable.pickupDate} IS NOT NULL`,
                lte(orderItemsTable.pickupDate, todayEnd),
                sql`${orderItemsTable.quantity} > ${orderItemsTable.pickedUpQuantity}`,
                sql`${ordersTable.status} IN ('pending', 'confirmed', 'ready', 'partially_picked_up')`,
            ),
        );

    // Overdue: items with pickup_date < today 00:00 still not picked up
    const [overdue] = await db
        .select({
            itemCount: sql<number>`COALESCE(SUM(${orderItemsTable.quantity} - ${orderItemsTable.pickedUpQuantity}), 0)`.as("item_count"),
            orderCount: sql<number>`COUNT(DISTINCT ${ordersTable.id})`.as("order_count"),
        })
        .from(orderItemsTable)
        .innerJoin(ordersTable, eq(orderItemsTable.orderId, ordersTable.id))
        .where(
            and(
                locCond,
                sql`${orderItemsTable.pickupDate} IS NOT NULL`,
                lte(orderItemsTable.pickupDate, todayStart),
                sql`${orderItemsTable.quantity} > ${orderItemsTable.pickedUpQuantity}`,
                sql`${ordersTable.status} IN ('pending', 'confirmed', 'ready', 'partially_picked_up')`,
            ),
        );

    res.json({
        pending: counts.pending || 0,
        confirmed: counts.confirmed || 0,
        ready: counts.ready || 0,
        partiallyPickedUp: counts.partially_picked_up || 0,
        completedToday: Number(completedToday?.count || 0),
        readyToday: {
            itemCount: Number(readyToday?.itemCount || 0),
            orderCount: Number(readyToday?.orderCount || 0),
        },
        overdue: {
            itemCount: Number(overdue?.itemCount || 0),
            orderCount: Number(overdue?.orderCount || 0),
        },
        itemBreakdown: itemBreakdown.map((r) => ({
            flavourName: r.flavourName,
            sizeName: r.sizeName,
            totalQuantity: Number(r.totalQuantity),
            pickedUpQuantity: Number(r.pickedUpQuantity),
            remainingQuantity: Number(r.totalQuantity) - Number(r.pickedUpQuantity),
            orderCount: Number(r.orderCount),
        })),
    });
});

// ─── Orders list ───────────────────────────────────────────────────
router.get("/orders", async (req, res) => {
    const locId = req.storeLocationId;
    const search = (req.query.search as string) || "";
    const status = req.query.status as string | undefined;
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;
    const pickupDateFilter = req.query.pickupDate as string | undefined; // "today" | "this_week" | ISO date
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
    const offset = (page - 1) * limit;

    const conditions: any[] = [];
    if (locId) conditions.push(eq(ordersTable.locationId, locId));
    if (status) {
        conditions.push(eq(ordersTable.status, status as any));
    }
    if (from) conditions.push(gte(ordersTable.createdAt, new Date(from)));
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

    // Pickup-date filter: subquery on order_items.pickup_date
    if (pickupDateFilter) {
        const now = new Date();
        let pickupStart: Date | null = null;
        let pickupEnd: Date | null = null;
        if (pickupDateFilter === "today") {
            pickupStart = new Date(now);
            pickupStart.setHours(0, 0, 0, 0);
            pickupEnd = new Date(now);
            pickupEnd.setHours(23, 59, 59, 999);
        } else if (pickupDateFilter === "this_week") {
            pickupStart = new Date(now);
            pickupStart.setHours(0, 0, 0, 0);
            pickupEnd = new Date(now);
            pickupEnd.setDate(pickupEnd.getDate() + 7);
            pickupEnd.setHours(23, 59, 59, 999);
        } else if (pickupDateFilter === "overdue") {
            pickupEnd = new Date(now);
            pickupEnd.setHours(0, 0, 0, 0);
        } else {
            // ISO date (YYYY-MM-DD)
            const d = new Date(pickupDateFilter);
            if (!isNaN(d.getTime())) {
                pickupStart = new Date(d);
                pickupStart.setHours(0, 0, 0, 0);
                pickupEnd = new Date(d);
                pickupEnd.setHours(23, 59, 59, 999);
            }
        }

        if (pickupStart && pickupEnd) {
            conditions.push(
                sql`${ordersTable.id} IN (
                    SELECT ${orderItemsTable.orderId} FROM ${orderItemsTable}
                    WHERE ${orderItemsTable.pickupDate} >= ${pickupStart.toISOString()}
                      AND ${orderItemsTable.pickupDate} <= ${pickupEnd.toISOString()}
                )`,
            );
        } else if (pickupEnd) {
            conditions.push(
                sql`${ordersTable.id} IN (
                    SELECT ${orderItemsTable.orderId} FROM ${orderItemsTable}
                    WHERE ${orderItemsTable.pickupDate} < ${pickupEnd.toISOString()}
                      AND ${orderItemsTable.quantity} > ${orderItemsTable.pickedUpQuantity}
                )`,
            );
        }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult] = await db
        .select({ count: sql<number>`count(*)`.as("count") })
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
            status: ordersTable.status,
            totalCents: ordersTable.totalCents,
            createdAt: ordersTable.createdAt,
            updatedAt: ordersTable.updatedAt,
        })
        .from(ordersTable)
        .innerJoin(locationsTable, eq(ordersTable.locationId, locationsTable.id))
        .where(whereClause)
        .orderBy(desc(ordersTable.createdAt))
        .limit(limit)
        .offset(offset);

    // Attach item counts
    const orderIds = orders.map((o) => o.id);
    let itemCounts: Record<number, { total: number; pickedUp: number }> = {};
    if (orderIds.length > 0) {
        const items = await db
            .select({
                orderId: orderItemsTable.orderId,
                totalQty: sql<number>`COALESCE(SUM(${orderItemsTable.quantity}), 0)`.as("total_qty"),
                pickedUpQty: sql<number>`COALESCE(SUM(${orderItemsTable.pickedUpQuantity}), 0)`.as("picked_up_qty"),
            })
            .from(orderItemsTable)
            .where(sql`${orderItemsTable.orderId} IN (${sql.join(orderIds.map((id) => sql`${id}`), sql`, `)})`)
            .groupBy(orderItemsTable.orderId);

        for (const item of items) {
            itemCounts[item.orderId] = { total: Number(item.totalQty), pickedUp: Number(item.pickedUpQty) };
        }
    }

    res.json({
        orders: orders.map((o) => ({
            ...o,
            itemCount: itemCounts[o.id]?.total || 0,
            itemsPickedUp: itemCounts[o.id]?.pickedUp || 0,
        })),
        total: Number(totalResult?.count || 0),
        page,
        limit,
    });
});

// ─── Order detail ──────────────────────────────────────────────────
router.get("/orders/:id", async (req, res) => {
    const id = Number(req.params.id);
    const locId = req.storeLocationId;

    const conditions: any[] = [eq(ordersTable.id, id)];
    if (locId) conditions.push(eq(ordersTable.locationId, locId));

    const [order] = await db
        .select({
            id: ordersTable.id,
            orderNumber: ordersTable.orderNumber,
            locationId: ordersTable.locationId,
            locationName: locationsTable.name,
            customerName: ordersTable.customerName,
            customerEmail: ordersTable.customerEmail,
            customerPhone: ordersTable.customerPhone,
            customerId: ordersTable.customerId,
            customerNotes: ordersTable.notes,
            status: ordersTable.status,
            totalCents: ordersTable.totalCents,
            discountCents: ordersTable.discountCents,
            squareOrderId: ordersTable.squareOrderId,
            createdAt: ordersTable.createdAt,
            updatedAt: ordersTable.updatedAt,
        })
        .from(ordersTable)
        .innerJoin(locationsTable, eq(ordersTable.locationId, locationsTable.id))
        .where(and(...conditions))
        .limit(1);

    if (!order) {
        res.status(404).json({ error: "Order not found" });
        return;
    }

    const items = await db
        .select({
            id: orderItemsTable.id,
            flavourName: orderItemsTable.flavourName,
            sizeName: orderItemsTable.sizeName,
            priceCents: orderItemsTable.priceCents,
            quantity: orderItemsTable.quantity,
            pickedUpQuantity: orderItemsTable.pickedUpQuantity,
            pickedUpAt: orderItemsTable.pickedUpAt,
            pickedUpByStaffId: orderItemsTable.pickedUpByStaffId,
            pickupDate: orderItemsTable.pickupDate,
            preOrderWindowId: orderItemsTable.preOrderWindowId,
        })
        .from(orderItemsTable)
        .where(eq(orderItemsTable.orderId, id));

    // Get staff names for pickup attribution
    const staffIds = [...new Set(items.filter((i) => i.pickedUpByStaffId).map((i) => i.pickedUpByStaffId!))];
    let staffNames: Record<number, string> = {};
    if (staffIds.length > 0) {
        const staffRows = await db
            .select({ id: adminUsersTable.id, username: adminUsersTable.username })
            .from(adminUsersTable)
            .where(sql`${adminUsersTable.id} IN (${sql.join(staffIds.map((id) => sql`${id}`), sql`, `)})`);
        for (const s of staffRows) {
            staffNames[s.id] = s.username;
        }
    }

    const notes = await db
        .select()
        .from(orderNotesTable)
        .where(eq(orderNotesTable.orderId, id))
        .orderBy(desc(orderNotesTable.createdAt));

    res.json({
        ...order,
        items: items.map((i) => ({
            ...i,
            pickedUpByStaffName: i.pickedUpByStaffId ? staffNames[i.pickedUpByStaffId] || null : null,
        })),
        orderNotes: notes,
    });
});

// ─── Update order status ───────────────────────────────────────────
router.put("/orders/:id/status", async (req, res) => {
    const id = Number(req.params.id);
    const locId = req.storeLocationId;
    const { status } = req.body;

    const allowed = ["confirmed", "ready", "partially_picked_up", "picked_up"];
    if (!status || !allowed.includes(status)) {
        res.status(400).json({ error: `Status must be one of: ${allowed.join(", ")}` });
        return;
    }

    const conditions: any[] = [eq(ordersTable.id, id)];
    if (locId) conditions.push(eq(ordersTable.locationId, locId));

    const [order] = await db
        .update(ordersTable)
        .set({ status, updatedAt: new Date() })
        .where(and(...conditions))
        .returning();

    if (!order) {
        res.status(404).json({ error: "Order not found or access denied" });
        return;
    }

    res.json(order);
});

// ─── Mark single item picked up ────────────────────────────────────
router.put("/orders/:id/items/:itemId/pickup", async (req, res) => {
    const orderId = Number(req.params.id);
    const itemId = Number(req.params.itemId);
    const locId = req.storeLocationId;
    const staffId = req.user!.userId;
    const { quantity } = req.body; // optional: how many units to mark (defaults to all remaining)

    // Verify order belongs to this location
    const conditions: any[] = [eq(ordersTable.id, orderId)];
    if (locId) conditions.push(eq(ordersTable.locationId, locId));

    const [order] = await db.select().from(ordersTable).where(and(...conditions)).limit(1);
    if (!order) {
        res.status(404).json({ error: "Order not found or access denied" });
        return;
    }

    // Get the item
    const [item] = await db
        .select()
        .from(orderItemsTable)
        .where(and(eq(orderItemsTable.id, itemId), eq(orderItemsTable.orderId, orderId)))
        .limit(1);

    if (!item) {
        res.status(404).json({ error: "Item not found" });
        return;
    }

    const remaining = item.quantity - item.pickedUpQuantity;
    if (remaining <= 0) {
        res.status(400).json({ error: "Item already fully picked up" });
        return;
    }

    const pickupQty = Math.min(quantity ? Number(quantity) : remaining, remaining);

    const newPickedUpQty = item.pickedUpQuantity + pickupQty;
    await db
        .update(orderItemsTable)
        .set({
            pickedUpQuantity: newPickedUpQty,
            pickedUpAt: new Date(),
            pickedUpByStaffId: staffId,
        })
        .where(eq(orderItemsTable.id, itemId));

    // Recalculate order status based on all items
    const allItems = await db
        .select({
            quantity: orderItemsTable.quantity,
            pickedUpQuantity: orderItemsTable.pickedUpQuantity,
        })
        .from(orderItemsTable)
        .where(eq(orderItemsTable.orderId, orderId));

    const totalQty = allItems.reduce((s, i) => s + i.quantity, 0);
    // Use fresh data: for the item we just updated, use newPickedUpQty
    const totalPickedUp = allItems.reduce(
        (s, i) => s + (i === allItems.find((x) => x === item) ? newPickedUpQty : i.pickedUpQuantity),
        0,
    );

    // Recompute from DB to be accurate
    const allItemsRefreshed = await db
        .select({ quantity: orderItemsTable.quantity, pickedUpQuantity: orderItemsTable.pickedUpQuantity })
        .from(orderItemsTable)
        .where(eq(orderItemsTable.orderId, orderId));

    const totalQ = allItemsRefreshed.reduce((s, i) => s + i.quantity, 0);
    const totalP = allItemsRefreshed.reduce((s, i) => s + i.pickedUpQuantity, 0);

    let newOrderStatus: string;
    if (totalP >= totalQ) {
        newOrderStatus = "picked_up";
    } else if (totalP > 0) {
        newOrderStatus = "partially_picked_up";
    } else {
        newOrderStatus = order.status;
    }

    if (newOrderStatus !== order.status) {
        await db.update(ordersTable).set({ status: newOrderStatus as any, updatedAt: new Date() }).where(eq(ordersTable.id, orderId));
    }

    res.json({ success: true, newOrderStatus, itemPickedUpQuantity: newPickedUpQty });
});

// ─── Undo item pickup ──────────────────────────────────────────────
router.put("/orders/:id/items/:itemId/undo-pickup", async (req, res) => {
    const orderId = Number(req.params.id);
    const itemId = Number(req.params.itemId);
    const locId = req.storeLocationId;

    // Verify order belongs to this location
    const conditions: any[] = [eq(ordersTable.id, orderId)];
    if (locId) conditions.push(eq(ordersTable.locationId, locId));

    const [order] = await db.select().from(ordersTable).where(and(...conditions)).limit(1);
    if (!order) {
        res.status(404).json({ error: "Order not found or access denied" });
        return;
    }

    const [item] = await db
        .select()
        .from(orderItemsTable)
        .where(and(eq(orderItemsTable.id, itemId), eq(orderItemsTable.orderId, orderId)))
        .limit(1);

    if (!item) {
        res.status(404).json({ error: "Item not found" });
        return;
    }

    if (item.pickedUpQuantity <= 0) {
        res.status(400).json({ error: "Item has no pickups to undo" });
        return;
    }

    await db
        .update(orderItemsTable)
        .set({ pickedUpQuantity: 0, pickedUpAt: null, pickedUpByStaffId: null })
        .where(eq(orderItemsTable.id, itemId));

    // Recompute order status
    const allItems = await db
        .select({ quantity: orderItemsTable.quantity, pickedUpQuantity: orderItemsTable.pickedUpQuantity })
        .from(orderItemsTable)
        .where(eq(orderItemsTable.orderId, orderId));

    // The item we just reset will still show old value in this query, so account for it
    const totalQ = allItems.reduce((s, i) => s + i.quantity, 0);
    const totalP = allItems.reduce((s, i) => s + i.pickedUpQuantity, 0) - item.pickedUpQuantity; // subtract the reset

    let newOrderStatus: string;
    if (totalP <= 0) {
        // Revert to ready (or keep current if it was something else)
        newOrderStatus = order.status === "picked_up" || order.status === "partially_picked_up" ? "ready" : order.status;
    } else if (totalP < totalQ) {
        newOrderStatus = "partially_picked_up";
    } else {
        newOrderStatus = order.status;
    }

    if (newOrderStatus !== order.status) {
        await db.update(ordersTable).set({ status: newOrderStatus as any, updatedAt: new Date() }).where(eq(ordersTable.id, orderId));
    }

    res.json({ success: true, newOrderStatus });
});

// ─── Mark all items picked up ──────────────────────────────────────
router.put("/orders/:id/pickup-all", async (req, res) => {
    const orderId = Number(req.params.id);
    const locId = req.storeLocationId;
    const staffId = req.user!.userId;

    const conditions: any[] = [eq(ordersTable.id, orderId)];
    if (locId) conditions.push(eq(ordersTable.locationId, locId));

    const [order] = await db.select().from(ordersTable).where(and(...conditions)).limit(1);
    if (!order) {
        res.status(404).json({ error: "Order not found or access denied" });
        return;
    }

    // Mark all items fully picked up
    await db
        .update(orderItemsTable)
        .set({
            pickedUpQuantity: sql`${orderItemsTable.quantity}`,
            pickedUpAt: new Date(),
            pickedUpByStaffId: staffId,
        })
        .where(eq(orderItemsTable.orderId, orderId));

    // Update order status
    await db
        .update(ordersTable)
        .set({ status: "picked_up", updatedAt: new Date() })
        .where(eq(ordersTable.id, orderId));

    res.json({ success: true, newOrderStatus: "picked_up" });
});

// ─── Add note to order ─────────────────────────────────────────────
router.post("/orders/:id/notes", async (req, res) => {
    const orderId = Number(req.params.id);
    const locId = req.storeLocationId;
    const { content } = req.body;

    if (!content || !content.trim()) {
        res.status(400).json({ error: "Note content is required" });
        return;
    }

    // Verify order belongs to this location
    const conditions: any[] = [eq(ordersTable.id, orderId)];
    if (locId) conditions.push(eq(ordersTable.locationId, locId));

    const [order] = await db.select({ id: ordersTable.id }).from(ordersTable).where(and(...conditions)).limit(1);
    if (!order) {
        res.status(404).json({ error: "Order not found or access denied" });
        return;
    }

    const [note] = await db
        .insert(orderNotesTable)
        .values({
            orderId,
            type: "internal",
            content: content.trim(),
            author: req.user!.username || "Staff",
        })
        .returning();

    res.status(201).json(note);
});

// ─── Refund an order ───────────────────────────────────────────────
router.post("/orders/:id/refund", async (req, res) => {
    const orderId = Number(req.params.id);
    const locId = req.storeLocationId;

    const conditions: any[] = [eq(ordersTable.id, orderId)];
    if (locId) conditions.push(eq(ordersTable.locationId, locId));

    const [order] = await db.select().from(ordersTable).where(and(...conditions)).limit(1);
    if (!order) {
        res.status(404).json({ error: "Order not found or access denied" });
        return;
    }

    if (order.status === "refunded") {
        res.status(400).json({ error: "Order is already refunded" });
        return;
    }

    let refundError: string | null = null;

    if (order.squarePaymentId) {
        try {
            await refundPayment(order.squarePaymentId, order.totalCents);
        } catch (e: any) {
            console.error("[SQUARE] Store refund failed:", e);
            refundError = e?.message || "Square refund failed";
        }
    }

    await db
        .update(ordersTable)
        .set({ status: "refunded", paymentStatus: "refunded", updatedAt: new Date() })
        .where(eq(ordersTable.id, orderId));

    await db.insert(orderNotesTable).values({
        orderId,
        type: "system",
        content: refundError
            ? `Refund initiated by staff (Square refund failed: ${refundError})`
            : "Order refunded by staff via Square",
        author: req.user!.username || "Staff",
    });

    res.json({ success: true, refundError });
});

// ─── Get locations (for manager/admin location switcher) ───────────
router.get("/locations", async (req, res) => {
    const locations = await db
        .select({ id: locationsTable.id, name: locationsTable.name, slug: locationsTable.slug })
        .from(locationsTable)
        .where(eq(locationsTable.active, true))
        .orderBy(asc(locationsTable.sortOrder));

    res.json(locations);
});

export default router;
