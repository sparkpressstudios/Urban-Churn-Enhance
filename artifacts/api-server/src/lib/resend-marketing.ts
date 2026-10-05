import { Resend } from "resend";
import { db } from "@workspace/db";
import {
    emailContactsTable,
    emailSegmentsTable,
    emailSegmentMembersTable,
    emailCampaignsTable,
    emailCampaignEventsTable,
    emailTemplatesTable,
    emailTopicsTable,
    sentEmailsLogTable,
    settingsTable,
    type EmailContact,
} from "@workspace/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { compileEmailDocument, type EmailDocument } from "./email-compiler";
import { getSegmentContactIds } from "./email-segment-rules";

const resend = process.env.RESEND_API_KEY
    ? new Resend(process.env.RESEND_API_KEY)
    : null;

export const MARKETING_FROM_EMAIL =
    process.env.MARKETING_FROM_EMAIL ||
    process.env.FROM_EMAIL ||
    "Urban Churn <noreply@urbanchurn.com>";

export const MARKETING_POSTAL_ADDRESS =
    process.env.MARKETING_POSTAL_ADDRESS ||
    "1004 N 3rd St, Harrisburg, PA 17102";

const MARKETING_WEBHOOK_SECRET_KEY = "resend_marketing_webhook_secret";
const MARKETING_WEBHOOK_ID_KEY = "resend_marketing_webhook_id";

function withMarketingComplianceFooter(html: string): string {
    if (html.includes("RESEND_UNSUBSCRIBE_URL")) return html;

    return `${html}
<div style="border-top:1px solid #e5e7eb;margin-top:32px;padding:20px 16px;text-align:center;color:#6b7280;font-family:Arial,sans-serif;font-size:12px;line-height:1.5">
  <p style="margin:0 0 6px">Urban Churn Craft Creamery · ${MARKETING_POSTAL_ADDRESS}</p>
  <p style="margin:0"><a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:#4b5563;text-decoration:underline">Unsubscribe</a> · <a href="https://urbanchurn.com/privacy" style="color:#4b5563;text-decoration:underline">Privacy Policy</a></p>
</div>`;
}

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

const SYNC_CONCURRENCY = 2;
const SYNC_DELAY_MS = 500;

async function mapWithConcurrency<T, R>(
    items: T[],
    concurrency: number,
    fn: (item: T) => Promise<R>,
): Promise<R[]> {
    const results: R[] = [];
    for (let i = 0; i < items.length; i += concurrency) {
        const batch = items.slice(i, i + concurrency);
        const batchResults = await Promise.all(batch.map(fn));
        results.push(...batchResults);
        if (i + concurrency < items.length) {
            await sleep(SYNC_DELAY_MS);
        }
    }
    return results;
}

export function isResendMarketingConfigured(): boolean {
    return !!resend;
}

export async function ensureResendMarketingWebhook(): Promise<{ configured: boolean; error?: string }> {
    if (!resend) return { configured: false, error: "RESEND_API_KEY is not configured" };

    const [savedSecret] = await db
        .select({ value: settingsTable.value })
        .from(settingsTable)
        .where(eq(settingsTable.key, MARKETING_WEBHOOK_SECRET_KEY))
        .limit(1);

    if (savedSecret?.value) {
        return { configured: true };
    }

    const baseUrl = (process.env.PUBLIC_SITE_URL || "https://urbanchurn.com").replace(/\/$/, "");
    const endpoint = `${baseUrl}/api/webhooks/resend-marketing`;
    const events = [
        "email.delivered",
        "email.opened",
        "email.clicked",
        "email.bounced",
        "email.complained",
        "contact.updated",
    ];

    try {
        const { data, error } = await resend.webhooks.create({
            endpoint,
            events: events as any,
        });

        if (error) {
            console.error("[RESEND-MARKETING] Could not create marketing webhook:", error.message);
            return { configured: false, error: error.message };
        }

        const webhookId = (data as any)?.id as string | undefined;
        const signingSecret =
            ((data as any)?.signingSecret as string | undefined) ||
            ((data as any)?.signing_secret as string | undefined);

        if (!webhookId || !signingSecret) {
            const message = "Resend created the webhook but did not return its id/signing secret";
            console.error("[RESEND-MARKETING]", message);
            return { configured: false, error: message };
        }

        await db
            .insert(settingsTable)
            .values({ key: MARKETING_WEBHOOK_SECRET_KEY, value: signingSecret })
            .onConflictDoUpdate({
                target: settingsTable.key,
                set: { value: signingSecret, updatedAt: new Date() },
            });

        await db
            .insert(settingsTable)
            .values({ key: MARKETING_WEBHOOK_ID_KEY, value: webhookId })
            .onConflictDoUpdate({
                target: settingsTable.key,
                set: { value: webhookId, updatedAt: new Date() },
            });

        console.log(`[RESEND-MARKETING] Marketing webhook configured: ${endpoint}`);
        return { configured: true };
    } catch (err: any) {
        const message = err?.message || String(err);
        console.error("[RESEND-MARKETING] Marketing webhook setup failed:", message);
        return { configured: false, error: message };
    }
}

