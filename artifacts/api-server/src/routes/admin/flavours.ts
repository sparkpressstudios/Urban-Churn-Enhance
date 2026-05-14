import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { flavoursTable, productsTable } from "@workspace/db/schema";
import { eq, asc, desc, inArray } from "drizzle-orm";

const router: IRouter = Router();

const FLAVOUR_TAGS = new Set([
    "classic",
    "limited",
    "seasonal",
    "fan-favorite",
    "adventurous",
    "bestseller",
    "coming-soon",
] as const);

function parseBasePrice(value: unknown): string | undefined {
    if (value === undefined) return undefined;
    const normalized = String(value).trim().replace(/^\$/, "");
    if (!normalized) return undefined;
    return normalized;
}

function parsePublishedAt(value: unknown): Date | undefined {
    if (value === undefined || value === null || value === "") return undefined;
    const parsed = new Date(String(value));
    if (Number.isNaN(parsed.getTime())) return undefined;
    return parsed;
}

function parseTag(value: unknown): {
    value: (typeof flavoursTable.$inferInsert)["tag"] | undefined;
    invalid: boolean;
} {
    if (value === undefined || value === null) return { value: undefined, invalid: false };
    const normalized = String(value).trim();
    if (!normalized) return { value: undefined, invalid: false };
    if (!FLAVOUR_TAGS.has(normalized as (typeof flavoursTable.$inferInsert)["tag"])) {
        return { value: undefined, invalid: true };
    }
    return {
        value: normalized as (typeof flavoursTable.$inferInsert)["tag"],
        invalid: false,
    };
}

function handleFlavourMutationError(error: any, res: any, context: string) {
    if (error?.code === "23505" && error?.constraint === "flavours_slug_unique") {
        res.status(409).json({ error: "Slug already exists. Please choose a unique slug." });
        return;
    }

    if (error?.code === "22P02" || error?.code === "22007") {
        res.status(400).json({ error: "Invalid field value. Check base price, tag, and publication date." });
        return;
    }

    console.error(`[FLAVOURS] ${context} failed:`, error);
    res.status(500).json({ error: `Failed to ${context.toLowerCase()} flavour` });
}

// List all flavours
router.get("/", async (_req, res) => {
    const flavours = await db
        .select()
        .from(flavoursTable)
        .orderBy(desc(flavoursTable.publishedAt));
    res.json(flavours);
});

// Get single flavour
router.get("/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
        res.status(400).json({ error: "Invalid flavour ID" });
        return;
    }
    const [flavour] = await db
        .select()
        .from(flavoursTable)
        .where(eq(flavoursTable.id, id))
        .limit(1);
    if (!flavour) {
        res.status(404).json({ error: "Flavour not found" });
        return;
    }
    res.json(flavour);
});

// Create flavour
router.post("/", async (req, res) => {
    try {
        const {
            name,
            slug,
            description,
            htmlContent,
            imageUrl,
            tag,
            emoji,
            basePrice,
            available,
            heroPosition,
            sortOrder,
            publishedAt,
        } = req.body;

        const normalizedBasePrice = parseBasePrice(basePrice);
        if (basePrice !== undefined && normalizedBasePrice === undefined) {
            res.status(400).json({ error: "basePrice must be a valid number" });
            return;
        }

        const parsedPublishedAt = parsePublishedAt(publishedAt);
        if (publishedAt !== undefined && parsedPublishedAt === undefined) {
            res.status(400).json({ error: "publishedAt must be a valid date" });
            return;
        }

        const normalizedTag = parseTag(tag);
        if (normalizedTag.invalid) {
            res.status(400).json({ error: "tag must be a valid flavour tag" });
            return;
        }

        const [flavour] = await db
            .insert(flavoursTable)
            .values({
                name,
                slug,
                description: description ?? "",
                htmlContent: htmlContent ?? "",
                imageUrl: imageUrl ?? null,
                tag: normalizedTag.value ?? "classic",
                emoji: emoji ?? "🍦",
                basePrice: normalizedBasePrice ?? "7.00",
                available: available ?? true,
                heroPosition: heroPosition ?? null,
                sortOrder: sortOrder ?? 0,
                ...(parsedPublishedAt && { publishedAt: parsedPublishedAt }),
            })
            .returning();

        res.status(201).json(flavour);
    } catch (error) {
        handleFlavourMutationError(error, res, "Create");
    }
});

