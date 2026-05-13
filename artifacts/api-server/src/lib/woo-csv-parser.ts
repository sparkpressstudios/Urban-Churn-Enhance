import { parse } from "csv-parse/sync";

export type WooImportType = "products" | "orders" | "customers" | "coupons";

export interface ParsedCSV {
    headers: string[];
    rows: Record<string, string>[];
    detectedType: WooImportType;
}

// Known WooCommerce CSV column headers for each type
const TYPE_SIGNATURES: Record<WooImportType, string[]> = {
    products: ["SKU", "Regular price", "Sale price", "Categories", "Type"],
    orders: ["Order ID", "Order Total", "Order Status", "Billing", "Shipping"],
    customers: [
        "Customer ID",
        "Customer Email",
        "Total Spend",
        "Orders Count",
        "Date Registered",
    ],
    coupons: ["Coupon Code", "Discount Type", "Coupon Amount", "Usage Count"],
};

/**
 * Detect which WooCommerce export type a CSV represents based on its column headers.
 */
export function detectImportType(headers: string[]): WooImportType {
    const headerSet = new Set(headers.map((h) => h.toLowerCase().trim()));

    let bestMatch: WooImportType = "products";
    let bestScore = 0;

    for (const [type, signatures] of Object.entries(TYPE_SIGNATURES)) {
        let score = 0;
        for (const sig of signatures) {
            // Check if any header contains the signature text
            for (const h of headerSet) {
                if (h.includes(sig.toLowerCase())) {
                    score++;
                    break;
                }
            }
        }
        if (score > bestScore) {
            bestScore = score;
            bestMatch = type as WooImportType;
        }
    }

    return bestMatch;
}

/**
 * Parse a WooCommerce CSV file and detect its type.
 */
export function parseWooCSV(csvContent: string): ParsedCSV {
    const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
        bom: true,
    }) as Record<string, string>[];

    const headers = records.length > 0 ? Object.keys(records[0]) : [];
    const detectedType = detectImportType(headers);

    return { headers, rows: records, detectedType };
}

// ----- Field Mapping Definitions -----

export interface FieldMapping {
    csvColumn: string;
    dbField: string;
    transform?: (value: string) => any;
}

// Common WooCommerce product column names → our DB fields
const WOO_PRODUCT_MAP: Record<string, { field: string; transform?: (v: string) => any }> = {
    name: { field: "name" },
    "short description": { field: "description" },
    description: { field: "htmlContent" },
    "regular price": { field: "basePrice" },
    "sale price": { field: "_salePrice" },
    images: { field: "imageUrl", transform: (v) => v.split(",")[0]?.trim() || null },
    categories: { field: "tag", transform: mapCategoryToTag },
    tags: { field: "_tags" },
    "menu order": { field: "sortOrder", transform: (v) => parseInt(v, 10) || 0 },
    published: { field: "available", transform: (v) => v === "1" || v.toLowerCase() === "yes" || v.toLowerCase() === "true" },
    sku: { field: "slug", transform: (v) => slugify(v) },
    type: { field: "_type" },
    "stock quantity": { field: "_stockQty", transform: (v) => parseInt(v, 10) || 0 },
    stock: { field: "_stockQty", transform: (v) => parseInt(v, 10) || 0 },
    "in stock?": { field: "_inStock", transform: (v) => v === "1" || v.toLowerCase() === "yes" },
    "weight (lbs)": { field: "_weight" },
};

