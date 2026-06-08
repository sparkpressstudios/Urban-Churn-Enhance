import type { Step } from "react-joyride";

export const wholesaleDashboardSteps: Step[] = [
    {
        target: '[data-tour="wholesale-dashboard-header"]',
        title: "Welcome to Your Wholesale Portal",
        content:
            "Manage your wholesale account, place orders, and track deliveries from this dashboard.",
        skipBeacon: true,
    },
    {
        target: '[data-tour="wholesale-active-summary"]',
        title: "Orders at a Glance",
        content:
            "See active orders, total history, balance due, and your next scheduled delivery — without opening each order.",
    },
    {
        target: '[data-tour="wholesale-business-info"]',
        title: "Your Business Info",
        content:
            "Your contact details and preferred delivery method are always visible here.",
    },
    {
        target: '[data-tour="wholesale-order-history"]',
        title: "Order History",
        content:
            "View all your past and current orders. Click any order to see full details and status.",
    },
    {
        target: '[data-tour="wholesale-new-order-btn"]',
        title: "Place a New Order",
        content:
            "Click here to start a new wholesale order. Select products, quantities, and your preferred delivery date.",
    },
];
