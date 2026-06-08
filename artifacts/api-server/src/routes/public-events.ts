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
    customersTable,
} from "@workspace/db/schema";
import { eq, and, asc, gte, sql, inArray } from "drizzle-orm";
import * as crypto from "node:crypto";
import { createPayment, createSquareOrder, isSquareConfigured, getOrCreateSquareCustomer, getSquareLoyaltyProgram, getOrCreateLoyaltyAccount, calculateLoyaltyPoints, accumulateLoyaltyPoints, getOnlineSalesLocationId } from "../lib/square";
import { sendTicketConfirmation } from "../lib/email";
import { sendEventQuestionNotification } from "../lib/email";
import { hashPassword, verifyPassword } from "../lib/password";
import { signToken } from "../lib/jwt";

const router: IRouter = Router();

// Public: List published upcoming events
router.get("/events", async (_req, res) => {
    const today = new Date().toISOString().split("T")[0];

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
        })
        .from(eventsTable)
        .leftJoin(locationsTable, eq(eventsTable.locationId, locationsTable.id))
        .where(
            and(
                eq(eventsTable.active, true),
                eq(eventsTable.status, "published"),
                eq(eventsTable.isPrivate, false),
                gte(eventsTable.eventDate, today),
            ),
        )
        .orderBy(asc(eventsTable.eventDate));

    // Batch-fetch ticket types for all events (avoids N+1)
    const eventIds = events.map((e) => e.id);
    const allTicketTypes = eventIds.length > 0
        ? await db
            .select({
                id: eventTicketTypesTable.id,
                eventId: eventTicketTypesTable.eventId,
                name: eventTicketTypesTable.name,
                description: eventTicketTypesTable.description,
                priceCents: eventTicketTypesTable.priceCents,
                quantity: eventTicketTypesTable.quantity,
                quantitySold: eventTicketTypesTable.quantitySold,
                maxPerOrder: eventTicketTypesTable.maxPerOrder,
            })
            .from(eventTicketTypesTable)
            .where(
                and(
                    inArray(eventTicketTypesTable.eventId, eventIds),
                    eq(eventTicketTypesTable.active, true),
                ),
            )
            .orderBy(asc(eventTicketTypesTable.sortOrder))
        : [];

    const ticketsByEvent = new Map<number, typeof allTicketTypes>();
    for (const tt of allTicketTypes) {
        const list = ticketsByEvent.get(tt.eventId) ?? [];
        list.push(tt);
        ticketsByEvent.set(tt.eventId, list);
    }

    const eventsWithAvailability = events.map((event) => {
        const ticketTypes = (ticketsByEvent.get(event.id) ?? []).map((tt) => ({
            ...tt,
            available: tt.quantity - tt.quantitySold,
        }));

        const lowestPrice = ticketTypes.length
            ? Math.min(...ticketTypes.map((t) => t.priceCents))
            : 0;
        const totalAvailable = ticketTypes.reduce(
            (sum, t) => sum + t.available,
            0,
        );

        return {
            ...event,
            ticketTypes,
            lowestPriceCents: lowestPrice,
            totalAvailable,
            soldOut: totalAvailable <= 0,
        };
    });

    res.set("Cache-Control", "public, max-age=120, stale-while-revalidate=60");
    res.json(eventsWithAvailability);
});

// Public: Get event detail by slug
router.get("/events/:slug", async (req, res) => {
    const slug = req.params.slug;

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
            accentColor: eventsTable.accentColor,
        })
        .from(eventsTable)
        .leftJoin(locationsTable, eq(eventsTable.locationId, locationsTable.id))
        .where(
            and(
                eq(eventsTable.slug, slug),
                eq(eventsTable.active, true),
            ),
        )
        .limit(1);

    if (!event) {
        res.status(404).json({ error: "Event not found" });
        return;
    }

    const ticketTypes = await db
        .select({
            id: eventTicketTypesTable.id,
            name: eventTicketTypesTable.name,
            description: eventTicketTypesTable.description,
            priceCents: eventTicketTypesTable.priceCents,
            quantity: eventTicketTypesTable.quantity,
            quantitySold: eventTicketTypesTable.quantitySold,
            maxPerOrder: eventTicketTypesTable.maxPerOrder,
        })
        .from(eventTicketTypesTable)
        .where(
            and(
                eq(eventTicketTypesTable.eventId, event.id),
                eq(eventTicketTypesTable.active, true),
            ),
        )
        .orderBy(asc(eventTicketTypesTable.sortOrder));

    const available = ticketTypes.map((tt) => ({
        ...tt,
        available: tt.quantity - tt.quantitySold,
    }));

    res.json({ ...event, ticketTypes: available });
});

