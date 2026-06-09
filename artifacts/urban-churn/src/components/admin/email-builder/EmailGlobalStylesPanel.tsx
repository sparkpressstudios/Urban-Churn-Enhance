import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { EmailDocument } from "@/lib/email-builder";

type Props = {
    doc: EmailDocument;
    onChange: (globalStyles: EmailDocument["globalStyles"]) => void;
};

export function EmailGlobalStylesPanel({ doc, onChange }: Props) {
    const styles = doc.globalStyles ?? {};

    const update = (key: string, value: string | number) => {
        onChange({ ...styles, [key]: value });
    };

    return (
        <div className="space-y-4">
            <p className="text-sm font-semibold text-gray-700">Global styles</p>
            <div>
                <Label className="text-xs">Page background</Label>
                <div className="mt-1 flex gap-2">
                    <Input type="color" className="h-9 w-14 p-1" value={styles.backgroundColor || "#f3f4f6"} onChange={(e) => update("backgroundColor", e.target.value)} />
                    <Input value={styles.backgroundColor || "#f3f4f6"} onChange={(e) => update("backgroundColor", e.target.value)} />
                </div>
            </div>
            <div>
                <Label className="text-xs">Content background</Label>
                <div className="mt-1 flex gap-2">
                    <Input type="color" className="h-9 w-14 p-1" value={styles.contentBackgroundColor || "#ffffff"} onChange={(e) => update("contentBackgroundColor", e.target.value)} />
                    <Input value={styles.contentBackgroundColor || "#ffffff"} onChange={(e) => update("contentBackgroundColor", e.target.value)} />
                </div>
            </div>
            <div>
                <Label className="text-xs">Link / accent color</Label>
                <div className="mt-1 flex gap-2">
                    <Input type="color" className="h-9 w-14 p-1" value={styles.linkColor || "#2563eb"} onChange={(e) => update("linkColor", e.target.value)} />
                    <Input value={styles.linkColor || "#2563eb"} onChange={(e) => update("linkColor", e.target.value)} />
                </div>
            </div>
            <div>
                <Label className="text-xs">Container width (px)</Label>
                <Input type="number" min={400} max={700} value={styles.containerWidth || 600} onChange={(e) => update("containerWidth", Number(e.target.value))} />
            </div>
            <div>
                <Label className="text-xs">Font family</Label>
                <Input value={styles.fontFamily || "Arial, Helvetica, sans-serif"} onChange={(e) => update("fontFamily", e.target.value)} />
            </div>
        </div>
    );
}
