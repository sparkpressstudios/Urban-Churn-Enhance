import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { customersTable } from "@workspace/db/schema";
import { eq, desc, count, ilike, or } from "drizzle-orm";
import { parseCustomerEdit } from "../../lib/customer-edit";

const router: IRouter = Router();

// Do not send password hashes or password-reset tokens to admin browsers.
const publicCustomerFields = {
    id: customersTable.id,
    email: customersTable.email,
    firstName: customersTable.firstName,
    lastName: customersTable.lastName,
    phone: customersTable.phone,
    address: customersTable.address,
    city: customersTable.city,
    state: customersTable.state,
    zip: customersTable.zip,
    country: customersTable.country,
    wooCustomerId: customersTable.wooCustomerId,
    squareCustomerId: customersTable.squareCustomerId,
    ordersCount: customersTable.ordersCount,
    totalSpentCents: customersTable.totalSpentCents,
    wholesaleCustomerId: customersTable.wholesaleCustomerId,
    hasAccount: customersTable.hasAccount,
    createdAt: customersTable.createdAt,
    updatedAt: customersTable.updatedAt,
};

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
        ? or(
            ilike(customersTable.email, `%${search}%`),
            ilike(customersTable.firstName, `%${search}%`),
            ilike(customersTable.lastName, `%${search}%`),
            ilike(customersTable.phone, `%${search}%`),
        )
        : undefined;

    const [totalResult] = await db
        .select({ count: count() })
        .from(customersTable)
        .where(whereClause);

    const customers = await db
        .select(publicCustomerFields)
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
        .select(publicCustomerFields)
        .from(customersTable)
        .where(eq(customersTable.id, id))
        .limit(1);

    if (!customer) {
        res.status(404).json({ error: "Customer not found" });
        return;
    }
    res.json(customer);
});

// Update customer profile (does not rewrite historical order contact snapshots)
router.put("/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id <= 0) {
        res.status(400).json({ error: "Invalid customer ID" });
        return;
    }
    const parsed = parseCustomerEdit(req.body);
    if (!parsed.data) {
        res.status(400).json({ error: parsed.error });
        return;
    }

    try {
        const [existing] = await db
            .select({ email: customersTable.email, hasAccount: customersTable.hasAccount })
            .from(customersTable).where(eq(customersTable.id, id)).limit(1);

        if (!existing) {
            res.status(404).json({ error: "Customer not found" });
            return;
        }
        // Changing a registered customer's login email needs a verified account change flow.
        if (existing.hasAccount && parsed.data.email !== undefined &&
            parsed.data.email !== existing.email) {
            res.status(409).json({ error: "Registered account emails require customer verification before changing" });
            return;
        }

        const [customer] = await db
            .update(customersTable)
            .set({ ...parsed.data, updatedAt: new Date() })
            .where(eq(customersTable.id, id))
            .returning(publicCustomerFields);
        res.json(customer);
    } catch (err: any) {
        if (err?.code === "23505") {
            res.status(409).json({ error: "A customer with that email already exists" });
        } else {
            console.error("[admin/customers PUT]", err);
            res.status(500).json({ error: "Unable to update customer" });
        }
    }
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
