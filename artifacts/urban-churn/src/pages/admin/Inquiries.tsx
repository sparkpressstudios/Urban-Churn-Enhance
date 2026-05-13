import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatEastern } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import { useTour } from "@/lib/tour";
import { adminInquiriesSteps } from "@/lib/tour/tour-steps";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
    Search,
    MessageSquare,
    Clock,
    AlertTriangle,
    Send,
    Archive,
    ChevronRight,
    Phone,
    Mail,
    Calendar,
    Users,
    Building2,
} from "lucide-react";

// ── Types ──

type InquiryType = "contact" | "wholesale" | "catering" | "fundraising" | "bakery";
type InquiryStatus = "new" | "follow_up" | "contacted" | "completed" | "archived";

interface InquiryNote {
    id: number;
    inquiryId: number;
    content: string;
    author: string;
    createdAt: string;
}

interface Inquiry {
    id: number;
    type: InquiryType;
    status: InquiryStatus;
    name: string;
    email: string;
    phone: string | null;
    subject: string | null;
    message: string | null;
    formData: Record<string, any>;
    assignedTo: string | null;
    createdAt: string;
    updatedAt: string;
    noteCount?: number;
    notes?: InquiryNote[];
}

// ── Constants ──

const TYPE_LABELS: Record<InquiryType, string> = {
    contact: "Contact",
    wholesale: "Wholesale",
    catering: "Catering",
    fundraising: "Fundraising",
    bakery: "Bakery",
};

const TYPE_COLORS: Record<InquiryType, string> = {
    contact: "bg-blue-100 text-blue-800",
    wholesale: "bg-purple-100 text-purple-800",
    catering: "bg-orange-100 text-orange-800",
    fundraising: "bg-green-100 text-green-800",
    bakery: "bg-pink-100 text-pink-800",
};

const STATUS_LABELS: Record<InquiryStatus, string> = {
    new: "New",
    follow_up: "Follow Up",
    contacted: "Contacted",
    completed: "Completed",
    archived: "Archived",
};

const STATUS_COLORS: Record<InquiryStatus, string> = {
    new: "bg-yellow-100 text-yellow-800",
    follow_up: "bg-orange-100 text-orange-800 animate-pulse",
    contacted: "bg-blue-100 text-blue-800",
    completed: "bg-green-100 text-green-800",
    archived: "bg-gray-100 text-gray-600",
};

const PIPELINE_STATUSES: InquiryStatus[] = ["new", "follow_up", "contacted", "completed"];

// ── Helpers ──

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

