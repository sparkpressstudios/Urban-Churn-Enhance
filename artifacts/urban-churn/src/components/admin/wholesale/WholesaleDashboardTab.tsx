import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
    formatWholesaleOrderStatus,
    WHOLESALE_PAYMENT_STATUS_LABELS,
} from "@/lib/wholesale-constants";
import { WholesaleStatCard } from "./WholesaleStatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line,
    Cell,
} from "recharts";
import {
    AlertTriangle,
    BarChart3,
    RefreshCw,
    Truck,
    ArrowRight,
    Users,
    DollarSign,
} from "lucide-react";

export type WholesaleNavigateTarget = {
    tab: "dashboard" | "orders" | "customers" | "products" | "production" | "deliveries" | "email-log";
    ordersFilter?: string;
    selectedOrderId?: number;
};

const orderStatusColors: Record<string, string> = {
    pending_review: "bg-yellow-100 text-yellow-800",
    confirmed: "bg-blue-100 text-blue-950",
    in_production: "bg-purple-100 text-purple-800",
    ready: "bg-emerald-100 text-emerald-800",
    delivered: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
};

const REASON_LABELS: Record<string, string> = {
    pending_review: "Needs review",
    unmatched_items: "Unmatched items",
    unpaid: "Unpaid",
    low_confidence: "Low AI confidence",
};

function formatCents(c: number) {
    return `$${(c / 100).toFixed(2)}`;
}

function confidenceColor(c: number | null) {
    if (c === null) return "bg-slate-100 text-slate-700";
    if (c >= 0.9) return "bg-green-100 text-green-800";
    if (c >= 0.7) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
}

