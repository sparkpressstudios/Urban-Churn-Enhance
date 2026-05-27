import cron from "node-cron";
import { db } from "@workspace/db";
import {
    productPreOrdersTable,
    emailNotificationsLogTable,
    ordersTable,
    orderItemsTable,
    orderNotesTable,
    productsTable,
    locationsTable,
    flavoursTable,
    bakeryOrdersTable,
} from "@workspace/db/schema";
import { eq, and, or, lte, sql, inArray, ne, isNotNull, notInArray } from "drizzle-orm";
import {
    sendAdminOrdersClosedReminder,
    sendCustomerPickupReminder,
    sendCustomerLastChancePickup,
    sendCustomerPickupStarted,
    sendWindowClosingReport,
} from "./email";
import type { LocationInfo } from "./email";

/** All scheduled jobs and date math use the business timezone */
const BUSINESS_TZ = "America/New_York";

const orderPaidForFulfillment = or(
    eq(ordersTable.paymentStatus, "paid"),
    eq(ordersTable.totalCents, 0),
);

/**
 * Get start-of-day boundaries in Eastern timezone as UTC Date objects.
 * Used for "today" / "yesterday" comparisons against timestamptz columns.
 */
function getEasternDayBounds() {
    const now = new Date();

    // Current date in Eastern as YYYY-MM-DD (sv-SE locale always gives ISO format)
    const todayStr = now.toLocaleDateString("sv-SE", { timeZone: BUSINESS_TZ });
    const [y, m, d] = todayStr.split("-").map(Number);

    // Compute the current UTC→Eastern offset by comparing wall-clock representations
    const etParts = new Intl.DateTimeFormat("en-US", {
        timeZone: BUSINESS_TZ,
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit",
        hour12: false,
    }).formatToParts(now);
    const g = (t: string) => {
        const val = Number(etParts.find(p => p.type === t)!.value);
        return t === "hour" && val === 24 ? 0 : val;
    };
    const etAsUtcMs = Date.UTC(g("year"), g("month") - 1, g("day"), g("hour"), g("minute"), g("second"));
    const offsetMs = now.getTime() - etAsUtcMs;

    // Midnight Eastern today expressed as UTC milliseconds
    const todayStartMs = Date.UTC(y, m - 1, d) + offsetMs;

    return {
        todayStart: new Date(todayStartMs),
        todayEnd: new Date(todayStartMs + 24 * 60 * 60 * 1000 - 1),
        yesterdayStart: new Date(todayStartMs - 24 * 60 * 60 * 1000),
    };
}

/**
 * Initialize all scheduled jobs on server startup.
 * Runs in-process using node-cron.
 */
export function initScheduler() {
    console.log("[SCHEDULER] Initializing scheduled jobs (tz: %s)...", BUSINESS_TZ);

    // ── Job 1: Auto-advance window statuses (every 15 min) ──
    cron.schedule("*/15 * * * *", async () => {
        try {
            await advanceWindowStatuses();
        } catch (err) {
            console.error("[SCHEDULER] Window status update failed:", err);
        }
    });

    // ── Job 1b: Mark orders ready when pickup window starts (every 15 min) ──
    cron.schedule("*/15 * * * *", async () => {
        try {
            await markOrdersReadyForPickup();
        } catch (err) {
            console.error("[SCHEDULER] Mark orders ready failed:", err);
        }
    });

    // ── Job 2: Window close — fulfillment report (every 15 min) ──
    cron.schedule("*/15 * * * *", async () => {
        try {
            await processClosedWindowReports();
        } catch (err) {
            console.error("[SCHEDULER] Fulfillment report job failed:", err);
        }
    });

    // ── Job 3: Daily 7 AM Eastern — admin orders-closed reminder + customer pickup reminders ──
    cron.schedule("0 7 * * *", async () => {
        try {
            await sendDailyReminders();
        } catch (err) {
            console.error("[SCHEDULER] Daily reminders job failed:", err);
        }
    }, { timezone: BUSINESS_TZ });

    // ── Job 4: Recurring window auto-creation (daily at midnight Eastern) ──
    cron.schedule("0 0 * * *", async () => {
        try {
            await processRecurringWindows();
        } catch (err) {
            console.error("[SCHEDULER] Recurring windows job failed:", err);
        }
    }, { timezone: BUSINESS_TZ });

    console.log("[SCHEDULER] All jobs scheduled.");
}

