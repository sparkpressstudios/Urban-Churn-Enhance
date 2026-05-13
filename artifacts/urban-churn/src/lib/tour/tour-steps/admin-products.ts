import type { Step } from "react-joyride";

export const adminProductsSteps: Step[] = [
  {
    target: '[data-tour="admin-products-header"]',
    title: "Product Catalog",
    content:
      "Manage your ice cream flavors, sizes, pricing, and how they appear on the customer-facing menu.",
    skipBeacon: true,
  },
  {
    target: '[data-tour="admin-products-tabs"]',
    title: "Catalog Sections",
    content:
      "Switch between All Products (flavors), Sizes (volume & price), and Menu Preview (customer view).",
  },
  {
    target: '[data-tour="admin-products-search"]',
    title: "Search Products",
    content:
      "Find any product by name. Use the checkboxes for bulk actions like deleting multiple products.",
  },
  {
    target: '[data-tour="admin-products-status"]',
    title: "Product Status",
    content:
      "Toggle products between Active and Inactive. Set a Hero position to feature a product prominently.",
  },
  {
    target: '[data-tour="admin-products-add"]',
    title: "Add a Product",
    content:
      "Create new flavors with images, descriptions, tags, pricing, and size variations.",
  },
];
