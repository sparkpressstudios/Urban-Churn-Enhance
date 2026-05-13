import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
    productPreOrdersTable,
    flavoursTable,
    emailNotificationsLogTable,
    preOrderLocationsTable,
    locationsTable,
} from "@workspace/db/schema";
import {
    eq,
    desc,
    and,
    sql,
    asc,
    inArray,
} from "drizzle-orm";

const router: IRouter = Router();

function normalizeLocationPickupOverrides(input: unknown): Map<number, Date> {
    const overrides = new Map<number, Date>();
    if (!input) return overrides;

    if (Array.isArray(input)) {
        for (const row of input) {
            if (!row || typeof row !== "object") continue;
            const locationId = Number((row as any).locationId);
            const rawDate = (row as any).pickupStartDate;
            if (!locationId || !rawDate) continue;
            const parsed = new Date(rawDate);
            if (!Number.isNaN(parsed.getTime())) {
                overrides.set(locationId, parsed);
            }
        }
        return overrides;
    }

    if (typeof input === "object") {
        for (const [locationIdRaw, rawDate] of Object.entries(input as Record<string, unknown>)) {
            const locationId = Number(locationIdRaw);
            if (!locationId || !rawDate) continue;
            const parsed = new Date(rawDate as string);
            if (!Number.isNaN(parsed.getTime())) {
                overrides.set(locationId, parsed);
            }
        }
    }

    return overrides;
}

// ── List all product pre-orders ──
router.get("/", async (req, res) => {
    const status = req.query.status as string | undefined;

    const conditions = [];
    if (status) {
        conditions.push(eq(productPreOrdersTable.status, status as any));
    }

    const flavourId = req.query.flavourId as string | undefined;
    if (flavourId) {
        conditions.push(eq(productPreOrdersTable.flavourId, parseInt(flavourId)));
    }

    const rows = await db
        .select({
            preOrder: productPreOrdersTable,
            flavourName: flavoursTable.name,
            flavourEmoji: flavoursTable.emoji,
        })
        .from(productPreOrdersTable)
        .leftJoin(flavoursTable, eq(productPreOrdersTable.flavourId, flavoursTable.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(productPreOrdersTable.createdAt));

    const result = rows.map((r) => ({
        ...r.preOrder,
        flavourName: r.flavourName,
        flavourEmoji: r.flavourEmoji,
    }));

    // Attach locations for each pre-order
    const preOrderIds = result.map((r) => r.id);
    let locMap = new Map<number, { id: number; name: string; type: string; pickupStartDate: Date | null }[]>();
    if (preOrderIds.length > 0) {
        const locRows = await db
            .select({
                preOrderId: preOrderLocationsTable.preOrderId,
                locationId: locationsTable.id,
                locationName: locationsTable.name,
                locationType: locationsTable.type,
                locationPickupStartDate: preOrderLocationsTable.pickupStartDate,
            })
            .from(preOrderLocationsTable)
            .innerJoin(locationsTable, eq(preOrderLocationsTable.locationId, locationsTable.id))
            .where(inArray(preOrderLocationsTable.preOrderId, preOrderIds));
        for (const row of locRows) {
            const arr = locMap.get(row.preOrderId) || [];
            arr.push({
                id: row.locationId,
                name: row.locationName,
                type: row.locationType,
                pickupStartDate: row.locationPickupStartDate,
            });
            locMap.set(row.preOrderId, arr);
        }
    }

    res.json(result.map((r) => ({ ...r, locations: locMap.get(r.id) || [] })));
});

// ── Email notification log ──
router.get("/email-log", async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
        const type = req.query.type as string | undefined;

        const conditions = [];
        if (type) {
            conditions.push(eq(emailNotificationsLogTable.type, type as any));
        }

        const logs = await db
            .select({
                id: emailNotificationsLogTable.id,
                preOrderId: emailNotificationsLogTable.preOrderId,
                type: emailNotificationsLogTable.type,
                recipientEmail: emailNotificationsLogTable.recipientEmail,
                sentAt: emailNotificationsLogTable.sentAt,
                status: emailNotificationsLogTable.status,
                errorMessage: emailNotificationsLogTable.errorMessage,
            })
            .from(emailNotificationsLogTable)
            .where(conditions.length > 0 ? and(...conditions) : undefined)
            .orderBy(desc(emailNotificationsLogTable.sentAt))
            .limit(limit);

        res.json(logs);
    } catch (error) {
        console.error("[EMAIL LOG] Fetch failed:", error);
        res.status(500).json({ error: "Failed to fetch email logs" });
    }
});

