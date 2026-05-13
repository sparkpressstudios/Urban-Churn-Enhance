import OpenAI from "openai";
import { db } from "@workspace/db";
import { flavoursTable, wholesaleProductsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const openai = process.env.OPENAI_API_KEY
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    : null;

export interface ParsedOrderItem {
    flavourName: string;
    sizeName: string;
    quantity: number;
    confidence: number;
    matchedProductId?: number;
    matchedFlavourId?: number;
}

export interface ParsedOrder {
    items: ParsedOrderItem[];
    requestedDeliveryDate: string | null;
    specialInstructions: string;
    overallConfidence: number;
    ambiguities: string[];
}

async function buildProductCatalog(): Promise<string> {
    const products = await db
        .select({
            id: wholesaleProductsTable.id,
            name: wholesaleProductsTable.name,
            unitDescription: wholesaleProductsTable.unitDescription,
            priceCents: wholesaleProductsTable.priceCents,
            flavourName: flavoursTable.name,
            flavourId: wholesaleProductsTable.flavourId,
        })
        .from(wholesaleProductsTable)
        .innerJoin(
            flavoursTable,
            eq(wholesaleProductsTable.flavourId, flavoursTable.id),
        )
        .where(eq(wholesaleProductsTable.available, true));

    if (products.length === 0) {
        // Fall back to just flavour names
        const flavours = await db
            .select({ id: flavoursTable.id, name: flavoursTable.name })
            .from(flavoursTable)
            .where(eq(flavoursTable.available, true));

        return (
            "No wholesale products configured yet. Available flavours:\n" +
            flavours.map((f) => `- ${f.name}`).join("\n")
        );
    }

    return products
        .map(
            (p) =>
                `- ID:${p.id} | "${p.flavourName}" — ${p.name}${p.unitDescription ? ` (${p.unitDescription})` : ""} — $${(p.priceCents / 100).toFixed(2)}`,
        )
        .join("\n");
}

const SYSTEM_PROMPT = `You are an order parser for Urban Churn, a premium ice cream company in Pennsylvania.
Your job is to parse wholesale customer emails into structured orders.

Parse the customer's email and extract:
1. Line items: what flavours, sizes/packaging, and quantities they want
2. Requested delivery or pickup date (if mentioned)
3. Any special instructions or notes

Rules:
- Match flavour names fuzzily (e.g. "vanilla" matches "Classic Vanilla", "choc" matches "Chocolate")
- If a size/packaging isn't specified, note the ambiguity
- If you can't determine a quantity, default to 1 and flag as ambiguous
- For dates, interpret relative dates like "next Tuesday" or "this Friday" relative to the current date provided
- Strip email signatures, reply chains (text after "On ... wrote:"), and disclaimers
- If the email seems unrelated to ordering (e.g. a question, complaint), set overallConfidence to 0.0

Return valid JSON matching this schema exactly:
{
  "items": [
    {
      "flavourName": "exact flavour name from catalog or best guess",
      "sizeName": "size/packaging name from catalog or what they wrote",
      "quantity": 1,
      "confidence": 0.95
    }
  ],
  "requestedDeliveryDate": "YYYY-MM-DD or null",
  "specialInstructions": "any special notes from the customer",
  "overallConfidence": 0.85,
  "ambiguities": ["list of unclear items or assumptions made"]
}`;

export async function parseWholesaleEmail(
    emailBody: string,
    emailSubject: string,
    attachmentText?: string,
): Promise<ParsedOrder> {
    if (!openai) {
        console.warn("[ORDER-PARSER] No OPENAI_API_KEY, returning empty parse");
        return {
            items: [],
            requestedDeliveryDate: null,
            specialInstructions: "",
            overallConfidence: 0,
            ambiguities: ["OpenAI API key not configured"],
        };
    }

    const catalog = await buildProductCatalog();
    const today = new Date().toISOString().split("T")[0];

    const userContent = [
        `Current date: ${today}`,
        `\nWholesale Product Catalog:\n${catalog}`,
        `\nEmail Subject: ${emailSubject}`,
        `\nEmail Body:\n${emailBody}`,
    ];

    if (attachmentText) {
        userContent.push(`\nAttachment Content:\n${attachmentText}`);
    }

    const response = await openai.chat.completions.create({
        model: "gpt-4o",
        response_format: { type: "json_object" },
        messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userContent.join("\n") },
        ],
        temperature: 0.1,
        max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
        return {
            items: [],
            requestedDeliveryDate: null,
            specialInstructions: "",
            overallConfidence: 0,
            ambiguities: ["AI returned empty response"],
        };
    }

    let parsed: ParsedOrder;
    try {
        parsed = JSON.parse(content);
    } catch {
        return {
            items: [],
            requestedDeliveryDate: null,
            specialInstructions: "",
            overallConfidence: 0,
            ambiguities: ["AI returned invalid JSON"],
        };
    }

    // Validate and enrich parsed items against the actual catalog
    const products = await db
        .select({
            id: wholesaleProductsTable.id,
            name: wholesaleProductsTable.name,
            flavourId: wholesaleProductsTable.flavourId,
            flavourName: flavoursTable.name,
            priceCents: wholesaleProductsTable.priceCents,
        })
        .from(wholesaleProductsTable)
        .innerJoin(
            flavoursTable,
            eq(wholesaleProductsTable.flavourId, flavoursTable.id),
        )
        .where(eq(wholesaleProductsTable.available, true));

    for (const item of parsed.items) {
        // Try to match against catalog
        const matchedProduct = products.find((p) => {
            const flavourMatch =
                p.flavourName.toLowerCase() ===
                item.flavourName.toLowerCase();
            const sizeMatch =
                p.name.toLowerCase() === item.sizeName.toLowerCase();
            return flavourMatch && sizeMatch;
        });

        if (matchedProduct) {
            item.matchedProductId = matchedProduct.id;
            item.matchedFlavourId = matchedProduct.flavourId;
        } else {
            // Try fuzzy flavour match only
            const flavourMatch = products.find(
                (p) =>
                    p.flavourName
                        .toLowerCase()
                        .includes(item.flavourName.toLowerCase()) ||
                    item.flavourName
                        .toLowerCase()
                        .includes(p.flavourName.toLowerCase()),
            );
            if (flavourMatch) {
                item.matchedFlavourId = flavourMatch.flavourId;
            }
        }

        // Ensure valid quantity
        if (!item.quantity || item.quantity < 1) {
            item.quantity = 1;
        }
    }

    return parsed;
}
