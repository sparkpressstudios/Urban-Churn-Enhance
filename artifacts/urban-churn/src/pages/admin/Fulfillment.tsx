import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useDebounce } from "@/hooks/use-debounce";
import { formatEastern } from "@/lib/utils";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useTour } from "@/lib/tour";
import { adminFulfillmentSteps } from "@/lib/tour/tour-steps";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    ClipboardCheck,
    Search,
    Package,
    CheckCircle,
    Clock,
    X,
    Download,
    ChevronDown,
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

const STATUS_LABELS: Record<string, string> = {
    pending: "Pending",
    confirmed: "Confirmed",
    ready: "Ready",
    picked_up: "Picked Up",
};

const STATUS_COLORS: Record<string, string> = {
    pending: "secondary",
    confirmed: "default",
    ready: "destructive",
};

export default function Fulfillment() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [locationFilter, setLocationFilter] = useState<string>("all");
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebounce(search);
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [flavourFilter, setFlavourFilter] = useState<string>("all");
    const [windowFilter, setWindowFilter] = useState<string>("all");

    const { data: locations = [] } = useQuery({
        queryKey: ["admin", "locations"],
        queryFn: () => api.getLocations(),
    });

    const { data: flavours = [] } = useQuery({
        queryKey: ["admin", "flavours"],
        queryFn: () => api.getFlavours(),
    });

    const { data: preOrders = [] } = useQuery({
        queryKey: ["admin", "pre-orders", "fulfillment-export"],
        queryFn: () => api.getPreOrders(),
    });

    const locIdForSummary =
        locationFilter === "all" ? undefined : Number(locationFilter);
    const activeFlavour = flavourFilter === "all" ? undefined : flavourFilter;
    const activeWindowId =
        windowFilter === "all" ? undefined : Number(windowFilter);

    const filterParams = {
        locationId: locIdForSummary,
        from: dateFrom || undefined,
        to: dateTo || undefined,
        flavourName: activeFlavour,
        preOrderWindowId: activeWindowId,
    };

    const { data: summary = [] } = useQuery({
        queryKey: ["fulfillment", "summary", filterParams],
        queryFn: () => api.getFulfillmentSummary(filterParams),
        refetchInterval: 30000,
    });

    const { data: orders = [] } = useQuery({
        queryKey: ["fulfillment", "orders", filterParams, debouncedSearch],
        queryFn: () =>
            api.getFulfillmentOrders({
                ...filterParams,
                search: debouncedSearch || undefined,
            }),
        refetchInterval: 15000,
    });

    const pickupMutation = useMutation({
        mutationFn: (id: number) => api.markOrderPickup(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["fulfillment"] });
            toast({ title: "Order marked as picked up" });
        },
    });

    const readyMutation = useMutation({
        mutationFn: (id: number) => api.markOrderReady(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["fulfillment"] });
            toast({ title: "Order marked as ready" });
        },
    });

    const handleExport = async (format: "summary" | "detail") => {
        const url = api.exportFulfillmentCsv({ format, ...filterParams });
        const token = localStorage.getItem("admin_token");
        const prefix =
            format === "summary" ? "fulfillment-summary" : "fulfillment-orders";
        try {
            const res = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` },
                credentials: "include",
            });
            if (!res.ok) throw new Error("Export failed");
            const blob = await res.blob();
            const blobUrl = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = blobUrl;
            link.download = `${prefix}-${new Date().toISOString().slice(0, 10)}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(blobUrl);
            toast({ title: "Export downloaded" });
        } catch {
            toast({
                title: "Export failed",
                description: "Could not download the CSV file.",
                variant: "destructive",
            });
        }
    };

    useTour("admin-fulfillment", adminFulfillmentSteps);

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between" data-tour="admin-fulfillment-header">
                    <div>
                        <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-white">
                            Fulfillment
                        </h1>
                        <p className="text-white/70">
                            Track orders, manage pickups, and view delivery
                            needs
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Select
                            value={locationFilter}
                            onValueChange={setLocationFilter}
                        >
                            <SelectTrigger className="w-full sm:w-[200px]">
                                <SelectValue placeholder="All Locations" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Locations</SelectItem>
                                {locations.map((loc: any) => (
                                    <SelectItem
                                        key={loc.id}
                                        value={String(loc.id)}
                                    >
                                        {loc.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    data-tour="admin-fulfillment-export"
                                >
                                    <Download className="w-4 h-4 mr-1" />
                                    Export
                                    <ChevronDown className="w-3 h-3 ml-1" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                    onClick={() => handleExport("detail")}
                                >
                                    Order Detail
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => handleExport("summary")}
                                >
                                    Production Summary
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                <Card className="bg-amber-500/5 border-amber-500/30">
                    <CardContent className="p-3 text-xs text-amber-200">
                        This screen is a cross-location production/aggregate report. Day-to-day
                        pickup fulfillment happens in the{" "}
                        <a href="/store" className="underline font-medium">Store Portal</a>
                        , where staff can mark individual items picked up and handle partial
                        pickups for split pickup dates.
                    </CardContent>
                </Card>

                {/* Filters */}
                <div className="flex flex-wrap items-end gap-3" data-tour="admin-fulfillment-filters">
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-muted-foreground">From</label>
                        <Input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="w-[160px]"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-muted-foreground">To</label>
                        <Input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="w-[160px]"
                        />
                    </div>
                    <Select value={flavourFilter} onValueChange={setFlavourFilter}>
                        <SelectTrigger className="w-full sm:w-[200px]">
                            <SelectValue placeholder="All Flavors" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Flavors</SelectItem>
                            {flavours.map((f: any) => (
                                <SelectItem key={f.id} value={f.name}>
                                    {f.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={windowFilter} onValueChange={setWindowFilter}>
                        <SelectTrigger className="w-full sm:w-[240px]">
                            <SelectValue placeholder="All Pre-Order Windows" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Pre-Order Windows</SelectItem>
                            {preOrders.map((w: any) => (
                                <SelectItem key={w.id} value={String(w.id)}>
                                    {w.flavourName ?? `Window #${w.id}`}
                                    {w.pickupDate
                                        ? ` — ${formatEastern(w.pickupDate, { month: "short", day: "numeric", year: "numeric" })}`
                                        : ""}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {(dateFrom || dateTo || flavourFilter !== "all" || windowFilter !== "all") && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setDateFrom("");
                                setDateTo("");
                                setFlavourFilter("all");
                                setWindowFilter("all");
                            }}
                        >
                            <X className="w-3 h-3 mr-1" />
                            Clear filters
                        </Button>
                    )}
                </div>

                <Tabs defaultValue="summary" data-tour="admin-fulfillment-churn-tab">
                    <TabsList>
                        <TabsTrigger value="summary">
                            <Package className="w-4 h-4 mr-2" />
                            Churn & Deliver
                        </TabsTrigger>
                        <TabsTrigger value="pickup" data-tour="admin-fulfillment-pickup-tab">
                            <ClipboardCheck className="w-4 h-4 mr-2" />
                            Pickup / Lookup
                        </TabsTrigger>
                    </TabsList>

                    {/* Summary Tab */}
                    <TabsContent value="summary" className="space-y-4">
                        {summary.length === 0 ? (
                            <Card>
                                <CardContent className="py-8 text-center text-muted-foreground">
                                    <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-40" />
                                    <p className="text-lg font-medium">
                                        All caught up!
                                    </p>
                                    <p>No unfulfilled orders at this time.</p>
                                </CardContent>
                            </Card>
                        ) : (
                            summary.map((loc: any) => (
                                <Card key={loc.locationId}>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Package className="w-5 h-5" />
                                            {loc.locationName}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>
                                                        Flavour
                                                    </TableHead>
                                                    <TableHead>Size</TableHead>
                                                    <TableHead className="text-right">
                                                        Qty Needed
                                                    </TableHead>
                                                    <TableHead className="text-right">
                                                        Orders
                                                    </TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {loc.items.map(
                                                    (
                                                        item: any,
                                                        i: number,
                                                    ) => (
                                                        <TableRow key={i}>
                                                            <TableCell className="font-medium">
                                                                {
                                                                    item.flavourName
                                                                }
                                                            </TableCell>
                                                            <TableCell>
                                                                {item.sizeName}
                                                            </TableCell>
                                                            <TableCell className="text-right font-bold">
                                                                {
                                                                    item.totalQuantity
                                                                }
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                {
                                                                    item.orderCount
                                                                }
                                                            </TableCell>
                                                        </TableRow>
                                                    ),
                                                )}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </TabsContent>

                    {/* Pickup Tab */}
                    <TabsContent value="pickup" className="space-y-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by order number, name, or email..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-10"
                            />
                        </div>

                        {orders.length === 0 ? (
                            <Card>
                                <CardContent className="py-8 text-center text-muted-foreground">
                                    <Search className="w-12 h-12 mx-auto mb-3 opacity-40" />
                                    <p className="text-lg font-medium">
                                        No orders found
                                    </p>
                                    <p>
                                        {search
                                            ? "Try a different search term."
                                            : "No unfulfilled orders at this time."}
                                    </p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="space-y-3">
                                {orders.map((order: any) => (
                                    <Card key={order.id}>
                                        <CardContent className="py-4">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-mono font-bold text-sm">
                                                            {order.orderNumber}
                                                        </span>
                                                        <Badge
                                                            variant={
                                                                (STATUS_COLORS[
                                                                    order.status
                                                                ] as any) ||
                                                                "secondary"
                                                            }
                                                        >
                                                            {STATUS_LABELS[
                                                                order.status
                                                            ] || order.status}
                                                        </Badge>
                                                        {order.squareOrderId && (
                                                            <Badge
                                                                variant="outline"
                                                                className="text-xs"
                                                            >
                                                                Square
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-sm font-medium">
                                                        {order.customerName}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {order.locationName} &middot;{" "}
                                                        {formatEastern(
                                                            order.createdAt,
                                                        )}
                                                    </p>
                                                    <div className="mt-2 text-xs text-muted-foreground">
                                                        {order.items.map(
                                                            (
                                                                item: any,
                                                                i: number,
                                                            ) => (
                                                                <span
                                                                    key={i}
                                                                    className="inline-block mr-3"
                                                                >
                                                                    {
                                                                        item.quantity
                                                                    }
                                                                    x{" "}
                                                                    {
                                                                        item.flavourName
                                                                    }{" "}
                                                                    (
                                                                    {
                                                                        item.sizeName
                                                                    }
                                                                    )
                                                                </span>
                                                            ),
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex flex-col gap-2">
                                                    <p className="text-sm font-bold text-right">
                                                        $
                                                        {(
                                                            order.totalCents /
                                                            100
                                                        ).toFixed(2)}
                                                    </p>
                                                    {(order.status ===
                                                        "pending" ||
                                                        order.status ===
                                                        "confirmed") && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() =>
                                                                    readyMutation.mutate(
                                                                        order.id,
                                                                    )
                                                                }
                                                                disabled={
                                                                    readyMutation.isPending
                                                                }
                                                            >
                                                                <Clock className="w-3 h-3 mr-1" />
                                                                Ready
                                                            </Button>
                                                        )}
                                                    {order.status !==
                                                        "picked_up" && (
                                                            <Button
                                                                size="sm"
                                                                onClick={() =>
                                                                    pickupMutation.mutate(
                                                                        order.id,
                                                                    )
                                                                }
                                                                disabled={
                                                                    pickupMutation.isPending
                                                                }
                                                            >
                                                                <CheckCircle className="w-3 h-3 mr-1" />
                                                                Picked Up
                                                            </Button>
                                                        )}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </AdminLayout>
    );
}
