import { useMemo } from "react";
import { compileEmailDocument, type EmailDocument } from "@workspace/email-compiler";

export function TemplateThumbnail({
    document,
    className = "",
}: {
    document?: EmailDocument | null;
    className?: string;
}) {
    const html = useMemo(() => {
        if (!document) return "";
        try {
            return compileEmailDocument(document);
        } catch {
            return "";
        }
    }, [document]);

    if (!html) {
        return (
            <div className={`flex h-32 items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-400 ${className}`}>
                No preview
            </div>
        );
    }

    return (
        <div className={`relative h-32 overflow-hidden rounded-lg border bg-white ${className}`}>
            <iframe
                title="Template thumbnail"
                srcDoc={html}
                className="pointer-events-none absolute left-0 top-0 w-[600px] origin-top-left scale-[0.35] border-0"
                style={{ height: 400 }}
            />
        </div>
    );
}
