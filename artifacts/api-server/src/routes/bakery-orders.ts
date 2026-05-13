import { Router, type IRouter } from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { db } from "@workspace/db";
import {
    bakeryOrdersTable,
    productPreOrdersTable,
    preOrderLocationsTable,
    productsTable,
    flavoursTable,
    inquiriesTable,
} from "@workspace/db/schema";
import { eq, and, or, gte, lte, lt, inArray } from "drizzle-orm";
import {
    sendBakeryOrderNotification,
    sendBakeryOrderConfirmation,
} from "../lib/email";

const router: IRouter = Router();

// Upload setup for inspiration photos
const bakeryUploadsDir = path.join(process.cwd(), "uploads", "bakery");
fs.mkdirSync(bakeryUploadsDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, bakeryUploadsDir),
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const name = crypto.randomBytes(16).toString("hex");
        cb(null, `${name}${ext}`);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const allowed = ["image/jpeg", "image/png", "image/webp"];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Only JPEG, PNG, and WebP images are allowed"));
        }
    },
});

// Pricing logic (server-side — don't trust client)
function calculateTotalCents(
    orderType: string,
    orderDetails: Record<string, any>,
    addOns: Record<string, any>,
): number {
    let totalCents = 0;

    switch (orderType) {
        case "Pre-Stacked Ice Cream Cake":
            totalCents = 6500;
            break;
        case "Custom Ice Cream Cake":
            totalCents = 7500;
            break;
        case "Cupcakes by the Dozen": {
            const qty = Math.max(1, Math.min(10, parseInt(orderDetails.quantity) || 1));
            totalCents = 3600 * qty;
            break;
        }
        case "Custom Cake": {
            const size = orderDetails.cakeSize;
            if (size === "8-inch") totalCents = 12500;
            else if (size === "7-inch") totalCents = 10000;
            else totalCents = 7500; // 6-inch default
            // Filling add-on
            if (orderDetails.filling && orderDetails.fillingFlavor) {
                totalCents += 1500;
            }
            break;
        }
        case "Custom Cupcakes": {
            const qty = Math.max(1, Math.min(10, parseInt(orderDetails.quantity) || 1));
            totalCents = 3600 * qty;
            // Filling per dozen
            if (orderDetails.filling && orderDetails.fillingFlavor) {
                totalCents += 1000 * qty;
            }
            break;
        }
    }

    // Add-ons for ice cream cake types
    if (
        orderType === "Pre-Stacked Ice Cream Cake" ||
        orderType === "Custom Ice Cream Cake"
    ) {
        if (addOns.topper) totalCents += 850;
        if (addOns.colorAccents) totalCents += 1000;
    }

    return totalCents;
}

const LEAD_TIME_HOURS = 96;

