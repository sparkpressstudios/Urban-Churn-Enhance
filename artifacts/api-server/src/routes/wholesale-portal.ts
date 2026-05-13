import { Router, type IRouter } from "express";
import crypto from "node:crypto";
import { db } from "@workspace/db";
import {
    wholesaleCustomersTable,
    wholesaleFlavoursTable,
    wholesaleOrdersTable,
    wholesaleOrderItemsTable,
    wholesaleProductsTable,
    wholesaleSizesTable,
    customersTable,
    flavoursTable,
} from "@workspace/db/schema";
import { eq, desc, and, asc, sql } from "drizzle-orm";
import { requireCustomer } from "../middlewares/customer-auth";
import {
    sendWholesalePortalOrderConfirmation,
    sendAdminWholesalePortalOrderAlert,
} from "../lib/email";
import {
    wholesaleDeliveryRunsTable,
    wholesaleDeliveryRunStopsTable,
} from "@workspace/db/schema";

const router: IRouter = Router();

// All routes require customer auth
router.use(requireCustomer);

// Helper: get the wholesale customer linked to the logged-in customer
async function getWholesaleCustomer(customerId: number) {
    const [customer] = await db
        .select({
            wholesaleCustomerId: customersTable.wholesaleCustomerId,
        })
        .from(customersTable)
        .where(eq(customersTable.id, customerId))
        .limit(1);

    if (!customer?.wholesaleCustomerId) return null;

    const [wc] = await db
        .select()
        .from(wholesaleCustomersTable)
        .where(
            and(
                eq(wholesaleCustomersTable.id, customer.wholesaleCustomerId),
                eq(wholesaleCustomersTable.status, "active"),
            ),
        )
        .limit(1);

    return wc || null;
}

// ── GET /profile – wholesale customer profile ──
router.get("/profile", async (req, res) => {
    const wc = await getWholesaleCustomer(req.customer!.userId);
    if (!wc) {
        res.status(403).json({ error: "No active wholesale account" });
        return;
    }
    res.json(wc);
});

// ── GET /products – available wholesale products grouped by size category ──
router.get("/products", async (req, res) => {
    const wc = await getWholesaleCustomer(req.customer!.userId);
    if (!wc) {
        res.status(403).json({ error: "No active wholesale account" });
        return;
    }

    const products = await db
        .select({
            id: wholesaleProductsTable.id,
            flavourId: wholesaleProductsTable.flavourId,
            flavourName: flavoursTable.name,
            flavourDescription: wholesaleFlavoursTable.description,
            flavourAllergens: wholesaleFlavoursTable.allergens,
            flavourIsSeasonal: wholesaleFlavoursTable.isSeasonal,
            name: wholesaleProductsTable.name,
            wholesaleSizeId: wholesaleProductsTable.wholesaleSizeId,
            sizeCategory: wholesaleProductsTable.sizeCategory,
            sizeName: wholesaleSizesTable.name,
            sizeSlug: wholesaleSizesTable.slug,
            sizeDescription: wholesaleSizesTable.description,
            sizeSortOrder: wholesaleSizesTable.sortOrder,
            unitDescription: wholesaleProductsTable.unitDescription,
            priceCents: wholesaleProductsTable.priceCents,
            sortOrder: wholesaleProductsTable.sortOrder,
        })
        .from(wholesaleProductsTable)
        .innerJoin(
            flavoursTable,
            eq(wholesaleProductsTable.flavourId, flavoursTable.id),
        )
        .leftJoin(
            wholesaleFlavoursTable,
            eq(wholesaleFlavoursTable.flavourId, wholesaleProductsTable.flavourId),
        )
        .leftJoin(
            wholesaleSizesTable,
            eq(wholesaleProductsTable.wholesaleSizeId, wholesaleSizesTable.id),
        )
        .where(
            and(
                eq(wholesaleProductsTable.available, true),
                sql`COALESCE(${wholesaleFlavoursTable.active}, true) = true`,
            ),
        )
        .orderBy(
            asc(wholesaleSizesTable.sortOrder),
            asc(wholesaleProductsTable.sortOrder),
        );

    res.json(products);
});