function daysUntil(dateStr: string): number | null {
    if (!dateStr) return null;
    const eventDate = new Date(dateStr);
    if (isNaN(eventDate.getTime())) return null;
    const now = new Date();
    return Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// ── Component ──

export default function AdminInquiries() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    // Filters
    const [typeFilter, setTypeFilter] = useState<string>("all");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebounce(search);

    // Detail modal
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [noteText, setNoteText] = useState("");

    // Build query params
    const params: Record<string, string> = {};
    if (typeFilter !== "all") params.type = typeFilter;
    if (statusFilter !== "all") params.status = statusFilter;
    if (debouncedSearch) params.search = debouncedSearch;

    // Queries
    const { data: listData, isLoading } = useQuery({
        queryKey: ["inquiries", params],
        queryFn: () => api.getInquiries(params),
    });

    const { data: stats } = useQuery({
        queryKey: ["inquiry-stats"],
        queryFn: () => api.getInquiryStats(),
    });

    const { data: detail } = useQuery({
        queryKey: ["inquiry", selectedId],
        queryFn: () => api.getInquiry(selectedId!),
        enabled: selectedId !== null,
    });

    const { data: admins } = useQuery({
        queryKey: ["inquiry-admins"],
        queryFn: () => api.getInquiryAdmins(),
    });

    // Mutations
    const statusMutation = useMutation({
        mutationFn: ({ id, status }: { id: number; status: string }) =>
            api.updateInquiryStatus(id, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["inquiries"] });
            queryClient.invalidateQueries({ queryKey: ["inquiry-stats"] });
            queryClient.invalidateQueries({ queryKey: ["inquiry"] });
            toast({ title: "Status updated" });
        },
    });

    const assignMutation = useMutation({
        mutationFn: ({ id, assignedTo }: { id: number; assignedTo: string | null }) =>
            api.updateInquiry(id, { assignedTo }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["inquiries"] });
            queryClient.invalidateQueries({ queryKey: ["inquiry"] });
            toast({ title: "Assignment updated" });
        },
    });

    const noteMutation = useMutation({
        mutationFn: ({ id, content }: { id: number; content: string }) =>
            api.addInquiryNote(id, content),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["inquiry"] });
            queryClient.invalidateQueries({ queryKey: ["inquiries"] });
            setNoteText("");
            toast({ title: "Note added" });
        },
    });

    const archiveMutation = useMutation({
        mutationFn: (id: number) => api.deleteInquiry(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["inquiries"] });
            queryClient.invalidateQueries({ queryKey: ["inquiry-stats"] });
            setSelectedId(null);
            toast({ title: "Inquiry archived" });
        },
    });

    const inquiries: Inquiry[] = listData?.inquiries || [];
    const statusCounts: Record<string, number> = {};
    if (stats?.byStatus) {
        for (const s of stats.byStatus) statusCounts[s.status] = Number(s.count);
    }
    const typeCounts: Record<string, number> = {};
    if (stats?.byType) {
        for (const t of stats.byType) typeCounts[t.type] = Number(t.count);
    }
    const totalCount = Object.values(typeCounts).reduce((a, b) => a + b, 0);

    useTour("admin-inquiries", adminInquiriesSteps);

    return (
        <AdminLayout>
            <div className="space-y-6">
                {/* Header */}
                <div data-tour="admin-inquiries-header">
                    <h1 className="text-xl sm:text-2xl font-bold text-white">Inquiries</h1>
                    <p className="text-white/70 text-sm mt-1">
                        Contact forms, wholesale interest, catering requests &amp; fundraising leads
                    </p>
                </div>

                {/* Pipeline Status Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-tour="admin-inquiries-pipeline">
                    {PIPELINE_STATUSES.map((s) => (
                        <Card
                            key={s}
                            className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === s ? "ring-2 ring-[#A1AB74]" : ""
                                }`}
                            onClick={() =>
                                setStatusFilter(statusFilter === s ? "all" : s)
                            }
                        >
                            <CardContent className="p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase tracking-wide">
                                        {STATUS_LABELS[s]}
                                    </p>
                                    <p className="text-2xl font-bold">
                                        {statusCounts[s] || 0}
                                    </p>
                                </div>
                                {s === "new" && (statusCounts.new || 0) > 0 && (
                                    <span className="h-3 w-3 rounded-full bg-yellow-400 animate-pulse" />
                                )}
                                {s === "follow_up" && (statusCounts.follow_up || 0) > 0 && (
                                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Type Tabs + Search */}
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center" data-tour="admin-inquiries-type-tabs">
                    <Tabs
                        value={typeFilter}
                        onValueChange={setTypeFilter}
                        className="w-full sm:w-auto"
                    >
                        <TabsList>
                            <TabsTrigger value="all">
                                All{" "}
                                <Badge variant="secondary" className="ml-1.5 text-xs">
                                    {totalCount}
                                </Badge>
                            </TabsTrigger>
                            {(Object.keys(TYPE_LABELS) as InquiryType[]).map((t) => (
                                <TabsTrigger key={t} value={t}>
                                    {TYPE_LABELS[t]}{" "}
                                    {(typeCounts[t] || 0) > 0 && (
                                        <Badge
                                            variant="secondary"
                                            className="ml-1.5 text-xs"
                                        >
                                            {typeCounts[t]}
                                        </Badge>
                                    )}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </Tabs>
                    <div className="relative flex-1 w-full sm:max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search name or email..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                </div>

                {/* Inquiry List */}
                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#A1AB74]" />
                    </div>
                ) : inquiries.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center text-muted-foreground">
                            <MessageSquare className="mx-auto h-10 w-10 mb-3 opacity-40" />
                            <p>No inquiries found</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-2" data-tour="admin-inquiries-list">
                        {inquiries.map((inq) => (
                            <InquiryRow
                                key={inq.id}
                                inquiry={inq}
                                onClick={() => setSelectedId(inq.id)}
                            />
                        ))}
                    </div>
                )}

                {/* Detail Modal */}
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
                            <InquiryDetail
                                inquiry={detail}
                                admins={admins || []}
                                noteText={noteText}
                                onNoteTextChange={setNoteText}
                                onStatusChange={(status) =>
                                    statusMutation.mutate({
                                        id: detail.id,
                                        status,
                                    })
                                }
                                onAssign={(assignedTo) =>
                                    assignMutation.mutate({
                                        id: detail.id,
                                        assignedTo,
                                    })
                                }
                                onAddNote={() =>
                                    noteMutation.mutate({
                                        id: detail.id,
                                        content: noteText,
                                    })
                                }
                                onArchive={() => archiveMutation.mutate(detail.id)}
                                isNoteSaving={noteMutation.isPending}
                            />
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </AdminLayout>
    );
}

