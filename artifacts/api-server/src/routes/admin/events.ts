import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
    eventsTable,
    eventTicketTypesTable,
    eventOrdersTable,
    eventOrderItemsTable,
    eventTicketsTable,
    eventQuestionsTable,
    locationsTable,
} from "@workspace/db/schema";
import { eq, desc, asc, and, gte, lte, sql, count, inArray, or, ilike } from "drizzle-orm";
import * as crypto from "node:crypto";
import { sendTicketConfirmation, sendEventUpdate } from "../../lib/email";
import { refundPayment } from "../../lib/square";

const router: IRouter = Router();

// ── Dashboard Stats ──

router.get("/stats", async (_req, res) => {
    const today = new Date().toISOString().split("T")[0];

    const [totalEvents] = await db
        .select({ count: count() })
        .from(eventsTable)
        .where(eq(eventsTable.active, true));

    const [upcomingEvents] = await db
        .select({ count: count() })
        .from(eventsTable)
        .where(
            and(
                eq(eventsTable.active, true),
                eq(eventsTable.status, "published"),
                gte(eventsTable.eventDate, today),
            ),
        );

    const [totalTicketsSold] = await db
        .select({
            count: sql<number>`COALESCE(SUM(${eventTicketTypesTable.quantitySold}), 0)`,
        })
        .from(eventTicketTypesTable);

    const [totalRevenue] = await db
        .select({
            total: sql<number>`COALESCE(SUM(${eventOrdersTable.totalCents}), 0)`,
        })
        .from(eventOrdersTable)
        .where(
            sql`${eventOrdersTable.status} NOT IN ('cancelled', 'refunded')`,
        );

    res.json({
        totalEvents: totalEvents.count,
        upcomingEvents: upcomingEvents.count,
        totalTicketsSold: totalTicketsSold.count,
        totalRevenueCents: totalRevenue.total,
    });
});

// ── List Events ──

router.get("/", async (req, res) => {
    const status = req.query.status as string | undefined;
    const category = req.query.category as string | undefined;
    const locationId = req.query.locationId
        ? Number(req.query.locationId)
        : undefined;
    const dateFrom = req.query.dateFrom as string | undefined;
    const dateTo = req.query.dateTo as string | undefined;

    const conditions = [eq(eventsTable.active, true)];
    if (status) conditions.push(eq(eventsTable.status, status as any));
    if (category) conditions.push(eq(eventsTable.category, category as any));
    if (locationId) conditions.push(eq(eventsTable.locationId, locationId));
    if (dateFrom) conditions.push(gte(eventsTable.eventDate, dateFrom));
    if (dateTo) conditions.push(lte(eventsTable.eventDate, dateTo));

    const events = await db
        .select({
            id: eventsTable.id,
            title: eventsTable.title,
            slug: eventsTable.slug,
            description: eventsTable.description,
            imageUrl: eventsTable.imageUrl,
            locationId: eventsTable.locationId,
            locationName: locationsTable.name,
            venueName: eventsTable.venueName,
            venueAddress: eventsTable.venueAddress,
            eventDate: eventsTable.eventDate,
            startTime: eventsTable.startTime,
            endTime: eventsTable.endTime,
            category: eventsTable.category,
            status: eventsTable.status,
            isPrivate: eventsTable.isPrivate,
            recurringGroupId: eventsTable.recurringGroupId,
            accentColor: eventsTable.accentColor,
            sortOrder: eventsTable.sortOrder,
            active: eventsTable.active,
            createdAt: eventsTable.createdAt,
            updatedAt: eventsTable.updatedAt,
        })
        .from(eventsTable)
        .leftJoin(locationsTable, eq(eventsTable.locationId, locationsTable.id))
        .where(and(...conditions))
        .orderBy(asc(eventsTable.eventDate));

    // Batch-fetch ticket types for all events (avoids N+1)
    const eventIds = events.map((e) => e.id);
    const allTicketTypes = eventIds.length > 0
        ? await db
            .select()
            .from(eventTicketTypesTable)
            .where(inArray(eventTicketTypesTable.eventId, eventIds))
            .orderBy(asc(eventTicketTypesTable.sortOrder))
        : [];

    const ticketsByEvent = new Map<number, typeof allTicketTypes>();
    for (const tt of allTicketTypes) {
        const list = ticketsByEvent.get(tt.eventId) ?? [];
        list.push(tt);
        ticketsByEvent.set(tt.eventId, list);
    }

    const eventsWithTickets = events.map((event) => {
        const ticketTypes = ticketsByEvent.get(event.id) ?? [];
        const totalCapacity = ticketTypes.reduce(
            (sum, t) => sum + t.quantity,
            0,
        );
        const totalSold = ticketTypes.reduce(
            (sum, t) => sum + t.quantitySold,
            0,
        );
        return { ...event, ticketTypes, totalCapacity, totalSold };
    });

    res.json(eventsWithTickets);
});

