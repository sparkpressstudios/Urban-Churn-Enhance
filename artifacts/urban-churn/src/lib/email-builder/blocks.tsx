import {
    Type,
    Image,
    MousePointerClick,
    Minus,
    Columns2,
    PanelTop,
    PanelBottom,
    SeparatorHorizontal,
    Sparkles,
    Share2,
    ShoppingBag,
} from "lucide-react";
import type { EmailBlockDefinition, EmailSection } from "./types";

function TextPreview({ section }: { section: EmailSection }) {
    const content = section.props.content || "<p>Your text here</p>";
    return (
        <div
            className="px-6 py-4 text-sm leading-relaxed text-gray-700"
            dangerouslySetInnerHTML={{ __html: content }}
        />
    );
}

function HeaderPreview({ section }: { section: EmailSection }) {
    return (
        <div className="bg-[#0a0a0f] px-6 py-6 text-center text-white">
            {section.props.logoUrl ? (
                <img src={section.props.logoUrl} alt="" className="mx-auto max-h-12" />
            ) : (
                <div className="text-lg font-bold">{section.props.title || "Your Brand"}</div>
            )}
            {section.props.subtitle ? (
                <p className="mt-2 text-sm text-blue-300">{section.props.subtitle}</p>
            ) : null}
        </div>
    );
}

function ImagePreview({ section }: { section: EmailSection }) {
    if (!section.props.src) {
        return <div className="px-6 py-8 text-center text-sm text-gray-400">Add an image URL</div>;
    }
    return (
        <div className="px-6 py-4 text-center">
            <img src={section.props.src} alt={section.props.alt || ""} className="mx-auto max-w-full rounded" />
        </div>
    );
}

function ButtonPreview({ section }: { section: EmailSection }) {
    return (
        <div className="px-6 py-4 text-center">
            <span className="inline-block rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white">
                {section.props.label || "Click here"}
            </span>
        </div>
    );
}

function DividerPreview() {
    return <hr className="mx-6 my-2 border-gray-200" />;
}

function ColumnsPreview({ section }: { section: EmailSection }) {
    const cols = section.props.columns || [{ content: "" }, { content: "" }];
    const stackOnMobile = section.props.stackOnMobile !== false;
    const gap = section.props.gap ?? 16;
    return (
        <div
            className={`flex px-6 py-4 ${stackOnMobile ? "flex-col gap-4 md:flex-row" : "flex-row"}`}
            style={{ gap }}
        >
            {cols.map((col: { content?: string; width?: number }, i: number) => (
                <div
                    key={i}
                    className="min-w-0 flex-1 text-sm text-gray-700"
                    style={col.width ? { flexBasis: `${col.width}%` } : undefined}
                    dangerouslySetInnerHTML={{ __html: col.content || "<p>Column</p>" }}
                />
            ))}
        </div>
    );
}

function FooterPreview({ section }: { section: EmailSection }) {
    return (
        <div className="border-t px-6 py-4 text-center text-xs text-gray-400">
            <p>{section.props.companyName || "Your Company"}</p>
            {section.props.showUnsubscribe !== false ? <p className="mt-2 underline">Unsubscribe</p> : null}
        </div>
    );
}

function SpacerPreview({ section }: { section: EmailSection }) {
    return <div style={{ height: section.props.height || 24 }} />;
}

function HeroPreview({ section }: { section: EmailSection }) {
    return (
        <div>
            {section.props.imageUrl ? (
                <img src={section.props.imageUrl} alt="" className="w-full" />
            ) : null}
            <div
                className="px-6 py-8 text-center text-white"
                style={{ background: section.props.backgroundColor || "#2563eb" }}
            >
                <h2 className="text-2xl font-bold">{section.props.title || "Hero headline"}</h2>
                {section.props.subtitle ? (
                    <p className="mt-2 text-sm opacity-90">{section.props.subtitle}</p>
                ) : null}
                {section.props.buttonLabel ? (
                    <span className="mt-4 inline-block rounded-lg bg-white px-5 py-2 text-sm font-semibold text-blue-600">
                        {section.props.buttonLabel}
                    </span>
                ) : null}
            </div>
        </div>
    );
}

