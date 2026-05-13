/**
 * Enrich existing customers with data from WordPress/WooCommerce XML export.
 *
 * Parses shop_order items from the WXR file and extracts billing info
 * (phone, street address) that was missing from the original CSV import.
 * Uses the most recent order per customer email to get the latest info.
 *
 * Usage:  pnpm --filter @workspace/scripts enrich-from-wp-xml
 */
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { db, pool } from "@workspace/db";
import { customersTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";

const XML_PATH = new URL(
    "../../attached_assets/urbanchurn.WordPress.2026-04-08.xml",
    import.meta.url,
).pathname;

interface CustomerData {
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    firstName: string;
    lastName: string;
    wooCustomerId: number | null;
    orderDate: string; // to pick the most recent
}

/** Parse all shop_order items and collect per-email billing data (most recent wins). */
async function parseOrders(): Promise<Map<string, CustomerData>> {
    const customers = new Map<string, CustomerData>();

    return new Promise((resolve, reject) => {
        const rl = createInterface({
            input: createReadStream(XML_PATH, "utf-8"),
        });

        let inItem = false;
        let buf = "";
        let currentType = "";
        let ordersParsed = 0;

        rl.on("line", (line) => {
            if (line.includes("<item>")) {
                inItem = true;
                buf = "";
                currentType = "";
                return;
            }
            if (inItem) {
                buf += line + "\n";
                const typeMatch = line.match(
                    /<wp:post_type><!\[CDATA\[([^\]]+)\]\]>/,
                );
                if (typeMatch) currentType = typeMatch[1];
            }
            if (inItem && line.includes("</item>")) {
                inItem = false;
                if (currentType === "shop_order") {
                    ordersParsed++;
                    processOrder(buf, customers);
                }
            }
        });

        rl.on("close", () => {
            console.log(`Parsed ${ordersParsed} orders from XML`);
            console.log(
                `Found ${customers.size} unique customer emails with billing data`,
            );
            resolve(customers);
        });

        rl.on("error", reject);
    });
}

function processOrder(buf: string, customers: Map<string, CustomerData>) {
    // Extract all meta key/value pairs
    const metaRegex =
        /<wp:meta_key><!\[CDATA\[([^\]]*)\]\]>[\s\S]*?<wp:meta_value><!\[CDATA\[([\s\S]*?)\]\]>/g;
    const meta: Record<string, string> = {};
    let m: RegExpExecArray | null;
    while ((m = metaRegex.exec(buf)) !== null) {
        meta[m[1]] = m[2].trim();
    }

    const email = meta._billing_email?.toLowerCase().trim();
    if (!email) return;

    // Extract order date for "most recent wins" logic
    const dateMatch = buf.match(/<wp:post_date><!\[CDATA\[([^\]]*)\]\]>/);
    const orderDate = dateMatch ? dateMatch[1] : "1970-01-01";

    const existing = customers.get(email);
    if (existing && existing.orderDate > orderDate) {
        // Already have newer data for this customer
        return;
    }

    const wooIdStr = meta._customer_user;
    const wooCustomerId =
        wooIdStr && parseInt(wooIdStr, 10) > 0
            ? parseInt(wooIdStr, 10)
            : null;

    customers.set(email, {
        email,
        phone: meta._billing_phone || "",
        address: [meta._billing_address_1, meta._billing_address_2]
            .filter(Boolean)
            .join(", "),
        city: meta._billing_city || "",
        state: meta._billing_state || "",
        zip: meta._billing_postcode || "",
        country: meta._billing_country || "US",
        firstName: meta._billing_first_name || "",
        lastName: meta._billing_last_name || "",
        wooCustomerId,
        orderDate,
    });
}

