import { useEffect, useState, useMemo } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCustomerAuth } from "@/components/CustomerAuthContext";
import { api } from "@/lib/api";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { TourProvider, useTour } from "@/lib/tour";
import { wholesaleNewOrderSteps } from "@/lib/tour/tour-steps";
import { getMinDeliveryDate } from "@/lib/wholesale-constants";

interface OrderItem {
    wholesaleProductId: number;
    quantity: number;
}

export default function WholesaleOrderForm() {
    const [, navigate] = useLocation();
    const searchString = useSearch();
    const reorderId = new URLSearchParams(searchString).get("reorder");
    const { customer, isLoading: authLoading } = useCustomerAuth();
    const queryClient = useQueryClient();

    const [quantities, setQuantities] = useState<Record<number, number>>({});
    const [deliveryMethod, setDeliveryMethod] = useState<"delivery" | "pickup">("delivery");
    const [requestedDate, setRequestedDate] = useState("");
    const [notes, setNotes] = useState("");
    const [isRushOrder, setIsRushOrder] = useState(false);
    const [rushNotes, setRushNotes] = useState("");
    const [vendorLocationId, setVendorLocationId] = useState<number | "">("");
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

    const { data: vendorLocations = [] } = useQuery({
        queryKey: ["wholesale-portal-vendor-locations"],
        queryFn: api.wholesalePortalVendorLocations,
        enabled: !!customer && !!profile,
    });

    const { data: reorderSource } = useQuery({
        queryKey: ["wholesale-portal-order", reorderId],
        queryFn: () => api.wholesalePortalOrder(Number(reorderId)),
        enabled: !!customer && !!reorderId,
    });

    useEffect(() => {
        if (profile?.deliveryMethod) {
            setDeliveryMethod(profile.deliveryMethod);
        }
    }, [profile]);

    useEffect(() => {
        if (!reorderSource?.items) return;
        const next: Record<number, number> = {};
        for (const item of reorderSource.items) {
            if (item.wholesaleProductId) {
                next[item.wholesaleProductId] = item.quantity;
            }
        }
        setQuantities(next);
        if (reorderSource.deliveryMethod) {
            setDeliveryMethod(reorderSource.deliveryMethod);
        }
    }, [reorderSource]);

    useEffect(() => {
        if (vendorLocations.length === 1) {
            setVendorLocationId(vendorLocations[0].id);
        } else {
            const defaultLoc = vendorLocations.find((l: any) => l.isDefault);
            if (defaultLoc) setVendorLocationId(defaultLoc.id);
        }
    }, [vendorLocations]);

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
    const minDate = isRushOrder ? "" : getMinDeliveryDate(3);

    const submitMutation = useMutation({
        mutationFn: async () => {
            const items: OrderItem[] = [];

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
                isRushOrder,
                rushNotes: isRushOrder ? rushNotes || undefined : undefined,
                vendorLocationId: vendorLocationId ? Number(vendorLocationId) : undefined,
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
                            <h1 className="text-2xl sm:text-3xl font-bold text-white">
                                {reorderId ? "Reorder" : "New Order"}
                            </h1>
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

                    {grouped.map((group) => (
                        <div key={group.key} className="mb-8">
                            <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-[#A1AB74]" />
                                {group.label}
                            </h2>
                            <div className="space-y-2">
                                {group.items.map((product: any) => {
                                    const qty = quantities[product.id] || 0;
                                    const disabled = product.outOfStock;
                                    return (
                                        <div
                                            key={product.id}
                                            className={`flex flex-col sm:flex-row sm:items-center justify-between bg-black/40 backdrop-blur-sm border rounded-xl p-3 sm:p-4 transition-colors gap-3 ${qty > 0 ? "border-[#A1AB74]/40 bg-[#A1AB74]/10" : "border-white/10"} ${disabled ? "opacity-50" : ""}`}
                                        >
                                            <div className="flex-1 min-w-0">
                                                <p className="text-white font-medium truncate text-sm sm:text-base">{product.flavourName}</p>
                                                <p className="text-white/50 text-xs sm:text-sm">
                                                    {product.sizeName || product.name}
                                                    {product.sizeDescription ? ` • ${product.sizeDescription}` : ""}
                                                </p>
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {product.outOfStock && (
                                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-200">Out of stock</span>
                                                    )}
                                                    {product.lowStock && !product.outOfStock && (
                                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-200">Limited stock</span>
                                                    )}
                                                    {product.flavourIsSeasonal && (
                                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-200">Seasonal</span>
                                                    )}
                                                    {product.flavourIsExclusive && (
                                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-200">Exclusive</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 sm:gap-4 sm:ml-4 justify-between sm:justify-end">
                                                <span className="text-white/60 text-sm whitespace-nowrap">
                                                    ${(product.priceCents / 100).toFixed(2)}
                                                </span>
                                                {!disabled && (
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
                                                )}
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

                    <div className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl p-4 sm:p-6 mb-8 space-y-4" data-tour="wholesale-delivery-method">
                        <h2 className="text-lg font-semibold text-white">Delivery Details</h2>

                        {vendorLocations.length > 0 && deliveryMethod === "delivery" && (
                            <div>
                                <label className="block text-sm font-medium text-white/70 mb-1.5">Delivery Location</label>
                                <select
                                    value={vendorLocationId}
                                    onChange={(e) => setVendorLocationId(e.target.value ? Number(e.target.value) : "")}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#A1AB74]/50"
                                >
                                    <option value="">Default address</option>
                                    {vendorLocations.map((loc: any) => (
                                        <option key={loc.id} value={loc.id}>
                                            {loc.name} — {loc.address}, {loc.city}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

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

                        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                            <label className="flex items-start gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={isRushOrder}
                                    onChange={(e) => {
                                        setIsRushOrder(e.target.checked);
                                        if (!e.target.checked) setRushNotes("");
                                    }}
                                    className="mt-1"
                                />
                                <span>
                                    <span className="text-amber-200 font-medium text-sm">Rush order</span>
                                    <span className="block text-white/50 text-xs mt-0.5">
                                        Request delivery sooner than 3 business days. Subject to approval — we will confirm availability.
                                    </span>
                                </span>
                            </label>
                            {isRushOrder && (
                                <input
                                    type="text"
                                    value={rushNotes}
                                    onChange={(e) => setRushNotes(e.target.value)}
                                    placeholder="Why is this urgent? Preferred date/time window…"
                                    className="mt-2 w-full px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-white text-sm placeholder:text-white/30"
                                />
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-white/70 mb-1.5">
                                Requested {deliveryMethod === "pickup" ? "Pickup" : "Delivery"} Date
                            </label>
                            <input
                                type="date"
                                value={requestedDate}
                                onChange={(e) => setRequestedDate(e.target.value)}
                                min={minDate || undefined}
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#A1AB74]/50 [color-scheme:dark]"
                            />
                            <p className="text-white/40 text-xs mt-1.5">
                                {isRushOrder
                                    ? "Rush orders may request any date — we will confirm feasibility"
                                    : "Minimum 3 business days lead time required"}
                            </p>
                        </div>

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
