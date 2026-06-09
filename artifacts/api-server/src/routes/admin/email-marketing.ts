import { Router, type IRouter } from "express";
import multer from "multer";
import { db } from "@workspace/db";
import {
    emailContactsTable,
    emailSegmentsTable,
    emailSegmentMembersTable,
    emailTemplatesTable,
    emailTemplateRevisionsTable,
    emailTopicsTable,
    emailCampaignsTable,
    emailCampaignEventsTable,
    emailImportJobsTable,
} from "@workspace/db/schema";
import { eq, desc, and, or, ilike, count, sql, inArray } from "drizzle-orm";
import { compileEmailDocument, createBlankEmailDocument, type EmailDocument } from "../../lib/email-compiler";
import { parseContactsCsv } from "../../lib/email-contact-import";
import {
    SEGMENT_RULE_FIELDS,
    evaluateAndPopulateDynamicSegment,
    previewSegmentRules,
    type SegmentRules,
} from "../../lib/email-segment-rules";
import {
    MARKETING_FROM_EMAIL,
    isResendMarketingConfigured,
    refreshSegmentContactCount,
    sendMarketingCampaign,
    sendMarketingTestEmail,
    syncCustomersToContacts,
    syncInquiriesToContacts,
    syncSquareCustomersToContacts,
    scheduleMarketingCampaign,
    cancelScheduledCampaign,
    listResendTopics,
    createResendTopic,
    getCampaignRecipientStats,
    getCampaignLinkStats,
    syncContactToResend,
} from "../../lib/resend-marketing";
import { getSegmentContactIds } from "../../lib/email-segment-rules";

const router: IRouter = Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
});

// ── Contacts ────────────────────────────────────────────────────────────────

router.get("/contacts", async (req, res) => {
    const search = (req.query.search as string) || "";
    const status = (req.query.status as string) || "";
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 50));
    const offset = (page - 1) * limit;

    const conditions = [];
    if (search) {
        conditions.push(
            or(
                ilike(emailContactsTable.email, `%${search}%`),
                ilike(emailContactsTable.firstName, `%${search}%`),
                ilike(emailContactsTable.lastName, `%${search}%`),
            ),
        );
    }
    if (status) {
        conditions.push(eq(emailContactsTable.marketingStatus, status as any));
    }

    const where = conditions.length ? and(...conditions) : undefined;

    const [totalRow] = await db
        .select({ count: count() })
        .from(emailContactsTable)
        .where(where);

    const contacts = await db
        .select()
        .from(emailContactsTable)
        .where(where)
        .orderBy(desc(emailContactsTable.createdAt))
        .limit(limit)
        .offset(offset);

    res.json({
        contacts,
        total: totalRow?.count ?? 0,
        page,
        limit,
        resendConfigured: isResendMarketingConfigured(),
    });
});

router.get("/contacts/:id", async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const [contact] = await db
        .select()
        .from(emailContactsTable)
        .where(eq(emailContactsTable.id, id))
        .limit(1);

    if (!contact) {
        res.status(404).json({ error: "Contact not found" });
        return;
    }

    res.json(contact);
});

router.post("/contacts", async (req, res) => {
    const body = req.body ?? {};
    const email = (body.email || "").trim().toLowerCase();

    if (!email) {
        res.status(400).json({ error: "Email is required" });
        return;
    }

    const [existing] = await db
        .select({ id: emailContactsTable.id })
        .from(emailContactsTable)
        .where(eq(emailContactsTable.email, email))
        .limit(1);

    if (existing) {
        res.status(409).json({ error: "Contact with this email already exists" });
        return;
    }

    const [contact] = await db
        .insert(emailContactsTable)
        .values({
            email,
            firstName: body.firstName || "",
            lastName: body.lastName || "",
            phone: body.phone || "",
            address: body.address || "",
            city: body.city || "",
            state: body.state || "",
            zip: body.zip || "",
            country: body.country || "US",
            customProperties: body.customProperties || {},
            marketingStatus: body.marketingStatus || "subscribed",
            consentSource: body.consentSource || "manual",
            consentAt: body.consentAt ? new Date(body.consentAt) : new Date(),
            source: "manual",
        })
        .returning();

    syncContactToResend(contact.id).catch((err) =>
        console.error("[EMAIL-MARKETING] Resend contact sync failed:", err),
    );

    res.status(201).json(contact);
});

