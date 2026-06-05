import { sql, type SQL } from "drizzle-orm";
import type { AnyColumn } from "drizzle-orm/column";
import { wholesaleFlavoursTable } from "@workspace/db/schema";

/** Minimum calendar date (YYYY-MM-DD) that satisfies N business days from today (Mon–Fri). */
export function getMinBusinessDate(businessDays: number, fromDate: Date = new Date()): string {
    const start = new Date(fromDate);
    start.setHours(0, 0, 0, 0);
    let counted = 0;
    const cursor = new Date(start);
    while (counted < businessDays) {
        cursor.setDate(cursor.getDate() + 1);
        const day = cursor.getDay();
        if (day !== 0 && day !== 6) counted++;
    }
    return cursor.toISOString().split("T")[0]!;
}

export function isDateBeforeMinBusinessDays(
    dateStr: string,
    businessDays: number,
    fromDate: Date = new Date(),
): boolean {
    const requested = new Date(dateStr + "T00:00:00");
    const min = new Date(getMinBusinessDate(businessDays, fromDate) + "T00:00:00");
    return requested < min;
}

export type WholesaleCatalogFilter = "standard" | "exclusive" | "all" | "customer";

/** Products/flavours a logged-in wholesale customer may order. */
export function wholesaleCustomerCatalogVisibility(
    wholesaleCustomerId: number,
    flavourIdColumn: AnyColumn,
): SQL {
    return sql`(
        COALESCE(${wholesaleFlavoursTable.isExclusive}, false) = false
        OR EXISTS (
            SELECT 1 FROM wholesale_customer_exclusive_flavours ex
            WHERE ex.wholesale_customer_id = ${wholesaleCustomerId}
            AND ex.flavour_id = ${flavourIdColumn}
        )
    )`;
}

/** Admin list filter for standard vs exclusive catalogue rows. */
export function wholesaleAdminCatalogFilter(
    catalog: WholesaleCatalogFilter,
    flavourIdColumn: AnyColumn,
    options?: { customerId?: number },
): SQL | undefined {
    if (catalog === "standard") {
        return sql`COALESCE(${wholesaleFlavoursTable.isExclusive}, false) = false`;
    }
    if (catalog === "exclusive") {
        return sql`COALESCE(${wholesaleFlavoursTable.isExclusive}, false) = true`;
    }
    if (catalog === "customer" && options?.customerId) {
        return wholesaleCustomerCatalogVisibility(options.customerId, flavourIdColumn);
    }
    return undefined;
}
