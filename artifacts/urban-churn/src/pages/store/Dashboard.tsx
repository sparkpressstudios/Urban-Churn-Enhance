import { useQuery } from "@tanstack/react-query";
import { StoreLayout } from "@/components/store/StoreLayout";
import { useStoreContext } from "@/components/store/StoreContext";
import { storeApi } from "@/lib/store-api";
import { useTour } from "@/lib/tour";
import { storeDashboardSteps } from "@/lib/tour/tour-steps";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Clock,
    CheckCircle2,
    PackageCheck,
    AlertCircle,
    ShoppingBag,
    CalendarClock,
    CalendarX,
} from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    confirmed: "bg-blue-100 text-blue-700",
    ready: "bg-green-100 text-green-700",
    partially_picked_up: "bg-orange-100 text-orange-700",
    picked_up: "bg-gray-100 text-gray-600",
};

export default function StoreDashboard() {
    const { selectedLocationId, setSelectedLocationId, showLocationSwitcher, role } = useStoreContext();

    const { data, isLoading } = useQuery({
        queryKey: ["store", "dashboard", selectedLocationId],
        queryFn: () => storeApi.getDashboard(selectedLocationId ?? undefined),
        refetchInterval: 30_000,
    });

    useTour("store-dashboard", storeDashboardSteps(role));

    const stats = [
        {
            label: "Pending",
            value: data?.pending || 0,
            icon: Clock,
            color: "text-yellow-600",
            bg: "bg-yellow-50",
        },
        {
            label: "Confirmed",
            value: data?.confirmed || 0,
            icon: ShoppingBag,
            color: "text-blue-600",
            bg: "bg-blue-50",
        },
        {
            label: "Ready",
            value: data?.ready || 0,
            icon: PackageCheck,
            color: "text-green-600",
            bg: "bg-green-50",
        },
        {
            label: "Partial Pickup",
            value: data?.partiallyPickedUp || 0,
            icon: AlertCircle,
            color: "text-orange-600",
            bg: "bg-orange-50",
        },
        {
            label: "Completed Today",
            value: data?.completedToday || 0,
            icon: CheckCircle2,
            color: "text-[#A1AB74]",
            bg: "bg-[#A1AB74]/10",
        },
    ];

    const pickupStats = [
        {
            label: "Ready Today",
            value: data?.readyToday?.itemCount || 0,
            sub: `${data?.readyToday?.orderCount || 0} orders`,
            icon: CalendarClock,
            color: "text-blue-600",
            bg: "bg-blue-50",
        },
        {
            label: "Overdue",
            value: data?.overdue?.itemCount || 0,
            sub: `${data?.overdue?.orderCount || 0} orders`,
            icon: CalendarX,
            color: "text-red-600",
            bg: "bg-red-50",
        },
    ];

    return (
        <StoreLayout
            selectedLocationId={selectedLocationId}
            onLocationChange={setSelectedLocationId}
            showLocationSwitcher={showLocationSwitcher}
        >
            <div className="space-y-6">
                <div data-tour="store-dashboard-header">
                    <h1 className="text-2xl font-bold text-white">Dashboard</h1>
                    <p className="text-white/60 text-sm">
                        {new Date().toLocaleDateString("en-US", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                        })}
                    </p>
                </div>

                {/* Status cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3" data-tour="store-status-cards">
                    {stats.map((stat) => (
                        <Card key={stat.label} className="bg-white border-gray-200">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${stat.bg}`}>
                                        <stat.icon className={`w-5 h-5 ${stat.color}`} />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                                        <p className="text-xs text-gray-400">{stat.label}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Pickup-date cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3" data-tour="store-pickup-cards">
                    {pickupStats.map((stat) => (
                        <Card key={stat.label} className="bg-white border-gray-200">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${stat.bg}`}>
                                        <stat.icon className={`w-5 h-5 ${stat.color}`} />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-gray-900">
                                            {stat.value}{" "}
                                            <span className="text-sm font-normal text-gray-400">
                                                items
                                            </span>
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            {stat.label} · {stat.sub}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Items breakdown */}
                <Card className="bg-white border-gray-200" data-tour="store-stock-overview">
                    <CardHeader>
                        <CardTitle className="text-gray-900 text-lg">
                            Stock Overview — Unfulfilled Orders
                        </CardTitle>
                        <p className="text-sm text-gray-400">
                            Flavours and sizes needed for pending/confirmed/ready orders
                        </p>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="flex justify-center py-8">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#A1AB74]" />
                            </div>
                        ) : !data?.itemBreakdown?.length ? (
                            <p className="text-center py-8 text-gray-400">No unfulfilled orders</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="border-gray-200">
                                            <TableHead className="text-gray-400">Flavour</TableHead>
                                            <TableHead className="text-gray-400">Size</TableHead>
                                            <TableHead className="text-gray-400 text-right">Total Ordered</TableHead>
                                            <TableHead className="text-gray-400 text-right">Picked Up</TableHead>
                                            <TableHead className="text-gray-400 text-right">Remaining</TableHead>
                                            <TableHead className="text-gray-400 text-right">Orders</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {data.itemBreakdown.map((item: any, i: number) => (
                                            <TableRow key={i} className="border-gray-200">
                                                <TableCell className="text-gray-800 font-medium">
                                                    {item.flavourName}
                                                </TableCell>
                                                <TableCell className="text-gray-600">
                                                    {item.sizeName}
                                                </TableCell>
                                                <TableCell className="text-gray-600 text-right">
                                                    {item.totalQuantity}
                                                </TableCell>
                                                <TableCell className="text-gray-600 text-right">
                                                    {item.pickedUpQuantity}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <span className={item.remainingQuantity > 0 ? "text-yellow-600 font-semibold" : "text-green-600"}>
                                                        {item.remainingQuantity}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-gray-400 text-right">
                                                    {item.orderCount}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </StoreLayout>
    );
}
