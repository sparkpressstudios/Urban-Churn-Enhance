import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { api } from "@/lib/api";
import { formatEasternDate } from "@/lib/utils";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import {
    CalendarDays,
    Clock,
    MapPin,
    Users,
    Ticket,
    DollarSign,
    Search,
    CheckCircle2,
    XCircle,
    Mail,
    ArrowLeft,
    RotateCcw,
    MessageCircleQuestion,
    Trash2,
    Eye,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

const STATUS_COLORS: Record<string, string> = {
    draft: "bg-gray-100 text-gray-800",
    published: "bg-green-100 text-green-800",
    sold_out: "bg-red-100 text-red-800",
    cancelled: "bg-yellow-100 text-yellow-800",
    completed: "bg-blue-100 text-blue-800",
};

const TICKET_STATUS_COLORS: Record<string, string> = {
    active: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
    refunded: "bg-purple-100 text-purple-800",
};

export default function AdminEventDetail() {
    const [, params] = useRoute("/admin/events/:id");
    const eventId = Number(params?.id);
    const queryClient = useQueryClient();
    const { toast } = useToast();

    const [attendeeSearch, setAttendeeSearch] = useState("");
    const [emailDialogOpen, setEmailDialogOpen] = useState(false);
    const [emailSubject, setEmailSubject] = useState("");
    const [emailMessage, setEmailMessage] = useState("");

    const { data: event, isLoading } = useQuery({
        queryKey: ["admin", "event", eventId],
        queryFn: () => api.getEvent(eventId),
        enabled: !!eventId,
    });

    const { data: attendees = [] } = useQuery({
        queryKey: ["admin", "event", eventId, "attendees", attendeeSearch],
        queryFn: () => api.getEventAttendees(eventId, attendeeSearch || undefined),
        enabled: !!eventId,
    });

    const { data: orders = [] } = useQuery({
        queryKey: ["admin", "event", eventId, "orders"],
        queryFn: () => api.getEventOrders(eventId),
        enabled: !!eventId,
    });

    const { data: questions = [] } = useQuery({
        queryKey: ["admin", "event", eventId, "questions"],
        queryFn: () => api.getEventQuestions(eventId),
        enabled: !!eventId,
    });

    const checkInMutation = useMutation({
        mutationFn: (ticketId: number) => api.checkInTicket(ticketId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "event", eventId] });
            toast({ title: "Check-in updated" });
        },
    });

    const cancelTicketMutation = useMutation({
        mutationFn: (ticketId: number) => api.cancelTicket(ticketId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "event", eventId] });
            toast({ title: "Ticket cancelled" });
        },
    });

    const refundTicketMutation = useMutation({
        mutationFn: (ticketId: number) => api.refundTicket(ticketId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "event", eventId] });
            toast({ title: "Ticket refunded" });
        },
    });

    const emailMutation = useMutation({
        mutationFn: () => api.emailEventAttendees(eventId, emailSubject, emailMessage),
        onSuccess: (data: any) => {
            setEmailDialogOpen(false);
            setEmailSubject("");
            setEmailMessage("");
            toast({ title: `Email sent to ${data.sent} attendees` });
        },
    });

    const markReadMutation = useMutation({
        mutationFn: (questionId: number) => api.markQuestionRead(questionId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "event", eventId, "questions"] });
        },
    });

    const deleteQuestionMutation = useMutation({
        mutationFn: (questionId: number) => api.deleteQuestion(questionId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "event", eventId, "questions"] });
            toast({ title: "Question deleted" });
        },
    });

    if (isLoading) {
        return (
            <AdminLayout>
                <div className="flex items-center justify-center py-20 text-gray-400">Loading event...</div>
            </AdminLayout>
        );
    }

    if (!event) {
        return (
            <AdminLayout>
                <div className="flex items-center justify-center py-20 text-gray-400">Event not found</div>
            </AdminLayout>
        );
    }

    const totalSold = event.ticketTypes?.reduce((s: number, tt: any) => s + (tt.quantitySold || 0), 0) || 0;
    const totalCapacity = event.ticketTypes?.reduce((s: number, tt: any) => s + tt.quantity, 0) || 0;
    const totalRevenue = event.orderStats?.totalRevenue ?? event.ticketTypes?.reduce(
        (s: number, tt: any) => s + (tt.quantitySold || 0) * tt.priceCents, 0
    ) ?? 0;
    const checkedInCount = attendees.filter((a: any) => a.checkedIn).length;

    return (
        <AdminLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Link href="/admin/events">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    </Link>
                    <div className="flex-1">
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-white">{event.title}</h1>
                            <Badge className={STATUS_COLORS[event.status] || ""}>{event.status}</Badge>
                        </div>
                        <p className="text-sm text-white/70">{event.category}</p>
                    </div>
                    <Button
                        onClick={() => setEmailDialogOpen(true)}
                        variant="outline"
                    >
                        <Mail className="w-4 h-4 mr-2" />
                        Email Attendees
                    </Button>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <Card>
                        <CardContent className="pt-6 text-center">
                            <CalendarDays className="w-5 h-5 mx-auto mb-2 text-[#A1AB74]" />
                            <p className="text-sm font-bold">
                                {formatEasternDate(event.eventDate + "T00:00:00", {
                                    month: "short", day: "numeric", year: "numeric",
                                })}
                            </p>
                            <p className="text-xs text-gray-500">{event.startTime}{event.endTime ? ` - ${event.endTime}` : ""}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6 text-center">
                            <MapPin className="w-5 h-5 mx-auto mb-2 text-blue-500" />
                            <p className="text-sm font-bold">{event.venueName || "TBA"}</p>
                            <p className="text-xs text-gray-500 truncate">{event.venueAddress || ""}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6 text-center">
                            <Ticket className="w-5 h-5 mx-auto mb-2 text-purple-500" />
                            <p className="text-sm font-bold">{totalSold} / {totalCapacity}</p>
                            <p className="text-xs text-gray-500">Tickets Sold</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6 text-center">
                            <Users className="w-5 h-5 mx-auto mb-2 text-orange-500" />
                            <p className="text-sm font-bold">{checkedInCount} / {totalSold}</p>
                            <p className="text-xs text-gray-500">Checked In</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6 text-center">
                            <DollarSign className="w-5 h-5 mx-auto mb-2 text-green-500" />
                            <p className="text-sm font-bold">${(totalRevenue / 100).toFixed(2)}</p>
                            <p className="text-xs text-gray-500">Revenue</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Ticket Type Breakdown */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Ticket Types</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-3 md:grid-cols-3">
                            {event.ticketTypes?.map((tt: any) => {
                                const pct = tt.quantity > 0 ? Math.round((tt.quantitySold / tt.quantity) * 100) : 0;
                                return (
                                    <div key={tt.id} className="border rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-bold text-sm">{tt.name}</span>
                                            <span className="text-sm text-gray-500">${(tt.priceCents / 100).toFixed(2)}</span>
                                        </div>
                                        <div className="w-full bg-gray-100 rounded-full h-2 mb-1">
                                            <div
                                                className="bg-[#A1AB74] h-2 rounded-full transition-all"
                                                style={{ width: `${Math.min(pct, 100)}%` }}
                                            />
                                        </div>
                                        <p className="text-xs text-gray-500">{tt.quantitySold} / {tt.quantity} sold ({pct}%)</p>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>

                {/* Tabs */}
                <Tabs defaultValue="attendees">
                    <TabsList>
                        <TabsTrigger value="attendees">
                            <Users className="w-4 h-4 mr-1" />
                            Attendees ({attendees.length})
                        </TabsTrigger>
                        <TabsTrigger value="orders">
                            <DollarSign className="w-4 h-4 mr-1" />
                            Orders ({orders.length})
                        </TabsTrigger>
                        <TabsTrigger value="questions">
                            <MessageCircleQuestion className="w-4 h-4 mr-1" />
                            Questions ({questions.length})
                            {questions.filter((q: any) => !q.read).length > 0 && (
                                <span className="ml-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                                    {questions.filter((q: any) => !q.read).length}
                                </span>
                            )}
                        </TabsTrigger>
                    </TabsList>

                    {/* Attendees Tab */}
                    <TabsContent value="attendees">
                        <Card>
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <Input
                                            className="pl-9"
                                            placeholder="Search attendees..."
                                            value={attendeeSearch}
                                            onChange={(e) => setAttendeeSearch(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Ticket</TableHead>
                                            <TableHead>Code</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Check-In</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {attendees.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={7} className="text-center py-8 text-gray-400">
                                                    No attendees yet
                                                </TableCell>
                                            </TableRow>
                                        )}
                                        {attendees.map((ticket: any) => (
                                            <TableRow key={ticket.id}>
                                                <TableCell className="font-medium">{ticket.customerName}</TableCell>
                                                <TableCell className="text-sm text-gray-500">{ticket.customerEmail}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{ticket.ticketTypeName}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <code className="text-xs bg-gray-50 px-2 py-1 rounded">{ticket.ticketCode?.slice(0, 8)}…</code>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={TICKET_STATUS_COLORS[ticket.status] || ""}>
                                                        {ticket.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {ticket.checkedIn ? (
                                                        <span className="flex items-center gap-1 text-green-600 text-sm">
                                                            <CheckCircle2 className="w-4 h-4" />
                                                            {ticket.checkedInAt && new Date(ticket.checkedInAt).toLocaleTimeString()}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-400 text-sm">—</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center justify-end gap-1">
                                                        {ticket.status === "active" && (
                                                            <>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => checkInMutation.mutate(ticket.id)}
                                                                    title={ticket.checkedIn ? "Undo check-in" : "Check in"}
                                                                >
                                                                    {ticket.checkedIn ? (
                                                                        <RotateCcw className="w-4 h-4" />
                                                                    ) : (
                                                                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                                                                    )}
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        if (window.confirm(`Cancel ticket for ${ticket.customerName}?`)) {
                                                                            cancelTicketMutation.mutate(ticket.id);
                                                                        }
                                                                    }}
                                                                    title="Cancel ticket"
                                                                >
                                                                    <XCircle className="w-4 h-4 text-red-400" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        if (window.confirm(`Refund ticket for ${ticket.customerName}? This will process a refund through Square.`)) {
                                                                            refundTicketMutation.mutate(ticket.id);
                                                                        }
                                                                    }}
                                                                    title="Refund ticket"
                                                                >
                                                                    <DollarSign className="w-4 h-4 text-purple-400" />
                                                                </Button>
                                                            </>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Orders Tab */}
                    <TabsContent value="orders">
                        <Card>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Order #</TableHead>
                                            <TableHead>Customer</TableHead>
                                            <TableHead>Tickets</TableHead>
                                            <TableHead className="text-right">Total</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Date</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {orders.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center py-8 text-gray-400">
                                                    No orders yet
                                                </TableCell>
                                            </TableRow>
                                        )}
                                        {orders.map((order: any) => (
                                            <TableRow key={order.id}>
                                                <TableCell className="font-mono text-sm">{order.orderNumber}</TableCell>
                                                <TableCell>
                                                    <div>
                                                        <p className="font-medium">{order.customerName}</p>
                                                        <p className="text-xs text-gray-500">{order.customerEmail}</p>
                                                    </div>
                                                </TableCell>
                                                <TableCell>{order.ticketCount || order.items?.length || 0}</TableCell>
                                                <TableCell className="text-right font-medium">
                                                    ${(order.totalCents / 100).toFixed(2)}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={STATUS_COLORS[order.status] || "bg-gray-100"}>
                                                        {order.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-sm text-gray-500">
                                                    {formatEasternDate(order.createdAt)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Questions Tab */}
                    <TabsContent value="questions">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Event Questions</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {questions.length === 0 ? (
                                    <p className="text-center py-8 text-gray-400">No questions yet</p>
                                ) : (
                                    <div className="space-y-4">
                                        {questions.map((q: any) => (
                                            <div
                                                key={q.id}
                                                className={`border rounded-lg p-4 ${q.read ? "bg-white" : "bg-blue-50 border-blue-200"}`}
                                            >
                                                <div className="flex items-start justify-between mb-2">
                                                    <div>
                                                        <span className="font-bold text-sm">{q.name}</span>
                                                        <span className="text-gray-400 text-sm ml-2">
                                                            <a href={`mailto:${q.email}`} className="hover:underline">{q.email}</a>
                                                        </span>
                                                        {!q.read && (
                                                            <Badge className="ml-2 bg-blue-500 text-white text-[10px]">New</Badge>
                                                        )}
                                                    </div>
                                                    <span className="text-xs text-gray-400 whitespace-nowrap">
                                                        {new Date(q.createdAt).toLocaleDateString()} {new Date(q.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-600 whitespace-pre-line mb-3">{q.message}</p>
                                                <div className="flex items-center gap-2">
                                                    {!q.read && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => markReadMutation.mutate(q.id)}
                                                            className="text-xs"
                                                        >
                                                            <Eye className="w-3.5 h-3.5 mr-1" />
                                                            Mark as Read
                                                        </Button>
                                                    )}
                                                    <a
                                                        href={`mailto:${q.email}?subject=Re: Your question about ${encodeURIComponent(event.title)}`}
                                                        className="inline-flex items-center gap-1 text-xs text-[#A1AB74] hover:underline font-medium px-2 py-1"
                                                    >
                                                        <Mail className="w-3.5 h-3.5" />
                                                        Reply
                                                    </a>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            if (window.confirm("Delete this question?")) {
                                                                deleteQuestionMutation.mutate(q.id);
                                                            }
                                                        }}
                                                        className="text-xs text-red-400 hover:text-red-600"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                                                        Delete
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Email Dialog */}
            <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Email All Attendees</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <p className="text-sm text-gray-500">
                            Send an email to all attendees with active tickets for this event ({attendees.filter((a: any) => a.status === "active").length} recipients).
                        </p>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Subject</label>
                            <Input
                                value={emailSubject}
                                onChange={(e) => setEmailSubject(e.target.value)}
                                placeholder="Important update about the event"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Message</label>
                            <Textarea
                                value={emailMessage}
                                onChange={(e) => setEmailMessage(e.target.value)}
                                rows={5}
                                placeholder="Write your message to attendees..."
                            />
                        </div>
                        <div className="flex justify-end gap-3">
                            <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button
                                onClick={() => emailMutation.mutate()}
                                disabled={!emailSubject || !emailMessage || emailMutation.isPending}
                                className="bg-[#A1AB74] hover:bg-[#8a9360]"
                            >
                                {emailMutation.isPending ? "Sending..." : "Send Email"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
}
