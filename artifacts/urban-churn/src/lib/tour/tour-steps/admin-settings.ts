import type { Step } from "react-joyride";

export const adminSettingsSteps: Step[] = [
    {
        target: '[data-tour="admin-settings-header"]',
        title: "System Settings",
        content:
            "Configure integrations, announcements, and webhook connections for your platform.",
        skipBeacon: true,
    },
    {
        target: '[data-tour="admin-settings-tabs"]',
        title: "Settings Sections",
        content:
            "Switch between Announcement Bar, Square Connection, Location Mapping, and Webhooks.",
    },
    {
        target: '[data-tour="admin-settings-announcement"]',
        title: "Announcement Bar",
        content:
            "Enable a site-wide banner on the storefront. Set the message text and optionally link to a page.",
    },
    {
        target: '[data-tour="admin-settings-connection"]',
        title: "Square Integration",
        content:
            "Enter your Square API credentials and test the connection. Orders sync to Square for payment processing.",
    },
];
