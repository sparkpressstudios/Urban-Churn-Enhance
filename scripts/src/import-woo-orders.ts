/**
 * Import WooCommerce order history from WordPress XML export.
 *
 * Parses shop_order items from the WXR file and stores order-level
 * summaries so returning customers can see their past WooCommerce
 * orders in their dashboard.  Line-item detail isn't available in
 * standard WXR exports, so we store totals/dates/status only.
 *
 * Usage:  pnpm --filter @workspace/scripts import-woo-orders
 */
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { db, pool } from "@workspace/db";
import { wooOrderHistoryTable, customersTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";

const XML_PATH = new URL(
    "../../attached_assets/urbanchurn.WordPress.2026-04-08.xml",
    import.meta.url,
).pathname;

interface WooOrder {
    wooOrderId: number;
    email: string;
    customerName: string;
    status: string;
    totalCents: number;
    currency: string;
    paymentMethod: string;
    orderDate: Date;
    completedDate: Date | null;
}

const STATUS_MAP: Record<string, string> = {
    "wc-completed": "completed",
    "wc-processing": "processing",
    "wc-cancelled": "cancelled",
    "wc-refunded": "refunded",
    "wc-failed": "failed",
    "wc-pending": "pending",
    "wc-on-hold": "on_hold",
    "wc-readyforpickup": "ready_for_pickup",
    "wc-pre": "pre_order",
    "wc-firstorderpicked": "first_order_picked",
};

async function parseOrders(): Promise<WooOrder[]> {
    const orders: WooOrder[] = [];

    return new Promise((resolve, reject) => {
        const rl = createInterface({
            input: createReadStream(XML_PATH, "utf-8"),
        });

        let inItem = false;
        let buf = "";
        let currentType = "";

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
                    const order = processOrder(buf);
                    if (order) orders.push(order);
                }
            }
        });

        rl.on("close", () => {
            console.log(`Parsed ${orders.length} orders from XML`);
            resolve(orders);
        });

        rl.on("error", reject);
    });
}

function processOrder(buf: string): WooOrder | null {
    // Extract all meta key/value pairs
    const metaRegex =
        /<wp:meta_key><!\[CDATA\[([^\]]*)\]\]>[\s\S]*?<wp:meta_value><!\[CDATA\[([\s\S]*?)\]\]>/g;
    const meta: Record<string, string> = {};
    let m: RegExpExecArray | null;
    while ((m = metaRegex.exec(buf)) !== null) {
        meta[m[1]] = m[2].trim();
    }

    const email = meta._billing_email?.toLowerCase().trim();
    if (!email) return null;

    // Extract post_id (= woo order id)
    const idMatch = buf.match(/<wp:post_id>(\d+)<\/wp:post_id>/);
    if (!idMatch) return null;
    const wooOrderId = parseInt(idMatch[1], 10);

    // Extract order date
    const dateMatch = buf.match(/<wp:post_date><!\[CDATA\[([^\]]*)\]\]>/);
    const orderDateStr = dateMatch ? dateMatch[1] : null;
    if (!orderDateStr) return null;

    // Extract status
    const statusMatch = buf.match(/<wp:status><!\[CDATA\[([^\]]*)\]\]>/);
    const rawStatus = statusMatch ? statusMatch[1] : "wc-completed";
    const status = STATUS_MAP[rawStatus] || rawStatus.replace("wc-", "");

    // Parse total (dollars → cents)
    const totalStr = meta._order_total || "0";
    const totalCents = Math.round(parseFloat(totalStr) * 100);

    const currency = meta._order_currency || "USD";
    const paymentMethod = meta._payment_method_title || meta._payment_method || "";

    // Completed date
    let completedDate: Date | null = null;
    if (meta._completed_date) {
        completedDate = new Date(meta._completed_date);
        if (isNaN(completedDate.getTime())) completedDate = null;
    }

    const customerName = [meta._billing_first_name, meta._billing_last_name]
        .filter(Boolean)
        .join(" ");

    return {
        wooOrderId,
        email,
        customerName,
        status,
        totalCents,
        currency,
        paymentMethod,
        orderDate: new Date(orderDateStr),
        completedDate,
    };
}

async function main() {
    console.log("Parsing WordPress XML export for order history...");
    const orders = await parseOrders();

    // Build email → customerId lookup
    const allCustomers = await db
        .select({ id: customersTable.id, email: customersTable.email })
        .from(customersTable);

    const emailToCustomerId = new Map<string, number>();
    for (const c of allCustomers) {
        emailToCustomerId.set(c.email.toLowerCase(), c.id);
    }

    let inserted = 0;
    let skipped = 0;
    let errors = 0;

    // Batch insert in chunks
    const BATCH_SIZE = 100;
    for (let i = 0; i < orders.length; i += BATCH_SIZE) {
        const batch = orders.slice(i, i + BATCH_SIZE);
        const values = batch.map((o) => ({
            wooOrderId: o.wooOrderId,
            customerEmail: o.email,
            customerId: emailToCustomerId.get(o.email) ?? null,
            customerName: o.customerName,
            status: o.status,
            totalCents: o.totalCents,
            currency: o.currency,
            paymentMethod: o.paymentMethod,
            orderDate: o.orderDate,
            completedDate: o.completedDate,
        }));

        try {
            await db
                .insert(wooOrderHistoryTable)
                .values(values)
                .onConflictDoNothing({ target: wooOrderHistoryTable.wooOrderId });

            inserted += batch.length;
        } catch (err: any) {
            // Fall back to one-by-one if batch fails
            for (const val of values) {
                try {
                    await db
                        .insert(wooOrderHistoryTable)
                        .values(val)
                        .onConflictDoNothing({ target: wooOrderHistoryTable.wooOrderId });
                    inserted++;
                } catch {
                    errors++;
                }
            }
        }

        if ((i + BATCH_SIZE) % 500 === 0 || i + BATCH_SIZE >= orders.length) {
            console.log(`  Progress: ${Math.min(i + BATCH_SIZE, orders.length)}/${orders.length}`);
        }
    }

    // Summary
    const [stats] = await db
        .select({
            total: sql<number>`COUNT(*)`,
            completed: sql<number>`COUNT(*) FILTER (WHERE ${wooOrderHistoryTable.status} = 'completed')`,
            uniqueEmails: sql<number>`COUNT(DISTINCT ${wooOrderHistoryTable.customerEmail})`,
            linked: sql<number>`COUNT(*) FILTER (WHERE ${wooOrderHistoryTable.customerId} IS NOT NULL)`,
        })
        .from(wooOrderHistoryTable);

    console.log(`\n✅ Import complete:`);
    console.log(`   Total orders in DB: ${stats.total}`);
    console.log(`   Completed: ${stats.completed}`);
    console.log(`   Unique customers: ${stats.uniqueEmails}`);
    console.log(`   Linked to accounts: ${stats.linked}`);
    console.log(`   Errors: ${errors}`);

    await pool.end();
}

main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
});
