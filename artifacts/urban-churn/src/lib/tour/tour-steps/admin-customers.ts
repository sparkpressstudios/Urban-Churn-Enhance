import type { Step } from "react-joyride";

export const adminCustomersSteps: Step[] = [
    {
        target: '[data-tour="admin-customers-header"]',
        title: "Customer Database",
        content:
            "Search and manage your customer records, including order history and spending totals.",
        skipBeacon: true,
    },
    {
        target: '[data-tour="admin-customers-search"]',
        title: "Search Customers",
        content:
            "Find customers by email address to quickly pull up their account.",
    },
    {
        target: '[data-tour="admin-customers-table"]',
        title: "Customer Table",
        content:
            "See each customer's name, email, phone, location, total orders, and lifetime spend. Click to edit details.",
    },
];
