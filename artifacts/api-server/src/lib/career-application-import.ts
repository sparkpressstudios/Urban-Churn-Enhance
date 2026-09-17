import { Resend } from "resend";
import { db } from "@workspace/db";
import { inquiriesTable, sentEmailsLogTable } from "@workspace/db/schema";
import { and, eq, gte, like, sql } from "drizzle-orm";

const CAREER_SUBJECT_PREFIX = "Career Application:";
const IMPORT_WINDOW_DAYS = 30;

function importCutoffDate() {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - IMPORT_WINDOW_DAYS);
    return cutoff;
}

export interface ParsedCareerApplication {
    name: string;
    email: string;
    phone: string;
    location: string;
    about: string;
    why: string;
}

export function parseCareerSubject(subject: string): { location: string; name: string } | null {
    if (!subject.startsWith(CAREER_SUBJECT_PREFIX)) return null;

    const remainder = subject.slice(CAREER_SUBJECT_PREFIX.length).trim();
    const separator = " — ";
    const idx = remainder.lastIndexOf(separator);
    if (idx === -1) return null;

    return {
        location: remainder.slice(0, idx).trim(),
        name: remainder.slice(idx + separator.length).trim(),
    };
}

export function parseCareerEmailHtml(html: string): Partial<ParsedCareerApplication> {
    const readTableField = (label: string): string => {
        const pattern = new RegExp(
            `<tr><td[^>]*>\\s*${label}\\s*</td><td[^>]*>(?:<a href="mailto:([^"]+)">[^<]*</a>|([^<]*))</td></tr>`,
            "i",
        );
        const match = html.match(pattern);
        if (!match) return "";
        return (match[1] || match[2] || "").trim();
    };

    const readSection = (heading: string): string => {
        const pattern = new RegExp(
            `<strong>${heading}:</strong></p><p[^>]*>([\\s\\S]*?)</p></div>`,
            "i",
        );
        const match = html.match(pattern);
        return match?.[1]?.trim() || "";
    };

    return {
        name: readTableField("Name"),
        email: readTableField("Email"),
        phone: readTableField("Phone"),
        location: readTableField("Location"),
        about: readSection("About Themselves"),
        why: readSection("Why They Want to Join"),
    };
}

async function fetchCareerEmailHtml(resendId: string): Promise<string | null> {
    if (!process.env.RESEND_API_KEY) return null;

    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data, error } = await resend.emails.get(resendId);
    if (error || !data) {
        console.error(`[CAREER IMPORT] Failed to fetch Resend email ${resendId}:`, error);
        return null;
    }

    return data.html || null;
}

export async function previewCareerApplicationImport() {
    const emailLogs = await db
        .select({
            id: sentEmailsLogTable.id,
        })
        .from(sentEmailsLogTable)
        .where(
            and(
                like(sentEmailsLogTable.subject, `${CAREER_SUBJECT_PREFIX}%`),
                gte(sentEmailsLogTable.createdAt, importCutoffDate()),
            ),
        );

    const importedRows = await db
        .select({
            importedFromEmailLogId: sql<string>`${inquiriesTable.formData} ->> 'importedFromEmailLogId'`,
        })
        .from(inquiriesTable)
        .where(
            and(
                eq(inquiriesTable.type, "career"),
                sql`${inquiriesTable.formData} ->> 'importedFromEmailLogId' IS NOT NULL`,
            ),
        );

    const importedIds = new Set(importedRows.map((row) => row.importedFromEmailLogId));
    const pending = emailLogs.filter((log) => !importedIds.has(String(log.id)));

    return {
        totalEmailLogs: emailLogs.length,
        alreadyImported: importedIds.size,
        pendingImport: pending.length,
        canFetchFullDetails: Boolean(process.env.RESEND_API_KEY),
    };
}

export async function importCareerApplicationsFromEmailLog() {
    const cutoff = importCutoffDate();
    const emailLogs = await db
        .select()
        .from(sentEmailsLogTable)
        .where(
            and(
                like(sentEmailsLogTable.subject, `${CAREER_SUBJECT_PREFIX}%`),
                gte(sentEmailsLogTable.createdAt, cutoff),
            ),
        )
        .orderBy(sentEmailsLogTable.createdAt);

    const importedRows = await db
        .select({
            importedFromEmailLogId: sql<string>`${inquiriesTable.formData} ->> 'importedFromEmailLogId'`,
        })
        .from(inquiriesTable)
        .where(
            and(
                eq(inquiriesTable.type, "career"),
                sql`${inquiriesTable.formData} ->> 'importedFromEmailLogId' IS NOT NULL`,
            ),
        );

    const importedIds = new Set(importedRows.map((row) => row.importedFromEmailLogId));

    let imported = 0;
    let skipped = 0;
    let partial = 0;

    for (const log of emailLogs) {
        if (importedIds.has(String(log.id))) {
            skipped++;
            continue;
        }

        const subjectData = parseCareerSubject(log.subject);
        if (!subjectData) {
            skipped++;
            continue;
        }

        let parsed: Partial<ParsedCareerApplication> = {};
        if (log.resendId) {
            const html = await fetchCareerEmailHtml(log.resendId);
            if (html) parsed = parseCareerEmailHtml(html);
        }

        const name = parsed.name || subjectData.name;
        const location = parsed.location || subjectData.location;
        const email = parsed.email || `imported+${log.id}@legacy.urbanchurn.local`;
        const phone = parsed.phone || "";
        const about = parsed.about || "";
        const why = parsed.why || "";
        const hasFullDetails = Boolean(parsed.email);

        if (!hasFullDetails) partial++;

        await db.insert(inquiriesTable).values({
            type: "career",
            status: "new",
            name,
            email,
            phone: phone || null,
            message: why || about || "",
            formData: {
                name,
                email: parsed.email || "",
                phone,
                location,
                about,
                why,
                importedFromEmailLogId: String(log.id),
                importSource: "email_log",
                importedAt: new Date().toISOString(),
                partialImport: !hasFullDetails,
            },
            createdAt: log.createdAt,
            updatedAt: log.createdAt,
        });

        imported++;
    }

    return { imported, skipped, partial, totalEmailLogs: emailLogs.length };
}
