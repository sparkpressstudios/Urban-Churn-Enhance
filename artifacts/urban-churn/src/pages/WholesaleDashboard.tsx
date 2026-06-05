import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useCustomerAuth } from "@/components/CustomerAuthContext";
import { api } from "@/lib/api";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { TourProvider, useTour } from "@/lib/tour";
import { wholesaleDashboardSteps } from "@/lib/tour/tour-steps";
import {
    formatWholesaleOrderStatus,
    WHOLESALE_ACTIVE_ORDER_STATUSES,
    WHOLESALE_PAYMENT_STATUS_LABELS,
} from "@/lib/wholesale-constants";

const STATUS_COLORS: Record<string, string> = {
    pending_review: "bg-yellow-500/20 text-yellow-200",
    confirmed: "bg-blue-500/20 text-blue-200",
    in_production: "bg-purple-500/20 text-purple-200",
    ready: "bg-green-500/20 text-green-200",
    delivered: "bg-emerald-500/20 text-emerald-200",
    cancelled: "bg-red-500/20 text-red-200",
};

type OrderFilter = "active" | "delivered" | "all";

function formatCents(c: number) {
    return `$${(c / 100).toFixed(2)}`;
}

export default function WholesaleDashboard() {
    const [, navigate] = useLocation();
    const { customer, isLoading: authLoading, isWholesale, logout } = useCustomerAuth();
    const [orderFilter, setOrderFilter] = useState<OrderFilter>("active");

    useEffect(() => {
        if (!authLoading && !customer) {
            navigate("/account/login");
        }
    }, [authLoading, customer, navigate]);

    const { data: profile, isLoading: profileLoading, error: profileError } = useQuery({
        queryKey: ["wholesale-portal-profile"],
        queryFn: api.wholesalePortalProfile,
        enabled: !!customer,
    });

    const { data: dashboard, isLoading: dashLoading } = useQuery({
        queryKey: ["wholesale-portal-dashboard"],
        queryFn: api.wholesalePortalDashboard,
        enabled: !!customer && !!profile,
    });

    const { data: orders = [] } = useQuery({
        queryKey: ["wholesale-portal-orders"],
        queryFn: api.wholesalePortalOrders,
        enabled: !!customer && !!profile,
    });

    useTour("wholesale-dashboard", wholesaleDashboardSteps);

    const filteredOrders = useMemo(() => {
        if (orderFilter === "active") {
            return orders.filter((o: any) =>
                (WHOLESALE_ACTIVE_ORDER_STATUSES as readonly string[]).includes(o.status),
            );
        }
        if (orderFilter === "delivered") {
            return orders.filter((o: any) => o.status === "delivered");
        }
        return orders;
    }, [orders, orderFilter]);

    if (authLoading || profileLoading || dashLoading) {
        return (
            <>
                <Navbar />
                <div
                    className="min-h-screen flex items-center justify-center pt-32"
                    style={{
                        backgroundImage:
                            "linear-gradient(rgba(0,0,0,0.72), rgba(0,0,0,0.72)), url('/images/login-bg.jpg')",
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        backgroundRepeat: "no-repeat",
                        backgroundAttachment: "fixed",
                    }}
                >
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#A1AB74]" />
                </div>
            </>
        );
    }

    if (profileError || !profile) {
        return (
            <>
                <Navbar />
                <div
                    className="min-h-screen flex items-center justify-center px-4 pt-32 pb-16"
                    style={{
                        backgroundImage:
                            "linear-gradient(rgba(0,0,0,0.72), rgba(0,0,0,0.72)), url('/images/login-bg.jpg')",
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        backgroundRepeat: "no-repeat",
                        backgroundAttachment: "fixed",
                    }}
                >
                    <div className="text-center max-w-md">
                        <h1 className="text-2xl font-bold text-white mb-4">Wholesale Portal</h1>
                        {!isWholesale ? (
                            <>
                                <p className="text-white/70 mb-6">
                                    Your account is not yet linked to a wholesale account. If you've submitted a
                                    wholesale application, please wait for admin approval.
                                </p>
                                <Link href="/wholesale" className="text-[#A1AB74] hover:underline">
                                    Apply for wholesale access
                                </Link>
                            </>
                        ) : (
                            <>
                                <p className="text-white/70 mb-6">
                                    Your wholesale account is pending approval. We'll notify you by email once it's been
                                    activated.
                                </p>
                                <Link href="/" className="text-[#A1AB74] hover:underline">
                                    Back to home
                                </Link>
                            </>
                        )}
                    </div>
                </div>
                <Footer />
            </>
        );
    }

    const counts = dashboard?.orderCounts || { total: orders.length, active: 0, delivered: 0 };
    const nextDelivery = dashboard?.nextDelivery;

    return (
        <TourProvider>
            <Navbar />
            <div
                className="min-h-screen pt-32 pb-16 px-4"
                style={{
                    backgroundImage:
                        "linear-gradient(rgba(0,0,0,0.72), rgba(0,0,0,0.72)), url('/images/login-bg.jpg')",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                    backgroundAttachment: "fixed",
                }}
            >
                <div className="max-w-4xl mx-auto">
                    <div
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
                        data-tour="wholesale-dashboard-header"
                    >
                        <div className="min-w-0">
                            <h1 className="text-2xl sm:text-3xl font-bold text-white truncate">
                                {profile.businessName}
                            </h1>
                            <p className="text-white/60 mt-1">Wholesale Portal</p>
                        </div>
                        <div className="flex gap-3 shrink-0">
                            <Link
                                href="/wholesale/portal/order"
                                className="px-5 sm:px-6 py-2.5 bg-[#A1AB74] hover:bg-[#8a9463] text-white font-semibold rounded-xl transition-colors text-sm sm:text-base"
                                data-tour="wholesale-new-order-btn"
                            >
                                New Order
                            </Link>
                            <button
                                onClick={() => {
                                    logout();
                                    navigate("/");
                                }}
                                className="px-4 py-2.5 bg-white/10 border border-white/10 text-white/80 hover:bg-white/20 hover:text-white rounded-xl transition-colors text-sm sm:text-base"
                            >
                                Log out
                            </button>
                        </div>
                    </div>

                    {/* Active status summary */}
                    <div
                        className="mb-6 rounded-xl border border-white/15 bg-white/95 text-slate-900 p-4 sm:p-5 shadow-lg"
                        data-tour="wholesale-active-summary"
                    >
                        <h2 className="text-lg font-semibold mb-3">Your orders at a glance</h2>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                            <div className="rounded-lg bg-slate-50 px-3 py-2">
                                <p className="text-[10px] uppercase tracking-wider text-slate-500">Active</p>
                                <p className="text-2xl font-bold text-[#6B8E23]">{counts.active}</p>
                            </div>
                            <div className="rounded-lg bg-slate-50 px-3 py-2">
                                <p className="text-[10px] uppercase tracking-wider text-slate-500">Total</p>
                                <p className="text-2xl font-bold">{counts.total}</p>
                            </div>
                            <div className="rounded-lg bg-slate-50 px-3 py-2">
                                <p className="text-[10px] uppercase tracking-wider text-slate-500">Delivered</p>
                                <p className="text-2xl font-bold">{counts.delivered}</p>
                            </div>
                            <div className="rounded-lg bg-slate-50 px-3 py-2">
                                <p className="text-[10px] uppercase tracking-wider text-slate-500">Balance due</p>
                                <p className="text-lg font-bold text-amber-800">
                                    {formatCents(dashboard?.outstandingBalanceCents || 0)}
                                </p>
                            </div>
                        </div>
                        {nextDelivery ? (
                            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#A1AB74]/30 bg-[#A1AB74]/10 px-3 py-2 text-sm">
                                <span>
                                    <strong>Next delivery:</strong>{" "}
                                    {nextDelivery.confirmedDeliveryDate
                                        ? new Date(nextDelivery.confirmedDeliveryDate + "T12:00:00").toLocaleDateString(
                                              "en-US",
                                              { weekday: "long", month: "short", day: "numeric" },
                                          )
                                        : "TBD"}{" "}
                                    · #{nextDelivery.orderNumber}
                                </span>
                                <Link
                                    href={`/wholesale/portal/order/${nextDelivery.id}`}
                                    className="text-[#6B8E23] font-medium hover:underline"
                                >
                                    View order →
                                </Link>
                            </div>
                        ) : (
                            <p className="text-sm text-slate-600">No upcoming deliveries scheduled yet.</p>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-8" data-tour="wholesale-business-info">
                        <div className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl p-4 sm:p-5">
                            <p className="text-white/60 text-xs uppercase tracking-wider mb-1">Contact</p>
                            <p className="text-white font-medium truncate">{profile.contactName || "—"}</p>
                            <p className="text-white/60 text-sm truncate">{profile.email}</p>
                        </div>
                        <div className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl p-4 sm:p-5">
                            <p className="text-white/60 text-xs uppercase tracking-wider mb-1">Delivery Method</p>
                            <p className="text-white font-medium capitalize">{profile.deliveryMethod}</p>
                        </div>
                        <div className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl p-4 sm:p-5">
                            <p className="text-white/60 text-xs uppercase tracking-wider mb-1">Active Orders</p>
                            <p className="text-white font-medium text-2xl">{counts.active}</p>
                        </div>
                    </div>

                    {(dashboard?.activeOrders || []).length > 0 && (
                        <div className="mb-8">
                            <h2 className="text-lg font-bold text-white mb-3">In progress</h2>
                            <div className="space-y-2">
                                {(dashboard?.activeOrders || []).slice(0, 5).map((order: any) => (
                                    <Link
                                        key={order.id}
                                        href={`/wholesale/portal/order/${order.id}`}
                                        className="block rounded-xl border border-white/10 bg-black/40 backdrop-blur-sm p-4 hover:bg-white/5 transition-colors"
                                    >
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <span className="text-white font-medium">
                                                #{order.orderNumber}
                                                {order.isRushOrder && (
                                                    <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-200">
                                                        RUSH
                                                    </span>
                                                )}
                                            </span>
                                            <span
                                                className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[order.status] || "bg-white/10 text-white"}`}
                                            >
                                                {formatWholesaleOrderStatus(order.status)}
                                            </span>
                                        </div>
                                        <div className="mt-1 flex flex-wrap gap-3 text-sm text-white/60">
                                            <span>{formatCents(order.subtotalCents)}</span>
                                            {order.paymentStatus && order.paymentStatus !== "paid" && (
                                                <span>
                                                    {WHOLESALE_PAYMENT_STATUS_LABELS[order.paymentStatus] ||
                                                        order.paymentStatus}
                                                </span>
                                            )}
                                            {order.confirmedDeliveryDate && (
                                                <span>
                                                    Delivery:{" "}
                                                    {new Date(
                                                        order.confirmedDeliveryDate + "T12:00:00",
                                                    ).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                                </span>
                                            )}
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    <div data-tour="wholesale-order-history">
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                            <h2 className="text-xl font-bold text-white">Order History</h2>
                            <div className="flex gap-1 rounded-lg bg-black/40 border border-white/10 p-0.5">
                                {(
                                    [
                                        { key: "active" as const, label: "Active" },
                                        { key: "delivered" as const, label: "Delivered" },
                                        { key: "all" as const, label: "All" },
                                    ] as const
                                ).map(({ key, label }) => (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => setOrderFilter(key)}
                                        className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                                            orderFilter === key
                                                ? "bg-[#A1AB74] text-white"
                                                : "text-white/70 hover:text-white"
                                        }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {filteredOrders.length === 0 ? (
                            <div className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl p-8 text-center">
                                <p className="text-white/60 mb-4">
                                    {orderFilter === "active" ? "No active orders." : "No orders in this view."}
                                </p>
                                <Link href="/wholesale/portal/order" className="text-[#A1AB74] hover:underline">
                                    Place an order →
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {filteredOrders.map((order: any) => (
                                    <div
                                        key={order.id}
                                        className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl p-4 sm:p-5 hover:bg-white/5 transition-colors"
                                    >
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                            <Link href={`/wholesale/portal/order/${order.id}`} className="min-w-0 flex-1">
                                                <div>
                                                    <span className="text-white font-medium">
                                                        #{order.orderNumber}
                                                        {order.isRushOrder && (
                                                            <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-200">
                                                                RUSH
                                                            </span>
                                                        )}
                                                    </span>
                                                    <span className="text-white/60 ml-3 text-sm">
                                                        {new Date(order.createdAt).toLocaleDateString("en-US", {
                                                            month: "short",
                                                            day: "numeric",
                                                            year: "numeric",
                                                        })}
                                                    </span>
                                                </div>
                                            </Link>
                                            <div className="flex items-center gap-2 shrink-0 flex-wrap">
                                                <span className="text-white/80 text-sm">
                                                    {formatCents(order.subtotalCents)}
                                                </span>
                                                {order.paymentStatus && (
                                                    <span className="text-white/50 text-xs">
                                                        {WHOLESALE_PAYMENT_STATUS_LABELS[order.paymentStatus] ||
                                                            order.paymentStatus}
                                                    </span>
                                                )}
                                                <span
                                                    className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[order.status] || "bg-white/10 text-white"}`}
                                                >
                                                    {formatWholesaleOrderStatus(order.status)}
                                                </span>
                                                <Link
                                                    href={`/wholesale/portal/order?reorder=${order.id}`}
                                                    className="text-xs text-[#A1AB74] hover:underline px-2 py-1"
                                                >
                                                    Reorder
                                                </Link>
                                            </div>
                                        </div>
                                        {(order.confirmedDeliveryDate || order.requestedDeliveryDate) && (
                                            <p className="text-white/60 text-sm mt-1">
                                                {order.confirmedDeliveryDate
                                                    ? `Confirmed: ${new Date(order.confirmedDeliveryDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                                                    : order.requestedDeliveryDate
                                                      ? `Requested: ${new Date(order.requestedDeliveryDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                                                      : null}
                                                {" · "}
                                                {order.deliveryMethod === "pickup" ? "Pickup" : "Delivery"}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <Footer />
        </TourProvider>
    );
}
