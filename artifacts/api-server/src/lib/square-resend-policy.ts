/** Explicit opt-in is required before Square-imported contacts leave Neon. */
export function isSquareResendSyncEnabled(): boolean {
    return process.env.SQUARE_CONTACT_RESEND_SYNC_ENABLED === "true";
}

export type SquareContactProvenance = {
    source?: string;
    consentSource?: string;
    customProperties?: unknown;
};

export function isSquareLinkedContact(contact: SquareContactProvenance): boolean {
    const properties = contact.customProperties;
    const squareCustomerId = properties && typeof properties === "object"
        ? (properties as Record<string, unknown>).squareCustomerId
        : undefined;

    return contact.source === "square_sync" ||
        contact.consentSource?.startsWith("square_") === true ||
        (typeof squareCustomerId === "string" && squareCustomerId.trim().length > 0);
}

export function isSquareContactHeldInNeon(contact: SquareContactProvenance): boolean {
    return !isSquareResendSyncEnabled() && isSquareLinkedContact(contact);
}
