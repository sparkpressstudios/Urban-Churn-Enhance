import { db } from "@workspace/db";
import { settingsTable, locationsTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";

/**
 * Prefill Square settings from environment variables into the DB settings table.
 * 
 * Mapping:
 *   SQUARE_ACCESS_TOKEN        → square_access_token
 *   SQUARE_ENVIRONMENT         → square_environment
 *   SQUARE_APP_ID              → square_app_id
 *   SQUARE_WEBHOOK_SIGNATURE_KEY → square_webhook_signature_key
 *   SQUARE_LOCATION_ID         → square_online_sales_location_id  (this is "Online Sales")
 *
 * There is no "Wholesale" location in Square currently.
 * The wholesale location ID can be configured later through the admin UI if one is created.
 */

const PREFILL_MAP: Record<string, string> = {
    square_access_token: process.env.SQUARE_ACCESS_TOKEN || "",
    square_environment: process.env.SQUARE_ENVIRONMENT || "production",
    square_app_id: process.env.SQUARE_APP_ID || "",
    square_webhook_signature_key: process.env.SQUARE_WEBHOOK_SIGNATURE_KEY || "",
    square_online_sales_location_id: process.env.SQUARE_LOCATION_ID || "", // LW4DE1A6KBPQP = "Online Sales"
};

async function main() {
    console.log("=== PREFILLING SQUARE SETTINGS ===\n");

    for (const [key, envValue] of Object.entries(PREFILL_MAP)) {
        if (!envValue) {
            console.log(`SKIP  ${key} — no env value available`);
            continue;
        }

        const [existing] = await db
            .select()
            .from(settingsTable)
            .where(eq(settingsTable.key, key))
            .limit(1);

        const display = ["square_access_token", "square_webhook_signature_key"].includes(key)
            ? envValue.slice(0, 8) + "..."
            : envValue;

        if (existing) {
            if (existing.value && existing.value.length > 0) {
                console.log(`KEEP  ${key} — already has value (${existing.value.slice(0, 8)}...)`);
            } else {
                await db
                    .update(settingsTable)
                    .set({ value: envValue, updatedAt: new Date() })
                    .where(eq(settingsTable.key, key));
                console.log(`SET   ${key} = ${display}`);
            }
        } else {
            await db.insert(settingsTable).values({ key, value: envValue });
            console.log(`NEW   ${key} = ${display}`);
        }
    }

    // Verify final state
    console.log("\n=== FINAL SQUARE SETTINGS ===");
    const settings = await db.select().from(settingsTable).where(sql`${settingsTable.key} LIKE 'square%'`);
    for (const s of settings) {
        const val = ["square_access_token", "square_webhook_signature_key"].includes(s.key)
            ? s.value.slice(0, 8) + "..."
            : s.value;
        console.log(`  ${s.key} = ${val}`);
    }

    console.log("\n=== LOCATION MAPPINGS ===");
    const locs = await db.select().from(locationsTable);
    for (const l of locs) {
        console.log(`  ${l.id} ${l.name} → sqId: ${l.squareLocationId || "(none)"} | type: ${(l as any).type} | active: ${l.active}`);
    }

    process.exit(0);
}
main();
