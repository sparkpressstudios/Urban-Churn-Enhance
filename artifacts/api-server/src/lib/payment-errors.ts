import type { Response } from "express";
import { SquareError } from "square";

export type PaymentErrorCode =
    | "PAYMENT_DECLINED"
    | "PAYMENT_INVALID_CARD"
    | "PAYMENT_PROCESSING_ERROR"
    | "PAYMENT_REQUIRED"
    | "PAYMENTS_UNAVAILABLE";

const MESSAGES: Record<PaymentErrorCode, string> = {
    PAYMENT_DECLINED:
        "Your card was declined. Please try a different card or contact your bank.",
    PAYMENT_INVALID_CARD:
        "Your card details look incorrect. Please check the number, expiry, and security code.",
    PAYMENT_PROCESSING_ERROR:
        "We could not process your payment right now. Please try again in a moment.",
    PAYMENT_REQUIRED: "Please enter your card details to complete this order.",
    PAYMENTS_UNAVAILABLE:
        "Card payments are temporarily unavailable. Please try again later or contact us.",
};

export function paymentErrorMessage(code: PaymentErrorCode): string {
    return MESSAGES[code];
}

export function mapSquarePaymentError(error: unknown): {
    code: PaymentErrorCode;
    logDetail: string;
} {
    if (error instanceof SquareError) {
        const squareCode = error.errors?.[0]?.code ?? "";
        const detail =
            error.errors
                ?.map((err) => `${err.category}/${err.code}: ${(err as { detail?: string }).detail ?? ""}`.trim())
                .join("; ") || error.message;

        const invalidCardCodes = new Set([
            "INVALID_EXPIRATION",
            "INVALID_CARD",
            "CVV_FAILURE",
            "PAN_FAILURE",
            "INVALID_PIN",
            "ADDRESS_VERIFICATION_FAILURE",
            "ZIP_CODE_INVALID",
        ]);
        const declineCodes = new Set([
            "CARD_DECLINED",
            "GENERIC_DECLINE",
            "INSUFFICIENT_FUNDS",
            "CARDHOLDER_INSUFFICIENT_PERMISSIONS",
            "CARD_EXPIRED",
            "CARD_NOT_SUPPORTED",
        ]);

        if (invalidCardCodes.has(squareCode)) {
            return { code: "PAYMENT_INVALID_CARD", logDetail: detail };
        }
        if (declineCodes.has(squareCode)) {
            return { code: "PAYMENT_DECLINED", logDetail: detail };
        }
        return { code: "PAYMENT_PROCESSING_ERROR", logDetail: detail };
    }

    const message = error instanceof Error ? error.message : String(error);
    return { code: "PAYMENT_PROCESSING_ERROR", logDetail: message };
}

/** Standard JSON body for failed checkout — never includes orderNumber or order id. */
export function respondPaymentError(
    res: Response,
    code: PaymentErrorCode,
    httpStatus: number = 402,
) {
    res.status(httpStatus).json({
        code,
        error: paymentErrorMessage(code),
        retryable: code !== "PAYMENTS_UNAVAILABLE",
    });
}
