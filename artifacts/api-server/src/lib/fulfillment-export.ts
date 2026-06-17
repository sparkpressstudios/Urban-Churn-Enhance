import { db } from "@workspace/db";
import {
    ordersTable,
    orderItemsTable,
    locationsTable,
    productPreOrdersTable,
    flavoursTable,
} from "@workspace/db/schema";
import { eq, and, sql, asc, or, ilike, gte, lte, type SQL } from "drizzle-orm";
import { validForFulfillmentSql } from "./order-payment";

const BUSINESS_TZ = "America/New_York";

export type FulfillmentExportFormat = "summary" | "detail";

export interface FulfillmentFilters {
    locationId?: number;
    from?: string;
    to?: string;
    flavourName?: string;
    preOrderWindowId?: number;
    search?: string;
    includeInvalid?: boolean;
}

export function parseFulfillmentFilters(query: Record<string, unknown>): FulfillmentFilters {
    return {
        locationId: query.locationId ? Number(query.locationId) : undefined,
        from: query.from ? String(query.from) : undefined,
        to: query.to ? String(query.to) : undefined,
        flavourName: query.flavourName ? String(query.flavourName) : undefined,
        preOrderWindowId: query.preOrderWindowId
            ? Number(query.preOrderWindowId)
            : undefined,
        search: query.search ? String(query.search) : undefined,
        includeInvalid:
            query.includeInvalid === "true" ||
            query.includeInvalid === "1" ||
            query.includeInvalid === true,
    };
}

const UNFULFILLED_STATUSES = sql`${ordersTable.status} IN ('pending', 'confirmed', 'ready')`;

function applyDateAndLocationFilters(
    conditions: SQL[],
    filters: FulfillmentFilters,
): void {
    if (filters.locationId) {
        conditions.push(eq(ordersTable.locationId, filters.locationId));
    }
    if (filters.from) {
        conditions.push(gte(ordersTable.createdAt, new Date(filters.from)));
    }
    if (filters.to) {
        const toEnd = new Date(filters.to);
        toEnd.setHours(23, 59, 59, 999);
        conditions.push(lte(ordersTable.createdAt, toEnd));
    }
}

/** Conditions for queries rooted at orders (list view, order-level filtering). */
export function buildFulfillmentOrderConditions(filters: FulfillmentFilters): SQL[] {
    const conditions: SQL[] = [UNFULFILLED_STATUSES];
    applyDateAndLocationFilters(conditions, filters);

    if (!filters.includeInvalid) {
        conditions.push(validForFulfillmentSql());
    }

    if (filters.search) {
        conditions.push(
            or(
                ilike(ordersTable.orderNumber, `%${filters.search}%`),
                ilike(ordersTable.customerName, `%${filters.search}%`),
                ilike(ordersTable.customerEmail, `%${filters.search}%`),
            )!,
        );
    }

    if (filters.flavourName) {
        conditions.push(
            sql`${ordersTable.id} IN (
                SELECT ${orderItemsTable.orderId} FROM ${orderItemsTable}
                WHERE ${orderItemsTable.flavourName} ILIKE ${filters.flavourName}
            )`,
        );
    }

    if (filters.preOrderWindowId) {
        conditions.push(
            sql`${ordersTable.id} IN (
                SELECT ${orderItemsTable.orderId} FROM ${orderItemsTable}
                WHERE ${orderItemsTable.preOrderWindowId} = ${filters.preOrderWindowId}
            )`,
        );
    }

    return conditions;
}

/** Conditions for queries rooted at order_items (summary aggregation, detail export). */
export function buildFulfillmentItemConditions(filters: FulfillmentFilters): SQL[] {
    const conditions: SQL[] = [UNFULFILLED_STATUSES];
    applyDateAndLocationFilters(conditions, filters);

    if (!filters.includeInvalid) {
        conditions.push(validForFulfillmentSql());
    }

    if (filters.flavourName) {
        conditions.push(ilike(orderItemsTable.flavourName, filters.flavourName));
    }

    if (filters.preOrderWindowId) {
        conditions.push(
            eq(orderItemsTable.preOrderWindowId, filters.preOrderWindowId),
        );
    }

    return conditions;
}

