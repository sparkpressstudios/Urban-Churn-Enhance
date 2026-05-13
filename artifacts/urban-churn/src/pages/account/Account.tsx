import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useCustomerAuth } from "@/components/CustomerAuthContext";
import { api } from "@/lib/api";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { TourProvider, useTour } from "@/lib/tour";
import { customerAccountSteps } from "@/lib/tour/tour-steps";

type Tab = "orders" | "events" | "ice-cream" | "history" | "profile";

export default function CustomerAccount() {
    const [, navigate] = useLocation();
    const { customer, isLoading: authLoading, logout, isWholesale } = useCustomerAuth();
    const queryClient = useQueryClient();
    const [tab, setTab] = useState<Tab>("orders");
    const [editProfile, setEditProfile] = useState(false);
    const [profileForm, setProfileForm] = useState({
        firstName: "", lastName: "", phone: "", address: "", city: "", state: "", zip: "",
    });
    const [showChangePassword, setShowChangePassword] = useState(false);
    const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
    const [passwordError, setPasswordError] = useState("");
    const [passwordSuccess, setPasswordSuccess] = useState(false);
    const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

    // Fetch full profile
    const { data: profile } = useQuery({
        queryKey: ["customer", "me"],
        queryFn: () => api.customerMe().then((d: any) => d.customer),
        enabled: !!customer,
    });

    // Fetch bakery orders
    const { data: bakeryOrders = [] } = useQuery({
        queryKey: ["customer", "orders"],
        queryFn: () => api.customerOrders(),
        enabled: !!customer,
    });

    // Fetch event orders
    const { data: eventOrders = [] } = useQuery({
        queryKey: ["customer", "event-orders"],
        queryFn: () => api.customerEventOrders(),
        enabled: !!customer,
    });

    // Fetch ice cream orders
    const { data: iceCreamOrders = [] } = useQuery({
        queryKey: ["customer", "ice-cream-orders"],
        queryFn: () => api.customerIceCreamOrders(),
        enabled: !!customer,
    });

    // Fetch WooCommerce order history (past orders from old site)
    const { data: wooOrders = [] } = useQuery({
        queryKey: ["customer", "woo-orders"],
        queryFn: () => api.customerWooOrders(),
        enabled: !!customer,
    });

    // Fetch rewards / loyalty info
    const { data: rewards } = useQuery({
        queryKey: ["customer", "rewards"],
        queryFn: () => api.customerRewards(),
        enabled: !!customer,
    });

    const updateProfile = useMutation({
        mutationFn: (data: any) => api.customerUpdateProfile(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["customer", "me"] });
            setEditProfile(false);
        },
    });

    const changePassword = useMutation({
        mutationFn: (data: { currentPassword: string; newPassword: string }) =>
            api.customerChangePassword(data.currentPassword, data.newPassword),
        onSuccess: () => {
            setPasswordSuccess(true);
            setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
            setPasswordError("");
            setTimeout(() => {
                setShowChangePassword(false);
                setPasswordSuccess(false);
            }, 2000);
        },
        onError: (err: any) => {
            setPasswordError(err.message || "Failed to change password");
        },
    });

    const handleLogout = async () => {
        await logout();
        navigate("/");
    };

    // If not authenticated, redirect to login
    useEffect(() => {
        if (!authLoading && !customer) {
            navigate("/account/login");
        }
    }, [authLoading, customer, navigate]);

    if (!authLoading && !customer) {
        return null;
    }

    if (authLoading) {
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

    const startEdit = () => {
        if (profile) {
            setProfileForm({
                firstName: profile.firstName || "",
                lastName: profile.lastName || "",
                phone: profile.phone || "",
                address: profile.address || "",
                city: profile.city || "",
                state: profile.state || "",
                zip: profile.zip || "",
            });
        }
        setEditProfile(true);
    };

    const statusColor: Record<string, string> = {
        pending: "bg-yellow-500/20 text-yellow-300",
        confirmed: "bg-blue-500/20 text-blue-300",
        in_progress: "bg-purple-500/20 text-purple-300",
        ready: "bg-emerald-500/20 text-emerald-300",
        completed: "bg-green-500/20 text-green-300",
        picked_up: "bg-green-500/20 text-green-300",
        cancelled: "bg-red-500/20 text-red-300",
        refunded: "bg-orange-500/20 text-orange-300",
        pending_review: "bg-yellow-500/20 text-yellow-300",
    };

    const statusLabel: Record<string, string> = {
        pending: "Pending",
        confirmed: "Confirmed",
        in_progress: "In Progress",
        ready: "Ready for Pickup",
        completed: "Completed",
        picked_up: "Picked Up",
        cancelled: "Cancelled",
        refunded: "Refunded",
        pending_review: "Pending Review",
    };

    const handleChangePassword = (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordError("");
        if (passwordForm.newPassword.length < 8) {
            setPasswordError("New password must be at least 8 characters");
            return;
        }
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setPasswordError("Passwords do not match");
            return;
        }
        changePassword.mutate({
            currentPassword: passwordForm.currentPassword,
            newPassword: passwordForm.newPassword,
        });
    };

    const tabs: { key: Tab; label: string }[] = [
        { key: "orders", label: "Bakery Orders" },
        { key: "ice-cream", label: "Ice Cream" },
        { key: "events", label: "Events" },
        ...(wooOrders.length > 0 ? [{ key: "history" as Tab, label: "Past Orders" }] : []),
        { key: "profile", label: "Profile" },
    ];

    useTour("customer-account", customerAccountSteps);

    return (
        <TourProvider>
            <Navbar />
            <div
                className="min-h-screen pt-32 pb-16 px-4"
                style={{ backgroundImage: "linear-gradient(rgba(0,0,0,0.72), rgba(0,0,0,0.72)), url('/images/login-bg.jpg')", backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat", backgroundAttachment: "fixed" }}
            >
                <div className="max-w-3xl mx-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between gap-4 mb-8" data-tour="customer-account-header">
                        <div className="min-w-0">
                            <h1 className="text-xl sm:text-2xl font-bold text-white truncate">
                                Hi, {customer?.firstName || customer?.email?.split("@")[0]}
                            </h1>
                            <p className="text-white/50 text-sm truncate">{customer?.email}</p>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="text-white/50 hover:text-white text-sm transition-colors shrink-0"
                        >
                            Sign Out
                        </button>
                    </div>

                    {/* Quick Actions */}
                    <div className={`grid grid-cols-2 gap-3 mb-6 ${isWholesale ? "sm:grid-cols-4" : "sm:grid-cols-3"}`} data-tour="customer-quick-actions">
                        <Link
                            href="/bakery"
                            className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors group"
                        >
                            <span className="text-lg mb-1 block">🎂</span>
                            <span className="text-white text-sm font-medium group-hover:text-[#A1AB74] transition-colors">Order a Cake</span>
                        </Link>
                        <Link
                            href="/pre-order"
                            className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors group"
                        >
                            <span className="text-lg mb-1 block">🍦</span>
                            <span className="text-white text-sm font-medium group-hover:text-[#A1AB74] transition-colors">Pre-Order Scoops</span>
                        </Link>
                        <Link
                            href="/events"
                            className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors group"
                        >
                            <span className="text-lg mb-1 block">🎉</span>
                            <span className="text-white text-sm font-medium group-hover:text-[#A1AB74] transition-colors">Browse Events</span>
                        </Link>
                        {isWholesale && (
                            <Link
                                href="/wholesale/portal"
                                className="bg-[#A1AB74]/10 border border-[#A1AB74]/20 rounded-xl p-4 hover:bg-[#A1AB74]/15 transition-colors group"
                            >
                                <span className="text-lg mb-1 block">📦</span>
                                <span className="text-[#A1AB74] text-sm font-medium">Wholesale Portal</span>
                            </Link>
                        )}
                    </div>

                    {/* Rewards Card */}
                    {rewards?.enrolled && (
                        <div className="bg-gradient-to-r from-[#A1AB74]/20 to-[#8a9360]/20 backdrop-blur-sm border border-[#A1AB74]/30 rounded-2xl p-5 mb-6">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">⭐</span>
                                    <h3 className="text-white font-semibold text-sm">Rewards</h3>
                                </div>
                                <span className="text-[#A1AB74] text-xs font-medium">Member</span>
                            </div>
                            <div className="flex items-end justify-between">
                                <div>
                                    <p className="text-3xl font-bold text-white">{rewards.balance?.toLocaleString() ?? 0}</p>
                                    <p className="text-white/50 text-xs mt-0.5">
                                        {rewards.terminology?.other || "points"} available
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-white/40 text-xs">Lifetime</p>
                                    <p className="text-white/70 text-sm font-medium">{rewards.lifetimePoints?.toLocaleString() ?? 0} {rewards.terminology?.other || "points"}</p>
                                </div>
                            </div>
                            {rewards.accrualRules?.length > 0 && (
                                <p className="text-white/40 text-xs mt-3 pt-3 border-t border-white/10">
                                    Earn {rewards.terminology?.other || "points"} with every purchase
                                </p>
                            )}
                        </div>
                    )}

                    {/* Tabs */}
                    <div className="flex gap-1 mb-6 bg-black/30 backdrop-blur-sm rounded-xl p-1 overflow-x-auto border border-white/10 scrollbar-none" data-tour="customer-account-tabs">
                        {tabs.map((t) => (
                            <button
                                key={t.key}
                                onClick={() => setTab(t.key)}
                                className={`flex-1 min-w-[4.5rem] whitespace-nowrap py-2.5 px-2 sm:px-3 rounded-lg text-xs sm:text-sm font-medium transition-colors ${tab === t.key ? "bg-[#A1AB74] text-white" : "text-white/50 hover:text-white"}`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {/* ── Bakery Orders Tab ── */}
                    {tab === "orders" && (
                        <div className="space-y-3">
                            {bakeryOrders.length === 0 ? (
                                <div className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-2xl p-8 sm:p-12 text-center">
                                    <p className="text-white/50 mb-4">No bakery orders yet</p>
                                    <Link
                                        href="/bakery"
                                        className="inline-block bg-[#A1AB74] hover:bg-[#8a9360] text-white font-bold py-2.5 px-6 rounded-xl transition-colors text-sm"
                                    >
                                        Order from the Bakery
                                    </Link>
                                </div>
                            ) : (
                                bakeryOrders.map((order: any) => {
                                    const uid = `bakery-${order.id}`;
                                    const isExpanded = expandedOrder === uid;
                                    const details = order.orderDetails as any;
                                    const addOns = order.addOns as any;
                                    const hasAddOns = addOns && typeof addOns === "object" && (Array.isArray(addOns) ? addOns.length > 0 : Object.keys(addOns).length > 0);
                                    return (
                                        <div
                                            key={uid}
                                            className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden cursor-pointer transition-colors hover:bg-white/5"
                                            onClick={() => setExpandedOrder(isExpanded ? null : uid)}
                                        >
                                            {/* Order Header */}
                                            <div className="p-4 sm:p-5">
                                                <div className="flex items-start justify-between mb-2">
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2 mb-0.5">
                                                            <p className="text-white font-semibold">{order.orderType}</p>
                                                        </div>
                                                        <p className="text-white/40 text-xs font-mono">Order #{order.orderNumber}</p>
                                                    </div>
                                                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ml-2 ${statusColor[order.status] || "bg-gray-500/20 text-gray-300"}`}>
                                                        {statusLabel[order.status] || order.status}
                                                    </span>
                                                </div>

                                                {/* Key details grid */}
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                                                    <div>
                                                        <p className="text-white/40 text-[10px] uppercase tracking-wider">Pickup Date</p>
                                                        <p className="text-white text-sm font-medium">{order.pickupDate}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-white/40 text-[10px] uppercase tracking-wider">Pickup Time</p>
                                                        <p className="text-white text-sm font-medium">{order.pickupTime}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-white/40 text-[10px] uppercase tracking-wider">Total</p>
                                                        <p className="text-white text-sm font-medium">${(order.totalPriceCents / 100).toFixed(2)}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-white/40 text-[10px] uppercase tracking-wider">Ordered</p>
                                                        <p className="text-white text-sm font-medium">{new Date(order.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                                                    </div>
                                                </div>
                                                {order.locationName && (
                                                    <div className="mt-2">
                                                        <p className="text-white/40 text-xs">📍 {order.locationName}</p>
                                                    </div>
                                                )}

                                                <div className="flex items-center justify-end mt-2">
                                                    <span className="text-white/30 text-xs">{isExpanded ? "Hide details ▲" : "View details ▼"}</span>
                                                </div>
                                            </div>

                                            {/* Expanded Details */}
                                            {isExpanded && (
                                                <div className="border-t border-white/10 p-4 sm:p-5 space-y-4 bg-white/[0.02]" onClick={(e) => e.stopPropagation()}>
                                                    {details && typeof details === "object" && Object.keys(details).length > 0 && (
                                                        <div>
                                                            <p className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-2">Order Details</p>
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                                {Object.entries(details).map(([key, value]) => (
                                                                    <div key={key} className="flex justify-between py-1 border-b border-white/5">
                                                                        <span className="text-white/40 text-xs capitalize">{key.replace(/([A-Z])/g, " $1").replace(/_/g, " ")}</span>
                                                                        <span className="text-white/80 text-xs font-medium text-right ml-2">{String(value)}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {hasAddOns && (
                                                        <div>
                                                            <p className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-2">Add-Ons</p>
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {Array.isArray(addOns)
                                                                    ? addOns.map((a: any, i: number) => (
                                                                        <span key={i} className="inline-block bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white/70">
                                                                            {typeof a === "string" ? a : a.name || JSON.stringify(a)}
                                                                        </span>
                                                                    ))
                                                                    : Object.entries(addOns).map(([key, value]) => (
                                                                        <span key={key} className="inline-block bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white/70">
                                                                            <span className="text-white/40 capitalize">{key.replace(/_/g, " ")}:</span> {String(value)}
                                                                        </span>
                                                                    ))
                                                                }
                                                            </div>
                                                        </div>
                                                    )}
                                                    {order.specialRequests && (
                                                        <div>
                                                            <p className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-1">Special Requests</p>
                                                            <p className="text-white/70 text-sm bg-white/5 rounded-lg p-3 italic">{order.specialRequests}</p>
                                                        </div>
                                                    )}
                                                    {order.inspirationPhotoUrl && (
                                                        <div>
                                                            <p className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-2">Inspiration Photo</p>
                                                            <img src={order.inspirationPhotoUrl} alt="Inspiration" className="w-40 h-40 object-cover rounded-xl border border-white/10" />
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            {!isExpanded && order.specialRequests && (
                                                <div className="px-4 sm:px-5 pb-3">
                                                    <p className="text-white/40 text-xs italic truncate">{order.specialRequests}</p>
                                                </div>
                                            )}
                                        </div>
                                    );
                                }))
                            }
                        </div>
                    )}

                    {/* ── Ice Cream Orders Tab ── */}
                    {tab === "ice-cream" && (
                        <div className="space-y-3">
                            {iceCreamOrders.length === 0 ? (
                                <div className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-2xl p-8 sm:p-12 text-center">
                                    <p className="text-white/50 mb-4">No ice cream orders yet</p>
                                    <Link
                                        href="/pre-order"
                                        className="inline-block bg-[#A1AB74] hover:bg-[#8a9360] text-white font-bold py-2.5 px-6 rounded-xl transition-colors text-sm"
                                    >
                                        Pre-Order Ice Cream
                                    </Link>
                                </div>
                            ) : (
                                iceCreamOrders.map((order: any) => {
                                    const uid = `ic-${order.id}`;
                                    const isExpanded = expandedOrder === uid;
                                    const totalItems = order.items?.reduce((sum: number, it: any) => sum + it.quantity, 0) || 0;
                                    const pickedUpItems = order.items?.reduce((sum: number, it: any) => sum + (it.pickedUpQuantity || 0), 0) || 0;
                                    return (
                                        <div
                                            key={uid}
                                            className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden cursor-pointer transition-colors hover:bg-white/5"
                                            onClick={() => setExpandedOrder(isExpanded ? null : uid)}
                                        >
                                            <div className="p-4 sm:p-5">
                                                <div className="flex items-start justify-between mb-2">
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2 mb-0.5">
                                                            <p className="text-white font-semibold">Ice Cream Pre-Order</p>
                                                        </div>
                                                        <p className="text-white/40 text-xs font-mono">Order #{order.orderNumber}</p>
                                                    </div>
                                                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ml-2 ${statusColor[order.status] || "bg-gray-500/20 text-gray-300"}`}>
                                                        {statusLabel[order.status] || order.status}
                                                    </span>
                                                </div>

                                                {/* Key details grid */}
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                                                    <div>
                                                        <p className="text-white/40 text-[10px] uppercase tracking-wider">Location</p>
                                                        <p className="text-white text-sm font-medium">{order.locationName}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-white/40 text-[10px] uppercase tracking-wider">Items</p>
                                                        <p className="text-white text-sm font-medium">{totalItems} {totalItems === 1 ? "item" : "items"}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-white/40 text-[10px] uppercase tracking-wider">Total</p>
                                                        <p className="text-white text-sm font-medium">${(order.totalCents / 100).toFixed(2)}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-white/40 text-[10px] uppercase tracking-wider">Ordered</p>
                                                        <p className="text-white text-sm font-medium">{new Date(order.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                                                    </div>
                                                </div>

                                                {/* Pickup progress bar */}
                                                {totalItems > 0 && (order.status === "partially_picked_up" || order.status === "picked_up" || pickedUpItems > 0) && (
                                                    <div className="mt-3">
                                                        <div className="flex justify-between text-[10px] text-white/40 mb-1">
                                                            <span>Pickup progress</span>
                                                            <span>{pickedUpItems}/{totalItems} picked up</span>
                                                        </div>
                                                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                            <div className="h-full bg-[#A1AB74] rounded-full transition-all" style={{ width: `${(pickedUpItems / totalItems) * 100}%` }} />
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="flex items-center justify-end mt-2">
                                                    <span className="text-white/30 text-xs">{isExpanded ? "Hide details ▲" : "View details ▼"}</span>
                                                </div>
                                            </div>

                                            {/* Expanded Details */}
                                            {isExpanded && (
                                                <div className="border-t border-white/10 p-4 sm:p-5 space-y-4 bg-white/[0.02]" onClick={(e) => e.stopPropagation()}>
                                                    {order.items && order.items.length > 0 && (
                                                        <div>
                                                            <p className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-2">Items</p>
                                                            <div className="space-y-2">
                                                                {order.items.map((item: any, i: number) => (
                                                                    <div key={i} className="flex items-center justify-between p-2.5 bg-white/5 rounded-lg border border-white/10">
                                                                        <div className="min-w-0">
                                                                            <p className="text-white/80 text-sm font-medium">{item.quantity}x {item.flavourName}</p>
                                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                                <span className="text-white/40 text-xs">{item.sizeName}</span>
                                                                                {item.pickupDate && (
                                                                                    <span className="text-white/40 text-xs">Pickup: {new Date(item.pickupDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                        <div className="text-right shrink-0 ml-2">
                                                                            <p className="text-white/60 text-sm">${(item.priceCents / 100).toFixed(2)}</p>
                                                                            {item.pickedUpQuantity > 0 && (
                                                                                <span className="text-[10px] text-green-400">✓ Picked up</span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {order.discountCents > 0 && (
                                                        <div className="flex justify-between text-sm">
                                                            <span className="text-green-400/70">Discount Applied</span>
                                                            <span className="text-green-400/70">-${(order.discountCents / 100).toFixed(2)}</span>
                                                        </div>
                                                    )}
                                                    {order.notes && (
                                                        <div>
                                                            <p className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-1">Notes</p>
                                                            <p className="text-white/70 text-sm bg-white/5 rounded-lg p-3 italic">{order.notes}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                }))
                            }
                        </div>
                    )}

                    {/* ── Events Tab ── */}
                    {tab === "events" && (
                        <div className="space-y-3">
                            {eventOrders.length === 0 ? (
                                <div className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-2xl p-8 sm:p-12 text-center">
                                    <p className="text-white/50 mb-4">No event tickets yet</p>
                                    <Link
                                        href="/events"
                                        className="inline-block bg-[#A1AB74] hover:bg-[#8a9360] text-white font-bold py-2.5 px-6 rounded-xl transition-colors text-sm"
                                    >
                                        Browse Events
                                    </Link>
                                </div>
                            ) : (
                                eventOrders.map((order: any) => {
                                    const uid = `event-${order.id}`;
                                    const isExpanded = expandedOrder === uid;
                                    return (
                                        <div
                                            key={order.id}
                                            className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl p-4 sm:p-5 cursor-pointer transition-colors hover:bg-white/10"
                                            onClick={() => setExpandedOrder(isExpanded ? null : uid)}
                                        >
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="min-w-0">
                                                    <p className="text-white font-medium">{order.eventTitle}</p>
                                                    <p className="text-white/50 text-xs mt-0.5">#{order.orderNumber}</p>
                                                </div>
                                                <span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ml-2 ${statusColor[order.status] || "bg-gray-500/20 text-gray-300"}`}>
                                                    {statusLabel[order.status] || order.status}
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/50">
                                                <span>{new Date(order.eventDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                                                {order.venueName && <span>{order.venueName}</span>}
                                                <span>{order.ticketCount} {order.ticketCount === 1 ? "ticket" : "tickets"}</span>
                                                <span>${(order.totalCents / 100).toFixed(2)}</span>
                                                <span className="ml-auto text-white/40">{isExpanded ? "▲" : "▼"}</span>
                                            </div>
                                            {isExpanded && (
                                                <div className="mt-4 pt-4 border-t border-white/10 space-y-3" onClick={(e) => e.stopPropagation()}>
                                                    {order.tickets?.length > 0 && (
                                                        <div>
                                                            <p className="text-white/50 text-xs font-medium mb-2">Your Tickets</p>
                                                            <div className="space-y-2">
                                                                {order.tickets.map((ticket: any) => (
                                                                    <div key={ticket.id} className="flex items-center justify-between p-2.5 bg-white/5 rounded-lg border border-white/10">
                                                                        <div>
                                                                            <p className="text-white font-mono text-sm font-medium tracking-wide">{ticket.ticketCode}</p>
                                                                            {ticket.attendeeName && (
                                                                                <p className="text-white/40 text-xs mt-0.5">{ticket.attendeeName}</p>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex items-center gap-2">
                                                                            {ticket.checkedIn && (
                                                                                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-500/20 text-green-300">
                                                                                    ✓ Checked In
                                                                                </span>
                                                                            )}
                                                                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ticket.status === "active" ? "bg-emerald-500/20 text-emerald-300" :
                                                                                ticket.status === "cancelled" ? "bg-red-500/20 text-red-300" :
                                                                                    "bg-gray-500/20 text-gray-300"
                                                                                }`}>
                                                                                {ticket.status}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                    <p className="text-white/50 text-xs">Ordered: {new Date(order.createdAt).toLocaleDateString()}</p>
                                                </div>
                                            )}
                                            {order.eventSlug && !isExpanded && (
                                                <Link
                                                    href={`/events/${order.eventSlug}`}
                                                    className="inline-block mt-3 text-[#A1AB74] text-xs hover:underline"
                                                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                                                >
                                                    View Event →
                                                </Link>
                                            )}
                                        </div>
                                    );
                                }))
                            }
                        </div>
                    )}

                    {/* ── Past Orders (WooCommerce History) Tab ── */}
                    {tab === "history" && (
                        <div className="space-y-3">
                            <div className="bg-black/40 backdrop-blur-sm border border-[#A1AB74]/20 rounded-xl p-4">
                                <p className="text-white/60 text-sm">
                                    These are your orders from our previous website. Item-level details are not available for historical orders.
                                </p>
                            </div>
                            {wooOrders.length === 0 ? (
                                <div className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-2xl p-8 sm:p-12 text-center">
                                    <p className="text-white/50">No past order history found</p>
                                </div>
                            ) : (
                                wooOrders.map((order: any) => {
                                    const wooStatusColor: Record<string, string> = {
                                        completed: "bg-green-500/20 text-green-300",
                                        processing: "bg-blue-500/20 text-blue-300",
                                        cancelled: "bg-red-500/20 text-red-300",
                                        refunded: "bg-orange-500/20 text-orange-300",
                                        failed: "bg-red-500/20 text-red-300",
                                        pending: "bg-yellow-500/20 text-yellow-300",
                                        on_hold: "bg-yellow-500/20 text-yellow-300",
                                        ready_for_pickup: "bg-emerald-500/20 text-emerald-300",
                                        pre_order: "bg-purple-500/20 text-purple-300",
                                        first_order_picked: "bg-green-500/20 text-green-300",
                                    };
                                    const wooStatusLabel: Record<string, string> = {
                                        completed: "Completed",
                                        processing: "Processing",
                                        cancelled: "Cancelled",
                                        refunded: "Refunded",
                                        failed: "Failed",
                                        pending: "Pending",
                                        on_hold: "On Hold",
                                        ready_for_pickup: "Ready for Pickup",
                                        pre_order: "Pre-Order",
                                        first_order_picked: "Picked Up",
                                    };
                                    return (
                                        <div
                                            key={order.id}
                                            className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl p-4 sm:p-5"
                                        >
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="min-w-0">
                                                    <p className="text-white font-semibold">
                                                        {order.customerName || "Order"}
                                                    </p>
                                                    <p className="text-white/40 text-xs font-mono">WC #{order.wooOrderId}</p>
                                                </div>
                                                <span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ml-2 ${wooStatusColor[order.status] || "bg-gray-500/20 text-gray-300"}`}>
                                                    {wooStatusLabel[order.status] || order.status}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                                <div>
                                                    <p className="text-white/40 text-[10px] uppercase tracking-wider">Order Date</p>
                                                    <p className="text-white text-sm font-medium">
                                                        {new Date(order.orderDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-white/40 text-[10px] uppercase tracking-wider">Total</p>
                                                    <p className="text-white text-sm font-medium">${(order.totalCents / 100).toFixed(2)}</p>
                                                </div>
                                                {order.paymentMethod && (
                                                    <div>
                                                        <p className="text-white/40 text-[10px] uppercase tracking-wider">Payment</p>
                                                        <p className="text-white text-sm font-medium">{order.paymentMethod}</p>
                                                    </div>
                                                )}
                                            </div>
                                            {order.completedDate && (
                                                <p className="text-white/30 text-xs mt-2">
                                                    Completed: {new Date(order.completedDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                                </p>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}

                    {/* ── Profile Tab ── */}
                    {tab === "profile" && profile && (
                        <div className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-2xl p-4 sm:p-6">
                            {editProfile ? (
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        updateProfile.mutate(profileForm);
                                    }}
                                    className="space-y-4"
                                >
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-white/50 mb-1">First Name</label>
                                            <input
                                                value={profileForm.firstName}
                                                onChange={(e) => setProfileForm((f) => ({ ...f, firstName: e.target.value }))}
                                                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A1AB74]/50"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-white/50 mb-1">Last Name</label>
                                            <input
                                                value={profileForm.lastName}
                                                onChange={(e) => setProfileForm((f) => ({ ...f, lastName: e.target.value }))}
                                                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A1AB74]/50"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-white/50 mb-1">Phone</label>
                                        <input
                                            value={profileForm.phone}
                                            onChange={(e) => setProfileForm((f) => ({ ...f, phone: e.target.value }))}
                                            className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A1AB74]/50"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-white/50 mb-1">Address</label>
                                        <input
                                            value={profileForm.address}
                                            onChange={(e) => setProfileForm((f) => ({ ...f, address: e.target.value }))}
                                            className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A1AB74]/50"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-white/50 mb-1">City</label>
                                            <input
                                                value={profileForm.city}
                                                onChange={(e) => setProfileForm((f) => ({ ...f, city: e.target.value }))}
                                                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A1AB74]/50"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-white/50 mb-1">State</label>
                                            <input
                                                value={profileForm.state}
                                                onChange={(e) => setProfileForm((f) => ({ ...f, state: e.target.value }))}
                                                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A1AB74]/50"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-white/50 mb-1">ZIP</label>
                                            <input
                                                value={profileForm.zip}
                                                onChange={(e) => setProfileForm((f) => ({ ...f, zip: e.target.value }))}
                                                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A1AB74]/50"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex gap-2 pt-2">
                                        <button
                                            type="submit"
                                            disabled={updateProfile.isPending}
                                            className="bg-[#A1AB74] hover:bg-[#8a9360] text-white font-bold py-2.5 px-6 rounded-xl transition-colors disabled:opacity-50 text-sm"
                                        >
                                            {updateProfile.isPending ? "Saving…" : "Save"}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setEditProfile(false)}
                                            className="text-gray-500 hover:text-white py-2.5 px-4 text-sm transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-white font-medium">Your Info</h2>
                                        <button
                                            onClick={startEdit}
                                            className="text-[#A1AB74] hover:underline text-sm"
                                        >
                                            Edit
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <p className="text-white/50 text-xs">Name</p>
                                            <p className="text-white">{profile.firstName} {profile.lastName}</p>
                                        </div>
                                        <div>
                                            <p className="text-white/50 text-xs">Email</p>
                                            <p className="text-white break-all">{profile.email}</p>
                                        </div>
                                        <div>
                                            <p className="text-white/50 text-xs">Phone</p>
                                            <p className="text-white">{profile.phone || "—"}</p>
                                        </div>
                                        <div>
                                            <p className="text-white/50 text-xs">Address</p>
                                            <p className="text-white">
                                                {profile.address || profile.city
                                                    ? `${profile.address}${profile.city ? `, ${profile.city}` : ""}${profile.state ? `, ${profile.state}` : ""} ${profile.zip || ""}`
                                                    : "—"}
                                            </p>
                                        </div>
                                    </div>
                                    {profile.ordersCount > 0 && (
                                        <div className="mt-6 pt-4 border-t border-white/10 flex gap-6 text-sm">
                                            <div>
                                                <p className="text-white/50 text-xs">Total Orders</p>
                                                <p className="text-white font-medium">{profile.ordersCount}</p>
                                            </div>
                                            <div>
                                                <p className="text-white/50 text-xs">Total Spent</p>
                                                <p className="text-white font-medium">${(profile.totalSpentCents / 100).toFixed(2)}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Change Password Section */}
                    {tab === "profile" && (
                        <div className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-2xl p-4 sm:p-6 mt-4">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-white font-medium">Password</h2>
                                {!showChangePassword && (
                                    <button
                                        onClick={() => { setShowChangePassword(true); setPasswordError(""); setPasswordSuccess(false); }}
                                        className="text-[#A1AB74] hover:underline text-sm"
                                    >
                                        Change Password
                                    </button>
                                )}
                            </div>
                            {showChangePassword ? (
                                passwordSuccess ? (
                                    <div className="flex items-center gap-2 text-green-400 text-sm">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                        Password updated successfully
                                    </div>
                                ) : (
                                    <form onSubmit={handleChangePassword} className="space-y-3">
                                        {passwordError && (
                                            <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{passwordError}</p>
                                        )}
                                        <div>
                                            <label className="block text-xs font-medium text-white/50 mb-1">Current Password</label>
                                            <input
                                                type="password"
                                                value={passwordForm.currentPassword}
                                                onChange={(e) => setPasswordForm((f) => ({ ...f, currentPassword: e.target.value }))}
                                                required
                                                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A1AB74]/50"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-white/50 mb-1">New Password</label>
                                            <input
                                                type="password"
                                                value={passwordForm.newPassword}
                                                onChange={(e) => setPasswordForm((f) => ({ ...f, newPassword: e.target.value }))}
                                                required
                                                minLength={8}
                                                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A1AB74]/50"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-white/50 mb-1">Confirm New Password</label>
                                            <input
                                                type="password"
                                                value={passwordForm.confirmPassword}
                                                onChange={(e) => setPasswordForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                                                required
                                                minLength={8}
                                                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A1AB74]/50"
                                            />
                                        </div>
                                        <div className="flex gap-2 pt-1">
                                            <button
                                                type="submit"
                                                disabled={changePassword.isPending}
                                                className="bg-[#A1AB74] hover:bg-[#8a9360] text-white font-bold py-2.5 px-6 rounded-xl transition-colors disabled:opacity-50 text-sm"
                                            >
                                                {changePassword.isPending ? "Updating…" : "Update Password"}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => { setShowChangePassword(false); setPasswordError(""); setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" }); }}
                                                className="text-gray-500 hover:text-white py-2.5 px-4 text-sm transition-colors"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </form>
                                )
                            ) : (
                                <p className="text-white/50 text-sm">••••••••</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
            <Footer />
        </TourProvider>
    );
}
