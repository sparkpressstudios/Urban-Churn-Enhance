import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
    EmailEmptyState,
    EmailErrorState,
    EmailLoadingState,
} from "@/components/admin/email-marketing/EmailQueryStates";
import { ArrowLeft, Plus, RefreshCw, Trash2 } from "lucide-react";

export default function EmailTopics() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [showCreate, setShowCreate] = useState(false);
    const [form, setForm] = useState({ name: "", description: "" });

    const { data: topics = [], isLoading, isError, refetch } = useQuery({
        queryKey: ["admin", "email-topics"],
        queryFn: api.getEmailTopics,
    });

    const createMutation = useMutation({
        mutationFn: () => api.createEmailTopic(form),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "email-topics"] });
            setShowCreate(false);
            setForm({ name: "", description: "" });
            toast({ title: "Topic created" });
        },
        onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });

    const syncMutation = useMutation({
        mutationFn: api.syncEmailTopicsFromResend,
        onSuccess: (result: any) => {
            queryClient.invalidateQueries({ queryKey: ["admin", "email-topics"] });
            toast({ title: `Synced ${result.synced ?? 0} topics from Resend` });
        },
        onError: (err: Error) => toast({ title: "Sync failed", description: err.message, variant: "destructive" }),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => api.deleteEmailTopic(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "email-topics"] });
            toast({ title: "Topic deleted locally" });
        },
        onError: (err: Error) => toast({ title: "Delete failed", description: err.message, variant: "destructive" }),
    });

    return (
        <AdminLayout>
            <div className="mb-6">
                <Link href="/admin/email">
                    <Button variant="ghost" size="sm" className="mb-2">
                        <ArrowLeft className="mr-1 h-4 w-4" />
                        Email Marketing
                    </Button>
                </Link>
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Email Topics</h1>
                        <p className="text-sm text-gray-500">
                            Manage subscription topics for preference-based sending via Resend.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}>
                            <RefreshCw className="mr-1 h-4 w-4" />
                            Sync from Resend
                        </Button>
                        <Button onClick={() => setShowCreate(true)}>
                            <Plus className="mr-1 h-4 w-4" />
                            New topic
                        </Button>
                    </div>
                </div>
            </div>

            {isLoading ? (
                <EmailLoadingState />
            ) : isError ? (
                <EmailErrorState onRetry={() => refetch()} />
            ) : topics.length === 0 ? (
                <EmailEmptyState
                    title="No topics yet"
                    description="Topics let subscribers choose what emails they receive. Create one here or sync from Resend."
                    action={<Button onClick={() => setShowCreate(true)}>Create topic</Button>}
                />
            ) : (
                <div className="grid gap-4 md:grid-cols-2">
                    {topics.map((topic: any) => (
                        <Card key={topic.id}>
                            <CardHeader className="flex flex-row items-start justify-between pb-2">
                                <CardTitle className="text-lg">{topic.name}</CardTitle>
                                <Badge variant={topic.resendTopicId ? "default" : "secondary"}>
                                    {topic.resendTopicId ? "Synced" : "Local only"}
                                </Badge>
                            </CardHeader>
                            <CardContent>
                                <p className="mb-4 text-sm text-gray-500">{topic.description || "No description"}</p>
                                <p className="mb-4 text-xs text-gray-400">
                                    Default opt-in: {topic.defaultOptIn ? "Yes" : "No"}
                                </p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-red-600"
                                    onClick={() => deleteMutation.mutate(topic.id)}
                                >
                                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                                    Delete
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <Dialog open={showCreate} onOpenChange={setShowCreate}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create topic</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>Name</Label>
                            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                        </div>
                        <div>
                            <Label>Description</Label>
                            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                        </div>
                        <Button onClick={() => createMutation.mutate()} disabled={!form.name.trim() || createMutation.isPending}>
                            Create in Resend
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
}
