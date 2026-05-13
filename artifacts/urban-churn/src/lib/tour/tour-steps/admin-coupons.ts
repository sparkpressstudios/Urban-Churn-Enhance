import type { Step } from "react-joyride";

export const adminCouponsSteps: Step[] = [
    {
        target: '[data-tour="admin-coupons-header"]',
        title: "Coupon Management",
        content:
            "Create and manage discount codes that customers can apply at checkout.",
        skipBeacon: true,
    },
    {
        target: '[data-tour="admin-coupons-table"]',
        title: "Coupons Table",
        content:
            "See every coupon code, its type (percentage or fixed), value, usage count vs. max, status, and expiration.",
    },
    {
        target: '[data-tour="admin-coupons-create"]',
        title: "Create Coupon",
        content:
            "Set the code, discount type, value, minimum order, max uses, expiration date, and active status.",
    },
];