/**
 * Auto-advance window statuses based on current time:
 * - scheduled/draft → open (if openAt <= now < closeAt)
 * - scheduled/open → closed (if closeAt <= now)
 */
async function advanceWindowStatuses() {
    const now = new Date();

    // Open pre-orders whose start time has arrived
    await db
        .update(productPreOrdersTable)
        .set({ status: "open", updatedAt: now })
        .where(
            and(
                inArray(productPreOrdersTable.status, ["scheduled"]),
                lte(productPreOrdersTable.preOrderStart, now),
                sql`${productPreOrdersTable.preOrderEnd} > ${now}`,
            ),
        );

    // Close pre-orders whose end time has passed
    await db
        .update(productPreOrdersTable)
        .set({ status: "closed", updatedAt: now })
        .where(
            and(
                inArray(productPreOrdersTable.status, ["scheduled", "open"]),
                lte(productPreOrdersTable.preOrderEnd, now),
            ),
        );
}

/**
 * Auto-transition pre-order orders to "ready" when their pickup window starts.
 *
 * Finds all closed pre-order windows whose pickupDate has arrived (pickupDate <= now)
 * and marks any pending/confirmed orders linked to those windows as "ready".
 * Skips orders already past "ready" (partially_picked_up, picked_up, cancelled, refunded).
 *
 * Uses orderItems.preOrderWindowId for reliable matching.
 */
export async function markOrdersReadyForPickup() {
    const now = new Date();

    // Find closed windows whose pickup period has started and haven't been auto-readied yet
    const pickupStartedWindows = await db
        .select({
            id: productPreOrdersTable.id,
            flavourId: productPreOrdersTable.flavourId,
            pickupDate: productPreOrdersTable.pickupDate,
        })
        .from(productPreOrdersTable)
        .where(
            and(
                eq(productPreOrdersTable.status, "closed"),
                lte(productPreOrdersTable.pickupDate, now),
                eq(productPreOrdersTable.ordersAutoReadied, false),
            ),
        );

    if (pickupStartedWindows.length === 0) return;

    for (const window of pickupStartedWindows) {
        try {
            // Find distinct order IDs with items tied to this pre-order window
            // that are still in a pre-pickup status
            const matchingItems = await db
                .select({ orderId: orderItemsTable.orderId })
                .from(orderItemsTable)
                .where(
                    and(
                        eq(orderItemsTable.preOrderWindowId, window.id),
                        isNotNull(orderItemsTable.orderId),
                    ),
                );

            const orderIds = [...new Set(matchingItems.map((r) => r.orderId))];
            if (orderIds.length === 0) {
                // No orders found — still mark as done so we don't check again
                await db
                    .update(productPreOrdersTable)
                    .set({ ordersAutoReadied: true, updatedAt: now })
                    .where(eq(productPreOrdersTable.id, window.id));
                continue;
            }

            // Only update orders that are still pending or confirmed
            const updatedOrders = await db
                .update(ordersTable)
                .set({ status: "ready", updatedAt: now })
                .where(
                    and(
                        inArray(ordersTable.id, orderIds),
                        inArray(ordersTable.status, ["pending", "confirmed"]),
                        orderPaidForFulfillment,
                    ),
                )
                .returning({ id: ordersTable.id, orderNumber: ordersTable.orderNumber });

            // Add a system note to each updated order
            if (updatedOrders.length > 0) {
                await db.insert(orderNotesTable).values(
                    updatedOrders.map((o) => ({
                        orderId: o.id,
                        type: "system" as const,
                        content: "Order automatically marked as ready — pre-order pickup window has started.",
                        author: "System",
                    })),
                );
                console.log(
                    `[SCHEDULER] Marked ${updatedOrders.length} orders as ready for pre-order window ${window.id} ` +
                    `(${updatedOrders.map((o) => o.orderNumber).join(", ")})`,
                );
            }

            // Mark the window so we don't process it again
            await db
                .update(productPreOrdersTable)
                .set({ ordersAutoReadied: true, updatedAt: now })
                .where(eq(productPreOrdersTable.id, window.id));

        } catch (err) {
            console.error(`[SCHEDULER] markOrdersReadyForPickup failed for window ${window.id}:`, err);
        }
    }
}

