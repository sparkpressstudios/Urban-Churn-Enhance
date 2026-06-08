import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
    flavoursTable,
    sizesTable,
    productsTable,
    locationsTable,
    locationHoursTable,
    ordersTable,
    orderItemsTable,
    couponsTable,
    customersTable,
    productPreOrdersTable,
    jobPostingsTable,
    careerBenefitsTable,
    rotatingFlavoursTable,
    settingsTable,
    inquiriesTable,
    eventsTable,
    preOrderLocationsTable,
} from "@workspace/db/schema";
import { eq, asc, desc, and, sql, inArray } from "drizzle-orm";
import { hashPassword, verifyPassword } from "../lib/password";
import { signToken } from "../lib/jwt";
import * as crypto from "node:crypto";
import {
    sendOrderConfirmation,
    sendAdminNewOrderAlert,
    sendAdminLowStockAlert,
    sendContactFormNotification,
    sendContactFormConfirmation,
    sendWholesaleFormNotification,
    sendWholesaleFormConfirmation,
    sendCateringFormNotification,
    sendCateringFormConfirmation,
    sendCareerApplicationNotification,
    sendCareerApplicationConfirmation,
    sendFundraisingFormNotification,
    sendFundraisingFormConfirmation,
    sendWelcomeEmail,
} from "../lib/email";
import { createSquareOrder, createPayment, isSquareConfigured, getOrCreateSquareCustomer, getSquareLoyaltyProgram, getOrCreateLoyaltyAccount, calculateLoyaltyPoints, accumulateLoyaltyPoints, getOnlineSalesLocationId } from "../lib/square";

const router: IRouter = Router();

// Public: list available flavours
router.get("/flavours", async (_req, res) => {
    const flavours = await db
        .select()
        .from(flavoursTable)
        .where(eq(flavoursTable.available, true))
        .orderBy(desc(flavoursTable.publishedAt));
    res.set("Cache-Control", "public, max-age=300, stale-while-revalidate=60");
    res.json(flavours);
});

// Public: list sizes
router.get("/sizes", async (_req, res) => {
    const sizes = await db
        .select()
        .from(sizesTable)
        .orderBy(asc(sizesTable.sortOrder));
    res.set("Cache-Control", "public, max-age=300, stale-while-revalidate=60");
    res.json(sizes);
});

// Public: list active locations with hours (respects showOnPublicPage)
router.get("/locations", async (_req, res) => {
    const locations = await db
        .select()
        .from(locationsTable)
        .where(and(eq(locationsTable.active, true), eq(locationsTable.showOnPublicPage, true)))
        .orderBy(asc(locationsTable.sortOrder));

    // Batch-load all hours in a single query instead of N+1
    const locationIds = locations.map((l) => l.id);
    const allHours = locationIds.length > 0
        ? await db
            .select()
            .from(locationHoursTable)
            .where(inArray(locationHoursTable.locationId, locationIds))
            .orderBy(asc(locationHoursTable.locationId), asc(locationHoursTable.dayOfWeek), asc(locationHoursTable.setNumber))
        : [];

    const hoursByLocation = new Map<number, typeof allHours>();
    for (const h of allHours) {
        if (!hoursByLocation.has(h.locationId)) hoursByLocation.set(h.locationId, []);
        hoursByLocation.get(h.locationId)!.push(h);
    }

    const locationsWithHours = locations.map((loc) => ({
        ...loc,
        hours: hoursByLocation.get(loc.id) ?? [],
    }));

    res.set("Cache-Control", "public, max-age=300, stale-while-revalidate=60");
    res.json(locationsWithHours);
});