// ── Get Single Event ──

router.get("/:id", async (req, res) => {
    const id = Number(req.params.id);

    const [event] = await db
        .select({
            id: eventsTable.id,
            title: eventsTable.title,
            slug: eventsTable.slug,
            description: eventsTable.description,
            imageUrl: eventsTable.imageUrl,
            locationId: eventsTable.locationId,
            locationName: locationsTable.name,
            venueName: eventsTable.venueName,
            venueAddress: eventsTable.venueAddress,
            eventDate: eventsTable.eventDate,
            startTime: eventsTable.startTime,
            endTime: eventsTable.endTime,
            category: eventsTable.category,
            status: eventsTable.status,
            isPrivate: eventsTable.isPrivate,
            recurringGroupId: eventsTable.recurringGroupId,
            accentColor: eventsTable.accentColor,
            sortOrder: eventsTable.sortOrder,
            active: eventsTable.active,
            createdAt: eventsTable.createdAt,
            updatedAt: eventsTable.updatedAt,
        })
        .from(eventsTable)
        .leftJoin(locationsTable, eq(eventsTable.locationId, locationsTable.id))
        .where(eq(eventsTable.id, id))
        .limit(1);

    if (!event) {
        res.status(404).json({ error: "Event not found" });
        return;
    }

    const ticketTypes = await db
        .select()
        .from(eventTicketTypesTable)
        .where(eq(eventTicketTypesTable.eventId, id))
        .orderBy(asc(eventTicketTypesTable.sortOrder));

    const [orderStats] = await db
        .select({
            totalOrders: count(),
            totalRevenue: sql<number>`COALESCE(SUM(${eventOrdersTable.totalCents}), 0)`,
        })
        .from(eventOrdersTable)
        .where(
            and(
                eq(eventOrdersTable.eventId, id),
                sql`${eventOrdersTable.status} NOT IN ('cancelled', 'refunded')`,
            ),
        );

    res.json({ ...event, ticketTypes, orderStats });
});

// ── Create Event ──

router.post("/", async (req, res) => {
    const {
        title,
        slug,
        description,
        imageUrl,
        locationId,
        venueName,
        venueAddress,
        eventDate,
        startTime,
        endTime,
        category,
        status,
        isPrivate,
        accentColor,
        sortOrder,
        ticketTypes,
    } = req.body;

    if (!title || !slug || !eventDate || !startTime) {
        res.status(400).json({
            error: "Title, slug, event date, and start time are required",
        });
        return;
    }

    const [event] = await db
        .insert(eventsTable)
        .values({
            title,
            slug,
            description: description ?? "",
            imageUrl: imageUrl ?? null,
            locationId: locationId ?? null,
            venueName: venueName ?? null,
            venueAddress: venueAddress ?? null,
            eventDate,
            startTime,
            endTime: endTime ?? null,
            category: category ?? "other",
            status: status ?? "draft",
            isPrivate: isPrivate ?? false,
            accentColor: accentColor ?? "#A1AB74",
            sortOrder: sortOrder ?? 0,
        })
        .returning();

    // Insert ticket types if provided
    if (ticketTypes && Array.isArray(ticketTypes)) {
        for (const tt of ticketTypes) {
            await db.insert(eventTicketTypesTable).values({
                eventId: event.id,
                name: tt.name,
                description: tt.description ?? "",
                priceCents: tt.priceCents,
                quantity: tt.quantity,
                maxPerOrder: tt.maxPerOrder ?? 10,
                sortOrder: tt.sortOrder ?? 0,
                active: tt.active ?? true,
            });
        }
    }

    const allTicketTypes = await db
        .select()
        .from(eventTicketTypesTable)
        .where(eq(eventTicketTypesTable.eventId, event.id))
        .orderBy(asc(eventTicketTypesTable.sortOrder));

    res.status(201).json({ ...event, ticketTypes: allTicketTypes });
});