export async function getResendMarketingWebhookSecret(): Promise<string | null> {
    if (process.env.RESEND_MARKETING_WEBHOOK_SECRET) {
        return process.env.RESEND_MARKETING_WEBHOOK_SECRET;
    }

    const [row] = await db
        .select({ value: settingsTable.value })
        .from(settingsTable)
        .where(eq(settingsTable.key, MARKETING_WEBHOOK_SECRET_KEY))
        .limit(1);

    return row?.value || null;
}

export function verifyResendMarketingWebhook(payload: string, headers: {
    id: string;
    timestamp: string;
    signature: string;
}, webhookSecret: string): any {
    if (!resend) throw new Error("RESEND_API_KEY is not configured");
    return resend.webhooks.verify({
        payload,
        headers,
        webhookSecret,
    });
}

function buildResendContactProperties(contact: EmailContact): Record<string, string | number | null> {
    const props: Record<string, string | number | null> = {
        ...(contact.customProperties as Record<string, string | number | null>),
    };
    if (contact.address) props.address = contact.address;
    if (contact.city) props.city = contact.city;
    if (contact.state) props.state = contact.state;
    if (contact.zip) props.zip = contact.zip;
    if (contact.phone) props.phone = contact.phone;
    return props;
}

export async function upsertResendContact(
    contact: EmailContact,
    opts: { allowResubscribe?: boolean } = {},
): Promise<string | null> {
    if (!resend) return null;

    const profileFields = {
        firstName: contact.firstName || undefined,
        lastName: contact.lastName || undefined,
    };

    // Never silently re-subscribe an existing Resend contact. We only send
    // unsubscribed:false after a fresh, explicit opt-in (website form/admin
    // action/Square marketing-consent change). Suppression is always allowed.
    const subscriptionFields =
        contact.marketingStatus !== "subscribed"
            ? { unsubscribed: true }
            : opts.allowResubscribe
              ? { unsubscribed: false }
              : {};

    if (contact.resendContactId) {
        const { data, error } = await resend.contacts.update({
            id: contact.resendContactId,
            email: null,
            ...profileFields,
            ...subscriptionFields,
        });
        if (error) {
            console.error("[RESEND-MARKETING] contact update failed:", error.message);
            return null;
        }
        return data?.id ?? contact.resendContactId;
    }

    const { data, error } = await resend.contacts.create({
        email: contact.email,
        ...profileFields,
        unsubscribed: contact.marketingStatus !== "subscribed",
    });
    if (error) {
        // Contact may already exist in Resend. Preserve its existing
        // subscription state unless this call represents explicit re-consent.
        const existing = await resend.contacts.get({ email: contact.email });
        if (existing.data?.id) {
            const updated = await resend.contacts.update({
                id: existing.data.id,
                email: null,
                ...profileFields,
                ...subscriptionFields,
            });
            if (updated.error) {
                console.error("[RESEND-MARKETING] contact update by email failed:", updated.error.message);
                return null;
            }
            return updated.data?.id ?? existing.data.id;
        }
        console.error("[RESEND-MARKETING] contact create failed:", error.message);
        return null;
    }

    return data?.id ?? null;
}

