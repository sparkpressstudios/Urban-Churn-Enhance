import type { Step } from "react-joyride";

export const adminWholesaleSteps: Step[] = [
    {
        target: '[data-tour="admin-wholesale-header"]',
        title: "Wholesale Management",
        content:
            "Handle wholesale orders end-to-end — from AI-parsed email orders to production and delivery.",
        skipBeacon: true,
    },
    {
        target: '[data-tour="admin-wholesale-tabs"]',
        title: "Management Tabs",
        content:
            "Switch between Dashboard, Orders, Customers, Products, Production, Deliveries, and Email Log.",
    },
    {
        target: '[data-tour="admin-wholesale-stats"]',
        title: "Wholesale Stats",
        content:
            "Key metrics: Pending Review, In Production, Deliveries This Week, and Unmatched Items at a glance.",
    },
    {
        target: '[data-tour="admin-wholesale-confidence"]',
        title: "AI Confidence Scores",
        content:
            "Each AI-parsed order shows a confidence score: Green (90%+) means high accuracy, Yellow (70-89%) needs review, Red (<70%) likely needs manual correction.",
    },
    {
        target: '[data-tour="admin-wholesale-flow"]',
        title: "How It Works",
        content:
            "Expand this panel anytime for the full workflow: Customer emails order → Resend receives it → AI parses items → You review & confirm → Schedule delivery.",
    },
];