// ── Update Event ──

router.put("/:id", async (req, res) => {
    const id = Number(req.params.id);
    const {
        title,
        slug,
        description,
        imageUrl,
        locationId,
        venueName,
        venueAddress,
        eventDate,
        startTime,
        endTime,
        category,
        status,
        isPrivate,
        accentColor,
        sortOrder,
        active,
        ticketTypes,
    } = req.body;

    const [event] = await db
        .update(eventsTable)
        .set({
            ...(title !== undefined && { title }),
            ...(slug !== undefined && { slug }),
            ...(description !== undefined && { description }),
            ...(imageUrl !== undefined && { imageUrl }),
            ...(locationId !== undefined && { locationId }),
            ...(venueName !== undefined && { venueName }),
            ...(venueAddress !== undefined && { venueAddress }),
            ...(eventDate !== undefined && { eventDate }),
            ...(startTime !== undefined && { startTime }),
            ...(endTime !== undefined && { endTime }),
            ...(category !== undefined && { category }),
            ...(status !== undefined && { status }),
            ...(isPrivate !== undefined && { isPrivate }),
            ...(accentColor !== undefined && { accentColor }),
            ...(sortOrder !== undefined && { sortOrder }),
            ...(active !== undefined && { active }),
            updatedAt: new Date(),
        })
        .where(eq(eventsTable.id, id))
        .returning();

    if (!event) {
        res.status(404).json({ error: "Event not found" });
        return;
    }

    // Replace ticket types if provided
    if (ticketTypes && Array.isArray(ticketTypes)) {
        // Delete ticket types that aren't in the update (only if no tickets sold)
        const existingTypes = await db
            .select()
            .from(eventTicketTypesTable)
            .where(eq(eventTicketTypesTable.eventId, id));

        const incomingIds = ticketTypes
            .filter((tt: any) => tt.id)
            .map((tt: any) => tt.id);

        for (const existing of existingTypes) {
            if (!incomingIds.includes(existing.id) && existing.quantitySold === 0) {
                await db
                    .delete(eventTicketTypesTable)
                    .where(eq(eventTicketTypesTable.id, existing.id));
            }
        }

        for (const tt of ticketTypes) {
            if (tt.id) {
                // Update existing
                await db
                    .update(eventTicketTypesTable)
                    .set({
                        ...(tt.name !== undefined && { name: tt.name }),
                        ...(tt.description !== undefined && {
                            description: tt.description,
                        }),
                        ...(tt.priceCents !== undefined && {
                            priceCents: tt.priceCents,
                        }),
                        ...(tt.quantity !== undefined && {
                            quantity: tt.quantity,
                        }),
                        ...(tt.maxPerOrder !== undefined && {
                            maxPerOrder: tt.maxPerOrder,
                        }),
                        ...(tt.sortOrder !== undefined && {
                            sortOrder: tt.sortOrder,
                        }),
                        ...(tt.active !== undefined && { active: tt.active }),
                        updatedAt: new Date(),
                    })
                    .where(eq(eventTicketTypesTable.id, tt.id));
            } else {
                // Create new
                await db.insert(eventTicketTypesTable).values({
                    eventId: id,
                    name: tt.name,
                    description: tt.description ?? "",
                    priceCents: tt.priceCents,
                    quantity: tt.quantity,
                    maxPerOrder: tt.maxPerOrder ?? 10,
                    sortOrder: tt.sortOrder ?? 0,
                    active: tt.active ?? true,
                });
            }
        }
    }

    const allTicketTypes = await db
        .select()
        .from(eventTicketTypesTable)
        .where(eq(eventTicketTypesTable.eventId, id))
        .orderBy(asc(eventTicketTypesTable.sortOrder));

    res.json({ ...event, ticketTypes: allTicketTypes });
});

