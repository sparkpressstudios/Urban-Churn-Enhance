import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatEastern } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
    Archive,
    ChevronRight,
    Clock,
    Download,
    Mail,
    MapPin,
    MessageSquare,
    Phone,
    Send,
    UserRound,
} from "lucide-react";

type InquiryStatus = "new" | "follow_up" | "contacted" | "completed" | "archived";

interface InquiryNote {
    id: number;
    inquiryId: number;
    content: string;
    author: string;
    createdAt: string;
}

interface CareerApplication {
    id: number;
    status: InquiryStatus;
    name: string;
    email: string;
    phone: string | null;
    message: string | null;
    formData: Record<string, string>;
    createdAt: string;
    noteCount?: number;
    notes?: InquiryNote[];
}

const STATUS_LABELS: Record<InquiryStatus, string> = {
    new: "New",
    follow_up: "Follow Up",
    contacted: "Contacted",
    completed: "Completed",
    archived: "Archived",
};

const STATUS_COLORS: Record<InquiryStatus, string> = {
    new: "bg-yellow-100 text-yellow-800",
    follow_up: "bg-orange-100 text-orange-800",
    contacted: "bg-blue-100 text-blue-800",
    completed: "bg-green-100 text-green-800",
    archived: "bg-gray-100 text-gray-600",
};

const PIPELINE_STATUSES: InquiryStatus[] = ["new", "follow_up", "contacted", "completed"];

function timeAgo(dateStr: string): string {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHr / 24);

    if (diffMin < 1) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDays < 30) return `${diffDays}d ago`;
    return formatEastern(date, { month: "short", day: "numeric" });
}

