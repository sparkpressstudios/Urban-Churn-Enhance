import { Router } from "express";
import { db } from "@workspace/db";
import { sentEmailsLogTable } from "@workspace/db/schema";
import { desc, like, and, gte, lte } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit as string) || 200, 500);
    const search = req.query.search as string | undefined;
    const status = req.query.status as string | undefined;
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;

    const conditions = [];
    if (search) conditions.push(like(sentEmailsLogTable.toEmail, `%${search}%`));
    if (status) conditions.push(like(sentEmailsLogTable.status, status));
    if (from) conditions.push(gte(sentEmailsLogTable.createdAt, new Date(from)));
    if (to) conditions.push(lte(sentEmailsLogTable.createdAt, new Date(to)));

    const logs = await db
        .select()
        .from(sentEmailsLogTable)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(sentEmailsLogTable.createdAt))
        .limit(limit);

    res.json(logs);
});

export default router;
