import { db } from "@workspace/db";
import { settingsTable } from "@workspace/db/schema";
import { eq, inArray } from "drizzle-orm";
import { sendFlavourPickupUpdateToCustomers } from "./email";

const JOB_KEY = "pending_flavour_pickup_email";
const ANNOUNCEMENT_CLEAR_DONE_KEY = "announcement_cleared_2026_07_11";
const ANNOUNCEMENT_KEYS = [
    "announcement_text",
    "announcement_link",
    "announcement_link_text",
    "announcement_enabled",
] as const;

interface PendingFlavourPickupJob {
    preOrderWindowIds: number[];
    pickupStartLabel?: string;
    subject?: string;
    message?: string;
}

async function upsertSetting(key: string, value: string) {
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
        return;
    }

    await db.insert(settingsTable).values({ key, value });
}

/** One-time startup job: disable and clear the site-wide announcement bar. */
export async function clearAnnouncementBarOnce() {
    const [done] = await db
        .select()
        .from(settingsTable)
        .where(eq(settingsTable.key, ANNOUNCEMENT_CLEAR_DONE_KEY))
        .limit(1);

    if (done) return;

    const rows = await db
        .select()
        .from(settingsTable)
        .where(inArray(settingsTable.key, [...ANNOUNCEMENT_KEYS]));

    const current: Record<string, string> = {};
    for (const row of rows) {
        current[row.key] = row.value;
    }

    const wasEnabled = current.announcement_enabled === "true";
    const hadText = Boolean(current.announcement_text?.trim());

    if (!wasEnabled && !hadText) {
        await upsertSetting(ANNOUNCEMENT_CLEAR_DONE_KEY, "true");
        return;
    }

    console.log("[PENDING-JOB] Clearing site-wide announcement bar");

    await upsertSetting("announcement_enabled", "false");
    await upsertSetting("announcement_text", "");
    await upsertSetting("announcement_link", "");
    await upsertSetting("announcement_link_text", "");
    await upsertSetting(ANNOUNCEMENT_CLEAR_DONE_KEY, "true");

    console.log("[PENDING-JOB] Announcement bar cleared");
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
