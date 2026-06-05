import crypto from "crypto";
import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
    wholesaleCustomersTable,
    wholesaleFlavoursTable,
    wholesaleSizesTable,
    wholesaleOrdersTable,
    wholesaleOrderItemsTable,
    wholesaleProductsTable,
    wholesaleEmailLogTable,
    wholesaleDeliveryRunsTable,
    wholesaleDeliveryRunStopsTable,
    wholesaleCustomerLocationsTable,
    wholesaleVendorLocationsTable,
    wholesaleCustomerExclusiveFlavoursTable,
    adminUsersTable,
    locationsTable,
    flavoursTable,
    customersTable,
} from "@workspace/db/schema";
import {
    eq,
    and,
    desc,
    gte,
    lte,
    count,
    ilike,
    or,
    sql,
    sum,
    asc,
    inArray,
} from "drizzle-orm";
import { sendWholesaleOrderConfirmed, sendDeliveryRunAssignment, sendWholesaleInvite, sendWholesaleAccountApproved, sendWholesaleWelcomeEmail } from "../../lib/email";
import { createAndPublishWholesaleInvoice, cancelWholesaleInvoice } from "../../lib/square";
import { hashPassword } from "../../lib/password";
import {
    wholesaleAdminCatalogFilter,
    type WholesaleCatalogFilter,
} from "../../lib/wholesale-utils";

const router: IRouter = Router();

function slugifyFlavourName(name: string) {
    return name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
}

function slugifyWholesaleSize(name: string) {
    return name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
}

async function syncExclusiveCustomers(flavourId: number, customerIds: number[]) {
    await db
        .delete(wholesaleCustomerExclusiveFlavoursTable)
        .where(eq(wholesaleCustomerExclusiveFlavoursTable.flavourId, flavourId));

    const uniqueIds = [...new Set(customerIds.map(Number).filter((id) => id > 0))];
    if (uniqueIds.length === 0) return;

    const existing = await db
        .select({ id: wholesaleCustomersTable.id })
        .from(wholesaleCustomersTable)
        .where(inArray(wholesaleCustomersTable.id, uniqueIds));

    if (existing.length === 0) return;

    await db.insert(wholesaleCustomerExclusiveFlavoursTable).values(
        existing.map((c) => ({
            wholesaleCustomerId: c.id,
            flavourId,
        })),
    );
}

async function getExclusiveCustomerMap(flavourIds: number[]) {
    const map = new Map<number, { id: number; businessName: string }[]>();
    if (flavourIds.length === 0) return map;

    const rows = await db
        .select({
            flavourId: wholesaleCustomerExclusiveFlavoursTable.flavourId,
            customerId: wholesaleCustomersTable.id,
            businessName: wholesaleCustomersTable.businessName,
        })
        .from(wholesaleCustomerExclusiveFlavoursTable)
        .innerJoin(
            wholesaleCustomersTable,
            eq(
                wholesaleCustomerExclusiveFlavoursTable.wholesaleCustomerId,
                wholesaleCustomersTable.id,
            ),
        )
        .where(inArray(wholesaleCustomerExclusiveFlavoursTable.flavourId, flavourIds));

    for (const row of rows) {
        if (!map.has(row.flavourId)) map.set(row.flavourId, []);
        map.get(row.flavourId)!.push({ id: row.customerId, businessName: row.businessName });
    }
    return map;
}

async function decrementWholesaleStockForOrder(orderId: number) {
    const items = await db
        .select({
            wholesaleProductId: wholesaleOrderItemsTable.wholesaleProductId,
            quantity: wholesaleOrderItemsTable.quantity,
        })
        .from(wholesaleOrderItemsTable)
        .where(eq(wholesaleOrderItemsTable.wholesaleOrderId, orderId));

    for (const item of items) {
        if (!item.wholesaleProductId) continue;
        await db
            .update(wholesaleProductsTable)
            .set({
                stockQuantity: sql`GREATEST(${wholesaleProductsTable.stockQuantity} - ${item.quantity}, 0)`,
                updatedAt: new Date(),
            })
            .where(
                and(
                    eq(wholesaleProductsTable.id, item.wholesaleProductId),
                    eq(wholesaleProductsTable.manageStock, true),
                ),
            );
    }
}

// ═══════════════════════════════════════
// ── Wholesale Customers ──
// ═══════════════════════════════════════

router.get("/customers", async (req, res) => {
    const search = req.query.search as string | undefined;
    const status = req.query.status as string | undefined;

    const conditions = [];
    if (status) conditions.push(eq(wholesaleCustomersTable.status, status as any));
    if (search) {
        conditions.push(
            or(
                ilike(wholesaleCustomersTable.businessName, `%${search}%`),
                ilike(wholesaleCustomersTable.email, `%${search}%`),
                ilike(wholesaleCustomersTable.contactName, `%${search}%`),
            )!,
        );
    }

    const customers = await db
        .select()
        .from(wholesaleCustomersTable)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(wholesaleCustomersTable.createdAt));

    // Fetch location mappings for all customers
    const allMappings = await db
        .select({
            wholesaleCustomerId: wholesaleCustomerLocationsTable.wholesaleCustomerId,
            locationId: wholesaleCustomerLocationsTable.locationId,
            locationName: locationsTable.name,
            locationType: locationsTable.type,
        })
        .from(wholesaleCustomerLocationsTable)
        .innerJoin(locationsTable, eq(wholesaleCustomerLocationsTable.locationId, locationsTable.id));

    const mappingsByCustomer = new Map<number, typeof allMappings>();
    for (const m of allMappings) {
        if (!mappingsByCustomer.has(m.wholesaleCustomerId)) {
            mappingsByCustomer.set(m.wholesaleCustomerId, []);
        }
        mappingsByCustomer.get(m.wholesaleCustomerId)!.push(m);
    }

    const customersWithLocations = customers.map((c) => ({
        ...c,
        locations: (mappingsByCustomer.get(c.id) || []).map((m) => ({
            id: m.locationId,
            name: m.locationName,
            type: m.locationType,
        })),
    }));

    res.json(customersWithLocations);
});

router.post("/customers", async (req, res) => {
    const { businessName, contactName, email, phone, address, city, state, zip, deliveryMethod, defaultLocationId, deliveryNotes, adminNotes, emailAliases, locationIds } = req.body;

    if (!businessName || !email) {
        res.status(400).json({ error: "businessName and email are required" });
        return;
    }

    try {
        const [customer] = await db
            .insert(wholesaleCustomersTable)
            .values({
                businessName,
                contactName: contactName || "",
                email: email.toLowerCase(),
                emailAliases: Array.isArray(emailAliases)
                    ? emailAliases.map((e: string) => e.toLowerCase().trim()).filter(Boolean)
                    : [],
                phone: phone || "",
                address: address || "",
                city: city || "",
                state: state || "PA",
                zip: zip || "",
                deliveryMethod: deliveryMethod || "delivery",
                defaultLocationId: defaultLocationId ? Number(defaultLocationId) : null,
                deliveryNotes: deliveryNotes || "",
                status: "active",
                adminNotes: adminNotes || "",
            })
            .returning();

        // Insert location mappings
        if (Array.isArray(locationIds) && locationIds.length > 0) {
            await db.insert(wholesaleCustomerLocationsTable).values(
                locationIds.map((lid: number) => ({
                    wholesaleCustomerId: customer.id,
                    locationId: lid,
                })),
            );
        }

        // Auto-create a linked customer login account with a temporary password
        const tempPassword = crypto.randomBytes(6).toString("hex"); // 12-char hex
        const passwordHash = await hashPassword(tempPassword);

        const nameParts = (contactName || businessName).trim().split(/\s+/);
        const firstName = nameParts[0] || "";
        const lastName = nameParts.slice(1).join(" ") || "";
        const normalizedEmail = email.toLowerCase().trim();

        // Upsert: if a customer record already exists for this email, link it; otherwise create one
        const existingCustomers = await db
            .select()
            .from(customersTable)
            .where(eq(customersTable.email, normalizedEmail))
            .limit(1);

        if (existingCustomers.length > 0) {
            await db
                .update(customersTable)
                .set({
                    wholesaleCustomerId: customer.id,
                    hasAccount: true,
                    passwordHash,
                    firstName: existingCustomers[0].firstName || firstName,
                    lastName: existingCustomers[0].lastName || lastName,
                    updatedAt: new Date(),
                })
                .where(eq(customersTable.email, normalizedEmail));
        } else {
            await db.insert(customersTable).values({
                email: normalizedEmail,
                firstName,
                lastName,
                phone: phone || "",
                hasAccount: true,
                passwordHash,
                wholesaleCustomerId: customer.id,
            });
        }

        // Send welcome email with temp password (fire-and-forget)
        sendWholesaleWelcomeEmail({
            email: normalizedEmail,
            contactName: contactName || businessName,
            businessName,
            tempPassword,
        }).catch((e) => console.error("[EMAIL] Wholesale welcome email failed:", e));

        // Fetch mapped locations for response
        const mappedLocations = await db
            .select({ id: locationsTable.id, name: locationsTable.name, type: locationsTable.type })
            .from(wholesaleCustomerLocationsTable)
            .innerJoin(locationsTable, eq(wholesaleCustomerLocationsTable.locationId, locationsTable.id))
            .where(eq(wholesaleCustomerLocationsTable.wholesaleCustomerId, customer.id));

        res.status(201).json({ ...customer, locations: mappedLocations });
    } catch (err: any) {
        if (err?.constraint === "wholesale_customers_email_unique" || err?.code === "23505") {
            res.status(409).json({ error: "A wholesale customer with this email already exists" });
        } else {
            console.error("[wholesale/customers POST]", err?.message || err);
            res.status(500).json({ error: err?.message || "Failed to create wholesale customer" });
        }
    }
});

router.get("/customers/:id", async (req, res) => {
    const id = Number(req.params.id);
    const [customer] = await db
        .select()
        .from(wholesaleCustomersTable)
        .where(eq(wholesaleCustomersTable.id, id))
        .limit(1);

    if (!customer) {
        res.status(404).json({ error: "Customer not found" });
        return;
    }

    // Get recent orders
    const orders = await db
        .select()
        .from(wholesaleOrdersTable)
        .where(eq(wholesaleOrdersTable.wholesaleCustomerId, id))
        .orderBy(desc(wholesaleOrdersTable.createdAt))
        .limit(50);

    // Get mapped locations
    const locations = await db
        .select({ id: locationsTable.id, name: locationsTable.name, type: locationsTable.type })
        .from(wholesaleCustomerLocationsTable)
        .innerJoin(locationsTable, eq(wholesaleCustomerLocationsTable.locationId, locationsTable.id))
        .where(eq(wholesaleCustomerLocationsTable.wholesaleCustomerId, id));

    // Get linked staff accounts
    const staffAccounts = await db
        .select({
            id: adminUsersTable.id,
            username: adminUsersTable.username,
            role: adminUsersTable.role,
            assignedLocationId: adminUsersTable.assignedLocationId,
            createdAt: adminUsersTable.createdAt,
        })
        .from(adminUsersTable)
        .where(eq(adminUsersTable.wholesaleCustomerId, id));

    // Get vendor delivery locations
    const vendorLocations = await db
        .select()
        .from(wholesaleVendorLocationsTable)
        .where(eq(wholesaleVendorLocationsTable.wholesaleCustomerId, id))
        .orderBy(wholesaleVendorLocationsTable.isDefault, wholesaleVendorLocationsTable.name);

    res.json({ ...customer, orders, locations, staffAccounts, vendorLocations });
});

router.put("/customers/:id", async (req, res) => {
    const id = Number(req.params.id);
    const { businessName, contactName, email, phone, address, city, state, zip, deliveryMethod, defaultLocationId, deliveryNotes, status, adminNotes, emailAliases, locationIds } = req.body;

    const updates: Record<string, any> = { updatedAt: new Date() };
    if (businessName !== undefined) updates.businessName = businessName;
    if (contactName !== undefined) updates.contactName = contactName;
    if (email !== undefined) updates.email = email.toLowerCase();
    if (emailAliases !== undefined) {
        updates.emailAliases = Array.isArray(emailAliases)
            ? emailAliases.map((e: string) => e.toLowerCase().trim()).filter(Boolean)
            : [];
    }
    if (phone !== undefined) updates.phone = phone;
    if (address !== undefined) updates.address = address;
    if (city !== undefined) updates.city = city;
    if (state !== undefined) updates.state = state;
    if (zip !== undefined) updates.zip = zip;
    if (deliveryMethod !== undefined) updates.deliveryMethod = deliveryMethod;
    if (defaultLocationId !== undefined) updates.defaultLocationId = defaultLocationId;
    if (deliveryNotes !== undefined) updates.deliveryNotes = deliveryNotes;
    if (status !== undefined) updates.status = status;
    if (adminNotes !== undefined) updates.adminNotes = adminNotes;

    const [updated] = await db
        .update(wholesaleCustomersTable)
        .set(updates)
        .where(eq(wholesaleCustomersTable.id, id))
        .returning();

    if (!updated) {
        res.status(404).json({ error: "Customer not found" });
        return;
    }

    // Replace location mappings if provided
    if (Array.isArray(locationIds)) {
        await db.delete(wholesaleCustomerLocationsTable)
            .where(eq(wholesaleCustomerLocationsTable.wholesaleCustomerId, id));
        if (locationIds.length > 0) {
            await db.insert(wholesaleCustomerLocationsTable).values(
                locationIds.map((lid: number) => ({
                    wholesaleCustomerId: id,
                    locationId: lid,
                })),
            );
        }
    }

    // Fetch mapped locations for response
    const locations = await db
        .select({ id: locationsTable.id, name: locationsTable.name, type: locationsTable.type })
        .from(wholesaleCustomerLocationsTable)
        .innerJoin(locationsTable, eq(wholesaleCustomerLocationsTable.locationId, locationsTable.id))
        .where(eq(wholesaleCustomerLocationsTable.wholesaleCustomerId, id));

    res.json({ ...updated, locations });
});

