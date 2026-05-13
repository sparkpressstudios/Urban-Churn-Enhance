import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { bakeryOrdersTable } from "@workspace/db/schema";
import { eq, desc, and, gte, lte, sql, count, ilike, or } from "drizzle-orm";
import { sendBakeryInvoiceEmail } from "../../lib/email";

const router: IRouter = Router();

// Dashboard stats
router.get("/stats", async (_req, res) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [total] = await db.select({ count: count() }).from(bakeryOrdersTable);
    const [todayCount] = await db
        .select({ count: count() })
        .from(bakeryOrdersTable)
        .where(gte(bakeryOrdersTable.createdAt, today));
    const [pending] = await db
        .select({ count: count() })
        .from(bakeryOrdersTable)
        .where(eq(bakeryOrdersTable.status, "pending"));
    const [completed] = await db
        .select({ count: count() })
        .from(bakeryOrdersTable)
        .where(eq(bakeryOrdersTable.status, "completed"));

    res.json({
        totalOrders: total.count,
        todayOrders: todayCount.count,
        pendingOrders: pending.count,
        completedOrders: completed.count,
    });
});

// List orders with filters
router.get("/", async (req, res) => {
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;

    const conditions = [];
    if (status) conditions.push(eq(bakeryOrdersTable.status, status as any));
    if (search) {
        conditions.push(
            or(
                ilike(bakeryOrdersTable.customerName, `%${search}%`),
                ilike(bakeryOrdersTable.customerEmail, `%${search}%`),
                ilike(bakeryOrdersTable.orderNumber, `%${search}%`),
            )!,
        );
    }

    const orders = await db
        .select({
            id: bakeryOrdersTable.id,
            orderNumber: bakeryOrdersTable.orderNumber,
            customerName: bakeryOrdersTable.customerName,
            customerPhone: bakeryOrdersTable.customerPhone,
            customerEmail: bakeryOrdersTable.customerEmail,
            pickupDate: bakeryOrdersTable.pickupDate,
            pickupTime: bakeryOrdersTable.pickupTime,
            referral: bakeryOrdersTable.referral,
            orderType: bakeryOrdersTable.orderType,
            orderDetails: bakeryOrdersTable.orderDetails,
            addOns: bakeryOrdersTable.addOns,
            specialRequests: bakeryOrdersTable.specialRequests,
            inspirationPhotoUrl: bakeryOrdersTable.inspirationPhotoUrl,
            totalPriceCents: bakeryOrdersTable.totalPriceCents,
            status: bakeryOrdersTable.status,
            adminNotes: bakeryOrdersTable.adminNotes,
            createdAt: bakeryOrdersTable.createdAt,
            updatedAt: bakeryOrdersTable.updatedAt,
        })
        .from(bakeryOrdersTable)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(bakeryOrdersTable.createdAt));

    res.json(orders);
});

// Get single order
router.get("/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const [order] = await db
        .select()
        .from(bakeryOrdersTable)
        .where(eq(bakeryOrdersTable.id, id))
        .limit(1);

    if (!order) {
        res.status(404).json({ error: "Order not found" });
        return;
    }
    res.json(order);
});

// Update order status
router.put("/:id/status", async (req, res) => {
    const id = parseInt(req.params.id);
    const { status } = req.body;

    const valid = ["pending", "confirmed", "in_progress", "completed", "cancelled"];
    if (!valid.includes(status)) {
        res.status(400).json({ error: "Invalid status" });
        return;
    }

    const [updated] = await db
        .update(bakeryOrdersTable)
        .set({ status, updatedAt: new Date() })
        .where(eq(bakeryOrdersTable.id, id))
        .returning();

    if (!updated) {
        res.status(404).json({ error: "Order not found" });
        return;
    }
    res.json(updated);
});

// Update admin notes
router.put("/:id/notes", async (req, res) => {
    const id = parseInt(req.params.id);
    const { adminNotes } = req.body;

    const [updated] = await db
        .update(bakeryOrdersTable)
        .set({ adminNotes: adminNotes || "", updatedAt: new Date() })
        .where(eq(bakeryOrdersTable.id, id))
        .returning();

    if (!updated) {
        res.status(404).json({ error: "Order not found" });
        return;
    }
    res.json(updated);
});

// CSV export
router.get("/export/csv", async (req, res) => {
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;

    const conditions = [];
    if (from) conditions.push(gte(bakeryOrdersTable.createdAt, new Date(from)));
    if (to) conditions.push(lte(bakeryOrdersTable.createdAt, new Date(to)));

    const orders = await db
        .select()
        .from(bakeryOrdersTable)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(bakeryOrdersTable.createdAt));

    const headers = [
        "Order Number", "Status", "Customer Name", "Phone", "Email",
        "Pickup Date", "Pickup Time", "Order Type", "Total",
        "Special Requests", "Photo URL", "Submitted",
    ];

    const rows = orders.map((o) => [
        o.orderNumber,
        o.status,
        o.customerName,
        o.customerPhone,
        o.customerEmail,
        o.pickupDate,
        o.pickupTime,
        o.orderType,
        `$${(o.totalPriceCents / 100).toFixed(2)}`,
        (o.specialRequests || "").replace(/"/g, '""'),
        o.inspirationPhotoUrl || "",
        o.createdAt.toISOString(),
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.map((v) => `"${v}"`).join(","))].join("\n");

    const date = new Date().toISOString().split("T")[0];
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=bakery-orders-${date}.csv`);
    res.send(csv);
});

// Send invoice email to customer
router.post("/:id/send-invoice", async (req, res) => {
    const id = parseInt(req.params.id);
    const { message, amountCents } = req.body;

    const [order] = await db
        .select()
        .from(bakeryOrdersTable)
        .where(eq(bakeryOrdersTable.id, id))
        .limit(1);

    if (!order) {
        res.status(404).json({ error: "Order not found" });
        return;
    }

    try {
        await sendBakeryInvoiceEmail({
            customerName: order.customerName,
            customerEmail: order.customerEmail,
            orderNumber: order.orderNumber,
            orderType: order.orderType,
            pickupDate: order.pickupDate,
            pickupTime: order.pickupTime,
            totalPriceCents: amountCents || order.totalPriceCents,
            adminMessage: message || "",
        });

        // Auto-move to confirmed if still pending
        if (order.status === "pending") {
            await db
                .update(bakeryOrdersTable)
                .set({ status: "confirmed", updatedAt: new Date() })
                .where(eq(bakeryOrdersTable.id, id));
        }

        res.json({ success: true });
    } catch (error) {
        console.error("[BAKERY] Invoice send failed:", error);
        res.status(500).json({ error: "Failed to send invoice email" });
    }
});

export default router;
