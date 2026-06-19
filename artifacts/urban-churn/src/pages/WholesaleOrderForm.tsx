import { useEffect, useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCustomerAuth } from "@/components/CustomerAuthContext";
import { api } from "@/lib/api";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { TourProvider, useTour } from "@/lib/tour";
import { wholesaleNewOrderSteps } from "@/lib/tour/tour-steps";

function getMinDeliveryDate(): string {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    let businessDays = 0;
    const cursor = new Date(now);
    while (businessDays < 3) {
        cursor.setDate(cursor.getDate() + 1);
        const day = cursor.getDay();
        if (day !== 0 && day !== 6) businessDays++;
    }
    return cursor.toISOString().split("T")[0];
}

interface OrderItem {
    wholesaleProductId: number;
    quantity: number;
}

export default function WholesaleOrderForm() {
    const [, navigate] = useLocation();
    const { customer, isLoading: authLoading } = useCustomerAuth();
    const queryClient = useQueryClient();

    const [quantities, setQuantities] = useState<Record<number, number>>({});
    const [deliveryMethod, setDeliveryMethod] = useState<"delivery" | "pickup">("delivery");
    const [requestedDate, setRequestedDate] = useState("");
    const [notes, setNotes] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        if (!authLoading && !customer) {
            navigate("/account/login");
        }
    }, [authLoading, customer, navigate]);

    const { data: profile } = useQuery({
        queryKey: ["wholesale-portal-profile"],
        queryFn: api.wholesalePortalProfile,
        enabled: !!customer,
    });

    const { data: products = [], isLoading: productsLoading } = useQuery({
        queryKey: ["wholesale-portal-products"],
        queryFn: api.wholesalePortalProducts,
        enabled: !!customer && !!profile,
    });

    // Set default delivery method from profile
    useEffect(() => {
        if (profile?.deliveryMethod) {
            setDeliveryMethod(profile.deliveryMethod);
        }
    }, [profile]);

    // Group products by managed wholesale size
    const grouped = useMemo(() => {
        const groups = new Map<string, { key: string; label: string; sortOrder: number; items: typeof products }>();

        for (const p of products) {
            const key = p.sizeSlug || p.sizeCategory || `product-${p.id}`;
            const label = p.sizeName || p.name || "Other";
            const sortOrder = typeof p.sizeSortOrder === "number" ? p.sizeSortOrder : 999;

            if (!groups.has(key)) {
                groups.set(key, { key, label, sortOrder, items: [] });
            }

            groups.get(key)!.items.push(p);
        }

        return Array.from(groups.values()).sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
    }, [products]);

    const setQty = (productId: number, qty: number) => {
        setQuantities((prev) => {
            const next = { ...prev };
            if (qty <= 0) {
                delete next[productId];
            } else {
                next[productId] = qty;
            }
            return next;
        });
    };

    const subtotalCents = useMemo(() => {
        let total = 0;
        for (const [pid, qty] of Object.entries(quantities)) {
            const product = products.find((p: any) => p.id === Number(pid));
            if (product) total += product.priceCents * qty;
        }
        return total;
    }, [quantities, products]);

    const itemCount = Object.values(quantities).reduce((a, b) => a + b, 0);
    const minDate = getMinDeliveryDate();

    const submitMutation = useMutation({
        mutationFn: async () => {
            const items: any[] = [];

            // Add product items
            for (const [pid, qty] of Object.entries(quantities)) {
                if (qty > 0) {
                    items.push({ wholesaleProductId: Number(pid), quantity: qty });
                }
            }

            if (items.length === 0) throw new Error("Please add at least one item to your order");

            return api.wholesalePortalCreateOrder({
                items,
                requestedDeliveryDate: requestedDate || undefined,
                deliveryMethod,
                notes: notes || undefined,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["wholesale-portal-orders"] });
            queryClient.invalidateQueries({ queryKey: ["wholesale-portal-dashboard"] });
            navigate("/wholesale/portal");
        },
        onError: (err: any) => {
            setError(err.message || "Failed to submit order");
        },
    });

    useTour("wholesale-new-order", wholesaleNewOrderSteps);

    if (authLoading || productsLoading) {
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

    return (
        <TourProvider>
            <Navbar />
            <div
                className="min-h-screen pt-32 pb-16 px-4"
                style={{ backgroundImage: "linear-gradient(rgba(0,0,0,0.72), rgba(0,0,0,0.72)), url('/images/login-bg.jpg')", backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat", backgroundAttachment: "fixed" }}
            >
                <div className="max-w-3xl mx-auto" data-tour="wholesale-order-form">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-white">New Order</h1>
                            <p className="text-white/50 mt-1 text-sm sm:text-base">{profile?.businessName}</p>
                        </div>
                        <Link href="/wholesale/portal" className="text-white/50 hover:text-white transition-colors">
                            ← Back
                        </Link>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-lg px-4 py-3 mb-6">
                            {error}
                        </div>
                    )}

                    {/* Products by size category */}
                    {grouped.map((group) => (
                        <div key={group.key} className="mb-8">
                            <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-[#A1AB74]" />
                                {group.label}
                            </h2>
                            <div className="space-y-2">
                                {group.items.map((product: any) => {
                                    const qty = quantities[product.id] || 0;
                                    return (
                                        <div
                                            key={product.id}
                                            className={`flex flex-col sm:flex-row sm:items-center justify-between bg-black/40 backdrop-blur-sm border rounded-xl p-3 sm:p-4 transition-colors gap-3 ${qty > 0 ? "border-[#A1AB74]/40 bg-[#A1AB74]/10" : "border-white/10"
                                                }`}
                                        >
                                            <div className="flex-1 min-w-0">
                                                <p className="text-white font-medium truncate text-sm sm:text-base">{product.flavourName}</p>
                                                <p className="text-white/50 text-xs sm:text-sm">
                                                    {product.sizeName || product.name}
                                                    {product.sizeDescription ? ` • ${product.sizeDescription}` : ""}
                                                </p>
                                                {product.flavourDescription && (
                                                    <p className="text-white/40 text-xs mt-1 line-clamp-2">{product.flavourDescription}</p>
                                                )}
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {product.flavourIsSeasonal && (
                                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-200">Seasonal</span>
                                                    )}
                                                    {product.flavourAllergens && (
                                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/70">
                                                            Allergens: {product.flavourAllergens}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 sm:gap-4 sm:ml-4 justify-between sm:justify-end">
                                                <span className="text-white/60 text-sm whitespace-nowrap">
                                                    ${(product.priceCents / 100).toFixed(2)}
                                                </span>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => setQty(product.id, qty - 1)}
                                                        className="w-8 h-8 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors flex items-center justify-center text-lg"
                                                    >
                                                        −
                                                    </button>
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        value={qty}
                                                        onChange={(e) => setQty(product.id, Math.max(0, parseInt(e.target.value) || 0))}
                                                        className="w-12 text-center bg-transparent text-white border-none focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setQty(product.id, qty + 1)}
                                                        className="w-8 h-8 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors flex items-center justify-center text-lg"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}

                    {products.length === 0 && (
                        <div className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl p-8 text-center mb-8">
                            <p className="text-white/50">No products are currently available. Please check back later.</p>
                        </div>
                    )}

                    <div className="mb-8 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/60" data-tour="wholesale-custom-flavour">
                        Seasonal offerings are included above when available. Orders in the portal are limited to the admin-managed wholesale catalog.
                    </div>

                    {/* Delivery Options */}
                    <div className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl p-4 sm:p-6 mb-8 space-y-4" data-tour="wholesale-delivery-method">
                        <h2 className="text-lg font-semibold text-white">Delivery Details</h2>

                        {/* Delivery / Pickup Toggle */}
                        <div>
                            <label className="block text-sm font-medium text-white/70 mb-2">Method</label>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setDeliveryMethod("delivery")}
                                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${deliveryMethod === "delivery"
                                        ? "bg-[#A1AB74] text-white"
                                        : "bg-white/5 border border-white/10 text-white/60 hover:text-white"
                                        }`}
                                >
                                    Delivery
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setDeliveryMethod("pickup")}
                                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${deliveryMethod === "pickup"
                                        ? "bg-[#A1AB74] text-white"
                                        : "bg-white/5 border border-white/10 text-white/60 hover:text-white"
                                        }`}
                                >
                                    Pickup
                                </button>
                            </div>
                        </div>

                        {/* Delivery Date */}
                        <div>
                            <label className="block text-sm font-medium text-white/70 mb-1.5">
                                Requested {deliveryMethod === "pickup" ? "Pickup" : "Delivery"} Date
                            </label>
                            <input
                                type="date"
                                value={requestedDate}
                                onChange={(e) => setRequestedDate(e.target.value)}
                                min={minDate}
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#A1AB74]/50 [color-scheme:dark]"
                            />
                            <p className="text-white/40 text-xs mt-1.5">Minimum 3 business days lead time required</p>
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="block text-sm font-medium text-white/70 mb-1.5">Order Notes</label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={2}
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#A1AB74]/50 resize-none"
                                placeholder="Special instructions, delivery window, etc."
                            />
                        </div>
                    </div>

                    {/* Order Summary / Submit */}
                    <div className="sticky bottom-0 bg-black/80 backdrop-blur border-t border-white/10 -mx-4 px-4 py-3 sm:py-4" data-tour="wholesale-order-summary">
                        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
                            <div className="min-w-0">
                                <p className="text-white/50 text-xs sm:text-sm">{itemCount} item{itemCount !== 1 ? "s" : ""}</p>
                                <p className="text-white text-lg sm:text-xl font-bold">
                                    ${(subtotalCents / 100).toFixed(2)}
                                </p>
                            </div>
                            <button
                                onClick={() => { setError(""); submitMutation.mutate(); }}
                                disabled={submitMutation.isPending || itemCount === 0}
                                className="px-5 sm:px-8 py-3 bg-[#A1AB74] hover:bg-[#8a9463] text-white font-semibold rounded-xl transition-colors disabled:opacity-50 text-sm sm:text-base shrink-0"
                            >
                                {submitMutation.isPending ? "Submitting..." : "Submit Order"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </TourProvider>
    );
}
