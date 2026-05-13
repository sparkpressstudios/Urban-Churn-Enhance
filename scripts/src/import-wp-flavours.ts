// Import WooCommerce products from WordPress XML as inactive flavours
// Usage: npx tsx src/import-wp-flavours.ts

import { db } from "@workspace/db";
import { flavoursTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import * as fs from "fs";

const SKIP_CATEGORIES = new Set([
    "eventer",
    "Ticket",
    "Scoop For Funds",
    "Events",
    "Ice Cream Club",
    "Merch",
]);

interface WpProduct {
    title: string;
    slug: string;
    status: string;
    price: string;
    postDate: string;
    cats: string[];
    description: string;
    emoji: string;
}

function cleanTitle(raw: string): string {
    // Remove CDATA wrapper if present
    let t = raw.replace(/<!\[CDATA\[/, "").replace(/\]\]>/, "").trim();
    return t;
}

function extractEmoji(title: string): { emoji: string; cleanName: string } {
    // Extract leading emoji(s) from title
    const emojiRegex = /^([\p{Emoji}\p{Emoji_Modifier}\p{Emoji_Component}\p{Emoji_Modifier_Base}\p{Emoji_Presentation}\u200d\ufe0f]+)\s*/u;
    const match = title.match(emojiRegex);
    if (match) {
        return { emoji: match[1].trim(), cleanName: title.slice(match[0].length).trim() };
    }
    return { emoji: "🍦", cleanName: title };
}

function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
}

function mapTag(cats: string[], status: string): "classic" | "limited" | "seasonal" | "fan-favorite" | "adventurous" | "bestseller" | "coming-soon" {
    if (cats.some((c) => c.includes("Branded Pints"))) return "classic";
    if (cats.some((c) => c.includes("hidden"))) return "classic";
    if (cats.some((c) => c.includes("Pre-Orders") || c.includes("Special Pre-Orders")))
        return "limited";
    if (cats.some((c) => c.includes("Thanksgiving"))) return "seasonal";
    if (cats.some((c) => c.includes("Easter"))) return "seasonal";
    if (cats.some((c) => c.includes("Online Sales"))) return "classic";
    return "classic";
}

async function main() {
    const xmlPath = process.argv[2] || "attached_assets/urbanchurn.WordPress.2026-04-08.xml";
    const xml = fs.readFileSync(xmlPath, "utf-8");

    // Parse products from XML
    const items = xml.split("<item>").slice(1);
    const products: WpProduct[] = [];

    for (const item of items) {
        const ptMatch = item.match(
            /<wp:post_type><!\[CDATA\[product\]\]><\/wp:post_type>/
        );
        if (!ptMatch) continue;

        const titleRaw =
            (item.match(/<title>(.*?)<\/title>/) || [])[1] || "";
        const title = cleanTitle(titleRaw);
        const slug =
            (
                item.match(
                    /<wp:post_name><!\[CDATA\[(.*?)\]\]><\/wp:post_name>/
                ) || []
            )[1] || "";
        const status =
            (
                item.match(
                    /<wp:status><!\[CDATA\[(.*?)\]\]><\/wp:status>/
                ) || []
            )[1] || "";
        const postDate =
            (
                item.match(
                    /<wp:post_date><!\[CDATA\[(.*?)\]\]><\/wp:post_date>/
                ) || []
            )[1] || "";

        // Extract description
        const descMatch = item.match(
            /<content:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/content:encoded>/
        );
        const description = descMatch
            ? descMatch[1].replace(/<[^>]+>/g, "").trim()
            : "";

        // Extract price
        const priceRe =
            /<wp:meta_key><!\[CDATA\[_regular_price\]\]><\/wp:meta_key>\s*<wp:meta_value><!\[CDATA\[(.*?)\]\]><\/wp:meta_value>/;
        const pm = item.match(priceRe);
        const price = pm ? pm[1] : "";

        // Extract categories
        const cats: string[] = [];
        const catRegex =
            /<category domain="([^"]+)" nicename="([^"]+)"><!\[CDATA\[(.*?)\]\]><\/category>/g;
        let m;
        while ((m = catRegex.exec(item)) !== null) {
            if (m[1] === "product_cat") cats.push(m[3]);
        }

        const { emoji } = extractEmoji(title);
        products.push({ title, slug, status, price, postDate, cats, description, emoji });
    }

    // Filter: skip trash, skip non-ice-cream categories, skip empty slugs/duplicates
    const seen = new Set<string>();
    const toImport: WpProduct[] = [];

    for (const p of products) {
        // Skip trash
        if (p.status === "trash") continue;
        // Skip if all categories are in skip list
        if (p.cats.length > 0 && p.cats.every((c) => SKIP_CATEGORIES.has(c))) continue;
        // Skip empty slugs or test products
        if (!p.slug || p.slug.includes("__trashed") || p.slug.includes("woocommerce-automated"))
            continue;
        // Skip very short titles (junk entries like "S")
        if (p.title.length <= 2) continue;
        // Deduplicate by slug
        if (seen.has(p.slug)) continue;
        seen.add(p.slug);
        toImport.push(p);
    }

    console.log(`Found ${products.length} total WP products`);
    console.log(`After filtering: ${toImport.length} to import`);

    // Get existing flavours
    const existing = await db.select().from(flavoursTable);
    const existingSlugs = new Set(existing.map((f) => f.slug));
    const existingNames = new Set(existing.map((f) => f.name.toLowerCase()));

    const missing = toImport.filter((p) => {
        const { cleanName } = extractEmoji(p.title);
        const normalizedSlug = slugify(cleanName);
        return (
            !existingSlugs.has(p.slug) &&
            !existingSlugs.has(normalizedSlug) &&
            !existingNames.has(cleanName.toLowerCase()) &&
            !existingNames.has(p.title.toLowerCase())
        );
    });

    console.log(`Existing in DB: ${existing.length}`);
    console.log(`Missing (to import): ${missing.length}`);
    console.log();

    if (missing.length === 0) {
        console.log("Nothing to import!");
        process.exit(0);
    }

    // Import missing as inactive
    let imported = 0;
    for (const p of missing) {
        const { emoji, cleanName } = extractEmoji(p.title);
        const slug = p.slug || slugify(cleanName);
        const tag = mapTag(p.cats, p.status);
        const basePrice = p.price && parseFloat(p.price) > 0 ? p.price : "7.00";
        const publishedAt = p.postDate ? new Date(p.postDate + " UTC") : new Date();

        // Make slug unique if needed
        let finalSlug = slug;
        let attempt = 0;
        while (existingSlugs.has(finalSlug)) {
            attempt++;
            finalSlug = `${slug}-${attempt}`;
        }

        try {
            await db.insert(flavoursTable).values({
                name: cleanName || p.title,
                slug: finalSlug,
                description: p.description.substring(0, 500),
                emoji,
                basePrice,
                tag,
                available: false, // INACTIVE / draft - don't show on website
                sortOrder: 0,
                publishedAt,
            });
            existingSlugs.add(finalSlug);
            existingNames.add((cleanName || p.title).toLowerCase());
            imported++;
            console.log(`✓ Imported: ${cleanName || p.title} (slug: ${finalSlug}, tag: ${tag}, date: ${p.postDate})`);
        } catch (err: any) {
            console.error(`✗ Failed: ${cleanName || p.title} (slug: ${finalSlug}): ${err.message}`);
        }
    }

    console.log(`\nDone! Imported ${imported} flavours as INACTIVE.`);
    process.exit(0);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