// Public: get valid pickup locations for given flavour IDs in cart
// Returns locations that are valid for ALL specified flavours (intersection)
router.get("/pre-order-locations", async (req, res) => {
    const flavourIdsStr = req.query.flavourIds as string | undefined;

    /** Batch-load hours for a list of locations in one query */
    async function attachHours(locs: { id: number;[key: string]: unknown }[]) {
        if (locs.length === 0) return locs.map((l) => ({ ...l, hours: [] }));
        const ids = locs.map((l) => l.id);
        const allHrs = await db
            .select()
            .from(locationHoursTable)
            .where(inArray(locationHoursTable.locationId, ids))
            .orderBy(asc(locationHoursTable.locationId), asc(locationHoursTable.dayOfWeek), asc(locationHoursTable.setNumber));
        const byId = new Map<number, typeof allHrs>();
        for (const h of allHrs) {
            if (!byId.has(h.locationId)) byId.set(h.locationId, []);
            byId.get(h.locationId)!.push(h);
        }
        return locs.map((l) => ({ ...l, hours: byId.get(l.id) ?? [] }));
    }

    if (!flavourIdsStr) {
        // No flavours specified, return all active pickup-eligible locations
        const allLocations = await db
            .select()
            .from(locationsTable)
            .where(and(eq(locationsTable.active, true), eq(locationsTable.allowPreorderPickup, true)))
            .orderBy(asc(locationsTable.sortOrder));
        res.set("Cache-Control", "public, max-age=120, stale-while-revalidate=60");
        res.json(await attachHours(allLocations));
        return;
    }

    const flavourIds = flavourIdsStr.split(",").map(Number).filter(Boolean);
    if (flavourIds.length === 0) {
        const allLocations = await db
            .select()
            .from(locationsTable)
            .where(and(eq(locationsTable.active, true), eq(locationsTable.allowPreorderPickup, true)))
            .orderBy(asc(locationsTable.sortOrder));
        res.set("Cache-Control", "public, max-age=120, stale-while-revalidate=60");
        res.json(await attachHours(allLocations));
        return;
    }

    // Find active pre-orders for these flavour IDs
    const activePreOrders = await db
        .select({ id: productPreOrdersTable.id, flavourId: productPreOrdersTable.flavourId })
        .from(productPreOrdersTable)
        .where(
            and(
                inArray(productPreOrdersTable.flavourId, flavourIds),
                inArray(productPreOrdersTable.status, ["open", "scheduled"]),
            ),
        );

    if (activePreOrders.length === 0) {
        // No active pre-orders, return all active pickup-eligible locations
        const allLocations = await db
            .select()
            .from(locationsTable)
            .where(and(eq(locationsTable.active, true), eq(locationsTable.allowPreorderPickup, true)))
            .orderBy(asc(locationsTable.sortOrder));
        res.set("Cache-Control", "public, max-age=120, stale-while-revalidate=60");
        res.json(await attachHours(allLocations));
        return;
    }

    const preOrderIds = activePreOrders.map((po) => po.id);

    // Find locations that are associated with ALL relevant pre-orders (intersection)
    const locJunctions = await db
        .select({
            preOrderId: preOrderLocationsTable.preOrderId,
            locationId: preOrderLocationsTable.locationId,
        })
        .from(preOrderLocationsTable)
        .where(inArray(preOrderLocationsTable.preOrderId, preOrderIds));

    // Group by flavourId → Set of locationIds
    const flavourLocationMap = new Map<number, Set<number>>();
    for (const junction of locJunctions) {
        const po = activePreOrders.find((p) => p.id === junction.preOrderId);
        if (!po || !po.flavourId) continue;
        if (!flavourLocationMap.has(po.flavourId)) {
            flavourLocationMap.set(po.flavourId, new Set());
        }
        flavourLocationMap.get(po.flavourId)!.add(junction.locationId);
    }

    // Intersection: locations valid for ALL flavours in cart
    let validLocationIds: Set<number> | null = null;
    for (const fid of flavourIds) {
        const locIds = flavourLocationMap.get(fid);
        if (!locIds || locIds.size === 0) continue;
        if (validLocationIds === null) {
            validLocationIds = new Set(locIds);
        } else {
            validLocationIds = new Set([...validLocationIds].filter((id) => locIds.has(id)));
        }
    }

    // Fetch the actual location records
    let locConditions: any = and(eq(locationsTable.active, true), eq(locationsTable.allowPreorderPickup, true));
    if (validLocationIds !== null && validLocationIds.size > 0) {
        locConditions = and(
            eq(locationsTable.active, true),
            eq(locationsTable.allowPreorderPickup, true),
            inArray(locationsTable.id, [...validLocationIds]),
        );
    } else if (validLocationIds !== null && validLocationIds.size === 0) {
        res.set("Cache-Control", "public, max-age=120, stale-while-revalidate=60");
        res.json([]);
        return;
    }

    const validLocations = await db
        .select()
        .from(locationsTable)
        .where(locConditions)
        .orderBy(asc(locationsTable.sortOrder));

    res.set("Cache-Control", "public, max-age=120, stale-while-revalidate=60");
    res.json(await attachHours(validLocations));
});

// Public: list available products
router.get("/products", async (_req, res) => {
    const products = await db
        .select({
            id: productsTable.id,
            flavourId: productsTable.flavourId,
            sizeId: productsTable.sizeId,
            priceOverride: productsTable.priceOverride,
            available: productsTable.available,
            manageStock: productsTable.manageStock,
            stockQuantity: productsTable.stockQuantity,
            lowStockThreshold: productsTable.lowStockThreshold,
            flavourName: flavoursTable.name,
            flavourSlug: flavoursTable.slug,
            flavourDescription: flavoursTable.description,
            flavourEmoji: flavoursTable.emoji,
            flavourTag: flavoursTable.tag,
            flavourBasePrice: flavoursTable.basePrice,
            flavourImageUrl: flavoursTable.imageUrl,
            sizeName: sizesTable.name,
            sizeSlug: sizesTable.slug,
            sizePrice: sizesTable.price,
            sizeVolumeOz: sizesTable.volumeOz,
            sizeDescription: sizesTable.description,
        })
        .from(productsTable)
        .innerJoin(flavoursTable, eq(productsTable.flavourId, flavoursTable.id))
        .innerJoin(sizesTable, eq(productsTable.sizeId, sizesTable.id))
        .where(
            and(
                eq(productsTable.available, true),
                eq(flavoursTable.available, true),
            ),
        )
        .orderBy(asc(flavoursTable.sortOrder), asc(sizesTable.sortOrder));

    res.set("Cache-Control", "public, max-age=300, stale-while-revalidate=60");
    res.json(products);
});

