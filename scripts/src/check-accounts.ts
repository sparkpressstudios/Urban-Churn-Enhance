import { db, pool } from "@workspace/db";
import { sql } from "drizzle-orm";

async function main() {
    const stats = await db.execute(sql`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE has_account = true) as with_account_flag,
        COUNT(*) FILTER (WHERE password_hash IS NOT NULL AND password_hash != '') as with_password,
        COUNT(*) FILTER (WHERE has_account = true AND (password_hash IS NULL OR password_hash = '')) as account_no_password,
        COUNT(*) FILTER (WHERE has_account = false AND (password_hash IS NULL OR password_hash = '')) as no_account_no_password
      FROM customers
    `);
    console.log(stats.rows[0]);
    await pool.end();
}
main();
