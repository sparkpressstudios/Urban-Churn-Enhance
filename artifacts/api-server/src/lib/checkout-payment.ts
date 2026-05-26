import {
    createPayment,
    createSquareOrder,
    getOnlineSalesLocationId,
    isSquareConfigured,
} from "./square";
import { mapSquarePaymentError, type PaymentErrorCode, paymentErrorMessage } from "./payment-errors";

export class CheckoutPaymentError extends Error {
    code: PaymentErrorCode;
    logDetail: string;

    constructor(code: PaymentErrorCode, logDetail: string) {
        super(paymentErrorMessage(code));
        this.code = code;
        this.logDetail = logDetail;
    }
}

export async function assertPaymentsReady(): Promise<string> {
    if (!(await isSquareConfigured())) {
        throw new CheckoutPaymentError("PAYMENTS_UNAVAILABLE", "Square not configured");
    }
    const locationId = await getOnlineSalesLocationId();
    if (!locationId) {
        throw new CheckoutPaymentError("PAYMENTS_UNAVAILABLE", "Online sales location not configured");
    }
    return locationId;
}

/** Charge card via Square before persisting a local order. Throws CheckoutPaymentError on failure. */
export async function chargeBeforeOrderPersist(opts: {
    orderNumber: string;
    chargeCents: number;
    sourceId: string;
    customerEmail: string;
    lineItems: { name: string; quantity: number; priceCents: number }[];
    discountCents?: number;
    isPreOrder?: boolean;
}): Promise<{ squareOrderId: string | null; squarePaymentId: string; locationId: string }> {
    const locationId = await assertPaymentsReady();

    let squareOrderId: string | null = null;
    try {
        const sqOrder = await createSquareOrder(
            locationId,
            opts.orderNumber,
            opts.lineItems,
            opts.discountCents && opts.discountCents > 0 ? opts.discountCents : undefined,
            opts.isPreOrder ? { isPreOrder: true } : undefined,
        );
        squareOrderId = sqOrder.id ?? null;
    } catch (e) {
        console.error("[SQUARE] Order creation failed:", e);
    }

    try {
        const payment = await createPayment(
            opts.chargeCents,
            opts.sourceId,
            opts.customerEmail,
            squareOrderId ?? undefined,
            undefined,
            locationId,
        );
        const squarePaymentId = payment.id;
        if (!squarePaymentId) {
            throw new CheckoutPaymentError("PAYMENT_PROCESSING_ERROR", "No payment id returned");
        }
        return { squareOrderId, squarePaymentId, locationId };
    } catch (e) {
        if (e instanceof CheckoutPaymentError) throw e;
        const mapped = mapSquarePaymentError(e);
        console.error(`[SQUARE] Payment failed: ${mapped.logDetail}`);
        throw new CheckoutPaymentError(mapped.code, mapped.logDetail);
    }
}