router.get("/contacts/:id/activity", async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const [contact] = await db
        .select()
        .from(emailContactsTable)
        .where(eq(emailContactsTable.id, id))
        .limit(1);

    if (!contact) {
        res.status(404).json({ error: "Contact not found" });
        return;
    }

    const events = await db
        .select({
            id: emailCampaignEventsTable.id,
            eventType: emailCampaignEventsTable.eventType,
            email: emailCampaignEventsTable.email,
            metadata: emailCampaignEventsTable.metadata,
            occurredAt: emailCampaignEventsTable.occurredAt,
            campaignId: emailCampaignEventsTable.campaignId,
            campaignName: emailCampaignsTable.name,
        })
        .from(emailCampaignEventsTable)
        .leftJoin(emailCampaignsTable, eq(emailCampaignEventsTable.campaignId, emailCampaignsTable.id))
        .where(
            or(
                eq(emailCampaignEventsTable.contactId, id),
                eq(emailCampaignEventsTable.email, contact.email),
            ),
        )
        .orderBy(desc(emailCampaignEventsTable.occurredAt))
        .limit(100);

    res.json({ contact, events });
});

router.patch("/contacts/:id", async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const body = req.body ?? {};

    const [existing] = await db
        .select()
        .from(emailContactsTable)
        .where(eq(emailContactsTable.id, id))
        .limit(1);

    if (!existing) {
        res.status(404).json({ error: "Contact not found" });
        return;
    }

    const [contact] = await db
        .update(emailContactsTable)
        .set({
            firstName: body.firstName ?? existing.firstName,
            lastName: body.lastName ?? existing.lastName,
            phone: body.phone ?? existing.phone,
            address: body.address ?? existing.address,
            city: body.city ?? existing.city,
            state: body.state ?? existing.state,
            zip: body.zip ?? existing.zip,
            country: body.country ?? existing.country,
            customProperties: body.customProperties ?? existing.customProperties,
            marketingStatus: body.marketingStatus ?? existing.marketingStatus,
            updatedAt: new Date(),
        })
        .where(eq(emailContactsTable.id, id))
        .returning();

    syncContactToResend(contact.id).catch((err) =>
        console.error("[EMAIL-MARKETING] Resend contact sync failed:", err),
    );

    res.json(contact);
});

router.delete("/contacts/:id", async (req, res) => {
    const id = parseInt(req.params.id, 10);
    await db.delete(emailContactsTable).where(eq(emailContactsTable.id, id));
    res.json({ success: true });
});

router.post("/contacts/import/preview", upload.single("file"), async (req, res) => {
    if (!req.file) {
        res.status(400).json({ error: "No file uploaded" });
        return;
    }

    const csvContent = req.file.buffer.toString("utf-8");
    const parsed = parseContactsCsv(csvContent);

    res.json({
        filename: req.file.originalname,
        headers: parsed.headers,
        mapping: parsed.mapping,
        totalRows: parsed.rows.length,
        preview: parsed.rows.slice(0, 20),
        parseErrors: parsed.errors.slice(0, 20),
    });
});

