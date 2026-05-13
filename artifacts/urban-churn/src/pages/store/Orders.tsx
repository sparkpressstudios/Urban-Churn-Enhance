import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { StoreLayout } from "@/components/store/StoreLayout";
import { useStoreContext } from "@/components/store/StoreContext";
import { storeApi } from "@/lib/store-api";
import { formatEasternDate } from "@/lib/utils";
import { useTour } from "@/lib/tour";
import { storeOrdersSteps } from "@/lib/tour/tour-steps";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";

const STATUS_OPTIONS = [
    { value: "", label: "All" },
    { value: "pending", label: "Pending" },
    { value: "confirmed", label: "Confirmed" },
    { value: "ready", label: "Ready" },
    { value: "partially_picked_up", label: "Partial Pickup" },
    { value: "picked_up", label: "Picked Up" },
    { value: "cancelled", label: "Cancelled" },
    { value: "refunded", label: "Refunded" },
];

const STATUS_BADGE: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
    confirmed: "bg-blue-100 text-blue-700 border-blue-200",
    ready: "bg-green-100 text-green-700 border-green-200",
    partially_picked_up: "bg-orange-100 text-orange-700 border-orange-200",
    picked_up: "bg-gray-100 text-gray-600 border-gray-200",
    cancelled: "bg-red-100 text-red-700 border-red-200",
    refunded: "bg-purple-100 text-purple-700 border-purple-200",
};

const DATE_PRESETS = [
    { label: "Today", value: "today" },
    { label: "This Week", value: "week" },
    { label: "All Time", value: "" },
];

const PICKUP_DATE_OPTIONS = [
    { label: "All Pickups", value: "" },
    { label: "Due Today", value: "today" },
    { label: "This Week", value: "this_week" },
    { label: "Overdue", value: "overdue" },
];

function getDateRange(preset: string) {
    const now = new Date();
    if (preset === "today") {
        const from = new Date(now);
        from.setHours(0, 0, 0, 0);
        return { from: from.toISOString().split("T")[0], to: now.toISOString().split("T")[0] };
    }
    if (preset === "week") {
        const from = new Date(now);
        from.setDate(from.getDate() - from.getDay());
        from.setHours(0, 0, 0, 0);
        return { from: from.toISOString().split("T")[0], to: now.toISOString().split("T")[0] };
    }
    return {};
}

