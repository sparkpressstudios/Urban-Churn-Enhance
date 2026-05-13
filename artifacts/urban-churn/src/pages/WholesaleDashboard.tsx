import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useCustomerAuth } from "@/components/CustomerAuthContext";
import { api } from "@/lib/api";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { TourProvider, useTour } from "@/lib/tour";
import { wholesaleDashboardSteps } from "@/lib/tour/tour-steps";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    pending_review: { label: "Pending Review", color: "bg-yellow-500/20 text-yellow-300" },
    confirmed: { label: "Confirmed", color: "bg-blue-500/20 text-blue-300" },
    in_production: { label: "In Production", color: "bg-purple-500/20 text-purple-300" },
    ready: { label: "Ready", color: "bg-green-500/20 text-green-300" },
    delivered: { label: "Delivered", color: "bg-emerald-500/20 text-emerald-300" },
    cancelled: { label: "Cancelled", color: "bg-red-500/20 text-red-300" },
};

export default function WholesaleDashboard() {
    const [, navigate] = useLocation();
    const { customer, isLoading: authLoading, isWholesale, logout } = useCustomerAuth();

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

    const { data: orders = [] } = useQuery({
        queryKey: ["wholesale-portal-orders"],
        queryFn: api.wholesalePortalOrders,
        enabled: !!customer && !!profile,
    });

    useTour("wholesale-dashboard", wholesaleDashboardSteps);

    if (authLoading || profileLoading) {
        return (
            <>
                <Navbar />
                <div
                    className="min-h-screen flex items-center justify-center pt-32"
                    style={{ backgroundImage: "linear-gradient(rgba(0,0,0,0.72), rgba(0,0,0,0.72)), url('/images/login-bg.jpg')", backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat", backgroundAttachment: "fixed" }}
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
                    style={{ backgroundImage: "linear-gradient(rgba(0,0,0,0.72), rgba(0,0,0,0.72)), url('/images/login-bg.jpg')", backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat", backgroundAttachment: "fixed" }}
                >
                    <div className="text-center max-w-md">
                        <h1 className="text-2xl font-bold text-white mb-4">Wholesale Portal</h1>
                        {!isWholesale ? (
                            <>
                                <p className="text-white/60 mb-6">
                                    Your account is not yet linked to a wholesale account.
                                    If you've submitted a wholesale application, please wait for admin approval.
                                </p>
                                <Link href="/wholesale" className="text-[#A1AB74] hover:underline">
                                    Apply for wholesale access
                                </Link>
                            </>
                        ) : (
                            <>
                                <p className="text-white/60 mb-6">
                                    Your wholesale account is pending approval.
                                    We'll notify you by email once it's been activated.
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

    return (
        <TourProvider>
            <Navbar />
            <div
                className="min-h-screen pt-32 pb-16 px-4"
                style={{ backgroundImage: "linear-gradient(rgba(0,0,0,0.72), rgba(0,0,0,0.72)), url('/images/login-bg.jpg')", backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat", backgroundAttachment: "fixed" }}
            >
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8" data-tour="wholesale-dashboard-header">
                        <div className="min-w-0">
                            <h1 className="text-2xl sm:text-3xl font-bold text-white truncate">{profile.businessName}</h1>
                            <p className="text-white/50 mt-1">Wholesale Portal</p>
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
                                onClick={() => { logout(); navigate("/"); }}
                                className="px-4 py-2.5 bg-white/10 border border-white/10 text-white/70 hover:bg-white/20 hover:text-white rounded-xl transition-colors text-sm sm:text-base"
                            >
                                Log out
                            </button>
                        </div>
                    </div>

                    {/* Account Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-8" data-tour="wholesale-business-info">
                        <div className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl p-4 sm:p-5">
                            <p className="text-white/50 text-xs uppercase tracking-wider mb-1">Contact</p>
                            <p className="text-white font-medium truncate">{profile.contactName || "—"}</p>
                            <p className="text-white/50 text-sm truncate">{profile.email}</p>
                        </div>
                        <div className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl p-4 sm:p-5">
                            <p className="text-white/50 text-xs uppercase tracking-wider mb-1">Delivery Method</p>
                            <p className="text-white font-medium capitalize">{profile.deliveryMethod}</p>
                        </div>
                        <div className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl p-4 sm:p-5">
                            <p className="text-white/50 text-xs uppercase tracking-wider mb-1">Total Orders</p>
                            <p className="text-white font-medium text-2xl">{orders.length}</p>
                        </div>
                    </div>

                    {/* Orders */}
                    <div data-tour="wholesale-order-history">
                    <h2 className="text-xl font-bold text-white mb-4">Order History</h2>
                    {orders.length === 0 ? (
                        <div className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl p-8 text-center">
                            <p className="text-white/50 mb-4">No orders yet.</p>
                            <Link
                                href="/wholesale/portal/order"
                                className="text-[#A1AB74] hover:underline"
                            >
                                Place your first order →
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {orders.map((order: any) => {
                                const status = STATUS_LABELS[order.status] || { label: order.status, color: "bg-white/10 text-gray-700" };
                                return (
                                    <Link
                                        key={order.id}
                                        href={`/wholesale/portal/order/${order.id}`}
                                        className="block bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl p-4 sm:p-5 hover:bg-white/10 transition-colors"
                                    >
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                            <div>
                                                <span className="text-white font-medium">#{order.orderNumber}</span>
                                                <span className="text-white/50 ml-3 text-sm">
                                                    {new Date(order.createdAt).toLocaleDateString("en-US", {
                                                        month: "short",
                                                        day: "numeric",
                                                        year: "numeric",
                                                    })}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-white/70 text-sm">
                                                    ${(order.subtotalCents / 100).toFixed(2)}
                                                </span>
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
                                                    {status.label}
                                                </span>
                                            </div>
                                        </div>
                                        {order.requestedDeliveryDate && (
                                            <p className="text-white/50 text-sm mt-1">
                                                Requested: {new Date(order.requestedDeliveryDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                                {" · "}{order.deliveryMethod === "pickup" ? "Pickup" : "Delivery"}
                                            </p>
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                    </div>
                </div>
            </div>
            <Footer />
        </TourProvider>
    );
}