// ── Get single pre-order ──
router.get("/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
        res.status(400).json({ error: "Invalid pre-order ID" });
        return;
    }

    const [row] = await db
        .select({
            preOrder: productPreOrdersTable,
            flavourName: flavoursTable.name,
            flavourEmoji: flavoursTable.emoji,
        })
        .from(productPreOrdersTable)
        .leftJoin(flavoursTable, eq(productPreOrdersTable.flavourId, flavoursTable.id))
        .where(eq(productPreOrdersTable.id, id))
        .limit(1);

    if (!row) {
        res.status(404).json({ error: "Pre-order not found" });
        return;
    }

    // Fetch associated locations
    const locRows = await db
        .select({
            locationId: locationsTable.id,
            locationName: locationsTable.name,
            locationType: locationsTable.type,
            locationPickupStartDate: preOrderLocationsTable.pickupStartDate,
        })
        .from(preOrderLocationsTable)
        .innerJoin(locationsTable, eq(preOrderLocationsTable.locationId, locationsTable.id))
        .where(eq(preOrderLocationsTable.preOrderId, id));

    res.json({
        ...row.preOrder,
        flavourName: row.flavourName,
        flavourEmoji: row.flavourEmoji,
        locations: locRows.map((l) => ({
            id: l.locationId,
            name: l.locationName,
            type: l.locationType,
            pickupStartDate: l.locationPickupStartDate,
        })),
    });
});

// ── Create pre-order(s) ──
router.post("/", async (req, res) => {
    try {
        const {
            flavourId,
            flavourIds,
            preOrderStart,
            preOrderEnd,
            pickupDate,
            pickupEndDate,
            isRecurring,
            recurringRule,
            status,
            locationIds,
            locationPickupOverrides,
        } = req.body;

        if (!preOrderStart || !preOrderEnd || !pickupDate) {
            res.status(400).json({ error: "preOrderStart, preOrderEnd, and pickupDate are required" });
            return;
        }

        const startDate = new Date(preOrderStart);
        const endDate = new Date(preOrderEnd);
        if (endDate <= startDate) {
            res.status(400).json({ error: "preOrderEnd must be after preOrderStart" });
            return;
        }

        // Determine initial status
        const now = new Date();
        let computedStatus = status || "draft";
        if (computedStatus === "scheduled" && startDate <= now) {
            computedStatus = endDate > now ? "open" : "closed";
        }

        // Build list of flavour IDs to insert (supports batch creation)
        const flavourIdList: number[] = [];

        if (flavourIds && Array.isArray(flavourIds)) {
            for (const fid of flavourIds) flavourIdList.push(fid);
        } else if (flavourId) {
            flavourIdList.push(flavourId);
        }

        if (flavourIdList.length === 0) {
            res.status(400).json({ error: "At least one product must be selected to create a pre-order window" });
            return;
        }

        const created = await db
            .insert(productPreOrdersTable)
            .values(
                flavourIdList.map((fid) => ({
                    flavourId: fid,
                    preOrderStart: startDate,
                    preOrderEnd: endDate,
                    pickupDate: new Date(pickupDate),
                    pickupEndDate: pickupEndDate ? new Date(pickupEndDate) : null,
                    isRecurring: isRecurring || false,
                    recurringRule: recurringRule || null,
                    status: computedStatus,
                })),
            )
            .returning();

        // Resolve location IDs: use provided list, or default to all active shop locations
        let resolvedLocationIds: number[] = [];
        if (locationIds && Array.isArray(locationIds) && locationIds.length > 0) {
            resolvedLocationIds = locationIds.map(Number);
        } else {
            const shopLocations = await db
                .select({ id: locationsTable.id })
                .from(locationsTable)
                .where(and(eq(locationsTable.active, true), eq(locationsTable.type, "shop")));
            resolvedLocationIds = shopLocations.map((l) => l.id);
        }

        const pickupOverrides = normalizeLocationPickupOverrides(locationPickupOverrides);

        // Insert junction rows for each created pre-order
        if (resolvedLocationIds.length > 0) {
            const junctionRows = created.flatMap((po) =>
                resolvedLocationIds.map((locId) => ({
                    preOrderId: po.id,
                    locationId: locId,
                    pickupStartDate: pickupOverrides.get(locId) ?? null,
                })),
            );
            await db.insert(preOrderLocationsTable).values(junctionRows);
        }

        res.status(201).json(created.map((po) => ({
            ...po,
            locationIds: resolvedLocationIds,
        })));
    } catch (error) {
        console.error("[PRE-ORDERS] Create failed:", error);
        res.status(500).json({ error: "Failed to create pre-order" });
    }
});