// ── POST /orders – submit a new wholesale order ──
router.post("/orders", async (req, res) => {
    const wc = await getWholesaleCustomer(req.customer!.userId);
    if (!wc) {
        res.status(403).json({ error: "No active wholesale account" });
        return;
    }

    const { items, requestedDeliveryDate, deliveryMethod, notes } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
        res.status(400).json({ error: "At least one item is required" });
        return;
    }

    // Validate delivery date: must be at least 3 business days out
    if (requestedDeliveryDate) {
        const requested = new Date(requestedDeliveryDate + "T00:00:00");
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        let businessDays = 0;
        const cursor = new Date(now);
        while (businessDays < 3) {
            cursor.setDate(cursor.getDate() + 1);
            const day = cursor.getDay();
            if (day !== 0 && day !== 6) businessDays++;
        }

        if (requested < cursor) {
            res.status(400).json({
                error: "Delivery date must be at least 3 business days from today",
            });
            return;
        }
    }

    // Validate items — fetch products to get prices
    const productIds = items.map((i: any) => i.wholesaleProductId).filter(Boolean);
    const productsMap = new Map<number, { priceCents: number; name: string; flavourName?: string }>();

    if (productIds.length > 0) {
        const products = await db
            .select({
                id: wholesaleProductsTable.id,
                priceCents: wholesaleProductsTable.priceCents,
                name: wholesaleProductsTable.name,
                flavourName: flavoursTable.name,
            })
            .from(wholesaleProductsTable)
            .innerJoin(flavoursTable, eq(wholesaleProductsTable.flavourId, flavoursTable.id))
            .where(eq(wholesaleProductsTable.available, true));

        for (const p of products) {
            productsMap.set(p.id, p);
        }
    }

    // Generate order number
    const orderNumber = `WO-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;

    // Calculate items and subtotal
    let subtotalCents = 0;
    const orderItems: {
        wholesaleProductId: number | null;
        flavourId: number | null;
        productDescription: string;
        quantity: number;
        unitPriceCents: number;
        matched: boolean;
        notes: string;
    }[] = [];

    for (const item of items) {
        const qty = Math.min(Math.max(1, Math.floor(Number(item.quantity) || 1)), 9999);

        if (item.wholesaleProductId) {
            const product = productsMap.get(item.wholesaleProductId);
            if (!product) {
                res.status(400).json({ error: `Product ${item.wholesaleProductId} not found or unavailable` });
                return;
            }
            subtotalCents += product.priceCents * qty;
            orderItems.push({
                wholesaleProductId: item.wholesaleProductId,
                flavourId: null,
                productDescription: product.name,
                quantity: qty,
                unitPriceCents: product.priceCents,
                matched: true,
                notes: item.notes || "",
            });
        } else if (item.customDescription) {
            // Custom flavour request (no product match)
            orderItems.push({
                wholesaleProductId: null,
                flavourId: null,
                productDescription: item.customDescription,
                quantity: qty,
                unitPriceCents: 0,
                matched: false,
                notes: item.notes || "Custom flavour request",
            });
        }
    }

    // Create order
    const [order] = await db
        .insert(wholesaleOrdersTable)
        .values({
            orderNumber,
            wholesaleCustomerId: wc.id,
            status: "pending_review",
            requestedDeliveryDate: requestedDeliveryDate || null,
            deliveryMethod: deliveryMethod || wc.deliveryMethod || "delivery",
            subtotalCents,
            adminNotes: notes || "",
        })
        .returning();

    // Create order items
    if (orderItems.length > 0) {
        await db.insert(wholesaleOrderItemsTable).values(
            orderItems.map((item) => ({
                ...item,
                wholesaleOrderId: order.id,
            })),
        );
    }

    // Send emails (fire-and-forget)
    const emailItems = orderItems.map((item) => ({
        description: item.productDescription,
        quantity: item.quantity,
        unitPriceCents: item.unitPriceCents,
    }));

    sendWholesalePortalOrderConfirmation({
        customerEmail: wc.email,
        contactName: wc.contactName || wc.businessName,
        businessName: wc.businessName,
        orderNumber: order.orderNumber,
        items: emailItems,
        subtotalCents,
        deliveryMethod: order.deliveryMethod,
        requestedDeliveryDate: requestedDeliveryDate || null,
    }).catch((e) => console.error("[EMAIL] Wholesale portal order confirmation failed:", e));

    sendAdminWholesalePortalOrderAlert({
        businessName: wc.businessName,
        orderNumber: order.orderNumber,
        itemCount: orderItems.length,
        subtotalCents,
        deliveryMethod: order.deliveryMethod,
        requestedDeliveryDate: requestedDeliveryDate || null,
    }).catch((e) => console.error("[EMAIL] Admin wholesale order alert failed:", e));

    res.status(201).json(order);
});

// ── GET /orders – list customer's wholesale orders ──
router.get("/orders", async (req, res) => {
    const wc = await getWholesaleCustomer(req.customer!.userId);
    if (!wc) {
        res.status(403).json({ error: "No active wholesale account" });
        return;
    }

    const orders = await db
        .select()
        .from(wholesaleOrdersTable)
        .where(eq(wholesaleOrdersTable.wholesaleCustomerId, wc.id))
        .orderBy(desc(wholesaleOrdersTable.createdAt))
        .limit(100);

    res.json(orders);
});

// ── GET /orders/:id – order detail ──
router.get("/orders/:id", async (req, res) => {
    const wc = await getWholesaleCustomer(req.customer!.userId);
    if (!wc) {
        res.status(403).json({ error: "No active wholesale account" });
        return;
    }

    const id = Number(req.params.id);
    const [order] = await db
        .select()
        .from(wholesaleOrdersTable)
        .where(
            and(
                eq(wholesaleOrdersTable.id, id),
                eq(wholesaleOrdersTable.wholesaleCustomerId, wc.id),
            ),
        )
        .limit(1);

    if (!order) {
        res.status(404).json({ error: "Order not found" });
        return;
    }

    const items = await db
        .select({
            id: wholesaleOrderItemsTable.id,
            wholesaleProductId: wholesaleOrderItemsTable.wholesaleProductId,
            productDescription: wholesaleOrderItemsTable.productDescription,
            quantity: wholesaleOrderItemsTable.quantity,
            unitPriceCents: wholesaleOrderItemsTable.unitPriceCents,
            matched: wholesaleOrderItemsTable.matched,
            notes: wholesaleOrderItemsTable.notes,
        })
        .from(wholesaleOrderItemsTable)
        .where(eq(wholesaleOrderItemsTable.wholesaleOrderId, order.id));

    // Include delivery run stop info if available
    const [deliveryStop] = await db
        .select({
            stopStatus: wholesaleDeliveryRunStopsTable.status,
            deliveredAt: wholesaleDeliveryRunStopsTable.deliveredAt,
            scheduledDate: wholesaleDeliveryRunsTable.scheduledDate,
            driverName: wholesaleDeliveryRunsTable.driverName,
            runStatus: wholesaleDeliveryRunsTable.status,
        })
        .from(wholesaleDeliveryRunStopsTable)
        .innerJoin(
            wholesaleDeliveryRunsTable,
            eq(wholesaleDeliveryRunStopsTable.deliveryRunId, wholesaleDeliveryRunsTable.id),
        )
        .where(eq(wholesaleDeliveryRunStopsTable.wholesaleOrderId, order.id))
        .orderBy(asc(wholesaleDeliveryRunsTable.scheduledDate))
        .limit(1);

    res.json({
        ...order,
        items,
        delivery: deliveryStop
            ? {
                scheduledDate: deliveryStop.scheduledDate,
                stopStatus: deliveryStop.stopStatus,
                deliveredAt: deliveryStop.deliveredAt,
                runStatus: deliveryStop.runStatus,
            }
            : null,
    });
});

export default router;
