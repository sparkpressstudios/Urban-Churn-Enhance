import type { Step } from "react-joyride";

export const adminLocationsSteps: Step[] = [
    {
        target: '[data-tour="admin-locations-header"]',
        title: "Locations",
        content:
            "Manage your physical storefronts and digital locations. Each location has its own hours, address, and branding.",
        skipBeacon: true,
    },
    {
        target: '[data-tour="admin-locations-grid"]',
        title: "Location Cards",
        content:
            "Each card shows the store name, address, phone, and operating hours at a glance.",
    },
    {
        target: '[data-tour="admin-locations-add"]',
        title: "Add Location",
        content:
            "Create a new location with address, phone, map link, accent color, and per-day operating hours.",
    },
];