// ── Delete (Soft) ──

router.delete("/:id", async (req, res) => {
    const id = Number(req.params.id);
    const [event] = await db
        .update(eventsTable)
        .set({ active: false, updatedAt: new Date() })
        .where(eq(eventsTable.id, id))
        .returning();

    if (!event) {
        res.status(404).json({ error: "Event not found" });
        return;
    }
    res.json({ success: true });
});

// ── Duplicate Event ──

router.post("/:id/duplicate", async (req, res) => {
    const id = Number(req.params.id);
    const { eventDate, startTime, endTime } = req.body;

    const [source] = await db
        .select()
        .from(eventsTable)
        .where(eq(eventsTable.id, id))
        .limit(1);

    if (!source) {
        res.status(404).json({ error: "Event not found" });
        return;
    }

    const newSlug = `${source.slug}-${Date.now()}`;
    const [newEvent] = await db
        .insert(eventsTable)
        .values({
            title: source.title,
            slug: newSlug,
            description: source.description,
            imageUrl: source.imageUrl,
            locationId: source.locationId,
            venueName: source.venueName,
            venueAddress: source.venueAddress,
            eventDate: eventDate ?? source.eventDate,
            startTime: startTime ?? source.startTime,
            endTime: endTime ?? source.endTime,
            category: source.category,
            status: "draft",
            isPrivate: source.isPrivate,
            recurringGroupId: source.recurringGroupId,
            accentColor: source.accentColor,
            sortOrder: source.sortOrder,
        })
        .returning();

    // Duplicate ticket types
    const sourceTickets = await db
        .select()
        .from(eventTicketTypesTable)
        .where(eq(eventTicketTypesTable.eventId, id));

    for (const tt of sourceTickets) {
        await db.insert(eventTicketTypesTable).values({
            eventId: newEvent.id,
            name: tt.name,
            description: tt.description,
            priceCents: tt.priceCents,
            quantity: tt.quantity,
            maxPerOrder: tt.maxPerOrder,
            sortOrder: tt.sortOrder,
            active: tt.active,
        });
    }

    const allTicketTypes = await db
        .select()
        .from(eventTicketTypesTable)
        .where(eq(eventTicketTypesTable.eventId, newEvent.id))
        .orderBy(asc(eventTicketTypesTable.sortOrder));

    res.status(201).json({ ...newEvent, ticketTypes: allTicketTypes });
});

// ── Create Recurring Events ──

router.post("/recurring", async (req, res) => {
    const { sourceEventId, frequency, count: eventCount, startDate } = req.body;

    if (!sourceEventId || !frequency || !eventCount || !startDate) {
        res.status(400).json({
            error: "sourceEventId, frequency, count, and startDate are required",
        });
        return;
    }

    const [source] = await db
        .select()
        .from(eventsTable)
        .where(eq(eventsTable.id, sourceEventId))
        .limit(1);

    if (!source) {
        res.status(404).json({ error: "Source event not found" });
        return;
    }

    const recurringGroupId = crypto.randomUUID();
    const sourceTickets = await db
        .select()
        .from(eventTicketTypesTable)
        .where(eq(eventTicketTypesTable.eventId, sourceEventId));

    const created = [];
    const frequencyDays =
        frequency === "weekly" ? 7 : frequency === "biweekly" ? 14 : 30;

    for (let i = 0; i < eventCount; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i * frequencyDays);
        const dateStr = date.toISOString().split("T")[0];

        const [newEvent] = await db
            .insert(eventsTable)
            .values({
                title: source.title,
                slug: `${source.slug}-${dateStr}`,
                description: source.description,
                imageUrl: source.imageUrl,
                locationId: source.locationId,
                venueName: source.venueName,
                venueAddress: source.venueAddress,
                eventDate: dateStr,
                startTime: source.startTime,
                endTime: source.endTime,
                category: source.category,
                status: "draft",
                isPrivate: source.isPrivate,
                recurringGroupId,
                accentColor: source.accentColor,
                sortOrder: source.sortOrder,
            })
            .returning();

        for (const tt of sourceTickets) {
            await db.insert(eventTicketTypesTable).values({
                eventId: newEvent.id,
                name: tt.name,
                description: tt.description,
                priceCents: tt.priceCents,
                quantity: tt.quantity,
                maxPerOrder: tt.maxPerOrder,
                sortOrder: tt.sortOrder,
                active: tt.active,
            });
        }

        created.push(newEvent);
    }

    res.status(201).json({ recurringGroupId, events: created });
});