async function main() {
    console.log("Parsing WordPress XML export...");
    const customers = await parseOrders();

    let enriched = 0;
    let created = 0;
    let skipped = 0;

    for (const [email, data] of customers) {
        try {
            // Upsert: update existing customers with missing fields, or create new ones
            const result = await db
                .insert(customersTable)
                .values({
                    email,
                    firstName: data.firstName,
                    lastName: data.lastName,
                    phone: data.phone,
                    address: data.address,
                    city: data.city,
                    state: data.state,
                    zip: data.zip,
                    country: data.country,
                    wooCustomerId: data.wooCustomerId,
                })
                .onConflictDoUpdate({
                    target: customersTable.email,
                    set: {
                        // Only fill in phone if currently empty
                        phone: sql`CASE WHEN ${customersTable.phone} = '' OR ${customersTable.phone} IS NULL THEN ${data.phone} ELSE ${customersTable.phone} END`,
                        // Only fill in address if currently empty
                        address: sql`CASE WHEN ${customersTable.address} = '' OR ${customersTable.address} IS NULL THEN ${data.address} ELSE ${customersTable.address} END`,
                        // Only fill in city if currently empty
                        city: sql`CASE WHEN ${customersTable.city} = '' OR ${customersTable.city} IS NULL THEN ${data.city} ELSE ${customersTable.city} END`,
                        // Only fill in state if currently empty
                        state: sql`CASE WHEN ${customersTable.state} = '' OR ${customersTable.state} IS NULL THEN ${data.state} ELSE ${customersTable.state} END`,
                        // Only fill in zip if currently empty
                        zip: sql`CASE WHEN ${customersTable.zip} = '' OR ${customersTable.zip} IS NULL THEN ${data.zip} ELSE ${customersTable.zip} END`,
                        // Only fill in country if currently empty or default
                        country: sql`CASE WHEN ${customersTable.country} = '' OR ${customersTable.country} IS NULL THEN ${data.country} ELSE ${customersTable.country} END`,
                        // Only fill in wooCustomerId if currently null
                        wooCustomerId: sql`CASE WHEN ${customersTable.wooCustomerId} IS NULL THEN ${data.wooCustomerId} ELSE ${customersTable.wooCustomerId} END`,
                        // Only update names if currently empty
                        firstName: sql`CASE WHEN ${customersTable.firstName} = '' OR ${customersTable.firstName} IS NULL THEN ${data.firstName} ELSE ${customersTable.firstName} END`,
                        lastName: sql`CASE WHEN ${customersTable.lastName} = '' OR ${customersTable.lastName} IS NULL THEN ${data.lastName} ELSE ${customersTable.lastName} END`,
                        updatedAt: new Date(),
                    },
                })
                .returning({ id: customersTable.id });

            // Check if this was an insert (new) or update (enrichment)
            // We can't easily tell from upsert, so just count
            enriched++;

            if (enriched % 200 === 0) {
                console.log(`  Processed ${enriched}/${customers.size}...`);
            }
        } catch (err: any) {
            skipped++;
            console.log(`  ERR: ${email} — ${err.message}`);
        }
    }

    // Print summary stats
    const [stats] = await db
        .select({
            total: sql<number>`COUNT(*)`,
            withPhone: sql<number>`COUNT(*) FILTER (WHERE ${customersTable.phone} != '')`,
            withAddress: sql<number>`COUNT(*) FILTER (WHERE ${customersTable.address} != '')`,
            withWooId: sql<number>`COUNT(*) FILTER (WHERE ${customersTable.wooCustomerId} IS NOT NULL)`,
        })
        .from(customersTable);

    console.log(`\n=== RESULTS ===`);
    console.log(`Processed: ${enriched}, Skipped: ${skipped}`);
    console.log(`\nCustomer DB stats after enrichment:`);
    console.log(`  Total customers: ${stats.total}`);
    console.log(`  With phone: ${stats.withPhone}`);
    console.log(`  With street address: ${stats.withAddress}`);
    console.log(`  With WooCommerce ID: ${stats.withWooId}`);

    await pool.end();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
