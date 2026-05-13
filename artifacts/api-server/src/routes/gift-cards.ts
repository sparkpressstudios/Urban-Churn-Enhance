import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { giftCardPurchasesTable } from "@workspace/db/schema";
import * as crypto from "node:crypto";
import {
    createSquareOrder,
    createPayment,
    createDigitalGiftCard,
    activateGiftCard,
    isSquareConfigured,
    getOnlineSalesLocationId,
    updateSquareOrderState,
} from "../lib/square";
import {
    sendGiftCardDelivery,
    sendGiftCardPurchaseConfirmation,
} from "../lib/email";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

const MIN_AMOUNT_CENTS = 500; // $5
const MAX_AMOUNT_CENTS = 50000; // $500

router.post("/purchase", async (req, res) => {
    const {
        sourceId,
        amountCents,
        buyerName,
        buyerEmail,
        buyerPhone,
        recipientName,
        recipientEmail,
        personalMessage,
    } = req.body;

    // ── Validation ──
    if (!sourceId || !amountCents || !buyerName || !buyerEmail || !recipientName || !recipientEmail) {
        res.status(400).json({
            error: "sourceId, amountCents, buyerName, buyerEmail, recipientName, and recipientEmail are required",
        });
        return;
    }

    if (typeof amountCents !== "number" || !Number.isInteger(amountCents) || amountCents < MIN_AMOUNT_CENTS || amountCents > MAX_AMOUNT_CENTS) {
        res.status(400).json({
            error: `Amount must be between $${(MIN_AMOUNT_CENTS / 100).toFixed(2)} and $${(MAX_AMOUNT_CENTS / 100).toFixed(2)}`,
        });
        return;
    }

    if (buyerName.length > 200 || buyerEmail.length > 254 || recipientName.length > 200 || recipientEmail.length > 254) {
        res.status(400).json({ error: "One or more fields exceed maximum length" });
        return;
    }

    if (personalMessage && personalMessage.length > 500) {
        res.status(400).json({ error: "Personal message must be 500 characters or less" });
        return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(buyerEmail) || !emailRegex.test(recipientEmail)) {
        res.status(400).json({ error: "Invalid email address" });
        return;
    }

    const configured = await isSquareConfigured();
    if (!configured) {
        res.status(503).json({ error: "Card payments are temporarily unavailable" });
        return;
    }

    const locationId = await getOnlineSalesLocationId();
    if (!locationId) {
        res.status(503).json({ error: "Gift card sales are not configured. Please contact us." });
        return;
    }

    const normalizedBuyerEmail = buyerEmail.toLowerCase().trim();
    const normalizedRecipientEmail = recipientEmail.toLowerCase().trim();
    const orderNumber = `GC-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
    const amountDollars = `$${(amountCents / 100).toFixed(2)}`;

    // ── Insert pending record ──
    const [purchase] = await db
        .insert(giftCardPurchasesTable)
        .values({
            orderNumber,
            buyerName: buyerName.trim(),
            buyerEmail: normalizedBuyerEmail,
            buyerPhone: buyerPhone?.trim() || "",
            recipientName: recipientName.trim(),
            recipientEmail: normalizedRecipientEmail,
            personalMessage: personalMessage?.trim() || null,
            amountCents,
            status: "pending",
        })
        .returning();

    // ── Create Square order ──
    let squareOrderId: string | null = null;
    try {
        const sqOrder = await createSquareOrder(locationId, orderNumber, [
            {
                name: `Digital Gift Card — ${amountDollars}`,
                quantity: 1,
                priceCents: amountCents,
            },
        ]);
        squareOrderId = sqOrder.id ?? null;
    } catch (e) {
        console.error("[GIFT CARD] Square order creation failed:", e);
        await db
            .update(giftCardPurchasesTable)
            .set({ status: "failed", updatedAt: new Date() })
            .where(eq(giftCardPurchasesTable.id, purchase.id));
        res.status(500).json({ error: "Failed to create order. Please try again." });
        return;
    }

    // ── Process payment ──
    let squarePaymentId: string | null = null;
    try {
        const payment = await createPayment(
            amountCents,
            sourceId,
            normalizedBuyerEmail,
            squareOrderId ?? undefined,
            undefined,
            locationId ?? undefined,
        );
        squarePaymentId = payment.id ?? null;
    } catch (e) {
        console.error("[GIFT CARD] Payment failed:", e);
        await db
            .update(giftCardPurchasesTable)
            .set({ status: "failed", squareOrderId, updatedAt: new Date() })
            .where(eq(giftCardPurchasesTable.id, purchase.id));
        res.status(402).json({ error: "Payment failed. Please check your card details and try again." });
        return;
    }

    // ── Create and activate gift card ──
    let squareGiftCardId: string | null = null;
    let gan: string | null = null;
    try {
        const gc = await createDigitalGiftCard(locationId);
        if (gc) {
            squareGiftCardId = gc.id;
            gan = gc.gan;
            await activateGiftCard(gc.id, amountCents, locationId);
        }
    } catch (e) {
        console.error("[GIFT CARD] Gift card creation/activation failed after payment:", e);
        // Payment was taken but gift card failed — record for manual resolution
        await db
            .update(giftCardPurchasesTable)
            .set({
                status: "failed",
                squareOrderId,
                squarePaymentId,
                updatedAt: new Date(),
            })
            .where(eq(giftCardPurchasesTable.id, purchase.id));
        res.status(500).json({
            error: "Payment was processed but gift card creation failed. Our team has been notified and will resolve this shortly.",
            orderNumber,
        });
        return;
    }

    // ── Update record to active ──
    await db
        .update(giftCardPurchasesTable)
        .set({
            squareGiftCardId,
            gan,
            squareOrderId,
            squarePaymentId,
            status: "active",
            updatedAt: new Date(),
        })
        .where(eq(giftCardPurchasesTable.id, purchase.id));

    // ── Complete Square order (fire and forget) ──
    if (squareOrderId) {
        updateSquareOrderState(squareOrderId, locationId, "COMPLETED").catch((e) =>
            console.error("[GIFT CARD] Failed to complete Square order:", e),
        );
    }

    // ── Send emails (fire and forget) ──
    if (gan) {
        sendGiftCardDelivery({
            recipientEmail: normalizedRecipientEmail,
            recipientName: recipientName.trim(),
            senderName: buyerName.trim(),
            amountCents,
            gan,
            personalMessage: personalMessage?.trim() || null,
        }).then(() => {
            // Mark as delivered
            db.update(giftCardPurchasesTable)
                .set({ status: "delivered", deliveredAt: new Date(), updatedAt: new Date() })
                .where(eq(giftCardPurchasesTable.id, purchase.id))
                .catch((e) => console.error("[GIFT CARD] Failed to update delivery status:", e));
        }).catch((e) => console.error("[GIFT CARD] Delivery email failed:", e));
    }

    sendGiftCardPurchaseConfirmation({
        buyerEmail: normalizedBuyerEmail,
        buyerName: buyerName.trim(),
        recipientName: recipientName.trim(),
        recipientEmail: normalizedRecipientEmail,
        amountCents,
        orderNumber,
    }).catch((e) => console.error("[GIFT CARD] Buyer confirmation email failed:", e));

    res.status(201).json({
        success: true,
        orderNumber,
    });
});

export default router;