/**
 * Process recently closed windows that haven't had their report sent yet.
 * Sends a fulfillment report email with CSV attachment, then marks adminNotified.
 */
async function processClosedWindowReports() {
    const unnotifiedWindows = await db
        .select()
        .from(productPreOrdersTable)
        .where(
            and(
                eq(productPreOrdersTable.status, "closed"),
                eq(productPreOrdersTable.adminNotified, false),
            ),
        );

    for (const window of unnotifiedWindows) {
        try {
            // Get the flavour name for the window label
            const flavour = window.flavourId
                ? await db.select({ name: flavoursTable.name }).from(flavoursTable).where(eq(flavoursTable.id, window.flavourId)).limit(1).then(r => r[0])
                : null;
            const windowName = flavour ? `${flavour.name} Pre-Order` : `Pre-Order #${window.id}`;

            // Find orders for this window, using preOrderWindowId for reliable matching.
            // Fall back to createdAt range + product join for legacy orders.
            const windowOrders = await db
                .select({
                    orderId: ordersTable.id,
                    orderNumber: ordersTable.orderNumber,
                    customerName: ordersTable.customerName,
                    locationName: locationsTable.name,
                    locationId: ordersTable.locationId,
                    totalCents: ordersTable.totalCents,
                    flavourName: orderItemsTable.flavourName,
                    sizeName: orderItemsTable.sizeName,
                    quantity: orderItemsTable.quantity,
                    priceCents: orderItemsTable.priceCents,
                })
                .from(ordersTable)
                .innerJoin(orderItemsTable, eq(orderItemsTable.orderId, ordersTable.id))
                .innerJoin(locationsTable, eq(locationsTable.id, ordersTable.locationId))
                .where(
                    and(
                        eq(orderItemsTable.preOrderWindowId, window.id),
                        ne(ordersTable.status, "cancelled"),
                        ne(ordersTable.status, "refunded"),
                    ),
                );

            // Fall back to legacy createdAt range + flavour join if nothing found
            const finalWindowOrders = windowOrders.length > 0 || window.flavourId === null
                ? windowOrders
                : await db
                    .select({
                        orderId: ordersTable.id,
                        orderNumber: ordersTable.orderNumber,
                        customerName: ordersTable.customerName,
                        locationName: locationsTable.name,
                        locationId: ordersTable.locationId,
                        totalCents: ordersTable.totalCents,
                        flavourName: orderItemsTable.flavourName,
                        sizeName: orderItemsTable.sizeName,
                        quantity: orderItemsTable.quantity,
                        priceCents: orderItemsTable.priceCents,
                    })
                    .from(ordersTable)
                    .innerJoin(orderItemsTable, eq(orderItemsTable.orderId, ordersTable.id))
                    .innerJoin(locationsTable, eq(locationsTable.id, ordersTable.locationId))
                    .innerJoin(productsTable, eq(productsTable.id, orderItemsTable.productId))
                    .where(
                        and(
                            sql`${ordersTable.createdAt} >= ${window.preOrderStart}`,
                            sql`${ordersTable.createdAt} <= ${window.preOrderEnd}`,
                            ne(ordersTable.status, "cancelled"),
                            ne(ordersTable.status, "refunded"),
                            eq(productsTable.flavourId, window.flavourId!),
                        ),
                    );

            // Aggregate line items
            const lineItemMap = new Map<string, { orderType: string; details: string; locationName: string; quantity: number; orderCount: number }>();
            const locationMap = new Map<number, { locationName: string; orderCount: number; orderIds: Set<number> }>();
            const orderIds = new Set<number>();

            for (const row of finalWindowOrders) {
                const key = `${row.flavourName}-${row.sizeName}-${row.locationName}`;
                const existing = lineItemMap.get(key);
                if (existing) {
                    existing.quantity += row.quantity;
                    if (!orderIds.has(row.orderId)) existing.orderCount++;
                } else {
                    lineItemMap.set(key, {
                        orderType: row.flavourName,
                        details: row.sizeName,
                        locationName: row.locationName,
                        quantity: row.quantity,
                        orderCount: 1,
                    });
                }

                const loc = locationMap.get(row.locationId);
                if (loc) {
                    loc.orderIds.add(row.orderId);
                    loc.orderCount = loc.orderIds.size;
                } else {
                    locationMap.set(row.locationId, {
                        locationName: row.locationName,
                        orderCount: 1,
                        orderIds: new Set([row.orderId]),
                    });
                }
                orderIds.add(row.orderId);
            }

            const totalRevenueCents = finalWindowOrders.reduce((sum, r) => sum + r.priceCents * r.quantity, 0);

            // Generate CSV
            const csvRows = [["Flavour", "Size", "Location", "Qty", "Customer", "Order #"].join(",")];
            for (const row of finalWindowOrders) {
                csvRows.push([row.flavourName, row.sizeName, row.locationName, row.quantity, `"${row.customerName}"`, row.orderNumber].join(","));
            }

            await sendWindowClosingReport(
                { id: window.id, name: windowName, closeAt: window.preOrderEnd },
                {
                    totalOrders: orderIds.size,
                    totalRevenueCents,
                    lineItems: Array.from(lineItemMap.values()),
                    locationSummaries: Array.from(locationMap.values()).map(loc => ({
                        locationName: loc.locationName,
                        orderCount: loc.orderCount,
                        pickupStartDate: window.pickupDate,
                        pickupEndDate: window.pickupEndDate,
                    })),
                },
                csvRows.join("\n"),
            );

            // Mark admin-notified only after successful send
            await db
                .update(productPreOrdersTable)
                .set({ adminNotified: true, updatedAt: new Date() })
                .where(eq(productPreOrdersTable.id, window.id));

            console.log(`[SCHEDULER] Sent fulfillment report for window ${window.id} (${windowName})`);
        } catch (err) {
            console.error(`[SCHEDULER] Fulfillment report failed for window ${window.id}:`, err);
        }
    }
}