// ═══════════════════════════════════════
// ── Wholesale Flavours ──
// ═══════════════════════════════════════

router.get("/flavours", async (req, res) => {
    const catalog = (req.query.catalog as WholesaleCatalogFilter) || "all";
    const customerId = req.query.customerId
        ? Number(req.query.customerId)
        : undefined;

    const catalogFilter = wholesaleAdminCatalogFilter(
        catalog,
        flavoursTable.id,
        { customerId },
    );

    const rows = await db
        .select({
            wholesaleFlavourId: wholesaleFlavoursTable.id,
            flavourId: flavoursTable.id,
            flavourName: flavoursTable.name,
            tag: flavoursTable.tag,
            imageUrl: flavoursTable.imageUrl,
            baseDescription: flavoursTable.description,
            description: wholesaleFlavoursTable.description,
            allergens: wholesaleFlavoursTable.allergens,
            isSeasonal: wholesaleFlavoursTable.isSeasonal,
            isExclusive: wholesaleFlavoursTable.isExclusive,
            active: wholesaleFlavoursTable.active,
            sortOrder: wholesaleFlavoursTable.sortOrder,
            updatedAt: wholesaleFlavoursTable.updatedAt,
        })
        .from(flavoursTable)
        .leftJoin(
            wholesaleFlavoursTable,
            eq(wholesaleFlavoursTable.flavourId, flavoursTable.id),
        )
        .where(catalogFilter ? catalogFilter : undefined)
        .orderBy(
            asc(sql`COALESCE(${wholesaleFlavoursTable.isExclusive}, false)`),
            asc(sql`COALESCE(${wholesaleFlavoursTable.sortOrder}, ${flavoursTable.sortOrder})`),
            asc(flavoursTable.name),
        );

    const flavourIds = rows.map((r) => r.flavourId);
    const exclusiveMap = await getExclusiveCustomerMap(flavourIds);

    res.json(
        rows.map((row) => ({
            id: row.wholesaleFlavourId,
            flavourId: row.flavourId,
            flavourName: row.flavourName,
            tag: row.tag,
            imageUrl: row.imageUrl,
            description: row.description ?? row.baseDescription ?? "",
            allergens: row.allergens ?? "",
            isSeasonal: row.isSeasonal ?? row.tag === "seasonal",
            isExclusive: row.isExclusive ?? false,
            exclusiveCustomers: exclusiveMap.get(row.flavourId) || [],
            active: row.active ?? true,
            sortOrder: row.sortOrder ?? 0,
            updatedAt: row.updatedAt,
        })),
    );
});

router.post("/flavours", async (req, res) => {
    const {
        flavourId,
        description,
        allergens,
        isSeasonal,
        isExclusive,
        active,
        sortOrder,
        customerIds,
    } = req.body;

    if (!flavourId) {
        res.status(400).json({ error: "flavourId is required" });
        return;
    }

    const exclusive = isExclusive === true;
    if (exclusive && (!Array.isArray(customerIds) || customerIds.length === 0)) {
        res.status(400).json({ error: "At least one customerId is required for exclusive flavours" });
        return;
    }

    const numericFlavourId = Number(flavourId);

    const [existing] = await db
        .select({ id: wholesaleFlavoursTable.id })
        .from(wholesaleFlavoursTable)
        .where(eq(wholesaleFlavoursTable.flavourId, numericFlavourId))
        .limit(1);

    if (existing) {
        const [updated] = await db
            .update(wholesaleFlavoursTable)
            .set({
                description: description ?? "",
                allergens: allergens ?? "",
                isSeasonal: isSeasonal === true,
                isExclusive: exclusive,
                active: active !== false,
                sortOrder: sortOrder || 0,
                updatedAt: new Date(),
            })
            .where(eq(wholesaleFlavoursTable.id, existing.id))
            .returning();

        if (Array.isArray(customerIds)) {
            await syncExclusiveCustomers(numericFlavourId, customerIds);
        } else if (isExclusive === false) {
            await db
                .delete(wholesaleCustomerExclusiveFlavoursTable)
                .where(eq(wholesaleCustomerExclusiveFlavoursTable.flavourId, numericFlavourId));
        }

        res.json(updated);
        return;
    }

    const [created] = await db
        .insert(wholesaleFlavoursTable)
        .values({
            flavourId: numericFlavourId,
            description: description ?? "",
            allergens: allergens ?? "",
            isSeasonal: isSeasonal === true,
            isExclusive: exclusive,
            active: active !== false,
            sortOrder: sortOrder || 0,
        })
        .returning();

    if (exclusive && Array.isArray(customerIds)) {
        await syncExclusiveCustomers(numericFlavourId, customerIds);
    }

    res.status(201).json(created);
});

router.put("/flavours/bulk/active", async (req, res) => {
    const { flavourIds, active } = req.body;

    if (!Array.isArray(flavourIds) || flavourIds.length === 0) {
        res.status(400).json({ error: "flavourIds array is required" });
        return;
    }
    if (typeof active !== "boolean") {
        res.status(400).json({ error: "active boolean is required" });
        return;
    }

    let updated = 0;
    let created = 0;

    for (const rawId of flavourIds) {
        const flavourId = Number(rawId);
        if (!flavourId || Number.isNaN(flavourId)) continue;

        const [existing] = await db
            .select({ id: wholesaleFlavoursTable.id })
            .from(wholesaleFlavoursTable)
            .where(eq(wholesaleFlavoursTable.flavourId, flavourId))
            .limit(1);

        if (existing) {
            await db
                .update(wholesaleFlavoursTable)
                .set({ active, updatedAt: new Date() })
                .where(eq(wholesaleFlavoursTable.id, existing.id));
            updated++;
        } else {
            await db.insert(wholesaleFlavoursTable).values({
                flavourId,
                active,
            });
            created++;
        }
    }

    res.json({ updated, created, total: updated + created });
});

router.put("/flavours/:id", async (req, res) => {
    const id = Number(req.params.id);
    const { description, allergens, isSeasonal, isExclusive, active, sortOrder, customerIds } =
        req.body;

    const updates: Record<string, any> = { updatedAt: new Date() };
    if (description !== undefined) updates.description = description;
    if (allergens !== undefined) updates.allergens = allergens;
    if (isSeasonal !== undefined) updates.isSeasonal = !!isSeasonal;
    if (isExclusive !== undefined) updates.isExclusive = !!isExclusive;
    if (active !== undefined) updates.active = active;
    if (sortOrder !== undefined) updates.sortOrder = sortOrder;

    const [updated] = await db
        .update(wholesaleFlavoursTable)
        .set(updates)
        .where(eq(wholesaleFlavoursTable.id, id))
        .returning();

    if (!updated) {
        res.status(404).json({ error: "Wholesale flavour not found" });
        return;
    }

    if (Array.isArray(customerIds)) {
        await syncExclusiveCustomers(updated.flavourId, customerIds);
    } else if (isExclusive === false) {
        await db
            .delete(wholesaleCustomerExclusiveFlavoursTable)
            .where(eq(wholesaleCustomerExclusiveFlavoursTable.flavourId, updated.flavourId));
    }

    res.json(updated);
});

router.delete("/flavours/:id", async (req, res) => {
    const id = Number(req.params.id);

    const [updated] = await db
        .update(wholesaleFlavoursTable)
        .set({ active: false, updatedAt: new Date() })
        .where(eq(wholesaleFlavoursTable.id, id))
        .returning();

    if (!updated) {
        res.status(404).json({ error: "Wholesale flavour not found" });
        return;
    }

    res.json({ success: true });
});

// Create base flavour + wholesale profile (+ optional size SKUs) in one step
router.post("/flavours/create-full", async (req, res) => {
    const {
        name,
        description,
        allergens,
        isSeasonal,
        sizeIds,
        defaultPriceCents,
    } = req.body;

    if (!name || typeof name !== "string") {
        res.status(400).json({ error: "name is required" });
        return;
    }

    let baseSlug = slugifyFlavourName(name);
    if (!baseSlug) baseSlug = `flavour-${Date.now()}`;

    const [existingSlug] = await db
        .select({ id: flavoursTable.id })
        .from(flavoursTable)
        .where(eq(flavoursTable.slug, baseSlug))
        .limit(1);

    const slug = existingSlug ? `${baseSlug}-${Date.now().toString(36)}` : baseSlug;

    const [flavour] = await db
        .insert(flavoursTable)
        .values({
            name: name.trim(),
            slug,
            description: description || "",
            tag: isSeasonal ? "seasonal" : "classic",
            available: true,
        })
        .returning();

    const [wholesaleFlavour] = await db
        .insert(wholesaleFlavoursTable)
        .values({
            flavourId: flavour.id,
            description: description || "",
            allergens: allergens || "",
            isSeasonal: isSeasonal === true,
            active: true,
        })
        .returning();

    const createdProducts: typeof wholesaleProductsTable.$inferSelect[] = [];
    if (Array.isArray(sizeIds) && sizeIds.length > 0 && defaultPriceCents !== undefined) {
        const sizes = await db
            .select()
            .from(wholesaleSizesTable)
            .where(inArray(wholesaleSizesTable.id, sizeIds.map(Number)));

        for (const size of sizes) {
            const [existing] = await db
                .select({ id: wholesaleProductsTable.id })
                .from(wholesaleProductsTable)
                .where(
                    and(
                        eq(wholesaleProductsTable.flavourId, flavour.id),
                        eq(wholesaleProductsTable.wholesaleSizeId, size.id),
                    ),
                )
                .limit(1);
            if (existing) continue;

            const [product] = await db
                .insert(wholesaleProductsTable)
                .values({
                    flavourId: flavour.id,
                    wholesaleSizeId: size.id,
                    name: size.name,
                    unitDescription: size.description || "",
                    priceCents: Number(defaultPriceCents),
                    sizeCategory: size.sizeCategory,
                    available: true,
                })
                .returning();
            if (product) createdProducts.push(product);
        }
    }

    res.status(201).json({ flavour, wholesaleFlavour, products: createdProducts });
});

// Create a client-exclusive flavour with customer assignments
router.post("/flavours/create-exclusive", async (req, res) => {
    const {
        name,
        description,
        allergens,
        isSeasonal,
        customerIds,
        sizeIds,
        defaultPriceCents,
    } = req.body;

    if (!name || typeof name !== "string") {
        res.status(400).json({ error: "name is required" });
        return;
    }
    if (!Array.isArray(customerIds) || customerIds.length === 0) {
        res.status(400).json({ error: "At least one customerId is required for exclusive flavours" });
        return;
    }

    let baseSlug = slugifyFlavourName(name);
    if (!baseSlug) baseSlug = `flavour-${Date.now()}`;

    const [existingSlug] = await db
        .select({ id: flavoursTable.id })
        .from(flavoursTable)
        .where(eq(flavoursTable.slug, baseSlug))
        .limit(1);

    const slug = existingSlug ? `${baseSlug}-${Date.now().toString(36)}` : baseSlug;

    const [flavour] = await db
        .insert(flavoursTable)
        .values({
            name: name.trim(),
            slug,
            description: description || "",
            tag: isSeasonal ? "seasonal" : "classic",
            available: true,
        })
        .returning();

    const [wholesaleFlavour] = await db
        .insert(wholesaleFlavoursTable)
        .values({
            flavourId: flavour.id,
            description: description || "",
            allergens: allergens || "",
            isSeasonal: isSeasonal === true,
            isExclusive: true,
            active: true,
        })
        .returning();

    await syncExclusiveCustomers(flavour.id, customerIds);

    const createdProducts: typeof wholesaleProductsTable.$inferSelect[] = [];
    if (Array.isArray(sizeIds) && sizeIds.length > 0 && defaultPriceCents !== undefined) {
        const sizes = await db
            .select()
            .from(wholesaleSizesTable)
            .where(inArray(wholesaleSizesTable.id, sizeIds.map(Number)));

        for (const size of sizes) {
            const [product] = await db
                .insert(wholesaleProductsTable)
                .values({
                    flavourId: flavour.id,
                    wholesaleSizeId: size.id,
                    name: size.name,
                    unitDescription: size.description || "",
                    priceCents: Number(defaultPriceCents),
                    sizeCategory: size.sizeCategory,
                    available: true,
                })
                .returning();
            if (product) createdProducts.push(product);
        }
    }

    const exclusiveMap = await getExclusiveCustomerMap([flavour.id]);

    res.status(201).json({
        flavour,
        wholesaleFlavour,
        products: createdProducts,
        exclusiveCustomers: exclusiveMap.get(flavour.id) || [],
    });
});

router.put("/flavours/:id/exclusive-customers", async (req, res) => {
    const id = Number(req.params.id);
    const { customerIds } = req.body;

    const [wf] = await db
        .select()
        .from(wholesaleFlavoursTable)
        .where(eq(wholesaleFlavoursTable.id, id))
        .limit(1);

    if (!wf) {
        res.status(404).json({ error: "Wholesale flavour not found" });
        return;
    }

    if (!Array.isArray(customerIds)) {
        res.status(400).json({ error: "customerIds array is required" });
        return;
    }

    await db
        .update(wholesaleFlavoursTable)
        .set({ isExclusive: customerIds.length > 0, updatedAt: new Date() })
        .where(eq(wholesaleFlavoursTable.id, id));

    await syncExclusiveCustomers(wf.flavourId, customerIds);

    const exclusiveMap = await getExclusiveCustomerMap([wf.flavourId]);
    res.json({ flavourId: wf.flavourId, exclusiveCustomers: exclusiveMap.get(wf.flavourId) || [] });
});

