import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatEasternDate } from "@/lib/utils";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useTour } from "@/lib/tour";
import { adminEventsSteps } from "@/lib/tour/tour-steps";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    CalendarDays,
    Plus,
    Pencil,
    Trash2,
    Copy,
    MapPin,
    DollarSign,
    Ticket,
    Eye,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

const CATEGORIES = [
    { value: "tasting", label: "Tasting" },
    { value: "festival", label: "Festival" },
    { value: "pop_up", label: "Pop-Up" },
    { value: "trivia", label: "Trivia" },
    { value: "party", label: "Party" },
    { value: "other", label: "Other" },
];

const STATUSES = [
    { value: "draft", label: "Draft" },
    { value: "published", label: "Published" },
    { value: "sold_out", label: "Sold Out" },
    { value: "cancelled", label: "Cancelled" },
    { value: "completed", label: "Completed" },
];

const STATUS_COLORS: Record<string, string> = {
    draft: "bg-gray-100 text-gray-800",
    published: "bg-green-100 text-green-800",
    sold_out: "bg-red-100 text-red-800",
    cancelled: "bg-yellow-100 text-yellow-800",
    completed: "bg-blue-100 text-blue-800",
};

interface TicketTypeForm {
    id?: number;
    name: string;
    description: string;
    priceCents: number;
    quantity: number;
    maxPerOrder: number;
    sortOrder: number;
    active: boolean;
}

const emptyTicketType: TicketTypeForm = {
    name: "",
    description: "",
    priceCents: 0,
    quantity: 100,
    maxPerOrder: 10,
    sortOrder: 0,
    active: true,
};

const emptyEvent = {
    title: "",
    slug: "",
    description: "",
    imageUrl: "",
    locationId: null as number | null,
    venueName: "",
    venueAddress: "",
    eventDate: "",
    startTime: "18:00",
    endTime: "",
    category: "other" as string,
    status: "draft" as string,
    isPrivate: false,
    accentColor: "#A1AB74",
    sortOrder: 0,
    ticketTypes: [{ ...emptyTicketType, name: "General Admission", priceCents: 1500, quantity: 100 }] as TicketTypeForm[],
};

