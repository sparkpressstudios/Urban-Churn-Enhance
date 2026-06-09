import type { EmailDocument, EmailSection } from "./types";
import { getEmailBlockDef } from "./blocks";

function genId(): string {
    return `blk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createEmailSection(type: string): EmailSection | null {
    const def = getEmailBlockDef(type);
    if (!def) return null;
    return {
        id: genId(),
        type,
        props: structuredClone(def.defaultProps),
    };
}

export function findEmailSectionById(doc: EmailDocument, id: string): EmailSection | null {
    return doc.sections.find((s) => s.id === id) ?? null;
}

export function updateEmailSectionProps(
    doc: EmailDocument,
    id: string,
    updater: (props: Record<string, any>) => Record<string, any>,
): EmailDocument {
    return {
        ...doc,
        sections: doc.sections.map((s) =>
            s.id === id ? { ...s, props: updater({ ...s.props }) } : s,
        ),
    };
}

export function insertEmailSection(
    doc: EmailDocument,
    index: number,
    section: EmailSection,
): EmailDocument {
    const sections = [...doc.sections];
    sections.splice(index, 0, section);
    return { ...doc, sections };
}

export function removeEmailSection(doc: EmailDocument, id: string): EmailDocument {
    return { ...doc, sections: doc.sections.filter((s) => s.id !== id) };
}

export function moveEmailSection(doc: EmailDocument, id: string, toIndex: number): EmailDocument {
    const sections = [...doc.sections];
    const fromIndex = sections.findIndex((s) => s.id === id);
    if (fromIndex < 0) return doc;
    const [item] = sections.splice(fromIndex, 1);
    sections.splice(toIndex, 0, item);
    return { ...doc, sections };
}

export function duplicateEmailSection(doc: EmailDocument, id: string): { doc: EmailDocument; newId: string | null } {
    const section = findEmailSectionById(doc, id);
    if (!section) return { doc, newId: null };
    const copy: EmailSection = {
        id: genId(),
        type: section.type,
        props: structuredClone(section.props),
    };
    const index = doc.sections.findIndex((s) => s.id === id);
    return { doc: insertEmailSection(doc, index + 1, copy), newId: copy.id };
}