export async function ensureResendSegment(segmentId: number): Promise<string | null> {
    if (!resend) return null;

    const [segment] = await db
        .select()
        .from(emailSegmentsTable)
        .where(eq(emailSegmentsTable.id, segmentId))
        .limit(1);

    if (!segment) return null;
    if (segment.resendSegmentId) return segment.resendSegmentId;

    const { data, error } = await resend.segments.create({ name: `app-segment-${segment.id}-${segment.name}` });
    if (error) {
        console.error("[RESEND-MARKETING] segment create failed:", error.message);
        return null;
    }

    const resendSegmentId = data?.id;
    if (!resendSegmentId) return null;

    await db
        .update(emailSegmentsTable)
        .set({ resendSegmentId, updatedAt: new Date() })
        .where(eq(emailSegmentsTable.id, segmentId));

    return resendSegmentId;
}

export async function syncSegmentMembersToResend(segmentId: number): Promise<{ synced: number; failed: number }> {
    if (!resend) return { synced: 0, failed: 0 };

    const resendSegmentId = await ensureResendSegment(segmentId);
    if (!resendSegmentId) return { synced: 0, failed: 0 };

    const contactIds = await getSegmentContactIds(segmentId);
    if (!contactIds.length) return { synced: 0, failed: 0 };

    const members = await db
        .select()
        .from(emailContactsTable)
        .where(
            and(
                inArray(emailContactsTable.id, contactIds),
                eq(emailContactsTable.marketingStatus, "subscribed"),
            ),
        );

    const outcomes = await mapWithConcurrency(members, SYNC_CONCURRENCY, async (contact) => {
        const resendContactId = await upsertResendContact(contact);
        if (!resendContactId) return "failed" as const;

        if (contact.resendContactId !== resendContactId) {
            await db
                .update(emailContactsTable)
                .set({ resendContactId, updatedAt: new Date() })
                .where(eq(emailContactsTable.id, contact.id));
        }

        const { error } = await resend.contacts.segments.add({
            contactId: resendContactId,
            segmentId: resendSegmentId,
        });

        if (error && !error.message.includes("already")) {
            console.error("[RESEND-MARKETING] add to segment failed:", error.message);
            return "failed" as const;
        }
        return "synced" as const;
    });

    return {
        synced: outcomes.filter((o) => o === "synced").length,
        failed: outcomes.filter((o) => o === "failed").length,
    };
}

/** Best-effort sync after local contact create/update (non-blocking for API response). */
export async function syncContactToResend(
    contactId: number,
    opts: { allowResubscribe?: boolean } = {},
): Promise<void> {
    if (!resend) return;

    const [contact] = await db
        .select()
        .from(emailContactsTable)
        .where(eq(emailContactsTable.id, contactId))
        .limit(1);

    if (!contact) return;

    const resendContactId = await upsertResendContact(contact, opts);
    if (resendContactId && contact.resendContactId !== resendContactId) {
        await db
            .update(emailContactsTable)
            .set({ resendContactId, updatedAt: new Date() })
            .where(eq(emailContactsTable.id, contactId));
    }
}

export async function sendMarketingTestEmail(opts: {
    to: string;
    subject: string;
    html: string;
    from?: string;
    replyTo?: string;
}): Promise<{ resendId: string | null; error?: string }> {
    if (!resend) {
        return { resendId: null, error: "RESEND_API_KEY is not configured" };
    }

    const { data, error } = await resend.emails.send(
        {
            from: opts.from || MARKETING_FROM_EMAIL,
            to: [opts.to],
            subject: opts.subject,
            html: opts.html,
            replyTo: opts.replyTo || undefined,
        },
        { idempotencyKey: `marketing-test/${opts.to}/${Date.now()}` },
    );

    if (error) {
        return { resendId: null, error: error.message };
    }

    await db.insert(sentEmailsLogTable).values({
        toEmail: opts.to,
        subject: opts.subject,
        emailType: "marketing_test",
        resendId: data?.id ?? null,
        status: "sent",
    });

    return { resendId: data?.id ?? null };
}