// ── Update pre-order ──
router.put("/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            res.status(400).json({ error: "Invalid pre-order ID" });
            return;
        }

        const {
            preOrderStart,
            preOrderEnd,
            pickupDate,
            pickupEndDate,
            isRecurring,
            recurringRule,
            status,
            locationIds,
            locationPickupOverrides,
        } = req.body;

        const updates: Record<string, any> = { updatedAt: new Date() };
        if (preOrderStart !== undefined) updates.preOrderStart = new Date(preOrderStart);
        if (preOrderEnd !== undefined) updates.preOrderEnd = new Date(preOrderEnd);
        if (pickupDate !== undefined) updates.pickupDate = new Date(pickupDate);
        if (pickupEndDate !== undefined) updates.pickupEndDate = pickupEndDate ? new Date(pickupEndDate) : null;
        if (isRecurring !== undefined) updates.isRecurring = isRecurring;
        if (recurringRule !== undefined) updates.recurringRule = recurringRule;
        if (status !== undefined) updates.status = status;

        const [updated] = await db
            .update(productPreOrdersTable)
            .set(updates)
            .where(eq(productPreOrdersTable.id, id))
            .returning();

        if (!updated) {
            res.status(404).json({ error: "Pre-order not found" });
            return;
        }

        // Update locations if provided (replace strategy)
        const pickupOverrides = normalizeLocationPickupOverrides(locationPickupOverrides);

        if (locationIds !== undefined && Array.isArray(locationIds)) {
            await db.delete(preOrderLocationsTable).where(eq(preOrderLocationsTable.preOrderId, id));
            if (locationIds.length > 0) {
                await db.insert(preOrderLocationsTable).values(
                    locationIds.map((locId: number) => ({
                        preOrderId: id,
                        locationId: locId,
                        pickupStartDate: pickupOverrides.get(locId) ?? null,
                    })),
                );
            }
        } else if (locationPickupOverrides !== undefined) {
            const existingRows = await db
                .select({ locationId: preOrderLocationsTable.locationId })
                .from(preOrderLocationsTable)
                .where(eq(preOrderLocationsTable.preOrderId, id));

            for (const row of existingRows) {
                await db
                    .update(preOrderLocationsTable)
                    .set({ pickupStartDate: pickupOverrides.get(row.locationId) ?? null })
                    .where(
                        and(
                            eq(preOrderLocationsTable.preOrderId, id),
                            eq(preOrderLocationsTable.locationId, row.locationId),
                        ),
                    );
            }
        }

        res.json({ ...updated, locationIds: locationIds ?? undefined });
    } catch (error) {
        console.error("[PRE-ORDERS] Update failed:", error);
        res.status(500).json({ error: "Failed to update pre-order" });
    }
});

// ── Batch update ──
router.put("/batch/update", async (req, res) => {
    try {
        const { ids, ...updates } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            res.status(400).json({ error: "ids array required" });
            return;
        }

        const setValues: Record<string, any> = { updatedAt: new Date() };
        if (updates.preOrderStart !== undefined) setValues.preOrderStart = new Date(updates.preOrderStart);
        if (updates.preOrderEnd !== undefined) setValues.preOrderEnd = new Date(updates.preOrderEnd);
        if (updates.pickupDate !== undefined) setValues.pickupDate = new Date(updates.pickupDate);
        if (updates.pickupEndDate !== undefined) setValues.pickupEndDate = updates.pickupEndDate ? new Date(updates.pickupEndDate) : null;
        if (updates.status !== undefined) setValues.status = updates.status;

        await db
            .update(productPreOrdersTable)
            .set(setValues)
            .where(sql`${productPreOrdersTable.id} IN (${sql.join(ids.map((i: number) => sql`${i}`), sql`, `)})`);

        res.json({ success: true, updated: ids.length });
    } catch (error) {
        console.error("[PRE-ORDERS] Batch update failed:", error);
        res.status(500).json({ error: "Failed to batch update" });
    }
});

// ── Delete (cancel) pre-order ──
router.delete("/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
        res.status(400).json({ error: "Invalid pre-order ID" });
        return;
    }

    const [updated] = await db
        .update(productPreOrdersTable)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(eq(productPreOrdersTable.id, id))
        .returning();

    if (!updated) {
        res.status(404).json({ error: "Pre-order not found" });
        return;
    }
    res.json(updated);
});

// ── Manual trigger: mark orders ready + send pickup-started emails for a specific window ──
router.post("/:id/trigger-pickup", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
        res.status(400).json({ error: "Invalid pre-order ID" });
        return;
    }

    try {
        const { markOrdersReadyForPickup, triggerPickupEmailsForWindow } = await import("../../lib/scheduler");
        await markOrdersReadyForPickup();
        const result = await triggerPickupEmailsForWindow(id);
        res.json({ success: true, ...result });
    } catch (err) {
        console.error(`[PRE-ORDERS] Manual pickup trigger failed for window ${id}:`, err);
        res.status(500).json({ error: "Failed to trigger pickup notifications" });
    }
});

export default router;