export default function AdminEvents() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [form, setForm] = useState<typeof emptyEvent>({ ...emptyEvent });
    const [filterStatus, setFilterStatus] = useState<string>("");

    const { data: events = [], isLoading, isError } = useQuery({
        queryKey: ["admin", "events", filterStatus],
        queryFn: () => api.getEvents(filterStatus ? { status: filterStatus } : undefined),
    });

    const { data: stats } = useQuery({
        queryKey: ["admin", "events", "stats"],
        queryFn: api.getEventStats,
    });

    const { data: locations = [] } = useQuery({
        queryKey: ["admin", "locations"],
        queryFn: api.getLocations,
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => api.createEvent(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "events"] });
            setDialogOpen(false);
            toast({ title: "Event created" });
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: any }) => api.updateEvent(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "events"] });
            setDialogOpen(false);
            toast({ title: "Event updated" });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => api.deleteEvent(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "events"] });
            toast({ title: "Event deleted" });
        },
    });

    const duplicateMutation = useMutation({
        mutationFn: (id: number) => api.duplicateEvent(id, {}),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "events"] });
            toast({ title: "Event duplicated" });
        },
    });

    const openCreate = () => {
        setEditingId(null);
        setForm({ ...emptyEvent, ticketTypes: [{ ...emptyTicketType, name: "General Admission", priceCents: 1500, quantity: 100 }] });
        setDialogOpen(true);
    };

    const openEdit = (event: any) => {
        setEditingId(event.id);
        setForm({
            title: event.title,
            slug: event.slug,
            description: event.description || "",
            imageUrl: event.imageUrl || "",
            locationId: event.locationId,
            venueName: event.venueName || "",
            venueAddress: event.venueAddress || "",
            eventDate: event.eventDate,
            startTime: event.startTime,
            endTime: event.endTime || "",
            category: event.category,
            status: event.status,
            isPrivate: event.isPrivate,
            accentColor: event.accentColor || "#A1AB74",
            sortOrder: event.sortOrder,
            ticketTypes: event.ticketTypes?.map((tt: any) => ({
                id: tt.id,
                name: tt.name,
                description: tt.description || "",
                priceCents: tt.priceCents,
                quantity: tt.quantity,
                maxPerOrder: tt.maxPerOrder,
                sortOrder: tt.sortOrder,
                active: tt.active,
            })) || [],
        });
        setDialogOpen(true);
    };

    const handleSave = () => {
        // Validate times
        if (form.startTime && form.endTime && form.endTime <= form.startTime) {
            toast({ title: "Invalid times", description: "End time must be after start time", variant: "destructive" });
            return;
        }

        const data = {
            ...form,
            locationId: form.locationId || null,
        };
        if (editingId) {
            updateMutation.mutate({ id: editingId, data });
        } else {
            createMutation.mutate(data);
        }
    };

    const autoSlug = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    const addTicketType = () => {
        setForm((f) => ({
            ...f,
            ticketTypes: [...f.ticketTypes, { ...emptyTicketType, sortOrder: f.ticketTypes.length }],
        }));
    };

    const removeTicketType = (index: number) => {
        setForm((f) => ({
            ...f,
            ticketTypes: f.ticketTypes.filter((_, i) => i !== index),
        }));
    };

    const updateTicketType = (index: number, field: string, value: any) => {
        setForm((f) => ({
            ...f,
            ticketTypes: f.ticketTypes.map((tt, i) =>
                i === index ? { ...tt, [field]: value } : tt,
            ),
        }));
    };

    useTour("admin-events", adminEventsSteps);

    return (
        <AdminLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between" data-tour="admin-events-header">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-white">Events</h1>
                        <p className="text-white/70 text-sm">Manage events and ticket sales</p>
                    </div>
                    <Button onClick={openCreate} className="bg-[#A1AB74] hover:bg-[#8a9360]" data-tour="admin-events-create">
                        <Plus className="w-4 h-4 mr-2" />
                        Create Event
                    </Button>
                </div>

                {/* Stats */}
                {stats && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-tour="admin-events-stats">
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-3">
                                    <CalendarDays className="w-5 h-5 text-[#A1AB74]" />
                                    <div>
                                        <p className="text-2xl font-bold">{stats.totalEvents}</p>
                                        <p className="text-xs text-gray-500">Total Events</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-3">
                                    <CalendarDays className="w-5 h-5 text-blue-500" />
                                    <div>
                                        <p className="text-2xl font-bold">{stats.upcomingEvents}</p>
                                        <p className="text-xs text-gray-500">Upcoming</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-3">
                                    <Ticket className="w-5 h-5 text-purple-500" />
                                    <div>
                                        <p className="text-2xl font-bold">{stats.totalTicketsSold}</p>
                                        <p className="text-xs text-gray-500">Tickets Sold</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-3">
                                    <DollarSign className="w-5 h-5 text-green-500" />
                                    <div>
                                        <p className="text-2xl font-bold">
                                            ${(stats.totalRevenueCents / 100).toFixed(2)}
                                        </p>
                                        <p className="text-xs text-gray-500">Revenue</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Filters */}
                <div className="flex items-center gap-4" data-tour="admin-events-filters">
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="w-48">
                            <SelectValue placeholder="All statuses" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            {STATUSES.map((s) => (
                                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {filterStatus && filterStatus !== "all" && (
                        <Button variant="ghost" size="sm" onClick={() => setFilterStatus("")}>
                            Clear
                        </Button>
                    )}
                </div>

                {/* Events Table */}
                <Card data-tour="admin-events-table">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Event</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Location</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-center">Tickets</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-gray-400">
                                            Loading events...
                                        </TableCell>
                                    </TableRow>
                                )}
                                {isError && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-red-400">
                                            Failed to load events. Please refresh the page.
                                        </TableCell>
                                    </TableRow>
                                )}
                                {!isLoading && events.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-gray-400">
                                            No events found. Create your first event!
                                        </TableCell>
                                    </TableRow>
                                )}
                                {events.map((event: any) => (
                                    <TableRow key={event.id}>
                                        <TableCell>
                                            <div>
                                                <p className="font-bold">{event.title}</p>
                                                <p className="text-xs text-gray-400">{event.category}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap">
                                            {formatEasternDate(event.eventDate + "T00:00:00", {
                                                month: "short",
                                                day: "numeric",
                                                year: "numeric",
                                            })}
                                        </TableCell>
                                        <TableCell>
                                            <span className="flex items-center gap-1 text-sm">
                                                <MapPin className="w-3 h-3" />
                                                {event.locationName || event.venueName || "TBA"}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={STATUS_COLORS[event.status] || ""}>
                                                {event.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span className="text-sm">
                                                {event.totalSold}/{event.totalCapacity}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center justify-end gap-1">
                                                <Link href={`/admin/events/${event.id}`}>
                                                    <Button variant="ghost" size="icon" title="View Details">
                                                        <Eye className="w-4 h-4" />
                                                    </Button>
                                                </Link>
                                                <Button variant="ghost" size="icon" onClick={() => openEdit(event)} title="Edit">
                                                    <Pencil className="w-4 h-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => duplicateMutation.mutate(event.id)} title="Duplicate">
                                                    <Copy className="w-4 h-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => {
                                                    if (window.confirm(`Delete "${event.title}"? This cannot be undone.`)) {
                                                        deleteMutation.mutate(event.id);
                                                    }
                                                }} title="Delete">
                                                    <Trash2 className="w-4 h-4 text-red-400" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            {/* Create/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={(open) => {
                setDialogOpen(open);
                if (!open) {
                    setEditingId(null);
                    setForm({ ...emptyEvent, ticketTypes: [{ ...emptyTicketType, name: "General Admission", priceCents: 1500, quantity: 100 }] });
                }
            }}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {editingId ? "Edit Event" : "Create Event"}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        {/* Basic Info */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="text-sm font-medium mb-1 block">Title</label>
                                <Input
                                    value={form.title}
                                    onChange={(e) => {
                                        setForm((f) => ({
                                            ...f,
                                            title: e.target.value,
                                            ...(!editingId && { slug: autoSlug(e.target.value) }),
                                        }));
                                    }}
                                    placeholder="Summer Ice Cream Social"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">Slug</label>
                                <Input
                                    value={form.slug}
                                    onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                                    placeholder="summer-ice-cream-social"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">Category</label>
                                <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CATEGORIES.map((c) => (
                                            <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-1 block">Description</label>
                            <Textarea
                                value={form.description}
                                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                                rows={3}
                                placeholder="Tell attendees what to expect..."
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-1 block">Image URL</label>
                            <Input
                                value={form.imageUrl}
                                onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
                                placeholder="/api/uploads/event-image.jpg"
                            />
                        </div>

                        {/* Date & Time */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className="text-sm font-medium mb-1 block">Event Date</label>
                                <Input
                                    type="date"
                                    value={form.eventDate}
                                    onChange={(e) => setForm((f) => ({ ...f, eventDate: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">Start Time</label>
                                <Input
                                    type="time"
                                    value={form.startTime}
                                    onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">End Time</label>
                                <Input
                                    type="time"
                                    value={form.endTime}
                                    onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                                />
                            </div>
                        </div>

                        {/* Location */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium mb-1 block">Location (from stores)</label>
                                <Select
                                    value={form.locationId?.toString() || "none"}
                                    onValueChange={(v) => setForm((f) => ({ ...f, locationId: v === "none" ? null : Number(v) }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Off-site venue" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Off-site Venue</SelectItem>
                                        {locations.map((loc: any) => (
                                            <SelectItem key={loc.id} value={loc.id.toString()}>
                                                {loc.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">
                                    {form.locationId ? "Venue (auto from location)" : "Venue Name"}
                                </label>
                                <Input
                                    value={form.venueName}
                                    onChange={(e) => setForm((f) => ({ ...f, venueName: e.target.value }))}
                                    placeholder="The Park Pavilion"
                                    disabled={!!form.locationId}
                                />
                            </div>
                        </div>

                        {!form.locationId && (
                            <div>
                                <label className="text-sm font-medium mb-1 block">Venue Address</label>
                                <Input
                                    value={form.venueAddress}
                                    onChange={(e) => setForm((f) => ({ ...f, venueAddress: e.target.value }))}
                                    placeholder="123 Main St, City, State"
                                />
                            </div>
                        )}

                        {/* Settings */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className="text-sm font-medium mb-1 block">Status</label>
                                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {STATUSES.map((s) => (
                                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">Accent Color</label>
                                <Input
                                    type="color"
                                    value={form.accentColor}
                                    onChange={(e) => setForm((f) => ({ ...f, accentColor: e.target.value }))}
                                    className="h-10"
                                />
                            </div>
                            <div className="flex items-center gap-3 pt-6">
                                <Switch
                                    checked={form.isPrivate}
                                    onCheckedChange={(v) => setForm((f) => ({ ...f, isPrivate: v }))}
                                />
                                <label className="text-sm font-medium">Private Event</label>
                            </div>
                        </div>

                        {/* Ticket Types */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <label className="text-sm font-medium">Ticket Types</label>
                                <Button variant="outline" size="sm" onClick={addTicketType}>
                                    <Plus className="w-3 h-3 mr-1" /> Add Tier
                                </Button>
                            </div>
                            <div className="space-y-3">
                                {form.ticketTypes.map((tt, i) => (
                                    <div key={i} className="border rounded-lg p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-bold text-gray-500">Tier {i + 1}</span>
                                            {form.ticketTypes.length > 1 && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => removeTicketType(i)}
                                                    className="text-red-400"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </Button>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                            <div className="col-span-2">
                                                <Input
                                                    value={tt.name}
                                                    onChange={(e) => updateTicketType(i, "name", e.target.value)}
                                                    placeholder="General Admission"
                                                />
                                            </div>
                                            <div>
                                                <Input
                                                    type="number"
                                                    value={tt.priceCents / 100}
                                                    onChange={(e) => updateTicketType(i, "priceCents", Math.round(parseFloat(e.target.value || "0") * 100))}
                                                    placeholder="Price ($)"
                                                    step="0.01"
                                                    min="0"
                                                />
                                            </div>
                                            <div>
                                                <Input
                                                    type="number"
                                                    value={tt.quantity}
                                                    onChange={(e) => updateTicketType(i, "quantity", parseInt(e.target.value || "0", 10))}
                                                    placeholder="Qty"
                                                    min="1"
                                                />
                                            </div>
                                        </div>
                                        <Input
                                            value={tt.description}
                                            onChange={(e) => updateTicketType(i, "description", e.target.value)}
                                            placeholder="Description (optional)"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                            <Button variant="outline" onClick={() => setDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSave}
                                disabled={createMutation.isPending || updateMutation.isPending}
                                className="bg-[#A1AB74] hover:bg-[#8a9360]"
                            >
                                {createMutation.isPending || updateMutation.isPending
                                    ? "Saving..."
                                    : editingId
                                        ? "Update Event"
                                        : "Create Event"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
}