function SocialPreview({ section }: { section: EmailSection }) {
    const links = section.props.links || [];
    return (
        <div className="flex justify-center gap-4 px-6 py-4">
            {links.length ? (
                links.map((l: { label?: string; url?: string }, i: number) => (
                    <span key={i} className="text-sm text-blue-600 underline">
                        {l.label || l.url || "Link"}
                    </span>
                ))
            ) : (
                <span className="text-sm text-gray-400">Add social links</span>
            )}
        </div>
    );
}

function ProductCardPreview({ section }: { section: EmailSection }) {
    return (
        <div className="mx-6 my-4 flex gap-4 rounded-lg border p-4">
            {section.props.imageUrl ? (
                <img src={section.props.imageUrl} alt="" className="h-24 w-24 rounded object-cover" />
            ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded bg-gray-100 text-gray-400">
                    <ShoppingBag className="h-8 w-8" />
                </div>
            )}
            <div>
                <p className="font-semibold">{section.props.title || "Product name"}</p>
                {section.props.description ? (
                    <p className="mt-1 text-sm text-gray-500">{section.props.description}</p>
                ) : null}
                {section.props.price ? (
                    <p className="mt-2 font-bold text-blue-600">{section.props.price}</p>
                ) : null}
            </div>
        </div>
    );
}

