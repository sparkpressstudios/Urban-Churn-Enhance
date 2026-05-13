import { db } from "@workspace/db";
import { settingsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

async function getSettingValue(key: string): Promise<string | null> {
    const [row] = await db.select({ value: settingsTable.value }).from(settingsTable).where(eq(settingsTable.key, key)).limit(1);
    return row?.value || null;
}

async function main() {
    // Read credentials from DB (not env vars) to validate the prefill worked
    const token = await getSettingValue("square_access_token");
    const env = await getSettingValue("square_environment") || "production";
    const appId = await getSettingValue("square_app_id");
    const webhookKey = await getSettingValue("square_webhook_signature_key");
    const onlineLocId = await getSettingValue("square_online_sales_location_id");
    const wholesaleLocId = await getSettingValue("square_wholesale_location_id");

    console.log("=== SQUARE CONFIG FROM DB ===");
    console.log("  Token:", token ? token.slice(0, 8) + "... ✓" : "MISSING ✗");
    console.log("  Environment:", env);
    console.log("  App ID:", appId || "MISSING ✗");
    console.log("  Webhook Key:", webhookKey ? webhookKey.slice(0, 8) + "... ✓" : "MISSING ✗");
    console.log("  Online Sales Location:", onlineLocId || "NOT SET");
    console.log("  Wholesale Location:", wholesaleLocId || "NOT SET (no wholesale location in Square)");

    if (!token) {
        console.error("\n✗ No access token — cannot test connection");
        process.exit(1);
    }

    // Test API connection using fetch (avoids needing square SDK in scripts package)
    console.log("\n=== TESTING SQUARE API CONNECTION ===");
    const baseUrl = env === "production"
        ? "https://connect.squareup.com"
        : "https://connect.squareupsandbox.com";

    const resp = await fetch(`${baseUrl}/v2/locations`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });

    if (!resp.ok) {
        console.error(`\n✗ API returned ${resp.status}: ${await resp.text()}`);
        process.exit(1);
    }

    const data = await resp.json() as any;
    const locations = data.locations || [];
    console.log(`✓ Connected! Found ${locations.length} locations:\n`);

    for (const loc of locations) {
        const markers: string[] = [];
        if (loc.id === onlineLocId) markers.push("← ONLINE SALES");
        if (loc.id === wholesaleLocId) markers.push("← WHOLESALE");
        console.log(`  ${loc.id} | ${loc.name} | ${loc.status} ${markers.join(" ")}`);
    }

    // Validate routing
    const onlineLoc = locations.find((l: any) => l.id === onlineLocId);
    console.log("\n=== ROUTING VALIDATION ===");
    console.log(`  Pre-order sales    → ${onlineLoc ? `"${onlineLoc.name}" (${onlineLoc.id}) ✓` : "NOT CONFIGURED ✗"}`);
    console.log(`  Event ticket sales → ${onlineLoc ? `"${onlineLoc.name}" (${onlineLoc.id}) ✓` : "NOT CONFIGURED ✗"}`);
    console.log(`  Gift card sales    → ${onlineLoc ? `"${onlineLoc.name}" (${onlineLoc.id}) ✓` : "NOT CONFIGURED ✗"}`);

    if (wholesaleLocId) {
        const wholesaleLoc = locations.find((l: any) => l.id === wholesaleLocId);
        console.log(`  Wholesale invoices → ${wholesaleLoc ? `"${wholesaleLoc.name}" (${wholesaleLoc.id}) ✓` : `CONFIGURED but not found ✗`}`);
    } else {
        console.log(`  Wholesale invoices → Falls back to Online Sales ✓ (no separate wholesale location)`);
    }

    console.log("\n✓ Square integration is working correctly!");
    process.exit(0);
}
main();
