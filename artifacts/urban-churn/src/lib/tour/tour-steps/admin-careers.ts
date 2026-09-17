import type { Step } from "react-joyride";

export const adminCareersSteps: Step[] = [
    {
        target: '[data-tour="admin-careers-header"]',
        title: "Careers",
        content:
            "The Careers section in the sidebar has Applications, Job Postings, and Benefits. Open Applications to review employment submissions.",
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
