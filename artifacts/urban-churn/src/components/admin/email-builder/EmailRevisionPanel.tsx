import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { formatEastern } from "@/lib/utils";
import { RotateCcw } from "lucide-react";
import type { EmailDocument } from "@/lib/email-builder";

type Props = {
    templateId: number;
    onRestore: (doc: EmailDocument) => void;
};

export function EmailRevisionPanel({ templateId, onRestore }: Props) {
    const queryClient = useQueryClient();

    const { data: revisions = [] } = useQuery({
        queryKey: ["admin", "email-template-revisions", templateId],
        queryFn: () => api.getEmailTemplateRevisions(templateId),
    });

    const restoreMutation = useMutation({
        mutationFn: (revId: number) => api.restoreEmailTemplateRevision(templateId, revId),
        onSuccess: (template: any) => {
            onRestore(template.document as EmailDocument);
            queryClient.invalidateQueries({ queryKey: ["admin", "email-template", templateId] });
        },
    });

    if (!revisions.length) {
        return <p className="text-xs text-gray-400">Revisions appear after you save changes.</p>;
    }

    return (
        <div className="space-y-2">
            {revisions.map((rev: any) => (
                <div key={rev.id} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                    <div>
                        <p className="font-medium text-gray-700">{rev.label || `Revision #${rev.id}`}</p>
                        <p className="text-xs text-gray-400">{formatEastern(rev.createdAt)}</p>
                    </div>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => restoreMutation.mutate(rev.id)}
                        disabled={restoreMutation.isPending}
                    >
                        <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                </div>
            ))}
        </div>
    );
}
