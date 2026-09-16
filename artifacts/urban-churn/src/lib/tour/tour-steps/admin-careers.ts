import type { Step } from "react-joyride";

export const adminCareersSteps: Step[] = [
    {
        target: '[data-tour="admin-careers-header"]',
        title: "Careers Management",
        content:
            "Review job applications, manage postings, and career page benefits displayed on the public careers page.",
        skipBeacon: true,
    },
    {
        target: '[data-tour="admin-careers-tabs"]',
        title: "Careers Sections",
        content:
            "Switch between Applications, Job Postings, and Benefits to review applicants and manage the careers page.",
    },
    {
        target: '[data-tour="admin-careers-create"]',
        title: "Create Posting",
        content:
            "Add a new job posting with title, locations, type, description, highlights, and status.",
    },
];
