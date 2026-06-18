import { createBlankEmailDocument, type EmailDocument } from "@workspace/email-compiler";

export type EmailTemplateStarter = {
    id: string;
    name: string;
    description: string;
    document: EmailDocument;
};

export const EMAIL_TEMPLATE_STARTERS: EmailTemplateStarter[] = [
    {
        id: "blank",
        name: "Blank",
        description: "Header, text, and footer — start from scratch.",
        document: createBlankEmailDocument(),
    },
    {
        id: "newsletter",
        name: "Newsletter",
        description: "Hero, two-column content, and social links.",
        document: {
            version: 1,
            globalStyles: {
                backgroundColor: "#f3f4f6",
                contentBackgroundColor: "#ffffff",
                containerWidth: 600,
                linkColor: "#A1AB74",
                fontFamily: "Arial, Helvetica, sans-serif",
            },
            sections: [
                {
                    id: "hdr-1",
                    type: "emailHeader",
                    props: { title: "Your Brand", subtitle: "Monthly update", logoUrl: "" },
                },
                {
                    id: "hero-1",
                    type: "emailHero",
                    props: {
                        title: "What's new this month",
                        subtitle: "Highlights, updates, and offers for your subscribers.",
                        backgroundColor: "#2563eb",
                        buttonLabel: "Read more",
                        buttonHref: "#",
                    },
                },
                {
                    id: "cols-1",
                    type: "emailColumns",
                    props: {
                        columns: [
                            { content: "<p><strong>Feature one</strong></p><p>Share your latest news here.</p>", width: 50 },
                            { content: "<p><strong>Feature two</strong></p><p>Add another highlight column.</p>", width: 50 },
                        ],
                        stackOnMobile: true,
                        gap: 16,
                    },
                },
                {
                    id: "social-1",
                    type: "emailSocial",
                    props: {
                        links: [
                            { label: "Website", url: "https://urbanchurn.com" },
                            { label: "LinkedIn", url: "https://linkedin.com" },
                        ],
                    },
                },
                {
                    id: "ftr-1",
                    type: "emailFooter",
                    props: { showUnsubscribe: true, companyName: "Your Company" },
                },
            ],
        },
    },
    {
        id: "promotion",
        name: "Promotion",
        description: "Bold hero with product card and CTA button.",
        document: {
            version: 1,
            globalStyles: {
                backgroundColor: "#f3f4f6",
                contentBackgroundColor: "#ffffff",
                containerWidth: 600,
                linkColor: "#A1AB74",
            },
            sections: [
                {
                    id: "hero-1",
                    type: "emailHero",
                    props: {
                        title: "Limited-time offer",
                        subtitle: "Save 20% through the end of the month.",
                        backgroundColor: "#0f172a",
                        buttonLabel: "Shop now",
                        buttonHref: "#",
                    },
                },
                {
                    id: "txt-1",
                    type: "emailText",
                    props: {
                        content: "<p>Hi {{{contact.first_name|there}}},</p><p>Don't miss this exclusive deal for our subscribers.</p>",
                    },
                },
                {
                    id: "prod-1",
                    type: "emailProductCard",
                    props: {
                        title: "Featured product",
                        description: "Describe your offer or product here.",
                        price: "$99",
                        buttonLabel: "Get offer",
                        buttonHref: "#",
                    },
                },
                {
                    id: "btn-1",
                    type: "emailButton",
                    props: { label: "Claim your discount", href: "#", backgroundColor: "#2563eb" },
                },
                {
                    id: "ftr-1",
                    type: "emailFooter",
                    props: { showUnsubscribe: true },
                },
            ],
        },
    },
    {
        id: "announcement",
        name: "Announcement",
        description: "Simple text-focused update with a single CTA.",
        document: {
            version: 1,
            sections: [
                {
                    id: "hdr-1",
                    type: "emailHeader",
                    props: { title: "Important update" },
                },
                {
                    id: "txt-1",
                    type: "emailText",
                    props: {
                        content: "<p>Hi {{{contact.first_name|there}}},</p><p>We have an important announcement to share with you.</p><p>Replace this text with your message.</p>",
                    },
                },
                {
                    id: "btn-1",
                    type: "emailButton",
                    props: { label: "Learn more", href: "#" },
                },
                {
                    id: "ftr-1",
                    type: "emailFooter",
                    props: { showUnsubscribe: true },
                },
            ],
        },
    },
];
