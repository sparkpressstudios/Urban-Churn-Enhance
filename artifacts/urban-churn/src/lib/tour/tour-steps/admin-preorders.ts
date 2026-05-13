import type { Step } from "react-joyride";

export const adminPreOrdersSteps: Step[] = [
    {
        target: '[data-tour="admin-preorders-header"]',
        title: "Pre-Order Windows",
        content:
            "Manage time-limited windows during which customers can pre-order specific flavors.",
        skipBeacon: true,
    },
    {
        target: '[data-tour="admin-preorders-status-filters"]',
        title: "Status Filters",
        content:
            "Toggle between All, Draft, Scheduled, Open, Closed, and Cancelled to find the windows you need.",
    },
    {
        target: '[data-tour="admin-preorders-cards"]',
        title: "Window Cards",
        content:
            "Each card shows the flavor, open/close dates, countdown timer, pickup date, and whether it's recurring.",
    },
    {
        target: '[data-tour="admin-preorders-create"]',
        title: "Create a Window",
        content:
            "Set dates, select flavors, configure pickup time, and optionally make the window recurring.",
    },
];
