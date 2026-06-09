import { useState, useEffect } from "react";
import { Link, useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Trash2, Save } from "lucide-react";
import { SegmentRulesEditor, type SegmentRules } from "@/components/admin/email-marketing/SegmentRulesEditor";

const DEFAULT_RULES: SegmentRules = { combinator: "and", conditions: [] };

export default function EmailSegmentDetail() {
    const params = useParams<{ id: string }>();
    const segmentId = parseInt(params.id || "0", 10);
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [showAdd, setShowAdd] = useState(false);
    const [contactSearch, setContactSearch] = useState("");
    const [rules, setRules] = useState<SegmentRules>(DEFAULT_RULES);

    const { data, isLoading } = useQuery({
        queryKey: ["admin", "email-segment", segmentId],
        queryFn: () => api.getEmailSegment(segmentId),
        enabled: segmentId > 0,
    });

    const segment = data?.segment;
    const members = data?.members ?? [];

    useEffect(() => {
        if (segment?.rules) {
            setRules(segment.rules as SegmentRules);
        }
    }, [segment?.rules]);

    const { data: allContacts } = useQuery({
        queryKey: ["admin", "email-contacts-picker", contactSearch],
        queryFn: () => api.getEmailContacts({ search: contactSearch, limit: 50 }),
        enabled: showAdd && segment?.type === "static",
    });

    const saveRulesMutation = useMutation({
        mutationFn: () => api.updateEmailSegment(segmentId, { rules }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "email-segment", segmentId] });
            toast({ title: "Rules saved" });
        },
    });

    const addMutation = useMutation({
        mutationFn: (contactIds: number[]) => api.addEmailSegmentMembers(segmentId, contactIds),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "email-segment", segmentId] });
            queryClient.invalidateQueries({ queryKey: ["admin", "email-segments"] });
            setShowAdd(false);
            toast({ title: "Contacts added" });
        },
    });

    const removeMutation = useMutation({
        mutationFn: (contactId: number) => api.removeEmailSegmentMember(segmentId, contactId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "email-segment", segmentId] });
            queryClient.invalidateQueries({ queryKey: ["admin", "email-segments"] });
        },
    });

    const memberIds = new Set(members.map((m: any) => m.id));
    const availableContacts = (allContacts?.contacts ?? []).filter((c: any) => !memberIds.has(c.id));

    if (isLoading || !segment) {
        return (
            <AdminLayout>
                <p className="text-sm text-gray-500">Loading segment...</p>
            </AdminLayout>
        );
    }

    const isDynamic = segment.type === "dynamic";

    return (
        <AdminLayout>
            <div className="mb-6">
                <Link href="/admin/email/segments">
                    <Button variant="ghost" size="sm" className="mb-2">
                        <ArrowLeft className="mr-1 h-4 w-4" />
                        Segments
                    </Button>
                </Link>
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold">{segment.name}</h1>
                    <Badge variant={isDynamic ? "default" : "secondary"}>{segment.type}</Badge>
                </div>
                <p className="text-sm text-gray-500">{segment.description || "No description"}</p>
            </div>

            {isDynamic && (
                <Card className="mb-6">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-lg">Dynamic rules</CardTitle>
                        <Button size="sm" onClick={() => saveRulesMutation.mutate()} disabled={saveRulesMutation.isPending}>
                            <Save className="mr-1 h-4 w-4" />
                            Save rules
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <SegmentRulesEditor
                            rules={rules}
                            onChange={setRules}
                            segmentId={segmentId}
                            onSave={() => {
                                queryClient.invalidateQueries({ queryKey: ["admin", "email-segment", segmentId] });
                                queryClient.invalidateQueries({ queryKey: ["admin", "email-segments"] });
                            }}
                        />
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg">
                        Members <Badge variant="secondary" className="ml-2">{members.length}</Badge>
                        {isDynamic && (
                            <span className="ml-2 text-xs font-normal text-gray-400">(auto-populated from rules)</span>
                        )}
                    </CardTitle>
                    {!isDynamic && (
                        <Button size="sm" onClick={() => setShowAdd(true)}>
                            <Plus className="mr-1 h-4 w-4" />
                            Add Contacts
                        </Button>
                    )}
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Email</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Status</TableHead>
                                {!isDynamic && <TableHead />}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {members.map((m: any) => (
                                <TableRow key={m.id}>
                                    <TableCell>{m.email}</TableCell>
                                    <TableCell>{[m.firstName, m.lastName].filter(Boolean).join(" ")}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{m.marketingStatus}</Badge>
                                    </TableCell>
                                    {!isDynamic && (
                                        <TableCell>
                                            <Button variant="ghost" size="icon" onClick={() => removeMutation.mutate(m.id)}>
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))}
                            {members.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center text-gray-400">
                                        {isDynamic ? "No contacts match the current rules." : "No contacts in this segment yet."}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={showAdd} onOpenChange={setShowAdd}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Add Contacts to Segment</DialogTitle>
                    </DialogHeader>
                    <Input
                        placeholder="Search contacts..."
                        value={contactSearch}
                        onChange={(e) => setContactSearch(e.target.value)}
                        className="mb-4"
                    />
                    <div className="max-h-64 space-y-2 overflow-y-auto">
                        {availableContacts.map((c: any) => (
                            <div key={c.id} className="flex items-center justify-between rounded border px-3 py-2">
                                <div>
                                    <p className="text-sm font-medium">{c.email}</p>
                                    <p className="text-xs text-gray-500">{[c.firstName, c.lastName].filter(Boolean).join(" ")}</p>
                                </div>
                                <Button size="sm" variant="outline" onClick={() => addMutation.mutate([c.id])}>
                                    Add
                                </Button>
                            </div>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
}
