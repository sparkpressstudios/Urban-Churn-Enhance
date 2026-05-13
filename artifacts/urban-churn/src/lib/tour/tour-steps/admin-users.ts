import type { Step } from "react-joyride";

export const adminUsersSteps: Step[] = [
    {
        target: '[data-tour="admin-users-header"]',
        title: "Admin Users",
        content:
            "Manage who has access to this dashboard. Assign roles and restrict staff to specific locations.",
        skipBeacon: true,
    },
    {
        target: '[data-tour="admin-users-table"]',
        title: "Users Table",
        content:
            "See each user's username, role (Admin/Manager/Staff), assigned location, and creation date.",
    },
    {
        target: '[data-tour="admin-users-create"]',
        title: "Create User",
        content:
            "Add a new dashboard user. Admins see everything, Managers see all locations, Staff are locked to their assigned location.",
    },
];
