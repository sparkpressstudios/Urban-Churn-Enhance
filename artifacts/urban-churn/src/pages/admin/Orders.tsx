import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useDebounce } from "@/hooks/use-debounce";
import { formatEastern, formatEasternDate, formatEasternTime } from "@/lib/utils";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { SquarePaymentPanel } from "@/components/admin/SquarePaymentPanel";
import { useTour } from "@/lib/tour";
import { adminOrdersSteps } from "@/lib/tour/tour-steps";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Eye, Filter, MessageSquare, Send, RefreshCw, AlertTriangle, RotateCcw, Search, ChevronLeft, ChevronRight } from "lucide-react";

const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    confirmed: "bg-blue-100 text-blue-800",
    ready: "bg-green-100 text-green-800",
    picked_up: "bg-gray-100 text-gray-800",
    cancelled: "bg-red-100 text-red-800",
    refunded: "bg-purple-100 text-purple-800",
};

const statuses = ["all", "pending", "confirmed", "ready", "picked_up", "cancelled", "refunded"];
const PAGE_SIZE = 50;

export default function AdminOrders() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [filterStatus, setFilterStatus] = useState("all");
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebounce(search);
    const [page, setPage] = useState(1);
    const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [noteText, setNoteText] = useState("");
    const [refundOrderId, setRefundOrderId] = useState<number | null>(null);

    const { data: ordersResponse } = useQuery({
        queryKey: ["admin", "orders", filterStatus, debouncedSearch, page],
        queryFn: () => {
            const params: Record<string, string> = {
                limit: String(PAGE_SIZE),
                offset: String((page - 1) * PAGE_SIZE),
            };
            if (filterStatus !== "all") params.status = filterStatus;
            if (debouncedSearch) params.search = debouncedSearch;
            return api.getOrders(params);
        },
    });
    const orders = ordersResponse?.data ?? [];
    const totalOrders = ordersResponse?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(totalOrders / PAGE_SIZE));

    const { data: orderDetail } = useQuery({
        queryKey: ["admin", "order", selectedOrderId],
        queryFn: () => api.getOrder(selectedOrderId!),
        enabled: !!selectedOrderId,
    });

    const updateStatus = useMutation({
        mutationFn: ({ id, status }: { id: number; status: string }) =>
            api.updateOrderStatus(id, status),
        onSuccess: (data: any) => {
            queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
            queryClient.invalidateQueries({ queryKey: ["admin", "order"] });
            queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
            if (data?.squareSyncError) {
                toast({ title: "Order updated, but Square sync failed", description: "You can retry the sync from the order detail.", variant: "destructive" });
            }
        },
    });

    const retrySync = useMutation({
        mutationFn: (id: number) => api.retrySquareSync(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
            queryClient.invalidateQueries({ queryKey: ["admin", "order"] });
            toast({ title: "Square sync successful" });
        },
        onError: () => {
            toast({ title: "Square sync failed", description: "Check Square configuration.", variant: "destructive" });
        },
    });

    const syncPayment = useMutation({
        mutationFn: (id: number) => api.syncSquarePayment(id),
        onSuccess: (data: any) => {
            queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
            queryClient.invalidateQueries({ queryKey: ["admin", "order"] });
            if (data?.orderIdMismatch) {
                toast({
                    title: "Payment synced with warning",
                    description: "Square order ID does not match this record.",
                    variant: "destructive",
                });
            } else {
                toast({ title: "Square payment details updated" });
            }
        },
        onError: () => {
            toast({ title: "Failed to sync from Square", variant: "destructive" });
        },
    });

    const bulkStatusMutation = useMutation({
        mutationFn: ({ orderIds, status }: { orderIds: number[]; status: string }) =>
            api.bulkUpdateOrderStatus(orderIds, status),
        onSuccess: (data: any) => {
            queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
            queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
            setSelectedIds(new Set());
            toast({ title: `${data.updated} orders updated` });
        },
    });

    const refundMutation = useMutation({
        mutationFn: (id: number) => api.refundOrder(id),
        onSuccess: (data: any) => {
            queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
            queryClient.invalidateQueries({ queryKey: ["admin", "order"] });
            queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
            if (data?.refundError) {
                toast({ title: "Marked as refunded, but Square refund failed", description: data.refundError, variant: "destructive" });
            } else {
                toast({ title: "Order refunded successfully" });
            }
        },
        onError: () => {
            toast({ title: "Refund failed", variant: "destructive" });
        },
    });

    const addNoteMutation = useMutation({
        mutationFn: ({ id, content, type }: { id: number; content: string; type?: string }) =>
            api.addOrderNote(id, content, type),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "order", selectedOrderId] });
            setNoteText("");
        },
    });

    const toggleSelect = (id: number) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleAll = () => {
        if (selectedIds.size === orders.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(orders.map((o: any) => o.id)));
        }
    };

    useTour("admin-orders", adminOrdersSteps);

    return (
        <AdminLayout>
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" data-tour="admin-orders-header">
                    <h1 className="text-2xl font-bold text-white">Orders</h1>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder="Search name, email, order #, receipt #, Square ID..."
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setPage(1);
                                }}
                                className="pl-10 w-full sm:w-[280px]"
                                data-tour="admin-orders-search"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                        {selectedIds.size > 0 && (
                            <Select
                                onValueChange={(status) =>
                                    bulkStatusMutation.mutate({
                                        orderIds: Array.from(selectedIds),
                                        status,
                                    })
                                }
                            >
                                <SelectTrigger className="w-[160px]" data-tour="admin-orders-bulk">
                                    <SelectValue placeholder={`Bulk (${selectedIds.size})`} />
                                </SelectTrigger>
                                <SelectContent>
                                    {statuses.filter((s) => s !== "all").map((s) => (
                                        <SelectItem key={s} value={s}>
                                            Set {s.replace("_", " ")}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                        <Filter className="w-4 h-4 text-gray-400" />
                        <Select value={filterStatus} onValueChange={(value) => { setFilterStatus(value); setPage(1); }}>
                            <SelectTrigger className="w-[150px]" data-tour="admin-orders-status-filter">
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
                    </div>
                </div>

                <Card data-tour="admin-orders-table">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b text-left text-gray-500 bg-gray-50/50">
                                        <th className="p-3 w-10">
                                            <Checkbox
                                                checked={selectedIds.size === orders.length && orders.length > 0}
                                                onCheckedChange={toggleAll}
                                            />
                                        </th>
                                        <th className="p-3 font-medium">Order #</th>
                                        <th className="p-3 font-medium">Customer</th>
                                        <th className="p-3 font-medium">Location</th>
                                        <th className="p-3 font-medium">Status</th>
                                        <th className="p-3 font-medium text-right">Total</th>
                                        <th className="p-3 font-medium">Placed</th>
                                        <th className="p-3 font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orders.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="p-8 text-center text-gray-500">
                                                {debouncedSearch
                                                    ? "No orders match your search."
                                                    : "No orders found."}
                                            </td>
                                        </tr>
                                    ) : (
                                    orders.map((order: any) => (
                                        <tr key={order.id} className="border-b last:border-0 hover:bg-gray-50">
                                            <td className="p-3">
                                                <Checkbox
                                                    checked={selectedIds.has(order.id)}
                                                    onCheckedChange={() => toggleSelect(order.id)}
                                                />
                                            </td>
                                            <td className="p-3 font-mono text-xs">
                                                <div>{order.orderNumber}</div>
                                                {order.squareReceiptNumber && (
                                                    <div className="text-[10px] text-green-700 mt-0.5">
                                                        Receipt #{order.squareReceiptNumber}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-3">
                                                <div>{order.customerName}</div>
                                                <div className="text-xs text-gray-500">{order.customerEmail}</div>
                                            </td>
                                            <td className="p-3 text-gray-600">{order.locationName}</td>
                                            <td className="p-3">
                                                <Select
                                                    value={order.status}
                                                    onValueChange={(status) =>
                                                        updateStatus.mutate({ id: order.id, status })
                                                    }
                                                >
                                                    <SelectTrigger className="w-[130px] h-8">
                                                        <Badge
                                                            variant="secondary"
                                                            className={statusColors[order.status] || ""}
                                                        >
                                                            {order.status.replace("_", " ")}
                                                        </Badge>
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {statuses.filter((s) => s !== "all").map((s) => (
                                                            <SelectItem key={s} value={s}>
                                                                {s.replace("_", " ")}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </td>
                                            <td className="p-3 text-right font-medium">
                                                ${(order.totalCents / 100).toFixed(2)}
                                            </td>
                                            <td className="p-3 text-gray-500 text-xs whitespace-nowrap">
                                                <div>{formatEasternDate(order.createdAt)}</div>
                                                <div className="text-[10px] text-gray-400">
                                                    {formatEasternTime(order.createdAt)} ET
                                                </div>
                                            </td>
                                            <td className="p-3">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setSelectedOrderId(order.id)}
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    )))}
                                </tbody>
                            </table>
                        </div>
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between px-4 py-3 border-t">
                                <p className="text-xs text-gray-500">
                                    Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalOrders)} of {totalOrders}
                                </p>
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                                        <ChevronLeft className="w-4 h-4" />
                                    </Button>
                                    <span className="text-xs text-gray-500 self-center px-2">Page {page} of {totalPages}</span>
                                    <Button variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                                        <ChevronRight className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Order Detail Dialog */}
            <Dialog
                open={!!selectedOrderId}
                onOpenChange={() => setSelectedOrderId(null)}
            >
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            Order {orderDetail?.orderNumber}
                        </DialogTitle>
                    </DialogHeader>
                    {orderDetail && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-gray-500">Customer:</span>
                                    <p className="font-medium">{orderDetail.customerName}</p>
                                </div>
                                <div>
                                    <span className="text-gray-500">Email:</span>
                                    <p className="font-medium">{orderDetail.customerEmail}</p>
                                </div>
                                <div>
                                    <span className="text-gray-500">Phone:</span>
                                    <p className="font-medium">{orderDetail.customerPhone || "—"}</p>
                                </div>
                                <div>
                                    <span className="text-gray-500">Location:</span>
                                    <p className="font-medium">{orderDetail.locationName}</p>
                                </div>
                                <div>
                                    <span className="text-gray-500">Placed:</span>
                                    <p className="font-medium">
                                        {formatEasternDate(orderDetail.createdAt)}
                                        {" at "}
                                        {formatEasternTime(orderDetail.createdAt)} ET
                                    </p>
                                </div>
                            </div>
                            {(orderDetail.squarePaymentId || orderDetail.squareOrderId) && (
                                <SquarePaymentPanel
                                    orderNumber={orderDetail.orderNumber}
                                    squareOrderId={orderDetail.squareOrderId}
                                    squarePaymentId={orderDetail.squarePaymentId}
                                    squareReceiptNumber={orderDetail.squareReceiptNumber}
                                    paymentStatus={orderDetail.paymentStatus}
                                    lastSyncSource={orderDetail.lastSyncSource}
                                    squareEnvironment={orderDetail.squareEnvironment}
                                    onSync={() => syncPayment.mutate(orderDetail.id)}
                                    isSyncing={syncPayment.isPending || retrySync.isPending}
                                />
                            )}
                            {orderDetail.squarePaymentId && !orderDetail.squareOrderId && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full text-xs"
                                    onClick={() => retrySync.mutate(orderDetail.id)}
                                    disabled={retrySync.isPending}
                                >
                                    <RefreshCw className={`w-3 h-3 mr-1 ${retrySync.isPending ? "animate-spin" : ""}`} />
                                    Create missing Square order
                                </Button>
                            )}
                            {typeof orderDetail.notes === 'string' && orderDetail.notes && (
                                <div className="text-sm">
                                    <span className="text-gray-500">Notes:</span>
                                    <p className="mt-1 p-2 bg-gray-50 rounded">{orderDetail.notes}</p>
                                </div>
                            )}
                            <div>
                                <h4 className="text-sm font-medium mb-2">Items</h4>
                                <div className="space-y-2">
                                    {orderDetail.items?.map((item: any) => (
                                        <div
                                            key={item.id}
                                            className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm"
                                        >
                                            <span>
                                                {item.flavourName} – {item.sizeName} × {item.quantity}
                                            </span>
                                            <span className="font-medium">
                                                ${((item.priceCents * item.quantity) / 100).toFixed(2)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t font-medium">
                                <span>Total</span>
                                <span>${(orderDetail.totalCents / 100).toFixed(2)}</span>
                            </div>
                            {orderDetail.discountCents > 0 && (
                                <div className="flex justify-between items-center text-sm text-green-600">
                                    <span>Discount</span>
                                    <span>-${(orderDetail.discountCents / 100).toFixed(2)}</span>
                                </div>
                            )}

                            {/* Order Notes */}
                            <div className="pt-4 border-t">
                                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                                    <MessageSquare className="w-4 h-4" />
                                    Notes & Activity
                                </h4>
                                <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
                                    {(!orderDetail.notes || (Array.isArray(orderDetail.notes) && orderDetail.notes.length === 0)) && (
                                        <p className="text-xs text-gray-400">No notes yet</p>
                                    )}
                                    {(orderDetail as any).notes?.filter?.((n: any) => n.orderId)?.map?.((note: any) => (
                                        <div
                                            key={note.id}
                                            className={`p-2 rounded text-xs ${note.type === "system"
                                                ? "bg-gray-50 text-gray-500 italic"
                                                : note.type === "customer_visible"
                                                    ? "bg-blue-50 text-blue-700"
                                                    : "bg-amber-50 text-amber-700"
                                                }`}
                                        >
                                            <div className="flex justify-between">
                                                <span className="font-medium">{note.author}</span>
                                                <span className="text-gray-400">
                                                    {formatEastern(note.createdAt)}
                                                </span>
                                            </div>
                                            <p className="mt-0.5">{note.content}</p>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <Input
                                        value={noteText}
                                        onChange={(e) => setNoteText(e.target.value)}
                                        placeholder="Add a note..."
                                        className="text-sm h-8"
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" && noteText.trim()) {
                                                addNoteMutation.mutate({
                                                    id: selectedOrderId!,
                                                    content: noteText,
                                                });
                                            }
                                        }}
                                    />
                                    <Button
                                        size="sm"
                                        className="h-8 bg-[#A1AB74] hover:bg-[#8a9360]"
                                        disabled={!noteText.trim() || addNoteMutation.isPending}
                                        onClick={() =>
                                            addNoteMutation.mutate({
                                                id: selectedOrderId!,
                                                content: noteText,
                                            })
                                        }
                                    >
                                        <Send className="w-3 h-3" />
                                    </Button>
                                </div>
                            </div>

                            {/* Refund Action */}
                            {orderDetail.status !== "refunded" && orderDetail.status !== "cancelled" && (
                                <div className="pt-4 border-t">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-red-600 border-red-200 hover:bg-red-50"
                                        onClick={() => setRefundOrderId(orderDetail.id)}
                                        disabled={refundMutation.isPending}
                                    >
                                        <RotateCcw className="w-3 h-3 mr-1" />
                                        Refund Order
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Refund Confirmation Dialog */}
            <AlertDialog open={!!refundOrderId} onOpenChange={() => setRefundOrderId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                            Confirm Refund
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            This will refund the full order amount via Square and mark the order as refunded. The customer will receive a refund notification email. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700"
                            onClick={() => {
                                if (refundOrderId) {
                                    refundMutation.mutate(refundOrderId);
                                    setRefundOrderId(null);
                                    setSelectedOrderId(null);
                                }
                            }}
                        >
                            Confirm Refund
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AdminLayout>
    );
}
