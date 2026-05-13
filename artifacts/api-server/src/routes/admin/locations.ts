import { Router, type IRouter } from "express";
import multer from "multer";
import { parse } from "csv-parse/sync";
import { db } from "@workspace/db";
import {
    locationsTable,
    locationHoursTable,
} from "@workspace/db/schema";
import { eq, asc } from "drizzle-orm";

const router: IRouter = Router();

// CSV upload for bulk import (5MB limit, CSV only, in-memory)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (
            file.mimetype === "text/csv" ||
            file.mimetype === "application/vnd.ms-excel" ||
            file.originalname.toLowerCase().endsWith(".csv")
        ) {
            cb(null, true);
        } else {
            cb(new Error("Only CSV files are allowed"));
        }
    },
});

const VENDOR_CATEGORIES = [
    "scoop_shop",
    "grocery",
    "restaurant",
    "cafe",
    "market",
    "other",
] as const;
type VendorCategory = (typeof VENDOR_CATEGORIES)[number];

// Accept friendly variants in CSV and map to enum values
const CATEGORY_ALIASES: Record<string, VendorCategory> = {
    "scoop shop": "scoop_shop",
    "scoop-shop": "scoop_shop",
    "scoop_shop": "scoop_shop",
    "scoop shops": "scoop_shop",
    "scoop": "scoop_shop",
    "grocery": "grocery",
    "grocery store": "grocery",
    "grocery stores": "grocery",
    "supermarket": "grocery",
    "restaurant": "restaurant",
    "restaurants": "restaurant",
    "cafe": "cafe",
    "cafes": "cafe",
    "café": "cafe",
    "cafés": "cafe",
    "coffee shop": "cafe",
    "market": "market",
    "markets": "market",
    "farmers market": "market",
    "other": "other",
};

function slugify(s: string): string {
    return s
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
}

function normalizeCategory(raw: string | undefined): VendorCategory | null {
    if (!raw) return null;
    const key = raw.toLowerCase().trim();
    if (!key) return null;
    return CATEGORY_ALIASES[key] ?? null;
}

// List all locations with hours
router.get("/", async (_req, res) => {
    const locations = await db
        .select()
        .from(locationsTable)
        .orderBy(asc(locationsTable.sortOrder));

    const locationsWithHours = await Promise.all(
        locations.map(async (loc) => {
            const hours = await db
                .select()
                .from(locationHoursTable)
                .where(eq(locationHoursTable.locationId, loc.id))
                .orderBy(asc(locationHoursTable.dayOfWeek), asc(locationHoursTable.setNumber));
            return { ...loc, hours };
        }),
    );

    res.json(locationsWithHours);
});

// Get single location with hours
router.get("/:id", async (req, res) => {
    const id = Number(req.params.id);
    const [location] = await db
        .select()
        .from(locationsTable)
        .where(eq(locationsTable.id, id))
        .limit(1);

    if (!location) {
        res.status(404).json({ error: "Location not found" });
        return;
    }

    const hours = await db
        .select()
        .from(locationHoursTable)
        .where(eq(locationHoursTable.locationId, id))
        .orderBy(asc(locationHoursTable.dayOfWeek), asc(locationHoursTable.setNumber));

    res.json({ ...location, hours });
});

