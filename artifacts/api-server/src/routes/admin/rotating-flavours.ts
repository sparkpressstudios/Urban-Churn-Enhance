import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { rotatingFlavoursTable } from "@workspace/db/schema";
import { eq, asc, and } from "drizzle-orm";

const router: IRouter = Router();

// List rotating flavours (optionally filter by month/year)
router.get("/", async (req, res) => {
    const month = req.query.month ? Number(req.query.month) : undefined;
    const year = req.query.year ? Number(req.query.year) : undefined;

    const conditions = [];
    if (month) conditions.push(eq(rotatingFlavoursTable.month, month));
    if (year) conditions.push(eq(rotatingFlavoursTable.year, year));

    const flavours = await db
        .select()
        .from(rotatingFlavoursTable)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(asc(rotatingFlavoursTable.year), asc(rotatingFlavoursTable.month), asc(rotatingFlavoursTable.sortOrder));

    res.json(flavours);
});

// Create a rotating flavour
router.post("/", async (req, res) => {
    const { name, description, imageUrl, month, year, sortOrder, active } = req.body;

    if (!name || !month || !year) {
        res.status(400).json({ error: "name, month, and year are required" });
        return;
    }

    if (month < 1 || month > 12) {
        res.status(400).json({ error: "month must be between 1 and 12" });
        return;
    }

    const [flavour] = await db
        .insert(rotatingFlavoursTable)
        .values({
            name,
            description: description || "",
            imageUrl: imageUrl || null,
            month,
            year,
            sortOrder: sortOrder ?? 0,
            active: active !== false,
        })
        .returning();

    res.status(201).json(flavour);
});

// Update a rotating flavour
router.put("/:id", async (req, res) => {
    const id = Number(req.params.id);
    const { name, description, imageUrl, month, year, sortOrder, active } = req.body;

    if (month !== undefined && (month < 1 || month > 12)) {
        res.status(400).json({ error: "month must be between 1 and 12" });
        return;
    }

    const [flavour] = await db
        .update(rotatingFlavoursTable)
        .set({
            ...(name !== undefined && { name }),
            ...(description !== undefined && { description }),
            ...(imageUrl !== undefined && { imageUrl }),
            ...(month !== undefined && { month }),
            ...(year !== undefined && { year }),
            ...(sortOrder !== undefined && { sortOrder }),
            ...(active !== undefined && { active }),
            updatedAt: new Date(),
        })
        .where(eq(rotatingFlavoursTable.id, id))
        .returning();

    if (!flavour) {
        res.status(404).json({ error: "Rotating flavour not found" });
        return;
    }

    res.json(flavour);
});

// Delete a rotating flavour
router.delete("/:id", async (req, res) => {
    const id = Number(req.params.id);

    const [flavour] = await db
        .delete(rotatingFlavoursTable)
        .where(eq(rotatingFlavoursTable.id, id))
        .returning();

    if (!flavour) {
        res.status(404).json({ error: "Rotating flavour not found" });
        return;
    }

    res.json({ success: true });
});

export default router;
