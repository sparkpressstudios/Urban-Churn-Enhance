import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
    ordersTable,
    eventOrdersTable,
    settingsTable,
    wholesaleCustomersTable,
    wholesaleOrdersTable,
    wholesaleOrderItemsTable,
    wholesaleEmailLogTable,
} from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import * as crypto from "node:crypto";
import { parseWholesaleEmail } from "../lib/order-parser";
import {
    sendWholesaleOrderReceived,
    sendAdminWholesaleOrderAlert,
    sendWholesaleParseFailureAlert,
} from "../lib/email";

const router: IRouter = Router();

// Square webhook handler — no auth middleware (called externally by Square)
router.post("/square", async (req, res) => {
    const signature = req.headers["x-square-hmacsha256-signature"] as string;
    const body = req.body;
    const rawBody = (req as any).rawBody as string | undefined;

    // Verify webhook signature
    const [sigKeyRow] = await db
        .select({ value: settingsTable.value })
        .from(settingsTable)
        .where(eq(settingsTable.key, "square_webhook_signature_key"))
        .limit(1);

    const signatureKey = sigKeyRow?.value;
    if (!signatureKey) {
        console.error("[WEBHOOK] Square webhook signing key not configured");
        res.status(500).json({ error: "Webhook signing key not configured" });
        return;
    }
    if (!signature) {
        console.error("[WEBHOOK] Missing Square signature header");
        res.status(401).json({ error: "Missing signature" });
        return;
    }

    {
        // Square sends the raw body as the HMAC input
        const payload = rawBody ?? (typeof body === "string" ? body : JSON.stringify(body));
        const notificationUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
        const hmac = crypto
            .createHmac("sha256", signatureKey)
            .update(notificationUrl + payload)
            .digest("base64");

        if (hmac !== signature) {
            console.error("[WEBHOOK] Invalid Square signature");
            res.status(401).json({ error: "Invalid signature" });
            return;
        }
    }

    const eventType = body?.type;
    const data = body?.data?.object;

    try {
        if (eventType === "order.updated" && data?.order) {
            const squareOrder = data.order;
            const squareOrderId = squareOrder.id;
            const state = squareOrder.state; // OPEN, COMPLETED, CANCELED

            if (!squareOrderId) {
                res.status(200).json({ received: true });
                return;
            }

            // Find the local order by squareOrderId
            const [order] = await db
                .select()
                .from(ordersTable)
                .where(eq(ordersTable.squareOrderId, squareOrderId))
                .limit(1);

            if (order) {
                // Skip if last sync was from Square (prevent loops)
                if (order.lastSyncSource !== "square") {
                    // Map Square states to our statuses
                    let newStatus: string | null = null;
                    if (state === "COMPLETED") newStatus = "picked_up";
                    else if (state === "CANCELED") newStatus = "cancelled";

                    if (newStatus && newStatus !== order.status) {
                        await db
                            .update(ordersTable)
                            .set({
                                status: newStatus as any,
                                lastSyncSource: "square",
                                updatedAt: new Date(),
                            })
                            .where(eq(ordersTable.id, order.id));

                        console.log(`[WEBHOOK] Order ${order.orderNumber} → ${newStatus} (from Square POS)`);
                    }
                }
            } else {
                // Check event orders table
                const [eventOrder] = await db
                    .select()
                    .from(eventOrdersTable)
                    .where(eq(eventOrdersTable.squareOrderId, squareOrderId))
                    .limit(1);

                if (eventOrder) {
                    let newStatus: string | null = null;
                    if (state === "COMPLETED") newStatus = "confirmed";
                    else if (state === "CANCELED") newStatus = "cancelled";

                    if (newStatus && newStatus !== eventOrder.status) {
                        await db
                            .update(eventOrdersTable)
                            .set({
                                status: newStatus as any,
                                updatedAt: new Date(),
                            })
                            .where(eq(eventOrdersTable.id, eventOrder.id));

                        console.log(`[WEBHOOK] Event order ${eventOrder.orderNumber} → ${newStatus} (from Square POS)`);
                    }
                }
            }
        }

        if (eventType === "refund.created" && data?.refund) {
            const paymentId = data.refund.payment_id;
            if (paymentId) {
                // Check regular orders
                const [order] = await db
                    .select()
                    .from(ordersTable)
                    .where(eq(ordersTable.squarePaymentId, paymentId))
                    .limit(1);

                if (order && order.status !== "refunded") {
                    await db
                        .update(ordersTable)
                        .set({
                            status: "refunded",
                            paymentStatus: "refunded",
                            lastSyncSource: "square",
                            updatedAt: new Date(),
                        })
                        .where(eq(ordersTable.id, order.id));

                    console.log(`[WEBHOOK] Order ${order.orderNumber} → refunded (from Square POS)`);
                }

                // Check event orders
                if (!order) {
                    const [eventOrder] = await db
                        .select()
                        .from(eventOrdersTable)
                        .where(eq(eventOrdersTable.squarePaymentId, paymentId))
                        .limit(1);

                    if (eventOrder && eventOrder.status !== "refunded") {
                        await db
                            .update(eventOrdersTable)
                            .set({
                                status: "refunded" as any,
                                updatedAt: new Date(),
                            })
                            .where(eq(eventOrdersTable.id, eventOrder.id));

                        console.log(`[WEBHOOK] Event order ${eventOrder.orderNumber} → refunded (from Square POS)`);
                    }
                }
            }
        }

        // When a Square Invoice is paid, auto-mark the wholesale order as paid
        if (eventType === "invoice.payment_made" && data?.invoice) {
            const invoiceId = data.invoice.id as string | undefined;
            if (invoiceId) {
                const [wsOrder] = await db
                    .select({ id: wholesaleOrdersTable.id, orderNumber: wholesaleOrdersTable.orderNumber })
                    .from(wholesaleOrdersTable)
                    .where(eq(wholesaleOrdersTable.squareInvoiceId, invoiceId))
                    .limit(1);

                if (wsOrder) {
                    await db
                        .update(wholesaleOrdersTable)
                        .set({
                            paymentStatus: "paid",
                            paidAt: new Date(),
                            updatedAt: new Date(),
                        })
                        .where(eq(wholesaleOrdersTable.id, wsOrder.id));

                    console.log(`[WEBHOOK] Wholesale order ${wsOrder.orderNumber} → paid (Square invoice ${invoiceId})`);
                }
            }
        }

        res.status(200).json({ received: true });
    } catch (e: any) {
        console.error("[WEBHOOK] Error processing Square event:", e);
        res.status(500).json({ error: "Internal error" });
    }
});

