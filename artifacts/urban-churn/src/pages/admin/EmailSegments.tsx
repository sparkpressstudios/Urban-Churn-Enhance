import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Plus, Users, ChevronRight } from "lucide-react";

export default function EmailSegments() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [showCreate, setShowCreate] = useState(false);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [segmentType, setSegmentType] = useState<"static" | "dynamic">("static");

    const { data: segments = [], isLoading } = useQuery({
        queryKey: ["admin", "email-segments"],
        queryFn: api.getEmailSegments,
    });

    const createMutation = useMutation({
        mutationFn: () => api.createEmailSegment({
            name,
            description,
            type: segmentType,
            rules: segmentType === "dynamic" ? { combinator: "and", conditions: [] } : undefined,
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "email-segments"] });
            setShowCreate(false);
            setName("");
            setDescription("");
            toast({ title: "Segment created" });
        },
        onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });

    return (
        <AdminLayout>
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Email Segments</h1>
                    <p className="text-sm text-gray-500">Group contacts into audiences for campaigns.</p>
                </div>
                <Button onClick={() => setShowCreate(true)}>
                    <Plus className="mr-1 h-4 w-4" />
                    New Segment
                </Button>
            </div>

            {isLoading ? (
                <p className="text-sm text-gray-500">Loading...</p>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {segments.map((segment: any) => (
                        <Link key={segment.id} href={`/admin/email/segments/${segment.id}`}>
                            <Card className="cursor-pointer transition hover:border-blue-300 hover:shadow-md">
                                <CardHeader className="pb-2">
                                    <div className="flex items-start justify-between">
                                        <CardTitle className="text-lg">{segment.name}</CardTitle>
                                        <ChevronRight className="h-5 w-5 text-gray-300" />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <p className="mb-3 text-sm text-gray-500 line-clamp-2">
                                        {segment.description || "No description"}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="secondary">
                                            <Users className="mr-1 h-3 w-3" />
                                            {segment.contactCount} contacts
                                        </Badge>
                                        <Badge variant="outline">{segment.type}</Badge>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                    {segments.length === 0 && (
                        <Card className="col-span-full">
                            <CardContent className="py-12 text-center text-gray-400">
                                No segments yet. Create one to start organizing your audience.
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            <Dialog open={showCreate} onOpenChange={setShowCreate}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create Segment</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div>
                            <Label>Name</Label>
                            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Newsletter subscribers" />
                        </div>
                        <div>
                            <Label>Type</Label>
                            <Select value={segmentType} onValueChange={(v: "static" | "dynamic") => setSegmentType(v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="static">Static (manual members)</SelectItem>
                                    <SelectItem value="dynamic">Dynamic (rule-based)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Description</Label>
                            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
                        </div>
                        <Button onClick={() => createMutation.mutate()} disabled={!name.trim() || createMutation.isPending}>
                            Create Segment
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
}