function formatEasternDateTime(date: Date | string | null | undefined): string {
    if (!date) return "";
    return new Date(date).toLocaleString("en-US", {
        timeZone: BUSINESS_TZ,
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}

function formatEasternDate(date: Date | string | null | undefined): string {
    if (!date) return "";
    return new Date(date).toLocaleDateString("en-US", {
        timeZone: BUSINESS_TZ,
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

function escapeCsvField(value: string | number | null | undefined): string {
    const str = value == null ? "" : String(value);
    return `"${str.replace(/"/g, '""')}"`;
}

function toCsvRow(fields: (string | number | null | undefined)[]): string {
    return fields.map(escapeCsvField).join(",");
}

function windowLabel(
    windowId: number | null,
    flavourName: string | null,
    pickupDate: Date | null,
): string {
    if (!windowId) return "";
    const flavour = flavourName ?? `Window #${windowId}`;
    const pickup = pickupDate ? formatEasternDate(pickupDate) : "";
    return pickup ? `${flavour} — ${pickup}` : flavour;
}

export async function generateFulfillmentDetailCsv(
    filters: FulfillmentFilters,
): Promise<string> {
    const conditions = buildFulfillmentItemConditions(filters);

    const rows = await db
        .select({
            orderNumber: ordersTable.orderNumber,
            status: ordersTable.status,
            customerName: ordersTable.customerName,
            customerEmail: ordersTable.customerEmail,
            customerPhone: ordersTable.customerPhone,
            locationName: locationsTable.name,
            flavourName: orderItemsTable.flavourName,
            sizeName: orderItemsTable.sizeName,
            quantity: orderItemsTable.quantity,
            pickedUpQuantity: orderItemsTable.pickedUpQuantity,
            pickupDate: orderItemsTable.pickupDate,
            preOrderWindowId: orderItemsTable.preOrderWindowId,
            windowFlavourName: flavoursTable.name,
            windowPickupDate: productPreOrdersTable.pickupDate,
            createdAt: ordersTable.createdAt,
            priceCents: orderItemsTable.priceCents,
            totalCents: ordersTable.totalCents,
        })
        .from(orderItemsTable)
        .innerJoin(ordersTable, eq(orderItemsTable.orderId, ordersTable.id))
        .innerJoin(locationsTable, eq(ordersTable.locationId, locationsTable.id))
        .leftJoin(
            productPreOrdersTable,
            eq(orderItemsTable.preOrderWindowId, productPreOrdersTable.id),
        )
        .leftJoin(
            flavoursTable,
            eq(productPreOrdersTable.flavourId, flavoursTable.id),
        )
        .where(and(...conditions))
        .orderBy(
            asc(locationsTable.name),
            asc(orderItemsTable.flavourName),
            asc(orderItemsTable.sizeName),
            asc(ordersTable.orderNumber),
        );

    const headers = [
        "Order #",
        "Status",
        "Customer",
        "Email",
        "Phone",
        "Location",
        "Flavour",
        "Size",
        "Qty",
        "Remaining Qty",
        "Pickup Date",
        "Pre-Order Window",
        "Order Date",
        "Line Total",
        "Order Total",
    ];

    const csvRows = rows.map((row) =>
        toCsvRow([
            row.orderNumber,
            row.status,
            row.customerName,
            row.customerEmail,
            row.customerPhone,
            row.locationName,
            row.flavourName,
            row.sizeName,
            row.quantity,
            Math.max(0, row.quantity - row.pickedUpQuantity),
            formatEasternDate(row.pickupDate),
            windowLabel(
                row.preOrderWindowId,
                row.windowFlavourName,
                row.windowPickupDate,
            ),
            formatEasternDateTime(row.createdAt),
            ((row.priceCents * row.quantity) / 100).toFixed(2),
            (row.totalCents / 100).toFixed(2),
        ]),
    );

    return [toCsvRow(headers), ...csvRows].join("\n");
}

export async function generateFulfillmentSummaryCsv(
    filters: FulfillmentFilters,
): Promise<string> {
    const conditions = buildFulfillmentItemConditions(filters);

    const rows = await db
        .select({
            locationName: locationsTable.name,
            flavourName: orderItemsTable.flavourName,
            sizeName: orderItemsTable.sizeName,
            totalQuantity:
                sql<number>`COALESCE(SUM(${orderItemsTable.quantity} - ${orderItemsTable.pickedUpQuantity}), 0)`.as(
                    "total_quantity",
                ),
            orderCount:
                sql<number>`COUNT(DISTINCT ${ordersTable.id})`.as("order_count"),
        })
        .from(orderItemsTable)
        .innerJoin(ordersTable, eq(orderItemsTable.orderId, ordersTable.id))
        .innerJoin(locationsTable, eq(ordersTable.locationId, locationsTable.id))
        .where(and(...conditions))
        .groupBy(
            locationsTable.name,
            orderItemsTable.flavourName,
            orderItemsTable.sizeName,
        )
        .orderBy(
            asc(locationsTable.name),
            asc(orderItemsTable.flavourName),
            asc(orderItemsTable.sizeName),
        );

    const headers = ["Location", "Flavour", "Size", "Qty Needed", "Orders"];
    const csvRows = rows.map((row) =>
        toCsvRow([
            row.locationName,
            row.flavourName,
            row.sizeName,
            Number(row.totalQuantity),
            Number(row.orderCount),
        ]),
    );

    const totalQty = rows.reduce((sum, r) => sum + Number(r.totalQuantity), 0);

    const [orderTotal] = await db
        .select({
            count: sql<number>`COUNT(DISTINCT ${ordersTable.id})`.as("count"),
        })
        .from(orderItemsTable)
        .innerJoin(ordersTable, eq(orderItemsTable.orderId, ordersTable.id))
        .innerJoin(locationsTable, eq(ordersTable.locationId, locationsTable.id))
        .where(and(...conditions));

    const footer = [
        "",
        toCsvRow(["SUMMARY"]),
        toCsvRow(["Total Items", totalQty]),
        toCsvRow(["Total Orders", Number(orderTotal?.count ?? 0)]),
    ];

    return [toCsvRow(headers), ...csvRows, ...footer].join("\n");
}

export async function generateFulfillmentCsv(
    format: FulfillmentExportFormat,
    filters: FulfillmentFilters,
): Promise<string> {
    if (format === "summary") {
        return generateFulfillmentSummaryCsv(filters);
    }
    return generateFulfillmentDetailCsv(filters);
}