router.post("/contacts/import/execute", upload.single("file"), async (req, res) => {
    if (!req.file) {
        res.status(400).json({ error: "No file uploaded" });
        return;
    }

    const csvContent = req.file.buffer.toString("utf-8");
    const parsed = parseContactsCsv(csvContent);

    const [job] = await db
        .insert(emailImportJobsTable)
        .values({
            filename: req.file.originalname,
            totalRows: parsed.rows.length,
            status: "processing",
        })
        .returning();

    const errors = [...parsed.errors];
    let imported = 0;
    let skipped = 0;

    for (let i = 0; i < parsed.rows.length; i++) {
        const row = parsed.rows[i];
        const [existing] = await db
            .select({ id: emailContactsTable.id })
            .from(emailContactsTable)
            .where(eq(emailContactsTable.email, row.email))
            .limit(1);

        if (existing) {
            skipped++;
            continue;
        }

        try {
            await db.insert(emailContactsTable).values({
                ...row,
                source: "import",
                consentSource: "csv_import",
                consentAt: new Date(),
            });
            imported++;
        } catch (err: any) {
            errors.push({ row: i + 2, message: err.message || "Insert failed" });
        }
    }

    await db
        .update(emailImportJobsTable)
        .set({
            importedRows: imported,
            skippedRows: skipped,
            errorsJson: JSON.stringify(errors.slice(0, 100)),
            status: imported === 0 && parsed.rows.length > 0 ? "failed" : "completed",
            completedAt: new Date(),
        })
        .where(eq(emailImportJobsTable.id, job.id));

    res.json({
        id: job.id,
        totalRows: parsed.rows.length,
        importedRows: imported,
        skippedRows: skipped,
        errors: errors.slice(0, 50),
        status: imported === 0 && parsed.rows.length > 0 ? "failed" : "completed",
    });
});

router.get("/contacts/import/history", async (_req, res) => {
    const jobs = await db
        .select()
        .from(emailImportJobsTable)
        .orderBy(desc(emailImportJobsTable.createdAt))
        .limit(50);
    res.json(jobs);
});

router.post("/contacts/sync/customers", async (_req, res) => {
    const result = await syncCustomersToContacts();
    res.json(result);
});

router.post("/contacts/sync/inquiries", async (_req, res) => {
    const result = await syncInquiriesToContacts();
    res.json(result);
});

router.post("/contacts/sync/square", async (_req, res) => {
    const result = await syncSquareCustomersToContacts();
    res.json(result);
});

// ── Segments ────────────────────────────────────────────────────────────────

router.get("/segments", async (_req, res) => {
    const segments = await db
        .select()
        .from(emailSegmentsTable)
        .orderBy(desc(emailSegmentsTable.updatedAt));
    res.json(segments);
});

router.get("/segments/:id", async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const [segment] = await db
        .select()
        .from(emailSegmentsTable)
        .where(eq(emailSegmentsTable.id, id))
        .limit(1);

    if (!segment) {
        res.status(404).json({ error: "Segment not found" });
        return;
    }

    const members = await db
        .select({ contact: emailContactsTable })
        .from(emailSegmentMembersTable)
        .innerJoin(
            emailContactsTable,
            eq(emailSegmentMembersTable.contactId, emailContactsTable.id),
        )
        .where(eq(emailSegmentMembersTable.segmentId, id))
        .orderBy(desc(emailSegmentMembersTable.addedAt));

    res.json({
        segment,
        members: members.map((m) => m.contact),
    });
});

router.get("/segments/rule-fields", async (_req, res) => {
    res.json(SEGMENT_RULE_FIELDS);
});

router.post("/segments/preview-rules", async (req, res) => {
    const rules = req.body?.rules as SegmentRules;
    if (!rules?.conditions) {
        res.status(400).json({ error: "rules with conditions required" });
        return;
    }
    const result = await previewSegmentRules(rules);
    res.json(result);
});

router.post("/segments", async (req, res) => {
    const { name, description, type, rules } = req.body ?? {};
    if (!name?.trim()) {
        res.status(400).json({ error: "Name is required" });
        return;
    }

    const segmentType = type === "dynamic" ? "dynamic" : "static";

    const [segment] = await db
        .insert(emailSegmentsTable)
        .values({
            name: name.trim(),
            description: description || "",
            type: segmentType,
            rules: segmentType === "dynamic" ? (rules ?? { combinator: "and", conditions: [] }) : null,
        })
        .returning();

    if (segmentType === "dynamic" && rules?.conditions?.length) {
        await evaluateAndPopulateDynamicSegment(segment.id);
        const [updated] = await db
            .select()
            .from(emailSegmentsTable)
            .where(eq(emailSegmentsTable.id, segment.id))
            .limit(1);
        res.status(201).json(updated ?? segment);
        return;
    }

    res.status(201).json(segment);
});

