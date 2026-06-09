/**
 * Whether customers can place new pre-orders for a window.
 * Requires status "open" and the current instant inside [preOrderStart, preOrderEnd).
 */
export function isPreOrderAcceptingOrders(
    status: string,
    preOrderStart: Date,
    preOrderEnd: Date,
    now: Date = new Date(),
): boolean {
    return (
        status === "open" &&
        preOrderStart.getTime() <= now.getTime() &&
        preOrderEnd.getTime() > now.getTime()
    );
}