export async function sendMarketingCampaign(campaignId: number): Promise<{
    success: boolean;
    broadcastId?: string;
    error?: string;
}> {
    if (!resend) {
        return { success: false, error: "RESEND_API_KEY is not configured" };
    }

    const [campaign] = await db
        .select()
        .from(emailCampaignsTable)
        .where(eq(emailCampaignsTable.id, campaignId))
        .limit(1);

    if (!campaign) return { success: false, error: "Campaign not found" };
    if (!campaign.segmentId) return { success: false, error: "Campaign has no segment" };
    if (!campaign.templateId) return { success: false, error: "Campaign has no template" };

    const [template] = await db
        .select()
        .from(emailTemplatesTable)
        .where(eq(emailTemplatesTable.id, campaign.templateId))
        .limit(1);

    if (!template) return { success: false, error: "Template not found" };

    const html = withMarketingComplianceFooter(
        template.compiledHtml ||
        compileEmailDocument(template.document as EmailDocument),
    );

    const { synced, failed } = await syncSegmentMembersToResend(campaign.segmentId);
    if (synced === 0 && failed > 0) {
        return { success: false, error: "Failed to sync any contacts to Resend" };
    }

    const [segment] = await db
        .select()
        .from(emailSegmentsTable)
        .where(eq(emailSegmentsTable.id, campaign.segmentId))
        .limit(1);

    if (!segment?.resendSegmentId) {
        return { success: false, error: "Resend segment not available" };
    }

    await db
        .update(emailCampaignsTable)
        .set({ status: "sending", updatedAt: new Date() })
        .where(eq(emailCampaignsTable.id, campaignId));

    const from = campaign.fromEmail || MARKETING_FROM_EMAIL;

    let resendTopicId: string | undefined;
    if (campaign.topicId) {
        const [topic] = await db
            .select()
            .from(emailTopicsTable)
            .where(eq(emailTopicsTable.id, campaign.topicId))
            .limit(1);
        resendTopicId = topic?.resendTopicId ?? undefined;
    }

    const broadcastPayload = {
        name: campaign.name,
        segmentId: segment.resendSegmentId,
        from,
        subject: campaign.subject,
        previewText: campaign.previewText || undefined,
        html,
        replyTo: campaign.replyTo || undefined,
        topicId: resendTopicId,
        send: !campaign.scheduledAt,
        scheduledAt: campaign.scheduledAt
            ? campaign.scheduledAt.toISOString()
            : undefined,
    };

    const { data, error } = await resend.broadcasts.create(
        broadcastPayload as Parameters<typeof resend.broadcasts.create>[0],
    );

    if (error) {
        await db
            .update(emailCampaignsTable)
            .set({ status: "draft", updatedAt: new Date() })
            .where(eq(emailCampaignsTable.id, campaignId));
        return { success: false, error: error.message };
    }

    const broadcastId = data?.id;
    if (!broadcastId) {
        return { success: false, error: "Broadcast created without ID" };
    }

    await db
        .update(emailCampaignsTable)
        .set({
            resendBroadcastId: broadcastId,
            status: campaign.scheduledAt ? "scheduled" : "sent",
            sentAt: campaign.scheduledAt ? null : new Date(),
            stats: { sent: synced, delivered: 0, opened: 0, clicked: 0, bounced: 0, complained: 0 },
            updatedAt: new Date(),
        })
        .where(eq(emailCampaignsTable.id, campaignId));

    return { success: true, broadcastId };
}

