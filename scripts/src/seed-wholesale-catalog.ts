/**
 * Seeds wholesale size SKUs for all published flavours that don't yet have wholesale products.
 * Run: pnpm --filter @workspace/scripts run seed-wholesale-catalog
 */
import { db } from "@workspace/db";
import {
    flavoursTable,
    wholesaleFlavoursTable,
    wholesaleProductsTable,
    wholesaleSizesTable,
} from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

const DEFAULT_PRICE_CENTS = 4500; // $45.00 placeholder — update in admin matrix

async function main() {
    const sizes = await db
        .select()
        .from(wholesaleSizesTable)
        .where(eq(wholesaleSizesTable.active, true));

    if (sizes.length === 0) {
        console.log("No active wholesale sizes. Add sizes in admin first.");
        process.exit(0);
    }

    const flavours = await db.select().from(flavoursTable).where(eq(flavoursTable.available, true));

    let profilesCreated = 0;
    let productsCreated = 0;

    for (const flavour of flavours) {
        const [profile] = await db
            .select({ id: wholesaleFlavoursTable.id })
            .from(wholesaleFlavoursTable)
            .where(eq(wholesaleFlavoursTable.flavourId, flavour.id))
            .limit(1);

        if (!profile) {
            await db.insert(wholesaleFlavoursTable).values({
                flavourId: flavour.id,
                description: flavour.description || "",
                active: true,
                isSeasonal: flavour.tag === "seasonal",
            });
            profilesCreated++;
        }

        for (const size of sizes) {
            const [existing] = await db
                .select({ id: wholesaleProductsTable.id })
                .from(wholesaleProductsTable)
                .where(
                    and(
                        eq(wholesaleProductsTable.flavourId, flavour.id),
                        eq(wholesaleProductsTable.wholesaleSizeId, size.id),
                    ),
                )
                .limit(1);

            if (existing) continue;

            await db.insert(wholesaleProductsTable).values({
                flavourId: flavour.id,
                wholesaleSizeId: size.id,
                name: size.name,
                unitDescription: size.description || "",
                priceCents: DEFAULT_PRICE_CENTS,
                sizeCategory: size.sizeCategory,
                available: true,
            });
            productsCreated++;
        }
    }

    console.log(`Done. Created ${profilesCreated} wholesale flavour profiles and ${productsCreated} product rows.`);
    process.exit(0);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