router.patch("/segments/:id", async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const { name, description, rules, type } = req.body ?? {};

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (name !== undefined && name?.trim()) updates.name = name.trim();
    if (description !== undefined) updates.description = description;
    if (type !== undefined) updates.type = type === "dynamic" ? "dynamic" : "static";
    if (rules !== undefined) updates.rules = rules;

    const [segment] = await db
        .update(emailSegmentsTable)
        .set(updates)
        .where(eq(emailSegmentsTable.id, id))
        .returning();

    if (!segment) {
        res.status(404).json({ error: "Segment not found" });
        return;
    }

    res.json(segment);
});

router.delete("/segments/:id", async (req, res) => {
    const id = parseInt(req.params.id, 10);
    await db.delete(emailSegmentsTable).where(eq(emailSegmentsTable.id, id));
    res.json({ success: true });
});

router.post("/segments/:id/members", async (req, res) => {
    const segmentId = parseInt(req.params.id, 10);
    const contactIds: number[] = req.body?.contactIds || [];

    if (!contactIds.length) {
        res.status(400).json({ error: "contactIds required" });
        return;
    }

    let added = 0;
    for (const contactId of contactIds) {
        try {
            await db.insert(emailSegmentMembersTable).values({ segmentId, contactId });
            added++;
        } catch {
            // duplicate membership
        }
    }

    const contactCount = await refreshSegmentContactCount(segmentId);
    res.json({ added, contactCount });
});

router.post("/segments/:id/evaluate", async (req, res) => {
    const segmentId = parseInt(req.params.id, 10);
    try {
        const result = await evaluateAndPopulateDynamicSegment(segmentId);
        res.json(result);
    } catch (err: any) {
        res.status(400).json({ error: err.message || "Evaluation failed" });
    }
});

router.delete("/segments/:id/members/:contactId", async (req, res) => {
    const segmentId = parseInt(req.params.id, 10);
    const contactId = parseInt(req.params.contactId, 10);

    await db
        .delete(emailSegmentMembersTable)
        .where(
            and(
                eq(emailSegmentMembersTable.segmentId, segmentId),
                eq(emailSegmentMembersTable.contactId, contactId),
            ),
        );

    const contactCount = await refreshSegmentContactCount(segmentId);
    res.json({ success: true, contactCount });
});

// ── Templates ───────────────────────────────────────────────────────────────

router.get("/templates", async (_req, res) => {
    const templates = await db
        .select()
        .from(emailTemplatesTable)
        .orderBy(desc(emailTemplatesTable.updatedAt));
    res.json(templates);
});

router.get("/templates/:id", async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const [template] = await db
        .select()
        .from(emailTemplatesTable)
        .where(eq(emailTemplatesTable.id, id))
        .limit(1);

    if (!template) {
        res.status(404).json({ error: "Template not found" });
        return;
    }

    res.json(template);
});

router.post("/templates", async (req, res) => {
    const { name, description, document } = req.body ?? {};
    if (!name?.trim()) {
        res.status(400).json({ error: "Name is required" });
        return;
    }

    const doc = (document as EmailDocument) || createBlankEmailDocument();
    const compiledHtml = compileEmailDocument(doc);

    const [template] = await db
        .insert(emailTemplatesTable)
        .values({
            name: name.trim(),
            description: description || "",
            document: doc,
            compiledHtml,
        })
        .returning();

    res.status(201).json(template);
});

router.patch("/templates/:id", async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const body = req.body ?? {};

    const [existing] = await db
        .select()
        .from(emailTemplatesTable)
        .where(eq(emailTemplatesTable.id, id))
        .limit(1);

    if (!existing) {
        res.status(404).json({ error: "Template not found" });
        return;
    }

    const doc = body.document ? (body.document as EmailDocument) : (existing.document as EmailDocument);
    const compiledHtml = compileEmailDocument(doc);

    const [template] = await db
        .update(emailTemplatesTable)
        .set({
            name: body.name?.trim() ?? existing.name,
            description: body.description ?? existing.description,
            document: doc,
            compiledHtml,
            status: body.status ?? existing.status,
            updatedAt: new Date(),
        })
        .where(eq(emailTemplatesTable.id, id))
        .returning();

    if (body.document) {
        await db.insert(emailTemplateRevisionsTable).values({
            templateId: id,
            document: doc,
            label: body.revisionLabel || `Saved ${new Date().toLocaleString()}`,
            createdBy: req.user?.userId || null,
        });
    }

    res.json(template);
});