// Create location
router.post("/", async (req, res) => {
    const { name, slug, address, city, state, zip, phone, mapUrl, imageUrl, accentColor, menuUrl, menuEmbedCode, squareLocationId, sortOrder, active, type, vendorCategory, showOnPublicPage, hideHours, allowPreorderPickup, hours } =
        req.body;

    const [location] = await db
        .insert(locationsTable)
        .values({
            name,
            slug,
            address,
            city,
            state: state ?? "PA",
            zip,
            phone: phone ?? "",
            mapUrl: mapUrl ?? null,
            imageUrl: imageUrl ?? null,
            accentColor: accentColor ?? "#A1AB74",
            menuUrl: menuUrl ?? null,
            menuEmbedCode: menuEmbedCode ?? null,
            squareLocationId: squareLocationId ?? null,
            type: type ?? "shop",
            vendorCategory: vendorCategory ?? null,
            showOnPublicPage: showOnPublicPage ?? true,
            hideHours: hideHours ?? false,
            allowPreorderPickup: allowPreorderPickup ?? (type === "vendor" ? false : true),
            sortOrder: sortOrder ?? 0,
            active: active ?? true,
        })
        .returning();

    // Insert hours if provided
    if (hours && Array.isArray(hours)) {
        const seen = new Set<string>();
        for (const h of hours) {
            const key = `${h.dayOfWeek}-${h.setNumber ?? 1}`;
            if (seen.has(key)) continue;
            seen.add(key);
            await db.insert(locationHoursTable).values({
                locationId: location.id,
                dayOfWeek: h.dayOfWeek,
                setNumber: h.setNumber ?? 1,
                openTime: h.openTime ?? "12:00",
                closeTime: h.closeTime ?? "21:00",
                isClosed: h.isClosed ?? false,
            });
        }
    }

    const allHours = await db
        .select()
        .from(locationHoursTable)
        .where(eq(locationHoursTable.locationId, location.id))
        .orderBy(asc(locationHoursTable.dayOfWeek), asc(locationHoursTable.setNumber));

    res.status(201).json({ ...location, hours: allHours });
});

// Update location
router.put("/:id", async (req, res) => {
    const id = Number(req.params.id);
    const {
        name,
        slug,
        address,
        city,
        state,
        zip,
        phone,
        mapUrl,
        imageUrl,
        accentColor,
        menuUrl,
        menuEmbedCode,
        squareLocationId,
        sortOrder,
        active,
        type,
        vendorCategory,
        showOnPublicPage,
        hideHours,
        allowPreorderPickup,
        hours,
    } = req.body;

    const [location] = await db
        .update(locationsTable)
        .set({
            ...(name !== undefined && { name }),
            ...(slug !== undefined && { slug }),
            ...(address !== undefined && { address }),
            ...(city !== undefined && { city }),
            ...(state !== undefined && { state }),
            ...(zip !== undefined && { zip }),
            ...(phone !== undefined && { phone }),
            ...(mapUrl !== undefined && { mapUrl }),
            ...(imageUrl !== undefined && { imageUrl }),
            ...(accentColor !== undefined && { accentColor }),
            ...(menuUrl !== undefined && { menuUrl }),
            ...(menuEmbedCode !== undefined && { menuEmbedCode }),
            ...(squareLocationId !== undefined && { squareLocationId }),
            ...(sortOrder !== undefined && { sortOrder }),
            ...(active !== undefined && { active }),
            ...(type !== undefined && { type }),
            ...(vendorCategory !== undefined && { vendorCategory: vendorCategory || null }),
            ...(showOnPublicPage !== undefined && { showOnPublicPage }),
            ...(hideHours !== undefined && { hideHours }),
            ...(allowPreorderPickup !== undefined && { allowPreorderPickup }),
            updatedAt: new Date(),
        })
        .where(eq(locationsTable.id, id))
        .returning();

    if (!location) {
        res.status(404).json({ error: "Location not found" });
        return;
    }

    // Replace hours if provided
    if (hours && Array.isArray(hours)) {
        await db
            .delete(locationHoursTable)
            .where(eq(locationHoursTable.locationId, id));

        // Deduplicate: keep only one entry per (dayOfWeek, setNumber)
        const seen = new Set<string>();
        for (const h of hours) {
            const key = `${h.dayOfWeek}-${h.setNumber ?? 1}`;
            if (seen.has(key)) continue;
            seen.add(key);
            await db.insert(locationHoursTable).values({
                locationId: id,
                dayOfWeek: h.dayOfWeek,
                setNumber: h.setNumber ?? 1,
                openTime: h.openTime ?? "12:00",
                closeTime: h.closeTime ?? "21:00",
                isClosed: h.isClosed ?? false,
            });
        }
    }

    const allHours = await db
        .select()
        .from(locationHoursTable)
        .where(eq(locationHoursTable.locationId, id))
        .orderBy(asc(locationHoursTable.dayOfWeek), asc(locationHoursTable.setNumber));

    res.json({ ...location, hours: allHours });
});

