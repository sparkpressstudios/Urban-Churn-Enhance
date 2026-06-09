import { useCallback, useMemo, useRef, useState } from "react";
import type { EmailDocument } from "@/lib/email-builder";
import {
    createEmailSection,
    duplicateEmailSection,
    insertEmailSection,
    moveEmailSection,
    removeEmailSection,
    updateEmailSectionProps,
} from "@/lib/email-builder/doc-utils";

const HISTORY_LIMIT = 60;

export interface EmailEditorApi {
    doc: EmailDocument;
    selectedId: string | null;
    dirty: boolean;
    canUndo: boolean;
    canRedo: boolean;
    select: (id: string | null) => void;
    setDoc: (doc: EmailDocument, opts?: { markClean?: boolean }) => void;
    markClean: () => void;
    updateProps: (id: string, updater: (props: Record<string, any>) => Record<string, any>) => void;
    addBlock: (type: string, index?: number) => string | null;
    removeBlock: (id: string) => void;
    duplicateBlock: (id: string) => void;
    moveBlock: (id: string, toIndex: number) => void;
    undo: () => void;
    redo: () => void;
}

export function useEmailEditor(initial: EmailDocument): EmailEditorApi {
    const [doc, setDocState] = useState<EmailDocument>(initial);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [dirty, setDirty] = useState(false);

    const past = useRef<EmailDocument[]>([]);
    const future = useRef<EmailDocument[]>([]);
    const [, force] = useState(0);
    const rerender = () => force((n) => n + 1);

    const commit = useCallback((next: EmailDocument) => {
        past.current.push(doc);
        if (past.current.length > HISTORY_LIMIT) past.current.shift();
        future.current = [];
        setDocState(next);
        setDirty(true);
        rerender();
    }, [doc]);

    const setDoc = useCallback((next: EmailDocument, opts?: { markClean?: boolean }) => {
        past.current = [];
        future.current = [];
        setDocState(next);
        setDirty(!opts?.markClean);
        rerender();
    }, []);

    const markClean = useCallback(() => setDirty(false), []);

    const updateProps = useCallback((id: string, updater: (p: Record<string, any>) => Record<string, any>) => {
        commit(updateEmailSectionProps(doc, id, updater));
    }, [doc, commit]);

    const addBlock = useCallback((type: string, index?: number): string | null => {
        const section = createEmailSection(type);
        if (!section) return null;
        const at = index ?? doc.sections.length;
        commit(insertEmailSection(doc, at, section));
        setSelectedId(section.id);
        return section.id;
    }, [doc, commit]);

    const removeBlock = useCallback((id: string) => {
        commit(removeEmailSection(doc, id));
        setSelectedId((cur) => (cur === id ? null : cur));
    }, [doc, commit]);

    const duplicateBlock = useCallback((id: string) => {
        const { doc: next, newId } = duplicateEmailSection(doc, id);
        commit(next);
        if (newId) setSelectedId(newId);
    }, [doc, commit]);

    const moveBlock = useCallback((id: string, toIndex: number) => {
        commit(moveEmailSection(doc, id, toIndex));
    }, [doc, commit]);

    const undo = useCallback(() => {
        const prev = past.current.pop();
        if (!prev) return;
        future.current.push(doc);
        setDocState(prev);
        setDirty(true);
        rerender();
    }, [doc]);

    const redo = useCallback(() => {
        const next = future.current.pop();
        if (!next) return;
        past.current.push(doc);
        setDocState(next);
        setDirty(true);
        rerender();
    }, [doc]);

    return useMemo(() => ({
        doc,
        selectedId,
        dirty,
        canUndo: past.current.length > 0,
        canRedo: future.current.length > 0,
        select: setSelectedId,
        setDoc,
        markClean,
        updateProps,
        addBlock,
        removeBlock,
        duplicateBlock,
        moveBlock,
        undo,
        redo,
    }), [doc, selectedId, dirty, setDoc, markClean, updateProps, addBlock, removeBlock, duplicateBlock, moveBlock, undo, redo]);
}
