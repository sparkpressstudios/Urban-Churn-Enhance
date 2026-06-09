export interface EmailMergeTag {
    label: string;
    tag: string;
    description?: string;
}

/** Resend broadcast personalization tags synced from email contacts. */
export const EMAIL_MERGE_TAGS: EmailMergeTag[] = [
    {
        label: "First name",
        tag: "{{{contact.first_name|there}}}",
        description: "Contact first name, or “there” if empty",
    },
    {
        label: "Last name",
        tag: "{{{contact.last_name}}}",
        description: "Contact last name",
    },
    {
        label: "Full name",
        tag: "{{{contact.first_name}}} {{{contact.last_name}}}",
        description: "First and last name together",
    },
    {
        label: "Email",
        tag: "{{{contact.email}}}",
        description: "Contact email address",
    },
    {
        label: "Phone",
        tag: "{{{contact.phone}}}",
        description: "Contact phone number",
    },
    {
        label: "City",
        tag: "{{{contact.city}}}",
        description: "Contact city",
    },
    {
        label: "State",
        tag: "{{{contact.state}}}",
        description: "Contact state / province",
    },
];

export function insertAtCursor(
    value: string,
    insertion: string,
    selectionStart?: number,
    selectionEnd?: number,
): { next: string; cursor: number } {
    const start = selectionStart ?? value.length;
    const end = selectionEnd ?? start;
    const next = value.slice(0, start) + insertion + value.slice(end);
    const cursor = start + insertion.length;
    return { next, cursor };
}
