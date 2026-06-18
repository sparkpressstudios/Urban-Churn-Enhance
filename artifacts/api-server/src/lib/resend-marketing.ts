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

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

const SYNC_CONCURRENCY = 4;
const SYNC_DELAY_MS = 280;

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

export async function upsertResendContact(contact: EmailContact): Promise<string | null> {
    if (!resend) return null;

    const baseFields = {
        firstName: contact.firstName || undefined,
        lastName: contact.lastName || undefined,
        unsubscribed: contact.marketingStatus !== "subscribed",
        properties: buildResendContactProperties(contact),
    };

    if (contact.resendContactId) {
        const { data, error } = await resend.contacts.update({
            id: contact.resendContactId,
            email: null,
            ...baseFields,
        });
        if (error) {
            console.error("[RESEND-MARKETING] contact update failed:", error.message);
            return null;
        }
        return data?.id ?? contact.resendContactId;
    }

    const { data, error } = await resend.contacts.create({
        email: contact.email,
        ...baseFields,
    });
    if (error) {
        // Contact may already exist — try update by email
        const existing = await resend.contacts.get({ email: contact.email });
        if (existing.data?.id) {
            const updated = await resend.contacts.update({
                id: existing.data.id,
                email: null,
                ...baseFields,
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
export async function syncContactToResend(contactId: number): Promise<void> {
    if (!resend) return;

    const [contact] = await db
        .select()
        .from(emailContactsTable)
        .where(eq(emailContactsTable.id, contactId))
        .limit(1);

    if (!contact) return;

    const resendContactId = await upsertResendContact(contact);
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

    const html =
        template.compiledHtml ||
        compileEmailDocument(template.document as EmailDocument);

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
            email_id?: string;
            to?: string | string[];
            broadcast_id?: string;
            click?: { link?: string };
            tags?: { name: string; value: string }[];
        };
    },
    opts?: { resendEventId?: string },
): Promise<void> {
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
                    : eventType === "unsubscribed"
                      ? "unsubscribed"
                      : null;

    if (statKey && statKey !== "unsubscribed") {
        const stats = (campaign.stats as Record<string, number>) || {};
        stats[statKey] = (stats[statKey] || 0) + 1;
        await db
            .update(emailCampaignsTable)
            .set({ stats, updatedAt: new Date() })
            .where(eq(emailCampaignsTable.id, campaign.id));
    }

    if ((eventType === "bounced" || eventType === "complained" || eventType === "unsubscribed") && contactId) {
        const status =
            eventType === "bounced"
                ? "bounced"
                : eventType === "complained"
                  ? "complained"
                  : "unsubscribed";
        await db
            .update(emailContactsTable)
            .set({ marketingStatus: status, updatedAt: new Date() })
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

export async function syncCustomersToContacts(): Promise<{ imported: number; skipped: number }> {
    const { customersTable } = await import("@workspace/db/schema");
    const customers = await db.select().from(customersTable);

    let imported = 0;
    let skipped = 0;

    for (const customer of customers) {
        if (!customer.email) {
            skipped++;
            continue;
        }

        const email = customer.email.toLowerCase().trim();
        const [existing] = await db
            .select({ id: emailContactsTable.id })
            .from(emailContactsTable)
            .where(eq(emailContactsTable.email, email))
            .limit(1);

        if (existing) {
            skipped++;
            continue;
        }

        await db.insert(emailContactsTable).values({
            email,
            firstName: customer.firstName,
            lastName: customer.lastName,
            phone: customer.phone,
            address: customer.address,
            city: customer.city,
            state: customer.state,
            zip: customer.zip,
            country: customer.country,
            source: "customer_sync",
            consentSource: "customer_record",
            consentAt: new Date(),
        });
        imported++;
    }

    return { imported, skipped };
}

export async function syncInquiriesToContacts(): Promise<{ imported: number; skipped: number }> {
    const { inquiriesTable } = await import("@workspace/db/schema");
    const inquiries = await db.select().from(inquiriesTable);

    let imported = 0;
    let skipped = 0;

    for (const inquiry of inquiries) {
        if (!inquiry.email) {
            skipped++;
            continue;
        }

        const email = inquiry.email.toLowerCase().trim();
        const [existing] = await db
            .select({ id: emailContactsTable.id })
            .from(emailContactsTable)
            .where(eq(emailContactsTable.email, email))
            .limit(1);

        if (existing) {
            skipped++;
            continue;
        }

        const nameParts = (inquiry.name || "").trim().split(/\s+/);
        await db.insert(emailContactsTable).values({
            email,
            firstName: nameParts[0] || "",
            lastName: nameParts.slice(1).join(" "),
            phone: inquiry.phone || "",
            source: "inquiry_sync",
            consentSource: `inquiry:${inquiry.type}`,
            consentAt: inquiry.createdAt,
        });
        imported++;
    }

    return { imported, skipped };
}

export async function syncSquareCustomersToContacts(): Promise<{ imported: number; skipped: number; updated: number }> {
    const { listAllSquareCustomers } = await import("./square");
    const squareCustomers = await listAllSquareCustomers();

    let imported = 0;
    let skipped = 0;
    let updated = 0;

    for (const customer of squareCustomers) {
        const email = customer.email.toLowerCase().trim();
        const [existing] = await db
            .select({ id: emailContactsTable.id })
            .from(emailContactsTable)
            .where(eq(emailContactsTable.email, email))
            .limit(1);

        if (existing) {
            skipped++;
            continue;
        }

        await db.insert(emailContactsTable).values({
            email,
            firstName: customer.firstName,
            lastName: customer.lastName,
            phone: customer.phone,
            address: customer.address,
            city: customer.city,
            state: customer.state,
            zip: customer.zip,
            source: "square_sync",
            consentSource: "square_pos",
            consentAt: new Date(),
            customProperties: { squareCustomerId: customer.id },
        });
        imported++;
    }

    // Also link squareCustomerId on existing customer records when missing
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

    return { imported, skipped, updated };
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
