import { db, pool } from "@workspace/db";
import { eventsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

async function main() {
    const [updated] = await db
        .update(eventsTable)
        .set({ imageUrl: "/images/login-bg.jpg" })
        .where(eq(eventsTable.slug, "carlisle-tasting-may-2026"))
        .returning({ id: eventsTable.id, imageUrl: eventsTable.imageUrl });
    console.log("Updated:", updated);
    await pool.end();
}

main();
