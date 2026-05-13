import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sizesTable } from "@workspace/db/schema";
import { eq, asc } from "drizzle-orm";

const router: IRouter = Router();

// List all sizes
router.get("/", async (_req, res) => {
    const sizes = await db
        .select()
        .from(sizesTable)
        .orderBy(asc(sizesTable.sortOrder));
    res.json(sizes);
});

// Create size
router.post("/", async (req, res) => {
    const { name, slug, volumeOz, price, description, sortOrder } = req.body;

    if (!name || !slug || volumeOz === undefined || price === undefined) {
        res.status(400).json({ error: "name, slug, volumeOz, and price are required" });
        return;
    }

    try {
        const [size] = await db
            .insert(sizesTable)
            .values({
                name,
                slug,
                volumeOz: Number(volumeOz),
                price: String(price),
                description: description ?? "",
                sortOrder: sortOrder != null ? Number(sortOrder) : 0,
            })
            .returning();

        res.status(201).json(size);
    } catch (err: any) {
        const pgError = err?.cause;
        if (pgError?.code === "23505") {
            res.status(409).json({ error: `A size with slug "${slug}" already exists` });
            return;
        }
        console.error("[sizes POST]", pgError?.message || err?.message || err);
        res.status(500).json({ error: pgError?.message || err?.message || "Failed to create size" });
    }
});

// Update size
router.put("/:id", async (req, res) => {
    const id = Number(req.params.id);
    const { name, slug, volumeOz, price, description, sortOrder } = req.body;

    try {
        const [size] = await db
            .update(sizesTable)
            .set({
                ...(name !== undefined && { name }),
                ...(slug !== undefined && { slug }),
                ...(volumeOz !== undefined && { volumeOz: Number(volumeOz) }),
                ...(price !== undefined && { price: String(price) }),
                ...(description !== undefined && { description }),
                ...(sortOrder !== undefined && { sortOrder: Number(sortOrder) }),
            })
            .where(eq(sizesTable.id, id))
            .returning();

        if (!size) {
            res.status(404).json({ error: "Size not found" });
            return;
        }
        res.json(size);
    } catch (err: any) {
        const pgError = err?.cause;
        if (pgError?.code === "23505") {
            res.status(409).json({ error: `A size with slug "${slug}" already exists` });
            return;
        }
        console.error("[sizes PUT]", pgError?.message || err?.message || err);
        res.status(500).json({ error: pgError?.message || err?.message || "Failed to update size" });
    }
});

// Delete size
router.delete("/:id", async (req, res) => {
    const id = Number(req.params.id);
    try {
        const [size] = await db
            .delete(sizesTable)
            .where(eq(sizesTable.id, id))
            .returning();
        if (!size) {
            res.status(404).json({ error: "Size not found" });
            return;
        }
        res.json({ success: true });
    } catch (err: any) {
        const pgError = err?.cause;
        console.error("[sizes DELETE]", pgError?.message || err?.message || err);
        res.status(500).json({ error: pgError?.message || err?.message || "Failed to delete size" });
    }
});

export default router;
