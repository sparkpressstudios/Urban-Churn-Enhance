import type { Step } from "react-joyride";

export const adminEmailLogSteps: Step[] = [
    {
        target: '[data-tour="admin-email-log-header"]',
        title: "Email Log",
        content:
            "Audit trail of every automated email sent by the system — pickup reminders, window reports, and more.",
        skipBeacon: true,
    },
    {
        target: '[data-tour="admin-email-log-filter"]',
        title: "Type Filter",
        content:
            "Filter by email type: Window Closing Report, Admin Orders Closed, Customer Pickup Reminder, or Pickup Started.",
    },
    {
        target: '[data-tour="admin-email-log-table"]',
        title: "Email Table",
        content:
            "Each entry shows when it was sent, the type, recipient, related pre-order, and whether it succeeded or failed.",
    },
];
