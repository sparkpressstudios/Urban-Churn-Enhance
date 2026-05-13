import type { Step } from "react-joyride";

export const adminEventsSteps: Step[] = [
    {
        target: '[data-tour="admin-events-header"]',
        title: "Events & Tastings",
        content:
            "Manage tasting events, ticket sales, and event capacity across your locations.",
        skipBeacon: true,
    },
    {
        target: '[data-tour="admin-events-stats"]',
        title: "Event Stats",
        content:
            "Quick overview: Total Events, Upcoming, Tickets Sold, and Event Revenue.",
    },
    {
        target: '[data-tour="admin-events-status-filter"]',
        title: "Status Filter",
        content:
            "Filter events by Draft, Published, Sold Out, Cancelled, or Completed.",
    },
    {
        target: '[data-tour="admin-events-table"]',
        title: "Events Table",
        content:
            "View all events with their date, location, ticket sales vs. capacity. Duplicate, edit, or delete from here.",
    },
    {
        target: '[data-tour="admin-events-create"]',
        title: "Create Event",
        content:
            "Set up a new event with details, date/time, location, ticket types, pricing, and capacity limits.",
    },
];