export async function handleMarketingWebhookEvent(
    event: {
        type: string;
        data?: {
            id?: string;
            email?: string;
            unsubscribed?: boolean;
            email_id?: string;
            to?: string | string[];
            broadcast_id?: string;
            click?: { link?: string };
            tags?: { name: string; value: string }[];
        };
    },
    opts?: { resendEventId?: string },
): Promise<void> {
    // Resend reports unsubscribe changes as contact.updated. Persist that state
    // locally so a future campaign cannot accidentally re-add the contact.
    if (event.type === "contact.updated") {
        const email = event.data?.email?.toLowerCase().trim();
        if (email && event.data?.unsubscribed === true) {
            const [contact] = await db
                .select()
                .from(emailContactsTable)
                .where(eq(emailContactsTable.email, email))
                .limit(1);

            if (contact && contact.marketingStatus !== "bounced" && contact.marketingStatus !== "complained") {
                await db
                    .update(emailContactsTable)
                    .set({
                        marketingStatus: "unsubscribed",
                        consentSource: "resend_unsubscribe",
                        consentAt: null,
                        updatedAt: new Date(),
                    })
                    .where(eq(emailContactsTable.id, contact.id));
            }
        }
        return;
    }

    const broadcastId = event.data?.broadcast_id;
    if (!broadcastId) return;

    const resendEventId = opts?.resendEventId ?? null;
    if (resendEventId) {
        const [existing] = await db
            .select({ id: emailCampaignEventsTable.id })
            .from(emailCampaignEventsTable)
            .where(eq(emailCampaignEventsTable.resendEventId, resendEventId))
            .limit(1);
        if (existing) return;
    }

    const [campaign] = await db
        .select()
        .from(emailCampaignsTable)
        .where(eq(emailCampaignsTable.resendBroadcastId, broadcastId))
        .limit(1);

    if (!campaign) return;

    const toEmail = Array.isArray(event.data?.to)
        ? event.data.to[0]
        : event.data?.to || "";

    let contactId: number | null = null;
    if (toEmail) {
        const [contact] = await db
            .select({ id: emailContactsTable.id })
            .from(emailContactsTable)
            .where(eq(emailContactsTable.email, toEmail.toLowerCase()))
            .limit(1);
        contactId = contact?.id ?? null;
    }

    const eventType = event.type.replace("email.", "");
    const clickLink = event.data?.click?.link ?? null;
    const metadata: Record<string, string> = {};
    if (clickLink) metadata.link = clickLink;

    const statKey =
        eventType === "delivered"
            ? "delivered"
            : eventType === "opened"
              ? "opened"
              : eventType === "clicked"
                ? "clicked"
                : eventType === "bounced"
                  ? "bounced"
                  : eventType === "complained"
                    ? "complained"
                    : null;

    if (statKey) {
        const stats = (campaign.stats as Record<string, number>) || {};
        stats[statKey] = (stats[statKey] || 0) + 1;
        await db
            .update(emailCampaignsTable)
            .set({ stats, updatedAt: new Date() })
            .where(eq(emailCampaignsTable.id, campaign.id));
    }

    if ((eventType === "bounced" || eventType === "complained") && contactId) {
        await db
            .update(emailContactsTable)
            .set({
                marketingStatus: eventType,
                consentAt: null,
                updatedAt: new Date(),
            })
            .where(eq(emailContactsTable.id, contactId));
    }

    await db.insert(emailCampaignEventsTable).values({
        campaignId: campaign.id,
        contactId,
        email: toEmail,
        eventType,
        resendEmailId: event.data?.email_id ?? null,
        resendEventId,
        metadata,
    });
}

export async function getCampaignLinkStats(campaignId: number) {
    const events = await db
        .select()
        .from(emailCampaignEventsTable)
        .where(
            and(
                eq(emailCampaignEventsTable.campaignId, campaignId),
                eq(emailCampaignEventsTable.eventType, "clicked"),
            ),
        );

    const byLink = new Map<string, number>();
    for (const event of events) {
        const link = (event.metadata as { link?: string })?.link || "(unknown)";
        byLink.set(link, (byLink.get(link) || 0) + 1);
    }

    return Array.from(byLink.entries())
        .map(([link, clicks]) => ({ link, clicks }))
        .sort((a, b) => b.clicks - a.clicks);
}

