import type { Step } from "react-joyride";

export const storeOrdersSteps: Step[] = [
    {
        target: '[data-tour="store-orders-header"]',
        title: "Store Orders",
        content:
            "View and manage all orders for your location. Search, filter, and click any row to see full details.",
        skipBeacon: true,
    },
    {
        target: '[data-tour="store-orders-search"]',
        title: "Search Orders",
        content:
            "Search by order number, customer name, or email to quickly find a specific order.",
    },
    {
        target: '[data-tour="store-orders-filters"]',
        title: "Filters",
        content:
            "Filter by status and use date presets (Today, This Week, etc.) to narrow down the order list.",
    },
    {
        target: '[data-tour="store-orders-table"]',
        title: "Orders Table",
        content:
            "Each row shows order details. Click any row to view the full order — customer info, items, and actions.",
    },
];
