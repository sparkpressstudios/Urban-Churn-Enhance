import { db } from "@workspace/db";
import { settingsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const ANNOUNCEMENT_KEYS = [
    "announcement_text",
    "announcement_link",
    "announcement_link_text",
    "announcement_enabled",
] as const;

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

async function main() {
    console.log("Clearing site-wide announcement bar settings...");

    await upsertSetting("announcement_enabled", "false");
    await upsertSetting("announcement_text", "");
    await upsertSetting("announcement_link", "");
    await upsertSetting("announcement_link_text", "");

    console.log("Done. Announcement bar is disabled and cleared.");
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