// Public: validate coupon code
router.post("/coupons/validate", async (req, res) => {
    const { code, orderTotalCents } = req.body;

    if (!code) {
        res.status(400).json({ error: "Coupon code is required" });
        return;
    }

    const [coupon] = await db
        .select()
        .from(couponsTable)
        .where(eq(couponsTable.code, code.toUpperCase().trim()))
        .limit(1);

    if (!coupon) {
        res.status(404).json({ error: "Invalid coupon code" });
        return;
    }

    if (!coupon.active) {
        res.status(400).json({ error: "This coupon is no longer active" });
        return;
    }

    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
        res.status(400).json({ error: "This coupon has expired" });
        return;
    }

    if (coupon.maxUsageCount !== null && coupon.usageCount >= coupon.maxUsageCount) {
        res.status(400).json({ error: "This coupon has reached its usage limit" });
        return;
    }

    if (orderTotalCents && coupon.minOrderCents > 0 && orderTotalCents < coupon.minOrderCents) {
        res.status(400).json({
            error: `Minimum order of $${(coupon.minOrderCents / 100).toFixed(2)} required`,
        });
        return;
    }

    let discountCents = 0;
    if (orderTotalCents) {
        const couponValue = parseFloat(coupon.value);
        if (isNaN(couponValue)) {
            res.status(400).json({ error: "Invalid coupon value" });
            return;
        }
        if (coupon.type === "percentage") {
            discountCents = Math.round((orderTotalCents * couponValue) / 100);
        } else {
            discountCents = Math.round(couponValue * 100);
        }
        discountCents = Math.min(discountCents, orderTotalCents);
    }

    res.json({
        valid: true,
        coupon: {
            id: coupon.id,
            code: coupon.code,
            description: coupon.description,
            type: coupon.type,
            value: coupon.value,
        },
        discountCents,
    });
});

