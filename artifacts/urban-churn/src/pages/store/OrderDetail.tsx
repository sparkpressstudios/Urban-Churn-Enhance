import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { StoreLayout } from "@/components/store/StoreLayout";
import { useStoreContext } from "@/components/store/StoreContext";
import { storeApi } from "@/lib/store-api";
import { formatEasternDate } from "@/lib/utils";
import { useTour } from "@/lib/tour";
import { storeOrderDetailSteps } from "@/lib/tour/tour-steps";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    ArrowLeft,
    Check,
    Undo2,
    PackageCheck,
    User,
    Mail,
    Phone,
    StickyNote,
    AlertTriangle,
    RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

const STATUS_BADGE: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
    confirmed: "bg-blue-100 text-blue-700 border-blue-200",
    ready: "bg-green-100 text-green-700 border-green-200",
    partially_picked_up: "bg-orange-100 text-orange-700 border-orange-200",
    picked_up: "bg-gray-100 text-gray-600 border-gray-200",
    cancelled: "bg-red-100 text-red-700 border-red-200",
    refunded: "bg-purple-100 text-purple-700 border-purple-200",
};

export default function StoreOrderDetail() {
    const [, params] = useRoute("/store/orders/:id");
    const [, navigate] = useLocation();
    const orderId = Number(params?.id);
    const queryClient = useQueryClient();
    const { selectedLocationId, setSelectedLocationId, showLocationSwitcher } = useStoreContext();
    const [noteText, setNoteText] = useState("");
    const [refundOpen, setRefundOpen] = useState(false);

    const { data: order, isLoading } = useQuery({
        queryKey: ["store", "order", orderId, selectedLocationId],
        queryFn: () => storeApi.getOrder(orderId, selectedLocationId ?? undefined),
        enabled: !!orderId,
    });

    useTour("store-order-detail", storeOrderDetailSteps);

    const invalidateOrder = () => {
        queryClient.invalidateQueries({ queryKey: ["store", "order", orderId] });
        queryClient.invalidateQueries({ queryKey: ["store", "orders"] });
        queryClient.invalidateQueries({ queryKey: ["store", "dashboard"] });
    };

    const statusMutation = useMutation({
        mutationFn: (status: string) =>
            storeApi.updateOrderStatus(orderId, status, selectedLocationId ?? undefined),
        onSuccess: () => {
            toast.success("Order status updated");
            invalidateOrder();
        },
        onError: (e: any) => toast.error(e.message),
    });

    const itemPickupMutation = useMutation({
        mutationFn: ({ itemId, quantity }: { itemId: number; quantity?: number }) =>
            storeApi.markItemPickedUp(orderId, itemId, quantity, selectedLocationId ?? undefined),
        onSuccess: () => {
            toast.success("Item marked as picked up");
            invalidateOrder();
        },
        onError: (e: any) => toast.error(e.message),
    });

    const undoPickupMutation = useMutation({
        mutationFn: (itemId: number) =>
            storeApi.undoItemPickup(orderId, itemId, selectedLocationId ?? undefined),
        onSuccess: () => {
            toast.success("Pickup undone");
            invalidateOrder();
        },
        onError: (e: any) => toast.error(e.message),
    });

    const pickupAllMutation = useMutation({
        mutationFn: () => storeApi.pickupAll(orderId, selectedLocationId ?? undefined),
        onSuccess: () => {
            toast.success("All items marked as picked up");
            invalidateOrder();
        },
        onError: (e: any) => toast.error(e.message),
    });

    const addNoteMutation = useMutation({
        mutationFn: (content: string) =>
            storeApi.addNote(orderId, content, selectedLocationId ?? undefined),
        onSuccess: () => {
            toast.success("Note added");
            setNoteText("");
            invalidateOrder();
        },
        onError: (e: any) => toast.error(e.message),
    });

    const refundMutation = useMutation({
        mutationFn: () => storeApi.refundOrder(orderId, selectedLocationId ?? undefined),
        onSuccess: (data: any) => {
            if (data?.refundError) {
                toast.error("Marked as refunded, but Square refund failed: " + data.refundError);
            } else {
                toast.success("Order refunded successfully");
            }
            invalidateOrder();
        },
        onError: (e: any) => toast.error(e.message || "Refund failed"),
    });

    if (isLoading) {
        return (
            <StoreLayout
                selectedLocationId={selectedLocationId}
                onLocationChange={setSelectedLocationId}
                showLocationSwitcher={showLocationSwitcher}
            >
                <div className="flex justify-center py-16">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#A1AB74]" />
                </div>
            </StoreLayout>
        );
    }

    if (!order) {
        return (
            <StoreLayout
                selectedLocationId={selectedLocationId}
                onLocationChange={setSelectedLocationId}
                showLocationSwitcher={showLocationSwitcher}
            >
                <div className="text-center py-16">
                    <p className="text-gray-400">Order not found</p>
                    <Button variant="ghost" onClick={() => navigate("/store/orders")} className="mt-4 text-[#A1AB74]">
                        Back to Orders
                    </Button>
                </div>
            </StoreLayout>
        );
    }

    const items = order.items || [];
    const totalQty = items.reduce((s: number, i: any) => s + i.quantity, 0);
    const totalPickedUp = items.reduce((s: number, i: any) => s + i.pickedUpQuantity, 0);
    const hasRemainingItems = totalPickedUp < totalQty;
    const allPickedUp = totalPickedUp >= totalQty && totalQty > 0;
    const isTerminal = ["picked_up", "cancelled", "refunded"].includes(order.status);

    // Group items by pickup date (YYYY-MM-DD in Eastern tz, or "No date" bucket)
    const itemsByPickup: Array<{ key: string; label: string; sortKey: string; items: any[] }> = (() => {
        const groups = new Map<string, { label: string; sortKey: string; items: any[] }>();
        for (const it of items) {
            let key = "no-date";
            let label = "No pickup date scheduled";
            let sortKey = "~~~~"; // sort last
            if (it.pickupDate) {
                const d = new Date(it.pickupDate);
                key = d.toISOString().split("T")[0];
                label = d.toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                });
                sortKey = key;
            }
            if (!groups.has(key)) groups.set(key, { label, sortKey, items: [] });
            groups.get(key)!.items.push(it);
        }
        return Array.from(groups.entries())
            .map(([key, v]) => ({ key, ...v }))
            .sort((a, b) => a.sortKey.localeCompare(b.sortKey));
    })();

    const hasMultiplePickupDates = itemsByPickup.filter((g) => g.key !== "no-date").length > 1;

    const todayIsoDate = new Date().toISOString().split("T")[0];

    return (
        <StoreLayout
            selectedLocationId={selectedLocationId}
            onLocationChange={setSelectedLocationId}
            showLocationSwitcher={showLocationSwitcher}
        >
            <div className="space-y-4 max-w-4xl">
                {/* Back + header */}
                <div className="flex items-center gap-3" data-tour="store-order-detail-header">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate("/store/orders")}
                        className="text-white/60 hover:text-white h-8 px-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div className="flex-1">
                        <div className="flex items-center gap-3">
                            <h1 className="text-xl font-bold text-white font-mono">
                                {order.orderNumber}
                            </h1>
                            <Badge
                                variant="outline"
                                className={`text-xs ${STATUS_BADGE[order.status] || ""}`}
                            >
                                {order.status.replace(/_/g, " ")}
                            </Badge>
                        </div>
                        <p className="text-xs text-white/50">
                            {order.locationName} &middot; {formatEasternDate(order.createdAt)}
                        </p>
                    </div>
                </div>

                {/* Remaining items warning */}
                {order.status === "partially_picked_up" && hasRemainingItems && (
                    <Card className="bg-orange-50 border-orange-200">
                        <CardContent className="p-4 flex items-center gap-3">
                            <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0" />
                            <div>
                                <p className="text-orange-700 font-medium text-sm">Partial Pickup</p>
                                <p className="text-orange-600 text-xs">
                                    {totalPickedUp} of {totalQty} items picked up. {totalQty - totalPickedUp} remaining.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <div className="grid md:grid-cols-3 gap-4">
                    {/* Customer info */}
                    <Card className="bg-white border-gray-200" data-tour="store-order-customer">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-gray-800 text-sm">Customer</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div className="flex items-center gap-2 text-sm">
                                <User className="w-3.5 h-3.5 text-gray-400" />
                                <span className="text-gray-900">{order.customerName}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <Mail className="w-3.5 h-3.5 text-gray-400" />
                                <span className="text-gray-600">{order.customerEmail}</span>
                            </div>
                            {order.customerPhone && (
                                <div className="flex items-center gap-2 text-sm">
                                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                                    <span className="text-gray-600">{order.customerPhone}</span>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Order summary */}
                    <Card className="bg-white border-gray-200">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-gray-800 text-sm">Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-1 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-400">Total</span>
                                <span className="text-gray-800 font-medium">${(order.totalCents / 100).toFixed(2)}</span>
                            </div>
                            {order.discountCents > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Discount</span>
                                    <span className="text-green-600">-${(order.discountCents / 100).toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span className="text-gray-400">Items</span>
                                <span className="text-gray-900">{totalQty} ({totalPickedUp} picked up)</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Quick actions */}
                    <Card className="bg-white border-gray-200" data-tour="store-order-actions">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-gray-800 text-sm">Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {!isTerminal && order.status !== "ready" && (
                                <Button
                                    size="sm"
                                    className="w-full bg-green-600 hover:bg-green-700 text-white text-xs"
                                    onClick={() => statusMutation.mutate("ready")}
                                    disabled={statusMutation.isPending}
                                >
                                    Mark Ready for Pickup
                                </Button>
                            )}
                            {!isTerminal && hasRemainingItems && (
                                <Button
                                    size="sm"
                                    className="w-full bg-[#A1AB74] hover:bg-[#8a9463] text-white text-xs"
                                    onClick={() => pickupAllMutation.mutate()}
                                    disabled={pickupAllMutation.isPending}
                                >
                                    <PackageCheck className="w-3.5 h-3.5 mr-1.5" />
                                    Mark All Picked Up
                                </Button>
                            )}
                            {!isTerminal && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full text-red-600 border-red-200 hover:bg-red-50 text-xs"
                                    onClick={() => setRefundOpen(true)}
                                    disabled={refundMutation.isPending}
                                >
                                    <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                                    Refund Order
                                </Button>
                            )}
                            {isTerminal && (
                                <p className="text-xs text-gray-500 text-center py-2">
                                    Order is {order.status.replace(/_/g, " ")}
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Items table with pickup controls */}
                <Card className="bg-white border-gray-200" data-tour="store-order-items">
                    <CardHeader>
                        <CardTitle className="text-gray-900 text-base flex items-center justify-between">
                            <span>Order Items</span>
                            {hasMultiplePickupDates && (
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs font-normal">
                                    Split pickup — {itemsByPickup.filter((g) => g.key !== "no-date").length} dates
                                </Badge>
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 space-y-0">
                        {itemsByPickup.map((group, gIdx) => {
                            const groupTotalQty = group.items.reduce((s: number, i: any) => s + i.quantity, 0);
                            const groupPickedUp = group.items.reduce((s: number, i: any) => s + i.pickedUpQuantity, 0);
                            const groupRemaining = groupTotalQty - groupPickedUp;
                            const isOverdue = group.key !== "no-date" && group.key < todayIsoDate && groupRemaining > 0;
                            const isToday = group.key === todayIsoDate && groupRemaining > 0;
                            return (
                                <div key={group.key} className={gIdx > 0 ? "border-t border-gray-200" : ""}>
                                    <div className={`px-4 py-2 flex items-center justify-between ${isOverdue ? "bg-red-50" : isToday ? "bg-blue-50" : "bg-white"
                                        }`}>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-semibold text-gray-900">
                                                {group.label}
                                            </span>
                                            {isOverdue && (
                                                <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200 text-[10px] h-5">
                                                    Overdue
                                                </Badge>
                                            )}
                                            {isToday && (
                                                <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200 text-[10px] h-5">
                                                    Due today
                                                </Badge>
                                            )}
                                        </div>
                                        <span className="text-xs text-gray-400">
                                            {groupPickedUp}/{groupTotalQty} picked up
                                        </span>
                                    </div>
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="border-gray-200">
                                                <TableHead className="text-gray-400">Flavour</TableHead>
                                                <TableHead className="text-gray-400">Size</TableHead>
                                                <TableHead className="text-gray-400 text-center">Qty</TableHead>
                                                <TableHead className="text-gray-400 text-center">Picked Up</TableHead>
                                                <TableHead className="text-gray-400 text-right">Price</TableHead>
                                                <TableHead className="text-gray-400 text-right">Action</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {group.items.map((item: any) => {
                                                const remaining = item.quantity - item.pickedUpQuantity;
                                                const fullyPickedUp = remaining <= 0;
                                                return (
                                                    <TableRow
                                                        key={item.id}
                                                        className={`border-gray-200 ${fullyPickedUp ? "opacity-60" : ""}`}
                                                    >
                                                        <TableCell className="text-gray-800 font-medium">
                                                            {item.flavourName}
                                                        </TableCell>
                                                        <TableCell className="text-gray-600">
                                                            {item.sizeName}
                                                        </TableCell>
                                                        <TableCell className="text-gray-600 text-center">
                                                            {item.quantity}
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            {fullyPickedUp ? (
                                                                <div className="flex flex-col items-center">
                                                                    <span className="text-green-600 flex items-center gap-1 text-xs">
                                                                        <Check className="w-3 h-3" /> Done
                                                                    </span>
                                                                    {item.pickedUpAt && (
                                                                        <span className="text-[10px] text-gray-500">
                                                                            {formatEasternDate(item.pickedUpAt)}
                                                                        </span>
                                                                    )}
                                                                    {item.pickedUpByStaffName && (
                                                                        <span className="text-[10px] text-gray-500">
                                                                            by {item.pickedUpByStaffName}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <span className="text-yellow-600 text-sm font-medium">
                                                                    {item.pickedUpQuantity}/{item.quantity}
                                                                </span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-gray-900 text-right text-sm">
                                                            ${(item.priceCents / 100).toFixed(2)}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            {!isTerminal && (
                                                                <div className="flex items-center justify-end gap-1">
                                                                    {!fullyPickedUp && (
                                                                        <Button
                                                                            size="sm"
                                                                            variant="ghost"
                                                                            className="text-green-600 hover:text-green-700 hover:bg-green-50 h-7 text-xs px-2"
                                                                            onClick={() =>
                                                                                itemPickupMutation.mutate({ itemId: item.id })
                                                                            }
                                                                            disabled={itemPickupMutation.isPending}
                                                                        >
                                                                            <Check className="w-3 h-3 mr-1" />
                                                                            Pickup
                                                                        </Button>
                                                                    )}
                                                                    {item.pickedUpQuantity > 0 && (
                                                                        <Button
                                                                            size="sm"
                                                                            variant="ghost"
                                                                            className="text-gray-400 hover:text-orange-600 hover:bg-orange-50 h-7 text-xs px-2"
                                                                            onClick={() =>
                                                                                undoPickupMutation.mutate(item.id)
                                                                            }
                                                                            disabled={undoPickupMutation.isPending}
                                                                        >
                                                                            <Undo2 className="w-3 h-3 mr-1" />
                                                                            Undo
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>

                {/* Notes section */}
                <Card className="bg-white border-gray-200" data-tour="store-order-notes">
                    <CardHeader>
                        <CardTitle className="text-gray-900 text-base flex items-center gap-2">
                            <StickyNote className="w-4 h-4" />
                            Notes
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {/* Add note form */}
                        <div className="flex gap-2">
                            <Textarea
                                placeholder="Add a note..."
                                value={noteText}
                                onChange={(e) => setNoteText(e.target.value)}
                                className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-500 min-h-[60px] text-sm"
                                rows={2}
                            />
                            <Button
                                size="sm"
                                onClick={() => noteText.trim() && addNoteMutation.mutate(noteText)}
                                disabled={!noteText.trim() || addNoteMutation.isPending}
                                className="bg-[#A1AB74] hover:bg-[#8a9463] text-white self-end"
                            >
                                Add
                            </Button>
                        </div>

                        {/* Customer notes */}
                        {order.customerNotes && (
                            <div className="text-sm text-gray-600 bg-white rounded-lg p-3 border border-gray-200">
                                <span className="text-gray-500 text-xs">Customer notes:</span>
                                <p className="mt-1">{order.customerNotes}</p>
                            </div>
                        )}

                        {/* Staff/internal notes */}
                        {(order.orderNotes || []).length === 0 && !order.customerNotes && (
                            <p className="text-xs text-gray-500 text-center py-2">No notes yet</p>
                        )}
                        <div className="space-y-2">
                            {(order.orderNotes || []).map((note: any) => (
                                <NoteEntry key={note.id} note={note} />
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Refund Confirmation Dialog */}
            <AlertDialog open={refundOpen} onOpenChange={setRefundOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                            Confirm Refund
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            This will refund the full order amount of ${(order.totalCents / 100).toFixed(2)} via Square and mark the order as refunded. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700"
                            onClick={() => {
                                refundMutation.mutate();
                                setRefundOpen(false);
                            }}
                        >
                            Confirm Refund
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </StoreLayout>
    );
}

function NoteEntry({ note }: { note: any }) {
    return (
        <div className="text-sm bg-white rounded-lg p-3 border border-gray-200">
            <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-400">{note.author}</span>
                <span className="text-[10px] text-gray-500">{formatEasternDate(note.createdAt)}</span>
            </div>
            <p className="text-gray-600">{note.content}</p>
        </div>
    );
}
