import { useRef } from "react";
import type { EmailFieldDef } from "@/lib/email-builder";
import { insertAtCursor } from "@/lib/email-builder/merge-tags";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { Plus, Trash2, GripVertical } from "lucide-react";
import {
    DndContext,
    PointerSensor,
    closestCenter,
    useSensor,
    useSensors,
    type DragEndEvent,
} from "@dnd-kit/core";
import {
    SortableContext,
    arrayMove,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { EmailMergeTagPicker } from "./EmailMergeTagPicker";
import { EmailRichTextEditor } from "./EmailRichTextEditor";

const MERGE_TAG_FIELD_TYPES = new Set(["text", "textarea", "richtext"]);

function MergeTagTextInput({
    value,
    placeholder,
    onChange,
}: {
    value: string;
    placeholder?: string;
    onChange: (next: string) => void;
}) {
    const inputRef = useRef<HTMLInputElement>(null);

    const insertTag = (tag: string) => {
        const el = inputRef.current;
        const { next, cursor } = insertAtCursor(
            value,
            tag,
            el?.selectionStart ?? value.length,
            el?.selectionEnd ?? value.length,
        );
        onChange(next);
        requestAnimationFrame(() => {
            el?.focus();
            el?.setSelectionRange(cursor, cursor);
        });
    };

    return (
        <div className="flex gap-2">
            <Input
                ref={inputRef}
                value={value}
                placeholder={placeholder}
                onChange={(e) => onChange(e.target.value)}
                className="min-w-0 flex-1"
            />
            <EmailMergeTagPicker onInsert={insertTag} className="shrink-0" />
        </div>
    );
}

function MergeTagTextarea({
    value,
    placeholder,
    onChange,
}: {
    value: string;
    placeholder?: string;
    onChange: (next: string) => void;
}) {
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const insertTag = (tag: string) => {
        const el = inputRef.current;
        const { next, cursor } = insertAtCursor(
            value,
            tag,
            el?.selectionStart ?? value.length,
            el?.selectionEnd ?? value.length,
        );
        onChange(next);
        requestAnimationFrame(() => {
            el?.focus();
            el?.setSelectionRange(cursor, cursor);
        });
    };

    return (
        <div className="space-y-2">
            <Textarea
                ref={inputRef}
                value={value}
                placeholder={placeholder}
                onChange={(e) => onChange(e.target.value)}
            />
            <EmailMergeTagPicker onInsert={insertTag} />
        </div>
    );
}

function SortableListItem({
    id,
    index,
    field,
    item,
    onChange,
    onRemove,
}: {
    id: string;
    index: number;
    field: EmailFieldDef;
    item: Record<string, any>;
    onChange: (next: Record<string, any>) => void;
    onRemove: () => void;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
    };

    const renderSubField = (sub: EmailFieldDef) => {
        const subValue = item[sub.name] ?? "";

        if (sub.type === "richtext") {
            return (
                <EmailRichTextEditor
                    value={subValue}
                    onChange={(html) => onChange({ ...item, [sub.name]: html })}
                />
            );
        }

        if (sub.type === "text" && MERGE_TAG_FIELD_TYPES.has(sub.type)) {
            return (
                <MergeTagTextInput
                    value={subValue}
                    onChange={(next) => onChange({ ...item, [sub.name]: next })}
                />
            );
        }

        if (sub.type === "select") {
            return (
                <Select
                    value={subValue}
                    onValueChange={(v) => onChange({ ...item, [sub.name]: v })}
                >
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {(sub.options || []).map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            );
        }

        if (sub.type === "color") {
            return (
                <div className="flex gap-2">
                    <Input
                        type="color"
                        className="h-9 w-12 p-1"
                        value={subValue || "#000000"}
                        onChange={(e) => onChange({ ...item, [sub.name]: e.target.value })}
                    />
                    <Input
                        value={subValue}
                        onChange={(e) => onChange({ ...item, [sub.name]: e.target.value })}
                    />
                </div>
            );
        }

        return (
            <Input
                type={sub.type === "number" ? "number" : "text"}
                min={sub.min}
                max={sub.max}
                value={subValue}
                onChange={(e) =>
                    onChange({
                        ...item,
                        [sub.name]: sub.type === "number" ? Number(e.target.value) : e.target.value,
                    })
                }
            />
        );
    };

    return (
        <div ref={setNodeRef} style={style} className="rounded-lg border border-gray-200 p-3">
            <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        className="cursor-grab rounded p-1 active:cursor-grabbing"
                        {...attributes}
                        {...listeners}
                    >
                        <GripVertical className="h-3.5 w-3.5 text-gray-400" />
                    </button>
                    <span className="text-xs font-medium text-gray-500">Item {index + 1}</span>
                </div>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onRemove}>
                    <Trash2 className="h-3.5 w-3.5" />
                </Button>
            </div>
            {(field.itemFields || []).map((sub) => (
                <div key={sub.name} className="mb-2">
                    <Label className="text-xs">{sub.label}</Label>
                    {renderSubField(sub)}
                </div>
            ))}
        </div>
    );
}

function ListField({
    field,
    value,
    onChange,
}: {
    field: EmailFieldDef;
    value: any[];
    onChange: (next: any[]) => void;
}) {
    const items = Array.isArray(value) ? value : [];
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const oldIndex = items.findIndex((_, i) => `list-item-${i}` === active.id);
        const newIndex = items.findIndex((_, i) => `list-item-${i}` === over.id);
        if (oldIndex < 0 || newIndex < 0) return;
        onChange(arrayMove(items, oldIndex, newIndex));
    };

    const renderItem = (item: Record<string, any>, i: number) => {
        const updateItem = (next: Record<string, any>) => {
            onChange(items.map((it, idx) => (idx === i ? next : it)));
        };
        const removeItem = () => onChange(items.filter((_, idx) => idx !== i));

        if (field.sortable) {
            return (
                <SortableListItem
                    key={`list-item-${i}`}
                    id={`list-item-${i}`}
                    index={i}
                    field={field}
                    item={item}
                    onChange={updateItem}
                    onRemove={removeItem}
                />
            );
        }

        return (
            <div key={i} className="rounded-lg border border-gray-200 p-3">
                <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-500">Item {i + 1}</span>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={removeItem}>
                        <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                </div>
                {(field.itemFields || []).map((sub) => (
                    <div key={sub.name} className="mb-2">
                        <Label className="text-xs">{sub.label}</Label>
                        {sub.type === "richtext" ? (
                            <EmailRichTextEditor
                                value={item[sub.name] || ""}
                                onChange={(html) => updateItem({ ...item, [sub.name]: html })}
                            />
                        ) : sub.type === "select" ? (
                            <Select
                                value={item[sub.name] ?? ""}
                                onValueChange={(v) => updateItem({ ...item, [sub.name]: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {(sub.options || []).map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : sub.type === "color" ? (
                            <div className="flex gap-2">
                                <Input
                                    type="color"
                                    className="h-9 w-12 p-1"
                                    value={item[sub.name] || "#000000"}
                                    onChange={(e) => updateItem({ ...item, [sub.name]: e.target.value })}
                                />
                                <Input
                                    value={item[sub.name] ?? ""}
                                    onChange={(e) => updateItem({ ...item, [sub.name]: e.target.value })}
                                />
                            </div>
                        ) : (
                            <Input
                                type={sub.type === "number" ? "number" : "text"}
                                min={sub.min}
                                max={sub.max}
                                value={item[sub.name] ?? ""}
                                onChange={(e) =>
                                    updateItem({
                                        ...item,
                                        [sub.name]:
                                            sub.type === "number" ? Number(e.target.value) : e.target.value,
                                    })
                                }
                            />
                        )}
                    </div>
                ))}
            </div>
        );
    };

    const listBody = (
        <div className="space-y-2">
            {field.sortable ? (
                <SortableContext
                    items={items.map((_, i) => `list-item-${i}`)}
                    strategy={verticalListSortingStrategy}
                >
                    {items.map((item, i) => renderItem(item, i))}
                </SortableContext>
            ) : (
                items.map((item, i) => renderItem(item, i))
            )}
            <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onChange([...items, { ...(field.itemDefault ?? {}) }])}
            >
                <Plus className="mr-1 h-3.5 w-3.5" />
                {field.addLabel || "Add item"}
            </Button>
        </div>
    );

    if (!field.sortable) return listBody;

    return (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            {listBody}
        </DndContext>
    );
}

export function EmailFieldControls({
    fields,
    values,
    onChange,
}: {
    fields: EmailFieldDef[];
    values: Record<string, any>;
    onChange: (name: string, value: any) => void;
}) {
    return (
        <div className="space-y-4">
            {fields.map((field) => (
                <div key={field.name}>
                    <Label className="mb-1.5 block text-sm">{field.label}</Label>
                    {field.type === "text" && (
                        <MergeTagTextInput
                            value={values[field.name] ?? ""}
                            placeholder={field.placeholder}
                            onChange={(next) => onChange(field.name, next)}
                        />
                    )}
                    {field.type === "textarea" && (
                        <MergeTagTextarea
                            value={values[field.name] ?? ""}
                            placeholder={field.placeholder}
                            onChange={(next) => onChange(field.name, next)}
                        />
                    )}
                    {field.type === "richtext" && (
                        <EmailRichTextEditor
                            value={values[field.name] ?? ""}
                            onChange={(html) => onChange(field.name, html)}
                        />
                    )}
                    {field.type === "number" && (
                        <Input
                            type="number"
                            min={field.min}
                            max={field.max}
                            value={values[field.name] ?? ""}
                            onChange={(e) => onChange(field.name, Number(e.target.value))}
                        />
                    )}
                    {field.type === "color" && (
                        <div className="flex gap-2">
                            <Input
                                type="color"
                                className="h-10 w-14 p-1"
                                value={values[field.name] || "#000000"}
                                onChange={(e) => onChange(field.name, e.target.value)}
                            />
                            <Input
                                value={values[field.name] ?? ""}
                                onChange={(e) => onChange(field.name, e.target.value)}
                            />
                        </div>
                    )}
                    {field.type === "toggle" && (
                        <Switch
                            checked={!!values[field.name]}
                            onCheckedChange={(checked) => onChange(field.name, checked)}
                        />
                    )}
                    {field.type === "select" && (
                        <Select
                            value={values[field.name] ?? ""}
                            onValueChange={(v) => onChange(field.name, v)}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {(field.options || []).map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                    {field.type === "image" && (
                        <ImageUpload
                            value={values[field.name] ?? ""}
                            onChange={(url) => onChange(field.name, url)}
                        />
                    )}
                    {field.type === "list" && (
                        <ListField
                            field={field}
                            value={values[field.name]}
                            onChange={(next) => onChange(field.name, next)}
                        />
                    )}
                    {field.help ? <p className="mt-1 text-xs text-gray-400">{field.help}</p> : null}
                </div>
            ))}
        </div>
    );
}
