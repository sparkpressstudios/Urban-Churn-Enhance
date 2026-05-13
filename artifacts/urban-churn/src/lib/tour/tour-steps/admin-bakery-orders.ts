import type { Step } from "react-joyride";

export const adminBakeryOrdersSteps: Step[] = [
    {
        target: '[data-tour="admin-bakery-header"]',
        title: "Bakery Orders",
        content:
            "Manage custom cake and bakery orders — from initial requests to invoicing and fulfillment.",
        skipBeacon: true,
    },
    {
        target: '[data-tour="admin-bakery-stats"]',
        title: "Order Stats",
        content:
            "Quick metrics: Total, Today's, Pending, and Completed bakery orders.",
    },
    {
        target: '[data-tour="admin-bakery-table"]',
        title: "Orders Table",
        content:
            "Each order shows the customer, type, pre-order window, pickup date/time, status, and total. Click to view full details.",
    },
    {
        target: '[data-tour="admin-bakery-invoice"]',
        title: "Send Invoice",
        content:
            "Send an invoice to the customer with a custom amount and message directly from the order detail.",
    },
];