router.post("/", upload.single("inspirationPhoto"), async (req, res) => {
    try {
        const {
            customerName,
            customerPhone,
            customerEmail,
            pickupDate,
            pickupTime,
            referral,
            orderType,
            specialRequests,
            locationId,
        } = req.body;

        // Parse JSON fields sent as strings (multipart form)
        let orderDetails: Record<string, any> = {};
        let addOns: Record<string, any> = {};
        try {
            orderDetails = typeof req.body.orderDetails === "string"
                ? JSON.parse(req.body.orderDetails)
                : req.body.orderDetails || {};
            addOns = typeof req.body.addOns === "string"
                ? JSON.parse(req.body.addOns)
                : req.body.addOns || {};
        } catch {
            res.status(400).json({ error: "Invalid orderDetails or addOns format" });
            return;
        }

        // Validate parsed JSON is a flat object with safe primitive values
        const isFlat = (obj: unknown): obj is Record<string, string | number | boolean | null> =>
            typeof obj === "object" && obj !== null && !Array.isArray(obj) &&
            Object.values(obj as Record<string, unknown>).every(v =>
                v === null || typeof v === "string" || typeof v === "number" || typeof v === "boolean",
            );
        if (!isFlat(orderDetails) || !isFlat(addOns)) {
            res.status(400).json({ error: "orderDetails and addOns must be flat key-value objects" });
            return;
        }

        // Validate required fields
        if (!customerName || !customerPhone || !customerEmail || !pickupDate || !pickupTime || !orderType) {
            res.status(400).json({
                error: "customerName, customerPhone, customerEmail, pickupDate, pickupTime, and orderType are required",
            });
            return;
        }

        // Input length validation
        if (customerName.length > 200 || customerEmail.length > 254 || customerPhone.length > 30 || (specialRequests && specialRequests.length > 2000)) {
            res.status(400).json({ error: "One or more fields exceed maximum length" });
            return;
        }

        // Validate order type
        const validTypes = [
            "Pre-Stacked Ice Cream Cake",
            "Custom Ice Cream Cake",
            "Cupcakes by the Dozen",
            "Custom Cake",
            "Custom Cupcakes",
        ];
        if (!validTypes.includes(orderType)) {
            res.status(400).json({ error: "Invalid order type" });
            return;
        }

        // Validate lead time (96 hours minimum)
        const pickupDateTime = new Date(`${pickupDate}T${pickupTime}`);
        const minPickupDate = new Date();
        minPickupDate.setHours(minPickupDate.getHours() + LEAD_TIME_HOURS);
        if (pickupDateTime < minPickupDate) {
            res.status(400).json({
                error: "Pickup date must be at least 96 hours (4 days) from now",
            });
            return;
        }

        // Calculate server-side price
        const totalPriceCents = calculateTotalCents(orderType, orderDetails, addOns);

        // Handle photo upload
        let inspirationPhotoUrl: string | null = null;
        if (req.file) {
            inspirationPhotoUrl = `/api/uploads/bakery/${req.file.filename}`;
        }

        // Generate order number
        const orderNumber = `BK-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;

        const [order] = await db
            .insert(bakeryOrdersTable)
            .values({
                orderNumber,
                customerName,
                customerPhone,
                customerEmail,
                pickupDate,
                pickupTime,
                referral: referral || "",
                orderType,
                orderDetails,
                addOns,
                specialRequests: specialRequests || "",
                inspirationPhotoUrl,
                totalPriceCents,
                status: "pending",
                locationId: locationId ? Number(locationId) : null,
            })
            .returning();

        // Send emails (fire and forget)
        sendBakeryOrderNotification({
            orderNumber: order.orderNumber,
            customerName,
            customerEmail,
            customerPhone,
            pickupDate,
            pickupTime,
            referral: referral || "",
            orderType,
            orderDetails,
            addOns,
            specialRequests: specialRequests || "",
            inspirationPhotoUrl,
            totalPriceCents,
        }).catch((e) => console.error("[EMAIL] Bakery order notification failed:", e));

        // Persist to CRM inquiries
        db.insert(inquiriesTable)
            .values({
                type: "bakery",
                name: customerName,
                email: customerEmail,
                phone: customerPhone,
                message: specialRequests || "",
                formData: {
                    orderNumber: order.orderNumber,
                    orderType,
                    pickupDate,
                    pickupTime,
                    orderDetails,
                    addOns,
                    totalPriceCents,
                    referral: referral || "",
                    ...(inspirationPhotoUrl ? { inspirationPhotoUrl } : {}),
                },
            })
            .catch((e) => console.error("[DB] Failed to persist bakery inquiry:", e));

        sendBakeryOrderConfirmation({
            customerName,
            customerEmail,
            orderNumber: order.orderNumber,
            orderType,
            pickupDate,
            pickupTime,
            totalPriceCents,
        }).catch((e) => console.error("[EMAIL] Bakery order confirmation failed:", e));

        res.status(201).json({
            success: true,
            orderNumber: order.orderNumber,
            totalPriceCents,
        });
    } catch (error) {
        console.error("[BAKERY] Order submission failed:", error);
        res.status(500).json({ error: "Failed to submit bakery order" });
    }
});

// ── Public: Get active product pre-orders ──
router.get("/windows/active", async (_req, res) => {
    try {
        const now = new Date();
        const locationIdRaw = _req.query.locationId as string | undefined;
        const selectedLocationId = locationIdRaw ? Number(locationIdRaw) : null;

        if (locationIdRaw && (!Number.isInteger(selectedLocationId) || (selectedLocationId as number) <= 0)) {
            res.status(400).json({ error: "locationId must be a valid location" });
            return;
        }

        const preOrders = await db
            .select({
                id: productPreOrdersTable.id,
                flavourId: productPreOrdersTable.flavourId,
                flavourName: flavoursTable.name,
                preOrderStart: productPreOrdersTable.preOrderStart,
                preOrderEnd: productPreOrdersTable.preOrderEnd,
                pickupDate: productPreOrdersTable.pickupDate,
                pickupEndDate: productPreOrdersTable.pickupEndDate,
            })
            .from(productPreOrdersTable)
            .leftJoin(flavoursTable, eq(productPreOrdersTable.flavourId, flavoursTable.id))
            .where(
                or(
                    // Currently accepting orders: status=open and within the ordering window
                    and(
                        eq(productPreOrdersTable.status, "open"),
                        lte(productPreOrdersTable.preOrderStart, now),
                        gte(productPreOrdersTable.preOrderEnd, now),
                    ),
                    // Ordering window closed but pickup date hasn't passed — show "pre-orders closed"
                    and(
                        inArray(productPreOrdersTable.status, ["open", "closed"]),
                        lt(productPreOrdersTable.preOrderEnd, now),
                    ),
                )
            );

        const pickupOverrideByPreOrder = new Map<number, Date>();
        if (selectedLocationId && preOrders.length > 0) {
            const overrideRows = await db
                .select({
                    preOrderId: preOrderLocationsTable.preOrderId,
                    pickupStartDate: preOrderLocationsTable.pickupStartDate,
                })
                .from(preOrderLocationsTable)
                .where(
                    and(
                        inArray(
                            preOrderLocationsTable.preOrderId,
                            preOrders.map((po) => po.id),
                        ),
                        eq(preOrderLocationsTable.locationId, selectedLocationId),
                    ),
                );

            for (const row of overrideRows) {
                if (row.pickupStartDate) {
                    pickupOverrideByPreOrder.set(row.preOrderId, row.pickupStartDate);
                }
            }
        }

        // Also get all product IDs for each flavour so customer UI can filter
        const flavourIds = [...new Set(preOrders.map(po => po.flavourId).filter(Boolean))] as number[];
        let productsByFlavour: Record<number, number[]> = {};
        if (flavourIds.length > 0) {
            const products = await db
                .select({ id: productsTable.id, flavourId: productsTable.flavourId })
                .from(productsTable)
                .where(eq(productsTable.available, true));
            for (const p of products) {
                if (flavourIds.includes(p.flavourId)) {
                    if (!productsByFlavour[p.flavourId]) productsByFlavour[p.flavourId] = [];
                    productsByFlavour[p.flavourId].push(p.id);
                }
            }
        }

        const result = preOrders
            .filter((po) => po.flavourId !== null)
            .map((po) => ({
                id: po.id,
                flavourId: po.flavourId,
                flavourName: po.flavourName,
                productIds: productsByFlavour[po.flavourId!] || [],
                preOrderStart: po.preOrderStart,
                preOrderEnd: po.preOrderEnd,
                pickupDate: pickupOverrideByPreOrder.get(po.id) ?? po.pickupDate,
                pickupEndDate: po.pickupEndDate,
                acceptingOrders: new Date(po.preOrderEnd) >= now,
            }))
            .filter((po) => po.acceptingOrders || new Date(po.pickupDate) >= now);

        res.json(result);
    } catch (error) {
        console.error("[PRE-ORDERS] Active fetch failed:", error);
        res.status(500).json({ error: "Failed to fetch active pre-orders" });
    }
});

export default router;