// ── Resend Inbound Email Webhook ──
// Receives email.received events from Resend when someone emails the wholesale address
router.post("/resend", async (req, res) => {
    // Verify Resend webhook signature if signing secret is configured
    const resendSigningSecret = process.env.RESEND_WEBHOOK_SECRET;
    if (resendSigningSecret) {
        const svixId = req.headers["svix-id"] as string;
        const svixTimestamp = req.headers["svix-timestamp"] as string;
        const svixSignature = req.headers["svix-signature"] as string;

        if (!svixId || !svixTimestamp || !svixSignature) {
            console.error("[WEBHOOK] Missing Resend signature headers");
            res.status(401).json({ error: "Missing signature headers" });
            return;
        }

        // Reject timestamps older than 5 minutes to prevent replay attacks
        const timestampSeconds = parseInt(svixTimestamp, 10);
        const nowSeconds = Math.floor(Date.now() / 1000);
        if (Math.abs(nowSeconds - timestampSeconds) > 300) {
            console.error("[WEBHOOK] Resend webhook timestamp too old");
            res.status(401).json({ error: "Timestamp too old" });
            return;
        }

        const rawBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
        const signedContent = `${svixId}.${svixTimestamp}.${rawBody}`;

        // Resend uses Svix — secret is base64-encoded after "whsec_" prefix
        const secretBytes = Buffer.from(resendSigningSecret.replace(/^whsec_/, ""), "base64");
        const expectedSignature = crypto
            .createHmac("sha256", secretBytes)
            .update(signedContent)
            .digest("base64");

        // Svix sends comma-separated versioned signatures like "v1,<base64>"
        const signatures = svixSignature.split(" ");
        const isValid = signatures.some((sig) => {
            const parts = sig.split(",");
            return parts.length === 2 && parts[1] === expectedSignature;
        });

        if (!isValid) {
            console.error("[WEBHOOK] Invalid Resend webhook signature");
            res.status(401).json({ error: "Invalid signature" });
            return;
        }
    }

    const event = req.body;

    // Only process inbound email events
    if (event?.type !== "email.received") {
        res.status(200).json({ received: true });
        return;
    }

    const data = event.data;
    if (!data) {
        res.status(200).json({ received: true });
        return;
    }

    // Extract sender email from "Name <email>" format
    const fromRaw = data.from || "";
    const emailMatch = fromRaw.match(/<([^>]+)>/);
    const senderEmail = emailMatch ? emailMatch[1] : fromRaw.trim();

    const subject = data.subject || "(no subject)";
    const bodyText = data.text || "";
    const bodyHtml = data.html || "";
    const attachments = data.attachments || [];
    const toAddresses = data.to || [];

    console.log(
        `[WEBHOOK] Inbound email from ${senderEmail}: "${subject}"`,
    );

    try {
        // Log the raw email first
        const [emailLog] = await db
            .insert(wholesaleEmailLogTable)
            .values({
                fromEmail: senderEmail,
                toEmail: Array.isArray(toAddresses)
                    ? toAddresses.join(", ")
                    : String(toAddresses),
                subject,
                bodyText,
                bodyHtml,
                attachments: attachments.map((a: any) => ({
                    id: a.id,
                    filename: String(a.filename || "").replace(/[/\\:]/g, "_"),
                    contentType: a.content_type,
                })),
                processingStatus: "received",
            })
            .returning();

        // Look up wholesale customer by sender email (check primary + aliases)
        const allCustomers = await db
            .select()
            .from(wholesaleCustomersTable);

        const senderLower = senderEmail.toLowerCase();
        const customer = allCustomers.find((c) => {
            if (c.email === senderLower) return true;
            const aliases = (Array.isArray(c.emailAliases) ? c.emailAliases : []) as string[];
            return aliases.some((a) => a.toLowerCase() === senderLower);
        }) || null;

        if (!customer || customer.status !== "active") {
            // Unknown or inactive sender — log but don't process
            await db
                .update(wholesaleEmailLogTable)
                .set({ processingStatus: "ignored" })
                .where(eq(wholesaleEmailLogTable.id, emailLog.id));

            console.log(
                `[WEBHOOK] Ignoring email from unknown/inactive sender: ${senderEmail}`,
            );

            // Notify admin about email from unrecognized sender
            sendAdminWholesaleOrderAlert({
                customerName: senderEmail,
                orderNumber: "(unrecognized sender)",
                confidence: 0,
                itemCount: 0,
                note: `Email received from unrecognized address: ${senderEmail}. Subject: "${subject}". If this is a new wholesale customer, add them in the admin panel.`,
            }).catch((e) => console.error("[WEBHOOK] Failed to send admin alert:", e));

            res.status(200).json({ received: true });
            return;
        }

        // Parse the email with OpenAI
        let parsed;
        try {
            parsed = await parseWholesaleEmail(bodyText || bodyHtml, subject);
        } catch (parseError: any) {
            console.error(
                "[WEBHOOK] Failed to parse wholesale email:",
                parseError,
            );

            await db
                .update(wholesaleEmailLogTable)
                .set({
                    processingStatus: "failed",
                    errorMessage: parseError.message,
                })
                .where(eq(wholesaleEmailLogTable.id, emailLog.id));

            sendWholesaleParseFailureAlert({
                customerName: customer.businessName,
                senderEmail,
                subject,
                error: parseError.message,
            }).catch((e) => console.error("[WEBHOOK] Failed to send parse failure alert:", e));

            res.status(200).json({ received: true });
            return;
        }

        // If AI thinks this isn't an order (confidence 0), just log it
        if (
            parsed.overallConfidence === 0 &&
            parsed.items.length === 0
        ) {
            await db
                .update(wholesaleEmailLogTable)
                .set({ processingStatus: "ignored" })
                .where(eq(wholesaleEmailLogTable.id, emailLog.id));

            console.log(
                `[WEBHOOK] Email from ${senderEmail} doesn't appear to be an order`,
            );
            res.status(200).json({ received: true });
            return;
        }

        // Create the wholesale order
        const orderNumber = `WS-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

        // Calculate subtotal from matched items
        let subtotalCents = 0;
        for (const item of parsed.items) {
            subtotalCents += item.quantity * (item.matchedProductId ? 0 : 0);
            // Price will be set after admin confirms or from matched product
        }

        const [order] = await db
            .insert(wholesaleOrdersTable)
            .values({
                orderNumber,
                wholesaleCustomerId: customer.id,
                status: "pending_review",
                requestedDeliveryDate: parsed.requestedDeliveryDate || undefined,
                deliveryMethod: customer.deliveryMethod,
                subtotalCents: 0, // Calculated after admin review
                originalEmailSubject: subject,
                originalEmailBody: bodyText || bodyHtml,
                aiParseConfidence: parsed.overallConfidence,
                aiParseNotes:
                    parsed.ambiguities.length > 0
                        ? parsed.ambiguities.join("; ")
                        : "",
            })
            .returning();

        // Insert line items
        if (parsed.items.length > 0) {
            await db.insert(wholesaleOrderItemsTable).values(
                parsed.items.map((item) => ({
                    wholesaleOrderId: order.id,
                    wholesaleProductId: item.matchedProductId || null,
                    flavourId: item.matchedFlavourId || null,
                    productDescription: `${item.flavourName} — ${item.sizeName} x${item.quantity}`,
                    quantity: item.quantity,
                    unitPriceCents: 0, // Set after admin review
                    matched: !!(item.matchedProductId),
                    notes: item.confidence < 0.7 ? `Low confidence: ${item.confidence}` : "",
                })),
            );
        }

        // Link email log to order
        await db
            .update(wholesaleEmailLogTable)
            .set({
                wholesaleOrderId: order.id,
                processingStatus: "parsed",
            })
            .where(eq(wholesaleEmailLogTable.id, emailLog.id));

        // Send auto-reply to customer
        sendWholesaleOrderReceived({
            to: senderEmail,
            customerName: customer.contactName || customer.businessName,
            orderNumber,
        }).catch((e) => console.error("[WEBHOOK] Failed to send order received email:", e));

        // Notify admin
        sendAdminWholesaleOrderAlert({
            customerName: customer.businessName,
            orderNumber,
            confidence: parsed.overallConfidence,
            itemCount: parsed.items.length,
            note:
                parsed.ambiguities.length > 0
                    ? `Ambiguities: ${parsed.ambiguities.join("; ")}`
                    : undefined,
        }).catch((e) => console.error("[WEBHOOK] Failed to send admin order alert:", e));

        console.log(
            `[WEBHOOK] Created wholesale order ${orderNumber} from ${customer.businessName} (${parsed.items.length} items, confidence: ${parsed.overallConfidence})`,
        );

        res.status(200).json({ received: true, orderNumber });
    } catch (e: any) {
        console.error("[WEBHOOK] Error processing inbound email:", e);
        res.status(500).json({ error: "Internal error" });
    }
});

export default router;
