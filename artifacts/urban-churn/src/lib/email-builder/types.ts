import type { ComponentType } from "react";
import type { LucideIcon } from "lucide-react";

export interface EmailSection {
    id: string;
    type: string;
    props: Record<string, any>;
}

export interface EmailGlobalStyles {
    backgroundColor?: string;
    contentBackgroundColor?: string;
    fontFamily?: string;
    linkColor?: string;
    containerWidth?: number;
}

export interface EmailColumn {
    content?: string;
    width?: number;
}

export interface EmailDocument {
    version: 1;
    sections: EmailSection[];
    globalStyles?: EmailGlobalStyles;
}

export type EmailFieldType =
    | "text"
    | "textarea"
    | "richtext"
    | "number"
    | "toggle"
    | "select"
    | "color"
    | "image"
    | "list";

export interface EmailFieldDef {
    name: string;
    label: string;
    type: EmailFieldType;
    help?: string;
    placeholder?: string;
    options?: { label: string; value: string }[];
    min?: number;
    max?: number;
    itemFields?: EmailFieldDef[];
    addLabel?: string;
    itemDefault?: Record<string, any>;
    sortable?: boolean;
}

export interface EmailBlockDefinition {
    type: string;
    label: string;
    description?: string;
    icon: LucideIcon;
    category: "Layout" | "Content" | "Actions";
    defaultProps: Record<string, any>;
    fields: EmailFieldDef[];
    renderPreview: ComponentType<{ section: EmailSection }>;
}
