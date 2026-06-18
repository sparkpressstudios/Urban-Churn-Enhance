import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Play } from "lucide-react";

export type SegmentCondition = {
    field: string;
    op: string;
    value: string | number | boolean;
};

export type SegmentRules = {
    combinator: "and" | "or";
    conditions: SegmentCondition[];
};

type Props = {
    rules: SegmentRules;
    onChange: (rules: SegmentRules) => void;
    onSave?: () => void;
    segmentId?: number;
};

export function SegmentRulesEditor({ rules, onChange, onSave, segmentId }: Props) {
    const { data: fields = [] } = useQuery({
        queryKey: ["admin", "segment-rule-fields"],
        queryFn: api.getEmailSegmentRuleFields,
    });

    const previewMutation = useMutation({
        mutationFn: () => api.previewEmailSegmentRules(rules),
    });

    const evaluateMutation = useMutation({
        mutationFn: () => api.evaluateEmailSegment(segmentId!),
        onSuccess: onSave,
    });

    const addCondition = () => {
        const firstField = fields[0];
        onChange({
            ...rules,
            conditions: [
                ...rules.conditions,
                {
                    field: firstField?.field || "marketing_status",
                    op: firstField?.ops?.[0] || "eq",
                    value: firstField?.options?.[0] || "",
                },
            ],
        });
    };

    const updateCondition = (index: number, patch: Partial<SegmentCondition>) => {
        const conditions = rules.conditions.map((c, i) => (i === index ? { ...c, ...patch } : c));
        onChange({ ...rules, conditions });
    };

    const removeCondition = (index: number) => {
        onChange({
            ...rules,
            conditions: rules.conditions.filter((_, i) => i !== index),
        });
    };

    const getFieldDef = (field: string) => fields.find((f: any) => f.field === field);

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3">
                <Label>Match</Label>
                <Select
                    value={rules.combinator}
                    onValueChange={(v: "and" | "or") => onChange({ ...rules, combinator: v })}
                >
                    <SelectTrigger className="w-32">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="and">ALL rules</SelectItem>
                        <SelectItem value="or">ANY rule</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-3">
                {rules.conditions.map((cond, i) => {
                    const fieldDef = getFieldDef(cond.field);
                    return (
                        <div key={i} className="flex flex-wrap items-end gap-2 rounded-lg border p-3">
                            <div className="min-w-[140px] flex-1">
                                <Label className="text-xs">Field</Label>
                                <Select
                                    value={cond.field}
                                    onValueChange={(v) => {
                                        const def = getFieldDef(v);
                                        updateCondition(i, {
                                            field: v,
                                            op: def?.ops?.[0] || "eq",
                                            value: def?.options?.[0] ?? "",
                                        });
                                    }}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {fields.map((f: any) => (
                                            <SelectItem key={f.field} value={f.field}>{f.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="w-28">
                                <Label className="text-xs">Operator</Label>
                                <Select value={cond.op} onValueChange={(v) => updateCondition(i, { op: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {(fieldDef?.ops || ["eq"]).map((op: string) => (
                                            <SelectItem key={op} value={op}>{op}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="min-w-[120px] flex-1">
                                <Label className="text-xs">Value</Label>
                                {fieldDef?.valueType === "select" ? (
                                    <Select
                                        value={String(cond.value)}
                                        onValueChange={(v) => updateCondition(i, { value: v })}
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {(fieldDef.options || []).map((opt: string) => (
                                                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <Input
                                        type={fieldDef?.valueType === "number" ? "number" : "text"}
                                        value={String(cond.value)}
                                        onChange={(e) =>
                                            updateCondition(i, {
                                                value: fieldDef?.valueType === "number"
                                                    ? Number(e.target.value)
                                                    : e.target.value,
                                            })
                                        }
                                    />
                                )}
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => removeCondition(i)}>
                                <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                        </div>
                    );
                })}
            </div>

            <Button variant="outline" size="sm" onClick={addCondition}>
                <Plus className="mr-1 h-4 w-4" />
                Add rule
            </Button>

            <div className="flex flex-wrap gap-2 border-t pt-4">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => previewMutation.mutate()}
                    disabled={!rules.conditions.length || previewMutation.isPending}
                >
                    Preview ({previewMutation.data?.count ?? "…"} matches)
                </Button>
                {segmentId && (
                    <Button
                        size="sm"
                        onClick={() => evaluateMutation.mutate()}
                        disabled={!rules.conditions.length || evaluateMutation.isPending}
                    >
                        <Play className="mr-1 h-4 w-4" />
                        Evaluate &amp; update segment
                    </Button>
                )}
            </div>

            {previewMutation.data?.preview?.length > 0 && (
                <div className="rounded border bg-gray-50 p-3 text-sm">
                    <p className="mb-2 font-medium text-gray-600">Sample matches:</p>
                    {previewMutation.data.preview.map((c: any) => (
                        <p key={c.id} className="text-gray-500">{c.email} — {[c.firstName, c.lastName].filter(Boolean).join(" ")}</p>
                    ))}
                </div>
            )}
        </div>
    );
}
