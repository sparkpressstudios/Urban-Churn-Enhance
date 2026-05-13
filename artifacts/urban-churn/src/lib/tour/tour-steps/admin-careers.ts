import type { Step } from "react-joyride";

export const adminCareersSteps: Step[] = [
    {
        target: '[data-tour="admin-careers-header"]',
        title: "Careers Management",
        content:
            "Manage job postings and career page benefits displayed on the public careers page.",
        skipBeacon: true,
    },
    {
        target: '[data-tour="admin-careers-tabs"]',
        title: "Careers Sections",
        content:
            "Switch between Job Postings and Benefits to manage each independently.",
    },
    {
        target: '[data-tour="admin-careers-create"]',
        title: "Create Posting",
        content:
            "Add a new job posting with title, locations, type, description, highlights, and status.",
    },
];