/**
 * Daily 7 AM: Send admin reminders for recently closed windows,
 * customer pickup reminders for windows where pickup starts today,
 * last-chance pickup warnings 12 days after pickup started,
 * and bakery order pickup reminders.
 */
async function sendDailyReminders() {
    const now = new Date();
    const { todayStart, todayEnd, yesterdayStart } = getEasternDayBounds();

    // Ensure any pickup windows that started today (or earlier, if server was down) are readied first
    await markOrdersReadyForPickup();

    // ── Admin: orders closed reminder ──
    // Pre-orders that closed in the last 24 hours
    const recentlyClosed = await db
        .select()
        .from(productPreOrdersTable)
        .where(
            and(
                eq(productPreOrdersTable.status, "closed"),
                sql`${productPreOrdersTable.preOrderEnd} >= ${yesterdayStart}`,
                sql`${productPreOrdersTable.preOrderEnd} <= ${now}`,
            ),
        );

    for (const preOrder of recentlyClosed) {
        try {
            const label = `Pre-Order #${preOrder.id}`;
            await sendAdminOrdersClosedReminder(
                { id: preOrder.id, name: label, closeAt: preOrder.preOrderEnd },
                0,
            );

            await db.insert(emailNotificationsLogTable).values({
                preOrderId: preOrder.id,
                type: "admin_orders_closed",
                recipientEmail: process.env.ADMIN_EMAIL || "admin",
                status: "sent",
            });
        } catch (err) {
            console.error(
                `[SCHEDULER] Admin reminder failed for pre-order ${preOrder.id}:`,
                err,
            );
        }
    }

    // ── Customer: pickup reminders for windows where pickup starts today ──
    const pickupTodayWindows = await db
        .select()
        .from(productPreOrdersTable)
        .where(
            and(
                eq(productPreOrdersTable.status, "closed"),
                eq(productPreOrdersTable.customerNotified, false),
                sql`${productPreOrdersTable.pickupDate} >= ${todayStart}`,
                sql`${productPreOrdersTable.pickupDate} <= ${todayEnd}`,
            ),
        );

    for (const window of pickupTodayWindows) {
        try {
            const orders = await getOrdersForWindow(window);

            const pickupDateStr = new Date(window.pickupDate).toLocaleDateString("en-US", {
                weekday: "long", month: "long", day: "numeric", timeZone: BUSINESS_TZ,
            });
            const pickupEndStr = window.pickupEndDate
                ? new Date(window.pickupEndDate).toLocaleDateString("en-US", {
                    weekday: "long", month: "long", day: "numeric", timeZone: BUSINESS_TZ,
                })
                : null;
            const pickupTimeStr = pickupEndStr
                ? `Available through ${pickupEndStr}`
                : "During store hours";

            for (const order of orders) {
                try {
                    await sendCustomerPickupReminder({
                        customerName: order.customerName,
                        customerEmail: order.customerEmail,
                        orderNumber: order.orderNumber,
                        orderType: "Pre-Order",
                        pickupDate: pickupDateStr,
                        pickupTime: pickupTimeStr,
                        location: order.location,
                        items: order.items,
                    });

                    await db.insert(emailNotificationsLogTable).values({
                        preOrderId: window.id,
                        type: "customer_pickup_reminder",
                        recipientEmail: order.customerEmail,
                        status: "sent",
                    });
                } catch (err) {
                    console.error(`[SCHEDULER] Pickup reminder failed for order ${order.orderNumber}:`, err);
                    await db.insert(emailNotificationsLogTable).values({
                        preOrderId: window.id,
                        type: "customer_pickup_reminder",
                        recipientEmail: order.customerEmail,
                        status: "failed",
                        errorMessage: String(err),
                    });
                }
            }

            // Mark window as customer-notified
            await db
                .update(productPreOrdersTable)
                .set({ customerNotified: true, updatedAt: new Date() })
                .where(eq(productPreOrdersTable.id, window.id));

            console.log(`[SCHEDULER] Sent ${orders.length} pickup reminders for window ${window.id}`);
        } catch (err) {
            console.error(`[SCHEDULER] Pickup reminder batch failed for window ${window.id}:`, err);
        }
    }

    // ── Customer: last-chance pickup warnings (12 days after pickup started) ──
    const LAST_CHANCE_DAYS = 12;
    const lastChanceDate = new Date(todayStart.getTime() - LAST_CHANCE_DAYS * 24 * 60 * 60 * 1000);
    const lastChanceDateEnd = new Date(lastChanceDate.getTime() + 24 * 60 * 60 * 1000 - 1);

    const lastChanceWindows = await db
        .select()
        .from(productPreOrdersTable)
        .where(
            and(
                eq(productPreOrdersTable.status, "closed"),
                sql`${productPreOrdersTable.pickupDate} >= ${lastChanceDate}`,
                sql`${productPreOrdersTable.pickupDate} <= ${lastChanceDateEnd}`,
            ),
        );

    for (const window of lastChanceWindows) {
        try {
            const orders = await getOrdersForWindow(window);
            // Filter to only orders that haven't been picked up yet
            const unpickedOrders = orders.filter(o =>
                ["pending", "confirmed", "ready"].includes(o.status),
            );

            const deadlineDate = new Date(window.pickupDate);
            deadlineDate.setDate(deadlineDate.getDate() + 14);
            const deadlineStr = deadlineDate.toLocaleDateString("en-US", {
                weekday: "long", month: "long", day: "numeric", timeZone: BUSINESS_TZ,
            });

            for (const order of unpickedOrders) {
                // Check if we already sent a last-chance email for this order+window
                const alreadySent = await db
                    .select({ id: emailNotificationsLogTable.id })
                    .from(emailNotificationsLogTable)
                    .where(
                        and(
                            eq(emailNotificationsLogTable.preOrderId, window.id),
                            eq(emailNotificationsLogTable.type, "customer_last_chance_pickup"),
                            eq(emailNotificationsLogTable.recipientEmail, order.customerEmail),
                        ),
                    )
                    .limit(1);

                if (alreadySent.length > 0) continue;

                try {
                    await sendCustomerLastChancePickup({
                        customerName: order.customerName,
                        customerEmail: order.customerEmail,
                        orderNumber: order.orderNumber,
                        pickupDeadline: deadlineStr,
                        location: order.location,
                        items: order.items,
                    });

                    await db.insert(emailNotificationsLogTable).values({
                        preOrderId: window.id,
                        type: "customer_last_chance_pickup",
                        recipientEmail: order.customerEmail,
                        status: "sent",
                    });
                } catch (err) {
                    console.error(`[SCHEDULER] Last-chance reminder failed for order ${order.orderNumber}:`, err);
                    await db.insert(emailNotificationsLogTable).values({
                        preOrderId: window.id,
                        type: "customer_last_chance_pickup",
                        recipientEmail: order.customerEmail,
                        status: "failed",
                        errorMessage: String(err),
                    });
                }
            }

            if (unpickedOrders.length > 0) {
                console.log(`[SCHEDULER] Sent ${unpickedOrders.length} last-chance reminders for window ${window.id}`);
            }
        } catch (err) {
            console.error(`[SCHEDULER] Last-chance batch failed for window ${window.id}:`, err);
        }
    }

    // ── Customer: pickup-started notifications for windows where pickup starts today ──
    // This uses the customer_pickup_started notification type (distinct from pickup_reminder)
    const pickupStartedWindows = await db
        .select()
        .from(productPreOrdersTable)
        .where(
            and(
                eq(productPreOrdersTable.status, "closed"),
                sql`${productPreOrdersTable.pickupDate} >= ${todayStart}`,
                sql`${productPreOrdersTable.pickupDate} <= ${todayEnd}`,
            ),
        );

    for (const window of pickupStartedWindows) {
        await triggerPickupEmailsForWindow(window.id, window);
    }

    // ── Bakery: pickup reminders for orders with pickup today ──
    const todayDateStr = now.toLocaleDateString("sv-SE", { timeZone: BUSINESS_TZ }); // YYYY-MM-DD
    try {
        const bakeryOrders = await db
            .select()
            .from(bakeryOrdersTable)
            .where(
                and(
                    eq(bakeryOrdersTable.pickupDate, todayDateStr),
                    inArray(bakeryOrdersTable.status, ["confirmed", "in_progress"]),
                ),
            );

        for (const bOrder of bakeryOrders) {
            try {
                await sendCustomerPickupReminder({
                    customerName: bOrder.customerName,
                    customerEmail: bOrder.customerEmail,
                    orderNumber: bOrder.orderNumber,
                    orderType: `Bakery — ${bOrder.orderType}`,
                    pickupDate: bOrder.pickupDate,
                    pickupTime: bOrder.pickupTime,
                });
                console.log(`[SCHEDULER] Sent bakery pickup reminder for order ${bOrder.orderNumber}`);
            } catch (err) {
                console.error(`[SCHEDULER] Bakery pickup reminder failed for ${bOrder.orderNumber}:`, err);
            }
        }
    } catch (err) {
        console.error("[SCHEDULER] Bakery pickup reminders failed:", err);
    }
}