export const EMAIL_BLOCK_DEFINITIONS: EmailBlockDefinition[] = [
    {
        type: "emailHero",
        label: "Hero",
        description: "Large banner with headline and CTA",
        icon: Sparkles,
        category: "Content",
        defaultProps: {
            title: "Big announcement",
            subtitle: "Tell your audience something exciting",
            imageUrl: "",
            backgroundColor: "#2563eb",
            titleColor: "#ffffff",
            subtitleColor: "#e0e7ff",
            buttonLabel: "Learn more",
            buttonHref: "#",
            buttonBg: "#ffffff",
            buttonColor: "#2563eb",
        },
        fields: [
            { name: "title", label: "Headline", type: "text" },
            { name: "subtitle", label: "Subtitle", type: "text" },
            { name: "imageUrl", label: "Background image", type: "image" },
            { name: "backgroundColor", label: "Background color", type: "color" },
            { name: "titleColor", label: "Headline color", type: "color" },
            { name: "subtitleColor", label: "Subtitle color", type: "color" },
            { name: "titleSize", label: "Headline size (px)", type: "number", min: 18, max: 48 },
            { name: "paddingTop", label: "Padding top (px)", type: "number", min: 0, max: 80 },
            { name: "paddingBottom", label: "Padding bottom (px)", type: "number", min: 0, max: 80 },
            { name: "minHeight", label: "Min height (px)", type: "number", min: 0, max: 400 },
            { name: "buttonLabel", label: "Button label", type: "text" },
            { name: "buttonHref", label: "Button URL", type: "text" },
            { name: "buttonBg", label: "Button background", type: "color" },
            { name: "buttonColor", label: "Button text color", type: "color" },
        ],
        renderPreview: HeroPreview,
    },
    {
        type: "emailHeader",
        label: "Header",
        description: "Logo and title bar",
        icon: PanelTop,
        category: "Layout",
        defaultProps: {
            title: "Your Brand",
            subtitle: "",
            logoUrl: "",
            backgroundColor: "#0a0a0f",
            titleColor: "#ffffff",
            subtitleColor: "#60a5fa",
            logoMaxHeight: 48,
            paddingY: 24,
            paddingX: 24,
            roundTopCorners: true,
        },
        fields: [
            { name: "backgroundColor", label: "Background color", type: "color" },
            { name: "titleColor", label: "Title color", type: "color" },
            { name: "subtitleColor", label: "Subtitle color", type: "color" },
            { name: "title", label: "Title", type: "text" },
            { name: "subtitle", label: "Subtitle", type: "text" },
            { name: "logoUrl", label: "Logo URL", type: "image" },
            { name: "logoMaxHeight", label: "Logo max height (px)", type: "number", min: 24, max: 120 },
            { name: "paddingY", label: "Padding vertical (px)", type: "number", min: 8, max: 64 },
            { name: "paddingX", label: "Padding horizontal (px)", type: "number", min: 8, max: 64 },
            {
                name: "roundTopCorners",
                label: "Round top corners",
                type: "toggle",
                help: "Rounds the top corners to match the email container.",
            },
        ],
        renderPreview: HeaderPreview,
    },
    {
        type: "emailText",
        label: "Text",
        description: "Rich text paragraph",
        icon: Type,
        category: "Content",
        defaultProps: {
            content: "<p>Hi {{{contact.first_name|there}}},</p><p>Write your message here.</p>",
            fontSize: 16,
            color: "#374151",
            align: "left",
            lineHeight: 1.6,
            backgroundColor: "",
            paddingY: 16,
            paddingX: 24,
        },
        fields: [
            { name: "content", label: "Content", type: "richtext" },
            { name: "fontSize", label: "Font size", type: "number", min: 12, max: 32 },
            { name: "lineHeight", label: "Line height", type: "number", min: 1, max: 2.5 },
            { name: "color", label: "Text color", type: "color" },
            { name: "backgroundColor", label: "Background color", type: "color" },
            { name: "paddingY", label: "Padding vertical (px)", type: "number", min: 0, max: 64 },
            { name: "paddingX", label: "Padding horizontal (px)", type: "number", min: 0, max: 64 },
            {
                name: "align",
                label: "Alignment",
                type: "select",
                options: [
                    { label: "Left", value: "left" },
                    { label: "Center", value: "center" },
                    { label: "Right", value: "right" },
                ],
            },
        ],
        renderPreview: TextPreview,
    },
    {
        type: "emailImage",
        label: "Image",
        description: "Full-width image",
        icon: Image,
        category: "Content",
        defaultProps: {
            src: "",
            alt: "",
            href: "",
            align: "center",
            width: 0,
            borderRadius: 0,
            caption: "",
            backgroundColor: "",
            paddingY: 16,
            paddingX: 24,
        },
        fields: [
            { name: "src", label: "Image URL", type: "image" },
            { name: "alt", label: "Alt text", type: "text" },
            { name: "href", label: "Link URL", type: "text" },
            { name: "caption", label: "Caption", type: "text" },
            { name: "width", label: "Max width (px, 0 = full)", type: "number", min: 0, max: 600 },
            { name: "borderRadius", label: "Border radius (px)", type: "number", min: 0, max: 32 },
            { name: "backgroundColor", label: "Background color", type: "color" },
            { name: "paddingY", label: "Padding vertical (px)", type: "number", min: 0, max: 64 },
            { name: "paddingX", label: "Padding horizontal (px)", type: "number", min: 0, max: 64 },
            {
                name: "align",
                label: "Alignment",
                type: "select",
                options: [
                    { label: "Left", value: "left" },
                    { label: "Center", value: "center" },
                    { label: "Right", value: "right" },
                ],
            },
        ],
        renderPreview: ImagePreview,
    },
    {
        type: "emailButton",
        label: "Button",
        description: "Call-to-action button",
        icon: MousePointerClick,
        category: "Actions",
        defaultProps: {
            label: "Click here",
            href: "#",
            backgroundColor: "#2563eb",
            textColor: "#ffffff",
            align: "center",
            borderRadius: 8,
            fullWidth: false,
            paddingY: 12,
            paddingX: 24,
        },
        fields: [
            { name: "label", label: "Label", type: "text" },
            { name: "href", label: "Link URL", type: "text" },
            { name: "backgroundColor", label: "Background", type: "color" },
            { name: "textColor", label: "Text color", type: "color" },
            { name: "borderRadius", label: "Border radius (px)", type: "number", min: 0, max: 32 },
            { name: "paddingY", label: "Padding vertical (px)", type: "number", min: 4, max: 32 },
            { name: "paddingX", label: "Padding horizontal (px)", type: "number", min: 8, max: 64 },
            { name: "fullWidth", label: "Full width button", type: "toggle" },
            {
                name: "align",
                label: "Alignment",
                type: "select",
                options: [
                    { label: "Left", value: "left" },
                    { label: "Center", value: "center" },
                    { label: "Right", value: "right" },
                ],
            },
        ],
        renderPreview: ButtonPreview,
    },
    {
        type: "emailDivider",
        label: "Divider",
        description: "Horizontal line",
        icon: Minus,
        category: "Layout",
        defaultProps: { color: "#e5e7eb", thickness: 1 },
        fields: [
            { name: "color", label: "Color", type: "color" },
            { name: "thickness", label: "Thickness (px)", type: "number", min: 1, max: 8 },
        ],
        renderPreview: DividerPreview,
    },
    {
        type: "emailColumns",
        label: "Columns / Row",
        description: "Flexible side-by-side columns that stack on mobile",
        icon: Columns2,
        category: "Layout",
        defaultProps: {
            columns: [
                { content: "<p>Left column</p>", width: 50 },
                { content: "<p>Right column</p>", width: 50 },
            ],
            stackOnMobile: true,
            gap: 16,
            verticalAlign: "top",
            backgroundColor: "",
            paddingY: 8,
            paddingX: 16,
        },
        fields: [
            { name: "backgroundColor", label: "Section background", type: "color" },
            { name: "paddingY", label: "Padding vertical (px)", type: "number", min: 0, max: 64 },
            { name: "paddingX", label: "Padding horizontal (px)", type: "number", min: 0, max: 64 },
            {
                name: "stackOnMobile",
                label: "Stack columns on mobile",
                type: "toggle",
                help: "Columns stack vertically on narrow screens for better readability.",
            },
            { name: "gap", label: "Column gap (px)", type: "number", min: 0, max: 48 },
            {
                name: "verticalAlign",
                label: "Vertical alignment",
                type: "select",
                options: [
                    { label: "Top", value: "top" },
                    { label: "Middle", value: "middle" },
                    { label: "Bottom", value: "bottom" },
                ],
            },
            {
                name: "columns",
                label: "Columns",
                type: "list",
                sortable: true,
                addLabel: "Add column",
                itemDefault: { content: "<p>Column</p>" },
                itemFields: [
                    { name: "content", label: "Content", type: "richtext" },
                    { name: "width", label: "Width % (optional)", type: "number", min: 10, max: 100 },
                    { name: "backgroundColor", label: "Background color", type: "color" },
                    { name: "padding", label: "Padding (px)", type: "number", min: 0, max: 48 },
                ],
            },
        ],
        renderPreview: ColumnsPreview,
    },
    {
        type: "emailSpacer",
        label: "Spacer",
        description: "Vertical spacing",
        icon: SeparatorHorizontal,
        category: "Layout",
        defaultProps: { height: 24, backgroundColor: "" },
        fields: [
            { name: "height", label: "Height (px)", type: "number", min: 8, max: 120 },
            { name: "backgroundColor", label: "Background color", type: "color" },
        ],
        renderPreview: SpacerPreview,
    },
    {
        type: "emailProductCard",
        label: "Product Card",
        description: "Product image, title, price, and CTA",
        icon: ShoppingBag,
        category: "Content",
        defaultProps: {
            title: "Product name",
            description: "Short product description",
            price: "$29.99",
            imageUrl: "",
            buttonLabel: "Shop now",
            buttonHref: "#",
            imagePosition: "left",
            backgroundColor: "#ffffff",
            borderColor: "#e5e7eb",
            priceColor: "#2563eb",
            buttonBg: "#2563eb",
            buttonColor: "#ffffff",
            paddingY: 16,
            paddingX: 24,
        },
        fields: [
            { name: "title", label: "Title", type: "text" },
            { name: "description", label: "Description", type: "textarea" },
            { name: "price", label: "Price", type: "text" },
            { name: "priceColor", label: "Price color", type: "color" },
            { name: "imageUrl", label: "Image", type: "image" },
            {
                name: "imagePosition",
                label: "Image position",
                type: "select",
                options: [
                    { label: "Left", value: "left" },
                    { label: "Top", value: "top" },
                ],
            },
            { name: "backgroundColor", label: "Card background", type: "color" },
            { name: "borderColor", label: "Border color", type: "color" },
            { name: "buttonLabel", label: "Button label", type: "text" },
            { name: "buttonHref", label: "Button URL", type: "text" },
            { name: "buttonBg", label: "Button background", type: "color" },
            { name: "buttonColor", label: "Button text color", type: "color" },
            { name: "paddingY", label: "Padding vertical (px)", type: "number", min: 0, max: 64 },
            { name: "paddingX", label: "Padding horizontal (px)", type: "number", min: 0, max: 64 },
        ],
        renderPreview: ProductCardPreview,
    },
    {
        type: "emailSocial",
        label: "Social Links",
        description: "Row of social media links",
        icon: Share2,
        category: "Actions",
        defaultProps: {
            links: [
                { label: "Facebook", url: "https://facebook.com", platform: "facebook" },
                { label: "Instagram", url: "https://instagram.com", platform: "instagram" },
            ],
            align: "center",
            displayMode: "icons",
            linkColor: "#2563eb",
            iconSize: 36,
            iconSpacing: 8,
            paddingY: 20,
            paddingX: 24,
        },
        fields: [
            {
                name: "displayMode",
                label: "Display mode",
                type: "select",
                options: [
                    { label: "Icons", value: "icons" },
                    { label: "Text links", value: "text" },
                ],
            },
            {
                name: "align",
                label: "Alignment",
                type: "select",
                options: [
                    { label: "Left", value: "left" },
                    { label: "Center", value: "center" },
                    { label: "Right", value: "right" },
                ],
            },
            { name: "linkColor", label: "Link color (text mode)", type: "color" },
            { name: "iconSize", label: "Icon size (px)", type: "number", min: 24, max: 56 },
            { name: "iconSpacing", label: "Icon spacing (px)", type: "number", min: 0, max: 32 },
            { name: "paddingY", label: "Padding vertical (px)", type: "number", min: 0, max: 64 },
            { name: "paddingX", label: "Padding horizontal (px)", type: "number", min: 0, max: 64 },
            {
                name: "links",
                label: "Links",
                type: "list",
                sortable: true,
                addLabel: "Add link",
                itemDefault: { label: "Link", url: "https://", platform: "custom" },
                itemFields: [
                    {
                        name: "platform",
                        label: "Platform",
                        type: "select",
                        options: [
                            { label: "Facebook", value: "facebook" },
                            { label: "Instagram", value: "instagram" },
                            { label: "X / Twitter", value: "twitter" },
                            { label: "LinkedIn", value: "linkedin" },
                            { label: "YouTube", value: "youtube" },
                            { label: "TikTok", value: "tiktok" },
                            { label: "Pinterest", value: "pinterest" },
                            { label: "Custom", value: "custom" },
                        ],
                    },
                    { name: "label", label: "Label", type: "text" },
                    { name: "url", label: "URL", type: "text" },
                ],
            },
        ],
        renderPreview: SocialPreview,
    },
    {
        type: "emailFooter",
        label: "Footer",
        description: "Company info and unsubscribe",
        icon: PanelBottom,
        category: "Layout",
        defaultProps: {
            companyName: "",
            address: "",
            showUnsubscribe: true,
            extraText: "",
            backgroundColor: "",
            textColor: "#9ca3af",
            borderColor: "#e5e7eb",
            fontSize: 12,
            paddingY: 24,
            paddingX: 24,
            unsubscribeText: "Unsubscribe",
        },
        fields: [
            { name: "backgroundColor", label: "Background color", type: "color" },
            { name: "textColor", label: "Text color", type: "color" },
            { name: "borderColor", label: "Top border color", type: "color" },
            { name: "fontSize", label: "Font size (px)", type: "number", min: 10, max: 18 },
            { name: "paddingY", label: "Padding vertical (px)", type: "number", min: 8, max: 64 },
            { name: "paddingX", label: "Padding horizontal (px)", type: "number", min: 8, max: 64 },
            { name: "companyName", label: "Company name", type: "text" },
            { name: "address", label: "Address", type: "text" },
            { name: "showUnsubscribe", label: "Show unsubscribe link", type: "toggle" },
            { name: "unsubscribeText", label: "Unsubscribe link text", type: "text" },
            { name: "extraText", label: "Extra text", type: "text" },
        ],
        renderPreview: FooterPreview,
    },
];

export function getEmailBlockDef(type: string): EmailBlockDefinition | undefined {
    return EMAIL_BLOCK_DEFINITIONS.find((d) => d.type === type);
}