export default function StoreOrders() {
    const { selectedLocationId, setSelectedLocationId, showLocationSwitcher } = useStoreContext();
    const [, navigate] = useLocation();
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("");
    const [datePreset, setDatePreset] = useState("today");
    const [pickupDate, setPickupDate] = useState("");
    const [page, setPage] = useState(1);

    const dateRange = getDateRange(datePreset);
    const params: Record<string, string> = {
        page: String(page),
        limit: "25",
    };
    if (search) params.search = search;
    if (status) params.status = status;
    if (dateRange.from) params.from = dateRange.from;
    if (dateRange.to) params.to = dateRange.to;
    if (pickupDate) params.pickupDate = pickupDate;
    if (selectedLocationId) params.locationId = String(selectedLocationId);

    const { data, isLoading } = useQuery({
        queryKey: ["store", "orders", params],
        queryFn: () => storeApi.getOrders(params),
        refetchInterval: 15_000,
    });

    const orders = data?.orders || [];
    const total = data?.total || 0;
    const totalPages = Math.ceil(total / 25);

    useTour("store-orders", storeOrdersSteps);

    return (
        <StoreLayout
            selectedLocationId={selectedLocationId}
            onLocationChange={setSelectedLocationId}
            showLocationSwitcher={showLocationSwitcher}
        >
            <div className="space-y-4">
                <div data-tour="store-orders-header">
                    <h1 className="text-2xl font-bold text-white">Orders</h1>
                    <p className="text-white/60 text-sm">Search and manage customer orders</p>
                </div>

                {/* Search + Filters */}
                <Card className="bg-white border-gray-200" data-tour="store-orders-search">
                    <CardContent className="p-4 space-y-3">
                        {/* Search */}
                        <div className="relative" data-tour="store-orders-filters">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder="Search by name, email, or order number..."
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setPage(1);
                                }}
                                className="pl-10 bg-white border-gray-200 text-gray-900 placeholder:text-gray-500"
                            />
                        </div>

                        {/* Status + date filters */}
                        <div className="flex flex-wrap gap-2">
                            {/* Status tabs */}
                            <div className="flex flex-wrap gap-1">
                                {STATUS_OPTIONS.map((opt) => (
                                    <Button
                                        key={opt.value}
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => { setStatus(opt.value); setPage(1); }}
                                        className={`text-xs h-7 px-2.5 ${status === opt.value
                                            ? "bg-[#A1AB74]/20 text-[#A1AB74] font-semibold"
                                            : "bg-gray-100 text-gray-500 hover:text-gray-900 hover:bg-gray-200"
                                            }`}
                                    >
                                        {opt.label}
                                    </Button>
                                ))}
                            </div>
                            <div className="border-l border-gray-200 mx-1" />
                            {/* Date presets */}
                            <div className="flex gap-1">
                                {DATE_PRESETS.map((preset) => (
                                    <Button
                                        key={preset.value}
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => { setDatePreset(preset.value); setPage(1); }}
                                        className={`text-xs h-7 px-2.5 ${datePreset === preset.value
                                            ? "bg-[#A1AB74]/20 text-[#A1AB74] font-semibold"
                                            : "bg-gray-100 text-gray-500 hover:text-gray-900 hover:bg-gray-200"
                                            }`}
                                    >
                                        {preset.label}
                                    </Button>
                                ))}
                            </div>
                            <div className="border-l border-gray-200 mx-1" />
                            {/* Pickup-date filter */}
                            <div className="flex gap-1 items-center">
                                <span className="text-xs text-gray-500 mr-1">Pickup:</span>
                                {PICKUP_DATE_OPTIONS.map((opt) => (
                                    <Button
                                        key={opt.value}
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => { setPickupDate(opt.value); setPage(1); }}
                                        className={`text-xs h-7 px-2.5 ${pickupDate === opt.value
                                            ? "bg-blue-100 text-blue-700 font-semibold"
                                            : "bg-gray-100 text-gray-500 hover:text-gray-900 hover:bg-gray-200"
                                            }`}
                                    >
                                        {opt.label}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Orders table */}
                <Card className="bg-white border-gray-200" data-tour="store-orders-table">
                    <CardContent className="p-0">
                        {isLoading ? (
                            <div className="flex justify-center py-12">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#A1AB74]" />
                            </div>
                        ) : orders.length === 0 ? (
                            <p className="text-center py-12 text-gray-400">No orders found</p>
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="border-gray-200">
                                                <TableHead className="text-gray-400">Order #</TableHead>
                                                <TableHead className="text-gray-400">Customer</TableHead>
                                                <TableHead className="text-gray-400">Items</TableHead>
                                                <TableHead className="text-gray-400">Total</TableHead>
                                                <TableHead className="text-gray-400">Status</TableHead>
                                                <TableHead className="text-gray-400">Date</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {orders.map((order: any) => (
                                                <TableRow
                                                    key={order.id}
                                                    className="border-gray-200 cursor-pointer hover:bg-white transition-colors"
                                                    onClick={() => navigate(`/store/orders/${order.id}`)}
                                                >
                                                    <TableCell className="text-gray-900 font-mono text-sm">
                                                        {order.orderNumber}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div>
                                                            <p className="text-gray-800 text-sm">{order.customerName}</p>
                                                            <p className="text-gray-400 text-xs">{order.customerEmail}</p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-gray-600 text-sm">
                                                        {order.itemsPickedUp}/{order.itemCount}
                                                    </TableCell>
                                                    <TableCell className="text-gray-800 text-sm">
                                                        ${(order.totalCents / 100).toFixed(2)}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            variant="outline"
                                                            className={`text-xs ${STATUS_BADGE[order.status] || ""}`}
                                                        >
                                                            {order.status.replace(/_/g, " ")}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-gray-400 text-xs">
                                                        {formatEasternDate(order.createdAt)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>

                                {/* Pagination */}
                                {totalPages > 1 && (
                                    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
                                        <p className="text-xs text-gray-400">
                                            Showing {(page - 1) * 25 + 1}–{Math.min(page * 25, total)} of {total}
                                        </p>
                                        <div className="flex gap-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                disabled={page <= 1}
                                                onClick={() => setPage(page - 1)}
                                                className="text-gray-400 h-7"
                                            >
                                                <ChevronLeft className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                disabled={page >= totalPages}
                                                onClick={() => setPage(page + 1)}
                                                className="text-gray-400 h-7"
                                            >
                                                <ChevronRight className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </StoreLayout>
    );
}
