import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import {
    DndContext,
    DragOverlay,
    PointerSensor,
    useSensor,
    useSensors,
    closestCenter,
    type DragStartEvent,
    type DragEndEvent,
} from "@dnd-kit/core";
import {
    SortableContext,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { compileEmailDocument, compileSectionPreview } from "@workspace/email-compiler";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Undo2,
    Redo2,
    Save,
    Loader2,
    GripVertical,
    Trash2,
    Copy,
    ArrowLeft,
    Monitor,
    Smartphone,
    Eye,
    Settings2,
    History,
    LayoutTemplate,
    ListOrdered,
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EmailGlobalStylesPanel } from "./EmailGlobalStylesPanel";
import { EmailRevisionPanel } from "./EmailRevisionPanel";
import {
    EMAIL_BLOCK_DEFINITIONS,
    getEmailBlockDef,
    type EmailDocument,
    type EmailGlobalStyles,
    type EmailSection,
} from "@/lib/email-builder";
import { useEmailEditor, type EmailEditorApi } from "./email-editor-store";
import { EmailFieldControls } from "./EmailFieldControls";
import { EMAIL_MERGE_TAGS } from "@/lib/email-builder/merge-tags";

function LiveSectionPreview({
    section,
    globalStyles,
    mobile,
}: {
    section: EmailSection;
    globalStyles?: EmailGlobalStyles;
    mobile: boolean;
}) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const html = useMemo(
        () =>
            compileSectionPreview(section, globalStyles, {
                forceMobileLayout: mobile,
            }),
        [section, globalStyles, mobile],
    );

    useEffect(() => {
        const iframe = iframeRef.current;
        if (!iframe) return;

        const resize = () => {
            const doc = iframe.contentDocument;
            if (doc?.body) {
                iframe.style.height = `${doc.body.scrollHeight}px`;
            }
        };

        iframe.addEventListener("load", resize);
        resize();
        return () => iframe.removeEventListener("load", resize);
    }, [html]);

    return (
        <iframe
            ref={iframeRef}
            title={`Preview ${section.type}`}
            srcDoc={html}
            className="block w-full border-0"
            style={{ minHeight: 24 }}
        />
    );
}

function SortableBlock({
    section,
    selected,
    globalStyles,
    mobile,
    onSelect,
    onRemove,
    onDuplicate,
}: {
    section: EmailSection;
    selected: boolean;
    globalStyles?: EmailGlobalStyles;
    mobile: boolean;
    onSelect: () => void;
    onRemove: () => void;
    onDuplicate: () => void;
}) {
    const def = getEmailBlockDef(section.type);
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: section.id,
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.45 : 1,
        zIndex: isDragging ? 10 : undefined,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`group relative flex border-2 bg-white ${selected ? "border-blue-500 shadow-sm" : "border-transparent hover:border-blue-200"}`}
        >
            <button
                type="button"
                className="flex w-9 shrink-0 cursor-grab items-center justify-center border-r bg-gray-50 active:cursor-grabbing"
                aria-label={`Drag ${def?.label ?? "block"}`}
                {...attributes}
                {...listeners}
                onClick={(e) => e.stopPropagation()}
            >
                <GripVertical className="h-4 w-4 text-gray-400" />
            </button>

            <div className="min-w-0 flex-1" onClick={onSelect} role="presentation">
                <LiveSectionPreview section={section} globalStyles={globalStyles} mobile={mobile} />
            </div>

            <div
                className={`absolute right-2 top-2 z-10 flex gap-1 transition ${
                    selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                }`}
            >
                <button
                    type="button"
                    className="rounded bg-white p-1 shadow"
                    onClick={(e) => {
                        e.stopPropagation();
                        onDuplicate();
                    }}
                >
                    <Copy className="h-4 w-4 text-gray-500" />
                </button>
                <button
                    type="button"
                    className="rounded bg-white p-1 shadow"
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove();
                    }}
                >
                    <Trash2 className="h-4 w-4 text-red-500" />
                </button>
            </div>
        </div>
    );
}

type EmailEditorWorkspaceProps = {
    templateId: number;
    templateName: string;
    initialDoc: EmailDocument;
    editor: EmailEditorApi;
    onSaved?: () => void;
};

