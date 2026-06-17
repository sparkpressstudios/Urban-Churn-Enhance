import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatEasternDate } from "@/lib/utils";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useTour } from "@/lib/tour";
import { adminDashboardSteps } from "@/lib/tour/tour-steps";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    ShoppingBag,
    Clock,
    DollarSign,
    TrendingUp,
    Download,
    BarChart3,
} from "lucide-react";
import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
} from "recharts";

const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    confirmed: "bg-blue-100 text-blue-800",
    ready: "bg-green-100 text-green-800",
    picked_up: "bg-gray-100 text-gray-800",
    cancelled: "bg-red-100 text-red-800",
    refunded: "bg-purple-100 text-purple-800",
};

const PIE_COLORS = ["#A1AB74", "#6B8E23", "#DAA520", "#CD853F", "#8FBC8F", "#BDB76B"];

const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

function getEasternYearMonth(): { year: number; month: number } {
    const easternDate = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
    const [year, month] = easternDate.split("-").map(Number);
    return { year, month };
}

function getYearMonthOptions() {
    const { year, month } = getEasternYearMonth();
    return Array.from({ length: month }, (_, i) => {
        const monthNum = i + 1;
        const value = `month:${year}-${String(monthNum).padStart(2, "0")}`;
        return { value, label: `${MONTH_NAMES[i]} ${year}` };
    }).reverse();
}

function periodToQueryParams(period: string): Record<string, string> {
    if (period.startsWith("month:")) {
        return { month: period.slice("month:".length) };
    }
    return { days: period };
}

function getPeriodShortLabel(period: string): string {
    if (period.startsWith("month:")) {
        const [, yearMonth] = period.split(":");
        const [year, month] = yearMonth.split("-").map(Number);
        return `${MONTH_NAMES[month - 1]} ${year}`;
    }
    return `${period}d`;
}

function getPeriodDescription(period: string): string {
    if (period.startsWith("month:")) {
        return `in ${getPeriodShortLabel(period)}`;
    }
    return `in last ${period} days`;
}