router.get("/templates/:id/revisions", async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const revisions = await db
        .select()
        .from(emailTemplateRevisionsTable)
        .where(eq(emailTemplateRevisionsTable.templateId, id))
        .orderBy(desc(emailTemplateRevisionsTable.createdAt))
        .limit(50);
    res.json(revisions);
});

router.post("/templates/:id/revisions/:revId/restore", async (req, res) => {
    const templateId = parseInt(req.params.id, 10);
    const revId = parseInt(req.params.revId, 10);

    const [revision] = await db
        .select()
        .from(emailTemplateRevisionsTable)
        .where(
            and(
                eq(emailTemplateRevisionsTable.id, revId),
                eq(emailTemplateRevisionsTable.templateId, templateId),
            ),
        )
        .limit(1);

    if (!revision) {
        res.status(404).json({ error: "Revision not found" });
        return;
    }

    const doc = revision.document as EmailDocument;
    const compiledHtml = compileEmailDocument(doc);

    const [template] = await db
        .update(emailTemplatesTable)
        .set({ document: doc, compiledHtml, updatedAt: new Date() })
        .where(eq(emailTemplatesTable.id, templateId))
        .returning();

    res.json(template);
});

router.post("/templates/:id/duplicate", async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const [existing] = await db
        .select()
        .from(emailTemplatesTable)
        .where(eq(emailTemplatesTable.id, id))
        .limit(1);

    if (!existing) {
        res.status(404).json({ error: "Template not found" });
        return;
    }

    const [template] = await db
        .insert(emailTemplatesTable)
        .values({
            name: `${existing.name} (Copy)`,
            description: existing.description,
            document: existing.document,
            compiledHtml: existing.compiledHtml,
            status: "draft",
        })
        .returning();

    res.status(201).json(template);
});

router.delete("/templates/:id", async (req, res) => {
    const id = parseInt(req.params.id, 10);
    await db.delete(emailTemplatesTable).where(eq(emailTemplatesTable.id, id));
    res.json({ success: true });
});

router.post("/templates/:id/preview", async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const [template] = await db
        .select()
        .from(emailTemplatesTable)
        .where(eq(emailTemplatesTable.id, id))
        .limit(1);

    if (!template) {
        res.status(404).json({ error: "Template not found" });
        return;
    }

    const doc = (req.body?.document as EmailDocument) || (template.document as EmailDocument);
    const html = compileEmailDocument(doc);
    res.json({ html });
});

router.post("/templates/preview", async (req, res) => {
    const doc = req.body?.document as EmailDocument;
    if (!doc) {
        res.status(400).json({ error: "document required" });
        return;
    }
    res.json({ html: compileEmailDocument(doc) });
});

// ── Campaigns ───────────────────────────────────────────────────────────────

router.get("/campaigns", async (_req, res) => {
    const campaigns = await db
        .select()
        .from(emailCampaignsTable)
        .orderBy(desc(emailCampaignsTable.updatedAt));
    res.json(campaigns);
});

router.get("/campaigns/:id", async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const [campaign] = await db
        .select()
        .from(emailCampaignsTable)
        .where(eq(emailCampaignsTable.id, id))
        .limit(1);

    if (!campaign) {
        res.status(404).json({ error: "Campaign not found" });
        return;
    }

    const events = await db
        .select()
        .from(emailCampaignEventsTable)
        .where(eq(emailCampaignEventsTable.campaignId, id))
        .orderBy(desc(emailCampaignEventsTable.occurredAt))
        .limit(100);

    res.json({ campaign, events });
});

