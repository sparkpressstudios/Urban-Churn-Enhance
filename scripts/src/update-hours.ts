import { db } from "@workspace/db";
import { locationsTable, locationHoursTable } from "@workspace/db/schema";
import { eq, and, ne } from "drizzle-orm";

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
    "louise-drive": {
        0: { openTime: "09:00", closeTime: "21:00", isClosed: false },
        1: { openTime: "07:30", closeTime: "21:00", isClosed: false },
        2: { openTime: "07:30", closeTime: "21:00", isClosed: false },
        3: { openTime: "07:30", closeTime: "21:00", isClosed: false },
        4: { openTime: "07:30", closeTime: "21:00", isClosed: false },
        5: { openTime: "07:30", closeTime: "22:00", isClosed: false },
        6: { openTime: "09:00", closeTime: "22:00", isClosed: false },
    },
    "carlisle-pike": {
        0: { openTime: "12:00", closeTime: "21:00", isClosed: false },
        1: { openTime: "12:00", closeTime: "21:00", isClosed: false },
        2: { openTime: "12:00", closeTime: "21:00", isClosed: false },
        3: { openTime: "12:00", closeTime: "21:00", isClosed: false },
        4: { openTime: "12:00", closeTime: "21:00", isClosed: false },
        5: { openTime: "12:00", closeTime: "22:00", isClosed: false },
        6: { openTime: "12:00", closeTime: "22:00", isClosed: false },
    },
    carlisle: {
        0: { openTime: "12:00", closeTime: "21:00", isClosed: false },
        1: { openTime: "12:00", closeTime: "21:00", isClosed: false },
        2: { openTime: "12:00", closeTime: "21:00", isClosed: false },
        3: { openTime: "12:00", closeTime: "21:00", isClosed: false },
        4: { openTime: "12:00", closeTime: "21:00", isClosed: false },
        5: { openTime: "12:00", closeTime: "22:00", isClosed: false },
        6: { openTime: "12:00", closeTime: "22:00", isClosed: false },
    },
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatHour(hour: HourSpec): string {
    if (hour.isClosed) return "Closed";
    return `${hour.openTime}–${hour.closeTime}`;
}

async function main() {
    const locations = await db.select().from(locationsTable);
    let updated = 0;
    let inserted = 0;

    for (const loc of locations) {
        const spec = HOURS_BY_SLUG[loc.slug];
        if (!spec) {
            console.log(`⏭️  Skipping ${loc.slug} (no hours spec)`);
            continue;
        }

        // Drop leftover split-hour rows so public display uses a single set per day.
        await db
            .delete(locationHoursTable)
            .where(
                and(
                    eq(locationHoursTable.locationId, loc.id),
                    ne(locationHoursTable.setNumber, 1),
                ),
            );

        const summary: string[] = [];
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

            if (result.length > 0) {
                updated += result.length;
            } else {
                await db.insert(locationHoursTable).values({
                    locationId: loc.id,
                    dayOfWeek: day,
                    setNumber: 1,
                    openTime: hour.openTime,
                    closeTime: hour.closeTime,
                    isClosed: hour.isClosed,
                });
                inserted++;
            }
            summary.push(`${DAY_NAMES[day]} ${formatHour(hour)}`);
        }

        console.log(`✅ ${loc.name} (${loc.slug})`);
        console.log(`   ${summary.join(" | ")}`);
    }

    console.log(`\nDone — ${updated} rows updated, ${inserted} rows inserted.`);
    process.exit(0);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
