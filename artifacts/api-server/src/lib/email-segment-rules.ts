import { db } from "@workspace/db";
import {
    emailContactsTable,
    emailSegmentMembersTable,
    emailSegmentsTable,
    customersTable,
    ordersTable,
    inquiriesTable,
    type EmailContact,
} from "@workspace/db/schema";
import { eq, gte } from "drizzle-orm";

export type SegmentConditionOp = "eq" | "neq" | "contains" | "gte" | "lte" | "within_days";

export interface SegmentCondition {
    field: string;
    op: SegmentConditionOp;
    value: string | number | boolean;
}

export interface SegmentRules {
    combinator: "and" | "or";
    conditions: SegmentCondition[];
}

export const SEGMENT_RULE_FIELDS = [
    { field: "marketing_status", label: "Marketing status", ops: ["eq"] as SegmentConditionOp[], valueType: "select", options: ["subscribed", "unsubscribed", "bounced", "complained"] },
    { field: "source", label: "Contact source", ops: ["eq"] as SegmentConditionOp[], valueType: "select", options: ["manual", "import", "customer_sync", "inquiry_sync"] },
    { field: "city", label: "City", ops: ["eq", "contains"] as SegmentConditionOp[], valueType: "text" },
    { field: "state", label: "State", ops: ["eq", "contains"] as SegmentConditionOp[], valueType: "text" },
    { field: "country", label: "Country", ops: ["eq"] as SegmentConditionOp[], valueType: "text" },
    { field: "ordered_within_days", label: "Ordered within (days)", ops: ["within_days"] as SegmentConditionOp[], valueType: "number" },
    { field: "orders_count_gte", label: "Minimum order count", ops: ["gte"] as SegmentConditionOp[], valueType: "number" },
    { field: "inquiry_type", label: "Inquiry type", ops: ["eq"] as SegmentConditionOp[], valueType: "select", options: ["contact", "wholesale", "catering", "fundraising", "bakery", "quote", "buyers_guide", "product_inquiry"] },
    { field: "created_within_days", label: "Added within (days)", ops: ["within_days"] as SegmentConditionOp[], valueType: "number" },
] as const;

function matchesCondition(contact: EmailContact, condition: SegmentCondition, context: {
    orderEmails: Set<string>;
    customerOrderCounts: Map<string, number>;
    inquiryTypes: Map<string, string>;
}): boolean {
    const { field, op, value } = condition;

    if (field === "marketing_status") {
        return op === "eq" ? contact.marketingStatus === value : contact.marketingStatus !== value;
    }
    if (field === "source") {
        return op === "eq" ? contact.source === value : contact.source !== value;
    }
    if (field === "city") {
        const city = contact.city.toLowerCase();
        const v = String(value).toLowerCase();
        if (op === "eq") return city === v;
        if (op === "contains") return city.includes(v);
    }
    if (field === "state") {
        const state = contact.state.toLowerCase();
        const v = String(value).toLowerCase();
        if (op === "eq") return state === v;
        if (op === "contains") return state.includes(v);
    }
    if (field === "country") {
        return op === "eq" ? contact.country === value : contact.country !== value;
    }
    if (field === "ordered_within_days" && op === "within_days") {
        return context.orderEmails.has(contact.email.toLowerCase());
    }
    if (field === "orders_count_gte" && op === "gte") {
        const count = context.customerOrderCounts.get(contact.email.toLowerCase()) ?? 0;
        return count >= Number(value);
    }
    if (field === "inquiry_type" && op === "eq") {
        return context.inquiryTypes.get(contact.email.toLowerCase()) === value;
    }
    if (field === "created_within_days" && op === "within_days") {
        const days = Number(value);
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        return contact.createdAt >= cutoff;
    }

    return false;
}

