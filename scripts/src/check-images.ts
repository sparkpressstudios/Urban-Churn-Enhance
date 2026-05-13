import { pool } from "@workspace/db";

async function main() {
    // Check flavours table
    const flavours = await pool.query("SELECT id, name, slug, image_url FROM flavours ORDER BY id");
    console.log("=== FLAVOURS ===");
    for (const r of flavours.rows) {
        console.log(`  [${r.id}] ${r.name} => ${r.image_url || "(null)"}`);
    }

    // Check rotating_flavours table
    try {
        const rotating = await pool.query("SELECT id, name, image_url, month, year FROM rotating_flavours ORDER BY year DESC, month DESC");
        console.log("\n=== ROTATING FLAVOURS ===");
        for (const r of rotating.rows) {
            console.log(`  [${r.id}] ${r.name} (${r.month}/${r.year}) => ${r.image_url || "(null)"}`);
        }
    } catch (e: any) {
        console.log("\n rotating_flavours table not found:", e.message);
    }

    await pool.end();
}

main();