export default function AdminDashboard() {
    const [period, setPeriod] = useState("30");
    const periodParams = periodToQueryParams(period);
    const yearMonthOptions = getYearMonthOptions();

    const { data: stats } = useQuery({
        queryKey: ["admin", "stats"],
        queryFn: api.getOrderStats,
    });

    const { data: summary } = useQuery({
        queryKey: ["admin", "analytics", "summary", period],
        queryFn: () => api.getAnalyticsSummary(periodParams),
    });

    const { data: revenueData = [] } = useQuery({
        queryKey: ["admin", "analytics", "revenue", period],
        queryFn: () => api.getRevenueTimeSeries(periodParams),
    });

    const { data: topProducts = [] } = useQuery({
        queryKey: ["admin", "analytics", "top-products", period],
        queryFn: () => api.getTopProducts(periodParams),
    });

    const { data: byLocation = [] } = useQuery({
        queryKey: ["admin", "analytics", "by-location", period],
        queryFn: () => api.getOrdersByLocation(periodParams),
    });

    const { data: recentOrdersResponse } = useQuery({
        queryKey: ["admin", "orders", "recent"],
        queryFn: () => api.getOrders({ limit: "10" }),
    });
    const recentOrders = recentOrdersResponse?.data;

    const chartData = revenueData.map((d: any) => ({
        date: formatEasternDate(d.date, { month: "short", day: "numeric" }),
        revenue: d.revenue / 100,
        orders: Number(d.orderCount),
    }));

    const handleExport = async () => {
        const url = api.exportOrdersCsv();
        const token = localStorage.getItem("admin_token");
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
            link.download = `orders-export-${new Date().toISOString().slice(0, 10)}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(blobUrl);
        } catch {
            window.open(url, "_blank");
        }
    };

    useTour("admin-dashboard", adminDashboardSteps);

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between" data-tour="admin-dashboard-header">
                    <h1 className="text-2xl font-bold text-white">Dashboard</h1>
                    <div className="flex items-center gap-2">
                        <Select value={period} onValueChange={setPeriod}>
                            <SelectTrigger className="w-[180px]" data-tour="admin-period-selector">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    <SelectLabel>Recent</SelectLabel>
                                    <SelectItem value="7">Last 7 days</SelectItem>
                                    <SelectItem value="30">Last 30 days</SelectItem>
                                    <SelectItem value="90">Last 90 days</SelectItem>
                                </SelectGroup>
                                {yearMonthOptions.length > 0 && (
                                    <SelectGroup>
                                        <SelectLabel>{getEasternYearMonth().year}</SelectLabel>
                                        {yearMonthOptions.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                )}
                            </SelectContent>
                        </Select>
                        <Button variant="outline" size="sm" onClick={handleExport} data-tour="admin-export-btn">
                            <Download className="w-4 h-4 mr-1" /> Export
                        </Button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" data-tour="admin-stat-cards">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-gray-600">
                                Total Orders
                            </CardTitle>
                            <ShoppingBag className="w-4 h-4 text-gray-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {stats?.totalOrders ?? 0}
                            </div>
                            {summary && (
                                <p className="text-xs text-gray-500 mt-1">
                                    {summary.orders} {getPeriodDescription(period)}
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-gray-600">
                                Revenue ({getPeriodShortLabel(period)})
                            </CardTitle>
                            <DollarSign className="w-4 h-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">
                                ${((summary?.revenue ?? 0) / 100).toFixed(2)}
                            </div>
                            {summary?.prevRevenue !== undefined && (
                                <p className="text-xs text-gray-500 mt-1">
                                    Prev: ${(summary.prevRevenue / 100).toFixed(2)}
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-gray-600">
                                Avg Order
                            </CardTitle>
                            <TrendingUp className="w-4 h-4 text-gray-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                ${((summary?.avgOrderValue ?? 0) / 100).toFixed(2)}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-gray-600">
                                Pending
                            </CardTitle>
                            <Clock className="w-4 h-4 text-yellow-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-yellow-600">
                                {stats?.pendingOrders ?? 0}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Charts Row */}
                <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                    {/* Revenue Chart */}
                    <Card data-tour="admin-revenue-chart">
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <BarChart3 className="w-4 h-4" /> Revenue Over Time
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {chartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={250}>
                                    <AreaChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                                        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                                        <Tooltip formatter={(v: number) => [`$${v.toFixed(2)}`, "Revenue"]} />
                                        <Area
                                            type="monotone"
                                            dataKey="revenue"
                                            stroke="#A1AB74"
                                            fill="#A1AB74"
                                            fillOpacity={0.15}
                                            strokeWidth={2}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <p className="text-gray-400 text-sm text-center py-12">No revenue data yet</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Orders by Location */}
                    <Card data-tour="admin-location-chart">
                        <CardHeader>
                            <CardTitle className="text-base">Orders by Location</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {byLocation.length > 0 ? (
                                <ResponsiveContainer width="100%" height={250}>
                                    <PieChart>
                                        <Pie
                                            data={byLocation.map((d: any) => ({
                                                name: d.locationName || "Unknown",
                                                value: Number(d.orderCount),
                                            }))}
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={80}
                                            dataKey="value"
                                            label={({ name, value }) => `${name}: ${value}`}
                                        >
                                            {byLocation.map((_: any, i: number) => (
                                                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <p className="text-gray-400 text-sm text-center py-12">No location data yet</p>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Top Products */}
                {topProducts.length > 0 && (
                    <Card data-tour="admin-top-products">
                        <CardHeader>
                            <CardTitle className="text-base">Top Products</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart
                                    data={topProducts.map((p: any) => ({
                                        name: `${p.flavourName} (${p.sizeName})`,
                                        units: Number(p.totalQuantity),
                                        revenue: Number(p.totalRevenue) / 100,
                                    }))}
                                    layout="vertical"
                                    margin={{ left: 10 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis type="number" tick={{ fontSize: 11 }} />
                                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
                                    <Tooltip />
                                    <Bar dataKey="units" fill="#A1AB74" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                )}

                {/* Recent Orders */}
                <Card data-tour="admin-recent-orders">
                    <CardHeader>
                        <CardTitle>Recent Orders</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {!recentOrders?.length ? (
                            <p className="text-gray-500 text-sm py-4 text-center">
                                No orders yet. Orders will appear here as customers place pre-orders.
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b text-left text-gray-500">
                                            <th className="pb-2 font-medium">Order #</th>
                                            <th className="pb-2 font-medium">Customer</th>
                                            <th className="pb-2 font-medium">Location</th>
                                            <th className="pb-2 font-medium">Status</th>
                                            <th className="pb-2 font-medium text-right">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recentOrders.slice(0, 10).map((order: any) => (
                                            <tr key={order.id} className="border-b last:border-0">
                                                <td className="py-3 font-mono text-xs">
                                                    {order.orderNumber}
                                                </td>
                                                <td className="py-3">{order.customerName}</td>
                                                <td className="py-3 text-gray-600">
                                                    {order.locationName}
                                                </td>
                                                <td className="py-3">
                                                    <Badge
                                                        variant="secondary"
                                                        className={statusColors[order.status] || ""}
                                                    >
                                                        {order.status.replace("_", " ")}
                                                    </Badge>
                                                </td>
                                                <td className="py-3 text-right font-medium">
                                                    ${(order.totalCents / 100).toFixed(2)}
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
        </AdminLayout>
    );
}
