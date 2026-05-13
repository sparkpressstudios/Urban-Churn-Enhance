import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useDebounce } from "@/hooks/use-debounce";
import { formatEastern } from "@/lib/utils";
import { useTour } from "@/lib/tour";
import { adminBakeryOrdersSteps } from "@/lib/tour/tour-steps";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useToast } from "@/hooks/use-toast";
import { Eye, Filter, Download, Search, Send } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    confirmed: "bg-blue-100 text-blue-800",
    in_progress: "bg-purple-100 text-purple-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
};

const statuses = ["all", "pending", "confirmed", "in_progress", "completed", "cancelled"];

function formatCents(c: number) {
    return `$${(c / 100).toFixed(2)}`;
}

export default function AdminBakeryOrders() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [filterStatus, setFilterStatus] = useState("all");
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebounce(search);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [noteText, setNoteText] = useState("");
    const [invoiceOrderId, setInvoiceOrderId] = useState<number | null>(null);
    const [invoiceMessage, setInvoiceMessage] = useState("");
    const [invoiceAmount, setInvoiceAmount] = useState("");

    const { data: stats } = useQuery({
        queryKey: ["admin", "bakery-stats"],
        queryFn: () => api.getBakeryOrderStats(),
    });

    const { data: orders = [] } = useQuery({
        queryKey: ["admin", "bakery-orders", filterStatus, debouncedSearch],
        queryFn: () => {
            const params: Record<string, string> = {};
            if (filterStatus !== "all") params.status = filterStatus;
            if (debouncedSearch) params.search = debouncedSearch;
            return api.getBakeryOrders(params);
        },
    });

    const { data: orderDetail } = useQuery({
        queryKey: ["admin", "bakery-order", selectedId],
        queryFn: () => api.getBakeryOrder(selectedId!),
        enabled: !!selectedId,
    });

    const updateStatus = useMutation({
        mutationFn: ({ id, status }: { id: number; status: string }) =>
            api.updateBakeryOrderStatus(id, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "bakery-orders"] });
            queryClient.invalidateQueries({ queryKey: ["admin", "bakery-order"] });
            queryClient.invalidateQueries({ queryKey: ["admin", "bakery-stats"] });
            toast({ title: "Status updated" });
        },
    });

    const updateNotes = useMutation({
        mutationFn: ({ id, notes }: { id: number; notes: string }) =>
            api.updateBakeryOrderNotes(id, notes),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "bakery-order", selectedId] });
            toast({ title: "Notes saved" });
        },
    });

    const sendInvoice = useMutation({
        mutationFn: ({ id, message, amountCents }: { id: number; message: string; amountCents?: number }) =>
            api.sendBakeryInvoice(id, message, amountCents),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "bakery-orders"] });
            queryClient.invalidateQueries({ queryKey: ["admin", "bakery-order"] });
            queryClient.invalidateQueries({ queryKey: ["admin", "bakery-stats"] });
            toast({ title: "Invoice sent to customer" });
            setInvoiceOrderId(null);
            setInvoiceMessage("");
            setInvoiceAmount("");
        },
        onError: (err: any) => {
            toast({ title: "Failed to send invoice", description: err.message, variant: "destructive" });
        },
    });

    useTour("admin-bakery-orders", adminBakeryOrdersSteps);

    return (
        <AdminLayout>
            <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between" data-tour="admin-bakery-header">
                    <h1 className="text-xl sm:text-2xl font-bold text-white">Bakery Orders</h1>
                    <a
                        href={api.exportBakeryOrdersCsv()}
                        className="inline-flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        Export CSV
                    </a>
                </div>

                {/* Stats row */}
                {stats && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-tour="admin-bakery-stats">
                        {[
                            { label: "Total", value: stats.totalOrders, color: "text-gray-900" },
                            { label: "Today", value: stats.todayOrders, color: "text-blue-600" },
                            { label: "Pending", value: stats.pendingOrders, color: "text-yellow-600" },
                            { label: "Completed", value: stats.completedOrders, color: "text-green-600" },
                        ].map((s) => (
                            <Card key={s.label}>
                                <CardContent className="p-4">
                                    <p className="text-xs text-gray-500 font-medium">{s.label}</p>
                                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Filters */}
                <div className="flex items-center gap-3" data-tour="admin-bakery-filters">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search orders…"
                            className="pl-9 text-sm"
                        />
                    </div>
                    <Filter className="w-4 h-4 text-gray-400" />
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="w-[160px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {statuses.map((s) => (
                                <SelectItem key={s} value={s}>
                                    {s === "all" ? "All Statuses" : s.replace("_", " ")}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Table */}
                <Card data-tour="admin-bakery-table">
                    <CardContent className="p-0">
                        {!orders.length ? (
                            <p className="text-gray-500 text-sm py-8 text-center">No bakery orders found.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b text-left text-gray-500 bg-gray-50/50">
                                            <th className="p-3 font-medium">Order #</th>
                                            <th className="p-3 font-medium">Customer</th>
                                            <th className="p-3 font-medium">Type</th>
                                            <th className="p-3 font-medium">Window</th>
                                            <th className="p-3 font-medium">Pickup</th>
                                            <th className="p-3 font-medium">Status</th>
                                            <th className="p-3 font-medium text-right">Total</th>
                                            <th className="p-3 font-medium">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {orders.map((o: any) => (
                                            <tr key={o.id} className="border-b hover:bg-gray-50/50 transition-colors">
                                                <td className="p-3 font-mono text-xs">{o.orderNumber}</td>
                                                <td className="p-3">
                                                    <div className="font-medium text-gray-900">{o.customerName}</div>
                                                    <div className="text-xs text-gray-500">{o.customerEmail}</div>
                                                </td>
                                                <td className="p-3 text-gray-600">{o.orderType}</td>
                                                <td className="p-3 text-xs text-gray-500">
                                                    {o.windowName ? (
                                                        <Badge variant="outline" className="text-[10px]">{o.windowName}</Badge>
                                                    ) : (
                                                        <span className="text-gray-300">—</span>
                                                    )}
                                                </td>
                                                <td className="p-3 text-gray-600 text-xs">
                                                    {o.pickupDate}
                                                    <br />
                                                    {o.pickupTime}
                                                </td>
                                                <td className="p-3">
                                                    <Badge variant="secondary" className={statusColors[o.status] || ""}>
                                                        {o.status.replace("_", " ")}
                                                    </Badge>
                                                </td>
                                                <td className="p-3 text-right font-medium">{formatCents(o.totalPriceCents)}</td>
                                                <td className="p-3">
                                                    <div className="flex items-center gap-1">
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => {
                                                                setSelectedId(o.id);
                                                                setNoteText(o.adminNotes || "");
                                                            }}
                                                            title="View details"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="text-[#A1AB74] hover:text-[#8a9360]"
                                                            onClick={() => {
                                                                setInvoiceOrderId(o.id);
                                                                setInvoiceAmount(String((o.totalPriceCents / 100).toFixed(2)));
                                                                setInvoiceMessage("");
                                                            }}
                                                            title="Send invoice"
                                                        >
                                                            <Send className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Detail dialog */}
                <Dialog open={!!selectedId} onOpenChange={(open) => { if (!open) setSelectedId(null); }}>
                    <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>
                                Bakery Order {orderDetail?.orderNumber}
                            </DialogTitle>
                        </DialogHeader>
                        {orderDetail && (
                            <div className="space-y-4 text-sm">
                                {/* Status selector */}
                                <div className="flex items-center gap-3">
                                    <span className="text-gray-500 font-medium">Status:</span>
                                    <Select
                                        value={orderDetail.status}
                                        onValueChange={(status) => updateStatus.mutate({ id: orderDetail.id, status })}
                                    >
                                        <SelectTrigger className="w-[160px]">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {statuses.filter((s) => s !== "all").map((s) => (
                                                <SelectItem key={s} value={s}>
                                                    {s.replace("_", " ")}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Customer info */}
                                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                                    <h4 className="font-medium text-gray-900">Customer</h4>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div>
                                            <span className="text-gray-500">Name:</span>{" "}
                                            <span className="font-medium">{orderDetail.customerName}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">Phone:</span>{" "}
                                            <span className="font-medium">{orderDetail.customerPhone}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">Email:</span>{" "}
                                            <span className="font-medium">{orderDetail.customerEmail}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">Referral:</span>{" "}
                                            <span className="font-medium">{orderDetail.referral || "—"}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Order info */}
                                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                                    <h4 className="font-medium text-gray-900">Order Details</h4>
                                    <div className="text-xs space-y-1">
                                        <div><span className="text-gray-500">Type:</span> <span className="font-medium">{orderDetail.orderType}</span></div>
                                        <div><span className="text-gray-500">Pickup:</span> <span className="font-medium">{orderDetail.pickupDate} at {orderDetail.pickupTime}</span></div>
                                        <div><span className="text-gray-500">Total:</span> <span className="font-medium text-green-700">{formatCents(orderDetail.totalPriceCents)}</span></div>
                                    </div>
                                    {orderDetail.orderDetails && typeof orderDetail.orderDetails === "object" && (
                                        <div className="border-t pt-2 mt-2 text-xs space-y-1">
                                            {Object.entries(orderDetail.orderDetails as Record<string, any>).map(([k, v]) => (
                                                <div key={k}>
                                                    <span className="text-gray-500">{k.replace(/([A-Z])/g, " $1").replace(/^./, (s: string) => s.toUpperCase())}:</span>{" "}
                                                    <span className="font-medium">{String(v)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {orderDetail.addOns && typeof orderDetail.addOns === "object" && Object.values(orderDetail.addOns as Record<string, any>).some(Boolean) && (
                                        <div className="border-t pt-2 mt-2 text-xs">
                                            <span className="text-gray-500">Add-ons:</span>{" "}
                                            <span className="font-medium">
                                                {Object.entries(orderDetail.addOns as Record<string, any>)
                                                    .filter(([, v]) => v)
                                                    .map(([k]) => k.replace(/([A-Z])/g, " $1").trim())
                                                    .join(", ")}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Special requests */}
                                {orderDetail.specialRequests && (
                                    <div className="bg-amber-50 rounded-lg p-4">
                                        <h4 className="font-medium text-amber-900 text-xs mb-1">Special Requests</h4>
                                        <p className="text-xs text-amber-800">{orderDetail.specialRequests}</p>
                                    </div>
                                )}

                                {/* Inspiration photo */}
                                {orderDetail.inspirationPhotoUrl && (
                                    <div>
                                        <h4 className="font-medium text-gray-900 text-xs mb-2">Inspiration Photo</h4>
                                        <img
                                            src={orderDetail.inspirationPhotoUrl}
                                            alt="Inspiration"
                                            className="rounded-lg max-h-48 object-cover"
                                        />
                                    </div>
                                )}

                                {/* Admin notes */}
                                <div className="border-t pt-4">
                                    <h4 className="font-medium text-gray-900 text-xs mb-2">Admin Notes</h4>
                                    <textarea
                                        rows={3}
                                        value={noteText}
                                        onChange={(e) => setNoteText(e.target.value)}
                                        placeholder="Internal notes about this order…"
                                        className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[#A1AB74]"
                                    />
                                    <Button
                                        size="sm"
                                        className="mt-2 bg-[#A1AB74] hover:bg-[#8a9360]"
                                        disabled={updateNotes.isPending}
                                        onClick={() => updateNotes.mutate({ id: selectedId!, notes: noteText })}
                                    >
                                        {updateNotes.isPending ? "Saving…" : "Save Notes"}
                                    </Button>
                                </div>

                                {/* Timestamps */}
                                <div className="text-[10px] text-gray-400 pt-2 border-t">
                                    Submitted: {formatEastern(orderDetail.createdAt)}
                                    {orderDetail.updatedAt && ` · Updated: ${formatEastern(orderDetail.updatedAt)}`}
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

                {/* Invoice dialog */}
                <Dialog open={!!invoiceOrderId} onOpenChange={(open) => { if (!open) setInvoiceOrderId(null); }}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Send Invoice</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Invoice Amount ($)</label>
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={invoiceAmount}
                                    onChange={(e) => setInvoiceAmount(e.target.value)}
                                    placeholder="0.00"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Message to Customer (optional)</label>
                                <Textarea
                                    rows={4}
                                    value={invoiceMessage}
                                    onChange={(e) => setInvoiceMessage(e.target.value)}
                                    placeholder="Any additional notes about the order, pricing adjustments, etc."
                                />
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setInvoiceOrderId(null)}>Cancel</Button>
                                <Button
                                    className="bg-[#A1AB74] hover:bg-[#8a9360]"
                                    disabled={!invoiceAmount || sendInvoice.isPending}
                                    onClick={() => {
                                        const amountCents = Math.round(parseFloat(invoiceAmount) * 100);
                                        sendInvoice.mutate({ id: invoiceOrderId!, message: invoiceMessage, amountCents });
                                    }}
                                >
                                    <Send className="w-4 h-4 mr-2" />
                                    {sendInvoice.isPending ? "Sending…" : "Send Invoice"}
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </AdminLayout>
    );
}
