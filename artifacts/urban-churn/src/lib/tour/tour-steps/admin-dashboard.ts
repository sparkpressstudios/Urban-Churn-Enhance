import type { Step } from "react-joyride";

export const adminDashboardSteps: Step[] = [
    {
        target: '[data-tour="admin-dashboard-header"]',
        title: "Welcome to Your Dashboard",
        content:
            "This is your analytics hub. Get a bird's-eye view of orders, revenue, and top products across all locations.",
        skipBeacon: true,
    },
    {
        target: '[data-tour="admin-period-selector"]',
        title: "Time Period",
        content:
            "Switch between recent windows (7, 30, or 90 days) or pick any month from this year. All stats, charts, and tables update to reflect the selected period.",
    },
    {
        target: '[data-tour="admin-export-btn"]',
        title: "Export Data",
        content:
            "Download a CSV of all orders for offline analysis or reporting.",
    },
    {
        target: '[data-tour="admin-stat-cards"]',
        title: "Key Metrics",
        content:
            "At a glance: Total Orders, Revenue, Average Order Value, and Pending Orders. These update with the period selector.",
    },
    {
        target: '[data-tour="admin-revenue-chart"]',
        title: "Revenue Over Time",
        content:
            "Track daily revenue trends. Hover over any point to see exact figures for that day.",
    },
    {
        target: '[data-tour="admin-location-chart"]',
        title: "Orders by Location",
        content:
            "See how orders are distributed across your locations. Useful for spotting high-performing stores.",
    },
    {
        target: '[data-tour="admin-top-products"]',
        title: "Top Products",
        content:
            "Your best-selling flavors and products ranked by order volume.",
    },
    {
        target: '[data-tour="admin-recent-orders"]',
        title: "Recent Orders",
        content:
            "Quick access to the 10 most recent orders with status badges. Click any order to view details.",
    },
];