export async function refreshSegmentContactCount(segmentId: number): Promise<number> {
    const members = await db
        .select({ id: emailSegmentMembersTable.id })
        .from(emailSegmentMembersTable)
        .where(eq(emailSegmentMembersTable.segmentId, segmentId));

    const count = members.length;
    await db
        .update(emailSegmentsTable)
        .set({ contactCount: count, updatedAt: new Date() })
        .where(eq(emailSegmentsTable.id, segmentId));

    return count;
}

export async function syncCustomersToContacts(): Promise<{ imported: number; skipped: number; suppressed: number }> {
    const { customersTable } = await import("@workspace/db/schema");
    const customers = await db.select().from(customersTable);

    let imported = 0;
    let skipped = 0;
    let suppressed = 0;

    for (const customer of customers) {
        if (!customer.email) {
            skipped++;
            continue;
        }

        const email = customer.email.toLowerCase().trim();
        const [existing] = await db
            .select()
            .from(emailContactsTable)
            .where(eq(emailContactsTable.email, email))
            .limit(1);

        if (existing) {
            if (
                existing.source === "customer_sync" &&
                existing.consentSource === "customer_record" &&
                existing.marketingStatus === "subscribed"
            ) {
                await db
                    .update(emailContactsTable)
                    .set({
                        marketingStatus: "unsubscribed",
                        consentSource: "customer_record_no_marketing_consent",
                        consentAt: null,
                        updatedAt: new Date(),
                    })
                    .where(eq(emailContactsTable.id, existing.id));
                await syncContactToResend(existing.id);
                await sleep(150);
                suppressed++;
            } else {
                skipped++;
            }
            continue;
        }

        const [created] = await db.insert(emailContactsTable).values({
            email,
            firstName: customer.firstName,
            lastName: customer.lastName,
            phone: customer.phone,
            address: customer.address,
            city: customer.city,
            state: customer.state,
            zip: customer.zip,
            country: customer.country,
            marketingStatus: "unsubscribed",
            source: "customer_sync",
            consentSource: "customer_record_no_marketing_consent",
            consentAt: null,
        }).returning();
        imported++;
    }

    return { imported, skipped, suppressed };
}

export async function syncInquiriesToContacts(): Promise<{ imported: number; skipped: number; suppressed: number }> {
    const { inquiriesTable } = await import("@workspace/db/schema");
    const inquiries = await db.select().from(inquiriesTable);

    let imported = 0;
    let skipped = 0;
    let suppressed = 0;

    for (const inquiry of inquiries) {
        if (!inquiry.email) {
            skipped++;
            continue;
        }

        const email = inquiry.email.toLowerCase().trim();
        const [existing] = await db
            .select()
            .from(emailContactsTable)
            .where(eq(emailContactsTable.email, email))
            .limit(1);

        if (existing) {
            if (
                existing.source === "inquiry_sync" &&
                existing.consentSource.startsWith("inquiry:") &&
                existing.marketingStatus === "subscribed"
            ) {
                await db
                    .update(emailContactsTable)
                    .set({
                        marketingStatus: "unsubscribed",
                        consentSource: "inquiry_no_marketing_consent",
                        consentAt: null,
                        updatedAt: new Date(),
                    })
                    .where(eq(emailContactsTable.id, existing.id));
                await syncContactToResend(existing.id);
                await sleep(150);
                suppressed++;
            } else {
                skipped++;
            }
            continue;
        }

        const nameParts = (inquiry.name || "").trim().split(/\s+/);
        const [created] = await db.insert(emailContactsTable).values({
            email,
            firstName: nameParts[0] || "",
            lastName: nameParts.slice(1).join(" "),
            phone: inquiry.phone || "",
            marketingStatus: "unsubscribed",
            source: "inquiry_sync",
            consentSource: "inquiry_no_marketing_consent",
            consentAt: null,
            customProperties: { inquiryType: inquiry.type },
        }).returning();
        imported++;
    }

    return { imported, skipped, suppressed };
}

