import type { Step } from "react-joyride";

export const adminEventOrdersSteps: Step[] = [
    {
        target: '[data-tour="admin-event-orders-header"]',
        title: "Event Orders",
        content:
            "View and manage all ticket purchases across your events.",
        skipBeacon: true,
    },
    {
        target: '[data-tour="admin-event-orders-table"]',
        title: "Orders Table",
        content:
            "See who purchased tickets, for which event, quantity, total paid, and order status.",
    },
];
