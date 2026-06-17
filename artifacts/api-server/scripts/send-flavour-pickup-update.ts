/**
 * Send pickup-date update to customers who ordered specific pre-order windows.
 *
 * Usage:
 *   pnpm exec tsx scripts/send-flavour-pickup-update.ts [--dry-run]
 */
import { sendFlavourPickupUpdateToCustomers } from "../src/lib/email";

const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
    const result = await sendFlavourPickupUpdateToCustomers({
        preOrderWindowIds: [29, 30],
        pickupStartLabel: "Tuesday, July 1, 2026",
        subject: "Important update: your Urban Churn pre-order pickup starts July 1",
        message:
            "Thank you for your pre-order! We wanted to let you know that pickup for German Chocolate Cake Ice Cream and Dark Soul Peanut Butter Cup will begin on Tuesday, July 1, 2026. " +
            "We'll send you another email when your order is ready for pickup at your selected location. Thank you for your patience!",
        dryRun: DRY_RUN,
    });

    console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