export async function syncSquareCustomersToContacts(): Promise<{
    imported: number;
    skipped: number;
    updated: number;
    subscribed: number;
    suppressed: number;
}> {
    const { listAllSquareCustomers } = await import("./square");
    const squareCustomers = await listAllSquareCustomers();

    let imported = 0;
    let skipped = 0;
    let updated = 0;
    let subscribed = 0;
    let suppressed = 0;

    for (const customer of squareCustomers) {
        const email = customer.email.toLowerCase().trim();
        const [existing] = await db
            .select()
            .from(emailContactsTable)
            .where(eq(emailContactsTable.email, email))
            .limit(1);

        if (!existing) {
            const hasConsent = customer.marketingConsent && !customer.emailUnsubscribed;
            const [created] = await db.insert(emailContactsTable).values({
                email,
                firstName: customer.firstName,
                lastName: customer.lastName,
                phone: customer.phone,
                address: customer.address,
                city: customer.city,
                state: customer.state,
                zip: customer.zip,
                marketingStatus: hasConsent ? "subscribed" : "unsubscribed",
                source: "square_sync",
                consentSource: hasConsent
                    ? "square_marketing_opt_in"
                    : "square_customer_no_marketing_consent",
                consentAt: hasConsent ? new Date() : null,
                customProperties: { squareCustomerId: customer.id },
            }).returning();

            if (hasConsent) {
                await syncContactToResend(created.id, { allowResubscribe: true });
                await sleep(150);
            }
            imported++;
            if (hasConsent) subscribed++;
            else suppressed++;
            continue;
        }

        const customProperties = {
            ...(existing.customProperties as Record<string, unknown>),
            squareCustomerId: customer.id,
        };

        let nextStatus = existing.marketingStatus;
        let nextConsentSource = existing.consentSource;
        let nextConsentAt = existing.consentAt;
        let allowResubscribe = false;

        if (
            customer.emailUnsubscribed &&
            existing.marketingStatus !== "bounced" &&
            existing.marketingStatus !== "complained"
        ) {
            nextStatus = "unsubscribed";
            nextConsentSource = "square_marketing_opt_out";
            nextConsentAt = null;
        } else if (
            customer.marketingConsent &&
            existing.marketingStatus !== "bounced" &&
            existing.marketingStatus !== "complained" &&
            existing.consentSource !== "resend_unsubscribe" &&
            (
                existing.marketingStatus === "subscribed" ||
                ["square_pos", "square_customer_no_marketing_consent", "square_marketing_opt_out"].includes(existing.consentSource)
            )
        ) {
            nextStatus = "subscribed";
            nextConsentSource = "square_marketing_opt_in";
            nextConsentAt = new Date();
            allowResubscribe = existing.marketingStatus !== "subscribed";
        } else if (
            !customer.marketingConsent &&
            existing.source === "square_sync" &&
            existing.marketingStatus === "subscribed" &&
            existing.consentSource === "square_pos"
        ) {
            // Repair records imported by the old sync, which treated a receipt
            // email as marketing permission.
            nextStatus = "unsubscribed";
            nextConsentSource = "square_customer_no_marketing_consent";
            nextConsentAt = null;
        }

        const stateChanged =
            nextStatus !== existing.marketingStatus ||
            nextConsentSource !== existing.consentSource ||
            nextConsentAt !== existing.consentAt;

        await db
            .update(emailContactsTable)
            .set({
                firstName: existing.firstName || customer.firstName,
                lastName: existing.lastName || customer.lastName,
                phone: existing.phone || customer.phone,
                address: existing.address || customer.address,
                city: existing.city || customer.city,
                state: existing.state || customer.state,
                zip: existing.zip || customer.zip,
                customProperties,
                marketingStatus: nextStatus,
                consentSource: nextConsentSource,
                consentAt: nextConsentAt,
                updatedAt: new Date(),
            })
            .where(eq(emailContactsTable.id, existing.id));

        if (stateChanged || (!existing.resendContactId && nextStatus === "subscribed")) {
            await syncContactToResend(existing.id, { allowResubscribe });
            await sleep(150);
        }

        if (stateChanged) {
            updated++;
            if (nextStatus === "subscribed") subscribed++;
            if (nextStatus === "unsubscribed") suppressed++;
        } else {
            skipped++;
        }
    }

    // Link Square customer ids onto website customer records for order/payment reconciliation.
    const { customersTable } = await import("@workspace/db/schema");
    for (const sq of squareCustomers) {
        const [local] = await db
            .select({ id: customersTable.id, squareCustomerId: customersTable.squareCustomerId })
            .from(customersTable)
            .where(eq(customersTable.email, sq.email))
            .limit(1);
        if (local && !local.squareCustomerId) {
            await db
                .update(customersTable)
                .set({ squareCustomerId: sq.id, updatedAt: new Date() })
                .where(eq(customersTable.id, local.id));
            updated++;
        }
    }

    return { imported, skipped, updated, subscribed, suppressed };
}