router.post("/campaigns", async (req, res) => {
    const body = req.body ?? {};
    if (!body.name?.trim()) {
        res.status(400).json({ error: "Name is required" });
        return;
    }

    const [campaign] = await db
        .insert(emailCampaignsTable)
        .values({
            name: body.name.trim(),
            subject: body.subject || "",
            previewText: body.previewText || "",
            templateId: body.templateId || null,
            segmentId: body.segmentId || null,
            topicId: body.topicId || null,
            fromEmail: body.fromEmail || MARKETING_FROM_EMAIL,
            replyTo: body.replyTo || "",
            createdBy: req.user?.userId || null,
        })
        .returning();

    res.status(201).json(campaign);
});

router.patch("/campaigns/:id", async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const body = req.body ?? {};

    const [existing] = await db
        .select()
        .from(emailCampaignsTable)
        .where(eq(emailCampaignsTable.id, id))
        .limit(1);

    if (!existing) {
        res.status(404).json({ error: "Campaign not found" });
        return;
    }

    if (existing.status === "sent") {
        res.status(400).json({ error: "Cannot edit a sent campaign" });
        return;
    }

    const [campaign] = await db
        .update(emailCampaignsTable)
        .set({
            name: body.name?.trim() ?? existing.name,
            subject: body.subject ?? existing.subject,
            previewText: body.previewText ?? existing.previewText,
            templateId: body.templateId ?? existing.templateId,
            segmentId: body.segmentId ?? existing.segmentId,
            topicId: body.topicId !== undefined ? body.topicId : existing.topicId,
            fromEmail: body.fromEmail ?? existing.fromEmail,
            replyTo: body.replyTo ?? existing.replyTo,
            scheduledAt: body.scheduledAt !== undefined
                ? (body.scheduledAt ? new Date(body.scheduledAt) : null)
                : existing.scheduledAt,
            updatedAt: new Date(),
        })
        .where(eq(emailCampaignsTable.id, id))
        .returning();

    res.json(campaign);
});

router.delete("/campaigns/:id", async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const [existing] = await db
        .select()
        .from(emailCampaignsTable)
        .where(eq(emailCampaignsTable.id, id))
        .limit(1);

    if (existing?.status === "sent") {
        res.status(400).json({ error: "Cannot delete a sent campaign" });
        return;
    }

    await db.delete(emailCampaignsTable).where(eq(emailCampaignsTable.id, id));
    res.json({ success: true });
});

router.post("/campaigns/:id/test", async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const to = (req.body?.to || "").trim();

    if (!to) {
        res.status(400).json({ error: "Test email address required" });
        return;
    }

    const [campaign] = await db
        .select()
        .from(emailCampaignsTable)
        .where(eq(emailCampaignsTable.id, id))
        .limit(1);

    if (!campaign?.templateId) {
        res.status(400).json({ error: "Campaign needs a template" });
        return;
    }

    const [template] = await db
        .select()
        .from(emailTemplatesTable)
        .where(eq(emailTemplatesTable.id, campaign.templateId))
        .limit(1);

    if (!template) {
        res.status(404).json({ error: "Template not found" });
        return;
    }

    const html =
        template.compiledHtml ||
        compileEmailDocument(template.document as EmailDocument);

    const result = await sendMarketingTestEmail({
        to,
        subject: `[TEST] ${campaign.subject}`,
        html,
        from: campaign.fromEmail || MARKETING_FROM_EMAIL,
        replyTo: campaign.replyTo || undefined,
    });

    if (result.error) {
        res.status(400).json({ error: result.error });
        return;
    }

    res.json({ success: true, resendId: result.resendId });
});

router.post("/campaigns/:id/send", async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const result = await sendMarketingCampaign(id);

    if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
    }

    res.json({ success: true, broadcastId: result.broadcastId });
});

router.post("/campaigns/:id/schedule", async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const scheduledAt = req.body?.scheduledAt;

    if (!scheduledAt) {
        res.status(400).json({ error: "scheduledAt is required" });
        return;
    }

    const date = new Date(scheduledAt);
    if (date <= new Date()) {
        res.status(400).json({ error: "Scheduled time must be in the future" });
        return;
    }

    const result = await scheduleMarketingCampaign(id, date);
    if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
    }

    res.json({ success: true, broadcastId: result.broadcastId });
});

