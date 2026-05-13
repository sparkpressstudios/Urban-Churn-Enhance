import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { couponsTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

// List all coupons
router.get("/", async (_req, res) => {
    const coupons = await db
        .select()
        .from(couponsTable)
        .orderBy(desc(couponsTable.createdAt));
    res.json(coupons);
});

// Get single coupon
router.get("/:id", async (req, res) => {
    const id = Number(req.params.id);
    const [coupon] = await db
        .select()
        .from(couponsTable)
        .where(eq(couponsTable.id, id))
        .limit(1);
    if (!coupon) {
        res.status(404).json({ error: "Coupon not found" });
        return;
    }
    res.json(coupon);
});

// Create coupon
router.post("/", async (req, res) => {
    const { code, description, type, value, minOrderCents, maxUsageCount, active, expiresAt } =
        req.body;

    if (!code || !value) {
        res.status(400).json({ error: "Code and value are required" });
        return;
    }

    const [coupon] = await db
        .insert(couponsTable)
        .values({
            code: code.toUpperCase().trim(),
            description: description ?? "",
            type: type ?? "percentage",
            value: String(value),
            minOrderCents: minOrderCents ?? 0,
            maxUsageCount: maxUsageCount ?? null,
            active: active ?? true,
            expiresAt: expiresAt ? new Date(expiresAt) : null,
        })
        .returning();

    res.status(201).json(coupon);
});

// Update coupon
router.put("/:id", async (req, res) => {
    const id = Number(req.params.id);
    const { code, description, type, value, minOrderCents, maxUsageCount, active, expiresAt } =
        req.body;

    const updates: Record<string, unknown> = {};
    if (code !== undefined) updates.code = code.toUpperCase().trim();
    if (description !== undefined) updates.description = description;
    if (type !== undefined) updates.type = type;
    if (value !== undefined) updates.value = String(value);
    if (minOrderCents !== undefined) updates.minOrderCents = minOrderCents;
    if (maxUsageCount !== undefined) updates.maxUsageCount = maxUsageCount;
    if (active !== undefined) updates.active = active;
    if (expiresAt !== undefined) updates.expiresAt = expiresAt ? new Date(expiresAt) : null;

    const [coupon] = await db
        .update(couponsTable)
        .set(updates)
        .where(eq(couponsTable.id, id))
        .returning();

    if (!coupon) {
        res.status(404).json({ error: "Coupon not found" });
        return;
    }
    res.json(coupon);
});

// Delete coupon
router.delete("/:id", async (req, res) => {
    const id = Number(req.params.id);
    const [coupon] = await db
        .delete(couponsTable)
        .where(eq(couponsTable.id, id))
        .returning();
    if (!coupon) {
        res.status(404).json({ error: "Coupon not found" });
        return;
    }
    res.json({ success: true });
});

export default router;
