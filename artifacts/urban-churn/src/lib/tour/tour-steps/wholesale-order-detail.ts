import type { Step } from "react-joyride";

export const wholesaleOrderDetailSteps: Step[] = [
    {
        target: '[data-tour="wholesale-order-detail-header"]',
        title: "Order Details",
        content:
            "Full details of your wholesale order — status, items, pricing, and delivery information.",
        skipBeacon: true,
    },
    {
        target: '[data-tour="wholesale-order-status"]',
        title: "Order Status",
        content:
            "Track where your order is in the process — from Pending Review to Confirmed to Delivered.",
    },
    {
        target: '[data-tour="wholesale-order-items"]',
        title: "Items & Pricing",
        content:
            "All the products you ordered with quantities and pricing breakdown.",
    },
    {
        target: '[data-tour="wholesale-order-delivery"]',
        title: "Delivery Info",
        content:
            "When and how your order will be delivered — delivery date, method, and any special instructions.",
    },
];
