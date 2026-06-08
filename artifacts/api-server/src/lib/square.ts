import { SquareClient, SquareEnvironment, SquareError } from "square";
import * as crypto from "node:crypto";
import { db } from "@workspace/db";
import { settingsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

// In-memory cache for Square client (avoids DB lookup on every call)
let cachedClient: SquareClient | null = null;
let cachedEnv: string | null = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 60_000; // 1 minute

async function getSettingValue(key: string): Promise<string | null> {
    const [row] = await db
        .select({ value: settingsTable.value })
        .from(settingsTable)
        .where(eq(settingsTable.key, key))
        .limit(1);
    return row?.value || null;
}

export async function getSquareClient(): Promise<SquareClient | null> {
    if (cachedClient && Date.now() < cacheExpiry) return cachedClient;

    // Try DB settings first, fall back to env var
    const token = (await getSettingValue("square_access_token")) || process.env.SQUARE_ACCESS_TOKEN;
    const env = (await getSettingValue("square_environment")) || process.env.SQUARE_ENVIRONMENT || "sandbox";

    if (!token) {
        cachedClient = null;
        return null;
    }

    cachedClient = new SquareClient({
        token,
        environment: env === "production" ? SquareEnvironment.Production : SquareEnvironment.Sandbox,
    });
    cachedEnv = env;
    cacheExpiry = Date.now() + CACHE_TTL_MS;
    return cachedClient;
}

/** Call after settings are saved to force re-creation of the client */
export function invalidateSquareClientCache() {
    cachedClient = null;
    cacheExpiry = 0;
}

export async function createPayment(
    amountCents: number,
    sourceId: string,
    customerEmail: string,
    orderId?: string,
    squareCustomerId?: string,
    locationId?: string,
) {
    const client = await getSquareClient();
    if (!client) {
        if (process.env.NODE_ENV === "production") {
            throw new Error("Square is not configured. Cannot process payment in production.");
        }
        console.log(
            `[SQUARE SKIPPED] No token configured. Amount: ${amountCents}, Source: ${sourceId}`,
        );
        return { id: `mock_${crypto.randomBytes(8).toString("hex")}` };
    }

    const idempotencyKey = crypto.randomUUID();
    try {
        const response = await client.payments.create({
            sourceId,
            idempotencyKey,
            amountMoney: {
                amount: BigInt(amountCents),
                currency: "USD",
            },
            buyerEmailAddress: customerEmail,
            ...(orderId ? { orderId } : {}),
            ...(squareCustomerId ? { customerId: squareCustomerId } : {}),
            ...(locationId ? { locationId } : {}),
        });

        return { id: response.payment?.id ?? null };
    } catch (e) {
        // Extract structured error details from Square for better diagnostics
        if (e instanceof SquareError) {
            const details = e.errors?.map(err => `${err.category}/${err.code}: ${(err as any).detail || ""}`.trim()).join("; ") || e.message;
            console.error(`[SQUARE] Payment failed (${e.statusCode}): ${details}`);
            const paymentError = new Error(details) as any;
            paymentError.squareStatusCode = e.statusCode;
            paymentError.squareErrors = e.errors;
            throw paymentError;
        }
        throw e;
    }
}

export async function refundPayment(
    paymentId: string,
    amountCents: number,
) {
    const client = await getSquareClient();
    if (!client) {
        if (process.env.NODE_ENV === "production") {
            throw new Error("Square is not configured. Cannot process refund in production.");
        }
        console.log(
            `[SQUARE SKIPPED] No token configured. Refund for payment: ${paymentId}, Amount: ${amountCents}`,
        );
        return { id: `mock_refund_${crypto.randomBytes(8).toString("hex")}` };
    }

    const idempotencyKey = crypto.randomUUID();
    const response = await client.refunds.refundPayment({
        paymentId,
        idempotencyKey,
        amountMoney: {
            amount: BigInt(amountCents),
            currency: "USD",
        },
    });

    return { id: response.refund?.id ?? null };
}

export async function isSquareConfigured(): Promise<boolean> {
    const client = await getSquareClient();
    return !!client;
}

export async function getOnlineSalesLocationId(): Promise<string | null> {
    // 1. Explicit DB setting
    const fromSetting = await getSettingValue("square_online_sales_location_id");
    if (fromSetting) return fromSetting;

    // 2. Environment variable (e.g. SQUARE_LOCATION_ID from Railway)
    if (process.env.SQUARE_LOCATION_ID) return process.env.SQUARE_LOCATION_ID;

    // 3. Query Square API for a location named "Online Sales"
    const client = await getSquareClient();
    if (!client) return null;

    try {
        const response = await client.locations.list();
        const onlineLoc = (response.locations || []).find(
            (loc) => loc.name === "Online Sales" && loc.status === "ACTIVE",
        );
        return onlineLoc?.id ?? null;
    } catch (err) {
        console.error("[SQUARE] Failed to list locations for Online Sales lookup:", err);
        return null;
    }
}

export async function createSquareOrder(
    squareLocationId: string,
    orderNumber: string,
    lineItems: { name: string; quantity: number; priceCents: number }[],
    discountCents?: number,
    options?: { isPreOrder?: boolean; customerId?: string },
) {
    const client = await getSquareClient();
    if (!client) {
        if (process.env.NODE_ENV === "production") {
            throw new Error("Square is not configured. Cannot create order in production.");
        }
        console.log(
            `[SQUARE SKIPPED] No token configured. Order: ${orderNumber}, Items: ${lineItems.length}`,
        );
        return { id: `mock_order_${crypto.randomBytes(8).toString("hex")}` };
    }

    const idempotencyKey = crypto.randomUUID();

    const discounts = discountCents && discountCents > 0
        ? [{
            name: "Coupon Discount",
            type: "FIXED_AMOUNT" as const,
            amountMoney: { amount: BigInt(discountCents), currency: "USD" as const },
            scope: "ORDER" as const,
        }]
        : undefined;

    try {
        const response = await client.orders.create({
            order: {
                locationId: squareLocationId,
                referenceId: orderNumber,
                source: { name: options?.isPreOrder ? "Special Pre-Order" : "Online Order" },
                ...(options?.customerId ? { customerId: options.customerId } : {}),
                lineItems: lineItems.map((item) => ({
                    name: item.name,
                    quantity: String(item.quantity),
                    basePriceMoney: {
                        amount: BigInt(item.priceCents),
                        currency: "USD",
                    },
                })),
                ...(discounts ? { discounts } : {}),
            },
            idempotencyKey,
        });

        return { id: response.order?.id ?? null, version: response.order?.version };
    } catch (e) {
        if (e instanceof SquareError) {
            const details = e.errors?.map(err => `${err.category}/${err.code}: ${(err as any).detail || ""}`.trim()).join("; ") || e.message;
            console.error(`[SQUARE] Order creation failed (${e.statusCode}): ${details}`);
        }
        throw e;
    }
}

/** Normalize a phone number to E.164 for Square loyalty APIs (+1XXXXXXXXXX for US). */
export function normalizePhoneForSquare(phone: string): string | null {
    const trimmed = phone.trim();
    if (!trimmed) return null;

    const digits = trimmed.replace(/\D/g, "");
    if (digits.length === 10) return `+1${digits}`;
    if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
    if (trimmed.startsWith("+") && digits.length >= 10) return `+${digits}`;

    return null;
}

function isSquareOrderNotUpdatableError(e: unknown): boolean {
    if (!(e instanceof SquareError)) return false;
    return e.errors?.some((err) =>
        err.code === "BAD_REQUEST" &&
        typeof (err as { detail?: string }).detail === "string" &&
        ((err as { detail?: string }).detail!.includes("cannot be updated") ||
            (err as { detail?: string }).detail!.includes("COMPLETED")),
    ) ?? false;
}

function isPhoneAlreadyAssociatedError(e: unknown): boolean {
    if (!(e instanceof SquareError)) return false;
    return e.errors?.some((err) =>
        err.code === "BAD_REQUEST" &&
        typeof (err as { detail?: string }).detail === "string" &&
        (err as { detail?: string }).detail!.includes("Phone number already associated"),
    ) ?? false;
}

function loyaltyAccountFrom(account: {
    id?: string;
    balance?: number;
    lifetimePoints?: number;
}) {
    if (!account.id) return null;
    return {
        accountId: account.id,
        balance: account.balance ?? 0,
        lifetimePoints: account.lifetimePoints ?? 0,
    };
}

export async function linkCustomerToSquareOrder(
    squareOrderId: string,
    squareLocationId: string,
    squareCustomerId: string,
): Promise<boolean> {
    const client = await getSquareClient();
    if (!client) return false;

    try {
        const current = await client.orders.get({ orderId: squareOrderId });
        const order = current.order;

        if (order?.customerId === squareCustomerId) return true;
        if (order?.state === "COMPLETED" || order?.state === "CANCELED") {
            return false;
        }

        await client.orders.update({
            orderId: squareOrderId,
            order: {
                locationId: squareLocationId,
                customerId: squareCustomerId,
                version: order?.version,
            },
        });
        return true;
    } catch (e) {
        if (isSquareOrderNotUpdatableError(e)) return false;
        console.error("[SQUARE] Failed to link customer to order:", e);
        return false;
    }
}

export async function updateSquareOrderState(
    squareOrderId: string,
    squareLocationId: string,
    state: "COMPLETED" | "CANCELED",
) {
    const client = await getSquareClient();
    if (!client) {
        console.log(`[SQUARE SKIPPED] No token configured. Update order: ${squareOrderId} → ${state}`);
        return;
    }

    // Get current order version first (required for updates)
    const current = await client.orders.get({ orderId: squareOrderId });
    const version = current.order?.version;

    await client.orders.update({
        orderId: squareOrderId,
        order: {
            locationId: squareLocationId,
            state,
            version,
        },
    });
}

export async function listSquareLocations(token?: string, env?: string) {
    let client: SquareClient;
    if (token) {
        client = new SquareClient({
            token,
            environment: (env || "sandbox") === "production" ? SquareEnvironment.Production : SquareEnvironment.Sandbox,
        });
    } else {
        const c = await getSquareClient();
        if (!c) return [];
        client = c;
    }

    const response = await client.locations.list();
    return (response.locations || []).map((loc) => ({
        id: loc.id,
        name: loc.name,
        address: loc.address ? `${loc.address.addressLine1 || ""}, ${loc.address.locality || ""}` : "",
        status: loc.status,
    }));
}

// ── Square Customer Sync ──

export async function searchSquareCustomer(email: string): Promise<string | null> {
    const client = await getSquareClient();
    if (!client) return null;

    const response = await client.customers.search({
        query: {
            filter: {
                emailAddress: { exact: email.toLowerCase().trim() },
            },
        },
    });

    return response.customers?.[0]?.id ?? null;
}

export async function createSquareCustomer(
    email: string,
    firstName: string,
    lastName: string,
    phone?: string,
): Promise<string | null> {
    const client = await getSquareClient();
    if (!client) return null;

    const response = await client.customers.create({
        idempotencyKey: crypto.randomUUID(),
        emailAddress: email.toLowerCase().trim(),
        givenName: firstName || undefined,
        familyName: lastName || undefined,
        phoneNumber: phone || undefined,
    });

    return response.customer?.id ?? null;
}

export async function getOrCreateSquareCustomer(
    email: string,
    firstName: string,
    lastName: string,
    phone?: string,
): Promise<string | null> {
    // Try to find existing customer first
    const existingId = await searchSquareCustomer(email);
    if (existingId) return existingId;

    // Create new customer
    return createSquareCustomer(email, firstName, lastName, phone);
}

// ── Square Loyalty ──

// Cache loyalty program to avoid repeated API calls
let cachedLoyaltyProgram: any = null;
let loyaltyProgramCacheExpiry = 0;
const LOYALTY_CACHE_TTL_MS = 300_000; // 5 minutes

export async function getSquareLoyaltyProgram(): Promise<{
    id: string;
    accrualRules: any[];
    rewardTiers: any[];
    terminology: { one: string; other: string };
    status: string;
} | null> {
    if (cachedLoyaltyProgram && Date.now() < loyaltyProgramCacheExpiry) {
        return cachedLoyaltyProgram;
    }

    const client = await getSquareClient();
    if (!client) return null;

    try {
        const response = await client.loyalty.programs.get({ programId: "main" });
        const program = response.program;
        if (!program) return null;

        cachedLoyaltyProgram = {
            id: program.id,
            accrualRules: program.accrualRules ?? [],
            rewardTiers: program.rewardTiers ?? [],
            terminology: program.terminology ?? { one: "point", other: "points" },
            status: program.status ?? "INACTIVE",
        };
        loyaltyProgramCacheExpiry = Date.now() + LOYALTY_CACHE_TTL_MS;
        return cachedLoyaltyProgram;
    } catch (e: any) {
        // No loyalty program configured — not an error
        if (e instanceof SquareError && e.statusCode === 404) {
            cachedLoyaltyProgram = null;
            loyaltyProgramCacheExpiry = Date.now() + LOYALTY_CACHE_TTL_MS;
            return null;
        }
        throw e;
    }
}

export async function getOrCreateLoyaltyAccount(
    squareCustomerId: string,
    programId: string,
    phone?: string,
): Promise<{ accountId: string; balance: number; lifetimePoints: number } | null> {
    const client = await getSquareClient();
    if (!client) return null;

    // Search for existing loyalty account by customer ID
    const searchResponse = await client.loyalty.accounts.search({
        query: {
            customerIds: [squareCustomerId],
        },
    });

    const existingByCustomer = searchResponse.loyaltyAccounts?.[0];
    if (existingByCustomer) {
        return loyaltyAccountFrom(existingByCustomer);
    }

    const normalizedPhone = phone ? normalizePhoneForSquare(phone) : null;
    if (!normalizedPhone) return null;

    // Phone may already be enrolled in-store under a different customer record
    const searchByPhone = await client.loyalty.accounts.search({
        query: {
            mappings: [{ phoneNumber: normalizedPhone }],
        },
    });
    const existingByPhone = searchByPhone.loyaltyAccounts?.[0];
    if (existingByPhone) {
        return loyaltyAccountFrom(existingByPhone);
    }

    try {
        const createResponse = await client.loyalty.accounts.create({
            loyaltyAccount: {
                programId,
                mapping: { phoneNumber: normalizedPhone },
            },
            idempotencyKey: crypto.randomUUID(),
        });

        return loyaltyAccountFrom(createResponse.loyaltyAccount ?? {});
    } catch (e) {
        if (isPhoneAlreadyAssociatedError(e)) {
            const retrySearch = await client.loyalty.accounts.search({
                query: {
                    mappings: [{ phoneNumber: normalizedPhone }],
                },
            });
            const existing = retrySearch.loyaltyAccounts?.[0];
            if (existing) return loyaltyAccountFrom(existing);
        }
        console.error("[SQUARE] Failed to get or create loyalty account:", e);
        return null;
    }
}

export async function calculateLoyaltyPoints(
    programId: string,
    amountCents: number,
    orderId?: string,
): Promise<number> {
    const client = await getSquareClient();
    if (!client) return 0;

    try {
        const response = await client.loyalty.programs.calculate({
            programId,
            ...(orderId
                ? { orderId }
                : {
                    transactionAmountMoney: {
                        amount: BigInt(amountCents),
                        currency: "USD",
                    },
                }),
        });

        return response.points ?? 0;
    } catch {
        console.error("[SQUARE] Failed to calculate loyalty points");
        return 0;
    }
}

export async function accumulateLoyaltyPoints(
    loyaltyAccountId: string,
    idempotencyKey: string,
    locationId: string,
    orderId?: string,
    points?: number,
): Promise<boolean> {
    const client = await getSquareClient();
    if (!client) return false;

    try {
        await client.loyalty.accounts.accumulatePoints({
            accountId: loyaltyAccountId,
            accumulatePoints: orderId ? { orderId } : { points },
            idempotencyKey,
            locationId,
        });
        return true;
    } catch (e) {
        console.error("[SQUARE] Failed to accumulate loyalty points:", e);
        return false;
    }
}

export async function getWholesaleLocationId(): Promise<string | null> {
    // 1. Explicit DB setting
    const fromSetting = await getSettingValue("square_wholesale_location_id");
    if (fromSetting) return fromSetting;

    // 2. Query Square API for a location named "Wholesale"
    const client = await getSquareClient();
    if (!client) return null;

    try {
        const response = await client.locations.list();
        const wholesaleLoc = (response.locations || []).find(
            (loc) => loc.name === "Urban Churn Manufacturing" && loc.status === "ACTIVE",
        );
        return wholesaleLoc?.id ?? null;
    } catch (err) {
        console.error("[SQUARE] Failed to list locations for Wholesale lookup:", err);
        return null;
    }
}

// ── Square Invoices (Wholesale) ──

export async function createAndPublishWholesaleInvoice(params: {
    orderNumber: string;
    customerEmail: string;
    customerName: string;
    items: { description: string; quantity: number; unitPriceCents: number }[];
    dueDate?: string | null;
}): Promise<{ squareOrderId: string; squareInvoiceId: string; publicUrl: string | null }> {
    const client = await getSquareClient();
    if (!client) {
        throw new Error("Square is not configured. Cannot create invoice.");
    }

    const locationId = await getWholesaleLocationId();

    if (!locationId) {
        throw new Error("No Wholesale Square location configured. Set the Wholesale location in admin settings → Location Mapping.");
    }

    // 1. Create a Square order for the invoice line items
    const orderResponse = await client.orders.create({
        order: {
            locationId,
            referenceId: params.orderNumber,
            lineItems: params.items.map((item) => ({
                name: item.description,
                quantity: String(item.quantity),
                basePriceMoney: {
                    amount: BigInt(item.unitPriceCents),
                    currency: "USD",
                },
            })),
        },
        idempotencyKey: crypto.randomUUID(),
    });

    const squareOrderId = orderResponse.order?.id;
    if (!squareOrderId) {
        throw new Error("Failed to create Square order for invoice");
    }

    // 2. Create the invoice linked to the order
    const invoiceResponse = await client.invoices.create({
        invoice: {
            locationId,
            orderId: squareOrderId,
            primaryRecipient: {
                emailAddress: params.customerEmail,
                givenName: params.customerName,
            },
            paymentRequests: [
                {
                    requestType: "BALANCE",
                    ...(params.dueDate ? { dueDate: params.dueDate } : {}),
                },
            ],
            deliveryMethod: "EMAIL",
            title: `Invoice for ${params.orderNumber}`,
            description: "Wholesale order from Urban Churn",
        },
        idempotencyKey: crypto.randomUUID(),
    });

    const squareInvoiceId = invoiceResponse.invoice?.id;
    if (!squareInvoiceId) {
        throw new Error("Failed to create Square invoice");
    }

    // 3. Publish the invoice — this sends the payment link email to the customer
    const publishResponse = await client.invoices.publish({
        invoiceId: squareInvoiceId,
        version: invoiceResponse.invoice?.version ?? 0,
        idempotencyKey: crypto.randomUUID(),
    });

    return {
        squareOrderId,
        squareInvoiceId,
        publicUrl: publishResponse.invoice?.publicUrl ?? null,
    };
}

export async function cancelWholesaleInvoice(squareInvoiceId: string): Promise<void> {
    const client = await getSquareClient();
    if (!client) {
        throw new Error("Square is not configured. Cannot cancel invoice.");
    }

    const invoiceResponse = await client.invoices.get({ invoiceId: squareInvoiceId });
    const version = invoiceResponse.invoice?.version;
    if (version === undefined || version === null) {
        throw new Error("Could not retrieve invoice version from Square");
    }

    await client.invoices.cancel({
        invoiceId: squareInvoiceId,
        version,
    });
}

// ── Square Gift Cards ──

export async function createDigitalGiftCard(locationId: string): Promise<{ id: string; gan: string } | null> {
    const client = await getSquareClient();
    if (!client) {
        if (process.env.NODE_ENV === "production") {
            throw new Error("Square is not configured. Cannot create gift card in production.");
        }
        console.log(`[SQUARE SKIPPED] No token configured. Gift card creation skipped.`);
        return { id: `mock_gc_${crypto.randomBytes(8).toString("hex")}`, gan: `0000000000000000` };
    }

    const response = await client.giftCards.create({
        idempotencyKey: crypto.randomUUID(),
        locationId,
        giftCard: { type: "DIGITAL" },
    });

    const gc = response.giftCard;
    if (!gc?.id || !gc?.gan) {
        throw new Error("Gift card creation returned incomplete data");
    }

    return { id: gc.id, gan: gc.gan };
}

export async function activateGiftCard(
    giftCardId: string,
    amountCents: number,
    locationId: string,
): Promise<void> {
    const client = await getSquareClient();
    if (!client) {
        if (process.env.NODE_ENV === "production") {
            throw new Error("Square is not configured. Cannot activate gift card in production.");
        }
        console.log(`[SQUARE SKIPPED] No token configured. Activate gift card: ${giftCardId}, Amount: ${amountCents}`);
        return;
    }

    await client.giftCards.activities.create({
        idempotencyKey: crypto.randomUUID(),
        giftCardActivity: {
            giftCardId,
            type: "ACTIVATE",
            locationId,
            activateActivityDetails: {
                amountMoney: {
                    amount: BigInt(amountCents),
                    currency: "USD",
                },
            },
        },
    });
}
