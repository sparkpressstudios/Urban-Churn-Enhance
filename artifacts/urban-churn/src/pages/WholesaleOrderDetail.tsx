import { useEffect } from "react";
import { Link, useLocation, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useCustomerAuth } from "@/components/CustomerAuthContext";
import { api } from "@/lib/api";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CreditCard, Truck } from "lucide-react";
import { TourProvider, useTour } from "@/lib/tour";
import { wholesaleOrderDetailSteps } from "@/lib/tour/tour-steps";

import { WHOLESALE_ORDER_STATUS_LABELS } from "@/lib/wholesale-constants";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    pending_review: { label: WHOLESALE_ORDER_STATUS_LABELS.pending_review, color: "bg-yellow-500/20 text-yellow-300" },
    confirmed: { label: WHOLESALE_ORDER_STATUS_LABELS.confirmed, color: "bg-blue-500/20 text-blue-300" },
    in_production: { label: WHOLESALE_ORDER_STATUS_LABELS.in_production, color: "bg-purple-500/20 text-purple-300" },
    ready: { label: WHOLESALE_ORDER_STATUS_LABELS.ready, color: "bg-green-500/20 text-green-300" },
    delivered: { label: WHOLESALE_ORDER_STATUS_LABELS.delivered, color: "bg-emerald-500/20 text-emerald-300" },
    cancelled: { label: WHOLESALE_ORDER_STATUS_LABELS.cancelled, color: "bg-red-500/20 text-red-300" },
};

const PAYMENT_LABELS: Record<string, { label: string; color: string }> = {
    unpaid: { label: "Payment Pending", color: "bg-yellow-500/20 text-yellow-300" },
    invoiced: { label: "Invoice Sent", color: "bg-blue-500/20 text-blue-300" },
    partial: { label: "Partially Paid", color: "bg-orange-500/20 text-orange-300" },
    paid: { label: "Paid", color: "bg-green-500/20 text-green-300" },
};

