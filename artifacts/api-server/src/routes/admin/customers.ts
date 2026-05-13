import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { customersTable } from "@workspace/db/schema";
import { eq, desc, asc, count, ilike } from "drizzle-orm";

const router: IRouter = Router();

// Create customer (admin-created record, no password)
router.post("/", async (req, res) => {
    const { firstName, lastName, email, phone, address, city, state, zip, country } = req.body;

    if (!email) {
        res.status(400).json({ error: "email is required" });
        return;
    }

    const normalizedEmail = email.toLowerCase().trim();

    try {
        const [customer] = await db
            .insert(customersTable)
            .values({
                email: normalizedEmail,
                firstName: firstName || "",
                lastName: lastName || "",
                phone: phone || "",
                address: address || "",
                city: city || "",
                state: state || "",
                zip: zip || "",
                country: country || "US",
                hasAccount: false,
            })
            .returning();

        res.status(201).json(customer);
    } catch (err: any) {
        if (err?.code === "23505") {
            res.status(409).json({ error: "A customer with this email already exists" });
        } else {
            console.error("[admin/customers POST]", err?.message || err);
            res.status(500).json({ error: "Failed to create customer" });
        }
    }
});

// List customers with pagination
router.get("/", async (req, res) => {
    const search = req.query.search as string | undefined;
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    const whereClause = search
        ? ilike(customersTable.email, `%${search}%`)
        : undefined;

    const [totalResult] = await db
        .select({ count: count() })
        .from(customersTable)
        .where(whereClause);

    const customers = await db
        .select()
        .from(customersTable)
        .where(whereClause)
        .orderBy(desc(customersTable.createdAt))
        .limit(limit)
        .offset(offset);

    res.json({ data: customers, total: totalResult.count, limit, offset });
});

// Get single customer
router.get("/:id", async (req, res) => {
    const id = Number(req.params.id);
    const [customer] = await db
        .select()
        .from(customersTable)
        .where(eq(customersTable.id, id))
        .limit(1);

    if (!customer) {
        res.status(404).json({ error: "Customer not found" });
        return;
    }
    res.json(customer);
});

// Update customer
router.put("/:id", async (req, res) => {
    const id = Number(req.params.id);
    const { firstName, lastName, phone, address, city, state, zip, country } =
        req.body;

    const [customer] = await db
        .update(customersTable)
        .set({
            firstName,
            lastName,
            phone,
            address,
            city,
            state,
            zip,
            country,
            updatedAt: new Date(),
        })
        .where(eq(customersTable.id, id))
        .returning();

    if (!customer) {
        res.status(404).json({ error: "Customer not found" });
        return;
    }
    res.json(customer);
});

// Delete customer
router.delete("/:id", async (req, res) => {
    const id = Number(req.params.id);
    const [customer] = await db
        .delete(customersTable)
        .where(eq(customersTable.id, id))
        .returning();

    if (!customer) {
        res.status(404).json({ error: "Customer not found" });
        return;
    }
    res.json({ success: true });
});

// Stats
router.get("/stats/summary", async (_req, res) => {
    const [total] = await db
        .select({ count: count() })
        .from(customersTable);
    res.json({ totalCustomers: total.count });
});

export default router;