// Public: Purchase tickets
router.post("/events/:id/purchase", async (req, res) => {
    const eventId = Number(req.params.id);
    const { customerName, customerEmail, customerPhone, items, sourceId, accountMode, password } =
        req.body;

    if (!customerName || !customerEmail || !items || !Array.isArray(items) || items.length === 0) {
        res.status(400).json({
            error: "Customer name, email, and at least one ticket item are required",
        });
        return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerEmail)) {
        res.status(400).json({ error: "Invalid email address" });
        return;
    }

    if (sourceId) {
        const configured = await isSquareConfigured();
        if (!configured) {
            res.status(503).json({ error: "Card payments are temporarily unavailable" });
            return;
        }
    }

    // ── Account handling ──
    const normalizedEmail = customerEmail.toLowerCase().trim();
    let customerId: number | null = null;
    let authToken: string | null = null;
    let isNewAccount = false;

    if (accountMode === "create") {
        if (!password || password.length < 8) {
            res.status(400).json({ error: "Password must be at least 8 characters to create an account" });
            return;
        }

        const [existing] = await db
            .select()
            .from(customersTable)
            .where(eq(customersTable.email, normalizedEmail))
            .limit(1);

        if (existing?.hasAccount && existing?.passwordHash) {
            res.status(409).json({ error: "An account with this email already exists.", code: "ACCOUNT_EXISTS" });
            return;
        }

        const passwordHash = await hashPassword(password);
        const nameParts = customerName.trim().split(/\s+/);
        const firstName = nameParts[0] || "";
        const lastName = nameParts.slice(1).join(" ") || "";

        let customer;
        if (existing) {
            [customer] = await db
                .update(customersTable)
                .set({
                    passwordHash,
                    hasAccount: true,
                    firstName: firstName || existing.firstName,
                    lastName: lastName || existing.lastName,
                    phone: customerPhone || existing.phone,
                    updatedAt: new Date(),
                })
                .where(eq(customersTable.id, existing.id))
                .returning();
        } else {
            [customer] = await db
                .insert(customersTable)
                .values({
                    email: normalizedEmail,
                    passwordHash,
                    hasAccount: true,
                    firstName,
                    lastName,
                    phone: customerPhone || "",
                })
                .returning();
        }

        customerId = customer.id;
        isNewAccount = true;
        authToken = signToken(
            { userId: customer.id, email: customer.email, type: "customer" },
            "7d",
        );
    } else if (accountMode === "login") {
        if (!password) {
            res.status(400).json({ error: "Password is required to sign in" });
            return;
        }

        const [customer] = await db
            .select()
            .from(customersTable)
            .where(
                and(
                    eq(customersTable.email, normalizedEmail),
                    eq(customersTable.hasAccount, true),
                ),
            )
            .limit(1);

        if (!customer) {
            res.status(401).json({ error: "No account found with this email. Try creating an account or continue as guest.", code: "NO_ACCOUNT" });
            return;
        }

        if (!customer.passwordHash) {
            // Migrated from old website — has account flag but no password set
            res.status(401).json({
                error: "We found your account from our previous website! You'll need to set a new password to sign in.",
                code: "NEEDS_PASSWORD_RESET",
            });
            return;
        }

        const valid = await verifyPassword(password, customer.passwordHash);
        if (!valid) {
            res.status(401).json({ error: "Invalid email or password", code: "INVALID_CREDENTIALS" });
            return;
        }

        customerId = customer.id;
        authToken = signToken(
            { userId: customer.id, email: customer.email, type: "customer" },
            "7d",
        );
    } else {
        // Guest mode — upsert a customer record for tracking
        const [existing] = await db
            .select()
            .from(customersTable)
            .where(eq(customersTable.email, normalizedEmail))
            .limit(1);

        if (existing) {
            customerId = existing.id;
        } else {
            const nameParts = customerName.trim().split(/\s+/);
            const [newCustomer] = await db
                .insert(customersTable)
                .values({
                    email: normalizedEmail,
                    firstName: nameParts[0] || "",
                    lastName: nameParts.slice(1).join(" ") || "",
                    phone: customerPhone || "",
                })
                .returning();
            customerId = newCustomer.id;
        }
    }

    try {
        // Validate event
        const [event] = await db
            .select()
            .from(eventsTable)
            .where(
                and(
                    eq(eventsTable.id, eventId),
                    eq(eventsTable.active, true),
                ),
            )
            .limit(1);

        if (!event || (event.status !== "published" && event.status !== "sold_out")) {
            res.status(404).json({ error: "Event not found or not available" });
            return;
        }

        const result = await db.transaction(async (tx) => {
            // Validate ticket types and calculate total
            let totalCents = 0;
            const validatedItems: {
                ticketTypeId: number;
                ticketTypeName: string;
                priceCents: number;
                quantity: number;
            }[] = [];

            for (const item of items) {
                const [ticketType] = await tx
                    .select()
                    .from(eventTicketTypesTable)
                    .where(
                        and(
                            eq(eventTicketTypesTable.id, item.ticketTypeId),
                            eq(eventTicketTypesTable.eventId, eventId),
                            eq(eventTicketTypesTable.active, true),
                        ),
                    )
                    .limit(1);

                if (!ticketType) {
                    throw new Error(`PURCHASE_ERROR:Ticket type ${item.ticketTypeId} not found`);
                }

                const available = ticketType.quantity - ticketType.quantitySold;
                if (item.quantity > available) {
                    throw new Error(`PURCHASE_ERROR:Only ${available} tickets available for "${ticketType.name}"`);
                }

                if (item.quantity > ticketType.maxPerOrder) {
                    throw new Error(`PURCHASE_ERROR:Maximum ${ticketType.maxPerOrder} tickets per order for "${ticketType.name}"`);
                }

                totalCents += ticketType.priceCents * item.quantity;
                validatedItems.push({
                    ticketTypeId: ticketType.id,
                    ticketTypeName: ticketType.name,
                    priceCents: ticketType.priceCents,
                    quantity: item.quantity,
                });
            }

            // Generate order number
            const orderNumber = `EVT-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

            // Create order (payment processed after transaction commits)
            const [order] = await tx
                .insert(eventOrdersTable)
                .values({
                    orderNumber,
                    eventId,
                    customerName,
                    customerEmail,
                    customerPhone: customerPhone ?? "",
                    status: totalCents === 0 ? "confirmed" : "pending",
                    totalCents,
                })
                .returning();

            // Create order items and individual tickets
            const allTickets: {
                ticketCode: string;
                ticketTypeName: string;
                priceCents: number;
            }[] = [];

            for (const item of validatedItems) {
                await tx.insert(eventOrderItemsTable).values({
                    eventOrderId: order.id,
                    ticketTypeId: item.ticketTypeId,
                    ticketTypeName: item.ticketTypeName,
                    priceCents: item.priceCents,
                    quantity: item.quantity,
                });

                // Atomic update with availability check to prevent overselling
                const updated = await tx
                    .update(eventTicketTypesTable)
                    .set({
                        quantitySold: sql`${eventTicketTypesTable.quantitySold} + ${item.quantity}`,
                        updatedAt: new Date(),
                    })
                    .where(
                        and(
                            eq(eventTicketTypesTable.id, item.ticketTypeId),
                            sql`${eventTicketTypesTable.quantity} - ${eventTicketTypesTable.quantitySold} >= ${item.quantity}`,
                        ),
                    )
                    .returning();

                if (updated.length === 0) {
                    throw new Error(`PURCHASE_ERROR:Tickets no longer available for "${item.ticketTypeName}"`);
                }

                // Create individual tickets
                for (let i = 0; i < item.quantity; i++) {
                    const ticketCode = crypto.randomBytes(16).toString("hex");
                    await tx.insert(eventTicketsTable).values({
                        eventOrderId: order.id,
                        eventId,
                        ticketTypeId: item.ticketTypeId,
                        ticketCode,
                        attendeeName: customerName,
                        attendeeEmail: customerEmail,
                        status: "active",
                    });
                    allTickets.push({
                        ticketCode,
                        ticketTypeName: item.ticketTypeName,
                        priceCents: item.priceCents,
                    });
                }
            }

            // Check if event is now sold out
            const remainingTypes = await tx
                .select({
                    available: sql<number>`${eventTicketTypesTable.quantity} - ${eventTicketTypesTable.quantitySold}`,
                })
                .from(eventTicketTypesTable)
                .where(
                    and(
                        eq(eventTicketTypesTable.eventId, eventId),
                        eq(eventTicketTypesTable.active, true),
                    ),
                );

            const totalRemaining = remainingTypes.reduce(
                (sum, t) => sum + t.available,
                0,
            );
            if (totalRemaining <= 0) {
                await tx
                    .update(eventsTable)
                    .set({ status: "sold_out", updatedAt: new Date() })
                    .where(eq(eventsTable.id, eventId));
            }

            return { order, allTickets, totalCents, validatedItems };
        });

        // Sync Square customer early so orders/payments can be linked before completion
        const normalizedEmail = customerEmail.toLowerCase().trim();
        const nameParts = customerName.trim().split(/\s+/);
        const firstName = nameParts[0] || "";
        const lastName = nameParts.slice(1).join(" ") || "";

        let [customer] = await db
            .select({ id: customersTable.id, squareCustomerId: customersTable.squareCustomerId, firstName: customersTable.firstName, lastName: customersTable.lastName, phone: customersTable.phone })
            .from(customersTable)
            .where(eq(customersTable.email, normalizedEmail))
            .limit(1);

        if (!customer) {
            const [newCust] = await db
                .insert(customersTable)
                .values({
                    email: normalizedEmail,
                    firstName,
                    lastName,
                    phone: customerPhone || "",
                })
                .returning({ id: customersTable.id, squareCustomerId: customersTable.squareCustomerId, firstName: customersTable.firstName, lastName: customersTable.lastName, phone: customersTable.phone });
            customer = newCust;
        }

        let sqCustId = customer.squareCustomerId ?? null;
        const customerPhoneForSquare = customer.phone || customerPhone || undefined;

        if (!sqCustId) {
            sqCustId = await getOrCreateSquareCustomer(
                normalizedEmail,
                customer.firstName || firstName,
                customer.lastName || lastName,
                customerPhoneForSquare,
            );
            if (sqCustId) {
                await db.update(customersTable)
                    .set({ squareCustomerId: sqCustId, updatedAt: new Date() })
                    .where(eq(customersTable.id, customer.id));
            }
        }

        // Process Square payment AFTER transaction commits (prevents charging customer if DB rolls back)
        let squareOrderId: string | null = null;
        let squarePaymentId: string | null = null;
        let paymentFailed = false;

        if (result.totalCents > 0 && sourceId) {
            // Use the Online Sales Square location for all ticket order routing
            const onlineSalesLocationId = await getOnlineSalesLocationId();

            if (onlineSalesLocationId) {
                try {
                    const sqOrder = await createSquareOrder(
                        onlineSalesLocationId,
                        result.order.orderNumber,
                        result.validatedItems.map((item) => ({
                            name: `${event.title} — ${item.ticketTypeName}`,
                            quantity: item.quantity,
                            priceCents: item.priceCents,
                        })),
                        undefined,
                        { customerId: sqCustId ?? undefined },
                    );
                    squareOrderId = sqOrder.id ?? null;
                } catch (e) {
                    console.error("[SQUARE] Order creation failed:", e);
                }
            }

            try {
                const payment = await createPayment(
                    result.totalCents,
                    sourceId,
                    customerEmail,
                    squareOrderId ?? undefined,
                    sqCustId ?? undefined,
                    onlineSalesLocationId ?? undefined,
                );
                squarePaymentId = payment.id ?? null;
            } catch {
                // Payment failed — order exists as "pending", not confirmed
                // Can be retried or cancelled by admin
                console.error("[SQUARE] Payment failed for order:", result.order.orderNumber);
                paymentFailed = true;
            }
        }

        // Update order with Square references and confirm status
        if (squareOrderId || squarePaymentId) {
            await db
                .update(eventOrdersTable)
                .set({
                    ...(squareOrderId ? { squareOrderId } : {}),
                    ...(squarePaymentId ? { squarePaymentId } : {}),
                    ...(squarePaymentId ? { status: "confirmed" as const } : {}),
                    updatedAt: new Date(),
                })
                .where(eq(eventOrdersTable.id, result.order.id));
        }

        if (paymentFailed) {
            res.status(402).json({
                error: "Payment failed. Your order was created as pending.",
                orderNumber: result.order.orderNumber,
            });
            return;
        }

        // ── Square Loyalty Accrual (non-blocking) ──
        if (squarePaymentId && result.totalCents > 0 && sqCustId) {
            try {
                const onlineSalesLoc = await getOnlineSalesLocationId();
                const program = await getSquareLoyaltyProgram();
                if (program && program.status === "ACTIVE") {
                    const loyaltyAccount = await getOrCreateLoyaltyAccount(
                        sqCustId,
                        program.id,
                        customerPhoneForSquare,
                    );
                    if (loyaltyAccount) {
                        // Determine the location ID for accrual
                        let accrualLocationId: string | null = null;
                        if (event.locationId) {
                            const [loc] = await db
                                .select({ squareLocationId: locationsTable.squareLocationId })
                                .from(locationsTable)
                                .where(eq(locationsTable.id, event.locationId))
                                .limit(1);
                            accrualLocationId = loc?.squareLocationId ?? null;
                        }
                        if (!accrualLocationId) {
                            accrualLocationId = onlineSalesLoc;
                        }

                        if (accrualLocationId) {
                            let accrued = false;

                            // Try order-based accrual first
                            if (squareOrderId) {
                                accrued = await accumulateLoyaltyPoints(
                                    loyaltyAccount.accountId,
                                    `event_order_${result.order.id}`,
                                    accrualLocationId,
                                    squareOrderId,
                                );
                            }

                            // Fall back to amount-based accrual
                            if (!accrued && result.totalCents > 0) {
                                const points = await calculateLoyaltyPoints(program.id, result.totalCents);
                                if (points > 0) {
                                    await accumulateLoyaltyPoints(
                                        loyaltyAccount.accountId,
                                        `event_order_${result.order.id}_amount`,
                                        accrualLocationId,
                                        undefined,
                                        points,
                                    );
                                }
                            }
                        }
                    }
                }
            } catch (e) {
                console.error("[SQUARE] Loyalty accrual failed (non-blocking):", e);
            }
        }

        // Send confirmation email (outside transaction)
        const locationName =
            event.venueName ??
            (event.locationId
                ? (
                    await db
                        .select({ name: locationsTable.name })
                        .from(locationsTable)
                        .where(eq(locationsTable.id, event.locationId))
                        .limit(1)
                )[0]?.name
                : null) ??
            "TBA";

        sendTicketConfirmation({
            orderNumber: result.order.orderNumber,
            customerName,
            customerEmail,
            totalCents: result.totalCents,
            eventTitle: event.title,
            eventDate: event.eventDate,
            startTime: event.startTime,
            venueName: locationName,
            tickets: result.allTickets,
        }).catch((e) => console.error("[EMAIL] Ticket confirmation failed:", e));

        // Set auth cookie if account was created or logged in
        if (authToken) {
            res.cookie("customer_token", authToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                maxAge: 7 * 24 * 60 * 60 * 1000,
            });
        }

        res.status(201).json({
            order: { ...result.order },
            tickets: result.allTickets,
            ...(authToken ? { token: authToken } : {}),
        });
    } catch (e: any) {
        if (e.message?.startsWith("PURCHASE_ERROR:")) {
            res.status(400).json({ error: e.message.replace("PURCHASE_ERROR:", "") });
        } else {
            console.error("[PURCHASE ERROR]", e);
            res.status(500).json({ error: "An error occurred processing your order" });
        }
    }
});

// Public: Submit a question about an event
router.post("/events/:id/questions", async (req, res): Promise<void> => {
    try {
        const eventId = Number(req.params.id);
        const { name, email, message } = req.body;

        if (!name?.trim() || !email?.trim() || !message?.trim()) {
            res.status(400).json({ error: "Name, email, and message are required" });
            return;
        }

        // Verify event exists
        const [event] = await db
            .select({ id: eventsTable.id, title: eventsTable.title })
            .from(eventsTable)
            .where(and(eq(eventsTable.id, eventId), eq(eventsTable.active, true)));

        if (!event) {
            res.status(404).json({ error: "Event not found" });
            return;
        }

        const [question] = await db
            .insert(eventQuestionsTable)
            .values({
                eventId,
                name: name.trim(),
                email: email.trim(),
                message: message.trim(),
            })
            .returning();

        // Send email notification (non-blocking)
        sendEventQuestionNotification({
            eventTitle: event.title,
            name: name.trim(),
            email: email.trim(),
            message: message.trim(),
        }).catch((err) => console.error("[EVENT QUESTION EMAIL ERROR]", err));

        res.json({ ok: true, id: question.id });
    } catch (e) {
        console.error("[EVENT QUESTION ERROR]", e);
        res.status(500).json({ error: "Failed to submit question" });
    }
});

export default router;
