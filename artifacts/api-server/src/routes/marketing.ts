import { Router, type IRouter } from "express";
import rateLimit from "express-rate-limit";
import { db } from "@workspace/db";
import { emailContactsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { syncContactToResend } from "../lib/resend-marketing";

const router: IRouter = Router();

const subscribeLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many signup attempts. Please try again later." },
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post("/subscribe", subscribeLimiter, async (req, res) => {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const firstName = String(req.body?.firstName || "").trim().slice(0, 100);
    const consent = req.body?.consent === true;
    const honeypot = String(req.body?.website || "").trim();

    // Bots commonly fill every field. Return a normal-looking success response
    // without writing anything so the field remains invisible to real visitors.
    if (honeypot) {
        res.json({ success: true });
        return;
    }

    if (!email || email.length > 320 || !EMAIL_RE.test(email)) {
        res.status(400).json({ error: "Enter a valid email address." });
        return;
    }

    if (!consent) {
        res.status(400).json({ error: "Please confirm that you want to receive Urban Churn emails." });
        return;
    }

    const now = new Date();
    const [existing] = await db
        .select()
        .from(emailContactsTable)
        .where(eq(emailContactsTable.email, email))
        .limit(1);

    // A hard bounce or complaint is a stronger suppression signal than a new
    // website form submission. Keep it suppressed rather than risking delivery.
    if (existing && (existing.marketingStatus === "bounced" || existing.marketingStatus === "complained")) {
        res.json({ success: true });
        return;
    }

    let contactId: number;

    if (existing) {
        const customProperties = {
            ...(existing.customProperties as Record<string, unknown>),
            signupSource: "website_footer",
        };

        const [updated] = await db
            .update(emailContactsTable)
            .set({
                firstName: firstName || existing.firstName,
                marketingStatus: "subscribed",
                consentSource: "website_footer",
                consentAt: now,
                customProperties,
                updatedAt: now,
            })
            .where(eq(emailContactsTable.id, existing.id))
            .returning({ id: emailContactsTable.id });
        contactId = updated.id;
    } else {
        const [created] = await db
            .insert(emailContactsTable)
            .values({
                email,
                firstName,
                marketingStatus: "subscribed",
                consentSource: "website_footer",
                consentAt: now,
                source: "manual",
                customProperties: { signupSource: "website_footer" },
            })
            .returning({ id: emailContactsTable.id });
        contactId = created.id;
    }

    // This form is an explicit fresh opt-in, so it is allowed to restore the
    // contact's Resend subscription state if they had previously unsubscribed.
    await syncContactToResend(contactId, { allowResubscribe: true });

    res.json({ success: true });
});

export default router;
