import { db } from "@workspace/db";
import { settingsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { sendFlavourPickupUpdateToCustomers } from "./email";

const JOB_KEY = "pending_flavour_pickup_email";

interface PendingFlavourPickupJob {
    preOrderWindowIds: number[];
    pickupStartLabel?: string;
    subject?: string;
    message?: string;
}

export async function runPendingFlavourPickupEmailIfNeeded() {
    const [row] = await db
        .select()
        .from(settingsTable)
        .where(eq(settingsTable.key, JOB_KEY))
        .limit(1);

    if (!row?.value) return;

    let job: PendingFlavourPickupJob;
    try {
        job = JSON.parse(row.value) as PendingFlavourPickupJob;
    } catch {
        console.error("[PENDING-JOB] Invalid pending_flavour_pickup_email JSON — clearing");
        await db.delete(settingsTable).where(eq(settingsTable.key, JOB_KEY));
        return;
    }

    if (!job.preOrderWindowIds?.length) {
        await db.delete(settingsTable).where(eq(settingsTable.key, JOB_KEY));
        return;
    }

    console.log("[PENDING-JOB] Running flavour pickup email job for windows:", job.preOrderWindowIds);

    try {
        const result = await sendFlavourPickupUpdateToCustomers({
            preOrderWindowIds: job.preOrderWindowIds,
            pickupStartLabel: job.pickupStartLabel || "Tuesday, July 1, 2026",
            subject: job.subject,
            message: job.message,
            dryRun: false,
        });
        console.log("[PENDING-JOB] Flavour pickup email job complete:", {
            totalRecipients: result.totalRecipients,
            emailsSent: result.emailsSent,
            emailsFailed: result.emailsFailed,
        });
    } catch (err) {
        console.error("[PENDING-JOB] Flavour pickup email job failed:", err);
        return;
    }

    await db.delete(settingsTable).where(eq(settingsTable.key, JOB_KEY));
}