const WOO_ORDER_MAP: Record<string, { field: string; transform?: (v: string) => any }> = {
    "order id": { field: "_orderId" },
    "order number": { field: "orderNumber" },
    "order date": { field: "createdAt", transform: (v) => new Date(v) },
    "order status": { field: "status", transform: mapOrderStatus },
    "order total": { field: "totalCents", transform: (v) => Math.round(parseFloat(v || "0") * 100) },
    "order subtotal": { field: "_subtotal" },
    "discount amount": { field: "_discountCents", transform: (v) => Math.round(parseFloat(v || "0") * 100) },
    "coupon code": { field: "_couponCode" },
    "cart discount amount": { field: "_discountCents", transform: (v) => Math.round(parseFloat(v || "0") * 100) },
    "billing first name": { field: "_billingFirst" },
    "billing last name": { field: "_billingLast" },
    "first name (billing)": { field: "_billingFirst" },
    "last name (billing)": { field: "_billingLast" },
    "billing email": { field: "customerEmail" },
    "email (billing)": { field: "customerEmail" },
    "billing phone": { field: "customerPhone" },
    "phone (billing)": { field: "customerPhone" },
    "billing address 1": { field: "_billingAddress" },
    "address 1 (billing)": { field: "_billingAddress" },
    "billing city": { field: "_billingCity" },
    "city (billing)": { field: "_billingCity" },
    "billing state": { field: "_billingState" },
    "state (billing)": { field: "_billingState" },
    "billing postcode": { field: "_billingZip" },
    "postcode (billing)": { field: "_billingZip" },
    "customer note": { field: "notes" },
    // Item-level columns
    "item name": { field: "_itemName" },
    "item #": { field: "_itemName" },
    "line_item_name": { field: "_itemName" },
    "product name": { field: "_itemName" },
    quantity: { field: "_itemQty", transform: (v) => parseInt(v, 10) || 1 },
    "line_item_quantity": { field: "_itemQty", transform: (v) => parseInt(v, 10) || 1 },
    "item cost": { field: "_itemCost", transform: (v) => parseFloat(v || "0") },
    "line_item_total": { field: "_itemCost", transform: (v) => parseFloat(v || "0") },
    // Variation / size info
    "item variation": { field: "_itemVariation" },
    "variation": { field: "_itemVariation" },
    "meta:size": { field: "_itemVariation" },
    "meta: size": { field: "_itemVariation" },
    "item meta: size": { field: "_itemVariation" },
};

const WOO_CUSTOMER_MAP: Record<string, { field: string; transform?: (v: string) => any }> = {
    "customer id": { field: "wooCustomerId", transform: (v) => parseInt(v, 10) || null },
    "customer email": { field: "email" },
    email: { field: "email" },
    "first name": { field: "firstName" },
    "last name": { field: "lastName" },
    username: { field: "_username" },
    phone: { field: "phone" },
    "billing phone": { field: "phone" },
    city: { field: "city" },
    "city (billing)": { field: "city" },
    "billing city": { field: "city" },
    "state/county": { field: "state" },
    state: { field: "state" },
    "state (billing)": { field: "state" },
    "billing state": { field: "state" },
    postcode: { field: "zip" },
    "postcode (billing)": { field: "zip" },
    "billing postcode": { field: "zip" },
    country: { field: "country" },
    "country (billing)": { field: "country" },
    "billing country": { field: "country" },
    "orders count": { field: "ordersCount", transform: (v) => parseInt(v, 10) || 0 },
    "total spend": { field: "totalSpentCents", transform: (v) => Math.round(parseFloat(v || "0") * 100) },
    "address 1 (billing)": { field: "address" },
    "billing address 1": { field: "address" },
    // WooCommerce Customers Report format
    name: { field: "_fullName" },
    "sign up": { field: "_signUpDate" },
    orders: { field: "ordersCount", transform: (v) => parseInt(v, 10) || 0 },
    "country / region": { field: "country" },
    region: { field: "state" },
    "postal code": { field: "zip" },
};

/**
 * Map a CSV row to a DB-compatible object using the right type mapping.
 */
export function mapRow(
    row: Record<string, string>,
    type: WooImportType,
): Record<string, any> {
    const mapping =
        type === "products"
            ? WOO_PRODUCT_MAP
            : type === "orders"
                ? WOO_ORDER_MAP
                : type === "customers"
                    ? WOO_CUSTOMER_MAP
                    : {};

    const result: Record<string, any> = {};

    for (const [csvCol, value] of Object.entries(row)) {
        const key = csvCol.toLowerCase().trim();
        const mapEntry = mapping[key];
        if (mapEntry) {
            result[mapEntry.field] = mapEntry.transform
                ? mapEntry.transform(value)
                : value;
        }
    }

    return result;
}

// ----- Helpers -----

function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function mapCategoryToTag(categories: string): string {
    const lower = categories.toLowerCase();
    if (lower.includes("classic")) return "classic";
    if (lower.includes("limited")) return "limited";
    if (lower.includes("seasonal")) return "seasonal";
    if (lower.includes("fan") && lower.includes("favorite")) return "fan-favorite";
    if (lower.includes("adventure") || lower.includes("adventurous")) return "adventurous";
    if (lower.includes("best") && lower.includes("seller")) return "bestseller";
    if (lower.includes("coming")) return "coming-soon";
    return "classic";
}

function mapOrderStatus(status: string): string {
    const s = status.toLowerCase().replace(/^wc-/, "").trim();
    const statusMap: Record<string, string> = {
        pending: "pending",
        processing: "confirmed",
        "on-hold": "pending",
        completed: "picked_up",
        cancelled: "cancelled",
        refunded: "refunded",
        failed: "cancelled",
        ready: "ready",
    };
    return statusMap[s] || "pending";
}