async function buildRuleContext(conditions: SegmentCondition[]): Promise<{
    orderEmails: Set<string>;
    customerOrderCounts: Map<string, number>;
    inquiryTypes: Map<string, string>;
}> {
    const orderEmails = new Set<string>();
    const customerOrderCounts = new Map<string, number>();
    const inquiryTypes = new Map<string, string>();

    const needsOrders = conditions.some((c) =>
        c.field === "ordered_within_days" || c.field === "orders_count_gte",
    );
    const needsInquiries = conditions.some((c) => c.field === "inquiry_type");

    if (needsOrders) {
        const orderCondition = conditions.find((c) => c.field === "ordered_within_days");
        const days = orderCondition ? Number(orderCondition.value) : 365;
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);

        const recentOrders = await db
            .select({ email: ordersTable.customerEmail })
            .from(ordersTable)
            .where(gte(ordersTable.createdAt, cutoff));

        for (const row of recentOrders) {
            if (row.email) orderEmails.add(row.email.toLowerCase());
        }

        const customers = await db
            .select({ email: customersTable.email, ordersCount: customersTable.ordersCount })
            .from(customersTable);

        for (const c of customers) {
            if (c.email) customerOrderCounts.set(c.email.toLowerCase(), c.ordersCount);
        }
    }

    if (needsInquiries) {
        const inqs = await db
            .select({ email: inquiriesTable.email, type: inquiriesTable.type })
            .from(inquiriesTable);

        for (const inq of inqs) {
            if (inq.email) inquiryTypes.set(inq.email.toLowerCase(), inq.type);
        }
    }

    return { orderEmails, customerOrderCounts, inquiryTypes };
}

export async function evaluateSegmentRules(rules: SegmentRules): Promise<EmailContact[]> {
    const allContacts = await db.select().from(emailContactsTable);
    const context = await buildRuleContext(rules.conditions);

    return allContacts.filter((contact) => {
        const results = rules.conditions.map((c) => matchesCondition(contact, c, context));
        if (rules.combinator === "or") return results.some(Boolean);
        return results.every(Boolean);
    });
}

export async function evaluateAndPopulateDynamicSegment(segmentId: number): Promise<{
    matched: number;
    contactCount: number;
}> {
    const [segment] = await db
        .select()
        .from(emailSegmentsTable)
        .where(eq(emailSegmentsTable.id, segmentId))
        .limit(1);

    if (!segment || segment.type !== "dynamic") {
        throw new Error("Segment is not dynamic");
    }

    const rules = segment.rules as SegmentRules | null;
    if (!rules?.conditions?.length) {
        await db
            .delete(emailSegmentMembersTable)
            .where(eq(emailSegmentMembersTable.segmentId, segmentId));
        await db
            .update(emailSegmentsTable)
            .set({ contactCount: 0, updatedAt: new Date() })
            .where(eq(emailSegmentsTable.id, segmentId));
        return { matched: 0, contactCount: 0 };
    }

    const matched = await evaluateSegmentRules(rules);

    await db
        .delete(emailSegmentMembersTable)
        .where(eq(emailSegmentMembersTable.segmentId, segmentId));

    if (matched.length > 0) {
        await db.insert(emailSegmentMembersTable).values(
            matched.map((c) => ({ segmentId, contactId: c.id })),
        );
    }

    await db
        .update(emailSegmentsTable)
        .set({ contactCount: matched.length, updatedAt: new Date() })
        .where(eq(emailSegmentsTable.id, segmentId));

    return { matched: matched.length, contactCount: matched.length };
}

export async function previewSegmentRules(rules: SegmentRules): Promise<{
    count: number;
    preview: Pick<EmailContact, "id" | "email" | "firstName" | "lastName">[];
}> {
    const matched = await evaluateSegmentRules(rules);
    return {
        count: matched.length,
        preview: matched.slice(0, 20).map((c) => ({
            id: c.id,
            email: c.email,
            firstName: c.firstName,
            lastName: c.lastName,
        })),
    };
}

export async function getSegmentContactIds(segmentId: number): Promise<number[]> {
    const [segment] = await db
        .select()
        .from(emailSegmentsTable)
        .where(eq(emailSegmentsTable.id, segmentId))
        .limit(1);

    if (!segment) return [];

    if (segment.type === "dynamic") {
        await evaluateAndPopulateDynamicSegment(segmentId);
    }

    const members = await db
        .select({ contactId: emailSegmentMembersTable.contactId })
        .from(emailSegmentMembersTable)
        .where(eq(emailSegmentMembersTable.segmentId, segmentId));

    return members.map((m) => m.contactId);
}
