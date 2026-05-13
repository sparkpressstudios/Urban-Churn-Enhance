import type { Step } from "react-joyride";

export const adminInquiriesSteps: Step[] = [
    {
        target: '[data-tour="admin-inquiries-header"]',
        title: "Inquiries & Leads",
        content:
            "Manage contact form submissions, catering requests, fundraising leads, and wholesale inquiries in one pipeline.",
        skipBeacon: true,
    },
    {
        target: '[data-tour="admin-inquiries-pipeline"]',
        title: "Pipeline Cards",
        content:
            "Track leads through four stages: New, Follow Up, Contacted, and Completed. Click a card to filter by that stage.",
    },
    {
        target: '[data-tour="admin-inquiries-type-tabs"]',
        title: "Inquiry Types",
        content:
            "Filter by type — Contact, Wholesale, Catering, Fundraising, or Bakery — to focus on specific requests.",
    },
    {
        target: '[data-tour="admin-inquiries-search"]',
        title: "Search",
        content:
            "Search by name, email, or content to quickly find a specific inquiry.",
    },
    {
        target: '[data-tour="admin-inquiries-list"]',
        title: "Inquiry Cards",
        content:
            "Each card shows the type, status, contact info, and time since submission. Click to open full details, assign staff, and add notes.",
    },
];