router.get("/customers/:id/exclusive-flavours", async (req, res) => {
    const customerId = Number(req.params.id);

    const rows = await db
        .select({
            wholesaleFlavourId: wholesaleFlavoursTable.id,
            flavourId: flavoursTable.id,
            flavourName: flavoursTable.name,
            description: wholesaleFlavoursTable.description,
            active: wholesaleFlavoursTable.active,
        })
        .from(wholesaleCustomerExclusiveFlavoursTable)
        .innerJoin(flavoursTable, eq(wholesaleCustomerExclusiveFlavoursTable.flavourId, flavoursTable.id))
        .innerJoin(
            wholesaleFlavoursTable,
            eq(wholesaleFlavoursTable.flavourId, flavoursTable.id),
        )
        .where(eq(wholesaleCustomerExclusiveFlavoursTable.wholesaleCustomerId, customerId))
        .orderBy(asc(flavoursTable.name));

    res.json(rows);
});

// Enable all (or selected) sizes for a flavour with a default price
router.post("/flavours/:flavourId/enable-sizes", async (req, res) => {
    const flavourId = Number(req.params.flavourId);
    const { sizeIds, defaultPriceCents } = req.body;

    if (defaultPriceCents === undefined || Number(defaultPriceCents) < 0) {
        res.status(400).json({ error: "defaultPriceCents is required" });
        return;
    }

    const [flavour] = await db
        .select({ id: flavoursTable.id, name: flavoursTable.name })
        .from(flavoursTable)
        .where(eq(flavoursTable.id, flavourId))
        .limit(1);

    if (!flavour) {
        res.status(404).json({ error: "Flavour not found" });
        return;
    }

    let sizes;
    if (Array.isArray(sizeIds) && sizeIds.length > 0) {
        sizes = await db
            .select()
            .from(wholesaleSizesTable)
            .where(
                and(
                    inArray(wholesaleSizesTable.id, sizeIds.map(Number)),
                    eq(wholesaleSizesTable.active, true),
                ),
            );
    } else {
        sizes = await db
            .select()
            .from(wholesaleSizesTable)
            .where(eq(wholesaleSizesTable.active, true));
    }

    const created = [];
    for (const size of sizes) {
        const [existing] = await db
            .select({ id: wholesaleProductsTable.id })
            .from(wholesaleProductsTable)
            .where(
                and(
                    eq(wholesaleProductsTable.flavourId, flavourId),
                    eq(wholesaleProductsTable.wholesaleSizeId, size.id),
                ),
            )
            .limit(1);

        if (existing) continue;

        const [product] = await db
            .insert(wholesaleProductsTable)
            .values({
                flavourId,
                wholesaleSizeId: size.id,
                name: size.name,
                unitDescription: size.description || "",
                priceCents: Number(defaultPriceCents),
                sizeCategory: size.sizeCategory,
                available: true,
            })
            .returning();
        if (product) created.push(product);
    }

    res.status(201).json({ created: created.length, products: created });
});

// ═══════════════════════════════════════
// ── Wholesale Sizes ──
// ═══════════════════════════════════════

router.get("/sizes", async (_req, res) => {
    const sizes = await db
        .select()
        .from(wholesaleSizesTable)
        .orderBy(asc(wholesaleSizesTable.sortOrder), asc(wholesaleSizesTable.name));

    res.json(sizes);
});

router.post("/sizes", async (req, res) => {
    const { name, slug, description, sizeCategory, active, sortOrder } = req.body;

    if (!name) {
        res.status(400).json({ error: "name is required" });
        return;
    }

    const [size] = await db
        .insert(wholesaleSizesTable)
        .values({
            name,
            slug: slug || slugifyWholesaleSize(name),
            description: description || "",
            sizeCategory: sizeCategory || null,
            active: active !== false,
            sortOrder: sortOrder || 0,
        })
        .returning();

    res.status(201).json(size);
});

router.put("/sizes/:id", async (req, res) => {
    const id = Number(req.params.id);
    const { name, slug, description, sizeCategory, active, sortOrder } = req.body;

    const updates: Record<string, any> = { updatedAt: new Date() };
    if (name !== undefined) updates.name = name;
    if (slug !== undefined) updates.slug = slug || slugifyWholesaleSize(name || "size");
    if (description !== undefined) updates.description = description;
    if (sizeCategory !== undefined) updates.sizeCategory = sizeCategory || null;
    if (active !== undefined) updates.active = active;
    if (sortOrder !== undefined) updates.sortOrder = sortOrder;

    const [updated] = await db
        .update(wholesaleSizesTable)
        .set(updates)
        .where(eq(wholesaleSizesTable.id, id))
        .returning();

    if (!updated) {
        res.status(404).json({ error: "Size not found" });
        return;
    }

    res.json(updated);
});

router.delete("/sizes/:id", async (req, res) => {
    const id = Number(req.params.id);

    const [inUse] = await db
        .select({ count: count() })
        .from(wholesaleProductsTable)
        .where(eq(wholesaleProductsTable.wholesaleSizeId, id));

    if ((inUse?.count || 0) > 0) {
        res.status(409).json({ error: "Cannot delete a wholesale size that is in use" });
        return;
    }

    const [deleted] = await db
        .delete(wholesaleSizesTable)
        .where(eq(wholesaleSizesTable.id, id))
        .returning();

    if (!deleted) {
        res.status(404).json({ error: "Size not found" });
        return;
    }

    res.json({ success: true });
});

// ═══════════════════════════════════════
// ── Wholesale Products ──
// ═══════════════════════════════════════

