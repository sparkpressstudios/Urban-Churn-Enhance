import type { Step } from "react-joyride";

export const adminFulfillmentSteps: Step[] = [
    {
        target: '[data-tour="admin-fulfillment-header"]',
        title: "Fulfillment Center",
        content:
            "Track what needs to be churned, delivered, and picked up. This is your production and logistics hub.",
        skipBeacon: true,
    },
    {
        target: '[data-tour="admin-fulfillment-filters"]',
        title: "Filters",
        content:
            "Filter by location, date range, and flavor to see exactly what needs to be prepared.",
    },
    {
        target: '[data-tour="admin-fulfillment-churn-tab"]',
        title: "Churn & Deliver",
        content:
            "See a production summary grouped by location and flavor — how many of each size need to be made.",
    },
    {
        target: '[data-tour="admin-fulfillment-pickup-tab"]',
        title: "Pickup / Lookup",
        content:
            "Search for orders by number, name, or email. Mark orders as Ready or Picked Up from here.",
    },
];