// ── Inquiry Row ──

function InquiryRow({
    inquiry,
    onClick,
}: {
    inquiry: Inquiry;
    onClick: () => void;
}) {
    const fd = inquiry.formData || {};
    const eventDate = inquiry.type === "catering" ? fd.date : null;
    const daysLeft = eventDate ? daysUntil(eventDate) : null;
    const isUrgent =
        inquiry.type === "catering" &&
        daysLeft !== null &&
        daysLeft <= 7 &&
        daysLeft >= 0 &&
        inquiry.status !== "completed" &&
        inquiry.status !== "archived";

    return (
        <Card
            className={`cursor-pointer transition-all hover:shadow-md ${isUrgent ? "border-orange-300 bg-orange-50/50" : ""
                }`}
            onClick={onClick}
        >
            <CardContent className="p-4">
                <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold truncate">
                                {inquiry.name}
                            </span>
                            <Badge
                                className={`text-[10px] ${TYPE_COLORS[inquiry.type]}`}
                                variant="secondary"
                            >
                                {TYPE_LABELS[inquiry.type]}
                            </Badge>
                            <Badge
                                className={`text-[10px] ${STATUS_COLORS[inquiry.status]}`}
                                variant="secondary"
                            >
                                {STATUS_LABELS[inquiry.status]}
                            </Badge>
                            {isUrgent && (
                                <Badge variant="destructive" className="text-[10px] gap-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    Event in {daysLeft}d
                                </Badge>
                            )}
                        </div>

                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {inquiry.email}
                            </span>
                            {inquiry.phone && (
                                <span className="flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    {inquiry.phone}
                                </span>
                            )}
                            {inquiry.type === "catering" && fd.eventType && (
                                <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {fd.eventType}
                                    {fd.date && ` · ${fd.date}`}
                                </span>
                            )}
                            {inquiry.type === "catering" && fd.guestCount && (
                                <span className="flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    {fd.guestCount} guests
                                </span>
                            )}
                            {inquiry.type === "wholesale" && fd.businessName && (
                                <span className="flex items-center gap-1">
                                    <Building2 className="h-3 w-3" />
                                    {fd.businessName}
                                </span>
                            )}
                        </div>

                        {inquiry.message && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                {inquiry.message}
                            </p>
                        )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                        <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {timeAgo(inquiry.createdAt)}
                        </span>
                        {(inquiry.noteCount || 0) > 0 && (
                            <span className="flex items-center gap-1">
                                <MessageSquare className="h-3 w-3" />
                                {inquiry.noteCount}
                            </span>
                        )}
                        {inquiry.assignedTo && (
                            <Badge variant="outline" className="text-[10px]">
                                {inquiry.assignedTo}
                            </Badge>
                        )}
                        <ChevronRight className="h-4 w-4" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

// ── Inquiry Detail ──

function InquiryDetail({
    inquiry,
    admins,
    noteText,
    onNoteTextChange,
    onStatusChange,
    onAssign,
    onAddNote,
    onArchive,
    isNoteSaving,
}: {
    inquiry: Inquiry & { notes: InquiryNote[] };
    admins: { id: number; username: string }[];
    noteText: string;
    onNoteTextChange: (v: string) => void;
    onStatusChange: (status: string) => void;
    onAssign: (assignedTo: string | null) => void;
    onAddNote: () => void;
    onArchive: () => void;
    isNoteSaving: boolean;
}) {
    const fd = inquiry.formData || {};
    const eventDate = inquiry.type === "catering" ? fd.date : null;
    const daysLeft = eventDate ? daysUntil(eventDate) : null;

    return (
        <>
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2 flex-wrap">
                    {inquiry.name}
                    <Badge
                        className={`${TYPE_COLORS[inquiry.type]}`}
                        variant="secondary"
                    >
                        {TYPE_LABELS[inquiry.type]}
                    </Badge>
                </DialogTitle>
            </DialogHeader>

            <div className="space-y-5">
                {/* Catering urgency warning */}
                {inquiry.type === "catering" &&
                    daysLeft !== null &&
                    daysLeft <= 7 &&
                    daysLeft >= 0 &&
                    inquiry.status !== "completed" && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-orange-50 text-orange-800 border border-orange-200">
                            <AlertTriangle className="h-5 w-5 shrink-0" />
                            <span className="text-sm font-medium">
                                Event is in {daysLeft} day{daysLeft !== 1 ? "s" : ""}!
                                {inquiry.status === "new" &&
                                    " This inquiry hasn't been followed up on yet."}
                            </span>
                        </div>
                    )}

                {/* Pipeline status buttons */}
                <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Pipeline Status
                    </label>
                    <div className="flex gap-2 mt-1.5 flex-wrap">
                        {PIPELINE_STATUSES.map((s) => (
                            <Button
                                key={s}
                                size="sm"
                                variant={inquiry.status === s ? "default" : "outline"}
                                className={
                                    inquiry.status === s
                                        ? "bg-[#A1AB74] hover:bg-[#8a9463] text-white"
                                        : ""
                                }
                                onClick={() => onStatusChange(s)}
                            >
                                {STATUS_LABELS[s]}
                            </Button>
                        ))}
                    </div>
                </div>

                {/* Assign to */}
                <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Assigned To
                    </label>
                    <Select
                        value={inquiry.assignedTo || "_none"}
                        onValueChange={(v) =>
                            onAssign(v === "_none" ? null : v)
                        }
                    >
                        <SelectTrigger className="mt-1.5 w-48">
                            <SelectValue placeholder="Unassigned" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="_none">Unassigned</SelectItem>
                            {admins.map((a) => (
                                <SelectItem key={a.id} value={a.username}>
                                    {a.username}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Contact info */}
                <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Contact Info
                    </label>
                    <div className="mt-1.5 space-y-1 text-sm">
                        <p className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <a
                                href={`mailto:${inquiry.email}`}
                                className="text-blue-600 hover:underline"
                            >
                                {inquiry.email}
                            </a>
                        </p>
                        {inquiry.phone && (
                            <p className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <a
                                    href={`tel:${inquiry.phone}`}
                                    className="text-blue-600 hover:underline"
                                >
                                    {inquiry.phone}
                                </a>
                            </p>
                        )}
                    </div>
                </div>

                {/* Form data (type-specific) */}
                <FormDataSection type={inquiry.type} data={fd} subject={inquiry.subject} />

                {/* Message */}
                {inquiry.message && (
                    <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Message
                        </label>
                        <p className="mt-1.5 text-sm whitespace-pre-wrap bg-muted/50 p-3 rounded-lg">
                            {inquiry.message}
                        </p>
                    </div>
                )}

                {/* Notes timeline */}
                <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Notes &amp; Activity ({inquiry.notes?.length || 0})
                    </label>

                    <div className="mt-2 space-y-3">
                        {/* Add note */}
                        <div className="flex gap-2">
                            <Textarea
                                placeholder="Add a note..."
                                value={noteText}
                                onChange={(e) => onNoteTextChange(e.target.value)}
                                rows={2}
                                className="flex-1 resize-none"
                            />
                            <Button
                                size="sm"
                                className="self-end bg-[#A1AB74] hover:bg-[#8a9463]"
                                disabled={!noteText.trim() || isNoteSaving}
                                onClick={onAddNote}
                            >
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* Existing notes */}
                        {inquiry.notes && inquiry.notes.length > 0 ? (
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {inquiry.notes.map((note) => (
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
                                        <p className="whitespace-pre-wrap">{note.content}</p>
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

                {/* Footer */}
                <div className="flex items-center justify-between pt-2 border-t">
                    <p className="text-xs text-muted-foreground">
                        Submitted{" "}
                        {formatEastern(inquiry.createdAt, {
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
                        onClick={onArchive}
                    >
                        <Archive className="h-4 w-4 mr-1" />
                        Archive
                    </Button>
                </div>
            </div>
        </>
    );
}

// ── Form Data Section (type-specific fields) ──

function FormDataSection({
    type,
    data,
    subject,
}: {
    type: InquiryType;
    data: Record<string, any>;
    subject: string | null;
}) {
    let fields: { label: string; value: string }[] = [];

    switch (type) {
        case "contact":
            if (subject) fields.push({ label: "Subject", value: subject });
            break;
        case "wholesale":
            if (data.businessName)
                fields.push({ label: "Business Name", value: data.businessName });
            if (data.businessType)
                fields.push({ label: "Business Type", value: data.businessType });
            if (data.location)
                fields.push({ label: "Location", value: data.location });
            if (data.interest)
                fields.push({ label: "Interest", value: data.interest });
            break;
        case "catering":
            if (data.eventType)
                fields.push({ label: "Event Type", value: data.eventType });
            if (data.date) fields.push({ label: "Event Date", value: data.date });
            if (data.guestCount)
                fields.push({ label: "Guest Count", value: data.guestCount });
            break;
        case "fundraising":
            if (data.orgName)
                fields.push({ label: "Organization", value: data.orgName });
            if (data.orgType)
                fields.push({ label: "Org Type", value: data.orgType });
            break;
        case "bakery":
            if (data.orderNumber)
                fields.push({ label: "Order #", value: data.orderNumber });
            if (data.orderType)
                fields.push({ label: "Order Type", value: data.orderType });
            if (data.pickupDate)
                fields.push({ label: "Pickup Date", value: data.pickupDate });
            if (data.pickupTime)
                fields.push({ label: "Pickup Time", value: data.pickupTime });
            if (data.totalPriceCents)
                fields.push({ label: "Total", value: `$${(data.totalPriceCents / 100).toFixed(2)}` });
            if (data.referral)
                fields.push({ label: "Referral", value: data.referral });
            // Order details (varies by type)
            if (data.orderDetails) {
                const od = data.orderDetails;
                if (od.cakeFlavor)
                    fields.push({ label: "Cake Flavor", value: od.cakeFlavor });
                if (od.iceCreamFlavor)
                    fields.push({ label: "Ice Cream Flavor", value: od.iceCreamFlavor });
                if (od.frostingType)
                    fields.push({ label: "Frosting Type", value: od.frostingType });
                if (od.frostingFlavor)
                    fields.push({ label: "Frosting Flavor", value: od.frostingFlavor });
                if (od.frostingCoverage)
                    fields.push({ label: "Frosting Coverage", value: od.frostingCoverage });
                if (od.cakeSize)
                    fields.push({ label: "Cake Size", value: od.cakeSize });
                if (od.filling && typeof od.filling === "string")
                    fields.push({ label: "Filling", value: od.filling });
                else if (od.filling === true && od.fillingFlavor)
                    fields.push({ label: "Filling", value: od.fillingFlavor });
                if (od.topper)
                    fields.push({ label: "Cake Topper", value: od.topper });
                if (od.quantity)
                    fields.push({ label: "Quantity", value: String(od.quantity) });
                if (od.decorativeAccents)
                    fields.push({ label: "Decorative Accents", value: "Yes" });
            }
            // Add-ons
            if (data.addOns) {
                const ao = data.addOns;
                if (ao.topper)
                    fields.push({ label: "Topper", value: ao.topperMessage || "Yes" });
                if (ao.colorAccents)
                    fields.push({ label: "Color Accents", value: ao.frostingColor || "Yes" });
            }
            break;
    }

    if (fields.length === 0) return null;

    return (
        <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {type === "catering" ? "Event Details" : "Details"}
            </label>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
                {fields.map((f) => (
                    <div
                        key={f.label}
                        className="bg-muted/50 rounded-lg p-2.5"
                    >
                        <p className="text-[10px] text-muted-foreground uppercase">
                            {f.label}
                        </p>
                        <p className="text-sm font-medium">{f.value}</p>
                    </div>
                ))}
            </div>
            {type === "bakery" && data.inspirationPhotoUrl && (
                <div className="mt-3">
                    <p className="text-[10px] text-muted-foreground uppercase mb-1.5">Inspiration Photo</p>
                    <img
                        src={data.inspirationPhotoUrl}
                        alt="Inspiration"
                        className="rounded-lg max-h-48 object-cover border"
                    />
                </div>
            )}
        </div>
    );
}