// Public: create order
router.post("/orders", async (req, res) => {
    const { locationId, customerName, customerEmail, customerPhone, notes, items, couponCode, sourceId, accountMode, password } =
        req.body;

    if (!locationId || !customerName || !customerEmail || !items?.length) {
        res
            .status(400)
            .json({ error: "locationId, customerName, customerEmail, and items are required" });
        return;
    }

    const selectedLocationId = Number(locationId);
    if (!Number.isInteger(selectedLocationId) || selectedLocationId <= 0) {
        res.status(400).json({ error: "locationId must be a valid location" });
        return;
    }

    // Input length validation
    if (customerName.length > 200 || customerEmail.length > 254 || (customerPhone && customerPhone.length > 30) || (notes && notes.length > 2000)) {
        res.status(400).json({ error: "One or more fields exceed maximum length" });
        return;
    }

    const normalizedEmail = customerEmail.toLowerCase().trim();

    if (sourceId) {
        const configured = await isSquareConfigured();
        if (!configured) {
            res.status(503).json({ error: "Card payments are temporarily unavailable" });
            return;
        }
    }

    // ── Account handling ──
    // accountMode: "guest" (default) | "create" | "login"
    let customerId: number | null = null;
    let authToken: string | null = null;
    let isNewAccount = false;

    if (accountMode === "create") {
        if (!password || password.length < 8) {
            res.status(400).json({ error: "Password must be at least 8 characters to create an account" });
            return;
        }

        // Check if account already exists
        const [existing] = await db
            .select()
            .from(customersTable)
            .where(eq(customersTable.email, normalizedEmail))
            .limit(1);

        if (existing?.hasAccount && existing?.passwordHash) {
            res.status(409).json({ error: "An account with this email already exists.", code: "ACCOUNT_EXISTS" });
            return;
        }

        const passwordHash = await hashPassword(password);

        const nameParts = customerName.trim().split(/\s+/);
        const firstName = nameParts[0] || "";
        const lastName = nameParts.slice(1).join(" ") || "";

        let customer;
        if (existing) {
            [customer] = await db
                .update(customersTable)
                .set({
                    passwordHash,
                    hasAccount: true,
                    firstName: firstName || existing.firstName,
                    lastName: lastName || existing.lastName,
                    phone: customerPhone || existing.phone,
                    updatedAt: new Date(),
                })
                .where(eq(customersTable.id, existing.id))
                .returning();
        } else {
            [customer] = await db
                .insert(customersTable)
                .values({
                    email: normalizedEmail,
                    passwordHash,
                    hasAccount: true,
                    firstName,
                    lastName,
                    phone: customerPhone || "",
                })
                .returning();
        }

        customerId = customer.id;
        isNewAccount = true;
        authToken = signToken(
            { userId: customer.id, email: customer.email, type: "customer" },
            "7d",
        );
    } else if (accountMode === "login") {
        if (!password) {
            res.status(400).json({ error: "Password is required to sign in" });
            return;
        }

        const [customer] = await db
            .select()
            .from(customersTable)
            .where(
                and(
                    eq(customersTable.email, normalizedEmail),
                    eq(customersTable.hasAccount, true),
                ),
            )
            .limit(1);

        if (!customer) {
            res.status(401).json({ error: "No account found with this email. Try creating an account or continue as guest.", code: "NO_ACCOUNT" });
            return;
        }

        if (!customer.passwordHash) {
            // Migrated from old website — has account flag but no password set
            res.status(401).json({
                error: "We found your account from our previous website! You'll need to set a new password to sign in.",
                code: "NEEDS_PASSWORD_RESET",
            });
            return;
        }

        const valid = await verifyPassword(password, customer.passwordHash);
        if (!valid) {
            res.status(401).json({ error: "Invalid email or password", code: "INVALID_CREDENTIALS" });
            return;
        }

        customerId = customer.id;
        authToken = signToken(
            { userId: customer.id, email: customer.email, type: "customer" },
            "7d",
        );
    } else {
        // Guest mode — upsert a customer record for tracking (no password)
        const [existing] = await db
            .select()
            .from(customersTable)
            .where(eq(customersTable.email, normalizedEmail))
            .limit(1);

        if (existing) {
            customerId = existing.id;
        } else {
            const nameParts = customerName.trim().split(/\s+/);
            const [newCustomer] = await db
                .insert(customersTable)
                .values({
                    email: normalizedEmail,
                    firstName: nameParts[0] || "",
                    lastName: nameParts.slice(1).join(" ") || "",
                    phone: customerPhone || "",
                })
                .returning();
            customerId = newCustomer.id;
        }
    }

    // Generate order number  
    const orderNumber = `UC-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;

    // Calculate total
    let totalCents = 0;
    const orderItems: {
        flavourName: string;
        sizeName: string;
        priceCents: number;
        quantity: number;
        productId: number | null;
    }[] = [];

    for (const item of items) {
        const priceCents = Math.round(item.price * 100);
        totalCents += priceCents * (item.quantity || 1);
        orderItems.push({
            flavourName: item.flavourName,
            sizeName: item.sizeName,
            priceCents,
            quantity: item.quantity || 1,
            productId: item.productId || null,
        });
    }

    // Apply coupon if provided
    let couponId: number | null = null;
    let discountCents = 0;

    // Check pre-order restrictions for standard products and capture per-flavour pickup dates
    const openPreOrders = await db
        .select({
            id: productPreOrdersTable.id,
            flavourId: productPreOrdersTable.flavourId,
            flavourName: flavoursTable.name,
            pickupDate: productPreOrdersTable.pickupDate,
        })
        .from(productPreOrdersTable)
        .innerJoin(flavoursTable, eq(productPreOrdersTable.flavourId, flavoursTable.id))
        .where(eq(productPreOrdersTable.status, "open"));

    const pickupOverrideByPreOrder = new Map<number, Date>();
    if (openPreOrders.length > 0) {
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
                        openPreOrders.map((po) => po.id),
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

    // Map flavour name → { windowId, pickupDate } (latest open window wins if dupes)
    const flavourWindowMap = new Map<string, { id: number; pickupDate: Date }>();
    for (const po of openPreOrders) {
        flavourWindowMap.set(po.flavourName, {
            id: po.id,
            pickupDate: pickupOverrideByPreOrder.get(po.id) ?? po.pickupDate,
        });
    }

    if (openPreOrders.length > 0) {
        const allowedFlavours = new Set(openPreOrders.map(p => p.flavourName));
        for (const item of orderItems) {
            if (!allowedFlavours.has(item.flavourName)) {
                res.status(400).json({
                    error: `"${item.flavourName} (${item.sizeName})" is not available for pre-order during the current window.`,
                });
                return;
            }
        }

        // Validate chosen location participates in every ordered flavour's pre-order window
        const orderedPreOrderIds = Array.from(
            new Set(
                orderItems
                    .map((it) => flavourWindowMap.get(it.flavourName)?.id)
                    .filter((v): v is number => !!v),
            ),
        );
        if (orderedPreOrderIds.length > 0) {
            const junctionRows = await db
                .select({
                    preOrderId: preOrderLocationsTable.preOrderId,
                    locationId: preOrderLocationsTable.locationId,
                })
                .from(preOrderLocationsTable)
                .where(inArray(preOrderLocationsTable.preOrderId, orderedPreOrderIds));
            const locationsByPreOrder = new Map<number, Set<number>>();
            for (const row of junctionRows) {
                if (!locationsByPreOrder.has(row.preOrderId)) {
                    locationsByPreOrder.set(row.preOrderId, new Set());
                }
                locationsByPreOrder.get(row.preOrderId)!.add(row.locationId);
            }
            for (const item of orderItems) {
                const window = flavourWindowMap.get(item.flavourName);
                if (!window) continue;
                const allowedLocs = locationsByPreOrder.get(window.id);
                // If junction is empty for this window, treat as "all locations" (existing convention).
                if (allowedLocs && allowedLocs.size > 0 && !allowedLocs.has(selectedLocationId)) {
                    res.status(400).json({
                        error: `"${item.flavourName}" is not available for pickup at the selected location during this pre-order window.`,
                    });
                    return;
                }
            }
        }
    }

    if (couponCode) {
        const [coupon] = await db
            .select()
            .from(couponsTable)
            .where(eq(couponsTable.code, couponCode.toUpperCase().trim()))
            .limit(1);

        if (
            coupon &&
            coupon.active &&
            (!coupon.expiresAt || new Date(coupon.expiresAt) >= new Date()) &&
            (coupon.maxUsageCount === null || coupon.usageCount < coupon.maxUsageCount) &&
            totalCents >= coupon.minOrderCents
        ) {
            couponId = coupon.id;
            const couponValue = parseFloat(coupon.value);
            if (!isNaN(couponValue)) {
                if (coupon.type === "percentage") {
                    discountCents = Math.round((totalCents * couponValue) / 100);
                } else {
                    discountCents = Math.round(couponValue * 100);
                }
                discountCents = Math.min(discountCents, totalCents);
            }
        }
    }

    // Wrap order creation in a transaction for atomicity (coupon, order, items, stock)
    const { order, savedItems } = await db.transaction(async (tx) => {
        // Increment coupon usage inside transaction so it rolls back if order fails
        if (couponId) {
            await tx
                .update(couponsTable)
                .set({ usageCount: sql`${couponsTable.usageCount} + 1` })
                .where(eq(couponsTable.id, couponId));
        }

        const [txOrder] = await tx
            .insert(ordersTable)
            .values({
                orderNumber,
                locationId: selectedLocationId,
                customerName,
                customerEmail: normalizedEmail,
                customerPhone: customerPhone ?? "",
                customerId,
                notes: notes ?? "",
                totalCents: totalCents - discountCents,
                couponId,
                discountCents,
                status: "pending",
            })
            .returning();

        for (const item of orderItems) {
            await tx.insert(orderItemsTable).values({
                orderId: txOrder.id,
                productId: item.productId,
                flavourName: item.flavourName,
                sizeName: item.sizeName,
                priceCents: item.priceCents,
                quantity: item.quantity,
                pickupDate: flavourWindowMap.get(item.flavourName)?.pickupDate ?? null,
                preOrderWindowId: flavourWindowMap.get(item.flavourName)?.id ?? null,
            });

            // Decrement stock for products with inventory management
            if (item.productId) {
                await tx
                    .update(productsTable)
                    .set({
                        stockQuantity: sql`GREATEST(${productsTable.stockQuantity} - ${item.quantity}, 0)`,
                    })
                    .where(
                        and(
                            eq(productsTable.id, item.productId),
                            eq(productsTable.manageStock, true),
                        ),
                    );
            }
        }

        const txSavedItems = await tx
            .select()
            .from(orderItemsTable)
            .where(eq(orderItemsTable.orderId, txOrder.id));

        return { order: txOrder, savedItems: txSavedItems };
    });

    // Get location info for emails
    const [location] = await db
        .select({
            name: locationsTable.name,
            address: locationsTable.address,
            city: locationsTable.city,
            state: locationsTable.state,
            zip: locationsTable.zip,
            phone: locationsTable.phone,
            mapUrl: locationsTable.mapUrl,
        })
        .from(locationsTable)
        .where(eq(locationsTable.id, selectedLocationId))
        .limit(1);

    // Build pickup date range from the actual pickup dates stored on order items.
    let pickupDateRange: string | null = null;
    const pickupDates = savedItems
        .map((it) => it.pickupDate)
        .filter((d): d is Date => d !== null)
        .map((d) => new Date(d))
        .sort((a, b) => a.getTime() - b.getTime());
    if (pickupDates.length > 0) {
        const first = pickupDates[0];
        const last = pickupDates[pickupDates.length - 1];
        const startStr = first.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            timeZone: "America/New_York",
        });
        const endStr = last.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            timeZone: "America/New_York",
        });
        pickupDateRange = startStr === endStr ? `Starting ${startStr}` : `${startStr} through ${endStr}`;
    }

    // Send emails (fire and forget, don't block response)
    sendOrderConfirmation({
        orderNumber: order.orderNumber,
        customerName,
        customerEmail,
        totalCents: order.totalCents,
        discountCents: order.discountCents,
        location: location ?? { name: "", address: "", city: "", state: "", zip: "", phone: "", mapUrl: null },
        pickupDateRange,
        items: orderItems,
    }).catch((e) => console.error("[EMAIL] Order confirmation failed:", e));

    sendAdminNewOrderAlert({
        orderNumber: order.orderNumber,
        customerName,
        totalCents: order.totalCents,
        locationName: location?.name ?? "",
        itemCount: orderItems.length,
    }).catch((e) => console.error("[EMAIL] Admin alert failed:", e));

    // Check for low stock products after decrementing
    const lowStockProducts = await db
        .select({
            flavourName: flavoursTable.name,
            sizeName: sizesTable.name,
            stockQuantity: productsTable.stockQuantity,
        })
        .from(productsTable)
        .innerJoin(flavoursTable, eq(productsTable.flavourId, flavoursTable.id))
        .innerJoin(sizesTable, eq(productsTable.sizeId, sizesTable.id))
        .where(
            and(
                eq(productsTable.manageStock, true),
                sql`${productsTable.stockQuantity} <= ${productsTable.lowStockThreshold}`,
                sql`${productsTable.stockQuantity} > 0`,
            ),
        );

    if (lowStockProducts.length > 0) {
        sendAdminLowStockAlert(lowStockProducts).catch((e) =>
            console.error("[EMAIL] Low stock alert failed:", e),
        );
    }

    // Sync Square customer early so orders/payments can be linked before completion
    let sqCustId: string | null = null;
    let customerPhoneForSquare: string | undefined;
    if (customerId) {
        const [customerRecord] = await db
            .select({
                squareCustomerId: customersTable.squareCustomerId,
                firstName: customersTable.firstName,
                lastName: customersTable.lastName,
                phone: customersTable.phone,
            })
            .from(customersTable)
            .where(eq(customersTable.id, customerId))
            .limit(1);

        customerPhoneForSquare = customerRecord?.phone || customerPhone || undefined;
        sqCustId = customerRecord?.squareCustomerId ?? null;

        if (!sqCustId) {
            const nameParts = customerName.trim().split(/\s+/);
            sqCustId = await getOrCreateSquareCustomer(
                normalizedEmail,
                customerRecord?.firstName || nameParts[0] || "",
                customerRecord?.lastName || nameParts.slice(1).join(" ") || "",
                customerPhoneForSquare,
            );
            if (sqCustId) {
                await db.update(customersTable)
                    .set({ squareCustomerId: sqCustId, updatedAt: new Date() })
                    .where(eq(customersTable.id, customerId));
            }
        }
    }

    // Create Square order and process payment (blocking)
    // Route all online sales to the Online Sales location (not individual POS devices)
    let squareOrderId: string | null = null;
    let squarePaymentId: string | null = null;
    let paymentStatus: string | null = null;
    let paymentFailed = false;

    const onlineSalesSquareLocationId = await getOnlineSalesLocationId();
    const isPreOrder = openPreOrders.length > 0;
    if (onlineSalesSquareLocationId) {
        try {
            const sqOrder = await createSquareOrder(
                onlineSalesSquareLocationId,
                orderNumber,
                orderItems.map((item) => ({
                    name: `${item.flavourName} - ${item.sizeName}`,
                    quantity: item.quantity,
                    priceCents: item.priceCents,
                })),
                discountCents > 0 ? discountCents : undefined,
                { isPreOrder, customerId: sqCustId ?? undefined },
            );
            squareOrderId = sqOrder.id ?? null;
        } catch (e) {
            console.error("[SQUARE] Order creation failed:", e);
        }
    }

    // Process payment if sourceId provided
    let paymentErrorDetail = "";
    if (sourceId && squareOrderId) {
        try {
            console.log(`[SQUARE] Processing payment: amount=${order.totalCents}c, orderId=${squareOrderId}, sourceId=${sourceId.substring(0, 12)}...`);
            const payment = await createPayment(
                order.totalCents,
                sourceId,
                normalizedEmail,
                squareOrderId,
                sqCustId ?? undefined,
                onlineSalesSquareLocationId ?? undefined,
            );
            squarePaymentId = payment.id ?? null;
            paymentStatus = "paid";
        } catch (e: any) {
            console.error("[SQUARE] Payment failed:", e);
            paymentErrorDetail = e.message || "Unknown payment error";
            // Order was created but payment failed — mark pending_payment
            paymentStatus = "payment_failed";
            paymentFailed = true;
        }
    } else if (sourceId) {
        // No Square order but sourceId was provided — payment without order link
        try {
            const payment = await createPayment(
                order.totalCents,
                sourceId,
                normalizedEmail,
                undefined,
                sqCustId ?? undefined,
                onlineSalesSquareLocationId ?? undefined,
            );
            squarePaymentId = payment.id ?? null;
            paymentStatus = "paid";
        } catch (e: any) {
            console.error("[SQUARE] Payment failed:", e);
            paymentErrorDetail = e.message || "Unknown payment error";
            paymentStatus = "payment_failed";
            paymentFailed = true;
        }
    }

    // Update order with Square references
    if (squareOrderId || squarePaymentId || paymentStatus) {
        await db
            .update(ordersTable)
            .set({
                ...(squareOrderId ? { squareOrderId } : {}),
                ...(squarePaymentId ? { squarePaymentId } : {}),
                ...(paymentStatus ? { paymentStatus } : {}),
                lastSyncSource: "web",
            })
            .where(eq(ordersTable.id, order.id));
    }

    if (paymentFailed) {
        res.status(402).json({
            error: "Payment failed. Your order was saved as pending and requires attention.",
            detail: paymentErrorDetail,
            orderNumber: order.orderNumber,
            paymentStatus,
        });
        return;
    }

    // ── Square Loyalty Accrual (non-blocking) ──
    if (customerId && paymentStatus === "paid") {
        try {
            if (sqCustId && onlineSalesSquareLocationId) {
                const program = await getSquareLoyaltyProgram();
                if (program && program.status === "ACTIVE") {
                    const loyaltyAccount = await getOrCreateLoyaltyAccount(
                        sqCustId,
                        program.id,
                        customerPhoneForSquare,
                    );
                    if (loyaltyAccount) {
                        let accrued = false;

                        // Try order-based accrual first (most accurate)
                        if (squareOrderId) {
                            accrued = await accumulateLoyaltyPoints(
                                loyaltyAccount.accountId,
                                `order_${order.id}`,
                                onlineSalesSquareLocationId,
                                squareOrderId,
                            );
                        }

                        // Fall back to amount-based accrual if order-based failed or no Square order
                        if (!accrued && order.totalCents > 0) {
                            const points = await calculateLoyaltyPoints(program.id, order.totalCents);
                            if (points > 0) {
                                await accumulateLoyaltyPoints(
                                    loyaltyAccount.accountId,
                                    `order_${order.id}_amount`,
                                    onlineSalesSquareLocationId,
                                    undefined,
                                    points,
                                );
                            }
                        }
                    }
                }
            }
        } catch (e) {
            console.error("[SQUARE] Loyalty accrual failed (non-blocking):", e);
        }
    }

    // Update customer stats
    if (customerId) {
        await db
            .update(customersTable)
            .set({
                ordersCount: sql`${customersTable.ordersCount} + 1`,
                totalSpentCents: sql`${customersTable.totalSpentCents} + ${order.totalCents}`,
                updatedAt: new Date(),
            })
            .where(eq(customersTable.id, customerId));
    }

    // Send welcome email for new accounts (fire and forget)
    if (isNewAccount) {
        sendWelcomeEmail({
            customerName,
            customerEmail: normalizedEmail,
        }).catch((e) => console.error("[EMAIL] Welcome email failed:", e));
    }

    // Set auth cookie if account was created or logged in
    if (authToken) {
        res.cookie("customer_token", authToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
    }

    res.status(201).json({
        ...order,
        items: savedItems,
        paymentStatus,
        ...(authToken ? { token: authToken } : {}),
    });
});

// ── Public Form Submissions ──

router.post("/contact", async (req, res) => {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !message) {
        res.status(400).json({ error: "name, email, and message are required" });
        return;
    }

    const data = { name, email, subject: subject || "", message };

    // Persist to CRM
    db.insert(inquiriesTable)
        .values({
            type: "contact",
            name,
            email,
            subject: subject || "",
            message,
            formData: data,
        })
        .catch((e) => console.error("[DB] Failed to persist contact inquiry:", e));

    // Send notification to contact@urbanchurn.com and confirmation to the user
    sendContactFormNotification(data).catch((e) =>
        console.error("[EMAIL] Contact form notification failed:", e),
    );
    sendContactFormConfirmation(data).catch((e) =>
        console.error("[EMAIL] Contact form confirmation failed:", e),
    );

    res.json({ success: true });
});

router.post("/wholesale", async (req, res) => {
    const { businessName, contactName, email, phone, businessType, location, interest, message } =
        req.body;

    if (!businessName || !contactName || !email || !phone || !businessType || !location) {
        res.status(400).json({
            error: "businessName, contactName, email, phone, businessType, and location are required",
        });
        return;
    }

    const data = {
        businessName,
        contactName,
        email,
        phone,
        businessType,
        location,
        interest: interest || "",
        message: message || "",
    };

    // Persist to CRM
    db.insert(inquiriesTable)
        .values({
            type: "wholesale",
            name: contactName,
            email,
            phone,
            message: message || "",
            formData: data,
        })
        .catch((e) => console.error("[DB] Failed to persist wholesale inquiry:", e));

    // Send notification to contact@urbanchurn.com and confirmation to the applicant
    sendWholesaleFormNotification(data).catch((e) =>
        console.error("[EMAIL] Wholesale form notification failed:", e),
    );
    sendWholesaleFormConfirmation(data).catch((e) =>
        console.error("[EMAIL] Wholesale form confirmation failed:", e),
    );

    res.json({ success: true });
});

router.post("/catering", async (req, res) => {
    const { firstName, lastName, email, phone, eventType, date, guestCount, message } = req.body;

    if (!firstName || !lastName || !email || !eventType) {
        res.status(400).json({
            error: "firstName, lastName, email, and eventType are required",
        });
        return;
    }

    const data = {
        firstName,
        lastName,
        email,
        phone: phone || "",
        eventType,
        date: date || "",
        guestCount: guestCount || "",
        message: message || "",
    };

    // Persist to CRM
    db.insert(inquiriesTable)
        .values({
            type: "catering",
            name: `${firstName} ${lastName}`,
            email,
            phone: phone || "",
            message: message || "",
            formData: data,
        })
        .catch((e) => console.error("[DB] Failed to persist catering inquiry:", e));

    // Send notification to contact@urbanchurn.com and confirmation to the requester
    sendCateringFormNotification(data).catch((e) =>
        console.error("[EMAIL] Catering form notification failed:", e),
    );
    sendCateringFormConfirmation(data).catch((e) =>
        console.error("[EMAIL] Catering form confirmation failed:", e),
    );

    res.json({ success: true });
});

router.post("/fundraising", async (req, res) => {
    const { orgName, contactName, email, phone, orgType, message } = req.body;

    if (!orgName || !contactName || !email || !orgType) {
        res.status(400).json({
            error: "orgName, contactName, email, and orgType are required",
        });
        return;
    }

    const data = {
        orgName,
        contactName,
        email,
        phone: phone || "",
        orgType,
        message: message || "",
    };

    // Persist to CRM
    db.insert(inquiriesTable)
        .values({
            type: "fundraising",
            name: contactName,
            email,
            phone: phone || "",
            message: message || "",
            formData: data,
        })
        .catch((e) => console.error("[DB] Failed to persist fundraising inquiry:", e));

    sendFundraisingFormNotification(data).catch((e) =>
        console.error("[EMAIL] Fundraising form notification failed:", e),
    );
    sendFundraisingFormConfirmation(data).catch((e) =>
        console.error("[EMAIL] Fundraising form confirmation failed:", e),
    );

    res.json({ success: true });
});

// ── Public Careers ──

router.get("/careers", async (_req, res) => {
    const [jobs, benefits] = await Promise.all([
        db
            .select()
            .from(jobPostingsTable)
            .where(eq(jobPostingsTable.active, true))
            .orderBy(asc(jobPostingsTable.sortOrder)),
        db
            .select()
            .from(careerBenefitsTable)
            .where(eq(careerBenefitsTable.active, true))
            .orderBy(asc(careerBenefitsTable.sortOrder)),
    ]);
    res.json({ jobs, benefits });
});

router.post("/careers/apply", async (req, res) => {
    const { name, email, phone, location, about, why } = req.body;

    if (!name || !email || !phone || !location) {
        res.status(400).json({ error: "name, email, phone, and location are required" });
        return;
    }

    const data = { name, email, phone, location, about: about || "", why: why || "" };

    sendCareerApplicationNotification(data).catch((e) =>
        console.error("[EMAIL] Career application notification failed:", e),
    );
    sendCareerApplicationConfirmation(data).catch((e) =>
        console.error("[EMAIL] Career application confirmation failed:", e),
    );

    res.json({ success: true });
});

// Public: get this month's rotating scoop flavours
router.get("/rotating-flavours", async (_req, res) => {
    const now = new Date();
    const month = now.getMonth() + 1; // 1–12
    const year = now.getFullYear();

    const flavours = await db
        .select()
        .from(rotatingFlavoursTable)
        .where(
            and(
                eq(rotatingFlavoursTable.active, true),
                eq(rotatingFlavoursTable.month, month),
                eq(rotatingFlavoursTable.year, year),
            ),
        )
        .orderBy(asc(rotatingFlavoursTable.sortOrder));

    res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=30");
    res.json(flavours);
});

// Public: get announcement bar settings
router.get("/announcement", async (_req, res) => {
    const keys = ["announcement_text", "announcement_link", "announcement_link_text", "announcement_enabled"];
    const rows = await db
        .select()
        .from(settingsTable)
        .where(inArray(settingsTable.key, keys));

    const result: Record<string, string> = {};
    for (const row of rows) {
        result[row.key] = row.value;
    }

    res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=30");
    res.json({
        enabled: result.announcement_enabled === "true",
        text: result.announcement_text || "",
        link: result.announcement_link || "",
        linkText: result.announcement_link_text || "",
    });
});

// Dynamic sitemap.xml — includes all static routes + dynamic event and flavour pages
router.get("/sitemap.xml", async (_req, res) => {
    try {
        const now = new Date().toISOString().split("T")[0];

        // Fetch published event slugs
        const events = await db
            .select({ slug: eventsTable.slug, updatedAt: eventsTable.updatedAt })
            .from(eventsTable)
            .where(and(eq(eventsTable.status, "published"), eq(eventsTable.isPrivate, false)));

        // Fetch available flavour slugs
        const flavours = await db
            .select({ slug: flavoursTable.slug })
            .from(flavoursTable)
            .where(eq(flavoursTable.available, true));

        const staticRoutes = [
            { loc: "/", changefreq: "weekly", priority: "1.0" },
            { loc: "/pre-order", changefreq: "daily", priority: "0.9" },
            { loc: "/locations", changefreq: "monthly", priority: "0.8" },
            { loc: "/events", changefreq: "weekly", priority: "0.8" },
            { loc: "/about", changefreq: "monthly", priority: "0.7" },
            { loc: "/catering", changefreq: "monthly", priority: "0.7" },
            { loc: "/bakery", changefreq: "weekly", priority: "0.7" },
            { loc: "/wholesale", changefreq: "monthly", priority: "0.6" },
            { loc: "/fundraising", changefreq: "monthly", priority: "0.6" },
            { loc: "/careers", changefreq: "weekly", priority: "0.5" },
            { loc: "/contact", changefreq: "yearly", priority: "0.5" },
        ];

        const urls = staticRoutes.map(
            (r) =>
                `  <url>\n    <loc>https://urbanchurn.com${r.loc}</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>${r.changefreq}</changefreq>\n    <priority>${r.priority}</priority>\n  </url>`,
        );

        for (const f of flavours) {
            urls.push(
                `  <url>\n    <loc>https://urbanchurn.com/pre-order/${f.slug}</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>`,
            );
        }

        for (const e of events) {
            const lastmod = e.updatedAt ? new Date(e.updatedAt).toISOString().split("T")[0] : now;
            urls.push(
                `  <url>\n    <loc>https://urbanchurn.com/events/${e.slug}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>`,
            );
        }

        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`;

        res.set("Content-Type", "application/xml");
        res.set("Cache-Control", "public, max-age=3600");
        res.send(xml);
    } catch (err) {
        console.error("Sitemap generation failed:", err);
        res.status(500).send("Internal server error");
    }
});

export default router;
