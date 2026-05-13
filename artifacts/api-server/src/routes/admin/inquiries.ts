import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
    inquiriesTable,
    inquiryNotesTable,
    adminUsersTable,
} from "@workspace/db/schema";
import { eq, desc, ilike, and, sql, gte, lte, count } from "drizzle-orm";

const router: IRouter = Router();

// ══════════════════════════════════════════
//  ADMIN USERS (for assign-to dropdown)
//  Must be before /:id routes
// ══════════════════════════════════════════

router.get("/meta/admins", async (_req, res) => {
    const admins = await db
        .select({ id: adminUsersTable.id, username: adminUsersTable.username })
        .from(adminUsersTable);
    res.json(admins);
});

// ══════════════════════════════════════════
//  STATS — counts by status & type
// ══════════════════════════════════════════

router.get("/stats", async (_req, res) => {
    const [byStatus, byType] = await Promise.all([
        db
            .select({
                status: inquiriesTable.status,
                count: count(),
            })
            .from(inquiriesTable)
            .groupBy(inquiriesTable.status),
        db
            .select({
                type: inquiriesTable.type,
                count: count(),
            })
            .from(inquiriesTable)
            .groupBy(inquiriesTable.type),
    ]);

    res.json({ byStatus, byType });
});

// ══════════════════════════════════════════
//  LIST — filtered, paginated
// ══════════════════════════════════════════

router.get("/", async (req, res) => {
    const {
        type,
        status,
        search,
        dateFrom,
        dateTo,
        limit: limitStr,
        offset: offsetStr,
    } = req.query as Record<string, string | undefined>;

    const limit = Math.min(Number(limitStr) || 50, 200);
    const offset = Number(offsetStr) || 0;

    const conditions = [];

    if (type && type !== "all") {
        conditions.push(eq(inquiriesTable.type, type as any));
    }
    if (status && status !== "all") {
        conditions.push(eq(inquiriesTable.status, status as any));
    }
    if (search) {
        conditions.push(
            sql`(${inquiriesTable.name} ILIKE ${"%" + search + "%"} OR ${inquiriesTable.email} ILIKE ${"%" + search + "%"})`,
        );
    }
    if (dateFrom) {
        conditions.push(gte(inquiriesTable.createdAt, new Date(dateFrom)));
    }
    if (dateTo) {
        conditions.push(lte(inquiriesTable.createdAt, new Date(dateTo)));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    // Get inquiries with note count
    const inquiries = await db
        .select({
            id: inquiriesTable.id,
            type: inquiriesTable.type,
            status: inquiriesTable.status,
            name: inquiriesTable.name,
            email: inquiriesTable.email,
            phone: inquiriesTable.phone,
            subject: inquiriesTable.subject,
            message: inquiriesTable.message,
            formData: inquiriesTable.formData,
            assignedTo: inquiriesTable.assignedTo,
            createdAt: inquiriesTable.createdAt,
            updatedAt: inquiriesTable.updatedAt,
            noteCount: sql<number>`(SELECT COUNT(*) FROM inquiry_notes WHERE inquiry_id = ${inquiriesTable.id})`.as("note_count"),
        })
        .from(inquiriesTable)
        .where(where)
        .orderBy(desc(inquiriesTable.createdAt))
        .limit(limit)
        .offset(offset);

    const [{ total }] = await db
        .select({ total: count() })
        .from(inquiriesTable)
        .where(where);

    res.json({ inquiries, total });
});

// ══════════════════════════════════════════
//  GET SINGLE — with notes
// ══════════════════════════════════════════

router.get("/:id", async (req, res) => {
    const id = Number(req.params.id);

    const [inquiry] = await db
        .select()
        .from(inquiriesTable)
        .where(eq(inquiriesTable.id, id));

    if (!inquiry) {
        res.status(404).json({ error: "Inquiry not found" });
        return;
    }

    const notes = await db
        .select()
        .from(inquiryNotesTable)
        .where(eq(inquiryNotesTable.inquiryId, id))
        .orderBy(desc(inquiryNotesTable.createdAt));

    res.json({ ...inquiry, notes });
});

// ══════════════════════════════════════════
//  UPDATE — status, assignedTo
// ══════════════════════════════════════════

router.put("/:id", async (req, res) => {
    const id = Number(req.params.id);
    const { status, assignedTo } = req.body;

    const [inquiry] = await db
        .update(inquiriesTable)
        .set({
            ...(status !== undefined && { status }),
            ...(assignedTo !== undefined && { assignedTo }),
            updatedAt: new Date(),
        })
        .where(eq(inquiriesTable.id, id))
        .returning();

    if (!inquiry) {
        res.status(404).json({ error: "Inquiry not found" });
        return;
    }

    res.json(inquiry);
});

// ══════════════════════════════════════════
//  QUICK STATUS UPDATE
// ══════════════════════════════════════════

router.put("/:id/status", async (req, res) => {
    const id = Number(req.params.id);
    const { status } = req.body;

    if (!status) {
        res.status(400).json({ error: "status is required" });
        return;
    }

    const [inquiry] = await db
        .update(inquiriesTable)
        .set({ status, updatedAt: new Date() })
        .where(eq(inquiriesTable.id, id))
        .returning();

    if (!inquiry) {
        res.status(404).json({ error: "Inquiry not found" });
        return;
    }

    res.json(inquiry);
});

// ══════════════════════════════════════════
//  ADD NOTE
// ══════════════════════════════════════════

router.post("/:id/notes", async (req, res) => {
    const id = Number(req.params.id);
    const { content } = req.body;

    if (!content?.trim()) {
        res.status(400).json({ error: "content is required" });
        return;
    }

    // Verify inquiry exists
    const [inquiry] = await db
        .select({ id: inquiriesTable.id })
        .from(inquiriesTable)
        .where(eq(inquiriesTable.id, id));

    if (!inquiry) {
        res.status(404).json({ error: "Inquiry not found" });
        return;
    }

    const author = (req as any).user?.username || "Admin";

    const [note] = await db
        .insert(inquiryNotesTable)
        .values({ inquiryId: id, content: content.trim(), author })
        .returning();

    // Update the inquiry's updatedAt timestamp
    await db
        .update(inquiriesTable)
        .set({ updatedAt: new Date() })
        .where(eq(inquiriesTable.id, id));

    res.status(201).json(note);
});

// ══════════════════════════════════════════
//  DELETE (archive)
// ══════════════════════════════════════════

router.delete("/:id", async (req, res) => {
    const id = Number(req.params.id);

    const [inquiry] = await db
        .update(inquiriesTable)
        .set({ status: "archived", updatedAt: new Date() })
        .where(eq(inquiriesTable.id, id))
        .returning();

    if (!inquiry) {
        res.status(404).json({ error: "Inquiry not found" });
        return;
    }

    res.json({ success: true });
});

export default router;