export function EmailEditorWorkspace({
    templateId,
    templateName,
    editor,
    onSaved,
}: EmailEditorWorkspaceProps) {
    const { toast } = useToast();
    const [name, setName] = useState(templateName);
    const [activeDragId, setActiveDragId] = useState<string | null>(null);
    const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
    const [showPreview, setShowPreview] = useState(false);
    const [leftTab, setLeftTab] = useState("blocks");
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

    const handleRemoveSection = useCallback(
        (id: string) => {
            editor.removeBlock(id);
            if (editor.selectedId === id) {
                editor.select(null);
            }
        },
        [editor],
    );

    const requestRemoveSection = useCallback((id: string) => {
        setDeleteTargetId(id);
    }, []);

    const confirmRemoveSection = useCallback(() => {
        if (!deleteTargetId) return;
        handleRemoveSection(deleteTargetId);
        setDeleteTargetId(null);
    }, [deleteTargetId, handleRemoveSection]);

    const deleteTargetSection = deleteTargetId
        ? editor.doc.sections.find((s) => s.id === deleteTargetId) ?? null
        : null;
    const deleteTargetLabel = deleteTargetSection
        ? getEmailBlockDef(deleteTargetSection.type)?.label ?? deleteTargetSection.type
        : "section";

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (!editor.selectedId) return;
            const target = e.target as HTMLElement;
            if (target.isContentEditable || target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
            if (e.key === "Delete" || e.key === "Backspace") {
                e.preventDefault();
                requestRemoveSection(editor.selectedId!);
            }
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [editor.selectedId, requestRemoveSection]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    );

    const mobile = device === "mobile";
    const canvasWidth = mobile ? 375 : (editor.doc.globalStyles?.containerWidth || 600);

    const livePreviewHtml = useMemo(
        () =>
            compileEmailDocument(editor.doc, {
                forceMobileLayout: mobile,
            }),
        [editor.doc, mobile],
    );

    const saveMutation = useMutation({
        mutationFn: () =>
            api.updateEmailTemplate(templateId, {
                name,
                document: editor.doc,
            }),
        onSuccess: () => {
            editor.markClean();
            onSaved?.();
            toast({ title: "Template saved" });
        },
        onError: (err: Error) => toast({ title: "Save failed", description: err.message, variant: "destructive" }),
    });

    const selected = editor.selectedId
        ? editor.doc.sections.find((s) => s.id === editor.selectedId) ?? null
        : null;
    const selectedDef = selected ? getEmailBlockDef(selected.type) : null;
    const activeDragSection = activeDragId
        ? editor.doc.sections.find((s) => s.id === activeDragId) ?? null
        : null;

    const handleDragEnd = (event: DragEndEvent) => {
        setActiveDragId(null);
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = editor.doc.sections.findIndex((s) => s.id === active.id);
        const newIndex = editor.doc.sections.findIndex((s) => s.id === over.id);
        if (oldIndex < 0 || newIndex < 0) return;

        editor.moveBlock(String(active.id), newIndex);
    };

    const pageBackground = editor.doc.globalStyles?.backgroundColor || "#f3f4f6";
    const contentBackground = editor.doc.globalStyles?.contentBackgroundColor || "#ffffff";

    return (
        <div className="flex h-[calc(100vh-4rem)] flex-col bg-gray-100">
            <div className="flex items-center justify-between border-b bg-white px-4 py-3">
                <div className="flex items-center gap-3">
                    <Link href="/admin/email/templates">
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="mr-1 h-4 w-4" />
                            Templates
                        </Button>
                    </Link>
                    <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="h-9 w-64 font-medium"
                    />
                    {editor.dirty ? (
                        <span className="text-xs text-amber-600">Unsaved changes</span>
                    ) : null}
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant={device === "desktop" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setDevice("desktop")}
                    >
                        <Monitor className="h-4 w-4" />
                    </Button>
                    <Button
                        variant={device === "mobile" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setDevice("mobile")}
                    >
                        <Smartphone className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setShowPreview(true)}>
                        <Eye className="mr-1 h-4 w-4" />
                        Full preview
                    </Button>
                    <Button variant="outline" size="sm" disabled={!editor.canUndo} onClick={editor.undo}>
                        <Undo2 className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" disabled={!editor.canRedo} onClick={editor.redo}>
                        <Redo2 className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={saveMutation.isPending}
                        onClick={() =>
                            saveMutation.mutate(undefined, {
                                onSuccess: () => {
                                    api
                                        .updateEmailTemplate(templateId, { status: "published" })
                                        .then(() => toast({ title: "Template published" }))
                                        .catch((err: Error) =>
                                            toast({ title: "Publish failed", description: err.message, variant: "destructive" }),
                                        );
                                },
                            })
                        }
                    >
                        Publish
                    </Button>
                    <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                        {saveMutation.isPending ? (
                            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                        ) : (
                            <Save className="mr-1 h-4 w-4" />
                        )}
                        Save
                    </Button>
                </div>
            </div>

            <div className="flex min-h-0 flex-1">
                <aside className="w-56 shrink-0 overflow-y-auto border-r bg-white p-3">
                    <Tabs value={leftTab} onValueChange={setLeftTab}>
                        <TabsList className="mb-3 grid w-full grid-cols-4">
                            <TabsTrigger value="blocks" className="text-xs" title="Add blocks"><LayoutTemplate className="h-3.5 w-3.5" /></TabsTrigger>
                            <TabsTrigger value="structure" className="text-xs" title="Section list"><ListOrdered className="h-3.5 w-3.5" /></TabsTrigger>
                            <TabsTrigger value="styles" className="text-xs" title="Global styles"><Settings2 className="h-3.5 w-3.5" /></TabsTrigger>
                            <TabsTrigger value="history" className="text-xs" title="Revisions"><History className="h-3.5 w-3.5" /></TabsTrigger>
                        </TabsList>
                        <TabsContent value="blocks" className="space-y-1.5">
                            <p className="mb-2 text-xs text-gray-400">Click to add. Drag blocks in the canvas to reorder.</p>
                            {EMAIL_BLOCK_DEFINITIONS.map((def) => (
                                <button
                                    key={def.type}
                                    type="button"
                                    onClick={() => editor.addBlock(def.type)}
                                    className="flex w-full items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-left text-sm hover:border-blue-500 hover:bg-blue-50"
                                >
                                    <def.icon className="h-4 w-4 text-blue-600" />
                                    <span>{def.label}</span>
                                </button>
                            ))}
                        </TabsContent>
                        <TabsContent value="structure" className="space-y-1.5">
                            <p className="mb-2 text-xs text-gray-400">
                                Click a section to select it. Use the trash icon or Delete key to remove.
                            </p>
                            {editor.doc.sections.length === 0 ? (
                                <p className="text-xs text-gray-400">No sections yet.</p>
                            ) : (
                                editor.doc.sections.map((section, index) => {
                                    const def = getEmailBlockDef(section.type);
                                    const isSelected = editor.selectedId === section.id;
                                    return (
                                        <div
                                            key={section.id}
                                            className={`flex items-center gap-1 rounded-lg border px-2 py-1.5 text-sm ${
                                                isSelected ? "border-blue-500 bg-blue-50" : "border-gray-200"
                                            }`}
                                        >
                                            <button
                                                type="button"
                                                className="min-w-0 flex-1 truncate text-left"
                                                onClick={() => editor.select(section.id)}
                                            >
                                                <span className="text-gray-400">{index + 1}.</span>{" "}
                                                {def?.label ?? section.type}
                                            </button>
                                            <button
                                                type="button"
                                                className="rounded p-1 text-gray-400 hover:bg-white hover:text-red-600"
                                                title="Remove section"
                                                onClick={() => requestRemoveSection(section.id)}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    );
                                })
                            )}
                        </TabsContent>
                        <TabsContent value="styles">
                            <EmailGlobalStylesPanel
                                doc={editor.doc}
                                onChange={(globalStyles) =>
                                    editor.setDoc({ ...editor.doc, globalStyles })
                                }
                            />
                        </TabsContent>
                        <TabsContent value="history">
                            <EmailRevisionPanel
                                templateId={templateId}
                                onRestore={(doc) => editor.setDoc(doc)}
                            />
                        </TabsContent>
                    </Tabs>
                </aside>

                <main className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: pageBackground }}>
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragStart={(e: DragStartEvent) => {
                            setActiveDragId(String(e.active.id));
                        }}
                        onDragEnd={handleDragEnd}
                    >
                        <div
                            className="mx-auto overflow-hidden rounded-xl shadow-lg transition-all"
                            style={{
                                maxWidth: canvasWidth,
                                width: "100%",
                                backgroundColor: contentBackground,
                                fontFamily: editor.doc.globalStyles?.fontFamily,
                            }}
                        >
                            <SortableContext
                                items={editor.doc.sections.map((s) => s.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                {editor.doc.sections.map((section) => (
                                    <SortableBlock
                                        key={section.id}
                                        section={section}
                                        globalStyles={editor.doc.globalStyles}
                                        mobile={mobile}
                                        selected={editor.selectedId === section.id}
                                        onSelect={() => editor.select(section.id)}
                                        onRemove={() => requestRemoveSection(section.id)}
                                        onDuplicate={() => editor.duplicateBlock(section.id)}
                                    />
                                ))}
                            </SortableContext>
                            {editor.doc.sections.length === 0 ? (
                                <div className="p-12 text-center text-sm text-gray-400">
                                    Add blocks from the left panel to build your email.
                                </div>
                            ) : null}
                        </div>
                        <DragOverlay dropAnimation={null}>
                            {activeDragSection ? (
                                <div className="flex w-[320px] items-center gap-2 rounded border bg-white px-3 py-2 text-sm shadow-xl">
                                    <GripVertical className="h-4 w-4 text-gray-400" />
                                    {getEmailBlockDef(activeDragSection.type)?.label}
                                </div>
                            ) : null}
                        </DragOverlay>
                    </DndContext>
                </main>

                <aside className="w-80 shrink-0 overflow-y-auto border-l bg-white p-4">
                    {selected && selectedDef ? (
                        <>
                            <div className="mb-4 flex items-center justify-between gap-2">
                                <p className="text-sm font-semibold text-gray-700">{selectedDef.label} settings</p>
                                <div className="flex gap-1">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8"
                                        title="Duplicate section"
                                        onClick={() => editor.duplicateBlock(selected.id)}
                                    >
                                        <Copy className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8 text-red-600 hover:text-red-700"
                                        title="Remove section"
                                        onClick={() => requestRemoveSection(selected.id)}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>
                            <EmailFieldControls
                                fields={selectedDef.fields}
                                values={selected.props}
                                onChange={(fieldName, value) =>
                                    editor.updateProps(selected.id, (props) => ({
                                        ...props,
                                        [fieldName]: value,
                                    }))
                                }
                            />
                        </>
                    ) : (
                        <div className="space-y-4">
                            <p className="text-sm text-gray-500">Select a block to edit its settings.</p>
                            <div className="rounded-lg border border-gray-200 p-3">
                                <p className="text-sm font-medium text-gray-700">Personalization</p>
                                <p className="mt-1 text-xs text-gray-500">
                                    Insert contact fields into text blocks. Resend replaces tags when the email is sent.
                                </p>
                                <div className="mt-3 space-y-2">
                                    {EMAIL_MERGE_TAGS.map((item) => (
                                        <div
                                            key={item.tag}
                                            className="flex items-start justify-between gap-2 rounded bg-gray-50 px-2 py-1.5"
                                        >
                                            <div className="min-w-0">
                                                <p className="text-xs font-medium text-gray-700">{item.label}</p>
                                                <p className="truncate font-mono text-[11px] text-gray-500">{item.tag}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <p className="mt-3 text-xs text-gray-400">
                                    Use the Personalize button in text fields, or type tags manually. The footer includes the
                                    unsubscribe link automatically.
                                </p>
                            </div>
                        </div>
                    )}
                </aside>
            </div>

            <AlertDialog
                open={deleteTargetId !== null}
                onOpenChange={(open) => {
                    if (!open) setDeleteTargetId(null);
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove section?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Delete the <strong>{deleteTargetLabel}</strong> section from this template? You can undo this
                            action with Ctrl+Z.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700"
                            onClick={confirmRemoveSection}
                        >
                            Remove section
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog open={showPreview} onOpenChange={setShowPreview}>
                <DialogContent className="max-h-[85vh] max-w-3xl overflow-hidden">
                    <DialogHeader>
                        <DialogTitle>Full email preview</DialogTitle>
                    </DialogHeader>
                    <iframe
                        title="Email preview"
                        srcDoc={livePreviewHtml}
                        className="h-[60vh] w-full rounded border bg-white"
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}

export { useEmailEditor };
