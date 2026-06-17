import type { Step } from "react-joyride";

export const adminOrdersSteps: Step[] = [
    {
        target: '[data-tour="admin-orders-header"]',
        title: "Order Management",
        content:
            "View and manage all pre-orders and retail orders from every location in one place.",
        skipBeacon: true,
    },
    {
        target: '[data-tour="admin-orders-search"]',
        title: "Search Orders",
        content:
            "Find orders quickly by customer name, email, or order number — useful for refunds and status updates.",
    },
    {
        target: '[data-tour="admin-orders-status-filter"]',
        title: "Filter by Status",
        content:
            "Quickly narrow down orders by status — Pending, Confirmed, Ready, Picked Up, Cancelled, or Refunded.",
    },
    {
        target: '[data-tour="admin-orders-bulk"]',
        title: "Bulk Actions",
        content:
            "Select multiple orders using the checkboxes, then apply a batch status update to all selected orders at once.",
    },
    {
        target: '[data-tour="admin-orders-table"]',
        title: "Orders Table",
        content:
            "Each row shows the order number, customer, location, status, total, and date. Click a row to see full details.",
    },
    {
        target: '[data-tour="admin-orders-status-dropdown"]',
        title: "Inline Status Update",
        content:
            "Change an order's status directly from the table — no need to open the detail view.",
    },
];
