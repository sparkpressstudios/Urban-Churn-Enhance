import { useState, useEffect } from "react";
import { useParams, Link, useLocation } from "wouter";
import {
  ShoppingBag,
  ArrowLeft,
  Plus,
  Minus,
  AlertTriangle,
  Eye,
  CreditCard,
  Clock,
  Calendar,
  CalendarDays,
  Check,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { api } from "@/lib/api";
import { TAG_LABELS, TAG_CLASSES } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL;
const CART_STORAGE_KEY = "uc-cart";

type ApiFlavour = {
  id: number;
  name: string;
  slug: string;
  description: string;
  imageUrl: string | null;
  tag: string;
  emoji: string;
  basePrice: string;
  available: boolean;
};

type ApiSize = {
  id: number;
  name: string;
  slug: string;
  volumeOz: number;
  price: string;
  description: string;
};

type ApiProduct = {
  id: number;
  flavourId: number;
  sizeId: number;
  priceOverride: string | null;
  available: boolean;
  manageStock: boolean;
  stockQuantity: number;
  lowStockThreshold: number;
  flavourName: string;
  flavourSlug: string;
  sizeName: string;
  sizeSlug: string;
  sizePrice: string;
  sizeVolumeOz: number;
};

function getFlavorImage(f: ApiFlavour): string {
  if (f.imageUrl) {
    if (f.imageUrl.startsWith("http") || f.imageUrl.startsWith("/")) return f.imageUrl;
    return `${BASE}${f.imageUrl}`;
  }
  return `${BASE}images/${f.slug}.jpg`;
}

function saveCart(items: { flavour: ApiFlavour; size: ApiSize; quantity: number; effectivePrice: number }[]) {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ items, timestamp: Date.now() }));
  window.dispatchEvent(new CustomEvent("uc-cart-update"));
}

