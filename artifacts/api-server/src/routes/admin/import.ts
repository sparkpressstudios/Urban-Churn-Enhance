import { Router, type IRouter } from "express";
import multer from "multer";
import { db } from "@workspace/db";
import {
    importLogsTable,
    flavoursTable,
    sizesTable,
    productsTable,
    ordersTable,
    orderItemsTable,
    locationsTable,
    customersTable,
} from "@workspace/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import {
    parseWooCSV,
    mapRow,
    type WooImportType,
} from "../../lib/woo-csv-parser";
import * as crypto from "node:crypto";

const router: IRouter = Router();

// Multer configuration: store files in memory (limit 10MB)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (
            file.mimetype === "text/csv" ||
            file.originalname.endsWith(".csv")
        ) {
            cb(null, true);
        } else {
            cb(new Error("Only CSV files are allowed"));
        }
    },
});

// Preview: upload CSV, parse, and return preview data without importing
router.post("/preview", upload.single("file"), async (req, res) => {
    if (!req.file) {
        res.status(400).json({ error: "No file uploaded" });
        return;
    }

    const csvContent = req.file.buffer.toString("utf-8");
    const parsed = parseWooCSV(csvContent);

    // Return first 20 rows as preview
    res.json({
        filename: req.file.originalname,
        detectedType: parsed.detectedType,
        headers: parsed.headers,
        totalRows: parsed.rows.length,
        preview: parsed.rows.slice(0, 20),
    });
});

// Execute import: upload CSV and import into database
router.post("/execute", upload.single("file"), async (req, res) => {
    if (!req.file) {
        res.status(400).json({ error: "No file uploaded" });
        return;
    }

    const importType = (req.body.type as WooImportType) || undefined;
    const csvContent = req.file.buffer.toString("utf-8");
    const parsed = parseWooCSV(csvContent);
    const type = importType || parsed.detectedType;

    // Create import log
    const [importLog] = await db
        .insert(importLogsTable)
        .values({
            type,
            filename: req.file.originalname,
            totalRows: parsed.rows.length,
            status: "processing",
        })
        .returning();

    const errors: { row: number; message: string }[] = [];
    let importedCount = 0;
    let skippedCount = 0;

    try {
        if (type === "products") {
            ({ importedCount, skippedCount } = await importProducts(
                parsed.rows,
                errors,
            ));
        } else if (type === "orders") {
            ({ importedCount, skippedCount } = await importOrders(
                parsed.rows,
                errors,
            ));
        } else if (type === "customers") {
            ({ importedCount, skippedCount } = await importCustomers(
                parsed.rows,
                errors,
            ));
        } else {
            errors.push({ row: 0, message: `Import type "${type}" is not supported yet` });
        }

        // Update import log
        await db
            .update(importLogsTable)
            .set({
                importedRows: importedCount,
                skippedRows: skippedCount,
                errorsJson: JSON.stringify(errors.slice(0, 100)), // cap errors
                status: errors.length > 0 && importedCount === 0 ? "failed" : "completed",
                completedAt: new Date(),
            })
            .where(eq(importLogsTable.id, importLog.id));

        res.json({
            id: importLog.id,
            type,
            filename: req.file.originalname,
            totalRows: parsed.rows.length,
            importedRows: importedCount,
            skippedRows: skippedCount,
            errors,
            totalErrors: errors.length,
            status: errors.length > 0 && importedCount === 0 ? "failed" : "completed",
        });
    } catch (err: any) {
        await db
            .update(importLogsTable)
            .set({
                importedRows: importedCount,
                skippedRows: skippedCount,
                errorsJson: JSON.stringify([
                    { row: 0, message: err.message },
                    ...errors.slice(0, 99),
                ]),
                status: "failed",
                completedAt: new Date(),
            })
            .where(eq(importLogsTable.id, importLog.id));

        res.status(500).json({
            error: "Import failed",
            message: err.message,
            importedRows: importedCount,
            skippedRows: skippedCount,
        });
    }
});

// Import history
router.get("/history", async (_req, res) => {
    const logs = await db
        .select()
        .from(importLogsTable)
        .orderBy(desc(importLogsTable.createdAt))
        .limit(50);
    res.json(logs);
});

// ============ Import Functions ============

