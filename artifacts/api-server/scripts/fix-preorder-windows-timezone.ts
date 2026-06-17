/**
 * One-time fix: recover Eastern wall-clock intent from mis-stored UTC timestamps,
 * then reopen windows that should still be accepting orders.
 *
 * Usage: pnpm exec tsx scripts/fix-preorder-windows-timezone.ts [--dry-run]
 */
import { db } from "@workspace/db";
import { productPreOrdersTable, preOrderLocationsTable } from "@workspace/db/schema";
import { eq, inArray } from "drizzle-orm";
import { recoverMisstoredEasternDate } from "../src/lib/business-timezone";

const DRY_RUN = process.argv.includes("--dry-run");
const WINDOW_IDS = [29, 30];

async function main() {
    const now = new Date();
    console.log(`[fix-preorder-tz] now=${now.toISOString()} dryRun=${DRY_RUN}`);

    const windows = await db
        .select()
        .from(productPreOrdersTable)
        .where(inArray(productPreOrdersTable.id, WINDOW_IDS));

    for (const window of windows) {
        const fixed = {
            preOrderStart: recoverMisstoredEasternDate(window.preOrderStart),
            preOrderEnd: recoverMisstoredEasternDate(window.preOrderEnd),
            pickupDate: recoverMisstoredEasternDate(window.pickupDate),
            pickupEndDate: window.pickupEndDate
                ? recoverMisstoredEasternDate(window.pickupEndDate)
                : null,
        };

        const shouldBeOpen =
            fixed.preOrderStart <= now &&
            fixed.preOrderEnd > now &&
            window.status !== "cancelled";

        console.log(`[window ${window.id}]`, {
            before: {
                preOrderStart: window.preOrderStart,
                preOrderEnd: window.preOrderEnd,
                pickupDate: window.pickupDate,
                status: window.status,
            },
            after: {
                ...fixed,
                status: shouldBeOpen ? "open" : window.status,
            },
        });

        if (!DRY_RUN) {
            await db
                .update(productPreOrdersTable)
                .set({
                    preOrderStart: fixed.preOrderStart,
                    preOrderEnd: fixed.preOrderEnd,
                    pickupDate: fixed.pickupDate,
                    pickupEndDate: fixed.pickupEndDate,
                    status: shouldBeOpen ? "open" : window.status,
                    updatedAt: now,
                })
                .where(eq(productPreOrdersTable.id, window.id));
        }
    }

    const locRows = await db
        .select()
        .from(preOrderLocationsTable)
        .where(inArray(preOrderLocationsTable.preOrderId, WINDOW_IDS));

    for (const row of locRows) {
        if (!row.pickupStartDate) continue;
        const fixedPickup = recoverMisstoredEasternDate(row.pickupStartDate);
        console.log(`[location override preOrder=${row.preOrderId} loc=${row.locationId}]`, {
            before: row.pickupStartDate,
            after: fixedPickup,
        });
        if (!DRY_RUN) {
            await db
                .update(preOrderLocationsTable)
                .set({ pickupStartDate: fixedPickup })
                .where(eq(preOrderLocationsTable.id, row.id));
        }
    }

    console.log("[fix-preorder-tz] done");
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
