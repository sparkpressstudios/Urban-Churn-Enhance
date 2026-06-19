import { db } from "@workspace/db";
import { locationsTable, locationHoursTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

type HourSpec = { openTime: string; closeTime: string; isClosed: boolean };

/** dayOfWeek: 0=Sunday .. 6=Saturday */
const HOURS_BY_SLUG: Record<string, Record<number, HourSpec>> = {
    harrisburg: {
        0: { openTime: "00:00", closeTime: "00:00", isClosed: true },
        1: { openTime: "14:00", closeTime: "21:00", isClosed: false },
        2: { openTime: "14:00", closeTime: "21:00", isClosed: false },
        3: { openTime: "14:00", closeTime: "21:00", isClosed: false },
        4: { openTime: "14:00", closeTime: "21:00", isClosed: false },
        5: { openTime: "12:00", closeTime: "21:00", isClosed: false },
        6: { openTime: "12:00", closeTime: "21:00", isClosed: false },
    },
    "carlisle-pike": {
        0: { openTime: "11:00", closeTime: "21:00", isClosed: false },
        1: { openTime: "11:00", closeTime: "22:00", isClosed: false },
        2: { openTime: "11:00", closeTime: "22:00", isClosed: false },
        3: { openTime: "11:00", closeTime: "22:00", isClosed: false },
        4: { openTime: "11:00", closeTime: "22:00", isClosed: false },
        5: { openTime: "11:00", closeTime: "22:00", isClosed: false },
        6: { openTime: "11:00", closeTime: "22:00", isClosed: false },
    },
    carlisle: {
        0: { openTime: "11:00", closeTime: "21:00", isClosed: false },
        1: { openTime: "11:00", closeTime: "22:00", isClosed: false },
        2: { openTime: "11:00", closeTime: "22:00", isClosed: false },
        3: { openTime: "11:00", closeTime: "22:00", isClosed: false },
        4: { openTime: "11:00", closeTime: "22:00", isClosed: false },
        5: { openTime: "11:00", closeTime: "22:00", isClosed: false },
        6: { openTime: "11:00", closeTime: "22:00", isClosed: false },
    },
    "louise-drive": {
        0: { openTime: "09:00", closeTime: "21:00", isClosed: false },
        1: { openTime: "07:30", closeTime: "22:00", isClosed: false },
        2: { openTime: "07:30", closeTime: "22:00", isClosed: false },
        3: { openTime: "07:30", closeTime: "22:00", isClosed: false },
        4: { openTime: "07:30", closeTime: "22:00", isClosed: false },
        5: { openTime: "07:30", closeTime: "22:00", isClosed: false },
        6: { openTime: "09:00", closeTime: "22:00", isClosed: false },
    },
};

async function main() {
    const locations = await db.select().from(locationsTable);
    let updated = 0;

    for (const loc of locations) {
        const spec = HOURS_BY_SLUG[loc.slug];
        if (!spec) {
            console.log(`⏭️  Skipping ${loc.slug} (no hours spec)`);
            continue;
        }

        for (let day = 0; day <= 6; day++) {
            const hour = spec[day];
            const result = await db
                .update(locationHoursTable)
                .set({
                    openTime: hour.openTime,
                    closeTime: hour.closeTime,
                    isClosed: hour.isClosed,
                })
                .where(
                    and(
                        eq(locationHoursTable.locationId, loc.id),
                        eq(locationHoursTable.dayOfWeek, day),
                        eq(locationHoursTable.setNumber, 1),
                    ),
                )
                .returning({ id: locationHoursTable.id });

            if (result.length > 0) updated++;
        }

        console.log(`✅ Updated hours for ${loc.name} (${loc.slug})`);
    }

    console.log(`\nDone — ${updated} hour rows updated.`);
    process.exit(0);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
