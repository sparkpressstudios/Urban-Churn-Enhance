import type { Step } from "react-joyride";

export const adminRotatingFlavoursSteps: Step[] = [
    {
        target: '[data-tour="admin-rotating-header"]',
        title: "Rotating Flavors",
        content:
            "Manage the monthly rotating flavor showcase that appears on the storefront.",
        skipBeacon: true,
    },
    {
        target: '[data-tour="admin-rotating-filters"]',
        title: "Month & Year Filter",
        content:
            "Select a month and year to view or manage that period's featured flavors.",
    },
    {
        target: '[data-tour="admin-rotating-table"]',
        title: "Flavors Table",
        content:
            "Each row shows the flavor image, name, month/year, sort order, and status. Edit or delete from here.",
    },
    {
        target: '[data-tour="admin-rotating-create"]',
        title: "Add Rotating Flavor",
        content:
            "Create a new featured flavor entry with name, description, image, month/year, and sort order.",
    },
];
