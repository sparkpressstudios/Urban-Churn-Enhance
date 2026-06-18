import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { AdminLayout } from "@/components/admin/AdminLayout";
import type { EmailDocument } from "@/lib/email-builder";
import { EmailEditorWorkspace, useEmailEditor } from "@/components/admin/email-builder/EmailEditorWorkspace";

export default function EmailTemplateEditor() {
    const params = useParams<{ id: string }>();
    const templateId = parseInt(params.id || "0", 10);

    const { data: template, isLoading } = useQuery({
        queryKey: ["admin", "email-template", templateId],
        queryFn: () => api.getEmailTemplate(templateId),
        enabled: templateId > 0,
    });

    if (isLoading || !template) {
        return (
            <AdminLayout>
                <p className="text-sm text-gray-500">Loading template...</p>
            </AdminLayout>
        );
    }

    return <EmailTemplateEditorInner templateId={templateId} template={template} />;
}

function EmailTemplateEditorInner({
    templateId,
    template,
}: {
    templateId: number;
    template: { name: string; document: EmailDocument };
}) {
    const editor = useEmailEditor(template.document as EmailDocument);

    return (
        <AdminLayout>
            <EmailEditorWorkspace
                templateId={templateId}
                templateName={template.name}
                initialDoc={template.document as EmailDocument}
                editor={editor}
            />
        </AdminLayout>
    );
}