export function WholesaleDashboardTab({ onNavigate }: { onNavigate: (t: WholesaleNavigateTarget) => void }) {
    const [scope, setScope] = useState<"today" | "week" | "month">("week");

    const dashQ = useQuery({
        queryKey: ["wholesale-dashboard", scope],
        queryFn: () => api.getWholesaleDashboard({ scope }),
        refetchInterval: 60_000,
    });

    const dash = dashQ.data;
    const loading = dashQ.isLoading;
    const isError = dashQ.isError;

    const activePipeline = dash?.activePipeline || {
        pending_review: 0,
        confirmed: 0,
        in_production: 0,
        ready: 0,
    };
    const pipelineData = [
        { name: "Pending", value: activePipeline.pending_review, fill: "#EAB308" },
        { name: "Confirmed", value: activePipeline.confirmed, fill: "#3B82F6" },
        { name: "Production", value: activePipeline.in_production, fill: "#A855F7" },
        { name: "Ready", value: activePipeline.ready, fill: "#10B981" },
    ].filter((d) => d.value > 0);

    const productionByFlavour = (dash?.productionByFlavour || []).map((r: any) => ({
        name: r.flavourName || "(unmatched)",
        quantity: parseInt(r.totalQuantity) || 0,
    }));

    const ordersTrend = (dash?.ordersByDay || []).map((d: any) => ({
        label: new Date(d.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        count: d.count,
    }));

    const openOrder = (id: number, filter?: string) => {
        onNavigate({ tab: "orders", ordersFilter: filter, selectedOrderId: id });
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-1 rounded-lg border border-slate-200 p-0.5">
                    {(["today", "week", "month"] as const).map((s) => (
                        <button
                            key={s}
                            type="button"
                            onClick={() => setScope(s)}
                            className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                                scope === s
                                    ? "bg-slate-900 text-white"
                                    : "text-slate-600 hover:text-slate-900"
                            }`}
                        >
                            {s === "week" ? "This week" : s === "month" ? "This month" : "Today"}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                    {dash?.lastUpdatedAt && (
                        <span>
                            Updated{" "}
                            {new Date(dash.lastUpdatedAt).toLocaleTimeString("en-US", {
                                hour: "numeric",
                                minute: "2-digit",
                            })}
                        </span>
                    )}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => dashQ.refetch()}
                        disabled={dashQ.isFetching}
                    >
                        <RefreshCw className={`h-3.5 w-3.5 mr-1 ${dashQ.isFetching ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>
                </div>
            </div>

            {isError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
                    Could not load dashboard data.{" "}
                    <button type="button" className="underline font-medium" onClick={() => dashQ.refetch()}>
                        Try again
                    </button>
                </div>
            )}

            {/* Needs attention */}
            <Card data-tour="admin-wholesale-stats">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        Needs Attention
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {(dash?.needsAttention || []).length > 0 ? (
                        <div className="divide-y">
                            {(dash?.needsAttention || []).map((item: any, idx: number) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => openOrder(item.id)}
                                    className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
                                >
                                    <div className="min-w-0 flex-1">
                                        <p className="font-medium text-slate-900">{item.customerName}</p>
                                        <p className="text-xs text-slate-600">{item.orderNumber}</p>
                                        <div className="mt-1 flex flex-wrap gap-1">
                                            {item.reasons.map((r: string) => (
                                                <Badge key={r} variant="secondary" className="text-[10px]">
                                                    {REASON_LABELS[r] || r}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                    <Badge className={orderStatusColors[item.status] || "bg-slate-100"}>
                                        {formatWholesaleOrderStatus(item.status)}
                                    </Badge>
                                    {item.aiParseConfidence !== null && (
                                        <span
                                            className={`rounded px-2 py-0.5 text-xs font-medium ${confidenceColor(item.aiParseConfidence)}`}
                                            data-tour={idx === 0 ? "admin-wholesale-confidence" : undefined}
                                        >
                                            {Math.round(item.aiParseConfidence * 100)}%
                                        </span>
                                    )}
                                    <ArrowRight className="h-4 w-4 text-slate-400 shrink-0" />
                                </button>
                            ))}
                        </div>
                    ) : loading ? (
                        <p className="px-4 py-8 text-center text-sm text-slate-500">Loading…</p>
                    ) : (
                        <div className="px-4 py-8 text-center">
                            <p className="text-sm text-slate-600">All caught up — no orders need immediate attention.</p>
                            <Button
                                variant="link"
                                className="mt-1"
                                onClick={() => onNavigate({ tab: "orders" })}
                            >
                                View all orders
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* KPI strip */}
            <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 snap-x">
                <div className="min-w-[140px] snap-start flex-1">
                    <WholesaleStatCard
                        label="Pending Review"
                        value={dash?.pendingReview ?? 0}
                        valueClassName="text-yellow-600"
                        loading={loading}
                        onClick={() => onNavigate({ tab: "orders", ordersFilter: "pending_review" })}
                    />
                </div>
                <div className="min-w-[140px] snap-start flex-1">
                    <WholesaleStatCard
                        label="In Production"
                        value={dash?.activePipeline?.in_production ?? 0}
                        valueClassName="text-purple-600"
                        loading={loading}
                        onClick={() => onNavigate({ tab: "orders", ordersFilter: "in_production" })}
                    />
                </div>
                <div className="min-w-[140px] snap-start flex-1">
                    <WholesaleStatCard
                        label="Deliveries This Week"
                        value={dash?.deliveriesThisWeek ?? 0}
                        valueClassName="text-blue-600"
                        loading={loading}
                        onClick={() => onNavigate({ tab: "deliveries" })}
                    />
                </div>
                <div className="min-w-[140px] snap-start flex-1">
                    <WholesaleStatCard
                        label="Unmatched Items"
                        value={dash?.unmatchedItems ?? 0}
                        valueClassName="text-amber-600"
                        sublabel={
                            dash?.unmatchedItemRate
                                ? `${Math.round(dash.unmatchedItemRate * 100)}% of active line items`
                                : undefined
                        }
                        loading={loading}
                        onClick={() => onNavigate({ tab: "orders", ordersFilter: "filter:has_unmatched" })}
                    />
                </div>
                <div className="min-w-[140px] snap-start flex-1">
                    <WholesaleStatCard
                        label="Awaiting Delivery"
                        value={dash?.awaitingDelivery ?? 0}
                        loading={loading}
                        onClick={() => onNavigate({ tab: "orders", ordersFilter: "filter:awaiting_delivery" })}
                    />
                </div>
                <div className="min-w-[140px] snap-start flex-1">
                    <WholesaleStatCard
                        label="Unpaid (Fulfillment)"
                        value={dash?.unpaidAwaitingDelivery ?? 0}
                        valueClassName="text-red-600"
                        loading={loading}
                        onClick={() => onNavigate({ tab: "orders", ordersFilter: "filter:unpaid_awaiting_delivery" })}
                    />
                </div>
                <div className="min-w-[140px] snap-start flex-1">
                    <WholesaleStatCard
                        label="Today's Orders"
                        value={dash?.todayOrders ?? 0}
                        loading={loading}
                        onClick={() => onNavigate({ tab: "orders" })}
                    />
                </div>
                <div className="min-w-[140px] snap-start flex-1">
                    <WholesaleStatCard
                        label="Revenue (scope)"
                        value={formatCents(dash?.revenueScopeCents ?? 0)}
                        valueClassName="text-[#6B8E23] text-xl sm:text-2xl"
                        loading={loading}
                    />
                </div>
            </div>

            {dash?.pendingReviewOldestHours > 0 && (
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    Oldest pending review order has been waiting {dash.pendingReviewOldestHours} hour
                    {dash.pendingReviewOldestHours === 1 ? "" : "s"}.
                </p>
            )}

            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <BarChart3 className="h-4 w-4" />
                            Active Pipeline
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {pipelineData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={pipelineData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                                    <Tooltip />
                                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                        {pipelineData.map((entry, i) => (
                                            <Cell key={i} fill={entry.fill} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <p className="py-12 text-center text-sm text-slate-500">No active orders in pipeline</p>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <CardTitle className="text-base">Order Volume (14 days)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {ordersTrend.some((d: { count: number }) => d.count > 0) ? (
                            <ResponsiveContainer width="100%" height={220}>
                                <LineChart data={ordersTrend}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                                    <Tooltip />
                                    <Line type="monotone" dataKey="count" stroke="#A1AB74" strokeWidth={2} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <p className="py-12 text-center text-sm text-slate-500">No orders in the last 14 days</p>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <BarChart3 className="h-4 w-4" />
                            Production Needed (7 days)
                        </CardTitle>
                        <Button variant="ghost" size="sm" onClick={() => onNavigate({ tab: "production" })}>
                            Full report →
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {productionByFlavour.length > 0 ? (
                            <ResponsiveContainer width="100%" height={260}>
                                <BarChart data={productionByFlavour} layout="vertical" margin={{ left: 90 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis type="number" tick={{ fontSize: 11 }} />
                                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={85} />
                                    <Tooltip formatter={(v: number) => [v, "Units"]} />
                                    <Bar dataKey="quantity" fill="#A1AB74" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="py-10 text-center">
                                <p className="text-sm text-slate-500">No confirmed production for next 7 days</p>
                                <Button
                                    variant="link"
                                    size="sm"
                                    onClick={() => onNavigate({ tab: "orders", ordersFilter: "pending_review" })}
                                >
                                    Review pending orders
                                </Button>
                            </div>
                        )}
                        {(dash?.productionByProduct || []).length > 0 && (
                            <div className="mt-4 border-t pt-3">
                                <p className="text-xs font-medium text-slate-600 mb-2">Top products by volume</p>
                                <div className="space-y-1 max-h-32 overflow-y-auto text-xs">
                                    {(dash?.productionByProduct || []).slice(0, 6).map((p: any, i: number) => (
                                        <div key={i} className="flex justify-between gap-2">
                                            <span className="truncate text-slate-700">
                                                {p.flavourName || "?"} — {p.productName || "Custom"}
                                            </span>
                                            <span className="font-mono text-slate-600 shrink-0">
                                                {parseInt(p.totalQuantity) || 0}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Users className="h-4 w-4" />
                            Top Clients (30 days)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {(dash?.topCustomers || []).length > 0 ? (
                            <div className="space-y-2">
                                {(dash?.topCustomers || []).map((c: any) => (
                                    <div
                                        key={c.customerId}
                                        className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm"
                                    >
                                        <div className="min-w-0">
                                            <p className="font-medium truncate">{c.businessName}</p>
                                            <p className="text-xs text-slate-500">{c.orderCount} orders</p>
                                        </div>
                                        <span className="font-mono text-slate-700 shrink-0">
                                            {formatCents(c.totalCents)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="py-8 text-center text-sm text-slate-500">No client activity in last 30 days</p>
                        )}
                        <div className="mt-4 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                            <DollarSign className="h-4 w-4 text-[#6B8E23]" />
                            <span className="text-slate-600">Month revenue (scheduled):</span>
                            <span className="font-semibold">{formatCents(dash?.revenueMonthCents ?? 0)}</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Truck className="h-4 w-4" />
                        Upcoming Deliveries
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => onNavigate({ tab: "deliveries" })}>
                        View all →
                    </Button>
                </CardHeader>
                <CardContent className="p-0">
                    {(dash?.upcomingDeliveries || []).length > 0 ? (
                        <div className="divide-y">
                            {(dash?.upcomingDeliveries || []).map((d: any) => (
                                <button
                                    key={d.id}
                                    type="button"
                                    onClick={() => openOrder(d.id)}
                                    className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left hover:bg-slate-50"
                                >
                                    <div className="min-w-0 flex-1">
                                        <p className="font-medium">{d.customerName}</p>
                                        <p className="text-xs text-slate-600">
                                            {d.orderNumber}
                                            {d.customerCity ? ` · ${d.customerCity}` : ""}
                                        </p>
                                    </div>
                                    <span className="text-sm text-slate-700">
                                        {d.confirmedDeliveryDate
                                            ? new Date(d.confirmedDeliveryDate + "T12:00:00").toLocaleDateString(
                                                  "en-US",
                                                  { weekday: "short", month: "short", day: "numeric" },
                                              )
                                            : "TBD"}
                                    </span>
                                    <Badge className={orderStatusColors[d.status] || "bg-slate-100"}>
                                        {formatWholesaleOrderStatus(d.status)}
                                    </Badge>
                                    <span className="text-xs text-slate-500 capitalize">{d.deliveryMethod}</span>
                                    {d.paymentStatus && d.paymentStatus !== "paid" && (
                                        <Badge variant="outline" className="text-[10px]">
                                            {WHOLESALE_PAYMENT_STATUS_LABELS[d.paymentStatus] || d.paymentStatus}
                                        </Badge>
                                    )}
                                    {d.hasUnmatchedItems && (
                                        <Badge className="bg-amber-100 text-amber-900 text-[10px]">Unmatched</Badge>
                                    )}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="px-4 py-8 text-center">
                            <p className="text-sm text-slate-500">No upcoming deliveries scheduled</p>
                            <Button variant="link" size="sm" onClick={() => onNavigate({ tab: "deliveries" })}>
                                Open deliveries calendar
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
