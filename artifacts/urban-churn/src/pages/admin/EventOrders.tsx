import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useDebounce } from "@/hooks/use-debounce";
import { formatEasternDate } from "@/lib/utils";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { SquarePaymentPanel } from "@/components/admin/SquarePaymentPanel";
import { useTour } from "@/lib/tour";
import { adminEventOrdersSteps } from "@/lib/tour/tour-steps";
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
import { Eye, RotateCcw, AlertTriangle, Search } from "lucide-react";

const statusColors: Record<string, string> = {
    confirmed: "bg-blue-100 text-blue-800",
    cancelled: "bg-red-100 text-red-800",
    refunded: "bg-purple-100 text-purple-800",
};

const statuses = ["all", "confirmed", "cancelled", "refunded"];

export default function AdminEventOrders() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [filterStatus, setFilterStatus] = useState("all");
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebounce(search);
    const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
    const [refundOrderId, setRefundOrderId] = useState<number | null>(null);

    const { data: orders = [] } = useQuery({
        queryKey: ["admin", "event-orders", filterStatus, debouncedSearch],
        queryFn: () => {
            const params: Record<string, string> = {};
            if (filterStatus !== "all") params.status = filterStatus;
            if (debouncedSearch) params.search = debouncedSearch;
            return api.getEventOrdersAll(Object.keys(params).length > 0 ? params : undefined);
        },
    });

    const { data: orderDetail } = useQuery({
        queryKey: ["admin", "event-order", selectedOrderId],
        queryFn: () => api.getEventOrderDetail(selectedOrderId!),
        enabled: !!selectedOrderId,
    });

    const updateStatus = useMutation({
        mutationFn: ({ id, status }: { id: number; status: string }) =>
            api.updateEventOrderStatus(id, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "event-orders"] });
            queryClient.invalidateQueries({ queryKey: ["admin", "event-order"] });
            toast({ title: "Status updated" });
        },
    });

    const syncPayment = useMutation({
        mutationFn: (id: number) => api.syncEventSquarePayment(id),
        onSuccess: (data: any) => {
            queryClient.invalidateQueries({ queryKey: ["admin", "event-orders"] });
            queryClient.invalidateQueries({ queryKey: ["admin", "event-order"] });
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

    const refundMutation = useMutation({
        mutationFn: (id: number) => api.refundEventOrder(id),
        onSuccess: (data: any) => {
            queryClient.invalidateQueries({ queryKey: ["admin", "event-orders"] });
            queryClient.invalidateQueries({ queryKey: ["admin", "event-order"] });
            if (data?.refundError) {
                toast({ title: "Marked as refunded, but Square refund failed", description: data.refundError, variant: "destructive" });
            } else {
                toast({ title: "Order refunded" });
            }
        },
        onError: () => {
            toast({ title: "Refund failed", variant: "destructive" });
        },
    });

    useTour("admin-event-orders", adminEventOrdersSteps);

    return (
        <AdminLayout>
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" data-tour="admin-event-orders-header">
                    <h1 className="text-2xl font-bold text-white">Event Orders</h1>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder="Search name, email, order #, receipt #, Square ID..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-10 w-full sm:w-[280px]"
                            />
                        </div>
                        <Select value={filterStatus} onValueChange={setFilterStatus} data-tour="admin-event-orders-filter">
                        <SelectTrigger className="w-[150px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {statuses.map((s) => (
                                <SelectItem key={s} value={s}>
                                    {s === "all" ? "All Statuses" : s}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    </div>
                </div>

                <Card>
                    <CardContent className="p-0">
                        {!orders.length ? (
                            <p className="text-gray-500 text-sm py-8 text-center">
                                {debouncedSearch
                                    ? "No event orders match your search."
                                    : "No event orders found."}
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b text-left text-gray-500 bg-gray-50/50">
                                            <th className="p-3 font-medium">Order #</th>
                                            <th className="p-3 font-medium">Event</th>
                                            <th className="p-3 font-medium">Customer</th>
                                            <th className="p-3 font-medium">Tickets</th>
                                            <th className="p-3 font-medium">Status</th>
                                            <th className="p-3 font-medium text-right">Total</th>
                                            <th className="p-3 font-medium">Payment</th>
                                            <th className="p-3 font-medium">Date</th>
                                            <th className="p-3 font-medium">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {orders.map((order: any) => (
                                            <tr key={order.id} className="border-b last:border-0 hover:bg-gray-50">
                                                <td className="p-3 font-mono text-xs">
                                                    <div>{order.orderNumber}</div>
                                                    {order.squareReceiptNumber && (
                                                        <div className="text-[10px] text-green-700 mt-0.5">
                                                            Receipt #{order.squareReceiptNumber}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="p-3">
                                                    <div className="text-sm">{order.eventTitle}</div>
                                                    <div className="text-xs text-gray-500">{order.eventDate}</div>
                                                </td>
                                                <td className="p-3">
                                                    <div>{order.customerName}</div>
                                                    <div className="text-xs text-gray-500">{order.customerEmail}</div>
                                                </td>
                                                <td className="p-3 text-center">{order.ticketCount}</td>
                                                <td className="p-3">
                                                    <Badge
                                                        variant="secondary"
                                                        className={statusColors[order.status] || ""}
                                                    >
                                                        {order.status}
                                                    </Badge>
                                                </td>
                                                <td className="p-3 text-right font-medium">
                                                    ${(order.totalCents / 100).toFixed(2)}
                                                </td>
                                                <td className="p-3 text-xs">
                                                    {order.squareReceiptNumber ? (
                                                        <span className="font-mono text-green-700">#{order.squareReceiptNumber}</span>
                                                    ) : order.squarePaymentId ? (
                                                        <span className="text-green-600">Paid</span>
                                                    ) : (
                                                        <span className="text-gray-400">—</span>
                                                    )}
                                                </td>
                                                <td className="p-3 text-gray-500 text-xs">
                                                    {formatEasternDate(order.createdAt)}
                                                </td>
                                                <td className="p-3 flex gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setSelectedOrderId(order.id)}
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </Button>
                                                    {order.status === "confirmed" && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-red-500 hover:text-red-700"
                                                            onClick={() => setRefundOrderId(order.id)}
                                                            disabled={refundMutation.isPending}
                                                        >
                                                            <RotateCcw className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
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
                            Event Order {orderDetail?.orderNumber}
                        </DialogTitle>
                    </DialogHeader>
                    {orderDetail && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-gray-500">Event:</span>
                                    <p className="font-medium">{orderDetail.eventTitle}</p>
                                </div>
                                <div>
                                    <span className="text-gray-500">Date:</span>
                                    <p className="font-medium">{orderDetail.eventDate}</p>
                                </div>
                                <div>
                                    <span className="text-gray-500">Customer:</span>
                                    <p className="font-medium">{orderDetail.customerName}</p>
                                </div>
                                <div>
                                    <span className="text-gray-500">Email:</span>
                                    <p className="font-medium">{orderDetail.customerEmail}</p>
                                </div>
                            </div>

                            {(orderDetail.squarePaymentId || orderDetail.squareOrderId) && (
                                <SquarePaymentPanel
                                    orderNumber={orderDetail.orderNumber}
                                    squareOrderId={orderDetail.squareOrderId}
                                    squarePaymentId={orderDetail.squarePaymentId}
                                    squareReceiptNumber={orderDetail.squareReceiptNumber}
                                    squareEnvironment={orderDetail.squareEnvironment}
                                    onSync={() => syncPayment.mutate(orderDetail.id)}
                                    isSyncing={syncPayment.isPending}
                                />
                            )}

                            {/* Items */}
                            <div>
                                <h4 className="text-sm font-medium mb-2">Ticket Items</h4>
                                <div className="space-y-2">
                                    {orderDetail.items?.map((item: any) => (
                                        <div
                                            key={item.id}
                                            className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm"
                                        >
                                            <span>{item.ticketTypeName} × {item.quantity}</span>
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

                            {/* Tickets */}
                            {orderDetail.tickets?.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-medium mb-2">Tickets</h4>
                                    <div className="space-y-2">
                                        {orderDetail.tickets.map((ticket: any) => (
                                            <div
                                                key={ticket.id}
                                                className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs"
                                            >
                                                <div>
                                                    <span className="font-mono font-medium">{ticket.ticketCode}</span>
                                                    {ticket.attendeeName && (
                                                        <span className="text-gray-500 ml-2">{ticket.attendeeName}</span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {ticket.checkedIn && (
                                                        <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                                                            Checked In
                                                        </Badge>
                                                    )}
                                                    <Badge
                                                        variant="secondary"
                                                        className={statusColors[ticket.status] || "bg-gray-100 text-gray-800"}
                                                    >
                                                        {ticket.status}
                                                    </Badge>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Actions */}
                            {orderDetail.status === "confirmed" && (
                                <div className="flex gap-2 pt-2 border-t">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-red-600 border-red-200 hover:bg-red-50"
                                        onClick={() => {
                                            setRefundOrderId(orderDetail.id);
                                        }}
                                        disabled={refundMutation.isPending}
                                    >
                                        <RotateCcw className="w-3 h-3 mr-1" />
                                        Refund
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            updateStatus.mutate({ id: orderDetail.id, status: "cancelled" });
                                            setSelectedOrderId(null);
                                        }}
                                        disabled={updateStatus.isPending}
                                    >
                                        Cancel Order
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
                            This will refund the full order amount via Square and mark the order as refunded. The customer will receive a refund notification. This action cannot be undone.
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