/**
 * Helper: get distinct orders linked to a pre-order window.
 * Uses orderItems.preOrderWindowId for a direct, reliable match.
 * Falls back to the createdAt-range + flavourId approach only for legacy orders
 * that pre-date the preOrderWindowId column.
 */
async function getOrdersForWindow(window: {
    id: number;
    flavourId: number | null;
    preOrderStart: Date;
    preOrderEnd: Date;
}) {
    // Primary: orders with items directly linked by preOrderWindowId
    const rows = await db
        .select({
            orderId: ordersTable.id,
            orderNumber: ordersTable.orderNumber,
            customerName: ordersTable.customerName,
            customerEmail: ordersTable.customerEmail,
            status: ordersTable.status,
            locationName: locationsTable.name,
            locationAddress: locationsTable.address,
            locationCity: locationsTable.city,
            locationState: locationsTable.state,
            locationZip: locationsTable.zip,
            locationPhone: locationsTable.phone,
            locationMapUrl: locationsTable.mapUrl,
            flavourName: orderItemsTable.flavourName,
            sizeName: orderItemsTable.sizeName,
            itemQuantity: orderItemsTable.quantity,
        })
        .from(ordersTable)
        .innerJoin(orderItemsTable, eq(orderItemsTable.orderId, ordersTable.id))
        .innerJoin(locationsTable, eq(locationsTable.id, ordersTable.locationId))
        .where(
            and(
                eq(orderItemsTable.preOrderWindowId, window.id),
                ne(ordersTable.status, "cancelled"),
                ne(ordersTable.status, "refunded"),
                orderPaidForFulfillment,
            ),
        );

    // If nothing found via preOrderWindowId, fall back to legacy createdAt range match
    let finalRows = rows;
    if (finalRows.length === 0 && window.flavourId !== null) {
        const legacyRows = await db
            .select({
                orderId: ordersTable.id,
                orderNumber: ordersTable.orderNumber,
                customerName: ordersTable.customerName,
                customerEmail: ordersTable.customerEmail,
                status: ordersTable.status,
                locationName: locationsTable.name,
                locationAddress: locationsTable.address,
                locationCity: locationsTable.city,
                locationState: locationsTable.state,
                locationZip: locationsTable.zip,
                locationPhone: locationsTable.phone,
                locationMapUrl: locationsTable.mapUrl,
                flavourName: orderItemsTable.flavourName,
                sizeName: orderItemsTable.sizeName,
                itemQuantity: orderItemsTable.quantity,
            })
            .from(ordersTable)
            .innerJoin(orderItemsTable, eq(orderItemsTable.orderId, ordersTable.id))
            .innerJoin(locationsTable, eq(locationsTable.id, ordersTable.locationId))
            .innerJoin(productsTable, eq(productsTable.id, orderItemsTable.productId))
            .where(
                and(
                    sql`${ordersTable.createdAt} >= ${window.preOrderStart}`,
                    sql`${ordersTable.createdAt} <= ${window.preOrderEnd}`,
                    ne(ordersTable.status, "cancelled"),
                    ne(ordersTable.status, "refunded"),
                    eq(productsTable.flavourId, window.flavourId),
                    orderPaidForFulfillment,
                ),
            );
        finalRows = legacyRows;
    }

    // Group by order ID, collecting items and location info
    const orderMap = new Map<number, {
        orderId: number;
        orderNumber: string;
        customerName: string;
        customerEmail: string;
        status: string;
        location: LocationInfo;
        items: { flavourName: string; sizeName: string; quantity: number }[];
    }>();

    for (const row of finalRows) {
        const existing = orderMap.get(row.orderId);
        if (existing) {
            existing.items.push({
                flavourName: row.flavourName,
                sizeName: row.sizeName,
                quantity: row.itemQuantity,
            });
        } else {
            orderMap.set(row.orderId, {
                orderId: row.orderId,
                orderNumber: row.orderNumber,
                customerName: row.customerName,
                customerEmail: row.customerEmail,
                status: row.status,
                location: {
                    name: row.locationName,
                    address: row.locationAddress,
                    city: row.locationCity,
                    state: row.locationState,
                    zip: row.locationZip,
                    phone: row.locationPhone,
                    mapUrl: row.locationMapUrl,
                },
                items: [{
                    flavourName: row.flavourName,
                    sizeName: row.sizeName,
                    quantity: row.itemQuantity,
                }],
            });
        }
    }

    return Array.from(orderMap.values());
}