// Delete (deactivate) location
router.delete("/:id", async (req, res) => {
    const id = Number(req.params.id);
    const [location] = await db
        .update(locationsTable)
        .set({ active: false, updatedAt: new Date() })
        .where(eq(locationsTable.id, id))
        .returning();

    if (!location) {
        res.status(404).json({ error: "Location not found" });
        return;
    }
    res.json({ success: true });
});

// Bulk import partner vendors from CSV
// Expected columns: name, address, city, state, zip, phone, category, mapUrl
router.post("/bulk", upload.single("file"), async (req, res) => {
    if (!req.file) {
        res.status(400).json({ error: "No file uploaded" });
        return;
    }

    let rows: Record<string, string>[];
    try {
        rows = parse(req.file.buffer.toString("utf-8"), {
            columns: (header: string[]) =>
                header.map((h) => h.trim().toLowerCase().replace(/\s+/g, "_")),
            skip_empty_lines: true,
            trim: true,
            bom: true,
        }) as Record<string, string>[];
    } catch (err: unknown) {
        res.status(400).json({
            error: "Failed to parse CSV",
            detail: err instanceof Error ? err.message : String(err),
        });
        return;
    }

    const errors: { row: number; name: string; message: string }[] = [];
    const toInsert: {
        name: string;
        slug: string;
        address: string;
        city: string;
        state: string;
        zip: string;
        phone: string;
        mapUrl: string | null;
        vendorCategory: VendorCategory | null;
    }[] = [];

    // Track slugs used in this batch so duplicates within one upload are caught early
    const batchSlugs = new Set<string>();

    rows.forEach((r, i) => {
        // Row number in CSV (1-based, +1 for header row)
        const rowNum = i + 2;
        const name = (r.name ?? "").trim();
        const address = (r.address ?? "").trim();
        const city = (r.city ?? "").trim();
        const state = (r.state ?? "").trim() || "PA";
        const zip = (r.zip ?? "").trim();
        const phone = (r.phone ?? "").trim();
        const mapUrl = (r.mapurl ?? r.map_url ?? "").trim() || null;
        const categoryRaw = (r.category ?? "").trim();

        const missing: string[] = [];
        if (!name) missing.push("name");
        if (!address) missing.push("address");
        if (!city) missing.push("city");
        if (!zip) missing.push("zip");
        if (missing.length) {
            errors.push({
                row: rowNum,
                name: name || "(unnamed)",
                message: `Missing required field(s): ${missing.join(", ")}`,
            });
            return;
        }

        let vendorCategory: VendorCategory | null = null;
        if (categoryRaw) {
            vendorCategory = normalizeCategory(categoryRaw);
            if (!vendorCategory) {
                errors.push({
                    row: rowNum,
                    name,
                    message: `Unknown category "${categoryRaw}". Allowed: ${VENDOR_CATEGORIES.join(", ")}`,
                });
                return;
            }
        }

        let slug = slugify(name);
        if (!slug) {
            errors.push({
                row: rowNum,
                name,
                message: "Could not derive slug from name",
            });
            return;
        }

        // Disambiguate duplicate slugs within this batch
        let candidate = slug;
        let n = 2;
        while (batchSlugs.has(candidate)) {
            candidate = `${slug}-${n++}`;
        }
        slug = candidate;
        batchSlugs.add(slug);

        toInsert.push({
            name,
            slug,
            address,
            city,
            state,
            zip,
            phone,
            mapUrl,
            vendorCategory,
        });
    });

    let importedCount = 0;
    for (const row of toInsert) {
        try {
            await db.insert(locationsTable).values({
                name: row.name,
                slug: row.slug,
                address: row.address,
                city: row.city,
                state: row.state,
                zip: row.zip,
                phone: row.phone,
                mapUrl: row.mapUrl,
                type: "vendor",
                vendorCategory: row.vendorCategory,
                allowPreorderPickup: false,
                showOnPublicPage: true,
                active: true,
            });
            importedCount++;
        } catch (err: unknown) {
            errors.push({
                row: 0,
                name: row.name,
                message:
                    err instanceof Error ? err.message : "Insert failed",
            });
        }
    }

    res.json({
        totalRows: rows.length,
        importedCount,
        skippedCount: rows.length - importedCount,
        errors: errors.slice(0, 100),
    });
});

export default router;
