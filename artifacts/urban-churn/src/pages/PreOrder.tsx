import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag,
  MapPin,
  Check,
  ArrowLeft,
  ArrowRight,
  X,
  ChevronRight,
  Info,
  Loader2,
  Ticket,
  Plus,
  Minus,
  AlertTriangle,
  CalendarDays,
  Clock,
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { api } from "@/lib/api";
import { TAG_LABELS, TAG_CLASSES, formatHoursCompact } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import GiftCardSection from "@/components/GiftCardSection";
import { useCustomerAuth } from "@/components/CustomerAuthContext";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const BASE = import.meta.env.BASE_URL;
const CART_STORAGE_KEY = "uc-cart";
const LOCATION_STORAGE_KEY = "uc-location";
const CART_EXPIRY_DAYS = 7;

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

type ApiLocation = {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  hours?: any[];
  type?: "shop" | "vendor";
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

type CartItem = {
  flavour: ApiFlavour;
  size: ApiSize;
  quantity: number;
  effectivePrice: number;
};

type Step = "shopping" | "location" | "checkout" | "confirmation";

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const { items, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp > CART_EXPIRY_DAYS * 86400000) {
      localStorage.removeItem(CART_STORAGE_KEY);
      return [];
    }
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

function saveCart(items: CartItem[]) {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ items, timestamp: Date.now() }));
  window.dispatchEvent(new CustomEvent("uc-cart-update"));
}