/**
 * Send pickup-started emails for a specific pre-order window.
 * Exported so it can be triggered manually from the admin API.
 * Idempotent — skips emails already logged for this window + recipient.
 *
 * @returns { emailsSent, emailsSkipped }
 */
export async function triggerPickupEmailsForWindow(
    windowId: number,
    preOrderRow?: { pickupDate: Date; pickupEndDate: Date | null; flavourId: number | null; preOrderStart: Date; preOrderEnd: Date },
) {
    const window = preOrderRow ?? await db
        .select()
        .from(productPreOrdersTable)
        .where(eq(productPreOrdersTable.id, windowId))
        .limit(1)
        .then((r) => r[0]);

    if (!window) {
        throw new Error(`Pre-order window ${windowId} not found`);
    }

    const orders = await getOrdersForWindow({
        id: windowId,
        flavourId: window.flavourId,
        preOrderStart: window.preOrderStart,
        preOrderEnd: window.preOrderEnd,
    });

    const pickupDateStr = new Date(window.pickupDate).toLocaleDateString("en-US", {
        weekday: "long", month: "long", day: "numeric", timeZone: BUSINESS_TZ,
    });
    const pickupEndStr = window.pickupEndDate
        ? new Date(window.pickupEndDate).toLocaleDateString("en-US", {
            weekday: "long", month: "long", day: "numeric", timeZone: BUSINESS_TZ,
        })
        : null;
    const pickupDateRange = pickupEndStr
        ? `${pickupDateStr} through ${pickupEndStr}`
        : `Starting ${pickupDateStr}`;

    let emailsSent = 0;
    let emailsSkipped = 0;

    for (const order of orders) {
        // Idempotency: skip if already sent for this window + email
        const alreadySent = await db
            .select({ id: emailNotificationsLogTable.id })
            .from(emailNotificationsLogTable)
            .where(
                and(
                    eq(emailNotificationsLogTable.preOrderId, windowId),
                    eq(emailNotificationsLogTable.type, "customer_pickup_started"),
                    eq(emailNotificationsLogTable.recipientEmail, order.customerEmail),
                ),
            )
            .limit(1);

        if (alreadySent.length > 0) {
            emailsSkipped++;
            continue;
        }

        try {
            await sendCustomerPickupStarted({
                customerName: order.customerName,
                customerEmail: order.customerEmail,
                orderNumber: order.orderNumber,
                pickupDateRange,
                location: order.location,
                items: order.items,
            });

            await db.insert(emailNotificationsLogTable).values({
                preOrderId: windowId,
                type: "customer_pickup_started",
                recipientEmail: order.customerEmail,
                status: "sent",
            });
            emailsSent++;
        } catch (err) {
            console.error(`[SCHEDULER] Pickup-started email failed for order ${order.orderNumber}:`, err);
            await db.insert(emailNotificationsLogTable).values({
                preOrderId: windowId,
                type: "customer_pickup_started",
                recipientEmail: order.customerEmail,
                status: "failed",
                errorMessage: String(err),
            });
        }
    }

    console.log(`[SCHEDULER] triggerPickupEmailsForWindow(${windowId}): sent=${emailsSent}, skipped=${emailsSkipped}, total=${orders.length}`);
    return { emailsSent, emailsSkipped, totalOrders: orders.length };
}

