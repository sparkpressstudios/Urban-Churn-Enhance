import { useEffect, useRef } from "react";
import {
    Bold,
    Italic,
    List,
    ListOrdered,
    Link2,
    Heading2,
} from "lucide-react";
import { EmailMergeTagPicker } from "./EmailMergeTagPicker";

export function EmailRichTextEditor({
    value,
    onChange,
}: {
    value: string;
    onChange: (html: string) => void;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const lastValue = useRef(value);

    useEffect(() => {
        if (ref.current && value !== lastValue.current && document.activeElement !== ref.current) {
            ref.current.innerHTML = value || "";
            lastValue.current = value;
        }
    }, [value]);

    useEffect(() => {
        if (ref.current && !ref.current.innerHTML) {
            ref.current.innerHTML = value || "";
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const sync = () => {
        if (ref.current) {
            lastValue.current = ref.current.innerHTML;
            onChange(ref.current.innerHTML);
        }
    };

    const exec = (command: string, arg?: string) => {
        ref.current?.focus();
        // eslint-disable-next-line deprecation/deprecation
        document.execCommand(command, false, arg);
        sync();
    };

    const addLink = () => {
        const url = window.prompt("Link URL", "https://");
        if (url) exec("createLink", url);
    };

    const insertTag = (tag: string) => {
        ref.current?.focus();
        // eslint-disable-next-line deprecation/deprecation
        document.execCommand("insertText", false, tag);
        sync();
    };

    const ToolBtn = ({
        onClick,
        children,
        title,
    }: {
        onClick: () => void;
        children: React.ReactNode;
        title: string;
    }) => (
        <button
            type="button"
            title={title}
            onMouseDown={(e) => {
                e.preventDefault();
                onClick();
            }}
            className="flex h-8 w-8 items-center justify-center rounded text-gray-600 hover:bg-gray-100"
        >
            {children}
        </button>
    );

    return (
        <div className="rounded-md border border-gray-200">
            <div className="flex flex-wrap items-center gap-0.5 border-b border-gray-200 bg-gray-50 px-1 py-1">
                <ToolBtn title="Bold" onClick={() => exec("bold")}>
                    <Bold className="h-4 w-4" />
                </ToolBtn>
                <ToolBtn title="Italic" onClick={() => exec("italic")}>
                    <Italic className="h-4 w-4" />
                </ToolBtn>
                <ToolBtn title="Heading" onClick={() => exec("formatBlock", "<h3>")}>
                    <Heading2 className="h-4 w-4" />
                </ToolBtn>
                <ToolBtn title="Bullet list" onClick={() => exec("insertUnorderedList")}>
                    <List className="h-4 w-4" />
                </ToolBtn>
                <ToolBtn title="Numbered list" onClick={() => exec("insertOrderedList")}>
                    <ListOrdered className="h-4 w-4" />
                </ToolBtn>
                <ToolBtn title="Link" onClick={addLink}>
                    <Link2 className="h-4 w-4" />
                </ToolBtn>
                <EmailMergeTagPicker onInsert={insertTag} className="ml-1 h-8 px-2 text-xs" />
            </div>
            <div
                ref={ref}
                contentEditable
                suppressContentEditableWarning
                onInput={sync}
                onBlur={sync}
                className="rl-richtext min-h-[120px] px-3 py-2 text-sm focus:outline-none"
            />
        </div>
    );
}
