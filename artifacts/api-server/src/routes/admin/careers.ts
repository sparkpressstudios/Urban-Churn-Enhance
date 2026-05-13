import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { jobPostingsTable, careerBenefitsTable } from "@workspace/db/schema";
import { eq, asc } from "drizzle-orm";

const router: IRouter = Router();

// ══════════════════════════════════════════
//  JOB POSTINGS
// ══════════════════════════════════════════

// List all job postings
router.get("/jobs", async (_req, res) => {
    const jobs = await db
        .select()
        .from(jobPostingsTable)
        .orderBy(asc(jobPostingsTable.sortOrder));
    res.json(jobs);
});

// Create a job posting
router.post("/jobs", async (req, res) => {
    const { title, locations, type, description, highlights, active, sortOrder } = req.body;

    if (!title) {
        res.status(400).json({ error: "title is required" });
        return;
    }

    const [job] = await db
        .insert(jobPostingsTable)
        .values({
            title,
            locations: locations || "",
            type: type || "part_time",
            description: description || "",
            highlights: highlights || [],
            active: active !== false,
            sortOrder: sortOrder ?? 0,
        })
        .returning();

    res.status(201).json(job);
});

// Update a job posting
router.put("/jobs/:id", async (req, res) => {
    const id = Number(req.params.id);
    const { title, locations, type, description, highlights, active, sortOrder } = req.body;

    const [job] = await db
        .update(jobPostingsTable)
        .set({
            ...(title !== undefined && { title }),
            ...(locations !== undefined && { locations }),
            ...(type !== undefined && { type }),
            ...(description !== undefined && { description }),
            ...(highlights !== undefined && { highlights }),
            ...(active !== undefined && { active }),
            ...(sortOrder !== undefined && { sortOrder }),
            updatedAt: new Date(),
        })
        .where(eq(jobPostingsTable.id, id))
        .returning();

    if (!job) {
        res.status(404).json({ error: "Job posting not found" });
        return;
    }

    res.json(job);
});

// Delete (soft) a job posting
router.delete("/jobs/:id", async (req, res) => {
    const id = Number(req.params.id);

    const [job] = await db
        .update(jobPostingsTable)
        .set({ active: false, updatedAt: new Date() })
        .where(eq(jobPostingsTable.id, id))
        .returning();

    if (!job) {
        res.status(404).json({ error: "Job posting not found" });
        return;
    }

    res.json({ success: true });
});

// ══════════════════════════════════════════
//  CAREER BENEFITS
// ══════════════════════════════════════════

// List all benefits
router.get("/benefits", async (_req, res) => {
    const benefits = await db
        .select()
        .from(careerBenefitsTable)
        .orderBy(asc(careerBenefitsTable.sortOrder));
    res.json(benefits);
});

// Create a benefit
router.post("/benefits", async (req, res) => {
    const { title, description, iconName, iconColor, active, sortOrder } = req.body;

    if (!title) {
        res.status(400).json({ error: "title is required" });
        return;
    }

    const [benefit] = await db
        .insert(careerBenefitsTable)
        .values({
            title,
            description: description || "",
            iconName: iconName || "star",
            iconColor: iconColor || "#d4a853",
            active: active !== false,
            sortOrder: sortOrder ?? 0,
        })
        .returning();

    res.status(201).json(benefit);
});

// Update a benefit
router.put("/benefits/:id", async (req, res) => {
    const id = Number(req.params.id);
    const { title, description, iconName, iconColor, active, sortOrder } = req.body;

    const [benefit] = await db
        .update(careerBenefitsTable)
        .set({
            ...(title !== undefined && { title }),
            ...(description !== undefined && { description }),
            ...(iconName !== undefined && { iconName }),
            ...(iconColor !== undefined && { iconColor }),
            ...(active !== undefined && { active }),
            ...(sortOrder !== undefined && { sortOrder }),
            updatedAt: new Date(),
        })
        .where(eq(careerBenefitsTable.id, id))
        .returning();

    if (!benefit) {
        res.status(404).json({ error: "Benefit not found" });
        return;
    }

    res.json(benefit);
});

// Delete (soft) a benefit
router.delete("/benefits/:id", async (req, res) => {
    const id = Number(req.params.id);

    const [benefit] = await db
        .update(careerBenefitsTable)
        .set({ active: false, updatedAt: new Date() })
        .where(eq(careerBenefitsTable.id, id))
        .returning();

    if (!benefit) {
        res.status(404).json({ error: "Benefit not found" });
        return;
    }

    res.json({ success: true });
});

export default router;
