import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { settingsTable, locationsTable } from "@workspace/db/schema";
import { eq, asc, sql, inArray } from "drizzle-orm";
import { requireAdmin } from "../../middlewares/auth";
import { listSquareLocations, invalidateSquareClientCache } from "../../lib/square";
import { SquareClient, SquareEnvironment } from "square";

const router: IRouter = Router();

// All settings routes require admin role
router.use(requireAdmin);

const SQUARE_KEYS = [
    "square_access_token",
    "square_environment",
    "square_app_id",
    "square_webhook_signature_key",
    "square_online_sales_location_id",
    "square_wholesale_location_id",
];

function maskToken(value: string): string {
    if (!value || value.length <= 4) return value ? "****" : "";
    return "•".repeat(Math.min(value.length - 4, 40)) + value.slice(-4);
}

// Get all Square settings
router.get("/", async (_req, res) => {
    // Get all settings at once
    const allRows = await db.select().from(settingsTable);
    const settings: Record<string, string> = {};

    for (const row of allRows) {
        if (SQUARE_KEYS.includes(row.key)) {
            // Mask sensitive values
            if (row.key === "square_access_token" || row.key === "square_webhook_signature_key") {
                settings[row.key] = maskToken(row.value);
            } else {
                settings[row.key] = row.value;
            }
        }
    }

    // Fill missing keys with empty strings
    for (const key of SQUARE_KEYS) {
        if (!(key in settings)) settings[key] = "";
    }

    // Check if token is configured (from DB or env var)
    const hasToken = !!(allRows.find((r) => r.key === "square_access_token")?.value || process.env.SQUARE_ACCESS_TOKEN);

    res.json({ settings, configured: hasToken });
});

// Update Square settings
router.put("/", async (req, res) => {
    const updates = req.body;

    for (const key of SQUARE_KEYS) {
        if (key in updates) {
            let value = updates[key];

            // Skip masked values (user didn't change the token)
            if ((key === "square_access_token" || key === "square_webhook_signature_key") && value.includes("•")) {
                continue;
            }

            const [existing] = await db
                .select()
                .from(settingsTable)
                .where(eq(settingsTable.key, key))
                .limit(1);

            if (existing) {
                await db
                    .update(settingsTable)
                    .set({ value, updatedAt: new Date() })
                    .where(eq(settingsTable.key, key));
            } else {
                await db.insert(settingsTable).values({ key, value });
            }
        }
    }

    // Invalidate cached Square client so next call uses new credentials
    invalidateSquareClientCache();

    res.json({ success: true });
});

// Test Square connection
router.get("/square/status", async (_req, res) => {
    try {
        const locations = await listSquareLocations();
        res.json({
            connected: true,
            locationCount: locations.length,
        });
    } catch (e: any) {
        res.json({
            connected: false,
            error: e.message || "Failed to connect to Square",
        });
    }
});

// List Square locations (for dropdown mapping)
router.get("/square/locations", async (_req, res) => {
    try {
        const locations = await listSquareLocations();
        res.json(locations);
    } catch (e: any) {
        res.status(400).json({ error: e.message || "Failed to fetch Square locations" });
    }
});

// Get current location mappings (website locations + their Square IDs)
router.get("/square/mappings", async (_req, res) => {
    const locations = await db
        .select({
            id: locationsTable.id,
            name: locationsTable.name,
            squareLocationId: locationsTable.squareLocationId,
            active: locationsTable.active,
        })
        .from(locationsTable)
        .orderBy(asc(locationsTable.sortOrder));

    res.json(locations);
});

// Update a location's Square mapping
router.put("/square/mappings/:id", async (req, res) => {
    const id = Number(req.params.id);
    const { squareLocationId } = req.body;

    const [location] = await db
        .update(locationsTable)
        .set({
            squareLocationId: squareLocationId || null,
            updatedAt: new Date(),
        })
        .where(eq(locationsTable.id, id))
        .returning();

    if (!location) {
        res.status(404).json({ error: "Location not found" });
        return;
    }
    res.json(location);
});

// Get public Square app ID (needed by frontend payment form, no auth needed)
// This is registered separately in routes/index.ts without requireAuth
export async function getSquareAppId(_req: any, res: any) {
    const [row] = await db
        .select({ value: settingsTable.value })
        .from(settingsTable)
        .where(eq(settingsTable.key, "square_app_id"))
        .limit(1);

    const appId = row?.value || process.env.SQUARE_APP_ID || "";
    const [envRow] = await db
        .select({ value: settingsTable.value })
        .from(settingsTable)
        .where(eq(settingsTable.key, "square_environment"))
        .limit(1);

    const env = envRow?.value || process.env.SQUARE_ENVIRONMENT || "sandbox";

    const requestedLocationId = Number(_req?.query?.locationId);
    const hasRequestedLocation = Number.isFinite(requestedLocationId) && requestedLocationId > 0;

    let locationId = "";

    if (hasRequestedLocation) {
        const [mapped] = await db
            .select({ squareLocationId: locationsTable.squareLocationId })
            .from(locationsTable)
            .where(eq(locationsTable.id, requestedLocationId))
            .limit(1);

        locationId = mapped?.squareLocationId || "";
    }

    // Fallback to first mapped location if a specific one was not supplied or not mapped.
    if (!locationId) {
        const [loc] = await db
            .select({ squareLocationId: locationsTable.squareLocationId })
            .from(locationsTable)
            .where(sql`${locationsTable.squareLocationId} IS NOT NULL AND ${locationsTable.squareLocationId} != ''`)
            .limit(1);
        locationId = loc?.squareLocationId || "";
    }

    res.json({ appId, environment: env, locationId });
}

// ─── Announcement Bar ───

const ANNOUNCEMENT_KEYS = ["announcement_text", "announcement_link", "announcement_link_text", "announcement_enabled"];

// Get announcement settings
router.get("/announcement", async (_req, res) => {
    const rows = await db
        .select()
        .from(settingsTable)
        .where(inArray(settingsTable.key, ANNOUNCEMENT_KEYS));

    const result: Record<string, string> = {};
    for (const row of rows) {
        result[row.key] = row.value;
    }

    res.json({
        enabled: result.announcement_enabled === "true",
        text: result.announcement_text || "",
        link: result.announcement_link || "",
        linkText: result.announcement_link_text || "",
    });
});

// Update announcement settings
router.put("/announcement", async (req, res) => {
    const { text, link, linkText, enabled } = req.body;

    const updates: Record<string, string> = {};
    if (typeof text === "string") updates.announcement_text = text;
    if (typeof link === "string") updates.announcement_link = link;
    if (typeof linkText === "string") updates.announcement_link_text = linkText;
    if (typeof enabled === "boolean") updates.announcement_enabled = String(enabled);

    for (const [key, value] of Object.entries(updates)) {
        const [existing] = await db
            .select()
            .from(settingsTable)
            .where(eq(settingsTable.key, key))
            .limit(1);

        if (existing) {
            await db
                .update(settingsTable)
                .set({ value, updatedAt: new Date() })
                .where(eq(settingsTable.key, key));
        } else {
            await db.insert(settingsTable).values({ key, value });
        }
    }

    res.json({ success: true });
});

export default router;
