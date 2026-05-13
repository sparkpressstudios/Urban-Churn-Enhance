import type { Step } from "react-joyride";

export const customerAccountSteps: Step[] = [
    {
        target: '[data-tour="customer-account-header"]',
        title: "Welcome to Your Account",
        content:
            "Manage your orders, event tickets, and personal information all in one place.",
        skipBeacon: true,
    },
    {
        target: '[data-tour="customer-quick-actions"]',
        title: "Quick Actions",
        content:
            "Shortcuts to place a new order, browse the menu, or find a location near you.",
    },
    {
        target: '[data-tour="customer-account-tabs"]',
        title: "Account Sections",
        content:
            "Switch between Bakery Orders, Ice Cream orders, Events, and your Profile to find what you need.",
    },
    {
        target: '[data-tour="customer-bakery-tab"]',
        title: "Bakery Orders",
        content:
            "Track your custom cake and bakery orders — see status, pickup details, and order history.",
    },
    {
        target: '[data-tour="customer-icecream-tab"]',
        title: "Ice Cream Orders",
        content:
            "View your pre-order and pickup history for ice cream flavors.",
    },
    {
        target: '[data-tour="customer-events-tab"]',
        title: "Events",
        content:
            "See your upcoming event tickets and past events you've attended.",
    },
    {
        target: '[data-tour="customer-profile-tab"]',
        title: "Profile",
        content:
            "Update your personal info, delivery address, and password from this tab.",
    },
];