export default function WholesaleOrderDetail() {
    const [, navigate] = useLocation();
    const params = useParams<{ id: string }>();
    const { customer, isLoading: authLoading } = useCustomerAuth();

    useEffect(() => {
        if (!authLoading && !customer) {
            navigate("/account/login");
        }
    }, [authLoading, customer, navigate]);

    const orderId = Number(params.id);

    const { data: order, isLoading } = useQuery({
        queryKey: ["wholesale-portal-order", orderId],
        queryFn: () => api.wholesalePortalOrder(orderId),
        enabled: !!customer && !!orderId,
    });

    if (authLoading || isLoading) {
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

    if (!order) {
        return (
            <>
                <Navbar />
                <div
                    className="min-h-screen flex items-center justify-center pt-32 pb-16"
                    style={{ backgroundImage: "linear-gradient(rgba(0,0,0,0.72), rgba(0,0,0,0.72)), url('/images/login-bg.jpg')", backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat", backgroundAttachment: "fixed" }}
                >
                    <div className="text-center">
                        <p className="text-gray-500 mb-4">Order not found</p>
                        <Link href="/wholesale/portal" className="text-[#A1AB74] hover:underline">
                            Back to Portal
                        </Link>
                    </div>
                </div>
                <Footer />
            </>
        );
    }

    const status = STATUS_LABELS[order.status] || { label: order.status, color: "bg-white/10 text-gray-700" };

    useTour("wholesale-order-detail", wholesaleOrderDetailSteps);

    return (
        <TourProvider>
            <Navbar />
            <div
                className="min-h-screen pt-32 pb-16 px-4"
                style={{ backgroundImage: "linear-gradient(rgba(0,0,0,0.72), rgba(0,0,0,0.72)), url('/images/login-bg.jpg')", backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat", backgroundAttachment: "fixed" }}
            >
                <div className="max-w-3xl mx-auto">
                    <Link href="/wholesale/portal" className="text-white/50 hover:text-white transition-colors text-sm mb-4 inline-block">
                        ← Back to Portal
                    </Link>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6" data-tour="wholesale-order-detail-header">
                        <h1 className="text-xl sm:text-2xl font-bold text-white">Order #{order.orderNumber}</h1>
                        <div className="flex items-center gap-2">
                            {order.isRushOrder && (
                                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-200">Rush Order</span>
                            )}
                            <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${status.color} w-fit`}>
                                {status.label}
                            </span>
                            <Link
                                href={`/wholesale/portal/order?reorder=${order.id}`}
                                className="text-sm text-[#A1AB74] hover:underline"
                            >
                                Reorder
                            </Link>
                        </div>
                    </div>

                    {/* Order Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-8" data-tour="wholesale-order-status">
                        <div className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl p-4 sm:p-5">
                            <p className="text-white/50 text-xs uppercase tracking-wider mb-1">Placed</p>
                            <p className="text-white">
                                {new Date(order.createdAt).toLocaleDateString("en-US", {
                                    weekday: "long",
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                })}
                            </p>
                        </div>
                        <div className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl p-4 sm:p-5">
                            <p className="text-white/50 text-xs uppercase tracking-wider mb-1">
                                {order.deliveryMethod === "pickup" ? "Pickup" : "Delivery"} Date
                            </p>
                            <p className="text-white">
                                {order.confirmedDeliveryDate
                                    ? new Date(order.confirmedDeliveryDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
                                    : order.requestedDeliveryDate
                                        ? `Requested: ${new Date(order.requestedDeliveryDate + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric" })}`
                                        : "To be confirmed"}
                            </p>
                        </div>
                    </div>

                    {/* Payment + Delivery status row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-8" data-tour="wholesale-order-delivery">
                        {order.paymentStatus && (
                            <div className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl p-4 sm:p-5">
                                <div className="flex items-center gap-2 mb-1">
                                    <CreditCard className="h-4 w-4 text-white/40" />
                                    <p className="text-white/50 text-xs uppercase tracking-wider">Payment</p>
                                </div>
                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${(PAYMENT_LABELS[order.paymentStatus] || PAYMENT_LABELS.unpaid).color}`}>
                                    {(PAYMENT_LABELS[order.paymentStatus] || PAYMENT_LABELS.unpaid).label}
                                </span>
                                {order.paidAt && (
                                    <p className="text-white/40 text-xs mt-1">
                                        Paid {new Date(order.paidAt).toLocaleDateString()}
                                    </p>
                                )}
                            </div>
                        )}
                        {order.delivery && (
                            <div className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl p-4 sm:p-5">
                                <div className="flex items-center gap-2 mb-1">
                                    <Truck className="h-4 w-4 text-white/40" />
                                    <p className="text-white/50 text-xs uppercase tracking-wider">Delivery</p>
                                </div>
                                {order.delivery.stopStatus === "completed" ? (
                                    <p className="text-emerald-400 text-sm font-medium">
                                        Delivered {order.delivery.deliveredAt
                                            ? new Date(order.delivery.deliveredAt).toLocaleDateString()
                                            : ""}
                                    </p>
                                ) : (
                                    <p className="text-white/70 text-sm">
                                        Scheduled {new Date(order.delivery.scheduledDate + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric" })}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Items */}
                    <div data-tour="wholesale-order-items">
                    <h2 className="text-lg font-semibold text-white mb-3">Items</h2>
                    <div className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden mb-8">
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[20rem]">
                                <thead>
                                    <tr className="border-b border-white/10">
                                        <th className="text-left text-white/50 text-xs uppercase tracking-wider px-3 sm:px-5 py-3">Item</th>
                                        <th className="text-center text-white/50 text-xs uppercase tracking-wider px-2 sm:px-3 py-3">Qty</th>
                                        <th className="text-right text-white/50 text-xs uppercase tracking-wider px-3 sm:px-5 py-3">Price</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {order.items?.map((item: any) => (
                                        <tr key={item.id} className="border-b border-white/5 last:border-0">
                                            <td className="px-3 sm:px-5 py-3">
                                                <p className="text-white text-sm sm:text-base">{item.productDescription}</p>
                                                {item.notes && <p className="text-white/40 text-sm">{item.notes}</p>}
                                                {!item.matched && (
                                                    <span className="text-yellow-400/60 text-xs">Custom request</span>
                                                )}
                                            </td>
                                            <td className="text-center text-white/70 px-2 sm:px-3 py-3">{item.quantity}</td>
                                            <td className="text-right text-white/70 px-3 sm:px-5 py-3">
                                                {item.unitPriceCents > 0
                                                    ? `$${((item.unitPriceCents * item.quantity) / 100).toFixed(2)}`
                                                    : "TBD"}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="border-t border-white/10">
                                        <td colSpan={2} className="text-right text-white font-semibold px-3 sm:px-5 py-4">Subtotal</td>
                                        <td className="text-right text-white font-semibold px-3 sm:px-5 py-4">
                                            ${(order.subtotalCents / 100).toFixed(2)}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                    </div>
                </div>
            </div>
            <Footer />
        </TourProvider>
    );
}
