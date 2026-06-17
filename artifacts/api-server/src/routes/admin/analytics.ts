import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
    ordersTable,
    orderItemsTable,
    locationsTable,
} from "@workspace/db/schema";
import { eq, and, gte, lte, lt, sql, desc, count } from "drizzle-orm";

const router: IRouter = Router();

const BUSINESS_TZ = "America/New_York";

interface AnalyticsRange {
    from: Date;
    to?: Date;
    prevFrom: Date;
    prevTo: Date;
}

/** Returns a Date representing midnight Eastern time N days ago (as UTC) for DB queries */
function easternMidnightDaysAgo(days: number): Date {
    const nowUtc = new Date();
    const easternStr = nowUtc.toLocaleDateString("en-CA", { timeZone: BUSINESS_TZ });
    const [year, month, day] = easternStr.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day - days));
}

function easternMonthRange(yearMonth: string): AnalyticsRange {
    const [year, month] = yearMonth.split("-").map(Number);
    const from = new Date(Date.UTC(year, month - 1, 1));
    const to = new Date(Date.UTC(year, month, 1));
    const prevFrom = new Date(Date.UTC(year, month - 2, 1));
    const prevTo = from;
    return { from, to, prevFrom, prevTo };
}

function parseAnalyticsRange(req: { query: Record<string, unknown> }): AnalyticsRange {
    const month = req.query.month as string | undefined;
    if (month && /^\d{4}-\d{2}$/.test(month)) {
        return easternMonthRange(month);
    }

    const days = parseInt(req.query.days as string) || 30;
    const from = easternMidnightDaysAgo(days);
    const prevFrom = easternMidnightDaysAgo(days * 2);
    return { from, prevFrom, prevTo: from };
}

function orderDateConditions(range: AnalyticsRange) {
    const conditions = [
        gte(ordersTable.createdAt, range.from),
        sql`${ordersTable.status} NOT IN ('cancelled', 'refunded')`,
    ];
    if (range.to) {
        conditions.push(lt(ordersTable.createdAt, range.to));
    }
    return and(...conditions);
}

function previousPeriodConditions(range: AnalyticsRange) {
    return and(
        gte(ordersTable.createdAt, range.prevFrom),
        lt(ordersTable.createdAt, range.prevTo),
        sql`${ordersTable.status} NOT IN ('cancelled', 'refunded')`,
    );
}

// Revenue time series (daily)
router.get("/revenue", async (req, res) => {
    const range = parseAnalyticsRange(req);

    const rows = await db
        .select({
            date: sql<string>`DATE(${ordersTable.createdAt} AT TIME ZONE 'UTC' AT TIME ZONE 'America/New_York')`.as("date"),
            revenue: sql<number>`COALESCE(SUM(${ordersTable.totalCents}), 0)`.as("revenue"),
            orderCount: count().as("order_count"),
        })
        .from(ordersTable)
        .where(orderDateConditions(range))
        .groupBy(sql`DATE(${ordersTable.createdAt} AT TIME ZONE 'UTC' AT TIME ZONE 'America/New_York')`)
        .orderBy(sql`DATE(${ordersTable.createdAt} AT TIME ZONE 'UTC' AT TIME ZONE 'America/New_York')`);

    res.json(rows);
});

// Top products by units sold
router.get("/top-products", async (req, res) => {
    const range = parseAnalyticsRange(req);

    const rows = await db
        .select({
            flavourName: orderItemsTable.flavourName,
            sizeName: orderItemsTable.sizeName,
            totalQuantity: sql<number>`SUM(${orderItemsTable.quantity})`.as("total_quantity"),
            totalRevenue: sql<number>`SUM(${orderItemsTable.priceCents} * ${orderItemsTable.quantity})`.as("total_revenue"),
        })
        .from(orderItemsTable)
        .innerJoin(ordersTable, eq(orderItemsTable.orderId, ordersTable.id))
        .where(orderDateConditions(range))
        .groupBy(orderItemsTable.flavourName, orderItemsTable.sizeName)
        .orderBy(desc(sql`SUM(${orderItemsTable.quantity})`))
        .limit(10);

    res.json(rows);
});

// Orders by location
router.get("/by-location", async (req, res) => {
    const range = parseAnalyticsRange(req);

    const rows = await db
        .select({
            locationId: ordersTable.locationId,
            locationName: locationsTable.name,
            orderCount: count().as("order_count"),
            totalRevenue: sql<number>`COALESCE(SUM(${ordersTable.totalCents}), 0)`.as("total_revenue"),
        })
        .from(ordersTable)
        .leftJoin(locationsTable, eq(ordersTable.locationId, locationsTable.id))
        .where(orderDateConditions(range))
        .groupBy(ordersTable.locationId, locationsTable.name)
        .orderBy(desc(sql`COALESCE(SUM(${ordersTable.totalCents}), 0)`));

    res.json(rows);
});

// Summary stats for a period
router.get("/summary", async (req, res) => {
    const range = parseAnalyticsRange(req);

    const [current] = await db
        .select({
            orderCount: count().as("order_count"),
            totalRevenue: sql<number>`COALESCE(SUM(${ordersTable.totalCents}), 0)`.as("total_revenue"),
        })
        .from(ordersTable)
        .where(orderDateConditions(range));

    const [previous] = await db
        .select({
            orderCount: count().as("order_count"),
            totalRevenue: sql<number>`COALESCE(SUM(${ordersTable.totalCents}), 0)`.as("total_revenue"),
        })
        .from(ordersTable)
        .where(previousPeriodConditions(range));

    const avgOrderValue = current.orderCount > 0 ? Math.round(current.totalRevenue / current.orderCount) : 0;

    res.json({
        revenue: current.totalRevenue,
        orders: current.orderCount,
        avgOrderValue,
        prevRevenue: previous.totalRevenue,
        prevOrders: previous.orderCount,
    });
});

// CSV export for orders
router.get("/export/orders", async (req, res) => {
    const from = req.query.from ? new Date(req.query.from as string) : undefined;
    const to = req.query.to ? new Date(req.query.to as string) : undefined;

    const conditions = [sql`${ordersTable.status} NOT IN ('cancelled', 'refunded')`];
    if (from) conditions.push(gte(ordersTable.createdAt, from));
    if (to) conditions.push(lte(ordersTable.createdAt, to));

    const orders = await db
        .select({
            orderNumber: ordersTable.orderNumber,
            customerName: ordersTable.customerName,
            customerEmail: ordersTable.customerEmail,
            customerPhone: ordersTable.customerPhone,
            locationName: locationsTable.name,
            status: ordersTable.status,
            totalCents: ordersTable.totalCents,
            discountCents: ordersTable.discountCents,
            createdAt: ordersTable.createdAt,
        })
        .from(ordersTable)
        .leftJoin(locationsTable, eq(ordersTable.locationId, locationsTable.id))
        .where(and(...conditions))
        .orderBy(desc(ordersTable.createdAt));

    const header = "Order Number,Customer,Email,Phone,Location,Status,Total,Discount,Date\n";
    const rows = orders.map((o) =>
        [
            o.orderNumber,
            `"${o.customerName}"`,
            o.customerEmail,
            o.customerPhone,
            `"${o.locationName}"`,
            o.status,
            (o.totalCents / 100).toFixed(2),
            (o.discountCents / 100).toFixed(2),
            new Date(o.createdAt).toISOString(),
        ].join(","),
    );

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=orders-export.csv");
    res.send(header + rows.join("\n"));
});

export default router;
