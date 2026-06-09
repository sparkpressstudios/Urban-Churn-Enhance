import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { EMAIL_TEMPLATE_STARTERS } from "@/lib/email-builder/starters";
import { TemplateThumbnail } from "@/components/admin/email-marketing/TemplateThumbnail";
import {
    EmailEmptyState,
    EmailErrorState,
    EmailLoadingState,
} from "@/components/admin/email-marketing/EmailQueryStates";
import { Plus, Copy, Pencil, Trash2 } from "lucide-react";

export default function EmailTemplates() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [, navigate] = useLocation();
    const [showGallery, setShowGallery] = useState(false);
    const [customName, setCustomName] = useState("");

    const { data: templates = [], isLoading, isError, refetch } = useQuery({
        queryKey: ["admin", "email-templates"],
        queryFn: api.getEmailTemplates,
    });

    const createMutation = useMutation({
        mutationFn: (payload: { name: string; document?: unknown }) =>
            api.createEmailTemplate(payload),
        onSuccess: (template: any) => {
            queryClient.invalidateQueries({ queryKey: ["admin", "email-templates"] });
            setShowGallery(false);
            setCustomName("");
            navigate(`/admin/email/templates/${template.id}`);
        },
        onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });

    const duplicateMutation = useMutation({
        mutationFn: (id: number) => api.duplicateEmailTemplate(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "email-templates"] });
            toast({ title: "Template duplicated" });
        },
        onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => api.deleteEmailTemplate(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "email-templates"] });
            toast({ title: "Template deleted" });
        },
        onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });

    return (
        <AdminLayout>
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Email Templates</h1>
                    <p className="text-sm text-gray-500">Design reusable email layouts with the drag-and-drop builder.</p>
                </div>
                <Button onClick={() => setShowGallery(true)}>
                    <Plus className="mr-1 h-4 w-4" />
                    New Template
                </Button>
            </div>

            {isLoading ? (
                <EmailLoadingState />
            ) : isError ? (
                <EmailErrorState onRetry={() => refetch()} />
            ) : templates.length === 0 ? (
                <EmailEmptyState
                    title="No templates yet"
                    description="Start from a gallery template or blank canvas."
                    action={<Button onClick={() => setShowGallery(true)}>Browse templates</Button>}
                />
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {templates.map((template: any) => (
                        <Card key={template.id}>
                            <TemplateThumbnail document={template.document} className="mx-4 mt-4" />
                            <CardHeader className="pb-2">
                                <div className="flex items-start justify-between gap-2">
                                    <CardTitle className="text-lg">{template.name}</CardTitle>
                                    <Badge variant={template.status === "published" ? "default" : "secondary"}>
                                        {template.status}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="mb-4 text-sm text-gray-500 line-clamp-2">
                                    {template.description || "No description"}
                                </p>
                                <div className="flex gap-2">
                                    <Link href={`/admin/email/templates/${template.id}`}>
                                        <Button size="sm" variant="default">
                                            <Pencil className="mr-1 h-3.5 w-3.5" />
                                            Edit
                                        </Button>
                                    </Link>
                                    <Button size="sm" variant="outline" onClick={() => duplicateMutation.mutate(template.id)}>
                                        <Copy className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                            if (confirm("Delete this template?")) deleteMutation.mutate(template.id);
                                        }}
                                    >
                                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <Dialog open={showGallery} onOpenChange={setShowGallery}>
                <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Choose a template</DialogTitle>
                    </DialogHeader>
                    <div className="mb-4">
                        <Label>Custom name (optional)</Label>
                        <Input
                            placeholder="Leave blank to use starter name"
                            value={customName}
                            onChange={(e) => setCustomName(e.target.value)}
                        />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        {EMAIL_TEMPLATE_STARTERS.map((starter) => (
                            <button
                                key={starter.id}
                                type="button"
                                className="rounded-lg border p-3 text-left transition hover:border-blue-500 hover:bg-blue-50"
                                onClick={() =>
                                    createMutation.mutate({
                                        name: customName.trim() || starter.name,
                                        document: starter.document,
                                    })
                                }
                                disabled={createMutation.isPending}
                            >
                                <TemplateThumbnail document={starter.document} className="mb-3" />
                                <p className="font-medium">{starter.name}</p>
                                <p className="text-xs text-gray-500">{starter.description}</p>
                            </button>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
}