router.post("/campaigns/:id/cancel-schedule", async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const result = await cancelScheduledCampaign(id);
    if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
    }
    res.json({ success: true });
});

router.get("/campaigns/:id/recipients", async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const recipients = await getCampaignRecipientStats(id);
    res.json(recipients);
});

router.get("/campaigns/:id/stats", async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const [campaign] = await db
        .select()
        .from(emailCampaignsTable)
        .where(eq(emailCampaignsTable.id, id))
        .limit(1);

    if (!campaign) {
        res.status(404).json({ error: "Campaign not found" });
        return;
    }

    const stats = campaign.stats as Record<string, number>;
    const sent = stats?.sent ?? 0;
    const opened = stats?.opened ?? 0;
    const clicked = stats?.clicked ?? 0;
    const delivered = stats?.delivered ?? 0;

    res.json({
        ...stats,
        openRate: sent > 0 ? Math.round((opened / sent) * 1000) / 10 : 0,
        clickRate: sent > 0 ? Math.round((clicked / sent) * 1000) / 10 : 0,
        deliveryRate: sent > 0 ? Math.round((delivered / sent) * 1000) / 10 : 0,
    });
});

// ── Topics ──────────────────────────────────────────────────────────────────

router.get("/topics", async (_req, res) => {
    const topics = await db
        .select()
        .from(emailTopicsTable)
        .orderBy(desc(emailTopicsTable.updatedAt));
    res.json(topics);
});

router.post("/topics", async (req, res) => {
    const { name, description, defaultOptIn } = req.body ?? {};
    if (!name?.trim()) {
        res.status(400).json({ error: "Name is required" });
        return;
    }

    const resendTopicId = await createResendTopic(name.trim(), description);

    const [topic] = await db
        .insert(emailTopicsTable)
        .values({
            name: name.trim(),
            description: description || "",
            resendTopicId,
            defaultOptIn: defaultOptIn !== false,
        })
        .returning();

    res.status(201).json(topic);
});

router.post("/topics/sync-resend", async (_req, res) => {
    const remote = await listResendTopics();
    let synced = 0;
    for (const r of remote) {
        const [existing] = await db
            .select()
            .from(emailTopicsTable)
            .where(eq(emailTopicsTable.resendTopicId, r.id))
            .limit(1);
        if (!existing) {
            await db.insert(emailTopicsTable).values({
                name: r.name,
                resendTopicId: r.id,
            });
            synced++;
        }
    }
    res.json({ synced, total: remote.length });
});

router.delete("/topics/:id", async (req, res) => {
    const id = parseInt(req.params.id, 10);
    await db.delete(emailTopicsTable).where(eq(emailTopicsTable.id, id));
    res.json({ success: true });
});

router.get("/dashboard", async (_req, res) => {
    const [contactCount] = await db.select({ count: count() }).from(emailContactsTable);
    const [segmentCount] = await db.select({ count: count() }).from(emailSegmentsTable);
    const [templateCount] = await db.select({ count: count() }).from(emailTemplatesTable);
    const [campaignCount] = await db.select({ count: count() }).from(emailCampaignsTable);
    const [subscribedCount] = await db
        .select({ count: count() })
        .from(emailContactsTable)
        .where(eq(emailContactsTable.marketingStatus, "subscribed"));

    const suppressionRows = await db
        .select({
            status: emailContactsTable.marketingStatus,
            count: count(),
        })
        .from(emailContactsTable)
        .where(
            sql`${emailContactsTable.marketingStatus} IN ('unsubscribed', 'bounced', 'complained')`,
        )
        .groupBy(emailContactsTable.marketingStatus);

    const suppressionCounts = {
        unsubscribed: 0,
        bounced: 0,
        complained: 0,
    };
    for (const row of suppressionRows) {
        if (row.status in suppressionCounts) {
            suppressionCounts[row.status as keyof typeof suppressionCounts] = row.count;
        }
    }

    const recentCampaigns = await db
        .select()
        .from(emailCampaignsTable)
        .orderBy(desc(emailCampaignsTable.updatedAt))
        .limit(5);

    res.json({
        resendConfigured: isResendMarketingConfigured(),
        marketingFromEmail: MARKETING_FROM_EMAIL,
        counts: {
            contacts: contactCount?.count ?? 0,
            subscribed: subscribedCount?.count ?? 0,
            segments: segmentCount?.count ?? 0,
            templates: templateCount?.count ?? 0,
            campaigns: campaignCount?.count ?? 0,
        },
        suppressionCounts,
        recentCampaigns,
    });
});

