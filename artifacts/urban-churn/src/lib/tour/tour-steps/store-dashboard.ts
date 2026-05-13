import type { Step } from "react-joyride";

export const storeDashboardSteps = (role: string): Step[] => {
    const steps: Step[] = [
        {
            target: '[data-tour="store-dashboard-header"]',
            title: "Welcome to Your Store Dashboard",
            content:
                "Real-time order management for your location. See at a glance what's pending, confirmed, ready, and completed.",
            skipBeacon: true,
        },
    ];

    // Only admin/manager can switch locations
    if (role === "admin" || role === "manager") {
        steps.push({
            target: '[data-tour="store-location-switcher"]',
            title: "Location Selector",
            content:
                "Switch between locations or view All Locations at once. Your selection persists across sessions.",
        });
    }

    steps.push(
        {
            target: '[data-tour="store-status-cards"]',
            title: "Order Status Cards",
            content:
                "Five status buckets: Pending, Confirmed, Ready, Partial, and Completed. Numbers update every 30 seconds.",
        },
        {
            target: '[data-tour="store-stock-overview"]',
            title: "Stock Overview",
            content:
                "See current inventory levels at your location so you know what's available for walk-in customers.",
        },
    );

    return steps;
};
