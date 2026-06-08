/** Shared wholesale UI labels and helpers */

export const WHOLESALE_ORDER_STATUS_LABELS: Record<string, string> = {
    pending_review: "Pending Review",
    confirmed: "Confirmed",
    in_production: "In Production",
    ready: "Ready for Delivery",
    delivered: "Delivered",
    cancelled: "Cancelled",
};

export const WHOLESALE_PAYMENT_STATUS_LABELS: Record<string, string> = {
    unpaid: "Unpaid",
    invoiced: "Invoiced",
    partial: "Partial",
    paid: "Paid",
};

export const WHOLESALE_ACTIVE_ORDER_STATUSES = [
    "pending_review",
    "confirmed",
    "in_production",
    "ready",
] as const;

export function formatWholesaleOrderStatus(status: string): string {
    return WHOLESALE_ORDER_STATUS_LABELS[status] || status.replace(/_/g, " ");
}

export const WHOLESALE_ORDER_FILTERS = [
    { value: "all", label: "All Statuses" },
    { value: "filter:awaiting_delivery", label: "Awaiting Delivery" },
    { value: "filter:unpaid_awaiting_delivery", label: "Awaiting Delivery (Unpaid)" },
    { value: "filter:has_unmatched", label: "Has Unmatched Items" },
    { value: "pending_review", label: "Pending Review" },
    { value: "confirmed", label: "Confirmed" },
    { value: "in_production", label: "In Production" },
    { value: "ready", label: "Ready for Delivery" },
    { value: "delivered", label: "Delivered" },
    { value: "cancelled", label: "Cancelled" },
] as const;

export function parseWholesaleOrderFilter(value: string): { status?: string; filter?: string } {
    if (value.startsWith("filter:")) {
        return { filter: value.replace("filter:", "") };
    }
    if (value === "all") return {};
    return { status: value };
}