function loadCart(): { flavour: ApiFlavour; size: ApiSize; quantity: number; effectivePrice: number }[] {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const { items, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp > 7 * 86400000) {
      localStorage.removeItem(CART_STORAGE_KEY);
      return [];
    }
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

export default function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();

  const { data: flavors = [] } = useQuery<ApiFlavour[]>({
    queryKey: ["public", "flavours"],
    queryFn: () => api.getPublicFlavours(),
  });
  const { data: sizes = [] } = useQuery<ApiSize[]>({
    queryKey: ["public", "sizes"],
    queryFn: () => api.getPublicSizes(),
  });
  const { data: products = [] } = useQuery<ApiProduct[]>({
    queryKey: ["public", "products"],
    queryFn: () => api.getPublicProducts(),
  });
  const { data: activePreOrders = [] } = useQuery<any[]>({
    queryKey: ["active-pre-orders"],
    queryFn: () => api.getActivePreOrders(),
    staleTime: 60_000,
  });

  const flavor = flavors.find((f) => f.slug === slug);

  const [selectedSizeId, setSelectedSizeId] = useState<number | null>(null);
  const [qty, setQty] = useState(1);
  const [, navigate] = useLocation();

  // Track cart item count for sticky CTA
  const getCartCount = () => {
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      if (!raw) return 0;
      const { items } = JSON.parse(raw);
      return Array.isArray(items) ? items.reduce((sum: number, i: any) => sum + (i.quantity || 1), 0) : 0;
    } catch { return 0; }
  };
  const [cartCount, setCartCount] = useState(getCartCount);

  useEffect(() => {
    const update = () => setCartCount(getCartCount());
    window.addEventListener("uc-cart-update", update);
    return () => window.removeEventListener("uc-cart-update", update);
  }, []);

  // Once sizes load, default to first
  const effectiveSizeId = selectedSizeId ?? (sizes.length > 0 ? sizes[0].id : 0);
  const selectedSize = sizes.find((s) => s.id === effectiveSizeId);

  // Stock lookup
  const stockMap = new Map<string, ApiProduct>();
  products.forEach((p) => stockMap.set(`${p.flavourId}-${p.sizeId}`, p));

  const getEffectivePrice = (flavourId: number, sizeId: number, sizePrice: string): number => {
    const product = stockMap.get(`${flavourId}-${sizeId}`);
    if (product?.priceOverride) return parseFloat(product.priceOverride);
    return parseFloat(sizePrice);
  };

  const getProductStock = (flavourId: number, sizeId: number) => {
    const p = stockMap.get(`${flavourId}-${sizeId}`);
    if (!p) return { available: true, low: false, soldOut: false };
    const soldOut = p.manageStock && p.stockQuantity <= 0;
    const low = p.manageStock && p.stockQuantity > 0 && p.stockQuantity <= p.lowStockThreshold;
    return { available: p.available && !soldOut, low, soldOut };
  };

  const getFlavorStockStatus = (flavourId: number): "available" | "low" | "sold-out" => {
    const flavorProducts = products.filter((p) => p.flavourId === flavourId);
    if (flavorProducts.length === 0) return "available";
    const allSoldOut = flavorProducts.every((p) => p.manageStock && p.stockQuantity <= 0 && !p.available);
    if (allSoldOut) return "sold-out";
    const anyLow = flavorProducts.some((p) => p.manageStock && p.stockQuantity > 0 && p.stockQuantity <= p.lowStockThreshold);
    if (anyLow) return "low";
    return "available";
  };

  const addToCart = (flavour: ApiFlavour, size: ApiSize, quantity: number) => {
    const price = getEffectivePrice(flavour.id, size.id, size.price);
    const cart = loadCart();
    const existing = cart.findIndex(
      (item) => item.flavour.id === flavour.id && item.size.id === size.id,
    );
    if (existing >= 0) {
      cart[existing].quantity += quantity;
      cart[existing].effectivePrice = price;
    } else {
      cart.push({ flavour, size, quantity, effectivePrice: price });
    }
    saveCart(cart);
    setCartCount(getCartCount());
    toast({
      title: `${flavour.name} added!`,
      description: `${quantity}× ${size.name} — $${(price * quantity).toFixed(2)}`,
    });
  };

  const goToCart = () => {
    sessionStorage.setItem("uc-open-cart", "1");
    navigate("/pre-order");
  };

  const goToCheckout = () => {
    sessionStorage.setItem("uc-open-cart", "1");
    sessionStorage.setItem("uc-goto-checkout", "1");
    navigate("/pre-order");
  };

  // Related flavors (same tag, excluding current)
  const related = flavor
    ? flavors.filter((f) => f.id !== flavor.id && f.available).slice(0, 3)
    : [];

  // Loading state
  if (flavors.length === 0) {
    return (
      <div className="min-h-screen bg-[#FAF9F6]">
        <Navbar />
        <div className="pt-32 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#A1AB74]" />
        </div>
        <Footer />
      </div>
    );
  }

  // Not found
  if (!flavor) {
    return (
      <div className="min-h-screen bg-[#FAF9F6]">
        <Navbar />
        <div className="pt-32 max-w-3xl mx-auto px-4 text-center">
          <h1 className="text-3xl font-black text-gray-900 mb-4">Flavor not found</h1>
          <p className="text-gray-500 mb-8">We couldn't find that flavor. It may have been removed or the link is incorrect.</p>
          <Link href="/pre-order" className="inline-flex items-center gap-2 bg-[#A1AB74] text-white px-6 py-3 rounded-full font-bold text-sm hover:bg-[#8a9360] transition-colors">
            <ArrowLeft className="w-4 h-4" /> Browse All Flavors
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const flavorStock = getFlavorStockStatus(flavor.id);
  const flavorPreOrderWindow = activePreOrders.find((po: any) => po.flavourId === flavor.id);
  const preOrderClosed = flavorPreOrderWindow && !flavorPreOrderWindow.acceptingOrders;
  const isDisabled = !flavor.available || flavorStock === "sold-out" || !!preOrderClosed;
  const productStock = selectedSize ? getProductStock(flavor.id, selectedSize.id) : { available: true, low: false, soldOut: false };
  const canAdd = !isDisabled && selectedSize && productStock.available;

  return (
    <div className="min-h-screen bg-[#FAF9F6]">
      <SEO
        title={`${flavor.name} Ice Cream | Urban Churn`}
        description={`${(flavor.description || `${flavor.name} — handcrafted craft ice cream`).slice(0, 130)} — Available for pre-order at Urban Churn. Natural ingredients, local PA dairy.`}
        keywords={`${flavor.name} ice cream, ${flavor.tag ? `${flavor.tag} ice cream, ` : ''}craft ice cream, Urban Churn flavors, premium ice cream, pre-order ice cream`}
        canonical={`/pre-order/${flavor.slug}`}
        ogImage={flavor.imageUrl ? (flavor.imageUrl.startsWith('http') ? flavor.imageUrl : `https://urbanchurn.com/api${flavor.imageUrl}`) : undefined}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: `${flavor.name} Ice Cream`,
          description: flavor.description || `${flavor.name} craft ice cream by Urban Churn`,
          image: flavor.imageUrl ? (flavor.imageUrl.startsWith('http') ? flavor.imageUrl : `https://urbanchurn.com/api${flavor.imageUrl}`) : undefined,
          brand: { "@type": "Brand", name: "Urban Churn" },
          offers: {
            "@type": "Offer",
            price: flavor.basePrice,
            priceCurrency: "USD",
            availability: flavor.available ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            url: `https://urbanchurn.com/pre-order/${flavor.slug}`,
          }
        }}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Pre-Order", url: "/pre-order" },
          { name: flavor.name, url: `/pre-order/${flavor.slug}` },
        ]}
      />
      <Navbar />

      <div className="pt-28 pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back link */}
          <Link
            href="/pre-order"
            className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-8 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Shop
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
            {/* Image */}
            <div className="relative aspect-square rounded-3xl overflow-hidden bg-gray-100">
              <img
                src={getFlavorImage(flavor)}
                alt={flavor.name}
                className="w-full h-full object-cover"
              />
              {/* Tag */}
              <span
                className={`absolute top-4 left-4 text-xs font-bold px-3 py-1.5 rounded-full ${TAG_CLASSES[flavor.tag] || "bg-gray-100 text-gray-600"}`}
              >
                {TAG_LABELS[flavor.tag] || flavor.tag}
              </span>
              {/* Pre-order / Available now badge */}
              {(() => {
                const poWindow = activePreOrders.find((po: any) => po.flavourId === flavor.id);
                if (poWindow?.pickupDate && poWindow.acceptingOrders) {
                  const fmtShort = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" });
                  const start = fmtShort(poWindow.pickupDate);
                  const end = poWindow.pickupEndDate ? fmtShort(poWindow.pickupEndDate) : null;
                  return (
                    <span className="absolute bottom-4 left-4 bg-indigo-600/90 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm">
                      <CalendarDays className="w-3.5 h-3.5" />
                      Pre-Order · Pickup {start}{end ? ` – ${end}` : ""}
                    </span>
                  );
                }
                if (poWindow) {
                  return (
                    <span className="absolute bottom-4 left-4 bg-gray-700/90 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm">
                      <Clock className="w-3.5 h-3.5" />
                      Pre-Orders Closed
                    </span>
                  );
                }
                return (
                  <span className="absolute bottom-4 left-4 bg-emerald-600/90 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm">
                    <Check className="w-3.5 h-3.5" />
                    Available Now
                  </span>
                );
              })()}
              {/* Stock overlays */}
              {flavorStock === "sold-out" && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="bg-red-600 text-white text-lg font-black px-6 py-3 rounded-full">
                    Sold Out
                  </span>
                </div>
              )}
              {flavorStock === "low" && !isDisabled && (
                <span className="absolute top-4 right-4 bg-orange-500 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Low Stock
                </span>
              )}
            </div>

            {/* Info */}
            <div className="flex flex-col">
              <div className="flex items-start gap-3 mb-3">
                <h1 className="text-4xl font-black text-gray-900 leading-tight">
                  {flavor.name}
                </h1>
                <span className="text-4xl shrink-0 mt-1">{flavor.emoji}</span>
              </div>

              <p className="text-gray-600 text-lg leading-relaxed mb-8">
                {flavor.description}
              </p>

              {/* Pre-order window info */}
              {activePreOrders.length > 0 && (() => {
                const relevantWindow = activePreOrders.find((po: any) => po.flavourId === flavor.id) || (activePreOrders.some((po: any) => !po.flavourId) ? activePreOrders.find((po: any) => !po.flavourId) : null);
                if (!relevantWindow) return null;
                const closeDate = new Date(relevantWindow.preOrderEnd);
                const daysLeft = Math.ceil((closeDate.getTime() - Date.now()) / 86_400_000);
                const isOpen = relevantWindow.acceptingOrders;
                return (
                  <div className={`relative overflow-hidden rounded-2xl mb-6 border shadow-[0_2px_16px_rgba(0,0,0,0.10)] ${isOpen ? "border-[#A1AB74]/50 shadow-[0_2px_16px_rgba(161,171,116,0.18)]" : "border-gray-300/50"}`}>
                    {/* Header bar */}
                    <div className={`px-4 py-2.5 flex items-center justify-between ${isOpen ? "bg-[#A1AB74]" : "bg-gray-500"}`}>
                      <div className="flex items-center gap-2">
                        {isOpen ? (
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                          </span>
                        ) : (
                          <Clock className="w-3.5 h-3.5 text-white" />
                        )}
                        <span className="text-white font-black text-xs tracking-widest uppercase">
                          {isOpen ? "Pre-Order Now Open" : "Pre-Orders Closed"}
                        </span>
                      </div>
                      {isOpen && daysLeft > 0 && (
                        <span className="bg-white/25 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                          Closes in {daysLeft} day{daysLeft !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>

                    {/* Info rows */}
                    <div className={`px-4 py-4 space-y-3 ${isOpen ? "bg-gradient-to-br from-[#A1AB74]/10 to-[#A1AB74]/5" : "bg-gray-50"}`}>
                      {/* Deadline */}
                      <div className="flex items-center gap-3">
                        <div className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center ${isOpen ? "bg-[#A1AB74]/20" : "bg-gray-200"}`}>
                          <Clock className={`w-4 h-4 ${isOpen ? "text-[#A1AB74]" : "text-gray-400"}`} />
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider leading-none mb-0.5">
                            {isOpen ? "Order By" : "Ordering Closed"}
                          </p>
                          <p className="text-sm font-bold text-gray-800">
                            {closeDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>

                      {/* Pickup date */}
                      {relevantWindow.pickupDate && (
                        <div className="flex items-center gap-3">
                          <div className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center ${isOpen ? "bg-[#A1AB74]/20" : "bg-gray-200"}`}>
                            <Calendar className={`w-4 h-4 ${isOpen ? "text-[#A1AB74]" : "text-gray-400"}`} />
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider leading-none mb-0.5">Pick Up</p>
                            <p className="text-sm font-bold text-gray-800">
                              {new Date(relevantWindow.pickupDate).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                              {relevantWindow.pickupEndDate && (
                                <span className="text-gray-500 font-normal">
                                  {" – "}{new Date(relevantWindow.pickupEndDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      )}

                      {!isOpen && (
                        <p className="text-xs text-gray-500 pt-1">
                          The pre-order window for this flavor has closed. Check back for the next pre-order opportunity.
                        </p>
                      )}
                    </div>
                  </div>
                );
              })()}

              {!isDisabled && sizes.length > 0 && (
                <div className="space-y-6">
                  {/* Size selector */}
                  <div>
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">
                      Size
                    </h3>
                    <div className="flex gap-2">
                      {sizes.map((size) => {
                        const sizeStock = getProductStock(flavor.id, size.id);
                        return (
                          <button
                            key={size.id}
                            onClick={() => setSelectedSizeId(size.id)}
                            disabled={sizeStock.soldOut}
                            className={`flex-1 px-4 py-3 rounded-2xl text-sm font-bold transition-all text-center border-2 ${effectiveSizeId === size.id
                              ? "bg-[#A1AB74] text-white border-[#A1AB74] shadow-sm"
                              : sizeStock.soldOut
                                ? "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed"
                                : "bg-white text-gray-700 border-gray-200 hover:border-[#A1AB74]/50"
                              }`}
                          >
                            <div className="text-base">{size.name}</div>
                            <div
                              className={`text-xs mt-0.5 ${effectiveSizeId === size.id
                                ? "text-white/80"
                                : "text-gray-400"
                                }`}
                            >
                              {size.volumeOz}oz
                              {size.description && ` · ${size.description}`}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Price */}
                  <div>
                    <p className="text-4xl font-black text-gray-900">
                      $
                      {selectedSize
                        ? getEffectivePrice(
                          flavor.id,
                          selectedSize.id,
                          selectedSize.price,
                        ).toFixed(2)
                        : "—"}
                    </p>
                    {productStock.low && (
                      <p className="text-sm text-orange-600 mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> Only a few
                        left in this size
                      </p>
                    )}
                  </div>

                  {/* Quantity + Add to Cart */}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-gray-100 rounded-full px-1 py-1">
                      <button
                        onClick={() => setQty(Math.max(1, qty - 1))}
                        className="w-11 h-11 rounded-full bg-white hover:bg-gray-50 flex items-center justify-center transition-colors shadow-sm"
                        aria-label="Decrease"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-10 text-center font-bold text-lg">
                        {qty}
                      </span>
                      <button
                        onClick={() => setQty(qty + 1)}
                        className="w-11 h-11 rounded-full bg-white hover:bg-gray-50 flex items-center justify-center transition-colors shadow-sm"
                        aria-label="Increase"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        if (canAdd && selectedSize) {
                          addToCart(flavor, selectedSize, qty);
                          setQty(1);
                        }
                      }}
                      disabled={!canAdd}
                      className="flex-1 flex items-center justify-center gap-2 bg-gray-900 text-white py-3.5 rounded-full text-base font-bold hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                      <ShoppingBag className="w-5 h-5" />
                      Add to Cart
                    </button>
                  </div>
                </div>
              )}

              {isDisabled && (
                <div className="mt-4 p-4 bg-gray-100 rounded-2xl text-center text-gray-500 font-medium">
                  This flavor is currently unavailable.
                </div>
              )}
            </div>
          </div>

          {/* Related flavours */}
          {related.length > 0 && (
            <div className="mt-20">
              <h2 className="text-2xl font-black text-gray-900 mb-6">
                You might also like
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {related.map((f) => (
                  <Link key={f.id} href={`/pre-order/${f.slug}`}>
                    <div className="bg-white rounded-3xl overflow-hidden border-2 border-gray-100 hover:border-[#A1AB74]/40 hover:shadow-lg transition-all cursor-pointer">
                      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                        <img
                          src={getFlavorImage(f)}
                          alt={f.name}
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                        <span
                          className={`absolute top-3 left-3 text-xs font-bold px-3 py-1 rounded-full ${TAG_CLASSES[f.tag] || "bg-gray-100 text-gray-600"}`}
                        >
                          {TAG_LABELS[f.tag] || f.tag}
                        </span>
                      </div>
                      <div className="p-5">
                        <div className="flex items-start justify-between mb-1">
                          <h3 className="text-lg font-black text-gray-900 leading-tight">
                            {f.name}
                          </h3>
                          <span className="text-2xl ml-2 shrink-0">
                            {f.emoji}
                          </span>
                        </div>
                        <p className="text-gray-500 text-sm line-clamp-2">
                          {f.description}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <Footer />

      {/* Sticky Cart CTA — visible once something is in the cart */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-50 p-4 bg-white/95 backdrop-blur border-t border-gray-200 shadow-[0_-4px_24px_rgba(0,0,0,0.08)]">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-600 mr-auto">
              <ShoppingBag className="w-4 h-4 text-[#A1AB74]" />
              <span><span className="font-bold text-gray-900">{cartCount}</span> item{cartCount !== 1 ? "s" : ""} in cart</span>
            </div>
            <button
              onClick={goToCart}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-full border-2 border-gray-900 text-gray-900 text-sm font-bold hover:bg-gray-900 hover:text-white transition-colors"
            >
              <Eye className="w-4 h-4" />
              View Cart
            </button>
            <button
              onClick={goToCheckout}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[#A1AB74] text-white text-sm font-bold hover:bg-[#8a9360] transition-colors"
            >
              <CreditCard className="w-4 h-4" />
              Checkout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