export async function scheduleMarketingCampaign(
    campaignId: number,
    scheduledAt: Date,
): Promise<{ success: boolean; broadcastId?: string; error?: string }> {
    await db
        .update(emailCampaignsTable)
        .set({ scheduledAt, updatedAt: new Date() })
        .where(eq(emailCampaignsTable.id, campaignId));

    return sendMarketingCampaign(campaignId);
}

export async function cancelScheduledCampaign(campaignId: number): Promise<{ success: boolean; error?: string }> {
    const [campaign] = await db
        .select()
        .from(emailCampaignsTable)
        .where(eq(emailCampaignsTable.id, campaignId))
        .limit(1);

    if (!campaign) return { success: false, error: "Campaign not found" };
    if (campaign.status !== "scheduled") {
        return { success: false, error: "Campaign is not scheduled" };
    }

    if (resend && campaign.resendBroadcastId) {
        const { error } = await resend.broadcasts.remove(campaign.resendBroadcastId);
        if (error) {
            console.error("[RESEND-MARKETING] cancel broadcast failed:", error.message);
        }
    }

    await db
        .update(emailCampaignsTable)
        .set({
            status: "draft",
            scheduledAt: null,
            resendBroadcastId: null,
            updatedAt: new Date(),
        })
        .where(eq(emailCampaignsTable.id, campaignId));

    return { success: true };
}

export async function listResendTopics(): Promise<{ id: string; name: string }[]> {
    if (!resend) return [];
    const { data, error } = await resend.topics.list();
    if (error || !data?.data) return [];
    return data.data.map((t) => ({ id: t.id, name: t.name }));
}

export async function createResendTopic(name: string, description?: string): Promise<string | null> {
    if (!resend) return null;
    const { data, error } = await resend.topics.create({
        name,
        description,
        defaultSubscription: "opt_in",
    });
    if (error) {
        console.error("[RESEND-MARKETING] topic create failed:", error.message);
        return null;
    }
    return data?.id ?? null;
}

export async function getCampaignRecipientStats(campaignId: number) {
    const events = await db
        .select()
        .from(emailCampaignEventsTable)
        .where(eq(emailCampaignEventsTable.campaignId, campaignId));

    const byEmail = new Map<string, {
        email: string;
        contactId: number | null;
        delivered: boolean;
        opened: boolean;
        clicked: boolean;
        bounced: boolean;
        complained: boolean;
        lastEvent: string;
        lastAt: Date;
    }>();

    for (const e of events) {
        const key = e.email || `unknown-${e.id}`;
        let row = byEmail.get(key);
        if (!row) {
            row = {
                email: e.email,
                contactId: e.contactId,
                delivered: false,
                opened: false,
                clicked: false,
                bounced: false,
                complained: false,
                lastEvent: e.eventType,
                lastAt: e.occurredAt,
            };
            byEmail.set(key, row);
        }
        if (e.eventType === "delivered") row.delivered = true;
        if (e.eventType === "opened") row.opened = true;
        if (e.eventType === "clicked") row.clicked = true;
        if (e.eventType === "bounced") row.bounced = true;
        if (e.eventType === "complained") row.complained = true;
        if (e.occurredAt > row.lastAt) {
            row.lastAt = e.occurredAt;
            row.lastEvent = e.eventType;
        }
    }

    return Array.from(byEmail.values()).sort((a, b) => b.lastAt.getTime() - a.lastAt.getTime());
}
