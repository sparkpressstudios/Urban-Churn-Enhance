import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
    wholesaleDeliveryRunsTable,
    wholesaleDeliveryRunStopsTable,
    wholesaleOrdersTable,
    wholesaleCustomersTable,
    wholesaleOrderItemsTable,
} from "@workspace/db/schema";
import { eq, and, asc } from "drizzle-orm";

const router: IRouter = Router();

// ── GET /driver/:token — public mobile view for driver ──
router.get("/:token", async (req, res) => {
    const { token } = req.params;

    if (!token || token.length < 20) {
        res.status(400).json({ error: "Invalid token" });
        return;
    }

    const [run] = await db
        .select()
        .from(wholesaleDeliveryRunsTable)
        .where(eq(wholesaleDeliveryRunsTable.driverToken, token))
        .limit(1);

    if (!run) {
        res.status(404).json({ error: "Delivery run not found" });
        return;
    }

    const stops = await db
        .select({
            id: wholesaleDeliveryRunStopsTable.id,
            wholesaleOrderId: wholesaleDeliveryRunStopsTable.wholesaleOrderId,
            stopOrder: wholesaleDeliveryRunStopsTable.stopOrder,
            status: wholesaleDeliveryRunStopsTable.status,
            notes: wholesaleDeliveryRunStopsTable.notes,
            deliveredAt: wholesaleDeliveryRunStopsTable.deliveredAt,
            completionNotes: wholesaleDeliveryRunStopsTable.completionNotes,
            orderNumber: wholesaleOrdersTable.orderNumber,
            customerName: wholesaleCustomersTable.businessName,
            customerAddress: wholesaleCustomersTable.address,
            customerCity: wholesaleCustomersTable.city,
            customerPhone: wholesaleCustomersTable.phone,
            orderStatus: wholesaleOrdersTable.status,
        })
        .from(wholesaleDeliveryRunStopsTable)
        .innerJoin(
            wholesaleOrdersTable,
            eq(wholesaleDeliveryRunStopsTable.wholesaleOrderId, wholesaleOrdersTable.id),
        )
        .innerJoin(
            wholesaleCustomersTable,
            eq(wholesaleOrdersTable.wholesaleCustomerId, wholesaleCustomersTable.id),
        )
        .where(eq(wholesaleDeliveryRunStopsTable.deliveryRunId, run.id))
        .orderBy(asc(wholesaleDeliveryRunStopsTable.stopOrder));

    // Include items for each stop
    const stopsWithItems = await Promise.all(
        stops.map(async (stop) => {
            const items = await db
                .select({
                    productDescription: wholesaleOrderItemsTable.productDescription,
                    quantity: wholesaleOrderItemsTable.quantity,
                })
                .from(wholesaleOrderItemsTable)
                .where(eq(wholesaleOrderItemsTable.wholesaleOrderId, stop.wholesaleOrderId));
            return { ...stop, items };
        }),
    );

    res.json({
        id: run.id,
        name: run.name,
        scheduledDate: run.scheduledDate,
        driverName: run.driverName,
        vehicleNotes: run.vehicleNotes,
        notes: run.notes,
        status: run.status,
        stops: stopsWithItems,
    });
});

// ── PUT /driver/:token/stops/:stopId — mark stop complete or skipped ──
router.put("/:token/stops/:stopId", async (req, res) => {
    const { token, stopId } = req.params;
    const { status, completionNotes } = req.body;

    if (!token || token.length < 20) {
        res.status(400).json({ error: "Invalid token" });
        return;
    }

    const validStatuses = ["completed", "skipped", "pending"];
    if (status && !validStatuses.includes(status)) {
        res.status(400).json({ error: "Invalid status" });
        return;
    }

    // Verify the token owns this stop
    const [run] = await db
        .select({ id: wholesaleDeliveryRunsTable.id })
        .from(wholesaleDeliveryRunsTable)
        .where(eq(wholesaleDeliveryRunsTable.driverToken, token))
        .limit(1);

    if (!run) {
        res.status(404).json({ error: "Delivery run not found" });
        return;
    }

    const [stop] = await db
        .select({ id: wholesaleDeliveryRunStopsTable.id })
        .from(wholesaleDeliveryRunStopsTable)
        .where(
            and(
                eq(wholesaleDeliveryRunStopsTable.id, Number(stopId)),
                eq(wholesaleDeliveryRunStopsTable.deliveryRunId, run.id),
            ),
        )
        .limit(1);

    if (!stop) {
        res.status(404).json({ error: "Stop not found" });
        return;
    }

    const updates: Record<string, any> = {};
    if (status !== undefined) updates.status = status;
    if (completionNotes !== undefined) updates.completionNotes = completionNotes;
    if (status === "completed") updates.deliveredAt = new Date();

    const [updatedStop] = await db
        .update(wholesaleDeliveryRunStopsTable)
        .set(updates)
        .where(eq(wholesaleDeliveryRunStopsTable.id, Number(stopId)))
        .returning();

    // If all stops are completed or skipped, auto-complete the run
    const allStops = await db
        .select({ status: wholesaleDeliveryRunStopsTable.status })
        .from(wholesaleDeliveryRunStopsTable)
        .where(eq(wholesaleDeliveryRunStopsTable.deliveryRunId, run.id));

    const allDone = allStops.every((s) => s.status === "completed" || s.status === "skipped");
    if (allDone && allStops.length > 0) {
        await db
            .update(wholesaleDeliveryRunsTable)
            .set({ status: "completed", updatedAt: new Date() })
            .where(eq(wholesaleDeliveryRunsTable.id, run.id));
    }

    res.json(updatedStop);
});

export default router;