/**
 * Daily midnight: Auto-create next instances for recurring pre-orders.
 */
async function processRecurringWindows() {
    const recurringPreOrders = await db
        .select()
        .from(productPreOrdersTable)
        .where(
            and(
                eq(productPreOrdersTable.isRecurring, true),
                eq(productPreOrdersTable.status, "closed"),
            ),
        );

    for (const preOrder of recurringPreOrders) {
        try {
            const rule = preOrder.recurringRule as Record<string, any> | null;
            if (!rule) continue;

            const originalDuration =
                new Date(preOrder.preOrderEnd).getTime() - new Date(preOrder.preOrderStart).getTime();
            const intervalDays = (rule.intervalDays as number) || 7;

            // Next cycle starts after this window's close date (not the original start)
            const nextStart = new Date(preOrder.preOrderEnd);
            nextStart.setDate(nextStart.getDate() + intervalDays);

            const nextEnd = new Date(nextStart.getTime() + originalDuration);

            const now = new Date();
            // Don't create if the next window would already be over
            if (nextEnd <= now) continue;

            // Check if a duplicate already exists
            const existing = await db
                .select()
                .from(productPreOrdersTable)
                .where(
                    and(
                        preOrder.flavourId
                            ? eq(productPreOrdersTable.flavourId, preOrder.flavourId)
                            : undefined,
                        sql`${productPreOrdersTable.preOrderStart} = ${nextStart}`,
                    ),
                )
                .limit(1);

            if (existing.length > 0) continue;

            // Shift pickup dates
            const newPickupDate = new Date(preOrder.pickupDate);
            newPickupDate.setDate(newPickupDate.getDate() + intervalDays);
            const newPickupEndDate = preOrder.pickupEndDate
                ? new Date(new Date(preOrder.pickupEndDate).getTime() + intervalDays * 24 * 60 * 60 * 1000)
                : null;

            const [created] = await db
                .insert(productPreOrdersTable)
                .values({
                    flavourId: preOrder.flavourId,
                    preOrderStart: nextStart,
                    preOrderEnd: nextEnd,
                    pickupDate: newPickupDate,
                    pickupEndDate: newPickupEndDate,
                    isRecurring: true,
                    recurringRule: preOrder.recurringRule,
                    status: nextStart <= now && nextEnd > now ? "open" : "scheduled",
                })
                .returning();

            // Prevent this closed instance from spawning duplicates on future cron runs
            await db
                .update(productPreOrdersTable)
                .set({ isRecurring: false, updatedAt: now })
                .where(eq(productPreOrdersTable.id, preOrder.id));

            console.log(
                `[SCHEDULER] Created recurring pre-order (${created.id}) starting ${nextStart.toISOString()}`,
            );
        } catch (err) {
            console.error(
                `[SCHEDULER] Recurring pre-order creation failed for ${preOrder.id}:`,
                err,
            );
        }
    }
}