// ── Attendees ──

router.get("/:id/attendees", async (req, res) => {
    const id = Number(req.params.id);
    const search = req.query.search as string | undefined;

    let conditions = [eq(eventTicketsTable.eventId, id)];

    const tickets = await db
        .select({
            id: eventTicketsTable.id,
            ticketCode: eventTicketsTable.ticketCode,
            attendeeName: eventTicketsTable.attendeeName,
            attendeeEmail: eventTicketsTable.attendeeEmail,
            status: eventTicketsTable.status,
            checkedIn: eventTicketsTable.checkedIn,
            checkedInAt: eventTicketsTable.checkedInAt,
            ticketTypeName: eventTicketTypesTable.name,
            orderNumber: eventOrdersTable.orderNumber,
            customerName: eventOrdersTable.customerName,
            customerEmail: eventOrdersTable.customerEmail,
            createdAt: eventTicketsTable.createdAt,
        })
        .from(eventTicketsTable)
        .innerJoin(
            eventTicketTypesTable,
            eq(eventTicketsTable.ticketTypeId, eventTicketTypesTable.id),
        )
        .innerJoin(
            eventOrdersTable,
            eq(eventTicketsTable.eventOrderId, eventOrdersTable.id),
        )
        .where(and(...conditions))
        .orderBy(asc(eventTicketsTable.createdAt));

    // Filter in-memory for search since we're searching across multiple columns
    const filtered = search
        ? tickets.filter(
            (t) =>
                t.attendeeName
                    ?.toLowerCase()
                    .includes(search.toLowerCase()) ||
                t.customerName
                    ?.toLowerCase()
                    .includes(search.toLowerCase()) ||
                t.customerEmail
                    ?.toLowerCase()
                    .includes(search.toLowerCase()) ||
                t.ticketCode
                    ?.toLowerCase()
                    .includes(search.toLowerCase()),
        )
        : tickets;

    res.json(filtered);
});

// ── Check In Ticket ──

router.put("/tickets/:ticketId/check-in", async (req, res) => {
    const ticketId = Number(req.params.ticketId);

    const [ticket] = await db
        .select()
        .from(eventTicketsTable)
        .where(eq(eventTicketsTable.id, ticketId))
        .limit(1);

    if (!ticket) {
        res.status(404).json({ error: "Ticket not found" });
        return;
    }

    const newCheckedIn = !ticket.checkedIn;
    const [updated] = await db
        .update(eventTicketsTable)
        .set({
            checkedIn: newCheckedIn,
            checkedInAt: newCheckedIn ? new Date() : null,
            updatedAt: new Date(),
        })
        .where(eq(eventTicketsTable.id, ticketId))
        .returning();

    res.json(updated);
});

// ── Cancel Ticket ──

