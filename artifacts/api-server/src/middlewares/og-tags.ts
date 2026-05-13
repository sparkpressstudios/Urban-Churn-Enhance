import { type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { flavoursTable, eventsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import * as fs from "node:fs";
import * as path from "node:path";

const PUBLIC_URL = process.env.PUBLIC_URL || "https://urbanchurn.com";
const DEFAULT_OG_IMAGE = `${PUBLIC_URL}/opengraph.jpg`;

// Cache the index.html template in memory
let indexHtml: string | null = null;

// At build time, import.meta.dirname is replaced with the bundled __dirname
// (api-server/dist), so go up 3 levels to the workspace root — same as app.ts.
const workspaceRoot = path.resolve(import.meta.dirname, "../../..");

function getIndexHtml(): string {
    if (!indexHtml) {
        const htmlPath = path.resolve(
            workspaceRoot,
            "artifacts/urban-churn/dist/public/index.html",
        );
        indexHtml = fs.readFileSync(htmlPath, "utf-8");
    }
    return indexHtml;
}

/** Resolve a possibly-relative image URL to an absolute URL */
function resolveImageUrl(imageUrl: string | null): string {
    if (!imageUrl) return DEFAULT_OG_IMAGE;
    if (imageUrl.startsWith("http")) return imageUrl;
    // Relative URL like /api/uploads/filename
    return `${PUBLIC_URL}${imageUrl.startsWith("/") ? "" : "/"}${imageUrl}`;
}

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

interface OgData {
    title: string;
    description: string;
    image: string;
    url: string;
    type?: string;
}

function injectOgTags(html: string, og: OgData): string {
    const title = escapeHtml(og.title);
    const description = escapeHtml(og.description);
    const image = escapeHtml(og.image);
    const url = escapeHtml(og.url);
    const type = og.type || "website";

    // Replace <title>
    html = html.replace(
        /<title>[^<]*<\/title>/,
        `<title>${title}</title>`,
    );

    // Replace meta description
    html = html.replace(
        /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/,
        `<meta name="description" content="${description}" />`,
    );

    // Replace canonical
    html = html.replace(
        /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/,
        `<link rel="canonical" href="${url}" />`,
    );

    // OG tags
    html = html.replace(
        /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/,
        `<meta property="og:title" content="${title}" />`,
    );
    html = html.replace(
        /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/,
        `<meta property="og:description" content="${description}" />`,
    );
    html = html.replace(
        /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/,
        `<meta property="og:url" content="${url}" />`,
    );
    html = html.replace(
        /<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/,
        `<meta property="og:image" content="${image}" />`,
    );
    html = html.replace(
        /<meta\s+property="og:image:alt"\s+content="[^"]*"\s*\/?>/,
        `<meta property="og:image:alt" content="${title}" />`,
    );
    html = html.replace(
        /<meta\s+property="og:type"\s+content="[^"]*"\s*\/?>/,
        `<meta property="og:type" content="${type}" />`,
    );

    // Twitter tags
    html = html.replace(
        /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/,
        `<meta name="twitter:title" content="${title}" />`,
    );
    html = html.replace(
        /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/,
        `<meta name="twitter:description" content="${description}" />`,
    );
    html = html.replace(
        /<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?>/,
        `<meta name="twitter:image" content="${image}" />`,
    );
    html = html.replace(
        /<meta\s+name="twitter:image:alt"\s+content="[^"]*"\s*\/?>/,
        `<meta name="twitter:image:alt" content="${title}" />`,
    );

    return html;
}

// Route patterns for shareable pages
const PRODUCT_PATTERN = /^\/pre-order\/([^/]+)\/?$/;
const EVENT_PATTERN = /^\/events\/([^/]+)\/?$/;

async function getProductOg(slug: string): Promise<OgData | null> {
    const [flavour] = await db
        .select({
            name: flavoursTable.name,
            description: flavoursTable.description,
            imageUrl: flavoursTable.imageUrl,
            slug: flavoursTable.slug,
        })
        .from(flavoursTable)
        .where(and(eq(flavoursTable.slug, slug), eq(flavoursTable.available, true)))
        .limit(1);

    if (!flavour) return null;

    const desc = flavour.description
        ? `${flavour.description.slice(0, 150)} — Available for pre-order at Urban Churn.`
        : `${flavour.name} ice cream — handcrafted with natural ingredients. Pre-order for pickup at Urban Churn.`;

    return {
        title: `${flavour.name} Ice Cream | Urban Churn`,
        description: desc,
        image: resolveImageUrl(flavour.imageUrl),
        url: `${PUBLIC_URL}/pre-order/${flavour.slug}`,
        type: "product",
    };
}

async function getEventOg(slug: string): Promise<OgData | null> {
    const [event] = await db
        .select({
            title: eventsTable.title,
            description: eventsTable.description,
            imageUrl: eventsTable.imageUrl,
            slug: eventsTable.slug,
        })
        .from(eventsTable)
        .where(and(eq(eventsTable.slug, slug), eq(eventsTable.active, true)))
        .limit(1);

    if (!event) return null;

    const desc = event.description
        ? `${event.description.slice(0, 150)}`
        : `${event.title} — an Urban Churn event. Get your tickets now!`;

    return {
        title: `${event.title} | Urban Churn Events`,
        description: desc,
        image: resolveImageUrl(event.imageUrl),
        url: `${PUBLIC_URL}/events/${event.slug}`,
        type: "event",
    };
}

/**
 * Middleware that serves index.html with dynamic OG meta tags
 * for shareable routes (products, events). For all other routes,
 * serves the vanilla index.html.
 */
export function ogTagsMiddleware() {
    return async (req: Request, res: Response, _next: NextFunction) => {
        let og: OgData | null = null;

        const productMatch = req.path.match(PRODUCT_PATTERN);
        if (productMatch) {
            try {
                og = await getProductOg(productMatch[1]);
            } catch (err) {
                console.error("[OG] Error fetching product data:", err);
            }
        }

        const eventMatch = req.path.match(EVENT_PATTERN);
        if (eventMatch) {
            try {
                og = await getEventOg(eventMatch[1]);
            } catch (err) {
                console.error("[OG] Error fetching event data:", err);
            }
        }

        let html: string;
        try {
            html = getIndexHtml();
        } catch (err) {
            console.error("[OG] Could not read index.html:", err);
            res.status(500).send("Internal server error");
            return;
        }

        if (og) {
            html = injectOgTags(html, og);
        }

        res.set("Content-Type", "text/html");
        res.send(html);
    };
}
