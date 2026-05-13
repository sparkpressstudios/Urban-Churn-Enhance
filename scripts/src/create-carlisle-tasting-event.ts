import { db, pool } from "@workspace/db";
import {
    eventsTable,
    eventTicketTypesTable,
    locationsTable,
} from "@workspace/db/schema";
import { eq } from "drizzle-orm";

async function createEvent() {
    // Find the Carlisle location
    const [carlisleLocation] = await db
        .select()
        .from(locationsTable)
        .where(eq(locationsTable.slug, "carlisle"));

    if (!carlisleLocation) {
        console.error("❌ Carlisle location not found");
        await pool.end();
        process.exit(1);
    }

    const description = `<strong>WHAT'S INCLUDED:</strong>
• 4 tasting courses
• 12 total ice cream flavors
• A mix of upcoming seasonal flavors, sneak peeks, and a few fun surprise throwbacks
• A chance to give feedback and help shape future Urban Churn flavors
• Complimentary hot chocolate, hot tea &amp; coffee bar
• Charcuterie boards to enjoy throughout the evening
• ONE complimentary pint to take home 🍦
– Choose your favorite flavor from the tasting
– OR select any pint from our dipping cabinet or merch freezer

These tastings are equal parts fun, interactive, and delicious — and they often sell out.
Seats are limited.
Mark your calendar for May 18th — we can't wait to taste with you.`;

    const [event] = await db
        .insert(eventsTable)
        .values({
            title: "Ice Cream Tasting — Carlisle Scoop Shop",
            slug: "carlisle-tasting-may-2026",
            description,
            imageUrl: null,
            locationId: carlisleLocation.id,
            venueName: "Urban Churn, Carlisle Scoop Shop",
            venueAddress: "258 Westminster Drive, South Middleton Township, PA 17013",
            eventDate: "2026-05-18",
            startTime: "18:00",
            endTime: "20:00",
            category: "tasting",
            status: "published",
            isPrivate: false,
            accentColor: "#A1AB74",
            sortOrder: 0,
            active: true,
        })
        .returning();

    console.log(`✅ Created event: "${event.title}" (ID: ${event.id})`);

    // 42 total capacity, 6 already reserved from rescheduled event → 36 available
    const [ticketType] = await db
        .insert(eventTicketTypesTable)
        .values({
            eventId: event.id,
            name: "General Admission",
            description:
                "Guided sit-down ice cream tasting experience — 4 courses, 12 flavors, charcuterie, complimentary pint to take home",
            priceCents: 3500,
            quantity: 42,
            quantitySold: 6,
            maxPerOrder: 6,
            sortOrder: 1,
        })
        .returning();

    console.log(
        `✅ Created ticket type: "${ticketType.name}" — $${(ticketType.priceCents / 100).toFixed(2)} × ${ticketType.quantity} capacity (${ticketType.quantity - ticketType.quantitySold} available)`
    );

    console.log("\n🎉 Carlisle tasting event created successfully!");
    await pool.end();
}

createEvent().catch((e) => {
    console.error("❌ Failed to create event:", e);
    process.exit(1);
});