router.put("/tickets/:ticketId/cancel", async (req, res) => {
    const ticketId = Number(req.params.ticketId);

    const [ticket] = await db
        .select()
        .from(eventTicketsTable)
        .where(eq(eventTicketsTable.id, ticketId))
        .limit(1);

    if (!ticket) {
        res.status(404).json({ error: "Ticket not found" });
        return;
    }

    if (ticket.status !== "active") {
        res.status(400).json({ error: "Ticket is not active" });
        return;
    }

    await db
        .update(eventTicketsTable)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(eq(eventTicketsTable.id, ticketId));

    // Decrement quantitySold
    await db
        .update(eventTicketTypesTable)
        .set({
            quantitySold: sql`${eventTicketTypesTable.quantitySold} - 1`,
            updatedAt: new Date(),
        })
        .where(eq(eventTicketTypesTable.id, ticket.ticketTypeId));

    res.json({ success: true });
});

// ── Refund Ticket ──

router.put("/tickets/:ticketId/refund", async (req, res) => {
    const ticketId = Number(req.params.ticketId);

    const [ticket] = await db
        .select()
        .from(eventTicketsTable)
        .where(eq(eventTicketsTable.id, ticketId))
        .limit(1);

    if (!ticket) {
        res.status(404).json({ error: "Ticket not found" });
        return;
    }

    if (ticket.status !== "active") {
        res.status(400).json({ error: "Ticket is not active" });
        return;
    }

    // Get the ticket type price for refund amount
    const [ticketType] = await db
        .select()
        .from(eventTicketTypesTable)
        .where(eq(eventTicketTypesTable.id, ticket.ticketTypeId))
        .limit(1);

    // Try to refund via Square if payment exists
    const [order] = await db
        .select()
        .from(eventOrdersTable)
        .where(eq(eventOrdersTable.id, ticket.eventOrderId))
        .limit(1);

    if (order?.squarePaymentId) {
        try {
            const { refundPayment } = await import("../../lib/square");
            await refundPayment(
                order.squarePaymentId,
                ticketType?.priceCents ?? 0,
            );
        } catch (e) {
            console.error("[SQUARE REFUND ERROR]", e);
        }
    }

    await db
        .update(eventTicketsTable)
        .set({ status: "refunded", updatedAt: new Date() })
        .where(eq(eventTicketsTable.id, ticketId));

    // Decrement quantitySold
    await db
        .update(eventTicketTypesTable)
        .set({
            quantitySold: sql`${eventTicketTypesTable.quantitySold} - 1`,
            updatedAt: new Date(),
        })
        .where(eq(eventTicketTypesTable.id, ticket.ticketTypeId));

    res.json({ success: true });
});

// ── Event Orders ──

router.get("/:id/orders", async (req, res) => {
    const id = Number(req.params.id);

    const orders = await db
        .select()
        .from(eventOrdersTable)
        .where(eq(eventOrdersTable.eventId, id))
        .orderBy(desc(eventOrdersTable.createdAt));

    const ordersWithItems = await Promise.all(
        orders.map(async (order) => {
            const items = await db
                .select()
                .from(eventOrderItemsTable)
                .where(eq(eventOrderItemsTable.eventOrderId, order.id));
            return { ...order, items };
        }),
    );

    res.json(ordersWithItems);
});

// ── Email Attendees ──

router.post("/:id/email", async (req, res) => {
    const id = Number(req.params.id);
    const { subject, message } = req.body;

    if (!subject || !message) {
        res.status(400).json({ error: "Subject and message are required" });
        return;
    }

    const [event] = await db
        .select()
        .from(eventsTable)
        .where(eq(eventsTable.id, id))
        .limit(1);

    if (!event) {
        res.status(404).json({ error: "Event not found" });
        return;
    }

    // Get all active ticket holder emails (deduplicated)
    const tickets = await db
        .select({
            customerEmail: eventOrdersTable.customerEmail,
            customerName: eventOrdersTable.customerName,
        })
        .from(eventTicketsTable)
        .innerJoin(
            eventOrdersTable,
            eq(eventTicketsTable.eventOrderId, eventOrdersTable.id),
        )
        .where(
            and(
                eq(eventTicketsTable.eventId, id),
                eq(eventTicketsTable.status, "active"),
            ),
        );

    const uniqueEmails = [
        ...new Map(tickets.map((t) => [t.customerEmail, t])).values(),
    ];

    let sent = 0;
    for (const attendee of uniqueEmails) {
        sendEventUpdate({
            eventTitle: event.title,
            eventDate: event.eventDate,
            customerName: attendee.customerName,
            customerEmail: attendee.customerEmail,
            subject,
            message,
        }).catch((e) =>
            console.error("[EMAIL] Event update failed:", e),
        );
        sent++;
    }

    res.json({ sent });
});