function loadLocation(): ApiLocation | null {
  try {
    const raw = localStorage.getItem(LOCATION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getFlavorImage(f: ApiFlavour): string {
  if (f.imageUrl) {
    if (f.imageUrl.startsWith("http") || f.imageUrl.startsWith("/")) return f.imageUrl;
    return `${BASE}${f.imageUrl}`;
  }
  return `${BASE}images/${f.slug}.jpg`;
}

// ---------- Cart location picker (collapsed pill → dropdown) ----------
function CartLocationPicker({
  locations,
  selectedLocation,
  onSelect,
}: {
  locations: ApiLocation[];
  selectedLocation: ApiLocation | null;
  onSelect: (loc: ApiLocation) => void;
}) {
  const [open, setOpen] = useState(!selectedLocation);

  if (locations.length === 0) {
    return <div className="p-3 bg-gray-50 rounded-xl text-xs text-gray-400 animate-pulse">Loading locations…</div>;
  }

  return (
    <div>
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Pickup Location</p>

      {/* Collapsed pill — shows chosen location, click to expand */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm transition-all ${selectedLocation
          ? "border-[#A1AB74] bg-[#A1AB74]/10 text-gray-900 font-semibold hover:border-[#A1AB74]"
          : "border-dashed border-gray-300 bg-gray-50 text-gray-400 hover:border-[#A1AB74]/50"
          }`}
      >
        <MapPin className={`w-3.5 h-3.5 shrink-0 ${selectedLocation ? "text-[#A1AB74]" : "text-gray-400"}`} />
        <span className="flex-1 text-left truncate">
          {selectedLocation ? selectedLocation.name : "Select pickup location"}
        </span>
        <svg
          className={`w-3.5 h-3.5 shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded location list */}
      {open && (
        <div className="mt-1.5 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="max-h-52 overflow-y-auto divide-y divide-gray-50">
            {(() => {
              const shops = locations.filter(l => l.type !== "vendor");
              const vendors = locations.filter(l => l.type === "vendor");
              return (
                <>
                  {shops.length > 0 && (
                    <>
                      {vendors.length > 0 && <div className="px-4 py-1.5 bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Our Shops</div>}
                      {shops.map((loc) => {
                        const active = selectedLocation?.id === loc.id;
                        return (
                          <button key={loc.id} type="button" onClick={() => { onSelect(loc); setOpen(false); }} className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${active ? "bg-[#A1AB74]/10" : "hover:bg-gray-50"}`}>
                            <MapPin className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${active ? "text-[#A1AB74]" : "text-gray-400"}`} />
                            <span className={`flex-1 text-sm ${active ? "font-bold text-gray-900" : "text-gray-700"}`}>{loc.name}</span>
                            {active && <Check className="w-3.5 h-3.5 text-[#A1AB74] shrink-0" />}
                          </button>
                        );
                      })}
                    </>
                  )}
                  {vendors.length > 0 && (
                    <>
                      <div className="px-4 py-1.5 bg-purple-50 text-[10px] font-bold text-purple-400 uppercase tracking-wider">Partner Vendors</div>
                      {vendors.map((loc) => {
                        const active = selectedLocation?.id === loc.id;
                        return (
                          <button key={loc.id} type="button" onClick={() => { onSelect(loc); setOpen(false); }} className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${active ? "bg-purple-50" : "hover:bg-gray-50"}`}>
                            <MapPin className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${active ? "text-purple-500" : "text-gray-400"}`} />
                            <span className={`flex-1 text-sm ${active ? "font-bold text-gray-900" : "text-gray-700"}`}>{loc.name}</span>
                            {active && <Check className="w-3.5 h-3.5 text-purple-500 shrink-0" />}
                          </button>
                        );
                      })}
                    </>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
// --------------------------------------------------------------------

const howItWorksSteps = [
  { num: "01", title: "Choose Flavors", desc: "Browse this week's limited batch drops and pick your favorites." },
  { num: "02", title: "Select Size", desc: "Pint, quart, or party sizes — mix and match." },
  { num: "03", title: "Pick Location", desc: "Choose Carlisle, Mechanicsburg, or Harrisburg." },
  { num: "04", title: "Pick Up", desc: "We hold orders up to 2 weeks. Don't forget!" },
];

function HowItWorksAccordion() {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-3 border-2 border-white/20 text-white/70 px-6 py-3 rounded-full font-black text-sm hover:border-[#A1AB74]/50 hover:text-white transition-all"
      >
        <span>{open ? "Hide" : "See"} How Pre-Ordering Works</span>
        <motion.svg
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </motion.svg>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 1.2, ease: [0.25, 1, 0.5, 1] }}
            className="overflow-hidden"
          >
            <div className="relative py-16 sm:py-20 mt-8">
              <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-8">
                <div className="text-center mb-14">
                  <p className="text-[#A1AB74] text-sm font-black tracking-[0.2em] uppercase mb-3">Simple Process</p>
                  <h2 className="text-4xl sm:text-5xl font-black text-white">How pre-orders work</h2>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-0">
                  {howItWorksSteps.map((s, i) => {
                    const mtClass = ["lg:mt-0", "lg:mt-6", "lg:mt-2", "lg:mt-8"][i];
                    return (
                      <motion.div
                        key={s.num}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.3 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                        className={`relative text-center px-3 sm:px-6 ${mtClass}`}
                      >
                        {i < 3 && (
                          <svg className="hidden lg:block absolute left-[calc(50%+28px)] h-8" style={{ top: 18, width: "calc(100% - 44px)" }} viewBox="0 0 200 32" preserveAspectRatio="none">
                            <path d={`M0,${i % 2 === 0 ? 4 : 24} Q100,${i % 2 === 0 ? 28 : 0} 200,${i % 2 === 0 ? 18 : 10}`} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2" strokeDasharray="8 5" />
                          </svg>
                        )}
                        <div className="w-12 h-12 border-2 border-[#A1AB74]/70 text-[#A1AB74] rounded-full flex items-center justify-center mx-auto mb-5 text-sm font-black bg-white/10">
                          {s.num}
                        </div>
                        <h3 className="text-base font-black text-white mb-2">{s.title}</h3>
                        <p className="text-sm text-white/80 leading-relaxed">{s.desc}</p>
                      </motion.div>
                    );
                  })}
                </div>
                <p className="text-center text-sm text-white/60 mt-12 max-w-md mx-auto">
                  Orders held up to 2 weeks &middot; Credit by week 3 &middot; Nonrefundable after week 4
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function PreOrder() {
  const { toast } = useToast();
  const { customer } = useCustomerAuth();
  const { data: flavors = [] } = useQuery<ApiFlavour[]>({ queryKey: ["public", "flavours"], queryFn: () => api.getPublicFlavours() });
  const { data: sizes = [] } = useQuery<ApiSize[]>({ queryKey: ["public", "sizes"], queryFn: () => api.getPublicSizes() });
  const { data: allLocations = [] } = useQuery<ApiLocation[]>({ queryKey: ["public", "locations"], queryFn: () => api.getPublicLocations() });
  const { data: products = [] } = useQuery<ApiProduct[]>({ queryKey: ["public", "products"], queryFn: () => api.getPublicProducts() });
  const [selectedLocation, setSelectedLocation] = useState<ApiLocation | null>(loadLocation);
  const { data: activePreOrders = [] } = useQuery<any[]>({
    queryKey: ["active-pre-orders", selectedLocation?.id || null],
    queryFn: () => api.getActivePreOrders(selectedLocation?.id),
    staleTime: 60_000,
  });

  const [step, setStep] = useState<Step>("shopping");
  const [cart, setCart] = useState<CartItem[]>(loadCart);
  const [cartOpen, setCartOpen] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<{ orderNumber: string; totalCents: number; items: CartItem[] } | null>(null);

  // Get unique flavourIds from cart to filter locations by intersection
  const cartFlavourIds = useMemo(() => [...new Set(cart.map(ci => ci.flavour.id))], [cart]);
  const { data: filteredLocations } = useQuery<ApiLocation[]>({
    queryKey: ["pre-order-locations", cartFlavourIds],
    queryFn: () => api.getPreOrderLocations(cartFlavourIds),
    enabled: cartFlavourIds.length > 0,
  });
  // Use filtered locations when cart has items, otherwise show all
  const locations = cartFlavourIds.length > 0 && filteredLocations ? filteredLocations : allLocations;

  // Clear selected location if it's no longer valid
  useEffect(() => {
    if (selectedLocation && locations.length > 0 && !locations.find(l => l.id === selectedLocation.id)) {
      setSelectedLocation(null);
    }
  }, [locations, selectedLocation]);

  // Open cart when navigated here via the navbar cart icon
  useEffect(() => {
    if (sessionStorage.getItem("uc-open-cart")) {
      sessionStorage.removeItem("uc-open-cart");
      setCartOpen(true);
    }
    if (sessionStorage.getItem("uc-goto-checkout") || localStorage.getItem("uc-goto-checkout")) {
      sessionStorage.removeItem("uc-goto-checkout");
      localStorage.removeItem("uc-goto-checkout");
      setStep("checkout");
    }
    const handler = () => setCartOpen(true);
    window.addEventListener("uc-open-cart", handler);
    return () => window.removeEventListener("uc-open-cart", handler);
  }, []);
  const [form, setForm] = useState({ name: "", email: "", phone: "", notes: "", password: "" });
  const [accountMode, setAccountMode] = useState<"guest" | "create" | "login">("guest");

  // Auto-fill form when customer is already authenticated (e.g. after cross-tab password reset)
  useEffect(() => {
    if (customer && !form.email) {
      setForm((prev) => ({
        ...prev,
        name: prev.name || [customer.firstName, customer.lastName].filter(Boolean).join(" "),
        email: prev.email || customer.email,
      }));
      setAccountMode("login");
    }
  }, [customer]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [emailStatus, setEmailStatus] = useState<{ hasAccount?: boolean; needsPasswordReset?: boolean } | null>(null);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [forgotPasswordSent, setForgotPasswordSent] = useState(false);
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const emailCheckRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    id: number;
    code: string;
    description: string;
    type: string;
    value: string;
    discountCents: number;
  } | null>(null);
  const [couponError, setCouponError] = useState("");

  // Shopping filter: all | limited (limited-time specialties) | standard
  const [shopFilter, setShopFilter] = useState<"all" | "limited" | "standard">("all");

  // Per-card state: selected size id per flavor
  const [sizeSelections, setSizeSelections] = useState<Record<number, number>>({});
  // Per-card state: quantity per flavor
  const [qtySelections, setQtySelections] = useState<Record<number, number>>({});

  // Persist cart to localStorage
  useEffect(() => {
    saveCart(cart);
  }, [cart]);

  // Persist selected location
  useEffect(() => {
    if (selectedLocation) {
      localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(selectedLocation));
    }
  }, [selectedLocation]);

  const orderMutation = useMutation({
    mutationFn: (data: any) => api.createOrder(data),
  });

  const couponMutation = useMutation({
    mutationFn: ({ code, totalCents }: { code: string; totalCents: number }) =>
      api.validateCoupon(code, totalCents),
    onSuccess: (data: any) => {
      setAppliedCoupon({ ...data.coupon, discountCents: data.discountCents });
      setCouponError("");
    },
    onError: (err: Error) => {
      setCouponError(err.message);
      setAppliedCoupon(null);
    },
  });

  // Square Web Payments SDK
  const cardRef = useRef<any>(null);
  const cardContainerRef = useRef<HTMLDivElement>(null);
  const [squareReady, setSquareReady] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [squareAppId, setSquareAppId] = useState<string | null>(null);

  // Load Square SDK and initialize card form when entering checkout
  useEffect(() => {
    if (step !== "checkout") return;

    let cancelled = false;

    (async () => {
      try {
        // Fetch app ID
        const data = await api.getSquareAppId(selectedLocation?.id);
        if (cancelled || !data?.appId) return;
        setSquareAppId(data.appId);

        // Determine SDK URL from environment
        const env = data.environment || "sandbox";
        const sdkUrl = env === "production"
          ? "https://web.squarecdn.com/v1/square.js"
          : "https://sandbox.web.squarecdn.com/v1/square.js";

        // Load SDK script if not already loaded
        if (!(window as any).Square) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement("script");
            script.src = sdkUrl;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("Failed to load Square SDK"));
            document.head.appendChild(script);
          });
        }
        if (cancelled) return;

        // Initialize payments
        const payments = (window as any).Square.payments(data.appId, data.locationId);
        const card = await payments.card();
        if (cancelled) return;

        if (cardContainerRef.current) {
          await card.attach(cardContainerRef.current);
          cardRef.current = card;
          setSquareReady(true);
        }
      } catch (e) {
        console.error("[SQUARE] Failed to initialize payment form:", e);
        setPaymentError("Payment system unavailable. Please refresh or try again later.");
      }
    })();

    return () => {
      cancelled = true;
      if (cardRef.current) {
        cardRef.current.destroy?.();
        cardRef.current = null;
        setSquareReady(false);
      }
    };
  }, [step, selectedLocation?.id]);

  const steps: { key: Step; label: string }[] = [
    { key: "shopping", label: "Shop" },
    { key: "location", label: "Location" },
    { key: "checkout", label: "Checkout" },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === step);

  // Build a stock lookup: { "flavourId-sizeId" => product }
  const stockMap = new Map<string, ApiProduct>();
  products.forEach((p) => stockMap.set(`${p.flavourId}-${p.sizeId}`, p));

  // Get effective price for a flavour+size combo (priceOverride takes priority over size price)
  const getEffectivePrice = (flavourId: number, sizeId: number, sizePrice: string): number => {
    const product = stockMap.get(`${flavourId}-${sizeId}`);
    if (product?.priceOverride) return parseFloat(product.priceOverride);
    return parseFloat(sizePrice);
  };

  // Flavor-level stock: a flavor is "sold out" if ALL size combos are sold out
  const getFlavorStockStatus = useCallback((flavourId: number): "available" | "low" | "sold-out" => {
    const flavorProducts = products.filter((p) => p.flavourId === flavourId);
    if (flavorProducts.length === 0) return "available"; // no product entries = available
    const allSoldOut = flavorProducts.every((p) => p.manageStock && p.stockQuantity <= 0 && !p.available);
    if (allSoldOut) return "sold-out";
    const anyLow = flavorProducts.some((p) => p.manageStock && p.stockQuantity > 0 && p.stockQuantity <= p.lowStockThreshold);
    if (anyLow) return "low";
    return "available";
  }, [products]);

  // Check if a specific flavor+size combo is available and its stock status
  const getProductStock = (flavourId: number, sizeId: number) => {
    const p = stockMap.get(`${flavourId}-${sizeId}`);
    if (!p) return { available: true, low: false, soldOut: false };
    const soldOut = p.manageStock && p.stockQuantity <= 0;
    const low = p.manageStock && p.stockQuantity > 0 && p.stockQuantity <= p.lowStockThreshold;
    return { available: p.available && !soldOut, low, soldOut };
  };

  const handleLocationSelect = (loc: ApiLocation) => {
    setSelectedLocation(loc);
    setStep("checkout");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const addToCart = (flavour: ApiFlavour, size: ApiSize, qty: number) => {
    const price = getEffectivePrice(flavour.id, size.id, size.price);
    const existing = cart.findIndex(
      (item) => item.flavour.id === flavour.id && item.size.id === size.id
    );
    if (existing >= 0) {
      const newCart = [...cart];
      newCart[existing].quantity += qty;
      newCart[existing].effectivePrice = price;
      setCart(newCart);
    } else {
      setCart([...cart, { flavour, size, quantity: qty, effectivePrice: price }]);
    }
    toast({
      title: `${flavour.name} added!`,
      description: `${qty}× ${size.name} — $${(price * qty).toFixed(2)}`,
    });
  };

  const updateCartQty = (index: number, delta: number) => {
    const newCart = [...cart];
    newCart[index].quantity += delta;
    if (newCart[index].quantity <= 0) {
      newCart.splice(index, 1);
    }
    setCart(newCart);
  };

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.effectivePrice ?? parseFloat(item.size.price)) * item.quantity, 0);
  const discountAmount = appliedCoupon ? appliedCoupon.discountCents / 100 : 0;
  const finalTotal = Math.max(0, cartTotal - discountAmount);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleApplyCoupon = () => {
    if (!couponCode.trim()) return;
    couponMutation.mutate({
      code: couponCode,
      totalCents: Math.round(cartTotal * 100),
    });
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError("");
  };

  // Check if email has an existing account (debounced on blur)
  const handleEmailBlur = () => {
    if (emailCheckRef.current) clearTimeout(emailCheckRef.current);
    const email = form.email.trim();
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setEmailStatus(null);
      return;
    }
    emailCheckRef.current = setTimeout(async () => {
      try {
        const result = await api.customerCheckEmail(email);
        setEmailStatus(result);
        // Auto-suggest sign-in if they have an account
        if (result.hasAccount && !result.needsPasswordReset && accountMode === "guest") {
          setAccountMode("login");
        }
      } catch {
        setEmailStatus(null);
      }
    }, 300);
  };

  // Inline forgot password handler
  const handleForgotPassword = async () => {
    const email = form.email.trim();
    if (!email) return;
    setForgotPasswordLoading(true);
    try {
      await api.customerForgotPassword(email);
      setForgotPasswordSent(true);
      // Store return intent so user comes back to checkout after reset (use localStorage for cross-tab access)
      localStorage.setItem("uc-return-to-checkout", "1");
    } catch {
      // Always show success to prevent email enumeration
      setForgotPasswordSent(true);
      localStorage.setItem("uc-return-to-checkout", "1");
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = "Name is required";
    if (!form.email.trim()) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) newErrors.email = "Invalid email";
    if (!form.phone.trim()) newErrors.phone = "Phone is required";
    if (!customer && accountMode !== "guest") {
      if (!form.password) newErrors.password = "Password is required";
      else if (form.password.length < 8) newErrors.password = "Password must be at least 8 characters";
    }
    if (!agreedToTerms) newErrors.terms = "You must agree to the terms and conditions";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (cart.length === 0) return;
    if (!selectedLocation) return;

    setPaymentError("");

    // Tokenize card if Square payment is available
    let sourceId: string | undefined;
    if (squareReady && cardRef.current) {
      try {
        const result = await cardRef.current.tokenize();
        if (result.status === "OK") {
          sourceId = result.token;
        } else {
          setPaymentError("Payment failed. Please check your card details and try again.");
          return;
        }
      } catch (err) {
        setPaymentError("Payment processing error. Please try again.");
        return;
      }
    }

    orderMutation.mutate(
      {
        locationId: selectedLocation.id,
        customerName: form.name,
        customerEmail: form.email,
        customerPhone: form.phone,
        notes: form.notes,
        couponCode: appliedCoupon?.code || undefined,
        sourceId,
        accountMode: customer ? "guest" : accountMode,
        password: !customer && accountMode !== "guest" ? form.password : undefined,
        items: cart.map((item) => ({
          flavourName: item.flavour.name,
          sizeName: item.size.name,
          price: item.effectivePrice ?? parseFloat(item.size.price),
          quantity: item.quantity,
        })),
      },
      {
        onSuccess: (data: any) => {
          setConfirmedOrder({
            orderNumber: data.orderNumber,
            totalCents: data.totalCents,
            items: [...cart],
          });
          setStep("confirmation");
          setCart([]);
          localStorage.removeItem(CART_STORAGE_KEY);
          localStorage.removeItem(LOCATION_STORAGE_KEY);
          window.scrollTo({ top: 0, behavior: "smooth" });
        },
        onError: (err: any) => {
          const code = err?.code || "";
          if (code === "ACCOUNT_EXISTS") {
            toast({ title: "Account exists", description: "An account already exists with this email. Switching to sign in.", variant: "destructive" });
            setAccountMode("login");
          } else if (code === "NEEDS_PASSWORD_RESET") {
            toast({ title: "Password reset needed", description: "You had an account on our old website. Please reset your password to continue.", variant: "destructive" });
            setEmailStatus({ hasAccount: true, needsPasswordReset: true });
          } else if (code === "NO_ACCOUNT") {
            toast({ title: "No account found", description: "No account found with this email. Try creating an account or continue as guest.", variant: "destructive" });
            setAccountMode("guest");
          } else if (code === "INVALID_CREDENTIALS") {
            toast({ title: "Incorrect password", description: "The password you entered is incorrect. Try again or reset your password.", variant: "destructive" });
          } else if (typeof code === "string" && code.startsWith("PAYMENT_")) {
            const msg = err.message || "Payment was not completed. Your order was not placed.";
            setPaymentError(msg);
            toast({ title: "Payment not completed", description: msg, variant: "destructive" });
          } else {
            setPaymentError(err.message || "Please try again.");
            toast({ title: "Order failed", description: err.message || "Please try again.", variant: "destructive" });
          }
        },
      },
    );
  };

  // --- Shared cart item list with inline quantity controls ---
  const CartItemList = ({ compact = false }: { compact?: boolean }) => (
    <>
      {cart.map((item, i) => (
        <div key={`${item.flavour.id}-${item.size.id}`} className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0">
          <img
            src={getFlavorImage(item.flavour)}
            alt={item.flavour.name}
            className={`rounded-xl object-cover shrink-0 ${compact ? "w-10 h-10" : "w-12 h-12"}`}
          />
          <div className="flex-1 min-w-0">
            <p className={`font-bold text-gray-900 truncate ${compact ? "text-xs" : "text-sm"}`}>{item.flavour.name}</p>
            <p className="text-xs text-gray-500">{item.size.name}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => updateCartQty(i, -1)}
              className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
              aria-label="Decrease quantity"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="w-6 text-center text-sm font-bold">{item.quantity}</span>
            <button
              onClick={() => updateCartQty(i, 1)}
              className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
              aria-label="Increase quantity"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`font-bold text-gray-900 ${compact ? "text-xs" : "text-sm"}`}>
              ${((item.effectivePrice ?? parseFloat(item.size.price)) * item.quantity).toFixed(2)}
            </span>
            <button
              onClick={() => removeFromCart(i)}
              className="w-6 h-6 rounded-full hover:bg-red-100 hover:text-red-600 flex items-center justify-center transition-colors text-gray-400"
              aria-label="Remove item"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      ))}
    </>
  );

  // --- Build a map of flavourId → pre-order window for grouping ---
  const preOrderWindowMap = useMemo(() => {
    const map = new Map<number, { pickupDate: string | null; pickupEndDate: string | null; preOrderEnd: string | null; acceptingOrders: boolean }>();
    for (const po of activePreOrders) {
      if (po.flavourId) map.set(po.flavourId, { pickupDate: po.pickupDate, pickupEndDate: po.pickupEndDate, preOrderEnd: po.preOrderEnd, acceptingOrders: po.acceptingOrders ?? true });
    }
    return map;
  }, [activePreOrders]);

  const fmtShort = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" });

  // Group cart items by pickup key
  const cartGroups = useMemo(() => {
    const groups: { key: string; label: string; sublabel: string | null; isPreOrder: boolean; items: { item: CartItem; index: number }[] }[] = [];
    const groupMap = new Map<string, typeof groups[number]>();

    cart.forEach((item, index) => {
      const window = preOrderWindowMap.get(item.flavour.id);
      if (window?.pickupDate) {
        const start = fmtShort(window.pickupDate);
        const end = window.pickupEndDate ? fmtShort(window.pickupEndDate) : null;
        const key = `preorder-${window.pickupDate}`;
        const label = `Pickup ${start}${end ? ` – ${end}` : ""}`;
        const sublabel = window.preOrderEnd ? `Order by ${fmtShort(window.preOrderEnd)}` : null;
        if (!groupMap.has(key)) {
          const group = { key, label, sublabel, isPreOrder: true, items: [] as { item: CartItem; index: number }[] };
          groupMap.set(key, group);
          groups.push(group);
        }
        groupMap.get(key)!.items.push({ item, index });
      } else {
        const key = "ready-now";
        if (!groupMap.has(key)) {
          const group = { key, label: "Ready for pickup", sublabel: null, isPreOrder: false, items: [] as { item: CartItem; index: number }[] };
          groupMap.set(key, group);
          groups.push(group);
        }
        groupMap.get(key)!.items.push({ item, index });
      }
    });

    return groups;
  }, [cart, preOrderWindowMap]);

  // --- Grouped cart list for checkout sidebar ---
  const GroupedCartList = () => (
    <div className="space-y-1">
      {cartGroups.map((group) => (
        <div key={group.key}>
          {/* Group header — only show when there are multiple groups or pre-order items */}
          {(cartGroups.length > 1 || group.isPreOrder) && (
            <div className={`flex items-center gap-2 py-2 ${group.isPreOrder ? "" : ""}`}>
              <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${group.isPreOrder
                ? "bg-[#A1AB74]/10 text-[#7a8356]"
                : "bg-blue-50 text-blue-600"
                }`}>
                {group.isPreOrder ? (
                  <><CalendarDays className="w-3 h-3" /> {group.label}</>
                ) : (
                  <><Check className="w-3 h-3" /> {group.label}</>
                )}
              </span>
              {group.sublabel && (
                <span className="text-[10px] text-gray-400">{group.sublabel}</span>
              )}
            </div>
          )}
          {/* Items in group */}
          {group.items.map(({ item, index }) => (
            <div key={`${item.flavour.id}-${item.size.id}`} className="flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-0">
              <img
                src={getFlavorImage(item.flavour)}
                alt={item.flavour.name}
                className="w-10 h-10 rounded-xl object-cover shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 text-xs truncate">{item.flavour.name}</p>
                <p className="text-[11px] text-gray-500">{item.size.name}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => updateCartQty(index, -1)} className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors" aria-label="Decrease">
                  <Minus className="w-2.5 h-2.5" />
                </button>
                <span className="w-5 text-center text-xs font-bold">{item.quantity}</span>
                <button onClick={() => updateCartQty(index, 1)} className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors" aria-label="Increase">
                  <Plus className="w-2.5 h-2.5" />
                </button>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="font-bold text-gray-900 text-xs">
                  ${((item.effectivePrice ?? parseFloat(item.size.price)) * item.quantity).toFixed(2)}
                </span>
                <button onClick={() => removeFromCart(index)} className="w-5 h-5 rounded-full hover:bg-red-100 hover:text-red-600 flex items-center justify-center text-gray-400" aria-label="Remove">
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );

  // --- Confirmation screen ---
  if (step === "confirmation") {
    // Build pickup date range from active pre-order windows
    const pickupWindow = activePreOrders.length > 0 ? activePreOrders[0] : null;
    const pickupDateStr = pickupWindow?.pickupDate
      ? new Date(pickupWindow.pickupDate).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "America/New_York" })
      : null;
    const pickupEndStr = pickupWindow?.pickupEndDate
      ? new Date(pickupWindow.pickupEndDate).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "America/New_York" })
      : null;

    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-32">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-4xl font-black text-gray-900 mb-2">Order Confirmed!</h1>
            {confirmedOrder && (
              <p className="text-lg text-[#A1AB74] font-bold">Order #{confirmedOrder.orderNumber}</p>
            )}
            <p className="text-gray-500 leading-relaxed mt-4">
              Thanks, {form.name}! A confirmation email has been sent to {form.email} with
              your full order details.
            </p>
          </div>

          {/* Order Items Summary */}
          {confirmedOrder && confirmedOrder.items.length > 0 && (
            <div className="bg-gray-50 rounded-2xl p-6 mb-6">
              <h3 className="font-bold text-gray-900 mb-3">Your Items</h3>
              <div className="space-y-2">
                {confirmedOrder.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-gray-700">
                      {item.flavour.name} – {item.size.name} × {item.quantity}
                    </span>
                    <span className="font-medium text-gray-900">
                      ${((item.effectivePrice ?? parseFloat(item.size.price)) * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
                <div className="border-t pt-2 mt-2 flex justify-between font-bold">
                  <span>Total</span>
                  <span>${(confirmedOrder.totalCents / 100).toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Pickup Details */}
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6 mb-6">
            <h3 className="font-bold text-green-900 mb-3">📍 Pickup Details</h3>
            {selectedLocation && (
              <div className="space-y-1 text-sm text-green-800">
                <p className="font-semibold text-base">{selectedLocation.name}</p>
                <p>{selectedLocation.address}, {selectedLocation.city}, {selectedLocation.state} {selectedLocation.zip}</p>
                {selectedLocation.phone && <p>📞 {selectedLocation.phone}</p>}
              </div>
            )}
            {pickupDateStr && (
              <p className="text-sm text-green-800 mt-3">
                <strong>📅 Pickup Window:</strong>{" "}
                {pickupEndStr ? `${pickupDateStr} through ${pickupEndStr}` : `Starting ${pickupDateStr}`}
              </p>
            )}
          </div>

          {/* Hours Reminder */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 text-left mb-6">
            <div className="flex gap-3">
              <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-blue-800 mb-1">Check Store Hours</p>
                <p className="text-blue-700 text-sm">
                  Hours vary by location. Please check our{" "}
                  <a href="/locations" className="underline font-semibold">locations page</a>{" "}
                  or call ahead to confirm store hours before visiting for pickup.
                </p>
              </div>
            </div>
          </div>

          {/* Policy Reminder */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-left mb-8">
            <div className="flex gap-3">
              <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-800 mb-1">Important Reminder</p>
                <p className="text-amber-700 text-sm">
                  We hold orders for up to 2 weeks. If not picked up by week 3, you may
                  request a credit. After week 4, the order is nonrefundable.
                </p>
              </div>
            </div>
          </div>

          <div className="text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-[#A1AB74] text-white px-8 py-4 rounded-full font-bold hover:bg-[#8a9360] transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Home
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f9f8f4]">
      <SEO
        title="Pre-Order Ice Cream Online | Urban Churn — Pickup in Central PA"
        description="Pre-order Urban Churn's craft ice cream online. Choose from rotating seasonal flavors, select your size, pick your Central PA location, and pick up at your convenience."
        keywords="pre-order ice cream, order ice cream online, ice cream pickup PA, ice cream delivery, seasonal ice cream flavors, pint ice cream order, Urban Churn pre-order"
        canonical="/pre-order"
        jsonLd={flavors.length > 0 ? {
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "Urban Churn Ice Cream Flavors",
          description: "Browse and pre-order craft ice cream flavors from Urban Churn",
          numberOfItems: flavors.length,
          itemListElement: flavors.map((f: any, i: number) => ({
            "@type": "ListItem",
            position: i + 1,
            item: {
              "@type": "Product",
              name: f.name,
              description: f.description,
              url: `https://urbanchurn.com/pre-order/${f.slug}`,
              image: f.imageUrl || undefined,
              brand: { "@type": "Brand", name: "Urban Churn" },
              offers: {
                "@type": "Offer",
                price: f.basePrice,
                priceCurrency: "USD",
                availability: f.available ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
              },
            },
          })),
        } : undefined}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Pre-Order", url: "/pre-order" },
        ]}
      />
      <Navbar />

      {/* Page header */}
      <div className="relative pt-40 pb-16 overflow-hidden">
        <img src={`${BASE}images/uc-pints-bg.jpg`} alt="Urban Churn craft ice cream pints available for pre-order" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-[#111118]/80" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-black text-white">
            Pre-Order Ice Cream
          </h1>
          <p className="text-white/50 mt-3 text-base sm:text-lg">
            Browse flavours, pick your size, and add to cart
          </p>
          <div className="mt-6">
            <HowItWorksAccordion />
          </div>
        </div>
      </div>

      {/* Steps indicator */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center py-3 sm:py-4 gap-0.5 sm:gap-1">
            {steps.map((s, i) => (
              <button
                key={s.key}
                onClick={() => {
                  if (currentStepIndex >= i) setStep(s.key);
                }}
                className="flex items-center min-w-0"
                disabled={currentStepIndex < i}
              >
                <div className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${step === s.key
                  ? "bg-[#A1AB74] text-white"
                  : currentStepIndex > i
                    ? "bg-green-100 text-green-700 cursor-pointer hover:bg-green-200"
                    : "text-gray-400"
                  }`}>
                  {currentStepIndex > i ? (
                    <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  ) : (
                    <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 flex items-center justify-center text-[10px] sm:text-xs shrink-0">
                      {i + 1}
                    </span>
                  )}
                  <span>{s.label}</span>
                </div>
                {i < steps.length - 1 && (
                  <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 text-gray-300 mx-0.5 shrink-0" />
                )}
              </button>
            ))}

            {/* Cart button */}
            <button
              onClick={() => setCartOpen(true)}
              className="ml-auto flex items-center gap-1.5 sm:gap-2 bg-gray-900 text-white px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold relative shrink-0"
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="hidden sm:inline">Cart</span>
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#A1AB74] text-white text-xs rounded-full flex items-center justify-center font-bold">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile cart drawer (Sheet) */}
      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
          <SheetHeader>
            <SheetTitle className="font-black text-xl">Your Cart ({cartCount})</SheetTitle>
            <SheetDescription className="text-sm text-gray-500">
              {cart.length === 0 ? "Your cart is empty" : `${cartCount} item${cartCount !== 1 ? "s" : ""} — $${cartTotal.toFixed(2)}`}
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto mt-4">
            {cart.length === 0 ? (
              <div className="text-center py-16">
                <ShoppingBag className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400">Browse flavours and add to cart</p>
              </div>
            ) : (
              <GroupedCartList />
            )}
          </div>
          {cart.length > 0 && (
            <div className="border-t border-gray-100 pt-4 mt-4 space-y-3">
              <div className="flex justify-between font-black text-lg">
                <span>Total</span>
                <span>${cartTotal.toFixed(2)}</span>
              </div>

              {/* Pickup location — collapsed pill, expands to drop-up on click */}
              <CartLocationPicker
                locations={locations}
                selectedLocation={selectedLocation}
                onSelect={setSelectedLocation}
              />

              <button
                onClick={() => {
                  if (!selectedLocation) return;
                  setCartOpen(false);
                  if (step === "shopping") {
                    setStep("checkout");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }
                }}
                disabled={!selectedLocation}
                className="w-full bg-[#A1AB74] text-white py-3 rounded-full font-bold text-sm hover:bg-[#8a9360] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {step === "shopping" ? (selectedLocation ? "Proceed to Checkout →" : "Select a location to continue") : "Continue"}
              </button>
              {step !== "shopping" && (
                <button
                  onClick={() => { setCartOpen(false); setStep("shopping"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  className="w-full text-[#A1AB74] py-2 font-bold text-sm hover:underline"
                >
                  ← Continue Shopping
                </button>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-8 sm:py-12 overflow-x-hidden">
        {/* Step 1: Shopping — Product Grid */}
        {step === "shopping" && (
          <div>
            <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
              <div>
                <h2 className="text-3xl font-black text-gray-900 mb-2">Choose your flavours</h2>
                <p className="text-gray-500">Pick a size, set your quantity, and add to cart. Add as many as you like!</p>
              </div>
              {cart.length > 0 && (
                <button
                  onClick={() => { setStep("location"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  className="flex items-center gap-2 bg-[#A1AB74] text-white px-6 py-3 rounded-full font-bold text-sm hover:bg-[#8a9360] transition-colors shrink-0"
                >
                  Proceed to Checkout
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Shopping filter tabs */}
            <div className="flex gap-2 mb-6">
              {([
                { key: "all" as const, label: "All Flavours" },
                { key: "limited" as const, label: "Limited Time Specialties" },
                { key: "standard" as const, label: "Standard Flavours" },
              ]).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setShopFilter(tab.key)}
                  className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${shopFilter === tab.key
                    ? "bg-[#A1AB74] text-white shadow-sm"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {flavors
                .filter((flavor) => {
                  if (shopFilter === "all") return true;
                  const limitedTags = new Set(["limited", "seasonal", "coming-soon", "adventurous"]);
                  if (shopFilter === "limited") return limitedTags.has(flavor.tag);
                  return !limitedTags.has(flavor.tag); // standard
                })
                .map((flavor) => {
                  const flavorStock = getFlavorStockStatus(flavor.id);
                  const flavorPreOrderWindow = preOrderWindowMap.get(flavor.id);
                  const preOrderClosed = flavorPreOrderWindow && !flavorPreOrderWindow.acceptingOrders;
                  const isDisabled = !flavor.available || flavorStock === "sold-out" || !!preOrderClosed;
                  const selectedSizeId = sizeSelections[flavor.id] || (sizes.length > 0 ? sizes[0].id : 0);
                  const selectedSize = sizes.find((s) => s.id === selectedSizeId) || sizes[0];
                  const qty = qtySelections[flavor.id] || 1;
                  const productStock = selectedSize ? getProductStock(flavor.id, selectedSize.id) : { available: true, low: false, soldOut: false };
                  const canAdd = !isDisabled && selectedSize && productStock.available;

                  return (
                    <div
                      key={flavor.id}
                      className={`bg-white rounded-3xl overflow-hidden border-2 transition-all ${isDisabled ? "opacity-60 border-gray-100" : "border-gray-100 hover:border-[#A1AB74]/40 hover:shadow-lg"}`}
                    >
                      {/* Product image */}
                      <Link href={`/pre-order/${flavor.slug}`} className="block">
                        <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                          <img
                            src={getFlavorImage(flavor)}
                            alt={flavor.name}
                            className="w-full h-full object-cover"
                          />
                          {/* Tag badge */}
                          <span className={`absolute top-3 left-3 text-xs font-bold px-3 py-1 rounded-full ${TAG_CLASSES[flavor.tag] || "bg-gray-100 text-gray-600"}`}>
                            {TAG_LABELS[flavor.tag] || flavor.tag}
                          </span>
                          {/* Pre-order / Available now badge */}
                          {(() => {
                            const poWindow = preOrderWindowMap.get(flavor.id);
                            if (poWindow?.pickupDate && poWindow.acceptingOrders) {
                              const start = fmtShort(poWindow.pickupDate);
                              const end = poWindow.pickupEndDate ? fmtShort(poWindow.pickupEndDate) : null;
                              return (
                                <span className="absolute bottom-3 left-3 bg-indigo-600/90 backdrop-blur-sm text-white text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                                  <CalendarDays className="w-3 h-3" />
                                  Pre-Order · Pickup {start}{end ? ` – ${end}` : ""}
                                </span>
                              );
                            }
                            if (poWindow) {
                              return (
                                <span className="absolute bottom-3 left-3 bg-gray-700/90 backdrop-blur-sm text-white text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                                  <Clock className="w-3 h-3" />
                                  Pre-Orders Closed
                                </span>
                              );
                            }
                            return (
                              <span className="absolute bottom-3 left-3 bg-emerald-600/90 backdrop-blur-sm text-white text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                                <Check className="w-3 h-3" />
                                Available Now
                              </span>
                            );
                          })()}
                          {/* Stock badges */}
                          {flavorStock === "sold-out" && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                              <span className="bg-red-600 text-white text-sm font-black px-4 py-2 rounded-full">Sold Out</span>
                            </div>
                          )}
                          {flavorStock === "low" && !isDisabled && (
                            <span className="absolute top-3 right-3 bg-orange-500 text-white text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Low Stock
                            </span>
                          )}
                          {!flavor.available && flavorStock !== "sold-out" && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                              <span className="bg-gray-800 text-white text-sm font-bold px-4 py-2 rounded-full">Unavailable</span>
                            </div>
                          )}
                          {preOrderClosed && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                              <span className="bg-gray-800 text-white text-sm font-bold px-4 py-2 rounded-full">Pre-Orders Closed</span>
                            </div>
                          )}
                        </div>
                      </Link>

                      {/* Product info & controls */}
                      <div className="p-5">
                        <Link href={`/pre-order/${flavor.slug}`} className="block mb-4">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="text-lg font-black text-gray-900 leading-tight">{flavor.name}</h3>
                            <span className="text-2xl ml-2 shrink-0">{flavor.emoji}</span>
                          </div>
                          <p className="text-gray-500 text-sm line-clamp-2">{flavor.description}</p>
                        </Link>

                        {!isDisabled && sizes.length > 0 && (
                          <>
                            {/* Size selector */}
                            <div className="flex gap-1.5 mb-3">
                              {sizes.map((size) => {
                                const sizeStock = getProductStock(flavor.id, size.id);
                                return (
                                  <button
                                    key={size.id}
                                    onClick={() => setSizeSelections({ ...sizeSelections, [flavor.id]: size.id })}
                                    disabled={sizeStock.soldOut}
                                    className={`flex-1 px-2 py-2 rounded-xl text-xs font-bold transition-all text-center ${selectedSizeId === size.id
                                      ? "bg-[#A1AB74] text-white shadow-sm"
                                      : sizeStock.soldOut
                                        ? "bg-gray-100 text-gray-300 cursor-not-allowed"
                                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                      }`}
                                  >
                                    <div>{size.name}</div>
                                    <div className={selectedSizeId === size.id ? "text-white/80" : "text-gray-400"}>{size.volumeOz}oz</div>
                                  </button>
                                );
                              })}
                            </div>

                            {/* Price + quantity + add to cart */}
                            <div className="flex items-center gap-3">
                              <p className="text-2xl font-black text-gray-900">
                                ${selectedSize ? getEffectivePrice(flavor.id, selectedSize.id, selectedSize.price).toFixed(2) : "—"}
                              </p>
                              <div className="flex items-center gap-1 ml-auto">
                                <button
                                  onClick={() => setQtySelections({ ...qtySelections, [flavor.id]: Math.max(1, qty - 1) })}
                                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                                  aria-label="Decrease"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <span className="w-8 text-center font-bold text-sm">{qty}</span>
                                <button
                                  onClick={() => setQtySelections({ ...qtySelections, [flavor.id]: qty + 1 })}
                                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                                  aria-label="Increase"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Specific size stock warning */}
                            {productStock.low && (
                              <p className="text-xs text-orange-600 mt-2 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> Only a few left in this size
                              </p>
                            )}

                            <button
                              onClick={() => {
                                if (canAdd && selectedSize) {
                                  addToCart(flavor, selectedSize, qty);
                                  setQtySelections({ ...qtySelections, [flavor.id]: 1 });
                                }
                              }}
                              disabled={!canAdd}
                              className="mt-3 w-full flex items-center justify-center gap-2 bg-gray-900 text-white py-2.5 rounded-full text-sm font-bold hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                            >
                              <ShoppingBag className="w-4 h-4" />
                              Add to Cart
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Gift Card CTA */}
            <div className="mt-12">
              <GiftCardSection />
            </div>

            {/* Bottom checkout CTA */}
            {cart.length > 0 && (
              <div className="mt-12 text-center">
                <div className="inline-flex flex-col items-center bg-white rounded-3xl border border-gray-100 shadow-lg p-8">
                  <p className="text-gray-500 text-sm mb-1">{cartCount} item{cartCount !== 1 ? "s" : ""} in cart</p>
                  <p className="text-3xl font-black text-gray-900 mb-4">${cartTotal.toFixed(2)}</p>
                  <button
                    onClick={() => { setStep("location"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                    className="flex items-center gap-2 bg-[#A1AB74] text-white px-8 py-3.5 rounded-full font-bold hover:bg-[#8a9360] transition-colors"
                  >
                    Proceed to Checkout
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Location */}
        {step === "location" && (
          <div>
            <button
              onClick={() => { setStep("shopping"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              ← Add more flavours
            </button>
            <h2 className="text-3xl font-black text-gray-900 mb-2">Select pickup location</h2>
            <p className="text-gray-500 mb-8">Where would you like to pick up your order?</p>

            {/* Cart summary strip */}
            <div className="mb-6 p-3 sm:p-4 bg-white rounded-2xl border border-gray-100 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <ShoppingBag className="w-5 h-5 text-[#A1AB74]" />
                <span className="font-bold text-sm text-gray-900">{cartCount} item{cartCount !== 1 ? "s" : ""}</span>
                <span className="text-gray-400">|</span>
                <span className="font-black text-gray-900">${cartTotal.toFixed(2)}</span>
              </div>
              <button onClick={() => setCartOpen(true)} className="text-[#A1AB74] text-sm font-bold hover:underline">
                View Cart
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {locations.map((loc) => (
                <button
                  key={loc.id}
                  onClick={() => handleLocationSelect(loc)}
                  className="text-left p-4 sm:p-7 rounded-2xl sm:rounded-3xl border-2 bg-white border-gray-100 hover:border-[#A1AB74] hover:shadow-lg transition-all group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-[#A1AB74]/10 rounded-2xl flex items-center justify-center text-[#A1AB74] shrink-0 group-hover:bg-[#A1AB74] group-hover:text-white transition-colors">
                      <MapPin className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-black text-gray-900 mb-1">{loc.name}</h3>
                      <p className="text-gray-500 text-sm mb-1">{loc.address}, {loc.city}, {loc.state} {loc.zip}</p>
                      {loc.hours && (
                        <p className="text-[#A1AB74] text-xs font-medium whitespace-pre-line">{formatHoursCompact(loc.hours)}</p>
                      )}
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-[#A1AB74] transition-colors mt-1" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Checkout */}
        {step === "checkout" && (
          <div className="max-w-5xl mx-auto">
            <button
              onClick={() => { setStep("location"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Change location
            </button>
            <h2 className="text-3xl font-black text-gray-900 mb-8">Complete your order</h2>

            <div className="lg:grid lg:grid-cols-[1fr_400px] lg:gap-10 lg:items-start">
              {/* LEFT: Contact form */}
              <form onSubmit={handleSubmit} className="bg-white rounded-2xl sm:rounded-3xl border border-gray-100 p-4 sm:p-8">
                <h3 className="font-black text-gray-900 mb-6 text-xl">Your details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Jane Smith"
                      className={`w-full px-4 py-3 rounded-xl border ${errors.name ? "border-red-400" : "border-gray-200"} focus:outline-none focus:border-[#A1AB74] transition-colors text-sm`}
                    />
                    {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="(717) 555-0123"
                      className={`w-full px-4 py-3 rounded-xl border ${errors.phone ? "border-red-400" : "border-gray-200"} focus:outline-none focus:border-[#A1AB74] transition-colors text-sm`}
                    />
                    {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => { setForm({ ...form, email: e.target.value }); setEmailStatus(null); }}
                      onBlur={handleEmailBlur}
                      placeholder="jane@example.com"
                      className={`w-full px-4 py-3 rounded-xl border ${errors.email ? "border-red-400" : "border-gray-200"} focus:outline-none focus:border-[#A1AB74] transition-colors text-sm`}
                    />
                    {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}

                    {/* Migrated user banner */}
                    {emailStatus?.needsPasswordReset && (
                      <div className="mt-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                        <p className="text-sm font-semibold text-amber-800 mb-1">Welcome back to Urban Churn!</p>
                        <p className="text-xs text-amber-700 mb-3">
                          We have a brand new website and ordering system. To access your account, you'll need to set a new password. Don't worry — your cart is saved and will be right here when you get back!
                        </p>
                        <button
                          type="button"
                          onClick={() => { setForgotPasswordOpen(true); setForgotPasswordSent(false); }}
                          className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors"
                        >
                          Reset My Password
                        </button>
                      </div>
                    )}

                    {/* Returning customer hint */}
                    {emailStatus?.hasAccount && !emailStatus?.needsPasswordReset && accountMode === "guest" && (
                      <p className="text-xs text-[#7a8356] mt-2">
                        We found your account! <button type="button" onClick={() => setAccountMode("login")} className="underline font-medium">Sign in</button> to earn loyalty points.
                      </p>
                    )}
                  </div>

                  {/* Account options */}
                  <div className="sm:col-span-2">
                    {customer ? (
                      <div className="flex items-center gap-3 p-4 bg-[#A1AB74]/10 border border-[#A1AB74]/30 rounded-xl">
                        <div className="w-8 h-8 rounded-full bg-[#A1AB74]/20 flex items-center justify-center shrink-0">
                          <Check className="w-4 h-4 text-[#A1AB74]" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900">Signed in as <strong className="truncate">{customer.email}</strong></p>
                          <p className="text-xs text-gray-500">You'll earn loyalty points on this order</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <label className="block text-sm font-bold text-gray-700 mb-3">Account</label>
                        <div className="flex flex-col sm:flex-row gap-2">
                          {([
                            { value: "guest", label: "Continue as guest" },
                            { value: "create", label: "Create an account" },
                            { value: "login", label: "Sign in" },
                          ] as const).map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => { setAccountMode(opt.value); setErrors((prev) => ({ ...prev, password: "" })); }}
                              className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${accountMode === opt.value
                                ? "border-[#A1AB74] bg-[#A1AB74]/10 text-[#7a8356]"
                                : "border-gray-200 text-gray-500 hover:border-gray-300"
                                }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                        {accountMode === "create" && (
                          <p className="text-xs text-gray-400 mt-2">Save your details for faster checkout next time and track your orders.</p>
                        )}
                      </>
                    )}
                  </div>

                  {/* Password field (shown for create/login when not already authenticated) */}
                  {!customer && accountMode !== "guest" && (
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        Password *
                      </label>
                      <input
                        type="password"
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        placeholder={accountMode === "create" ? "Create a password (min 8 characters)" : "Enter your password"}
                        className={`w-full px-4 py-3 rounded-xl border ${errors.password ? "border-red-400" : "border-gray-200"} focus:outline-none focus:border-[#A1AB74] transition-colors text-sm`}
                      />
                      {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
                      {accountMode === "login" && (
                        <button
                          type="button"
                          onClick={() => { setForgotPasswordOpen(true); setForgotPasswordSent(false); }}
                          className="text-xs text-[#A1AB74] hover:underline mt-1.5 inline-block"
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                  )}

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Special Instructions (optional)
                    </label>
                    <textarea
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      placeholder="Any allergies, special requests, or notes..."
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-[#A1AB74] transition-colors text-sm resize-none"
                    />
                  </div>
                </div>

                {/* Coupon code */}
                <div className="mt-6 mb-6">
                  <h3 className="font-bold text-gray-900 mb-3 text-sm">Coupon Code</h3>
                  {appliedCoupon ? (
                    <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl p-3">
                      <div>
                        <p className="text-sm font-bold text-green-800">
                          <Ticket className="w-4 h-4 inline mr-1" />
                          {appliedCoupon.code}
                        </p>
                        <p className="text-xs text-green-600">
                          {appliedCoupon.description || `${appliedCoupon.type === "percentage" ? `${appliedCoupon.value}% off` : `$${parseFloat(appliedCoupon.value).toFixed(2)} off`}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-green-700">-${discountAmount.toFixed(2)}</span>
                        <button type="button" onClick={handleRemoveCoupon} className="text-green-600 hover:text-red-500">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                          placeholder="Coupon code"
                          className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm font-mono focus:outline-none focus:border-[#A1AB74]"
                        />
                        <button
                          type="button"
                          onClick={handleApplyCoupon}
                          disabled={couponMutation.isPending || !couponCode.trim()}
                          className="px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                        >
                          Apply
                        </button>
                      </div>
                      {couponError && (
                        <p className="text-xs text-red-500 mt-1">{couponError}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Square Card Payment */}
                {squareAppId && (
                  <div className="mb-6">
                    <h3 className="font-bold text-gray-900 mb-3 text-sm">Payment</h3>
                    <div
                      ref={cardContainerRef}
                      className="rounded-xl border border-gray-200 p-3 min-h-[50px]"
                    />
                    {!squareReady && (
                      <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" /> Loading payment form...
                      </p>
                    )}
                    {paymentError && (
                      <p className="text-red-500 text-xs mt-2 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> {paymentError}
                      </p>
                    )}
                  </div>
                )}

                <div className="mt-2 p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                  <p className="text-sm text-amber-700">
                    <strong>Pre-order terms:</strong> We hold orders up to 2 weeks. If not picked
                    up by week 3, a credit may be requested. After week 4, the order is
                    nonrefundable. Payment is collected at pickup.
                  </p>
                </div>

                <label className={`flex items-start gap-3 mt-4 p-3 rounded-xl border cursor-pointer transition-colors ${errors.terms ? "border-red-300 bg-red-50" : agreedToTerms ? "border-[#A1AB74]/40 bg-[#A1AB74]/5" : "border-gray-200 bg-gray-50 hover:border-gray-300"}`}>
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => { setAgreedToTerms(e.target.checked); if (e.target.checked) setErrors((prev) => { const { terms, ...rest } = prev; return rest; }); }}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#A1AB74] focus:ring-[#A1AB74] accent-[#A1AB74] shrink-0"
                  />
                  <span className="text-sm text-gray-600 leading-snug">
                    I agree to the <Link href="/terms" className="text-[#A1AB74] font-semibold hover:underline" target="_blank">Terms &amp; Conditions</Link> and <Link href="/privacy" className="text-[#A1AB74] font-semibold hover:underline" target="_blank">Privacy Policy</Link>, including the pre-order refund policy.
                  </span>
                </label>
                {errors.terms && <p className="text-red-500 text-xs mt-1 ml-1">{errors.terms}</p>}

                <button
                  type="submit"
                  disabled={cart.length === 0 || orderMutation.isPending || (squareAppId !== null && !squareReady)}
                  className="w-full flex items-center justify-center gap-2 sm:gap-3 bg-[#A1AB74] disabled:bg-gray-300 text-white px-4 sm:px-8 py-3.5 sm:py-4 rounded-full text-sm sm:text-lg font-bold transition-all hover:bg-[#8a9360] hover:shadow-lg disabled:cursor-not-allowed mt-4"
                >
                  {orderMutation.isPending ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Processing Payment...</>
                  ) : (
                    <><ShoppingBag className="w-5 h-5" /> {cart.length === 0 ? "Add items to cart first" : `Pay & Place Order — $${finalTotal.toFixed(2)}`}</>
                  )}
                </button>

                {!squareAppId && (
                  <p className="text-center text-xs text-gray-400 mt-4">
                    Payment will be collected at pickup.
                  </p>
                )}
              </form>

              {/* RIGHT: Order summary */}
              <div className="lg:sticky lg:top-28 space-y-4 mt-6 lg:mt-0">
                {/* Cart summary with inline editing */}
                {cart.length > 0 ? (
                  <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-100 p-4 sm:p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-black text-gray-900">Your Cart</h3>
                      <button
                        onClick={() => { setStep("shopping"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                        className="text-[#A1AB74] text-sm font-bold hover:underline"
                      >
                        + Add More
                      </button>
                    </div>
                    <GroupedCartList />
                    <div className="flex justify-between items-center pt-4 mt-2">
                      <p className="font-black text-gray-900">Subtotal</p>
                      <p className="text-2xl font-black text-gray-900">${cartTotal.toFixed(2)}</p>
                    </div>

                    {appliedCoupon && (
                      <div className="flex justify-between items-center pt-4 mt-2 border-t border-gray-100">
                        <p className="font-black text-[#A1AB74]">Total After Discount</p>
                        <p className="text-2xl font-black text-[#A1AB74]">${finalTotal.toFixed(2)}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-3xl border border-gray-100 p-10 text-center">
                    <ShoppingBag className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-400 font-medium">Your cart is empty</p>
                    <button
                      onClick={() => { setStep("shopping"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                      className="mt-4 text-[#A1AB74] font-bold text-sm"
                    >
                      Add items →
                    </button>
                  </div>
                )}

                {/* Location info */}
                <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-100 p-4 sm:p-6 flex items-center gap-3 sm:gap-4">
                  <div className="w-10 h-10 bg-[#A1AB74]/10 rounded-xl flex items-center justify-center text-[#A1AB74] shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 mb-0.5">Pickup location</p>
                    <p className="font-bold text-gray-900 truncate">{selectedLocation?.name}</p>
                    <p className="text-sm text-gray-500 truncate">{selectedLocation?.address}, {selectedLocation?.city}, {selectedLocation?.state} {selectedLocation?.zip}</p>
                    {cartGroups.filter((g) => g.isPreOrder).map((g) => (
                      <p key={g.key} className="text-xs text-[#A1AB74] font-semibold mt-1 flex items-center gap-1">
                        <CalendarDays className="w-3 h-3 shrink-0" />
                        {g.label}
                      </p>
                    ))}
                  </div>
                  <button
                    onClick={() => { setStep("location"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                    className="text-[#A1AB74] text-xs font-bold hover:underline shrink-0"
                  >
                    Change
                  </button>
                </div>

              </div>
            </div>
          </div>
        )}
      </div>

      <Footer />

      {/* Inline Forgot Password Dialog */}
      <Dialog open={forgotPasswordOpen} onOpenChange={setForgotPasswordOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Your Password</DialogTitle>
          </DialogHeader>
          {forgotPasswordSent ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-[#A1AB74]/20 flex items-center justify-center">
                <Check className="w-7 h-7 text-[#A1AB74]" />
              </div>
              <p className="text-gray-900 font-medium mb-2">Check your email!</p>
              <p className="text-gray-500 text-sm mb-1">
                We sent a password reset link to <strong>{form.email}</strong>.
              </p>
              <p className="text-gray-400 text-xs mb-1">
                Your cart is saved and will be waiting for you when you get back.
              </p>
              <p className="text-gray-400 text-xs">
                After resetting your password, come back to this tab — we'll sign you in automatically.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-gray-600 text-sm">
                We'll send a password reset link to your email. Your cart will be saved while you reset your password.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-[#A1AB74] transition-colors text-sm"
                  placeholder="jane@example.com"
                />
              </div>
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={forgotPasswordLoading || !form.email.trim()}
                className="w-full py-3 bg-[#A1AB74] text-white rounded-xl font-medium text-sm hover:bg-[#8a9463] transition-colors disabled:opacity-50"
              >
                {forgotPasswordLoading ? "Sending..." : "Send Reset Link"}
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
