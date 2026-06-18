import { parse } from "csv-parse/sync";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const FIELD_ALIASES: Record<string, string[]> = {
    email: ["email", "e-mail", "email address", "email_address"],
    firstName: ["first name", "firstname", "first_name", "fname", "given name"],
    lastName: ["last name", "lastname", "last_name", "lname", "surname", "family name"],
    phone: ["phone", "telephone", "mobile", "phone number", "phone_number"],
    address: ["address", "street", "street address", "address1", "address line 1"],
    city: ["city", "town"],
    state: ["state", "province", "region"],
    zip: ["zip", "zipcode", "zip code", "postal", "postal code", "postcode"],
    country: ["country", "nation"],
};

function normalizeHeader(header: string): string {
    return header.trim().toLowerCase().replace(/[_-]+/g, " ");
}

function mapHeaders(headers: string[]): Record<string, string> {
    const mapping: Record<string, string> = {};
    const normalized = headers.map(normalizeHeader);

    for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
        for (const alias of aliases) {
            const idx = normalized.indexOf(alias);
            if (idx >= 0) {
                mapping[field] = headers[idx];
                break;
            }
        }
    }

    return mapping;
}

export interface ParsedContactRow {
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    country: string;
}

export function parseContactsCsv(csvContent: string): {
    headers: string[];
    mapping: Record<string, string>;
    rows: ParsedContactRow[];
    errors: { row: number; message: string }[];
} {
    const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
    }) as Record<string, string>[];

    const headers = records.length > 0 ? Object.keys(records[0]) : [];
    const mapping = mapHeaders(headers);
    const errors: { row: number; message: string }[] = [];
    const rows: ParsedContactRow[] = [];

    if (!mapping.email) {
        errors.push({ row: 0, message: 'CSV must include an "email" column' });
        return { headers, mapping, rows, errors };
    }

    records.forEach((record, index) => {
        const rowNum = index + 2;
        const email = (record[mapping.email] || "").trim().toLowerCase();

        if (!email) {
            errors.push({ row: rowNum, message: "Missing email" });
            return;
        }
        if (!EMAIL_RE.test(email)) {
            errors.push({ row: rowNum, message: `Invalid email: ${email}` });
            return;
        }

        rows.push({
            email,
            firstName: mapping.firstName ? (record[mapping.firstName] || "").trim() : "",
            lastName: mapping.lastName ? (record[mapping.lastName] || "").trim() : "",
            phone: mapping.phone ? (record[mapping.phone] || "").trim() : "",
            address: mapping.address ? (record[mapping.address] || "").trim() : "",
            city: mapping.city ? (record[mapping.city] || "").trim() : "",
            state: mapping.state ? (record[mapping.state] || "").trim() : "",
            zip: mapping.zip ? (record[mapping.zip] || "").trim() : "",
            country: mapping.country ? (record[mapping.country] || "").trim() || "US" : "US",
        });
    });

    return { headers, mapping, rows, errors };
}