// ── Event Questions ──

router.get("/:id/questions", async (req, res) => {
    const eventId = Number(req.params.id);
    const questions = await db
        .select()
        .from(eventQuestionsTable)
        .where(eq(eventQuestionsTable.eventId, eventId))
        .orderBy(desc(eventQuestionsTable.createdAt));
    res.json(questions);
});

router.put("/questions/:questionId/read", async (req, res): Promise<void> => {
    const questionId = Number(req.params.questionId);
    const [updated] = await db
        .update(eventQuestionsTable)
        .set({ read: true })
        .where(eq(eventQuestionsTable.id, questionId))
        .returning();
    if (!updated) {
        res.status(404).json({ error: "Question not found" });
        return;
    }
    res.json(updated);
});

router.delete("/questions/:questionId", async (req, res) => {
    const questionId = Number(req.params.questionId);
    await db.delete(eventQuestionsTable).where(eq(eventQuestionsTable.id, questionId));
    res.json({ ok: true });
});

// ═══════════════════════════════════════
// ── Event Order Management ──
// ═══════════════════════════════════════

// List orders for an event (or all events if no eventId filter)
router.get("/orders/all", async (req, res) => {
    const eventId = req.query.eventId ? Number(req.query.eventId) : undefined;
    const status = req.query.status as string | undefined;
    const search = (req.query.search as string | undefined)?.trim();
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    const conditions = [];
    if (eventId) conditions.push(eq(eventOrdersTable.eventId, eventId));
    if (status) conditions.push(eq(eventOrdersTable.status, status as any));
    if (search) {
        conditions.push(
            or(
                ilike(eventOrdersTable.orderNumber, `%${search}%`),
                ilike(eventOrdersTable.customerName, `%${search}%`),
                ilike(eventOrdersTable.customerEmail, `%${search}%`),
                ilike(eventOrdersTable.squarePaymentId, `%${search}%`),
                ilike(eventOrdersTable.squareOrderId, `%${search}%`),
                ilike(eventOrdersTable.squareReceiptNumber, `%${search}%`),
            )!,
        );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult] = await db
        .select({ count: count() })
        .from(eventOrdersTable)
        .innerJoin(eventsTable, eq(eventOrdersTable.eventId, eventsTable.id))
        .where(whereClause);

    const orders = await db
        .select({
            id: eventOrdersTable.id,
            orderNumber: eventOrdersTable.orderNumber,
            eventId: eventOrdersTable.eventId,
            eventTitle: eventsTable.title,
            eventDate: eventsTable.eventDate,
            customerName: eventOrdersTable.customerName,
            customerEmail: eventOrdersTable.customerEmail,
            status: eventOrdersTable.status,
            totalCents: eventOrdersTable.totalCents,
            squareOrderId: eventOrdersTable.squareOrderId,
            squarePaymentId: eventOrdersTable.squarePaymentId,
            squareReceiptNumber: eventOrdersTable.squareReceiptNumber,
            ticketCount: sql<number>`(select count(*) from event_tickets where event_order_id = ${eventOrdersTable.id})::int`,
            createdAt: eventOrdersTable.createdAt,
        })
        .from(eventOrdersTable)
        .innerJoin(eventsTable, eq(eventOrdersTable.eventId, eventsTable.id))
        .where(whereClause)
        .orderBy(desc(eventOrdersTable.createdAt))
        .limit(limit)
        .offset(offset);

    res.json({ data: orders, total: totalResult.count, limit, offset });
});