router.get("/products", async (req, res) => {
    const catalog = (req.query.catalog as WholesaleCatalogFilter) || "all";
    const customerId = req.query.customerId
        ? Number(req.query.customerId)
        : undefined;

    const catalogFilter = wholesaleAdminCatalogFilter(
        catalog,
        wholesaleProductsTable.flavourId,
        { customerId },
    );

    const products = await db
        .select({
            id: wholesaleProductsTable.id,
            flavourId: wholesaleProductsTable.flavourId,
            flavourName: flavoursTable.name,
            wholesaleFlavourId: wholesaleFlavoursTable.id,
            flavourDescription: wholesaleFlavoursTable.description,
            flavourAllergens: wholesaleFlavoursTable.allergens,
            flavourIsSeasonal: wholesaleFlavoursTable.isSeasonal,
            flavourIsExclusive: wholesaleFlavoursTable.isExclusive,
            flavourActive: wholesaleFlavoursTable.active,
            wholesaleSizeId: wholesaleProductsTable.wholesaleSizeId,
            name: wholesaleProductsTable.name,
            sizeCategory: wholesaleProductsTable.sizeCategory,
            sizeName: wholesaleSizesTable.name,
            sizeSlug: wholesaleSizesTable.slug,
            sizeDescription: wholesaleSizesTable.description,
            sizeActive: wholesaleSizesTable.active,
            sizeSortOrder: wholesaleSizesTable.sortOrder,
            unitDescription: wholesaleProductsTable.unitDescription,
            priceCents: wholesaleProductsTable.priceCents,
            available: wholesaleProductsTable.available,
            manageStock: wholesaleProductsTable.manageStock,
            stockQuantity: wholesaleProductsTable.stockQuantity,
            lowStockThreshold: wholesaleProductsTable.lowStockThreshold,
            sortOrder: wholesaleProductsTable.sortOrder,
            createdAt: wholesaleProductsTable.createdAt,
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
        .where(catalogFilter ? catalogFilter : undefined)
        .orderBy(
            asc(sql`COALESCE(${wholesaleFlavoursTable.isExclusive}, false)`),
            asc(wholesaleSizesTable.sortOrder),
            asc(wholesaleProductsTable.sortOrder),
        );

    const flavourIds = [...new Set(products.map((p) => p.flavourId))];
    const exclusiveMap = await getExclusiveCustomerMap(flavourIds);

    res.json(
        products.map((p) => ({
            ...p,
            flavourIsExclusive: p.flavourIsExclusive ?? false,
            exclusiveCustomers: exclusiveMap.get(p.flavourId) || [],
        })),
    );
});

router.post("/products", async (req, res) => {
    const { flavourId, wholesaleSizeId, name, unitDescription, priceCents, available, sortOrder, sizeCategory, manageStock, stockQuantity, lowStockThreshold } = req.body;

    if (!flavourId || priceCents === undefined) {
        res.status(400).json({ error: "flavourId and priceCents are required" });
        return;
    }

    let resolvedName = name;
    let resolvedUnitDescription = unitDescription || "";
    let resolvedSizeCategory = sizeCategory || null;
    let resolvedWholesaleSizeId = wholesaleSizeId ? Number(wholesaleSizeId) : null;

    if (resolvedWholesaleSizeId) {
        const [size] = await db
            .select()
            .from(wholesaleSizesTable)
            .where(eq(wholesaleSizesTable.id, resolvedWholesaleSizeId))
            .limit(1);

        if (!size) {
            res.status(404).json({ error: "Wholesale size not found" });
            return;
        }

        resolvedName = resolvedName || size.name;
        resolvedUnitDescription = resolvedUnitDescription || size.description || "";
        resolvedSizeCategory = resolvedSizeCategory || size.sizeCategory || null;
    }

    if (!resolvedName) {
        res.status(400).json({ error: "name is required when wholesaleSizeId is not provided" });
        return;
    }

    const [product] = await db
        .insert(wholesaleProductsTable)
        .values({
            flavourId,
            wholesaleSizeId: resolvedWholesaleSizeId,
            name: resolvedName,
            unitDescription: resolvedUnitDescription,
            priceCents,
            available: available !== false,
            manageStock: manageStock === true,
            stockQuantity: stockQuantity ?? 0,
            lowStockThreshold: lowStockThreshold ?? 5,
            sortOrder: sortOrder || 0,
            sizeCategory: resolvedSizeCategory,
        })
        .returning();

    res.status(201).json(product);
});

router.put("/products/bulk/size-availability", async (req, res) => {
    const { flavourIds, wholesaleSizeIds, enabled, defaultPriceCents } = req.body;

    if (!Array.isArray(flavourIds) || flavourIds.length === 0) {
        res.status(400).json({ error: "flavourIds array is required" });
        return;
    }
    if (!Array.isArray(wholesaleSizeIds) || wholesaleSizeIds.length === 0) {
        res.status(400).json({ error: "wholesaleSizeIds array is required" });
        return;
    }
    if (typeof enabled !== "boolean") {
        res.status(400).json({ error: "enabled boolean is required" });
        return;
    }

    const sizeRows = await db
        .select()
        .from(wholesaleSizesTable)
        .where(inArray(wholesaleSizesTable.id, wholesaleSizeIds.map(Number)));

    if (sizeRows.length === 0) {
        res.status(400).json({ error: "No valid wholesale sizes found" });
        return;
    }

    const priceCents = Math.max(0, Math.round(Number(defaultPriceCents) || 0));

    let updated = 0;
    let created = 0;
    let disabled = 0;
    let skipped = 0;

    for (const rawFlavourId of flavourIds) {
        const flavourId = Number(rawFlavourId);
        if (!flavourId || Number.isNaN(flavourId)) continue;

        for (const size of sizeRows) {
            const [existing] = await db
                .select()
                .from(wholesaleProductsTable)
                .where(
                    and(
                        eq(wholesaleProductsTable.flavourId, flavourId),
                        eq(wholesaleProductsTable.wholesaleSizeId, size.id),
                    ),
                )
                .limit(1);

            if (enabled) {
                if (existing) {
                    await db
                        .update(wholesaleProductsTable)
                        .set({ available: true, updatedAt: new Date() })
                        .where(eq(wholesaleProductsTable.id, existing.id));
                    updated++;
                } else if (priceCents > 0) {
                    await db.insert(wholesaleProductsTable).values({
                        flavourId,
                        wholesaleSizeId: size.id,
                        name: size.name,
                        unitDescription: size.description || "",
                        priceCents,
                        sizeCategory: size.sizeCategory,
                        available: true,
                    });
                    created++;
                } else {
                    skipped++;
                }
            } else if (existing) {
                await db
                    .update(wholesaleProductsTable)
                    .set({ available: false, updatedAt: new Date() })
                    .where(eq(wholesaleProductsTable.id, existing.id));
                disabled++;
            }
        }
    }

    res.json({ updated, created, disabled, skipped, total: updated + created + disabled });
});

router.put("/products/:id", async (req, res) => {
    const id = Number(req.params.id);
    const { flavourId, wholesaleSizeId, name, unitDescription, priceCents, available, sortOrder, sizeCategory, manageStock, stockQuantity, lowStockThreshold } = req.body;

    const updates: Record<string, any> = { updatedAt: new Date() };
    if (wholesaleSizeId !== undefined) updates.wholesaleSizeId = wholesaleSizeId ? Number(wholesaleSizeId) : null;
    if (flavourId !== undefined) updates.flavourId = flavourId;
    if (name !== undefined) updates.name = name;
    if (unitDescription !== undefined) updates.unitDescription = unitDescription;
    if (priceCents !== undefined) updates.priceCents = priceCents;
    if (available !== undefined) updates.available = available;
    if (manageStock !== undefined) updates.manageStock = manageStock;
    if (stockQuantity !== undefined) updates.stockQuantity = stockQuantity;
    if (lowStockThreshold !== undefined) updates.lowStockThreshold = lowStockThreshold;
    if (sortOrder !== undefined) updates.sortOrder = sortOrder;
    if (sizeCategory !== undefined) updates.sizeCategory = sizeCategory || null;

    if (updates.wholesaleSizeId) {
        const [size] = await db
            .select()
            .from(wholesaleSizesTable)
            .where(eq(wholesaleSizesTable.id, updates.wholesaleSizeId))
            .limit(1);

        if (!size) {
            res.status(404).json({ error: "Wholesale size not found" });
            return;
        }

        if (name === undefined) updates.name = size.name;
        if (unitDescription === undefined) updates.unitDescription = size.description || "";
        if (sizeCategory === undefined) updates.sizeCategory = size.sizeCategory || null;
    }

    const [updated] = await db
        .update(wholesaleProductsTable)
        .set(updates)
        .where(eq(wholesaleProductsTable.id, id))
        .returning();

    if (!updated) {
        res.status(404).json({ error: "Product not found" });
        return;
    }
    res.json(updated);
});

router.delete("/products/:id", async (req, res) => {
    const id = Number(req.params.id);
    const [deleted] = await db
        .delete(wholesaleProductsTable)
        .where(eq(wholesaleProductsTable.id, id))
        .returning();

    if (!deleted) {
        res.status(404).json({ error: "Product not found" });
        return;
    }
    res.json({ success: true });
});

// Bulk create products from pasted list
router.post("/products/bulk", async (req, res) => {
    const { products } = req.body;

    if (!Array.isArray(products) || products.length === 0) {
        res.status(400).json({ error: "products array is required and must not be empty" });
        return;
    }

    if (products.length > 200) {
        res.status(400).json({ error: "Maximum 200 products per bulk upload" });
        return;
    }

    // Validate each product
    const errors: string[] = [];
    for (let i = 0; i < products.length; i++) {
        const p = products[i];
        if (!p.flavourId || !p.name || p.priceCents === undefined) {
            errors.push(`Row ${i + 1}: flavourId, name, and priceCents are required`);
        }
        if (typeof p.priceCents !== "number" || p.priceCents < 0) {
            errors.push(`Row ${i + 1}: priceCents must be a non-negative number`);
        }
    }

    if (errors.length > 0) {
        res.status(400).json({ error: "Validation failed", details: errors });
        return;
    }

    // Verify all flavour IDs exist
    const flavourIds = [...new Set(products.map((p: any) => p.flavourId))];
    const existingFlavours = await db
        .select({ id: flavoursTable.id })
        .from(flavoursTable)
        .where(inArray(flavoursTable.id, flavourIds));
    const existingIds = new Set(existingFlavours.map((f) => f.id));
    const missingIds = flavourIds.filter((id) => !existingIds.has(id));
    if (missingIds.length > 0) {
        res.status(400).json({ error: `Invalid flavour IDs: ${missingIds.join(", ")}` });
        return;
    }

    const created = await db
        .insert(wholesaleProductsTable)
        .values(
            products.map((p: any) => ({
                flavourId: p.flavourId,
                wholesaleSizeId: p.wholesaleSizeId ? Number(p.wholesaleSizeId) : null,
                name: p.name,
                unitDescription: p.unitDescription || "",
                priceCents: p.priceCents,
                available: p.available !== false,
                sortOrder: p.sortOrder || 0,
                sizeCategory: p.sizeCategory || null,
            })),
        )
        .returning();

    res.status(201).json({ created: created.length, products: created });
});

// Bulk upsert flavour×size matrix cells
router.put("/products/matrix", async (req, res) => {
    const { cells } = req.body;

    if (!Array.isArray(cells) || cells.length === 0) {
        res.status(400).json({ error: "cells array is required" });
        return;
    }

    const results = [];
    for (const cell of cells) {
        const flavourId = Number(cell.flavourId);
        const wholesaleSizeId = Number(cell.wholesaleSizeId);
        if (!flavourId || !wholesaleSizeId) continue;

        const [size] = await db
            .select()
            .from(wholesaleSizesTable)
            .where(eq(wholesaleSizesTable.id, wholesaleSizeId))
            .limit(1);
        if (!size) continue;

        const priceCents = Math.max(0, Math.round(Number(cell.priceCents) || 0));
        const available = cell.available !== false;
        const manageStock = cell.manageStock === true;
        const stockQuantity = Number(cell.stockQuantity) || 0;
        const lowStockThreshold = Number(cell.lowStockThreshold) || 5;

        const [existing] = await db
            .select({ id: wholesaleProductsTable.id })
            .from(wholesaleProductsTable)
            .where(
                and(
                    eq(wholesaleProductsTable.flavourId, flavourId),
                    eq(wholesaleProductsTable.wholesaleSizeId, wholesaleSizeId),
                ),
            )
            .limit(1);

        if (existing) {
            if (cell.enabled === false) {
                await db
                    .update(wholesaleProductsTable)
                    .set({ available: false, updatedAt: new Date() })
                    .where(eq(wholesaleProductsTable.id, existing.id));
                continue;
            }
            const [updated] = await db
                .update(wholesaleProductsTable)
                .set({
                    priceCents,
                    available,
                    manageStock,
                    stockQuantity,
                    lowStockThreshold,
                    updatedAt: new Date(),
                })
                .where(eq(wholesaleProductsTable.id, existing.id))
                .returning();
            if (updated) results.push(updated);
        } else if (cell.enabled !== false && priceCents > 0) {
            const [created] = await db
                .insert(wholesaleProductsTable)
                .values({
                    flavourId,
                    wholesaleSizeId,
                    name: size.name,
                    unitDescription: size.description || "",
                    priceCents,
                    sizeCategory: size.sizeCategory,
                    available,
                    manageStock,
                    stockQuantity,
                    lowStockThreshold,
                })
                .returning();
            if (created) results.push(created);
        }
    }

    res.json({ updated: results.length, products: results });
});

// ═══════════════════════════════════════
// ── Wholesale Orders ──
// ═══════════════════════════════════════

router.post("/orders", async (req, res) => {
    const { wholesaleCustomerId, requestedDeliveryDate, deliveryMethod, adminNotes, items } = req.body;

    if (!wholesaleCustomerId) {
        res.status(400).json({ error: "wholesaleCustomerId is required" });
        return;
    }

    // Verify customer exists
    const [customer] = await db
        .select({ id: wholesaleCustomersTable.id, deliveryMethod: wholesaleCustomersTable.deliveryMethod })
        .from(wholesaleCustomersTable)
        .where(eq(wholesaleCustomersTable.id, Number(wholesaleCustomerId)))
        .limit(1);

    if (!customer) {
        res.status(404).json({ error: "Customer not found" });
        return;
    }

    const orderNumber = `WS-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

    // Calculate subtotal
    const subtotalCents = Array.isArray(items)
        ? items.reduce((sum: number, item: any) => sum + (item.unitPriceCents || 0) * (item.quantity || 1), 0)
        : 0;

    const [order] = await db
        .insert(wholesaleOrdersTable)
        .values({
            orderNumber,
            wholesaleCustomerId: Number(wholesaleCustomerId),
            status: "pending_review",
            requestedDeliveryDate: requestedDeliveryDate || undefined,
            deliveryMethod: deliveryMethod || customer.deliveryMethod,
            subtotalCents,
            adminNotes: adminNotes || "",
        })
        .returning();

    // Insert line items
    if (Array.isArray(items) && items.length > 0) {
        await db.insert(wholesaleOrderItemsTable).values(
            items.map((item: any) => ({
                wholesaleOrderId: order.id,
                wholesaleProductId: item.wholesaleProductId || null,
                flavourId: item.flavourId || null,
                productDescription: item.productDescription || "",
                quantity: item.quantity || 1,
                unitPriceCents: item.unitPriceCents || 0,
                matched: !!item.wholesaleProductId,
                notes: item.notes || "",
            })),
        );
    }

    res.status(201).json(order);
});

router.get("/orders/stats", async (_req, res) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [total] = await db.select({ count: count() }).from(wholesaleOrdersTable);
    const [pendingReview] = await db
        .select({ count: count() })
        .from(wholesaleOrdersTable)
        .where(eq(wholesaleOrdersTable.status, "pending_review"));
    const [confirmed] = await db
        .select({ count: count() })
        .from(wholesaleOrdersTable)
        .where(eq(wholesaleOrdersTable.status, "confirmed"));
    const [todayCount] = await db
        .select({ count: count() })
        .from(wholesaleOrdersTable)
        .where(gte(wholesaleOrdersTable.createdAt, today));
    const [awaitingDelivery] = await db
        .select({ count: count() })
        .from(wholesaleOrdersTable)
        .where(eq(wholesaleOrdersTable.status, "ready"));
    const [unpaidAwaitingDelivery] = await db
        .select({ count: count() })
        .from(wholesaleOrdersTable)
        .where(
            and(
                or(
                    eq(wholesaleOrdersTable.status, "ready"),
                    eq(wholesaleOrdersTable.status, "confirmed"),
                    eq(wholesaleOrdersTable.status, "in_production"),
                )!,
                sql`${wholesaleOrdersTable.paymentStatus} != 'paid'`,
            ),
        );
    const [rushOrders] = await db
        .select({ count: count() })
        .from(wholesaleOrdersTable)
        .where(
            and(
                eq(wholesaleOrdersTable.isRushOrder, true),
                sql`${wholesaleOrdersTable.status} NOT IN ('delivered', 'cancelled')`,
            ),
        );
    const [lowStockProducts] = await db
        .select({ count: count() })
        .from(wholesaleProductsTable)
        .where(
            and(
                eq(wholesaleProductsTable.manageStock, true),
                sql`${wholesaleProductsTable.stockQuantity} > 0`,
                sql`${wholesaleProductsTable.stockQuantity} <= ${wholesaleProductsTable.lowStockThreshold}`,
            ),
        );

    res.json({
        totalOrders: total.count,
        pendingReview: pendingReview.count,
        confirmedOrders: confirmed.count,
        todayOrders: todayCount.count,
        awaitingDelivery: awaitingDelivery.count,
        unpaidAwaitingDelivery: unpaidAwaitingDelivery.count,
        rushOrders: rushOrders.count,
        lowStockProducts: lowStockProducts.count,
    });
});

router.get("/orders", async (req, res) => {
    const status = req.query.status as string | undefined;
    const filter = req.query.filter as string | undefined;
    const customerId = req.query.customerId as string | undefined;
    const search = req.query.search as string | undefined;

    const conditions = [];
    if (filter === "awaiting_delivery") {
        conditions.push(eq(wholesaleOrdersTable.status, "ready"));
    } else if (filter === "unpaid_awaiting_delivery") {
        conditions.push(
            and(
                or(
                    eq(wholesaleOrdersTable.status, "ready"),
                    eq(wholesaleOrdersTable.status, "confirmed"),
                    eq(wholesaleOrdersTable.status, "in_production"),
                )!,
                sql`${wholesaleOrdersTable.paymentStatus} != 'paid'`,
            )!,
        );
    } else if (filter === "rush") {
        conditions.push(
            and(
                eq(wholesaleOrdersTable.isRushOrder, true),
                sql`${wholesaleOrdersTable.status} NOT IN ('delivered', 'cancelled')`,
            )!,
        );
    } else if (filter === "has_unmatched") {
        conditions.push(
            and(
                or(
                    eq(wholesaleOrdersTable.status, "pending_review"),
                    eq(wholesaleOrdersTable.status, "confirmed"),
                    eq(wholesaleOrdersTable.status, "in_production"),
                )!,
                sql`EXISTS (
                    SELECT 1 FROM wholesale_order_items
                    WHERE wholesale_order_id = ${wholesaleOrdersTable.id}
                    AND matched = false
                )`,
            )!,
        );
    } else if (status && status !== "all") {
        conditions.push(eq(wholesaleOrdersTable.status, status as any));
    }
    if (customerId) conditions.push(eq(wholesaleOrdersTable.wholesaleCustomerId, Number(customerId)));
    if (search) {
        conditions.push(
            or(
                ilike(wholesaleOrdersTable.orderNumber, `%${search}%`),
                ilike(wholesaleOrdersTable.originalEmailSubject, `%${search}%`),
            )!,
        );
    }

    const orders = await db
        .select({
            id: wholesaleOrdersTable.id,
            orderNumber: wholesaleOrdersTable.orderNumber,
            wholesaleCustomerId: wholesaleOrdersTable.wholesaleCustomerId,
            customerName: wholesaleCustomersTable.businessName,
            status: wholesaleOrdersTable.status,
            requestedDeliveryDate: wholesaleOrdersTable.requestedDeliveryDate,
            confirmedDeliveryDate: wholesaleOrdersTable.confirmedDeliveryDate,
            deliveryMethod: wholesaleOrdersTable.deliveryMethod,
            subtotalCents: wholesaleOrdersTable.subtotalCents,
            aiParseConfidence: wholesaleOrdersTable.aiParseConfidence,
            aiParseNotes: wholesaleOrdersTable.aiParseNotes,
            paymentStatus: wholesaleOrdersTable.paymentStatus,
            paymentMethod: wholesaleOrdersTable.paymentMethod,
            isRushOrder: wholesaleOrdersTable.isRushOrder,
            rushNotes: wholesaleOrdersTable.rushNotes,
            originalEmailSubject: wholesaleOrdersTable.originalEmailSubject,
            createdAt: wholesaleOrdersTable.createdAt,
        })
        .from(wholesaleOrdersTable)
        .innerJoin(
            wholesaleCustomersTable,
            eq(
                wholesaleOrdersTable.wholesaleCustomerId,
                wholesaleCustomersTable.id,
            ),
        )
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(wholesaleOrdersTable.createdAt));

    res.json(orders);
});

router.get("/orders/:id", async (req, res) => {
    const id = Number(req.params.id);

    const [order] = await db
        .select({
            id: wholesaleOrdersTable.id,
            orderNumber: wholesaleOrdersTable.orderNumber,
            wholesaleCustomerId: wholesaleOrdersTable.wholesaleCustomerId,
            customerName: wholesaleCustomersTable.businessName,
            customerEmail: wholesaleCustomersTable.email,
            customerContactName: wholesaleCustomersTable.contactName,
            status: wholesaleOrdersTable.status,
            requestedDeliveryDate: wholesaleOrdersTable.requestedDeliveryDate,
            confirmedDeliveryDate: wholesaleOrdersTable.confirmedDeliveryDate,
            deliveryMethod: wholesaleOrdersTable.deliveryMethod,
            subtotalCents: wholesaleOrdersTable.subtotalCents,
            adminNotes: wholesaleOrdersTable.adminNotes,
            originalEmailSubject: wholesaleOrdersTable.originalEmailSubject,
            originalEmailBody: wholesaleOrdersTable.originalEmailBody,
            aiParseConfidence: wholesaleOrdersTable.aiParseConfidence,
            aiParseNotes: wholesaleOrdersTable.aiParseNotes,
            paymentStatus: wholesaleOrdersTable.paymentStatus,
            paymentMethod: wholesaleOrdersTable.paymentMethod,
            paymentNotes: wholesaleOrdersTable.paymentNotes,
            squareInvoiceId: wholesaleOrdersTable.squareInvoiceId,
            squareInvoicePublicUrl: wholesaleOrdersTable.squareInvoicePublicUrl,
            isRushOrder: wholesaleOrdersTable.isRushOrder,
            rushNotes: wholesaleOrdersTable.rushNotes,
            vendorLocationId: wholesaleOrdersTable.vendorLocationId,
            paidAt: wholesaleOrdersTable.paidAt,
            createdAt: wholesaleOrdersTable.createdAt,
            updatedAt: wholesaleOrdersTable.updatedAt,
        })
        .from(wholesaleOrdersTable)
        .innerJoin(
            wholesaleCustomersTable,
            eq(
                wholesaleOrdersTable.wholesaleCustomerId,
                wholesaleCustomersTable.id,
            ),
        )
        .where(eq(wholesaleOrdersTable.id, id))
        .limit(1);

    if (!order) {
        res.status(404).json({ error: "Order not found" });
        return;
    }

    // Get line items with product/flavour info
    const items = await db
        .select({
            id: wholesaleOrderItemsTable.id,
            wholesaleProductId: wholesaleOrderItemsTable.wholesaleProductId,
            flavourId: wholesaleOrderItemsTable.flavourId,
            productDescription: wholesaleOrderItemsTable.productDescription,
            quantity: wholesaleOrderItemsTable.quantity,
            unitPriceCents: wholesaleOrderItemsTable.unitPriceCents,
            matched: wholesaleOrderItemsTable.matched,
            notes: wholesaleOrderItemsTable.notes,
        })
        .from(wholesaleOrderItemsTable)
        .where(eq(wholesaleOrderItemsTable.wholesaleOrderId, id));

    res.json({ ...order, items });
});

// Update order (edit parsed items, delivery date, notes)
router.put("/orders/:id", async (req, res) => {
    const id = Number(req.params.id);
    const { confirmedDeliveryDate, deliveryMethod, adminNotes, items } = req.body;

    const updates: Record<string, any> = { updatedAt: new Date() };
    if (confirmedDeliveryDate !== undefined) updates.confirmedDeliveryDate = confirmedDeliveryDate;
    if (deliveryMethod !== undefined) updates.deliveryMethod = deliveryMethod;
    if (adminNotes !== undefined) updates.adminNotes = adminNotes;

    // Update order
    const [updated] = await db
        .update(wholesaleOrdersTable)
        .set(updates)
        .where(eq(wholesaleOrdersTable.id, id))
        .returning();

    if (!updated) {
        res.status(404).json({ error: "Order not found" });
        return;
    }

    // If items are provided, replace all line items
    if (Array.isArray(items)) {
        await db
            .delete(wholesaleOrderItemsTable)
            .where(eq(wholesaleOrderItemsTable.wholesaleOrderId, id));

        if (items.length > 0) {
            await db.insert(wholesaleOrderItemsTable).values(
                items.map((item: any) => ({
                    wholesaleOrderId: id,
                    wholesaleProductId: item.wholesaleProductId || null,
                    flavourId: item.flavourId || null,
                    productDescription: item.productDescription || "",
                    quantity: item.quantity || 1,
                    unitPriceCents: item.unitPriceCents || 0,
                    matched: !!item.wholesaleProductId,
                    notes: item.notes || "",
                })),
            );
        }

        // Recalculate subtotal
        const subtotalCents = items.reduce(
            (sum: number, item: any) => sum + (item.unitPriceCents || 0) * (item.quantity || 1),
            0,
        );
        await db
            .update(wholesaleOrdersTable)
            .set({ subtotalCents })
            .where(eq(wholesaleOrdersTable.id, id));
    }

    res.json(updated);
});

// Confirm order
router.put("/orders/:id/confirm", async (req, res) => {
    const id = Number(req.params.id);
    const { confirmedDeliveryDate } = req.body;

    const [order] = await db
        .select({
            id: wholesaleOrdersTable.id,
            orderNumber: wholesaleOrdersTable.orderNumber,
            wholesaleCustomerId: wholesaleOrdersTable.wholesaleCustomerId,
            customerEmail: wholesaleCustomersTable.email,
            customerContactName: wholesaleCustomersTable.contactName,
            customerBusinessName: wholesaleCustomersTable.businessName,
        })
        .from(wholesaleOrdersTable)
        .innerJoin(
            wholesaleCustomersTable,
            eq(
                wholesaleOrdersTable.wholesaleCustomerId,
                wholesaleCustomersTable.id,
            ),
        )
        .where(eq(wholesaleOrdersTable.id, id))
        .limit(1);

    if (!order) {
        res.status(404).json({ error: "Order not found" });
        return;
    }

    const [updated] = await db
        .update(wholesaleOrdersTable)
        .set({
            status: "confirmed",
            confirmedDeliveryDate: confirmedDeliveryDate || undefined,
            updatedAt: new Date(),
        })
        .where(eq(wholesaleOrdersTable.id, id))
        .returning();

    await decrementWholesaleStockForOrder(id);

    // Get items for confirmation email
    const items = await db
        .select({
            productDescription: wholesaleOrderItemsTable.productDescription,
            quantity: wholesaleOrderItemsTable.quantity,
        })
        .from(wholesaleOrderItemsTable)
        .where(eq(wholesaleOrderItemsTable.wholesaleOrderId, id));

    // Send confirmation email to customer
    sendWholesaleOrderConfirmed({
        to: order.customerEmail,
        customerName:
            order.customerContactName || order.customerBusinessName,
        orderNumber: order.orderNumber,
        deliveryDate:
            confirmedDeliveryDate ||
            updated.requestedDeliveryDate ||
            "TBD",
        items: items.map((i) => ({
            description: i.productDescription,
            quantity: i.quantity,
        })),
    }).catch((e) => console.error("[WHOLESALE] Failed to send order confirmation email:", e));

    res.json(updated);
});

// Update order status
router.put("/orders/:id/status", async (req, res) => {
    const id = Number(req.params.id);
    const { status } = req.body;

    const valid = [
        "pending_review",
        "confirmed",
        "in_production",
        "ready",
        "delivered",
        "cancelled",
    ];
    if (!valid.includes(status)) {
        res.status(400).json({ error: "Invalid status" });
        return;
    }

    const [updated] = await db
        .update(wholesaleOrdersTable)
        .set({ status, updatedAt: new Date() })
        .where(eq(wholesaleOrdersTable.id, id))
        .returning();

    if (!updated) {
        res.status(404).json({ error: "Order not found" });
        return;
    }
    res.json(updated);
});

// Record payment for a wholesale order
router.put("/orders/:id/payment", async (req, res) => {
    const id = Number(req.params.id);
    const { paymentStatus, paymentMethod, paymentNotes } = req.body;

    const validStatuses = ["unpaid", "invoiced", "paid", "partial"];
    if (paymentStatus && !validStatuses.includes(paymentStatus)) {
        res.status(400).json({ error: "Invalid payment status" });
        return;
    }

    const updates: Record<string, any> = { updatedAt: new Date() };
    if (paymentStatus !== undefined) updates.paymentStatus = paymentStatus;
    if (paymentMethod !== undefined) updates.paymentMethod = paymentMethod;
    if (paymentNotes !== undefined) updates.paymentNotes = paymentNotes;
    if (paymentStatus === "paid") updates.paidAt = new Date();

    const [updated] = await db
        .update(wholesaleOrdersTable)
        .set(updates)
        .where(eq(wholesaleOrdersTable.id, id))
        .returning();

    if (!updated) {
        res.status(404).json({ error: "Order not found" });
        return;
    }
    res.json(updated);
});

// Send Square invoice for a wholesale order
router.post("/orders/:id/send-invoice", async (req, res) => {
    const id = Number(req.params.id);

    // Fetch full order with customer info and items
    const [order] = await db
        .select({
            id: wholesaleOrdersTable.id,
            orderNumber: wholesaleOrdersTable.orderNumber,
            paymentStatus: wholesaleOrdersTable.paymentStatus,
            squareInvoiceId: wholesaleOrdersTable.squareInvoiceId,
            confirmedDeliveryDate: wholesaleOrdersTable.confirmedDeliveryDate,
            customerEmail: wholesaleCustomersTable.email,
            customerContactName: wholesaleCustomersTable.contactName,
            customerBusinessName: wholesaleCustomersTable.businessName,
        })
        .from(wholesaleOrdersTable)
        .innerJoin(wholesaleCustomersTable, eq(wholesaleOrdersTable.wholesaleCustomerId, wholesaleCustomersTable.id))
        .where(eq(wholesaleOrdersTable.id, id))
        .limit(1);

    if (!order) {
        res.status(404).json({ error: "Order not found" });
        return;
    }

    if (order.squareInvoiceId) {
        res.status(409).json({ error: "An invoice has already been sent for this order", squareInvoiceId: order.squareInvoiceId });
        return;
    }

    const items = await db
        .select({
            productDescription: wholesaleOrderItemsTable.productDescription,
            quantity: wholesaleOrderItemsTable.quantity,
            unitPriceCents: wholesaleOrderItemsTable.unitPriceCents,
        })
        .from(wholesaleOrderItemsTable)
        .where(eq(wholesaleOrderItemsTable.wholesaleOrderId, id));

    const billableItems = items.filter((i) => i.unitPriceCents > 0);
    if (billableItems.length === 0) {
        res.status(400).json({ error: "Order has no priced items — cannot create invoice" });
        return;
    }

    try {
        const { squareOrderId, squareInvoiceId, publicUrl } = await createAndPublishWholesaleInvoice({
            orderNumber: order.orderNumber,
            customerEmail: order.customerEmail,
            customerName: order.customerContactName || order.customerBusinessName,
            items: billableItems.map((i) => ({
                description: i.productDescription,
                quantity: i.quantity,
                unitPriceCents: i.unitPriceCents,
            })),
            dueDate: order.confirmedDeliveryDate ?? null,
        });

        const [updated] = await db
            .update(wholesaleOrdersTable)
            .set({
                squareInvoiceId,
                squareInvoicePublicUrl: publicUrl,
                paymentStatus: "invoiced",
                paymentMethod: "square_invoice",
                updatedAt: new Date(),
            })
            .where(eq(wholesaleOrdersTable.id, id))
            .returning();

        res.json({ ...updated, squareOrderId, publicUrl });
    } catch (e: any) {
        console.error("[WHOLESALE] Failed to create Square invoice:", e?.message || e);
        res.status(502).json({ error: e?.message || "Failed to create Square invoice" });
    }
});

// Void/cancel a Square invoice so a new one can be issued
router.post("/orders/:id/void-invoice", async (req, res) => {
    const id = Number(req.params.id);

    const [order] = await db
        .select({
            id: wholesaleOrdersTable.id,
            squareInvoiceId: wholesaleOrdersTable.squareInvoiceId,
            paymentStatus: wholesaleOrdersTable.paymentStatus,
        })
        .from(wholesaleOrdersTable)
        .where(eq(wholesaleOrdersTable.id, id))
        .limit(1);

    if (!order) {
        res.status(404).json({ error: "Order not found" });
        return;
    }

    if (!order.squareInvoiceId) {
        res.status(400).json({ error: "No Square invoice on this order" });
        return;
    }

    if (order.paymentStatus === "paid") {
        res.status(400).json({ error: "Cannot void invoice — order is already paid" });
        return;
    }

    try {
        await cancelWholesaleInvoice(order.squareInvoiceId);

        const [updated] = await db
            .update(wholesaleOrdersTable)
            .set({
                squareInvoiceId: null,
                squareInvoicePublicUrl: null,
                paymentStatus: "unpaid",
                paymentMethod: null,
                updatedAt: new Date(),
            })
            .where(eq(wholesaleOrdersTable.id, id))
            .returning();

        res.json(updated);
    } catch (e: any) {
        console.error("[WHOLESALE] Failed to void Square invoice:", e?.message || e);
        res.status(502).json({ error: e?.message || "Failed to void Square invoice" });
    }
});

// Start production on an order
router.put("/orders/:id/production/start", async (req, res) => {
    const id = Number(req.params.id);

    const [updated] = await db
        .update(wholesaleOrdersTable)
        .set({
            status: "in_production",
            productionStartedAt: new Date(),
            updatedAt: new Date(),
        })
        .where(eq(wholesaleOrdersTable.id, id))
        .returning();

    if (!updated) {
        res.status(404).json({ error: "Order not found" });
        return;
    }
    res.json(updated);
});

// Complete production on an order
router.put("/orders/:id/production/complete", async (req, res) => {
    const id = Number(req.params.id);

    const [updated] = await db
        .update(wholesaleOrdersTable)
        .set({
            status: "ready",
            productionCompletedAt: new Date(),
            updatedAt: new Date(),
        })
        .where(eq(wholesaleOrdersTable.id, id))
        .returning();

    if (!updated) {
        res.status(404).json({ error: "Order not found" });
        return;
    }
    res.json(updated);
});

// ═══════════════════════════════════════
// ── Email Log ──
// ═══════════════════════════════════════

router.get("/email-log", async (req, res) => {
    const status = req.query.status as string | undefined;

    const conditions = [];
    if (status) conditions.push(eq(wholesaleEmailLogTable.processingStatus, status as any));

    const logs = await db
        .select()
        .from(wholesaleEmailLogTable)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(wholesaleEmailLogTable.createdAt))
        .limit(100);

    res.json(logs);
});

// ═══════════════════════════════════════
// ── Production Report ──
// ═══════════════════════════════════════

router.get("/production-report", async (req, res) => {
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;

    const conditions = [
        or(
            eq(wholesaleOrdersTable.status, "confirmed"),
            eq(wholesaleOrdersTable.status, "in_production"),
        )!,
    ];

    if (from) {
        conditions.push(
            gte(wholesaleOrdersTable.confirmedDeliveryDate, from),
        );
    }
    if (to) {
        conditions.push(
            lte(wholesaleOrdersTable.confirmedDeliveryDate, to),
        );
    }

    // Aggregate items across all confirmed orders in the date range
    const report = await db
        .select({
            flavourName: flavoursTable.name,
            productName: wholesaleProductsTable.name,
            totalQuantity: sum(wholesaleOrderItemsTable.quantity),
            orderCount: count(wholesaleOrderItemsTable.id),
        })
        .from(wholesaleOrderItemsTable)
        .innerJoin(
            wholesaleOrdersTable,
            eq(
                wholesaleOrderItemsTable.wholesaleOrderId,
                wholesaleOrdersTable.id,
            ),
        )
        .leftJoin(
            wholesaleProductsTable,
            eq(
                wholesaleOrderItemsTable.wholesaleProductId,
                wholesaleProductsTable.id,
            ),
        )
        .leftJoin(
            flavoursTable,
            eq(wholesaleOrderItemsTable.flavourId, flavoursTable.id),
        )
        .where(and(...conditions))
        .groupBy(flavoursTable.name, wholesaleProductsTable.name);

    res.json(report);
});

// Delivery schedule
router.get("/delivery-schedule", async (req, res) => {
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;

    const conditions = [
        or(
            eq(wholesaleOrdersTable.status, "confirmed"),
            eq(wholesaleOrdersTable.status, "in_production"),
            eq(wholesaleOrdersTable.status, "ready"),
        )!,
    ];

    if (from) {
        conditions.push(
            gte(wholesaleOrdersTable.confirmedDeliveryDate, from),
        );
    }
    if (to) {
        conditions.push(
            lte(wholesaleOrdersTable.confirmedDeliveryDate, to),
        );
    }

    const schedule = await db
        .select({
            id: wholesaleOrdersTable.id,
            orderNumber: wholesaleOrdersTable.orderNumber,
            customerName: wholesaleCustomersTable.businessName,
            customerAddress: wholesaleCustomersTable.address,
            customerCity: wholesaleCustomersTable.city,
            deliveryMethod: wholesaleOrdersTable.deliveryMethod,
            confirmedDeliveryDate: wholesaleOrdersTable.confirmedDeliveryDate,
            status: wholesaleOrdersTable.status,
        })
        .from(wholesaleOrdersTable)
        .innerJoin(
            wholesaleCustomersTable,
            eq(
                wholesaleOrdersTable.wholesaleCustomerId,
                wholesaleCustomersTable.id,
            ),
        )
        .where(and(...conditions))
        .orderBy(wholesaleOrdersTable.confirmedDeliveryDate);

    res.json(schedule);
});

// ═══════════════════════════════════════
// ── Dashboard Summary ──
// ═══════════════════════════════════════

router.get("/dashboard", async (req, res) => {
    const scope = (req.query.scope as string) || "week";
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const weekLater = new Date(today);
    weekLater.setDate(weekLater.getDate() + 7);
    const twoWeeksAgo = new Date(today);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 13);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const todayStr = today.toISOString().slice(0, 10);
    const weekStr = weekLater.toISOString().slice(0, 10);
    const twoWeeksStr = twoWeeksAgo.toISOString().slice(0, 10);
    const monthStartStr = monthStart.toISOString().slice(0, 10);

    const scopeEndStr =
        scope === "today" ? todayStr : scope === "month" ? weekStr : weekStr;
    const scopeStartStr =
        scope === "today" ? todayStr : scope === "month" ? monthStartStr : todayStr;

    const activeOrderStatuses = or(
        eq(wholesaleOrdersTable.status, "pending_review"),
        eq(wholesaleOrdersTable.status, "confirmed"),
        eq(wholesaleOrdersTable.status, "in_production"),
        eq(wholesaleOrdersTable.status, "ready"),
    )!;

    const fulfillmentStatuses = or(
        eq(wholesaleOrdersTable.status, "confirmed"),
        eq(wholesaleOrdersTable.status, "in_production"),
        eq(wholesaleOrdersTable.status, "ready"),
    )!;

    const statusCounts = await db
        .select({ status: wholesaleOrdersTable.status, count: count() })
        .from(wholesaleOrdersTable)
        .groupBy(wholesaleOrdersTable.status);

    const statusMap: Record<string, number> = {};
    statusCounts.forEach((s) => {
        statusMap[s.status] = Number(s.count);
    });

    const activePipeline = {
        pending_review: statusMap.pending_review || 0,
        confirmed: statusMap.confirmed || 0,
        in_production: statusMap.in_production || 0,
        ready: statusMap.ready || 0,
    };

    const [totalOrders] = await db.select({ count: count() }).from(wholesaleOrdersTable);
    const [todayOrders] = await db
        .select({ count: count() })
        .from(wholesaleOrdersTable)
        .where(gte(wholesaleOrdersTable.createdAt, today));
    const [awaitingDelivery] = await db
        .select({ count: count() })
        .from(wholesaleOrdersTable)
        .where(eq(wholesaleOrdersTable.status, "ready"));
    const [unpaidAwaitingDelivery] = await db
        .select({ count: count() })
        .from(wholesaleOrdersTable)
        .where(
            and(fulfillmentStatuses, sql`${wholesaleOrdersTable.paymentStatus} != 'paid'`),
        );

    const [deliveriesThisWeek] = await db
        .select({ count: count() })
        .from(wholesaleOrdersTable)
        .where(
            and(
                fulfillmentStatuses,
                gte(wholesaleOrdersTable.confirmedDeliveryDate, todayStr),
                lte(wholesaleOrdersTable.confirmedDeliveryDate, weekStr),
            ),
        );

    const [unmatchedItems] = await db
        .select({ count: count() })
        .from(wholesaleOrderItemsTable)
        .innerJoin(
            wholesaleOrdersTable,
            eq(wholesaleOrderItemsTable.wholesaleOrderId, wholesaleOrdersTable.id),
        )
        .where(
            and(
                eq(wholesaleOrderItemsTable.matched, false),
                or(
                    eq(wholesaleOrdersTable.status, "pending_review"),
                    eq(wholesaleOrdersTable.status, "confirmed"),
                    eq(wholesaleOrdersTable.status, "in_production"),
                )!,
            ),
        );

    const [totalActiveItems] = await db
        .select({ count: count() })
        .from(wholesaleOrderItemsTable)
        .innerJoin(
            wholesaleOrdersTable,
            eq(wholesaleOrderItemsTable.wholesaleOrderId, wholesaleOrdersTable.id),
        )
        .where(
            or(
                eq(wholesaleOrdersTable.status, "pending_review"),
                eq(wholesaleOrdersTable.status, "confirmed"),
                eq(wholesaleOrdersTable.status, "in_production"),
            )!,
        );

    const unmatchedItemRate =
        Number(totalActiveItems?.count || 0) > 0
            ? Number(unmatchedItems?.count || 0) / Number(totalActiveItems.count)
            : 0;

    const pendingOrders = await db
        .select({ createdAt: wholesaleOrdersTable.createdAt })
        .from(wholesaleOrdersTable)
        .where(eq(wholesaleOrdersTable.status, "pending_review"))
        .orderBy(asc(wholesaleOrdersTable.createdAt))
        .limit(1);

    const pendingReviewOldestHours = pendingOrders[0]
        ? Math.round((now.getTime() - pendingOrders[0].createdAt.getTime()) / 3_600_000)
        : 0;

    const [revenueScope] = await db
        .select({ total: sum(wholesaleOrdersTable.subtotalCents) })
        .from(wholesaleOrdersTable)
        .where(
            and(
                gte(wholesaleOrdersTable.confirmedDeliveryDate, scopeStartStr),
                lte(wholesaleOrdersTable.confirmedDeliveryDate, scopeEndStr),
                sql`${wholesaleOrdersTable.status} NOT IN ('cancelled')`,
            ),
        );

    const [revenueMonth] = await db
        .select({ total: sum(wholesaleOrdersTable.subtotalCents) })
        .from(wholesaleOrdersTable)
        .where(
            and(
                gte(wholesaleOrdersTable.confirmedDeliveryDate, monthStartStr),
                sql`${wholesaleOrdersTable.status} NOT IN ('cancelled')`,
            ),
        );

    const ordersByDayRows = await db
        .select({
            day: sql<string>`to_char(${wholesaleOrdersTable.createdAt}, 'YYYY-MM-DD')`.as("day"),
            count: count(),
        })
        .from(wholesaleOrdersTable)
        .where(gte(wholesaleOrdersTable.createdAt, twoWeeksAgo))
        .groupBy(sql`to_char(${wholesaleOrdersTable.createdAt}, 'YYYY-MM-DD')`)
        .orderBy(sql`to_char(${wholesaleOrdersTable.createdAt}, 'YYYY-MM-DD')`);

    const ordersByDayMap = new Map(
        ordersByDayRows.map((r) => [r.day, Number(r.count)]),
    );
    const ordersByDay: { date: string; count: number }[] = [];
    for (let i = 13; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        ordersByDay.push({ date: key, count: ordersByDayMap.get(key) || 0 });
    }

    const topCustomers = await db
        .select({
            customerId: wholesaleCustomersTable.id,
            businessName: wholesaleCustomersTable.businessName,
            orderCount: count(),
            totalCents: sum(wholesaleOrdersTable.subtotalCents),
        })
        .from(wholesaleOrdersTable)
        .innerJoin(
            wholesaleCustomersTable,
            eq(wholesaleOrdersTable.wholesaleCustomerId, wholesaleCustomersTable.id),
        )
        .where(
            and(
                gte(wholesaleOrdersTable.createdAt, new Date(today.getTime() - 30 * 24 * 3_600_000)),
                sql`${wholesaleOrdersTable.status} NOT IN ('cancelled')`,
            ),
        )
        .groupBy(wholesaleCustomersTable.id, wholesaleCustomersTable.businessName)
        .orderBy(desc(count()))
        .limit(5);

    const productionByFlavour = await db
        .select({
            flavourName: flavoursTable.name,
            totalQuantity: sum(wholesaleOrderItemsTable.quantity),
        })
        .from(wholesaleOrderItemsTable)
        .innerJoin(
            wholesaleOrdersTable,
            eq(wholesaleOrderItemsTable.wholesaleOrderId, wholesaleOrdersTable.id),
        )
        .leftJoin(flavoursTable, eq(wholesaleOrderItemsTable.flavourId, flavoursTable.id))
        .where(
            and(
                or(
                    eq(wholesaleOrdersTable.status, "confirmed"),
                    eq(wholesaleOrdersTable.status, "in_production"),
                )!,
                gte(wholesaleOrdersTable.confirmedDeliveryDate, todayStr),
                lte(wholesaleOrdersTable.confirmedDeliveryDate, weekStr),
            ),
        )
        .groupBy(flavoursTable.name);

    const productionByProduct = await db
        .select({
            flavourName: flavoursTable.name,
            productName: wholesaleProductsTable.name,
            totalQuantity: sum(wholesaleOrderItemsTable.quantity),
        })
        .from(wholesaleOrderItemsTable)
        .innerJoin(
            wholesaleOrdersTable,
            eq(wholesaleOrderItemsTable.wholesaleOrderId, wholesaleOrdersTable.id),
        )
        .leftJoin(
            wholesaleProductsTable,
            eq(wholesaleOrderItemsTable.wholesaleProductId, wholesaleProductsTable.id),
        )
        .leftJoin(flavoursTable, eq(wholesaleOrderItemsTable.flavourId, flavoursTable.id))
        .where(
            and(
                or(
                    eq(wholesaleOrdersTable.status, "confirmed"),
                    eq(wholesaleOrdersTable.status, "in_production"),
                )!,
                gte(wholesaleOrdersTable.confirmedDeliveryDate, todayStr),
                lte(wholesaleOrdersTable.confirmedDeliveryDate, weekStr),
            ),
        )
        .groupBy(flavoursTable.name, wholesaleProductsTable.name)
        .orderBy(desc(sum(wholesaleOrderItemsTable.quantity)))
        .limit(10);

    const upcomingDeliveries = await db
        .select({
            id: wholesaleOrdersTable.id,
            orderNumber: wholesaleOrdersTable.orderNumber,
            customerName: wholesaleCustomersTable.businessName,
            customerCity: wholesaleCustomersTable.city,
            confirmedDeliveryDate: wholesaleOrdersTable.confirmedDeliveryDate,
            status: wholesaleOrdersTable.status,
            deliveryMethod: wholesaleOrdersTable.deliveryMethod,
            paymentStatus: wholesaleOrdersTable.paymentStatus,
            subtotalCents: wholesaleOrdersTable.subtotalCents,
            hasUnmatchedItems: sql<boolean>`EXISTS (
                SELECT 1 FROM wholesale_order_items
                WHERE wholesale_order_id = ${wholesaleOrdersTable.id}
                AND matched = false
            )`.as("has_unmatched_items"),
        })
        .from(wholesaleOrdersTable)
        .innerJoin(
            wholesaleCustomersTable,
            eq(wholesaleOrdersTable.wholesaleCustomerId, wholesaleCustomersTable.id),
        )
        .where(and(fulfillmentStatuses, gte(wholesaleOrdersTable.confirmedDeliveryDate, todayStr)))
        .orderBy(asc(wholesaleOrdersTable.confirmedDeliveryDate))
        .limit(15);

    const attentionCandidates = await db
        .select({
            id: wholesaleOrdersTable.id,
            orderNumber: wholesaleOrdersTable.orderNumber,
            customerName: wholesaleCustomersTable.businessName,
            status: wholesaleOrdersTable.status,
            aiParseConfidence: wholesaleOrdersTable.aiParseConfidence,
            createdAt: wholesaleOrdersTable.createdAt,
            paymentStatus: wholesaleOrdersTable.paymentStatus,
            unmatchedCount: sql<number>`(
                SELECT count(*)::int FROM wholesale_order_items
                WHERE wholesale_order_id = ${wholesaleOrdersTable.id}
                AND matched = false
            )`.as("unmatched_count"),
        })
        .from(wholesaleOrdersTable)
        .innerJoin(
            wholesaleCustomersTable,
            eq(wholesaleOrdersTable.wholesaleCustomerId, wholesaleCustomersTable.id),
        )
        .where(
            or(
                eq(wholesaleOrdersTable.status, "pending_review"),
                and(
                    fulfillmentStatuses,
                    sql`${wholesaleOrdersTable.paymentStatus} != 'paid'`,
                )!,
                sql`EXISTS (
                    SELECT 1 FROM wholesale_order_items
                    WHERE wholesale_order_id = ${wholesaleOrdersTable.id}
                    AND matched = false
                )`,
            )!,
        )
        .orderBy(asc(wholesaleOrdersTable.createdAt))
        .limit(40);

    type AttentionReason = "pending_review" | "unmatched_items" | "unpaid" | "low_confidence";
    const needsAttention = attentionCandidates
        .map((o) => {
            const reasons: AttentionReason[] = [];
            if (o.status === "pending_review") reasons.push("pending_review");
            if (Number(o.unmatchedCount) > 0) reasons.push("unmatched_items");
            if (
                ["confirmed", "in_production", "ready"].includes(o.status) &&
                o.paymentStatus !== "paid"
            ) {
                reasons.push("unpaid");
            }
            if (o.aiParseConfidence !== null && o.aiParseConfidence < 0.7) {
                reasons.push("low_confidence");
            }
            const priority =
                (o.status === "pending_review" ? 100 : 0) +
                (Number(o.unmatchedCount) > 0 ? 50 : 0) +
                (o.paymentStatus !== "paid" && o.status === "ready" ? 40 : 0) +
                (o.aiParseConfidence !== null && o.aiParseConfidence < 0.7 ? 30 : 0) +
                Math.min(24, Math.round((now.getTime() - o.createdAt.getTime()) / 3_600_000));

            return {
                id: o.id,
                orderNumber: o.orderNumber,
                customerName: o.customerName,
                status: o.status,
                reasons,
                priority,
                aiParseConfidence: o.aiParseConfidence,
                createdAt: o.createdAt,
                paymentStatus: o.paymentStatus,
                unmatchedCount: Number(o.unmatchedCount),
            };
        })
        .filter((o) => o.reasons.length > 0)
        .sort((a, b) => b.priority - a.priority)
        .slice(0, 15);

    res.json({
        lastUpdatedAt: new Date().toISOString(),
        scope,
        statusCounts: statusMap,
        activePipeline,
        totalOrders: Number(totalOrders?.count || 0),
        pendingReview: statusMap.pending_review || 0,
        confirmedOrders: statusMap.confirmed || 0,
        todayOrders: Number(todayOrders?.count || 0),
        awaitingDelivery: Number(awaitingDelivery?.count || 0),
        unpaidAwaitingDelivery: Number(unpaidAwaitingDelivery?.count || 0),
        deliveriesThisWeek: Number(deliveriesThisWeek?.count || 0),
        unmatchedItems: Number(unmatchedItems?.count || 0),
        unmatchedItemRate,
        pendingReviewOldestHours,
        revenueScopeCents: Number(revenueScope?.total || 0),
        revenueMonthCents: Number(revenueMonth?.total || 0),
        ordersByDay,
        topCustomers: topCustomers.map((c) => ({
            customerId: c.customerId,
            businessName: c.businessName,
            orderCount: Number(c.orderCount),
            totalCents: Number(c.totalCents || 0),
        })),
        productionByFlavour,
        productionByProduct,
        upcomingDeliveries,
        needsAttention,
    });
});

// ═══════════════════════════════════════
// ── Delivery Runs ──
// ═══════════════════════════════════════

// List delivery runs
router.get("/delivery-runs", async (req, res) => {
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;

    const conditions: any[] = [];
    if (from) conditions.push(gte(wholesaleDeliveryRunsTable.scheduledDate, from));
    if (to) conditions.push(lte(wholesaleDeliveryRunsTable.scheduledDate, to));

    const runs = await db
        .select({
            id: wholesaleDeliveryRunsTable.id,
            name: wholesaleDeliveryRunsTable.name,
            scheduledDate: wholesaleDeliveryRunsTable.scheduledDate,
            driverName: wholesaleDeliveryRunsTable.driverName,
            vehicleNotes: wholesaleDeliveryRunsTable.vehicleNotes,
            status: wholesaleDeliveryRunsTable.status,
            notes: wholesaleDeliveryRunsTable.notes,
            createdAt: wholesaleDeliveryRunsTable.createdAt,
            stopCount: sql<number>`(SELECT count(*) FROM wholesale_delivery_run_stops WHERE delivery_run_id = ${wholesaleDeliveryRunsTable.id})`.as("stop_count"),
        })
        .from(wholesaleDeliveryRunsTable)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(asc(wholesaleDeliveryRunsTable.scheduledDate));

    res.json(runs);
});

// Create delivery run
router.post("/delivery-runs", async (req, res) => {
    const { name, scheduledDate, driverName, driverEmail, vehicleNotes, notes } = req.body;

    if (!name || !scheduledDate) {
        res.status(400).json({ error: "name and scheduledDate are required" });
        return;
    }

    const [run] = await db
        .insert(wholesaleDeliveryRunsTable)
        .values({
            name,
            scheduledDate,
            driverName: driverName || "",
            driverEmail: driverEmail || "",
            vehicleNotes: vehicleNotes || "",
            notes: notes || "",
            driverToken: crypto.randomBytes(24).toString("hex"),
        })
        .returning();

    // Send assignment email to driver
    if (run.driverEmail) {
        sendDeliveryRunAssignment({
            to: run.driverEmail,
            driverName: run.driverName,
            runName: run.name,
            scheduledDate: run.scheduledDate,
            vehicleNotes: run.vehicleNotes,
            notes: run.notes,
        }).catch((e) => console.error("[EMAIL] Delivery run assignment failed:", e));
    }

    res.status(201).json(run);
});

// Get delivery run detail with stops
router.get("/delivery-runs/:id", async (req, res) => {
    const id = Number(req.params.id);

    const [run] = await db
        .select()
        .from(wholesaleDeliveryRunsTable)
        .where(eq(wholesaleDeliveryRunsTable.id, id))
        .limit(1);

    if (!run) {
        res.status(404).json({ error: "Run not found" });
        return;
    }

    const stops = await db
        .select({
            id: wholesaleDeliveryRunStopsTable.id,
            wholesaleOrderId: wholesaleDeliveryRunStopsTable.wholesaleOrderId,
            stopOrder: wholesaleDeliveryRunStopsTable.stopOrder,
            status: wholesaleDeliveryRunStopsTable.status,
            notes: wholesaleDeliveryRunStopsTable.notes,
            orderNumber: wholesaleOrdersTable.orderNumber,
            customerName: wholesaleCustomersTable.businessName,
            customerAddress: wholesaleCustomersTable.address,
            customerCity: wholesaleCustomersTable.city,
            orderStatus: wholesaleOrdersTable.status,
            deliveryMethod: wholesaleOrdersTable.deliveryMethod,
        })
        .from(wholesaleDeliveryRunStopsTable)
        .innerJoin(
            wholesaleOrdersTable,
            eq(
                wholesaleDeliveryRunStopsTable.wholesaleOrderId,
                wholesaleOrdersTable.id,
            ),
        )
        .innerJoin(
            wholesaleCustomersTable,
            eq(
                wholesaleOrdersTable.wholesaleCustomerId,
                wholesaleCustomersTable.id,
            ),
        )
        .where(eq(wholesaleDeliveryRunStopsTable.deliveryRunId, id))
        .orderBy(asc(wholesaleDeliveryRunStopsTable.stopOrder));

    res.json({ ...run, stops });
});

// Update delivery run
router.put("/delivery-runs/:id", async (req, res) => {
    const id = Number(req.params.id);
    const { name, scheduledDate, driverName, driverEmail, vehicleNotes, status, notes } =
        req.body;

    // Fetch existing run to detect driver assignment changes
    const [existing] = await db
        .select()
        .from(wholesaleDeliveryRunsTable)
        .where(eq(wholesaleDeliveryRunsTable.id, id))
        .limit(1);

    if (!existing) {
        res.status(404).json({ error: "Run not found" });
        return;
    }

    const updates: Record<string, any> = { updatedAt: new Date() };
    if (name !== undefined) updates.name = name;
    if (scheduledDate !== undefined) updates.scheduledDate = scheduledDate;
    if (driverName !== undefined) updates.driverName = driverName;
    if (driverEmail !== undefined) updates.driverEmail = driverEmail;
    if (vehicleNotes !== undefined) updates.vehicleNotes = vehicleNotes;
    if (status !== undefined) updates.status = status;
    if (notes !== undefined) updates.notes = notes;

    const [updated] = await db
        .update(wholesaleDeliveryRunsTable)
        .set(updates)
        .where(eq(wholesaleDeliveryRunsTable.id, id))
        .returning();

    // Send email if driver email was newly assigned or changed
    const newEmail = updated.driverEmail;
    if (newEmail && newEmail !== existing.driverEmail) {
        sendDeliveryRunAssignment({
            to: newEmail,
            driverName: updated.driverName,
            runName: updated.name,
            scheduledDate: updated.scheduledDate,
            vehicleNotes: updated.vehicleNotes,
            notes: updated.notes,
        }).catch((e) => console.error("[EMAIL] Delivery run assignment failed:", e));
    }

    res.json(updated);
});

// Delete delivery run
router.delete("/delivery-runs/:id", async (req, res) => {
    const id = Number(req.params.id);
    const [deleted] = await db
        .delete(wholesaleDeliveryRunsTable)
        .where(eq(wholesaleDeliveryRunsTable.id, id))
        .returning();

    if (!deleted) {
        res.status(404).json({ error: "Run not found" });
        return;
    }
    res.json({ success: true });
});

// Send driver link email (or return it if no email configured)
router.post("/delivery-runs/:id/send-driver-link", async (req, res) => {
    const id = Number(req.params.id);

    let [run] = await db
        .select()
        .from(wholesaleDeliveryRunsTable)
        .where(eq(wholesaleDeliveryRunsTable.id, id))
        .limit(1);

    if (!run) {
        res.status(404).json({ error: "Run not found" });
        return;
    }

    // Ensure a driver token exists (generate lazily for old runs)
    if (!run.driverToken) {
        const token = crypto.randomBytes(24).toString("hex");
        [run] = await db
            .update(wholesaleDeliveryRunsTable)
            .set({ driverToken: token, updatedAt: new Date() })
            .where(eq(wholesaleDeliveryRunsTable.id, id))
            .returning();
    }

    const baseUrl = process.env.PUBLIC_URL || "https://urbanchurn.com";
    const driverUrl = `${baseUrl}/driver/${run.driverToken}`;

    if (run.driverEmail) {
        sendDeliveryRunAssignment({
            to: run.driverEmail,
            driverName: run.driverName,
            runName: run.name,
            scheduledDate: run.scheduledDate,
            vehicleNotes: run.vehicleNotes,
            notes: run.notes,
            driverUrl,
        }).catch((e) => console.error("[EMAIL] Driver link email failed:", e));
    }

    res.json({ driverUrl, emailSent: !!run.driverEmail });
});


// Add stop to run
router.post("/delivery-runs/:id/stops", async (req, res) => {
    const runId = Number(req.params.id);
    const { wholesaleOrderId, notes } = req.body;

    if (!wholesaleOrderId) {
        res.status(400).json({ error: "wholesaleOrderId is required" });
        return;
    }

    // Get next stop order
    const [maxStop] = await db
        .select({ max: sql<number>`coalesce(max(${wholesaleDeliveryRunStopsTable.stopOrder}), 0)` })
        .from(wholesaleDeliveryRunStopsTable)
        .where(eq(wholesaleDeliveryRunStopsTable.deliveryRunId, runId));

    const [stop] = await db
        .insert(wholesaleDeliveryRunStopsTable)
        .values({
            deliveryRunId: runId,
            wholesaleOrderId,
            stopOrder: (maxStop?.max || 0) + 1,
            notes: notes || "",
        })
        .returning();

    res.status(201).json(stop);
});

// Reorder stops
router.put("/delivery-runs/:id/stops/reorder", async (req, res) => {
    const runId = Number(req.params.id);
    const { stopIds } = req.body; // array of stop IDs in desired order

    if (!Array.isArray(stopIds)) {
        res.status(400).json({ error: "stopIds array required" });
        return;
    }

    for (let i = 0; i < stopIds.length; i++) {
        await db
            .update(wholesaleDeliveryRunStopsTable)
            .set({ stopOrder: i + 1 })
            .where(
                and(
                    eq(wholesaleDeliveryRunStopsTable.id, stopIds[i]),
                    eq(wholesaleDeliveryRunStopsTable.deliveryRunId, runId),
                ),
            );
    }

    res.json({ success: true });
});

// Update stop status
router.put("/delivery-runs/:id/stops/:stopId", async (req, res) => {
    const stopId = Number(req.params.stopId);
    const { status, notes } = req.body;

    const updates: Record<string, any> = {};
    if (status !== undefined) updates.status = status;
    if (notes !== undefined) updates.notes = notes;

    const [updated] = await db
        .update(wholesaleDeliveryRunStopsTable)
        .set(updates)
        .where(eq(wholesaleDeliveryRunStopsTable.id, stopId))
        .returning();

    if (!updated) {
        res.status(404).json({ error: "Stop not found" });
        return;
    }
    res.json(updated);
});

// Remove stop
router.delete("/delivery-runs/:id/stops/:stopId", async (req, res) => {
    const stopId = Number(req.params.stopId);
    const [deleted] = await db
        .delete(wholesaleDeliveryRunStopsTable)
        .where(eq(wholesaleDeliveryRunStopsTable.id, stopId))
        .returning();

    if (!deleted) {
        res.status(404).json({ error: "Stop not found" });
        return;
    }
    res.json({ success: true });
});

// ═══════════════════════════════════════
// ── Vendor Delivery Locations ──
// ═══════════════════════════════════════

router.get("/customers/:id/vendor-locations", async (req, res) => {
    const id = Number(req.params.id);
    const vendorLocations = await db
        .select()
        .from(wholesaleVendorLocationsTable)
        .where(eq(wholesaleVendorLocationsTable.wholesaleCustomerId, id))
        .orderBy(wholesaleVendorLocationsTable.isDefault, wholesaleVendorLocationsTable.name);
    res.json(vendorLocations);
});

router.post("/customers/:id/vendor-locations", async (req, res) => {
    const wholesaleCustomerId = Number(req.params.id);
    const { name, address, city, state, zip, phone, notes, isDefault } = req.body;

    if (!name) {
        res.status(400).json({ error: "name is required" });
        return;
    }

    try {
        // If this is set as default, clear other defaults first
        if (isDefault) {
            await db
                .update(wholesaleVendorLocationsTable)
                .set({ isDefault: false, updatedAt: new Date() })
                .where(eq(wholesaleVendorLocationsTable.wholesaleCustomerId, wholesaleCustomerId));
        }

        const [loc] = await db
            .insert(wholesaleVendorLocationsTable)
            .values({
                wholesaleCustomerId,
                name: name.trim(),
                address: address || "",
                city: city || "",
                state: state || "PA",
                zip: zip || "",
                phone: phone || "",
                notes: notes || "",
                isDefault: isDefault === true,
            })
            .returning();

        res.status(201).json(loc);
    } catch (err: any) {
        if (err?.code === "23505") {
            res.status(409).json({ error: "A location with this name already exists for this customer" });
        } else {
            console.error("[vendor-locations POST]", err?.message || err);
            res.status(500).json({ error: "Failed to create vendor location" });
        }
    }
});

router.put("/customers/:id/vendor-locations/:locId", async (req, res) => {
    const wholesaleCustomerId = Number(req.params.id);
    const locId = Number(req.params.locId);
    const { name, address, city, state, zip, phone, notes, isDefault } = req.body;

    // If setting as default, clear other defaults first
    if (isDefault === true) {
        await db
            .update(wholesaleVendorLocationsTable)
            .set({ isDefault: false, updatedAt: new Date() })
            .where(eq(wholesaleVendorLocationsTable.wholesaleCustomerId, wholesaleCustomerId));
    }

    const updates: Record<string, any> = { updatedAt: new Date() };
    if (name !== undefined) updates.name = name.trim();
    if (address !== undefined) updates.address = address;
    if (city !== undefined) updates.city = city;
    if (state !== undefined) updates.state = state;
    if (zip !== undefined) updates.zip = zip;
    if (phone !== undefined) updates.phone = phone;
    if (notes !== undefined) updates.notes = notes;
    if (isDefault !== undefined) updates.isDefault = isDefault;

    const [updated] = await db
        .update(wholesaleVendorLocationsTable)
        .set(updates)
        .where(and(
            eq(wholesaleVendorLocationsTable.id, locId),
            eq(wholesaleVendorLocationsTable.wholesaleCustomerId, wholesaleCustomerId),
        ))
        .returning();

    if (!updated) {
        res.status(404).json({ error: "Vendor location not found" });
        return;
    }
    res.json(updated);
});

router.delete("/customers/:id/vendor-locations/:locId", async (req, res) => {
    const wholesaleCustomerId = Number(req.params.id);
    const locId = Number(req.params.locId);

    const [deleted] = await db
        .delete(wholesaleVendorLocationsTable)
        .where(and(
            eq(wholesaleVendorLocationsTable.id, locId),
            eq(wholesaleVendorLocationsTable.wholesaleCustomerId, wholesaleCustomerId),
        ))
        .returning();

    if (!deleted) {
        res.status(404).json({ error: "Vendor location not found" });
        return;
    }
    res.json({ success: true });
});

// ═══════════════════════════════════════
// ── Wholesale Customer Invite & Approve ──
// ═══════════════════════════════════════

// Send portal invite to existing wholesale customer
// (repurposed: generates a new temp password and resends the welcome email)
router.post("/customers/:id/invite", async (req, res) => {
    const id = Number(req.params.id);
    const [customer] = await db
        .select()
        .from(wholesaleCustomersTable)
        .where(eq(wholesaleCustomersTable.id, id))
        .limit(1);

    if (!customer) {
        res.status(404).json({ error: "Customer not found" });
        return;
    }

    const tempPassword = crypto.randomBytes(6).toString("hex");
    const passwordHash = await hashPassword(tempPassword);
    const normalizedEmail = customer.email.toLowerCase().trim();

    // Update or create customer login account with new temp password
    const existing = await db
        .select()
        .from(customersTable)
        .where(eq(customersTable.email, normalizedEmail))
        .limit(1);

    if (existing.length > 0) {
        await db
            .update(customersTable)
            .set({ passwordHash, hasAccount: true, updatedAt: new Date() })
            .where(eq(customersTable.email, normalizedEmail));
    } else {
        const nameParts = (customer.contactName || customer.businessName).trim().split(/\s+/);
        await db.insert(customersTable).values({
            email: normalizedEmail,
            firstName: nameParts[0] || "",
            lastName: nameParts.slice(1).join(" ") || "",
            phone: customer.phone || "",
            hasAccount: true,
            passwordHash,
            wholesaleCustomerId: customer.id,
        });
    }

    sendWholesaleWelcomeEmail({
        contactName: customer.contactName || customer.businessName,
        email: normalizedEmail,
        businessName: customer.businessName,
        tempPassword,
    }).catch((e) => console.error("[EMAIL] Wholesale welcome email resend failed:", e));

    res.json({ success: true });
});

// Approve a pending wholesale customer
router.put("/customers/:id/approve", async (req, res) => {
    const id = Number(req.params.id);
    const [customer] = await db
        .select()
        .from(wholesaleCustomersTable)
        .where(eq(wholesaleCustomersTable.id, id))
        .limit(1);

    if (!customer) {
        res.status(404).json({ error: "Customer not found" });
        return;
    }

    const [updated] = await db
        .update(wholesaleCustomersTable)
        .set({ status: "active", updatedAt: new Date() })
        .where(eq(wholesaleCustomersTable.id, id))
        .returning();

    sendWholesaleAccountApproved({
        contactName: customer.contactName || customer.businessName,
        email: customer.email,
        businessName: customer.businessName,
    }).catch((e) => console.error("[EMAIL] Wholesale approve email failed:", e));

    res.json(updated);
});

// ═══════════════════════════════════════
// ── Wholesale Partner Staff Accounts ──
// ═══════════════════════════════════════

// List staff accounts for a wholesale customer
router.get("/customers/:id/staff", async (req, res) => {
    const id = Number(req.params.id);
    const staff = await db
        .select({
            id: adminUsersTable.id,
            username: adminUsersTable.username,
            role: adminUsersTable.role,
            assignedLocationId: adminUsersTable.assignedLocationId,
            createdAt: adminUsersTable.createdAt,
        })
        .from(adminUsersTable)
        .where(eq(adminUsersTable.wholesaleCustomerId, id));

    // Enrich with location names
    const enriched = await Promise.all(
        staff.map(async (s) => {
            if (!s.assignedLocationId) return { ...s, locationName: null };
            const [loc] = await db
                .select({ name: locationsTable.name })
                .from(locationsTable)
                .where(eq(locationsTable.id, s.assignedLocationId))
                .limit(1);
            return { ...s, locationName: loc?.name || null };
        }),
    );

    res.json(enriched);
});

// Create staff account for a wholesale customer
router.post("/customers/:id/staff", async (req, res) => {
    const wholesaleCustomerId = Number(req.params.id);
    const { username, password, locationId } = req.body;

    if (!username || !password || !locationId) {
        res.status(400).json({ error: "username, password, and locationId are required" });
        return;
    }

    // Verify wholesale customer exists
    const [customer] = await db
        .select()
        .from(wholesaleCustomersTable)
        .where(eq(wholesaleCustomersTable.id, wholesaleCustomerId))
        .limit(1);

    if (!customer) {
        res.status(404).json({ error: "Wholesale customer not found" });
        return;
    }

    // Verify location is mapped to this wholesale customer
    const [mapping] = await db
        .select()
        .from(wholesaleCustomerLocationsTable)
        .where(
            and(
                eq(wholesaleCustomerLocationsTable.wholesaleCustomerId, wholesaleCustomerId),
                eq(wholesaleCustomerLocationsTable.locationId, Number(locationId)),
            ),
        )
        .limit(1);

    if (!mapping) {
        res.status(400).json({ error: "Location is not mapped to this wholesale customer" });
        return;
    }

    try {
        const passwordHash = await hashPassword(password);
        const [user] = await db
            .insert(adminUsersTable)
            .values({
                username,
                passwordHash,
                role: "staff",
                assignedLocationId: Number(locationId),
                wholesaleCustomerId,
            })
            .returning({
                id: adminUsersTable.id,
                username: adminUsersTable.username,
                role: adminUsersTable.role,
                assignedLocationId: adminUsersTable.assignedLocationId,
                createdAt: adminUsersTable.createdAt,
            });

        // Get location name for response
        const [loc] = await db
            .select({ name: locationsTable.name })
            .from(locationsTable)
            .where(eq(locationsTable.id, Number(locationId)))
            .limit(1);

        res.status(201).json({ ...user, locationName: loc?.name || null });
    } catch (err: any) {
        if (err?.constraint === "admin_users_username_unique" || err?.code === "23505") {
            res.status(409).json({ error: "Username already taken" });
        } else {
            console.error("[wholesale/staff POST]", err?.message || err);
            res.status(500).json({ error: "Failed to create staff account" });
        }
    }
});

// Delete (remove) staff account for a wholesale customer
router.delete("/customers/:id/staff/:staffId", async (req, res) => {
    const wholesaleCustomerId = Number(req.params.id);
    const staffId = Number(req.params.staffId);

    // Verify the staff account belongs to this wholesale customer
    const [user] = await db
        .select()
        .from(adminUsersTable)
        .where(
            and(
                eq(adminUsersTable.id, staffId),
                eq(adminUsersTable.wholesaleCustomerId, wholesaleCustomerId),
            ),
        )
        .limit(1);

    if (!user) {
        res.status(404).json({ error: "Staff account not found for this wholesale customer" });
        return;
    }

    await db.delete(adminUsersTable).where(eq(adminUsersTable.id, staffId));
    res.json({ success: true });
});

export default router;