async function importProducts(
    rows: Record<string, string>[],
    errors: { row: number; message: string }[],
) {
    let importedCount = 0;
    let skippedCount = 0;

    // Get existing sizes (needed to link products)
    const existingSizes = await db.select().from(sizesTable);

    for (let i = 0; i < rows.length; i++) {
        try {
            const mapped = mapRow(rows[i], "products");
            const name = mapped.name || rows[i]["Name"] || rows[i]["name"];
            if (!name) {
                skippedCount++;
                errors.push({ row: i + 1, message: "Missing product name" });
                continue;
            }

            const slug =
                mapped.slug ||
                name
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/^-+|-+$/g, "");

            // Upsert flavour
            const [flavour] = await db
                .insert(flavoursTable)
                .values({
                    name,
                    slug,
                    description: mapped.description || "",
                    htmlContent: mapped.htmlContent || "",
                    imageUrl: mapped.imageUrl || null,
                    tag: mapped.tag || "classic",
                    emoji: "🍦",
                    basePrice: mapped.basePrice || "7.00",
                    available: mapped.available !== undefined ? mapped.available : true,
                    sortOrder: mapped.sortOrder || 0,
                })
                .onConflictDoUpdate({
                    target: flavoursTable.slug,
                    set: {
                        name,
                        description: mapped.description || "",
                        htmlContent: mapped.htmlContent || "",
                        imageUrl: mapped.imageUrl || null,
                        tag: mapped.tag || "classic",
                        basePrice: mapped.basePrice || "7.00",
                        available: mapped.available !== undefined ? mapped.available : true,
                        sortOrder: mapped.sortOrder || 0,
                        updatedAt: new Date(),
                    },
                })
                .returning();

            // Auto-create products for each size
            for (const size of existingSizes) {
                await db
                    .insert(productsTable)
                    .values({
                        flavourId: flavour.id,
                        sizeId: size.id,
                        available: true,
                    })
                    .onConflictDoNothing();
            }

            importedCount++;
        } catch (err: any) {
            skippedCount++;
            errors.push({ row: i + 1, message: err.message });
        }
    }

    return { importedCount, skippedCount };
}

async function importOrders(
    rows: Record<string, string>[],
    errors: { row: number; message: string }[],
) {
    let importedCount = 0;
    let skippedCount = 0;

    // Get default location for imported orders
    const locations = await db.select().from(locationsTable).limit(1);
    const defaultLocationId = locations[0]?.id || 1;

    // Group rows by order number/ID (WooCommerce exports one row per line item)
    const orderGroups = new Map<string, Record<string, string>[]>();
    for (const row of rows) {
        const orderId =
            row["Order ID"] ||
            row["order_id"] ||
            row["Order Number"] ||
            row["order_number"] ||
            "";
        if (!orderId) continue;
        if (!orderGroups.has(orderId)) orderGroups.set(orderId, []);
        orderGroups.get(orderId)!.push(row);
    }

    // Preload flavours & sizes for productId matching
    const allFlavours = await db.select().from(flavoursTable);
    const allSizes = await db.select().from(sizesTable);
    const allProducts = await db.select().from(productsTable);

    // Build lookup helpers
    const flavourByName = new Map(allFlavours.map(f => [f.name.toLowerCase(), f]));
    const sizeByName = new Map(allSizes.map(s => [s.name.toLowerCase(), s]));
    const productLookup = new Map(allProducts.map(p => [`${p.flavourId}-${p.sizeId}`, p]));

    let rowIndex = 0;
    for (const [orderId, groupRows] of orderGroups) {
        rowIndex++;
        try {
            const mapped = mapRow(groupRows[0], "orders");

            const customerName = [
                mapped._billingFirst || "",
                mapped._billingLast || "",
            ]
                .join(" ")
                .trim() || "WooCommerce Customer";

            const orderNumber = mapped.orderNumber || `WOO-${orderId}`;

            // Check if order already exists
            const existing = await db
                .select({ id: ordersTable.id })
                .from(ordersTable)
                .where(eq(ordersTable.orderNumber, orderNumber))
                .limit(1);

            if (existing.length > 0) {
                skippedCount++;
                continue;
            }

            const [order] = await db
                .insert(ordersTable)
                .values({
                    orderNumber,
                    locationId: defaultLocationId,
                    customerName,
                    customerEmail: mapped.customerEmail || `woo-${orderId}@import.local`,
                    customerPhone: mapped.customerPhone || "",
                    notes: mapped.notes || `Imported from WooCommerce (Order #${orderId})`,
                    status: mapped.status || "pending",
                    totalCents: mapped.totalCents || 0,
                    discountCents: mapped._discountCents || 0,
                    createdAt: mapped.createdAt || new Date(),
                })
                .returning();

            // Import line items from grouped rows
            for (const itemRow of groupRows) {
                const itemMapped = mapRow(itemRow, "orders");
                const itemName = itemMapped._itemName || itemRow["Item Name"] || itemRow["Item #"] || "";
                if (!itemName) continue;

                // Parse size from variation column, or from item name ("Vanilla - Pint")
                const variationRaw = itemMapped._itemVariation || "";
                let parsedSize = variationRaw.trim();
                let parsedFlavour = itemName.trim();

                // Try to split "Flavour - Size" pattern from item name
                if (!parsedSize && itemName.includes(" - ")) {
                    const parts = itemName.split(" - ");
                    parsedFlavour = parts[0].trim();
                    parsedSize = parts.slice(1).join(" - ").trim();
                }

                // Try to match to existing product
                let productId: number | null = null;
                const matchedFlavour = flavourByName.get(parsedFlavour.toLowerCase());
                const matchedSize = parsedSize ? sizeByName.get(parsedSize.toLowerCase()) : null;
                if (matchedFlavour && matchedSize) {
                    const product = productLookup.get(`${matchedFlavour.id}-${matchedSize.id}`);
                    if (product) productId = product.id;
                }

                await db.insert(orderItemsTable).values({
                    orderId: order.id,
                    productId,
                    flavourName: parsedFlavour || itemName,
                    sizeName: parsedSize || "Standard",
                    priceCents: Math.round((itemMapped._itemCost || 0) * 100),
                    quantity: itemMapped._itemQty || 1,
                });
            }

            // Also upsert customer from order data
            if (mapped.customerEmail && !mapped.customerEmail.includes("@import.local")) {
                await db
                    .insert(customersTable)
                    .values({
                        email: mapped.customerEmail,
                        firstName: mapped._billingFirst || "",
                        lastName: mapped._billingLast || "",
                        phone: mapped.customerPhone || "",
                        address: mapped._billingAddress || "",
                        city: mapped._billingCity || "",
                        state: mapped._billingState || "",
                        zip: mapped._billingZip || "",
                    })
                    .onConflictDoUpdate({
                        target: customersTable.email,
                        set: {
                            firstName: mapped._billingFirst || "",
                            lastName: mapped._billingLast || "",
                            phone: mapped.customerPhone || "",
                            address: mapped._billingAddress || "",
                            city: mapped._billingCity || "",
                            state: mapped._billingState || "",
                            zip: mapped._billingZip || "",
                            updatedAt: new Date(),
                        },
                    });
            }

            importedCount++;
        } catch (err: any) {
            skippedCount++;
            errors.push({ row: rowIndex, message: err.message });
        }
    }

    return { importedCount, skippedCount };
}

