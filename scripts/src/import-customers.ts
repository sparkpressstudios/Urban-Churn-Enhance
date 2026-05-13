import { readFileSync } from "node:fs";
import { db, pool } from "@workspace/db";
import { customersTable } from "@workspace/db/schema";
import { sql } from "drizzle-orm";
import { parse } from "csv-parse/sync";

const CSV_PATH = new URL(
    "../../lib/video/wc-customers-report-export-17736945287887.csv",
    import.meta.url,
).pathname;

interface Row {
    Name: string;
    Username: string;
    "Last Active": string;
    "Sign Up": string;
    Email: string;
    Orders: string;
    "Total Spend": string;
    AOV: string;
    "Country / Region": string;
    City: string;
    Region: string;
    "Postal Code": string;
}

async function main() {
    const csvContent = readFileSync(CSV_PATH, "utf-8");
    const rows: Row[] = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true,
    });

    console.log(`Found ${rows.length} customers in CSV`);

    let imported = 0;
    let skipped = 0;

    for (const row of rows) {
        const email = row.Email?.toLowerCase().trim();
        if (!email) {
            skipped++;
            console.log(`  SKIP: missing email`);
            continue;
        }

        // Split name
        let firstName = "";
        let lastName = "";
        const fullName = row.Name?.trim() || "";
        if (fullName) {
            const spaceIdx = fullName.indexOf(" ");
            if (spaceIdx > 0) {
                firstName = fullName.slice(0, spaceIdx);
                lastName = fullName.slice(spaceIdx + 1);
            } else {
                firstName = fullName;
            }
        }

        const hadWooAccount = !!(row.Username?.trim() || row["Sign Up"]?.trim());
        const ordersCount = parseInt(row.Orders || "0", 10) || 0;
        const totalSpentCents = Math.round(parseFloat(row["Total Spend"] || "0") * 100);

        try {
            await db
                .insert(customersTable)
                .values({
                    email,
                    firstName,
                    lastName,
                    city: row.City?.trim() || "",
                    state: row.Region?.trim() || "",
                    zip: row["Postal Code"]?.trim() || "",
                    country: row["Country / Region"]?.trim() || "US",
                    ordersCount,
                    totalSpentCents,
                    hasAccount: hadWooAccount,
                })
                .onConflictDoUpdate({
                    target: customersTable.email,
                    set: {
                        firstName,
                        lastName,
                        city: row.City?.trim() || "",
                        state: row.Region?.trim() || "",
                        zip: row["Postal Code"]?.trim() || "",
                        country: row["Country / Region"]?.trim() || "US",
                        ordersCount,
                        totalSpentCents,
                        hasAccount: sql`CASE WHEN ${customersTable.hasAccount} = TRUE THEN TRUE ELSE ${hadWooAccount} END`,
                        updatedAt: new Date(),
                    },
                });

            const tag = hadWooAccount ? " [ACCOUNT]" : "";
            console.log(`  OK: ${email} — ${firstName} ${lastName}${tag}`);
            imported++;
        } catch (err: any) {
            skipped++;
            console.log(`  ERR: ${email} — ${err.message}`);
        }
    }

    console.log(`\nDone! Imported: ${imported}, Skipped: ${skipped}`);
    await pool.end();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