// Bulk update flavours (base price, tag, available) — must be before /:id routes
router.put("/bulk/update", async (req, res) => {
    const { flavourIds, updates } = req.body;

    if (!Array.isArray(flavourIds) || flavourIds.length === 0) {
        res.status(400).json({ error: "flavourIds array is required" });
        return;
    }

    const allowed: Record<string, unknown> = { updatedAt: new Date() };
    if (updates.basePrice !== undefined) allowed.basePrice = updates.basePrice;
    if (updates.tag !== undefined) {
        const normalizedTag = parseTag(updates.tag);
        if (normalizedTag.invalid) {
            res.status(400).json({ error: "tag must be a valid flavour tag" });
            return;
        }
        if (normalizedTag.value !== undefined) {
            allowed.tag = normalizedTag.value;
        }
    }
    if (updates.available !== undefined) allowed.available = updates.available;

    let updated = 0;
    for (const fid of flavourIds) {
        const [f] = await db
            .update(flavoursTable)
            .set(allowed)
            .where(eq(flavoursTable.id, fid))
            .returning();
        if (f) updated++;
    }

    res.json({ updated });
});

// Update flavour
router.put("/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (isNaN(id)) {
            res.status(400).json({ error: "Invalid flavour ID" });
            return;
        }
        const {
            name,
            slug,
            description,
            htmlContent,
            imageUrl,
            tag,
            emoji,
            basePrice,
            available,
            heroPosition,
            sortOrder,
            publishedAt,
        } = req.body;

        const normalizedBasePrice = parseBasePrice(basePrice);
        if (basePrice !== undefined && normalizedBasePrice === undefined) {
            res.status(400).json({ error: "basePrice must be a valid number" });
            return;
        }

        const parsedPublishedAt = parsePublishedAt(publishedAt);
        if (publishedAt !== undefined && parsedPublishedAt === undefined) {
            res.status(400).json({ error: "publishedAt must be a valid date" });
            return;
        }

        const normalizedTag = parseTag(tag);
        if (normalizedTag.invalid) {
            res.status(400).json({ error: "tag must be a valid flavour tag" });
            return;
        }

        const [flavour] = await db
            .update(flavoursTable)
            .set({
                ...(name !== undefined && { name }),
                ...(slug !== undefined && { slug }),
                ...(description !== undefined && { description }),
                ...(htmlContent !== undefined && { htmlContent }),
                ...(imageUrl !== undefined && { imageUrl }),
                ...(normalizedTag.value !== undefined && { tag: normalizedTag.value }),
                ...(emoji !== undefined && { emoji }),
                ...(normalizedBasePrice !== undefined && { basePrice: normalizedBasePrice }),
                ...(available !== undefined && { available }),
                ...(heroPosition !== undefined && { heroPosition }),
                ...(sortOrder !== undefined && { sortOrder }),
                ...(publishedAt !== undefined && parsedPublishedAt && { publishedAt: parsedPublishedAt }),
                updatedAt: new Date(),
            })
            .where(eq(flavoursTable.id, id))
            .returning();

        if (!flavour) {
            res.status(404).json({ error: "Flavour not found" });
            return;
        }
        res.json(flavour);
    } catch (error) {
        handleFlavourMutationError(error, res, "Update");
    }
});

// Delete flavour
router.delete("/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
        res.status(400).json({ error: "Invalid flavour ID" });
        return;
    }
    const [flavour] = await db
        .delete(flavoursTable)
        .where(eq(flavoursTable.id, id))
        .returning();
    if (!flavour) {
        res.status(404).json({ error: "Flavour not found" });
        return;
    }
    res.json({ success: true });
});

// Duplicate flavour (copies flavour + all product variants)
router.post("/:id/duplicate", async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
        res.status(400).json({ error: "Invalid flavour ID" });
        return;
    }

    const [source] = await db
        .select()
        .from(flavoursTable)
        .where(eq(flavoursTable.id, id))
        .limit(1);

    if (!source) {
        res.status(404).json({ error: "Flavour not found" });
        return;
    }

    // Create a copy with a unique slug
    const copySlug = `${source.slug}-copy-${Date.now()}`;
    const [newFlavour] = await db
        .insert(flavoursTable)
        .values({
            name: `${source.name} (Copy)`,
            slug: copySlug,
            description: source.description,
            htmlContent: source.htmlContent,
            imageUrl: source.imageUrl,
            tag: source.tag,
            emoji: source.emoji,
            basePrice: source.basePrice,
            available: false, // start as inactive
            heroPosition: null,
            sortOrder: source.sortOrder,
        })
        .returning();

    // Copy product variants
    const sourceProducts = await db
        .select()
        .from(productsTable)
        .where(eq(productsTable.flavourId, id));

    for (const p of sourceProducts) {
        await db
            .insert(productsTable)
            .values({
                flavourId: newFlavour.id,
                sizeId: p.sizeId,
                priceOverride: p.priceOverride,
                available: p.available,
                manageStock: p.manageStock,
                stockQuantity: p.stockQuantity,
                lowStockThreshold: p.lowStockThreshold,
            })
            .onConflictDoNothing();
    }

    res.status(201).json(newFlavour);
});

export default router;
