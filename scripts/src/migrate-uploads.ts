import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { pool } from "@workspace/db";

const MIME_MAP: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
};

async function main() {
    const uploadsDir = join(process.cwd(), "../artifacts/api-server/uploads");

    let files: string[];
    try {
        files = readdirSync(uploadsDir).filter((f) => {
            const ext = extname(f).toLowerCase();
            return MIME_MAP[ext] && statSync(join(uploadsDir, f)).isFile();
        });
    } catch {
        console.log("No uploads directory found, nothing to migrate.");
        await pool.end();
        return;
    }

    console.log(`Found ${files.length} file(s) to migrate`);

    for (const filename of files) {
        const filepath = join(uploadsDir, filename);
        const ext = extname(filename).toLowerCase();
        const mimeType = MIME_MAP[ext] || "application/octet-stream";
        const data = readFileSync(filepath);

        try {
            await pool.query(
                `INSERT INTO media (filename, mime_type, size_bytes, data)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (filename) DO NOTHING`,
                [filename, mimeType, data.length, data],
            );
            console.log(`  OK: ${filename} (${(data.length / 1024).toFixed(1)} KB)`);
        } catch (err: any) {
            console.log(`  ERR: ${filename} — ${err.message}`);
        }
    }

    console.log("Migration complete");
    await pool.end();
}

main();