export function CareerApplicationsTab() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [noteText, setNoteText] = useState("");

    const { data: importPreview } = useQuery({
        queryKey: ["career-applications-import-preview"],
        queryFn: () => api.previewCareerApplicationImport(),
    });

    const { data, isLoading } = useQuery({
        queryKey: ["career-applications"],
        queryFn: () => api.getInquiries({ type: "career" }),
    });

    const { data: detail } = useQuery({
        queryKey: ["inquiry", selectedId],
        queryFn: () => api.getInquiry(selectedId!),
        enabled: selectedId !== null,
    });

    const statusMutation = useMutation({
        mutationFn: ({ id, status }: { id: number; status: string }) =>
            api.updateInquiryStatus(id, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["career-applications"] });
            queryClient.invalidateQueries({ queryKey: ["inquiry"] });
            queryClient.invalidateQueries({ queryKey: ["inquiry-stats"] });
            toast({ title: "Status updated" });
        },
    });

    const noteMutation = useMutation({
        mutationFn: ({ id, content }: { id: number; content: string }) =>
            api.addInquiryNote(id, content),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["inquiry"] });
            queryClient.invalidateQueries({ queryKey: ["career-applications"] });
            setNoteText("");
            toast({ title: "Note added" });
        },
    });

    const archiveMutation = useMutation({
        mutationFn: (id: number) => api.deleteInquiry(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["career-applications"] });
            queryClient.invalidateQueries({ queryKey: ["inquiry-stats"] });
            setSelectedId(null);
            toast({ title: "Application archived" });
        },
    });

    const importMutation = useMutation({
        mutationFn: () => api.importCareerApplications(),
        onSuccess: (result: {
            imported: number;
            skipped: number;
            partial: number;
            totalEmailLogs: number;
        }) => {
            queryClient.invalidateQueries({ queryKey: ["career-applications"] });
            queryClient.invalidateQueries({ queryKey: ["career-applications-import-preview"] });
            queryClient.invalidateQueries({ queryKey: ["inquiry-stats"] });
            toast({
                title: `Imported ${result.imported} application${result.imported === 1 ? "" : "s"}`,
                description:
                    result.partial > 0
                        ? `${result.partial} imported with limited details from older email records.`
                        : undefined,
            });
        },
        onError: () => {
            toast({
                title: "Import failed",
                description: "Could not import past applications. Please try again.",
                variant: "destructive",
            });
        },
    });

    const applications: CareerApplication[] = data?.inquiries || [];
    const newCount = applications.filter((a) => a.status === "new").length;

    return (
        <>
            <Card data-tour="admin-careers-applications">
                <CardHeader className="pb-4">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <CardTitle className="text-lg">Job Applications</CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                                Submissions from the public careers page application form
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            {newCount > 0 && (
                                <Badge className="bg-yellow-100 text-yellow-800">
                                    {newCount} new
                                </Badge>
                            )}
                            {(importPreview?.pendingImport || 0) > 0 && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="gap-2"
                                    disabled={importMutation.isPending}
                                    onClick={() => importMutation.mutate()}
                                >
                                    <Download className="h-4 w-4" />
                                    Import {importPreview.pendingImport} past
                                </Button>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#A1AB74]" />
                        </div>
                    ) : applications.length === 0 ? (
                        <div className="py-12 text-center text-muted-foreground">
                            <UserRound className="mx-auto h-10 w-10 mb-3 opacity-40" />
                            <p>No applications yet</p>
                            <p className="text-xs mt-1">
                                Applications submitted on the careers page will appear here.
                                {(importPreview?.pendingImport || 0) > 0 &&
                                    " Older submissions can be imported from the email log."}
                            </p>
                            {(importPreview?.pendingImport || 0) > 0 && (
                                <Button
                                    className="mt-4 gap-2"
                                    variant="outline"
                                    disabled={importMutation.isPending}
                                    onClick={() => importMutation.mutate()}
                                >
                                    <Download className="h-4 w-4" />
                                    Import {importPreview.pendingImport} past applications
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {applications.map((application) => {
                                const fd = application.formData || {};
                                return (
                                    <Card
                                        key={application.id}
                                        className="cursor-pointer transition-all hover:shadow-md"
                                        onClick={() => setSelectedId(application.id)}
                                    >
                                        <CardContent className="p-4">
                                            <div className="flex items-start gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="font-semibold truncate">
                                                            {application.name}
                                                        </span>
                                                        <Badge
                                                            className={`text-[10px] ${STATUS_COLORS[application.status]}`}
                                                            variant="secondary"
                                                        >
                                                            {STATUS_LABELS[application.status]}
                                                        </Badge>
                                                        {application.formData?.importSource === "email_log" && (
                                                            <Badge variant="outline" className="text-[10px]">
                                                                Imported
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                                                        <span className="flex items-center gap-1">
                                                            <Mail className="h-3 w-3" />
                                                            {application.email}
                                                        </span>
                                                        {application.phone && (
                                                            <span className="flex items-center gap-1">
                                                                <Phone className="h-3 w-3" />
                                                                {application.phone}
                                                            </span>
                                                        )}
                                                        {fd.location && (
                                                            <span className="flex items-center gap-1">
                                                                <MapPin className="h-3 w-3" />
                                                                {fd.location}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {application.message && (
                                                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                                            {application.message}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        {timeAgo(application.createdAt)}
                                                    </span>
                                                    {(application.noteCount || 0) > 0 && (
                                                        <span className="flex items-center gap-1">
                                                            <MessageSquare className="h-3 w-3" />
                                                            {application.noteCount}
                                                        </span>
                                                    )}
                                                    <ChevronRight className="h-4 w-4" />
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog
                open={selectedId !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setSelectedId(null);
                        setNoteText("");
                    }
                }}
            >
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    {detail && (
                        <>
                            <DialogHeader>
                                <DialogTitle>{detail.name}</DialogTitle>
                            </DialogHeader>

                            <div className="space-y-5">
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                        Pipeline Status
                                    </label>
                                    <div className="flex gap-2 mt-1.5 flex-wrap">
                                        {PIPELINE_STATUSES.map((status) => (
                                            <Button
                                                key={status}
                                                size="sm"
                                                variant={detail.status === status ? "default" : "outline"}
                                                className={
                                                    detail.status === status
                                                        ? "bg-[#A1AB74] hover:bg-[#8a9463] text-white"
                                                        : ""
                                                }
                                                onClick={() =>
                                                    statusMutation.mutate({
                                                        id: detail.id,
                                                        status,
                                                    })
                                                }
                                            >
                                                {STATUS_LABELS[status]}
                                            </Button>
                                        ))}
                                    </div>
                                </div>

                                {detail.formData?.importSource === "email_log" && (
                                    <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
                                        Imported from older email notifications
                                        {detail.formData.partialImport
                                            ? " with limited details. Check the original notification email if contact info is missing."
                                            : "."}
                                    </div>
                                )}

                                <div>
                                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                        Contact Info
                                    </label>
                                    <div className="mt-1.5 space-y-1 text-sm">
                                        {(() => {
                                            const applicantEmail =
                                                detail.formData?.email ||
                                                (detail.email.includes("@legacy.urbanchurn.local")
                                                    ? ""
                                                    : detail.email);
                                            if (!applicantEmail) return null;
                                            return (
                                                <p className="flex items-center gap-2">
                                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                                    <a
                                                        href={`mailto:${applicantEmail}`}
                                                        className="text-blue-600 hover:underline"
                                                    >
                                                        {applicantEmail}
                                                    </a>
                                                </p>
                                            );
                                        })()}
                                        {detail.phone && (
                                            <p className="flex items-center gap-2">
                                                <Phone className="h-4 w-4 text-muted-foreground" />
                                                <a
                                                    href={`tel:${detail.phone}`}
                                                    className="text-blue-600 hover:underline"
                                                >
                                                    {detail.phone}
                                                </a>
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {detail.formData?.location && (
                                        <div className="bg-muted/50 rounded-lg p-2.5">
                                            <p className="text-[10px] text-muted-foreground uppercase">
                                                Preferred Location
                                            </p>
                                            <p className="text-sm font-medium">
                                                {detail.formData.location}
                                            </p>
                                        </div>
                                    )}
                                    {detail.formData?.about && (
                                        <div className="bg-muted/50 rounded-lg p-2.5 sm:col-span-2">
                                            <p className="text-[10px] text-muted-foreground uppercase">
                                                About
                                            </p>
                                            <p className="text-sm font-medium whitespace-pre-wrap">
                                                {detail.formData.about}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {detail.message && (
                                    <div>
                                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                            Why Urban Churn
                                        </label>
                                        <p className="mt-1.5 text-sm whitespace-pre-wrap bg-muted/50 p-3 rounded-lg">
                                            {detail.message}
                                        </p>
                                    </div>
                                )}

                                <div>
                                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                        Notes ({detail.notes?.length || 0})
                                    </label>
                                    <div className="mt-2 space-y-3">
                                        <div className="flex gap-2">
                                            <Textarea
                                                placeholder="Add a note..."
                                                value={noteText}
                                                onChange={(e) => setNoteText(e.target.value)}
                                                rows={2}
                                                className="flex-1 resize-none"
                                            />
                                            <Button
                                                size="sm"
                                                className="self-end bg-[#A1AB74] hover:bg-[#8a9463]"
                                                disabled={!noteText.trim() || noteMutation.isPending}
                                                onClick={() =>
                                                    noteMutation.mutate({
                                                        id: detail.id,
                                                        content: noteText,
                                                    })
                                                }
                                            >
                                                <Send className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        {detail.notes && detail.notes.length > 0 ? (
                                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                                {detail.notes.map((note) => (
                                                    <div
                                                        key={note.id}
                                                        className="bg-muted/50 rounded-lg p-3 text-sm"
                                                    >
                                                        <div className="flex items-center justify-between mb-1">
                                                            <span className="font-medium text-xs">
                                                                {note.author}
                                                            </span>
                                                            <span className="text-xs text-muted-foreground">
                                                                {formatEastern(note.createdAt, {
                                                                    month: "short",
                                                                    day: "numeric",
                                                                    hour: "numeric",
                                                                    minute: "2-digit",
                                                                })}
                                                            </span>
                                                        </div>
                                                        <p className="whitespace-pre-wrap">
                                                            {note.content}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-muted-foreground italic">
                                                No notes yet
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-2 border-t">
                                    <p className="text-xs text-muted-foreground">
                                        Submitted{" "}
                                        {formatEastern(detail.createdAt, {
                                            month: "short",
                                            day: "numeric",
                                            year: "numeric",
                                            hour: "numeric",
                                            minute: "2-digit",
                                        })}
                                    </p>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                        onClick={() => archiveMutation.mutate(detail.id)}
                                    >
                                        <Archive className="h-4 w-4 mr-1" />
                                        Archive
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