// Get single event order with items and tickets
router.get("/orders/:orderId", async (req, res) => {
    const orderId = Number(req.params.orderId);

    const [order] = await db
        .select({
            id: eventOrdersTable.id,
            orderNumber: eventOrdersTable.orderNumber,
            eventId: eventOrdersTable.eventId,
            eventTitle: eventsTable.title,
            eventDate: eventsTable.eventDate,
            customerName: eventOrdersTable.customerName,
            customerEmail: eventOrdersTable.customerEmail,
            status: eventOrdersTable.status,
            totalCents: eventOrdersTable.totalCents,
            squareOrderId: eventOrdersTable.squareOrderId,
            squarePaymentId: eventOrdersTable.squarePaymentId,
            notes: eventOrdersTable.notes,
            createdAt: eventOrdersTable.createdAt,
        })
        .from(eventOrdersTable)
        .innerJoin(eventsTable, eq(eventOrdersTable.eventId, eventsTable.id))
        .where(eq(eventOrdersTable.id, orderId))
        .limit(1);

    if (!order) {
        res.status(404).json({ error: "Event order not found" });
        return;
    }

    const items = await db
        .select()
        .from(eventOrderItemsTable)
        .where(eq(eventOrderItemsTable.eventOrderId, orderId));

    const tickets = await db
        .select()
        .from(eventTicketsTable)
        .where(eq(eventTicketsTable.eventOrderId, orderId));

    res.json({ ...order, items, tickets });
});

// Update event order status
router.put("/orders/:orderId/status", async (req, res) => {
    const orderId = Number(req.params.orderId);
    const { status } = req.body;

    const validStatuses = ["confirmed", "cancelled", "refunded"];
    if (!validStatuses.includes(status)) {
        res.status(400).json({ error: "Invalid status" });
        return;
    }

    const [order] = await db
        .update(eventOrdersTable)
        .set({ status, updatedAt: new Date() })
        .where(eq(eventOrdersTable.id, orderId))
        .returning();

    if (!order) {
        res.status(404).json({ error: "Event order not found" });
        return;
    }

    // If cancelling, mark tickets as cancelled too
    if (status === "cancelled") {
        await db
            .update(eventTicketsTable)
            .set({ status: "cancelled", updatedAt: new Date() })
            .where(eq(eventTicketsTable.eventOrderId, orderId));
    }

    res.json(order);
});

// Refund event order
router.post("/orders/:orderId/refund", async (req, res) => {
    const orderId = Number(req.params.orderId);

    const [order] = await db
        .select()
        .from(eventOrdersTable)
        .where(eq(eventOrdersTable.id, orderId))
        .limit(1);

    if (!order) {
        res.status(404).json({ error: "Event order not found" });
        return;
    }

    if (order.status === "refunded") {
        res.status(400).json({ error: "Order is already refunded" });
        return;
    }

    let refundError: string | null = null;

    // Attempt Square refund if payment exists
    if (order.squarePaymentId) {
        try {
            await refundPayment(order.squarePaymentId, order.totalCents);
        } catch (e: any) {
            console.error("[SQUARE] Event refund failed:", e);
            refundError = e?.message || "Square refund failed";
        }
    }

    // Update order status regardless (admin can manually handle refund outside Square)
    await db
        .update(eventOrdersTable)
        .set({ status: "refunded", updatedAt: new Date() })
        .where(eq(eventOrdersTable.id, orderId));

    // Cancel tickets
    await db
        .update(eventTicketsTable)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(eq(eventTicketsTable.eventOrderId, orderId));

    // Restore ticket counts
    const items = await db
        .select()
        .from(eventOrderItemsTable)
        .where(eq(eventOrderItemsTable.eventOrderId, orderId));

    for (const item of items) {
        await db
            .update(eventTicketTypesTable)
            .set({
                quantitySold: sql`GREATEST(${eventTicketTypesTable.quantitySold} - ${item.quantity}, 0)`,
            })
            .where(eq(eventTicketTypesTable.id, item.ticketTypeId));
    }

    res.json({ success: true, refundError });
});

export default router;