router.get("/status", async (_req, res) => {
    const [contactCount] = await db.select({ count: count() }).from(emailContactsTable);
    const [segmentCount] = await db.select({ count: count() }).from(emailSegmentsTable);
    const [templateCount] = await db.select({ count: count() }).from(emailTemplatesTable);
    const [campaignCount] = await db.select({ count: count() }).from(emailCampaignsTable);

    res.json({
        resendConfigured: isResendMarketingConfigured(),
        marketingFromEmail: MARKETING_FROM_EMAIL,
        counts: {
            contacts: contactCount?.count ?? 0,
            segments: segmentCount?.count ?? 0,
            templates: templateCount?.count ?? 0,
            campaigns: campaignCount?.count ?? 0,
        },
    });
});

router.get("/campaigns/:id/precheck", async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const [campaign] = await db
        .select()
        .from(emailCampaignsTable)
        .where(eq(emailCampaignsTable.id, id))
        .limit(1);

    if (!campaign) {
        res.status(404).json({ error: "Campaign not found" });
        return;
    }

    let templateStatus: string | null = null;
    let templateName: string | null = null;
    if (campaign.templateId) {
        const [template] = await db
            .select({ status: emailTemplatesTable.status, name: emailTemplatesTable.name })
            .from(emailTemplatesTable)
            .where(eq(emailTemplatesTable.id, campaign.templateId))
            .limit(1);
        templateStatus = template?.status ?? null;
        templateName = template?.name ?? null;
    }

    let segmentName: string | null = null;
    let audienceTotal = 0;
    let audienceSubscribed = 0;
    if (campaign.segmentId) {
        const [segment] = await db
            .select({ name: emailSegmentsTable.name, contactCount: emailSegmentsTable.contactCount })
            .from(emailSegmentsTable)
            .where(eq(emailSegmentsTable.id, campaign.segmentId))
            .limit(1);
        segmentName = segment?.name ?? null;
        audienceTotal = segment?.contactCount ?? 0;

        const contactIds = await getSegmentContactIds(campaign.segmentId);
        if (contactIds.length) {
            const [subscribed] = await db
                .select({ count: count() })
                .from(emailContactsTable)
                .where(
                    and(
                        inArray(emailContactsTable.id, contactIds),
                        eq(emailContactsTable.marketingStatus, "subscribed"),
                    ),
                );
            audienceSubscribed = subscribed?.count ?? 0;
        }
    }

    const checks = [
        { id: "resend", label: "Resend API configured", ok: isResendMarketingConfigured(), required: true },
        { id: "subject", label: "Subject line set", ok: !!campaign.subject?.trim(), required: true },
        { id: "template", label: "Template selected", ok: !!campaign.templateId, required: true },
        { id: "templatePublished", label: "Template published (recommended)", ok: templateStatus === "published", required: false },
        { id: "segment", label: "Segment selected", ok: !!campaign.segmentId, required: true },
        { id: "audience", label: "Audience has subscribed contacts", ok: audienceSubscribed > 0, required: true },
        { id: "from", label: "From email set", ok: !!(campaign.fromEmail || MARKETING_FROM_EMAIL), required: true },
    ];

    res.json({
        ready: checks.filter((c) => c.required).every((c) => c.ok),
        checks,
        audience: {
            total: audienceTotal,
            subscribed: audienceSubscribed,
            segmentName,
        },
        template: { name: templateName, status: templateStatus },
    });
});

router.get("/campaigns/:id/links", async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const links = await getCampaignLinkStats(id);
    res.json({ links });
});

export default router;
