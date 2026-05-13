import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
    productsTable,
    flavoursTable,
    sizesTable,
} from "@workspace/db/schema";
import { eq, and, asc } from "drizzle-orm";

const router: IRouter = Router();

// List all products with flavour + size info
router.get("/", async (_req, res) => {
    const products = await db
        .select({
            id: productsTable.id,
            flavourId: productsTable.flavourId,
            sizeId: productsTable.sizeId,
            priceOverride: productsTable.priceOverride,
            available: productsTable.available,
            manageStock: productsTable.manageStock,
            stockQuantity: productsTable.stockQuantity,
            lowStockThreshold: productsTable.lowStockThreshold,
            createdAt: productsTable.createdAt,
            updatedAt: productsTable.updatedAt,
            flavourName: flavoursTable.name,
            flavourSlug: flavoursTable.slug,
            flavourEmoji: flavoursTable.emoji,
            flavourTag: flavoursTable.tag,
            flavourBasePrice: flavoursTable.basePrice,
            sizeName: sizesTable.name,
            sizeSlug: sizesTable.slug,
            sizePrice: sizesTable.price,
            sizeVolumeOz: sizesTable.volumeOz,
        })
        .from(productsTable)
        .innerJoin(flavoursTable, eq(productsTable.flavourId, flavoursTable.id))
        .innerJoin(sizesTable, eq(productsTable.sizeId, sizesTable.id))
        .orderBy(asc(flavoursTable.sortOrder), asc(sizesTable.sortOrder));

    res.json(products);
});

// Get products by flavour ID (with size info)
router.get("/by-flavour/:flavourId", async (req, res) => {
    const flavourId = Number(req.params.flavourId);
    const products = await db
        .select({
            id: productsTable.id,
            flavourId: productsTable.flavourId,
            sizeId: productsTable.sizeId,
            priceOverride: productsTable.priceOverride,
            available: productsTable.available,
            manageStock: productsTable.manageStock,
            stockQuantity: productsTable.stockQuantity,
            lowStockThreshold: productsTable.lowStockThreshold,
            createdAt: productsTable.createdAt,
            updatedAt: productsTable.updatedAt,
            sizeName: sizesTable.name,
            sizeSlug: sizesTable.slug,
            sizePrice: sizesTable.price,
            sizeVolumeOz: sizesTable.volumeOz,
        })
        .from(productsTable)
        .innerJoin(sizesTable, eq(productsTable.sizeId, sizesTable.id))
        .where(eq(productsTable.flavourId, flavourId))
        .orderBy(asc(sizesTable.sortOrder));

    res.json(products);
});

// Create individual product variant
router.post("/", async (req, res) => {
    const { flavourId, sizeId, priceOverride, available, manageStock, stockQuantity, lowStockThreshold } = req.body;

    if (!flavourId || !sizeId) {
        res.status(400).json({ error: "flavourId and sizeId are required" });
        return;
    }

    const [product] = await db
        .insert(productsTable)
        .values({
            flavourId,
            sizeId,
            priceOverride: priceOverride ?? null,
            available: available ?? true,
            manageStock: manageStock ?? false,
            stockQuantity: stockQuantity ?? 0,
            lowStockThreshold: lowStockThreshold ?? 5,
        })
        .onConflictDoNothing()
        .returning();

    if (!product) {
        res.status(409).json({ error: "This flavour + size combination already exists" });
        return;
    }

    res.status(201).json(product);
});

// Update product
router.put("/:id", async (req, res) => {
    const id = Number(req.params.id);
    const { priceOverride, available, manageStock, stockQuantity, lowStockThreshold } = req.body;

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (priceOverride !== undefined) updates.priceOverride = priceOverride;
    if (available !== undefined) updates.available = available;
    if (manageStock !== undefined) updates.manageStock = manageStock;
    if (stockQuantity !== undefined) updates.stockQuantity = stockQuantity;
    if (lowStockThreshold !== undefined) updates.lowStockThreshold = lowStockThreshold;

    const [product] = await db
        .update(productsTable)
        .set(updates)
        .where(eq(productsTable.id, id))
        .returning();

    if (!product) {
        res.status(404).json({ error: "Product not found" });
        return;
    }
    res.json(product);
});

// Delete individual product variant
router.delete("/:id", async (req, res) => {
    const id = Number(req.params.id);
    const [product] = await db
        .delete(productsTable)
        .where(eq(productsTable.id, id))
        .returning();
    if (!product) {
        res.status(404).json({ error: "Product not found" });
        return;
    }
    res.json({ success: true });
});

// Regenerate products from flavour × size
router.post("/generate", async (_req, res) => {
    const allFlavours = await db.select().from(flavoursTable);
    const allSizes = await db.select().from(sizesTable);

    let created = 0;
    for (const f of allFlavours) {
        for (const s of allSizes) {
            await db
                .insert(productsTable)
                .values({
                    flavourId: f.id,
                    sizeId: s.id,
                    available: f.available,
                })
                .onConflictDoNothing();
            created++;
        }
    }

    res.json({ message: `Generated products`, count: created });
});

// Generate variations for a single flavour
router.post("/generate/:flavourId", async (req, res) => {
    const flavourId = Number(req.params.flavourId);
    const [flavour] = await db.select().from(flavoursTable).where(eq(flavoursTable.id, flavourId)).limit(1);
    if (!flavour) {
        res.status(404).json({ error: "Flavour not found" });
        return;
    }

    const allSizes = await db.select().from(sizesTable);
    let created = 0;
    for (const s of allSizes) {
        const [product] = await db
            .insert(productsTable)
            .values({
                flavourId: flavour.id,
                sizeId: s.id,
                available: flavour.available,
            })
            .onConflictDoNothing()
            .returning();
        if (product) created++;
    }

    res.json({ message: `Generated variations for ${flavour.name}`, created });
});

// Bulk update products (availability, price, stock)
router.put("/bulk/update", async (req, res) => {
    const { productIds, updates } = req.body;

    if (!Array.isArray(productIds) || productIds.length === 0) {
        res.status(400).json({ error: "productIds array is required" });
        return;
    }

    const allowed: Record<string, unknown> = { updatedAt: new Date() };
    if (updates.available !== undefined) allowed.available = updates.available;
    if (updates.priceOverride !== undefined) allowed.priceOverride = updates.priceOverride;
    if (updates.manageStock !== undefined) allowed.manageStock = updates.manageStock;
    if (updates.stockQuantity !== undefined) allowed.stockQuantity = updates.stockQuantity;

    let updated = 0;
    for (const id of productIds) {
        const [p] = await db
            .update(productsTable)
            .set(allowed)
            .where(eq(productsTable.id, id))
            .returning();
        if (p) updated++;
    }

    res.json({ updated });
});

export default router;
