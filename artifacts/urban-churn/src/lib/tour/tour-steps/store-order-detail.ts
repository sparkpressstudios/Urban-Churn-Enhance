import type { Step } from "react-joyride";

export const storeOrderDetailSteps: Step[] = [
    {
        target: '[data-tour="store-order-detail-header"]',
        title: "Order Details",
        content:
            "Complete view of this order — customer info, items, and all actions you can take.",
        skipBeacon: true,
    },
    {
        target: '[data-tour="store-order-customer"]',
        title: "Customer Info",
        content:
            "Contact details and order history for this customer. Use this to follow up if needed.",
    },
    {
        target: '[data-tour="store-order-items"]',
        title: "Order Items",
        content:
            "All items in this order with quantities. Use the pickup controls to mark individual items.",
    },
    {
        target: '[data-tour="store-order-notes"]',
        title: "Notes",
        content:
            "Add internal notes for the team. Notes are visible to all staff on this order.",
    },
    {
        target: '[data-tour="store-order-actions"]',
        title: "Actions",
        content:
            "Update the order status, mark as ready for pickup, or process the order from here.",
    },
];