async function importCustomers(
    rows: Record<string, string>[],
    errors: { row: number; message: string }[],
) {
    let importedCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < rows.length; i++) {
        try {
            const mapped = mapRow(rows[i], "customers");
            const email = mapped.email;
            if (!email) {
                skippedCount++;
                errors.push({ row: i + 1, message: "Missing customer email" });
                continue;
            }

            // Split full name into first/last when individual fields are absent
            let firstName = mapped.firstName || "";
            let lastName = mapped.lastName || "";
            if (!firstName && !lastName && mapped._fullName) {
                const spaceIdx = mapped._fullName.indexOf(" ");
                if (spaceIdx > 0) {
                    firstName = mapped._fullName.slice(0, spaceIdx);
                    lastName = mapped._fullName.slice(spaceIdx + 1);
                } else {
                    firstName = mapped._fullName;
                }
            }

            // Customers with a WooCommerce username or sign-up date had an account
            const hadWooAccount = !!(mapped._username || mapped._signUpDate);

            await db
                .insert(customersTable)
                .values({
                    email: email.toLowerCase().trim(),
                    firstName,
                    lastName,
                    phone: mapped.phone || "",
                    address: mapped.address || "",
                    city: mapped.city || "",
                    state: mapped.state || "",
                    zip: mapped.zip || "",
                    country: mapped.country || "US",
                    wooCustomerId: mapped.wooCustomerId || null,
                    ordersCount: mapped.ordersCount || 0,
                    totalSpentCents: mapped.totalSpentCents || 0,
                    hasAccount: hadWooAccount,
                })
                .onConflictDoUpdate({
                    target: customersTable.email,
                    set: {
                        firstName,
                        lastName,
                        phone: mapped.phone || "",
                        address: mapped.address || "",
                        city: mapped.city || "",
                        state: mapped.state || "",
                        zip: mapped.zip || "",
                        country: mapped.country || "US",
                        wooCustomerId: mapped.wooCustomerId || null,
                        ordersCount: mapped.ordersCount || 0,
                        totalSpentCents: mapped.totalSpentCents || 0,
                        // Upgrade to account if they had one, but never downgrade
                        hasAccount: sql`CASE WHEN ${customersTable.hasAccount} = TRUE THEN TRUE ELSE ${hadWooAccount} END`,
                        updatedAt: new Date(),
                    },
                });

            importedCount++;
        } catch (err: any) {
            skippedCount++;
            errors.push({ row: i + 1, message: err.message });
        }
    }

    return { importedCount, skippedCount };
}

export default router;
