import type { Step } from "react-joyride";

export const wholesaleNewOrderSteps: Step[] = [
    {
        target: '[data-tour="wholesale-order-form"]',
        title: "Place Your Order",
        content:
            "Browse available products, set quantities, and submit your order. We'll confirm and schedule delivery.",
        skipBeacon: true,
    },
    {
        target: '[data-tour="wholesale-product-sections"]',
        title: "Product Sections",
        content:
            "Products are organized by size — 3 Gallon, Half Gallon, and Pint. Scroll through each section to find what you need.",
    },
    {
        target: '[data-tour="wholesale-quantity-controls"]',
        title: "Quantity Controls",
        content:
            "Use the + and − buttons to adjust quantities. Your order summary updates automatically.",
    },
    {
        target: '[data-tour="wholesale-custom-flavour"]',
        title: "Custom Flavour Request",
        content:
            "Need a flavor not listed? Describe it here and our team will follow up.",
    },
    {
        target: '[data-tour="wholesale-delivery-method"]',
        title: "Delivery Method",
        content:
            "Choose between delivery to your location or pickup from ours.",
    },
    {
        target: '[data-tour="wholesale-date-picker"]',
        title: "Select a Date",
        content:
            "Choose your delivery or pickup date. Please allow at least 3 business days for processing.",
    },
    {
        target: '[data-tour="wholesale-order-summary"]',
        title: "Order Summary",
        content:
            "Review your selections and totals before submitting. The summary stays visible as you scroll.",
    },
];
