import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import CakePreview from "@/components/CakePreview";
import { api } from "@/lib/api";

const BASE = import.meta.env.BASE_URL;

/* ─────────── Color swatches for flavors ─────────── */
const FLAVOR_SWATCHES: Record<string, string> = {
    Vanilla: "#F5E6D3", Chocolate: "#6D4C41", "Double Chocolate": "#4E342E",
    Funfetti: "#FFF9C4", "Red Velvet": "#A52A2A", Lemon: "#FFF176",
    Strawberry: "#FFB3BA", "Strawberries & Cream": "#FFD1D6",
    "Cookies 'N Cream": "#E0E0E0", "Cookies & Cream": "#E0E0E0",
    "Peanut Butter Cup": "#D2B48C",
    "Mint Chocolate Chip": "#A5D6A7",
    "Salted Caramel": "#DEB887", "S'mores": "#8D6E63",
    "Carrot Cake": "#FF8A65", Marble: "#D7CCC8", Almond: "#EFEBE9",
};
const BUTTERCREAM_SWATCHES: Record<string, string> = {
    Vanilla: "#FEFBF7", "Double Chocolate": "#4E342E", "Cream Cheese": "#FFFDE7",
    Strawberry: "#FFB3BA", Lemon: "#FFF9C4",
    "Salted Caramel": "#D2691E", "Cookies N Cream": "#E0E0E0", Almond: "#EFEBE9",
};

/* ─────────── Confetti engine ─────────── */
function useConfetti(active: boolean) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fire = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        canvas.width = canvas.offsetWidth * 2;
        canvas.height = canvas.offsetHeight * 2;
        ctx.scale(2, 2);
        const W = canvas.offsetWidth, H = canvas.offsetHeight;
        const COLORS = ["#EC407A", "#42A5F5", "#FFEE58", "#66BB6A", "#AB47BC", "#FF7043", "#26C6DA", "#d4a853"];
        const particles: { x: number; y: number; vx: number; vy: number; r: number; c: string; rot: number; rv: number; life: number }[] = [];
        for (let i = 0; i < 120; i++) {
            particles.push({
                x: W / 2 + (Math.random() - 0.5) * 60,
                y: H * 0.3,
                vx: (Math.random() - 0.5) * 12,
                vy: -Math.random() * 14 - 4,
                r: 3 + Math.random() * 4,
                c: COLORS[Math.floor(Math.random() * COLORS.length)],
                rot: Math.random() * 360,
                rv: (Math.random() - 0.5) * 12,
                life: 1,
            });
        }
        let raf: number;
        const step = () => {
            ctx.clearRect(0, 0, W, H);
            let alive = false;
            for (const p of particles) {
                if (p.life <= 0) continue;
                alive = true;
                p.vy += 0.35; // gravity
                p.vx *= 0.985; // drag
                p.x += p.vx;
                p.y += p.vy;
                p.rot += p.rv;
                p.life -= 0.006;
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate((p.rot * Math.PI) / 180);
                ctx.globalAlpha = Math.max(0, p.life);
                ctx.fillStyle = p.c;
                ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 0.6);
                ctx.restore();
            }
            if (alive) raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
        return () => cancelAnimationFrame(raf);
    }, []);

    useEffect(() => {
        if (active) {
            return fire();
        }
        return undefined;
    }, [active, fire]);

    return canvasRef;
}

// ---------- constants (matching original BakeryBuilder plugin exactly) ----------

// Pre-Stacked Ice Cream Cake — 5 flavors
const PRE_STACKED_FLAVORS = [
    { name: "Cookies 'N Cream", icon: "🍪" },
    { name: "Peanut Butter Cup", icon: "🥜" },
    { name: "Strawberries & Cream", icon: "🍓" },
    { name: "Funfetti", icon: "🎉" },
    { name: "Vanilla", icon: "⚪" },
];

// Custom Ice Cream Cake — Cake/Cookie Base (4 flavors)
const CUSTOM_IC_CAKE_FLAVORS = [
    { name: "Vanilla", icon: "🍰" },
    { name: "Chocolate", icon: "🍫" },
    { name: "Red Velvet", icon: "❤️" },
    { name: "Funfetti", icon: "🎉" },
];

// Custom Ice Cream Cake — Ice Cream Flavor (7 flavors)
const CUSTOM_IC_ICE_CREAM_FLAVORS = [
    { name: "Cookies 'N Cream", icon: "🍪" },
    { name: "Peanut Butter Cup", icon: "🥜" },
    { name: "Strawberries & Cream", icon: "🍓" },
    { name: "Funfetti", icon: "🎉" },
    { name: "Vanilla", icon: "⚪" },
    { name: "Chocolate", icon: "🍫" },
    { name: "Mint Chocolate Chip", icon: "🍃" },
];

// Custom Ice Cream Cake — Filling (no extra charge)
const IC_FILLING_OPTIONS = [
    { name: "", icon: "🚫", label: "No Filling" },
    { name: "Raspberry Jam", icon: "🫙", label: "Raspberry Jam" },
    { name: "Chocolate Ganache", icon: "🍫", label: "Chocolate Ganache" },
    { name: "Cherry Filling", icon: "🍒", label: "Cherry Filling" },
    { name: "Salted Caramel", icon: "🍬", label: "Salted Caramel" },
    { name: "Peanut Butter", icon: "🥜", label: "Peanut Butter" },
];

// Baked Cake & Cupcake Flavors (11 flavors — shared)
const BAKED_FLAVORS = [
    { name: "Vanilla", icon: "🍰" },
    { name: "Double Chocolate", icon: "🍫" },
    { name: "Strawberry", icon: "🍓" },
    { name: "Cookies & Cream", icon: "🍪" },
    { name: "Salted Caramel", icon: "🍬" },
    { name: "S'mores", icon: "🔥" },
    { name: "Carrot Cake", icon: "🥕" },
    { name: "Marble", icon: "🎨" },
    { name: "Funfetti", icon: "🎉" },
    { name: "Almond", icon: "🌰" },
    { name: "Lemon", icon: "🍋" },
];

// Buttercream Frosting Flavors (for Custom Cake & Custom Cupcakes)
const BUTTERCREAM_FLAVORS = [
    { name: "Vanilla", icon: "⚪" },
    { name: "Double Chocolate", icon: "🍫" },
    { name: "Salted Caramel", icon: "🍬" },
    { name: "Almond", icon: "🌰" },
    { name: "Cookies N Cream", icon: "🍪" },
    { name: "Strawberry", icon: "🍓" },
    { name: "Cream Cheese", icon: "🧀" },
    { name: "Lemon", icon: "🍋" },
];

// Baked Cake & Cupcake Filling ($15 cake / $10 per dozen cupcakes)
const BAKED_FILLING_FLAVORS = [
    { name: "Strawberry", icon: "🍓" },
    { name: "Cherry", icon: "🍒" },
    { name: "Marshmallow", icon: "☁️" },
    { name: "Chocolate Fudge", icon: "🍫" },
    { name: "Raspberry", icon: "🫙" },
    { name: "Cream Cheese", icon: "🧀" },
    { name: "Cookies N Cream", icon: "🍪" },
];

// Frosting types for ice cream cakes
const FROSTING_TYPES = ["Buttercream", "Whipped Topping", "None"];
const FROSTING_COVERAGE = ["Top only", "All sides"];

// IC Cake Topper Messages (dropdown, +$8.50)
const TOPPER_MESSAGES_IC = ["Happy Birthday", "Happy Anniversary", "Congratulations"];

// Baked Cake Topper (included, no extra charge)
const TOPPER_OPTIONS_BAKED = [
    { name: "", label: "No Topper", icon: "🚫" },
    { name: "Happy Birthday", label: "Happy Birthday", icon: "🎂" },
    { name: "Happy Anniversary", label: "Happy Anniversary", icon: "💕" },
    { name: "Oh Baby", label: "Oh Baby", icon: "👶" },
    { name: "Congratulations", label: "Congratulations", icon: "🎉" },
];

// Natural Frosting Colors (ice cream cake add-on, +$10)
const FROSTING_COLORS = [
    { name: "Pink", color: "#FFB6C1", gradient: "linear-gradient(135deg, #FFB6C1, #FF69B4)", label: "Pink (Beet)" },
    { name: "Purple", color: "#DDA0DD", gradient: "linear-gradient(135deg, #DDA0DD, #BA55D3)", label: "Purple (Blueberry)" },
    { name: "Blue", color: "#87CEEB", gradient: "linear-gradient(135deg, #87CEEB, #4682B4)", label: "Blue (Spirulina)" },
    { name: "Green", color: "#90EE90", gradient: "linear-gradient(135deg, #90EE90, #32CD32)", label: "Green (Matcha)" },
    { name: "Yellow", color: "#FFE87C", gradient: "linear-gradient(135deg, #FFE87C, #FFD700)", label: "Yellow (Turmeric)" },
    { name: "Orange", color: "#FFB347", gradient: "linear-gradient(135deg, #FFB347, #FF8C00)", label: "Orange (Carrot)" },
];

const CAKE_SIZES = [
    { label: '6" Cake', value: "6-inch", price: "$75", serves: "10–12" },
    { label: '7" Cake', value: "7-inch", price: "$100", serves: "16–20" },
    { label: '8" Cake', value: "8-inch", price: "$125", serves: "26–30" },
];

const ORDER_TYPES = [
    {
        name: "Pre-Stacked Ice Cream Cake",
        price: "$65",
        desc: "2-layer, 7-inch (serves 14–18 people)",
        icon: "🍰",
    },
    {
        name: "Custom Ice Cream Cake",
        price: "Starting at $75",
        desc: "2-layer, 7-inch (serves 14–18 people)",
        icon: "🎂",
    },
    {
        name: "Custom Cake",
        price: "Starting at $75",
        desc: "3-layer baked cake, made to order",
        icon: "🎀",
    },
    {
        name: "Custom Cupcakes",
        price: "$36 per dozen",
        desc: "Baked cupcakes with buttercream frosting",
        icon: "🧁",
    },
];

// ---------- helpers ----------

function getMinDate(): string {
    const d = new Date();
    d.setHours(d.getHours() + 96);
    return d.toISOString().split("T")[0];
}

function formatCents(cents: number): string {
    return `$${(cents / 100).toFixed(2)}`;
}

function toSlug(s: string) {
    return s.toLowerCase().replace(/[' &]/g, "-").replace(/--+/g, "-");
}

function calculatePrice(
    orderType: string,
    details: Record<string, any>,
    addOns: Record<string, any>,
): number {
    let c = 0;
    switch (orderType) {
        case "Pre-Stacked Ice Cream Cake":
            c = 6500;
            break;
        case "Custom Ice Cream Cake":
            c = 7500;
            break;
        case "Custom Cake": {
            const s = details.cakeSize;
            c = s === "8-inch" ? 12500 : s === "7-inch" ? 10000 : 7500;
            if (details.filling && details.fillingFlavor) c += 1500;
            break;
        }
        case "Custom Cupcakes": {
            const q = Math.max(1, parseInt(details.quantity) || 1);
            c = 3600 * q;
            if (details.filling && details.fillingFlavor) c += 1000 * q;
            break;
        }
    }
    if (orderType.includes("Ice Cream")) {
        if (addOns.topper && addOns.topperMessage) c += 850;
        if (addOns.colorAccents && addOns.frostingColor) c += 1000;
    }
    return c;
}

// ---------- component ----------

export default function BakeryOrder() {
    const [step, setStep] = useState(1);

    // customer info
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [pickupDate, setPickupDate] = useState("");
    const [pickupTime, setPickupTime] = useState("");
    const [referral, setReferral] = useState("");

    // order type
    const [orderType, setOrderType] = useState("");

    // order details
    const [cakeFlavor, setCakeFlavor] = useState("");
    const [iceCreamFlavor, setIceCreamFlavor] = useState("");
    const [frostingType, setFrostingType] = useState("None");
    const [frostingCoverage, setFrostingCoverage] = useState("Top only");
    const [frostingFlavor, setFrostingFlavor] = useState("");
    const [cakeSize, setCakeSize] = useState("7-inch");
    const [filling, setFilling] = useState(false);
    const [fillingFlavor, setFillingFlavor] = useState("");
    const [quantity, setQuantity] = useState(1);
    const [iceCreamFilling, setIceCreamFilling] = useState(""); // for Custom IC cake (no charge)
    const [bakedCakeTopper, setBakedCakeTopper] = useState(""); // for Custom Cake (free)
    const [decorativeAccents, setDecorativeAccents] = useState(false); // for Custom Cupcakes

    // add-ons (ice cream cake types)
    const [topper, setTopper] = useState(false);
    const [topperMessage, setTopperMessage] = useState("");
    const [colorAccents, setColorAccents] = useState(false);
    const [frostingColor, setFrostingColor] = useState("");

    // step 4
    const [specialRequests, setSpecialRequests] = useState("");
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    // submission
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState<{ orderNumber: string; totalPriceCents: number } | null>(null);

    const orderDetails = useMemo(() => {
        const d: Record<string, any> = {};
        switch (orderType) {
            case "Pre-Stacked Ice Cream Cake":
                d.iceCreamFlavor = iceCreamFlavor;
                d.frostingType = frostingType;
                d.frostingCoverage = frostingCoverage;
                break;
            case "Custom Ice Cream Cake":
                d.cakeFlavor = cakeFlavor;
                d.iceCreamFlavor = iceCreamFlavor;
                d.frostingType = frostingType;
                d.frostingCoverage = frostingCoverage;
                if (iceCreamFilling) d.filling = iceCreamFilling;
                break;
            case "Custom Cake":
                d.cakeFlavor = cakeFlavor;
                d.frostingFlavor = frostingFlavor;
                d.cakeSize = cakeSize;
                d.filling = filling;
                if (filling) d.fillingFlavor = fillingFlavor;
                if (bakedCakeTopper) d.topper = bakedCakeTopper;
                break;
            case "Custom Cupcakes":
                d.cakeFlavor = cakeFlavor;
                d.frostingFlavor = frostingFlavor;
                d.quantity = quantity;
                d.filling = filling;
                if (filling) d.fillingFlavor = fillingFlavor;
                if (decorativeAccents) d.decorativeAccents = true;
                break;
        }
        return d;
    }, [orderType, cakeFlavor, iceCreamFlavor, frostingType, frostingCoverage, frostingFlavor, cakeSize, filling, fillingFlavor, quantity, iceCreamFilling, bakedCakeTopper, decorativeAccents]);

    const addOns = useMemo(
        () => ({ topper, topperMessage, colorAccents, frostingColor }),
        [topper, topperMessage, colorAccents, frostingColor],
    );

    const totalCents = useMemo(
        () => (orderType ? calculatePrice(orderType, orderDetails, addOns) : 0),
        [orderType, orderDetails, addOns],
    );

    const canProceedStep: Record<number, boolean> = {
        1: !!(name && phone && email && pickupDate && pickupTime),
        2: !!orderType,
        3: (() => {
            switch (orderType) {
                case "Pre-Stacked Ice Cream Cake":
                    return !!iceCreamFlavor;
                case "Custom Ice Cream Cake":
                    return !!(cakeFlavor && iceCreamFlavor && frostingType);
                case "Custom Cake":
                    return !!(cakeFlavor && frostingFlavor && cakeSize);
                case "Custom Cupcakes":
                    return !!(cakeFlavor && frostingFlavor);
                default:
                    return false;
            }
        })(),
        4: true,
    };

    async function handleSubmit() {
        setSubmitting(true);
        setError("");
        try {
            const fd = new FormData();
            fd.append("customerName", name);
            fd.append("customerPhone", phone);
            fd.append("customerEmail", email);
            fd.append("pickupDate", pickupDate);
            fd.append("pickupTime", pickupTime);
            fd.append("referral", referral);
            fd.append("orderType", orderType);
            fd.append("orderDetails", JSON.stringify(orderDetails));
            fd.append("addOns", JSON.stringify(addOns));
            fd.append("specialRequests", specialRequests);
            if (photoFile) fd.append("inspirationPhoto", photoFile);
            const res = await api.submitBakeryOrder(fd);
            setSuccess({ orderNumber: res.orderNumber, totalPriceCents: res.totalPriceCents });
        } catch (err: any) {
            setError(err.message || "Something went wrong. Please try again.");
        } finally {
            setSubmitting(false);
        }
    }

    // ---- shared styling ----
    const inputCls =
        "w-full border border-[#e0ddd5] rounded-xl px-4 py-3 text-[#1a1a1f] text-sm focus:outline-none focus:border-[#d4a853] transition-colors bg-white";
    const labelCls = "block text-xs font-black tracking-wider uppercase text-[#666] mb-2";

    // ---- success screen ----
    if (success) {
        return (
            <SuccessScreen
                orderNumber={success.orderNumber}
                totalPriceCents={success.totalPriceCents}
                email={email}
            />
        );
    }

    // ---- main form ----
    return (
        <div className="min-h-screen" style={{ fontFamily: "'Space Grotesk', 'Poppins', sans-serif" }}>
            <SEO
                title="Order Custom Cakes | Urban Churn — Ice Cream Cakes & Baked Cakes"
                description="Order custom ice cream cakes and baked cakes from Urban Churn. Choose from pre-stacked or fully customizable cakes in 6, 7, or 8 inch sizes. Natural ingredients, no artificial colors."
                keywords="custom ice cream cake, order cake online, birthday cake, ice cream cake order, baked cake PA, cupcake order, cake delivery Central PA"
                canonical="/bakery"
                jsonLd={{
                    "@context": "https://schema.org",
                    "@type": "Product",
                    name: "Urban Churn Custom Cakes",
                    description: "Custom ice cream cakes and baked cakes made with natural ingredients. Available in 6, 7, and 8 inch sizes.",
                    brand: { "@type": "Brand", name: "Urban Churn" },
                    offers: {
                        "@type": "AggregateOffer",
                        lowPrice: "75",
                        highPrice: "125",
                        priceCurrency: "USD",
                        availability: "https://schema.org/InStock"
                    }
                }}
                breadcrumbs={[
                    { name: "Home", url: "/" },
                    { name: "Bakery", url: "/bakery" },
                ]}
            />
            <style>{`
                @keyframes fadeSlideIn{0%{opacity:0;transform:translateY(12px)}100%{opacity:1;transform:none}}
                @keyframes scaleIn{0%{transform:scale(0)}60%{transform:scale(1.15)}100%{transform:scale(1)}}
                @keyframes pricePulse{0%{transform:scale(1)}40%{transform:scale(1.08)}100%{transform:scale(1)}}
            `}</style>
            <Navbar />

            {/* Hero */}
            <section className="relative bg-[#111118] text-white overflow-hidden">
                <div
                    className="absolute inset-0 opacity-40"
                    style={{
                        backgroundImage: `url(${BASE}images/DSC_0000-2-44_4x5.jpg)`,
                        backgroundSize: "cover",
                        backgroundPosition: "center 40%",
                    }}
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-[#111118] via-[#111118]/60 to-transparent" />
                </div>
                <div className="relative max-w-7xl mx-auto px-4 sm:px-8 pt-36 pb-20 md:pt-44 md:pb-24">
                    <p className="text-[#d4a853] text-sm font-black tracking-[0.2em] uppercase mb-4">
                        Ice Cream Cakes & Cupcakes
                    </p>
                    <h1 className="text-5xl md:text-7xl font-black leading-none tracking-tight mb-6">
                        Bakery<br />Builder.
                    </h1>
                    <p className="text-white/60 text-lg md:text-xl max-w-xl leading-relaxed">
                        Design your perfect ice cream cake, cupcakes, or custom baked cake.
                        Choose your flavors, frosting, and toppings — we'll build it for you.
                    </p>
                </div>
            </section>

            {/* Form */}
            <section className="bg-[#f9f8f4] py-16 md:py-24">
                <div className="max-w-7xl mx-auto px-8">
                    <div className="grid lg:grid-cols-3 gap-10">
                        {/* Left: form steps */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Step indicator */}
                            <div className="flex items-center gap-1 md:gap-2 mb-4">
                                {[1, 2, 3, 4].map((s, i) => {
                                    const labels = ["Info", "Type", "Build", "Notes"];
                                    const isActive = s === step;
                                    const isDone = s < step;
                                    return (
                                        <div key={s} className="flex items-center gap-1 md:gap-2">
                                            {i > 0 && <div className={`w-6 md:w-10 h-0.5 rounded transition-colors duration-300 ${isDone ? "bg-[#A1AB74]" : "bg-[#e0ddd5]"}`} />}
                                            <button
                                                type="button"
                                                onClick={() => { if (s <= step) setStep(s); }}
                                                className={`group flex items-center gap-2 transition-all duration-300`}
                                                style={{ cursor: s <= step ? "pointer" : "default" }}
                                            >
                                                <span
                                                    className={`w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center text-xs font-black transition-all duration-300 ${isActive
                                                        ? "bg-[#A1AB74] text-white shadow-lg shadow-[#A1AB74]/30 scale-110"
                                                        : isDone
                                                            ? "bg-[#A1AB74] text-white"
                                                            : "bg-white border-2 border-[#e0ddd5] text-[#999]"
                                                        }`}
                                                >
                                                    {isDone ? (
                                                        <svg className="w-4 h-4 animate-[scaleIn_0.3s_cubic-bezier(0.68,-0.55,0.265,1.55)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    ) : s}
                                                </span>
                                                <span className={`hidden md:inline text-xs font-black tracking-wide transition-colors duration-300 ${isActive ? "text-[#A1AB74]" : isDone ? "text-[#A1AB74]/70" : "text-[#999]"
                                                    }`}>{labels[i]}</span>
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Step 1 — Customer Info */}
                            {step === 1 && (
                                <div className="bg-white rounded-2xl p-8 md:p-10 shadow-sm space-y-6 animate-[fadeSlideIn_0.4s_ease_both]">
                                    <div>
                                        <h2 className="text-2xl font-black text-[#1a1a1f] mb-1">Your Information</h2>
                                        <p className="text-[#666] text-sm">We'll use this to contact you about your order.</p>
                                    </div>
                                    <div className="grid md:grid-cols-2 gap-5">
                                        <div>
                                            <label className={labelCls}>Full Name *</label>
                                            <input required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Jane Smith" />
                                        </div>
                                        <div>
                                            <label className={labelCls}>Phone *</label>
                                            <input required value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" className={inputCls} placeholder="(717) 555-0123" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className={labelCls}>Email *</label>
                                        <input required value={email} onChange={(e) => setEmail(e.target.value)} type="email" className={inputCls} placeholder="you@email.com" />
                                    </div>
                                    <div className="grid md:grid-cols-2 gap-5">
                                        <div>
                                            <label className={labelCls}>Pickup Date *</label>
                                            <input
                                                required
                                                type="date"
                                                min={getMinDate()}
                                                value={pickupDate}
                                                onChange={(e) => setPickupDate(e.target.value)}
                                                className={inputCls}
                                            />
                                            <p className="text-xs text-[#999] mt-1">
                                                Minimum 4 days lead time required
                                            </p>
                                        </div>
                                        <div>
                                            <label className={labelCls}>Pickup Time *</label>
                                            <input
                                                required
                                                type="time"
                                                value={pickupTime}
                                                onChange={(e) => setPickupTime(e.target.value)}
                                                className={inputCls}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className={labelCls}>How did you hear about us?</label>
                                        <input value={referral} onChange={(e) => setReferral(e.target.value)} className={inputCls} placeholder="Optional" />
                                    </div>
                                    <button
                                        type="button"
                                        disabled={!canProceedStep[1]}
                                        onClick={() => setStep(2)}
                                        className="w-full bg-[#A1AB74] text-white py-4 rounded-full font-black text-sm hover:bg-[#8a9360] transition-colors disabled:opacity-40"
                                    >
                                        Continue — Choose Order Type →
                                    </button>
                                </div>
                            )}

                            {/* Step 2 — Order Type */}
                            {step === 2 && (
                                <div className="bg-white rounded-2xl p-8 md:p-10 shadow-sm space-y-6 animate-[fadeSlideIn_0.4s_ease_both]">
                                    <div>
                                        <h2 className="text-2xl font-black text-[#1a1a1f] mb-1">Choose Your Order</h2>
                                        <p className="text-[#666] text-sm">Select the type of cake or cupcakes you'd like.</p>
                                    </div>
                                    <div className="grid gap-4">
                                        {ORDER_TYPES.map((ot) => {
                                            return (
                                                <button
                                                    key={ot.name}
                                                    type="button"
                                                    onClick={() => {
                                                        setOrderType(ot.name);
                                                        // Reset customization when switching type
                                                        setCakeFlavor("");
                                                        setIceCreamFlavor("");
                                                        setFrostingType("None");
                                                        setFrostingCoverage("Top only");
                                                        setFrostingFlavor("");
                                                        setCakeSize("7-inch");
                                                        setFilling(false);
                                                        setFillingFlavor("");
                                                        setQuantity(1);
                                                        setTopper(false);
                                                        setTopperMessage("");
                                                        setColorAccents(false);
                                                        setFrostingColor("");
                                                        setIceCreamFilling("");
                                                        setBakedCakeTopper("");
                                                        setDecorativeAccents(false);
                                                    }}
                                                    className={`flex items-start gap-4 p-5 rounded-xl border-2 text-left transition-all duration-300 ${orderType === ot.name
                                                        ? "border-[#A1AB74] bg-gradient-to-r from-[#A1AB74]/10 to-[#A1AB74]/5 scale-[1.02] shadow-md shadow-[#A1AB74]/10"
                                                        : "border-[#e0ddd5] hover:border-[#d4a853]/50 hover:-translate-y-[2px] hover:shadow-sm"
                                                        }`}
                                                    style={{ transitionTimingFunction: "cubic-bezier(0.68, -0.55, 0.265, 1.55)" }}
                                                >
                                                    <span className="text-3xl">{ot.icon}</span>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-3">
                                                            <span className="font-black text-[#1a1a1f]">{ot.name}</span>
                                                            <span className="text-[#d4a853] font-black text-sm">{ot.price}</span>
                                                        </div>
                                                        <p className="text-[#666] text-sm mt-1">{ot.desc}</p>
                                                    </div>
                                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-1 ${orderType === ot.name ? "border-[#A1AB74] bg-[#A1AB74]" : "border-[#ccc]"
                                                        }`}>
                                                        {orderType === ot.name && (
                                                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        )}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <div className="flex gap-3">
                                        <button type="button" onClick={() => setStep(1)} className="flex-1 border border-[#e0ddd5] text-[#666] py-4 rounded-full font-black text-sm hover:bg-[#f2f0e8] transition-colors">
                                            ← Back
                                        </button>
                                        <button
                                            type="button"
                                            disabled={!canProceedStep[2]}
                                            onClick={() => setStep(3)}
                                            className="flex-[2] bg-[#A1AB74] text-white py-4 rounded-full font-black text-sm hover:bg-[#8a9360] transition-colors disabled:opacity-40"
                                        >
                                            Continue — Customize →
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Step 3 — Customize */}
                            {step === 3 && (
                                <div className="bg-white rounded-2xl p-8 md:p-10 shadow-sm space-y-6 animate-[fadeSlideIn_0.4s_ease_both]">
                                    <div>
                                        <h2 className="text-2xl font-black text-[#1a1a1f] mb-1">Build Your {orderType}</h2>
                                        <p className="text-[#666] text-sm">Choose your flavors and options below.</p>
                                    </div>

                                    {/* Pre-Stacked Ice Cream Cake */}
                                    {orderType === "Pre-Stacked Ice Cream Cake" && (
                                        <>
                                            <FlavorCardGrid label="Ice Cream Flavor *" items={PRE_STACKED_FLAVORS} value={iceCreamFlavor} onChange={setIceCreamFlavor} />
                                            <RadioRow label="Frosting" options={FROSTING_TYPES} value={frostingType} onChange={setFrostingType} helpText="Frosting covers the entire cake on all exposed sides." />
                                            {frostingType !== "None" && (
                                                <RadioRow label="Frosting Coverage" options={FROSTING_COVERAGE} value={frostingCoverage} onChange={setFrostingCoverage} />
                                            )}
                                            <IceCreamAddOns
                                                topper={topper} setTopper={setTopper}
                                                topperMessage={topperMessage} setTopperMessage={setTopperMessage}
                                                colorAccents={colorAccents} setColorAccents={setColorAccents}
                                                frostingColor={frostingColor} setFrostingColor={setFrostingColor}
                                            />
                                        </>
                                    )}

                                    {/* Custom Ice Cream Cake */}
                                    {orderType === "Custom Ice Cream Cake" && (
                                        <>
                                            <FlavorCardGrid label="Cookie / Cake Base Flavor *" items={CUSTOM_IC_CAKE_FLAVORS} value={cakeFlavor} onChange={setCakeFlavor} />
                                            <FlavorCardGrid label="Ice Cream Flavor *" items={CUSTOM_IC_ICE_CREAM_FLAVORS} value={iceCreamFlavor} onChange={setIceCreamFlavor} />
                                            <RadioRow label="Frosting *" options={FROSTING_TYPES} value={frostingType} onChange={setFrostingType} helpText="Frosting covers the entire cake on all exposed sides." />
                                            {frostingType !== "None" && (
                                                <RadioRow label="Frosting Coverage" options={FROSTING_COVERAGE} value={frostingCoverage} onChange={setFrostingCoverage} />
                                            )}
                                            <IceCreamFillingGrid value={iceCreamFilling} onChange={setIceCreamFilling} />
                                            <IceCreamAddOns
                                                topper={topper} setTopper={setTopper}
                                                topperMessage={topperMessage} setTopperMessage={setTopperMessage}
                                                colorAccents={colorAccents} setColorAccents={setColorAccents}
                                                frostingColor={frostingColor} setFrostingColor={setFrostingColor}
                                            />
                                        </>
                                    )}

                                    {/* Custom Cake (baked) */}
                                    {orderType === "Custom Cake" && (
                                        <>
                                            <div>
                                                <label className="block text-xs font-black tracking-wider uppercase text-[#666] mb-3">Cake Size *</label>
                                                <p className="text-xs text-[#999] mb-3">All custom cakes are 3-layer and made to order.</p>
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                    {CAKE_SIZES.map((s) => (
                                                        <button
                                                            key={s.value}
                                                            type="button"
                                                            onClick={() => setCakeSize(s.value)}
                                                            className={`p-4 rounded-xl border-2 text-center transition-all duration-300 ${cakeSize === s.value
                                                                ? "border-[#A1AB74] bg-[#A1AB74]/10 scale-[1.03] shadow-md shadow-[#A1AB74]/10"
                                                                : "border-[#e0ddd5] hover:border-[#d4a853]/50 hover:-translate-y-[2px]"
                                                                }`}
                                                            style={{ transitionTimingFunction: "cubic-bezier(0.68, -0.55, 0.265, 1.55)" }}
                                                        >
                                                            <div className="font-black text-[#1a1a1f] text-lg">{s.label}</div>
                                                            <div className="text-[#d4a853] font-black text-sm">{s.price}</div>
                                                            <div className="text-[#999] text-xs mt-1">Feeds {s.serves}</div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <FlavorCardGrid label="Cake Flavor *" items={BAKED_FLAVORS} value={cakeFlavor} onChange={setCakeFlavor} />
                                            <ButtercreamGrid value={frostingFlavor} onChange={setFrostingFlavor} />
                                            <BakedFillingToggle filling={filling} setFilling={setFilling} fillingFlavor={fillingFlavor} setFillingFlavor={setFillingFlavor} priceLabel="+ $15" />
                                            <BakedTopperGrid value={bakedCakeTopper} onChange={setBakedCakeTopper} />
                                        </>
                                    )}

                                    {/* Custom Cupcakes (baked) */}
                                    {orderType === "Custom Cupcakes" && (
                                        <>
                                            <FlavorCardGrid label="Cupcake Flavor *" items={BAKED_FLAVORS} value={cakeFlavor} onChange={setCakeFlavor} />
                                            <ButtercreamGrid value={frostingFlavor} onChange={setFrostingFlavor} />
                                            <QuantityPicker label="Number of Dozens" value={quantity} onChange={setQuantity} max={10} pricePerUnit="$36" />
                                            <BakedFillingToggle filling={filling} setFilling={setFilling} fillingFlavor={fillingFlavor} setFillingFlavor={setFillingFlavor} priceLabel="+ $10/doz" />
                                            <div>
                                                <label className="block text-xs font-black tracking-wider uppercase text-[#666] mb-3">Extras</label>
                                                <label className="flex items-center gap-4 p-4 rounded-xl border-2 border-[#e0ddd5] cursor-pointer hover:border-[#d4a853]/50 transition-colors">
                                                    <input type="checkbox" checked={decorativeAccents} onChange={(e) => setDecorativeAccents(e.target.checked)} className="w-5 h-5 rounded border-[#ccc] text-[#A1AB74] focus:ring-[#A1AB74]" />
                                                    <div className="flex-1">
                                                        <p className="font-bold text-[#1a1a1f] text-sm">Request Decorative Accents</p>
                                                        <p className="text-xs text-[#999]">Includes themed toppers, buttercream details, pearls, etc. We'll contact you within 48 hours to finalize details and pricing.</p>
                                                    </div>
                                                    <span className="text-[#d4a853] font-black text-sm">$12–$20</span>
                                                </label>
                                            </div>
                                        </>
                                    )}

                                    <div className="flex gap-3">
                                        <button type="button" onClick={() => setStep(2)} className="flex-1 border border-[#e0ddd5] text-[#666] py-4 rounded-full font-black text-sm hover:bg-[#f2f0e8] transition-colors">
                                            ← Back
                                        </button>
                                        <button
                                            type="button"
                                            disabled={!canProceedStep[3]}
                                            onClick={() => setStep(4)}
                                            className="flex-[2] bg-[#A1AB74] text-white py-4 rounded-full font-black text-sm hover:bg-[#8a9360] transition-colors disabled:opacity-40"
                                        >
                                            Continue — Final Details →
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Step 4 — Special Requests & Submit */}
                            {step === 4 && (
                                <div className="bg-white rounded-2xl p-8 md:p-10 shadow-sm space-y-6 animate-[fadeSlideIn_0.4s_ease_both]">
                                    <div>
                                        <h2 className="text-2xl font-black text-[#1a1a1f] mb-1">Final Details</h2>
                                        <p className="text-[#666] text-sm">Any special requests or inspiration photos?</p>
                                    </div>
                                    <div>
                                        <label className={labelCls}>Special Requests / Notes</label>
                                        <textarea
                                            rows={4}
                                            value={specialRequests}
                                            onChange={(e) => setSpecialRequests(e.target.value)}
                                            placeholder="Writing on cake, theme colors, dietary notes, etc."
                                            className={`${inputCls} resize-none`}
                                        />
                                    </div>
                                    {(orderType === "Custom Ice Cream Cake" || orderType === "Custom Cake") && (
                                        <div>
                                            <label className={labelCls}>Inspiration Photo (optional)</label>
                                            <div
                                                onClick={() => fileRef.current?.click()}
                                                className="border-2 border-dashed border-[#e0ddd5] rounded-xl p-8 text-center cursor-pointer hover:border-[#d4a853] transition-colors"
                                            >
                                                {photoFile ? (
                                                    <div className="flex items-center justify-center gap-3">
                                                        <span className="text-2xl">📷</span>
                                                        <div>
                                                            <p className="font-bold text-[#1a1a1f] text-sm">{photoFile.name}</p>
                                                            <p className="text-[#999] text-xs">{(photoFile.size / 1024 / 1024).toFixed(1)} MB</p>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setPhotoFile(null);
                                                                if (fileRef.current) fileRef.current.value = "";
                                                            }}
                                                            className="text-red-400 hover:text-red-600 text-sm font-bold ml-2"
                                                        >
                                                            Remove
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <p className="text-3xl mb-2">📸</p>
                                                        <p className="text-sm text-[#666]">
                                                            <span className="text-[#d4a853] font-bold">Click to upload</span> or drag a photo here
                                                        </p>
                                                        <p className="text-xs text-[#999] mt-1">JPEG, PNG, or WebP — max 5 MB</p>
                                                    </>
                                                )}
                                            </div>
                                            <input
                                                ref={fileRef}
                                                type="file"
                                                accept="image/jpeg,image/png,image/webp"
                                                className="hidden"
                                                onChange={(e) => {
                                                    const f = e.target.files?.[0];
                                                    if (f && f.size <= 5 * 1024 * 1024) setPhotoFile(f);
                                                    else if (f) setError("Photo must be under 5 MB");
                                                }}
                                            />
                                        </div>
                                    )}

                                    {error && (
                                        <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>
                                    )}

                                    <div className="flex gap-3">
                                        <button type="button" onClick={() => setStep(3)} className="flex-1 border border-[#e0ddd5] text-[#666] py-4 rounded-full font-black text-sm hover:bg-[#f2f0e8] transition-colors">
                                            ← Back
                                        </button>
                                        <button
                                            type="button"
                                            disabled={submitting}
                                            onClick={handleSubmit}
                                            className="flex-[2] bg-[#d4a853] text-white py-4 rounded-full font-black text-sm hover:bg-[#c19843] transition-all disabled:opacity-50 relative overflow-hidden group"
                                        >
                                            <span className="relative z-10">{submitting ? "Submitting…" : `Submit Order — ${formatCents(totalCents)}`}</span>
                                            {!submitting && <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right: preview + summary sidebar */}
                        <div className="lg:col-span-1">
                            <div className="sticky top-28 space-y-6">
                                {/* Cake Preview */}
                                <div className="bg-white rounded-2xl p-6 shadow-sm">
                                    <p className="text-xs font-black tracking-wider uppercase text-[#666] mb-4">Preview</p>
                                    <CakePreview
                                        orderType={orderType}
                                        cakeFlavor={toSlug(cakeFlavor)}
                                        iceCreamFlavor={toSlug(iceCreamFlavor)}
                                        frostingType={frostingType}
                                        frostingCoverage={frostingCoverage}
                                        frostingFlavor={toSlug(frostingFlavor)}
                                        cakeSize={cakeSize}
                                        quantity={quantity}
                                        topper={topper ? topperMessage : (bakedCakeTopper || "")}
                                        filling={filling ? fillingFlavor : (iceCreamFilling || "")}
                                        naturalFrostingColor={colorAccents && frostingColor ? (FROSTING_COLORS.find(c => c.name === frostingColor)?.color || "") : ""}
                                    />
                                    {/* Frosting color indicator */}
                                    {orderType && (frostingFlavor || frostingType) && (
                                        <div className="flex items-center justify-center gap-2 mt-3 pt-3 border-t border-[#f0ede5]">
                                            <span
                                                className="w-4 h-4 rounded-full border border-[#e0ddd5] shrink-0"
                                                style={{ backgroundColor: frostingFlavor ? (BUTTERCREAM_SWATCHES[frostingFlavor] || "#FEFBF7") : (colorAccents && frostingColor ? (FROSTING_COLORS.find(c => c.name === frostingColor)?.color || "#FEFBF7") : "#FEFBF7") }}
                                            />
                                            <span className="text-xs text-[#888]">
                                                {frostingFlavor ? `${frostingFlavor} frosting` : (frostingType && frostingType !== "None" ? frostingType : "")}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Price Summary */}
                                <div className="bg-white rounded-2xl p-6 shadow-sm">
                                    <p className="text-xs font-black tracking-wider uppercase text-[#666] mb-4">Order Summary</p>
                                    {orderType ? (
                                        <div className="space-y-3">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-[#666]">{orderType}</span>
                                                <span className="font-bold text-[#1a1a1f]">{formatCents(calculatePrice(orderType, orderDetails, {}))}</span>
                                            </div>
                                            {orderType.includes("Ice Cream") && topper && topperMessage && (
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-[#666]">Cake Topper ({topperMessage})</span>
                                                    <span className="font-bold text-[#1a1a1f]">$8.50</span>
                                                </div>
                                            )}
                                            {orderType.includes("Ice Cream") && colorAccents && frostingColor && (
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-[#666]">Natural Frosting Color ({frostingColor})</span>
                                                    <span className="font-bold text-[#1a1a1f]">$10.00</span>
                                                </div>
                                            )}
                                            {(orderType === "Custom Cake" || orderType === "Custom Cupcakes") && filling && fillingFlavor && (
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-[#666]">Filling ({fillingFlavor})</span>
                                                    <span className="font-bold text-[#1a1a1f]">
                                                        {orderType === "Custom Cake" ? "$15.00" : formatCents(1000 * quantity)}
                                                    </span>
                                                </div>
                                            )}
                                            <div className="border-t border-[#e0ddd5] pt-3 flex justify-between">
                                                <span className="font-black text-[#1a1a1f]">Total</span>
                                                <span className="font-black text-[#d4a853] text-lg" key={totalCents} style={{ animation: "pricePulse 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)", display: "inline-block" }}>{formatCents(totalCents)}</span>
                                            </div>
                                            <p className="text-[10px] text-[#999] leading-snug">
                                                Final price will be confirmed by our team. No payment is due today.
                                            </p>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-[#999]">Choose an order type to see pricing.</p>
                                    )}
                                </div>

                                {/* Lead time notice */}
                                <div className="bg-[#d4a853]/10 rounded-2xl p-5">
                                    <p className="text-xs font-black text-[#d4a853] tracking-wider uppercase mb-2">Please Note</p>
                                    <p className="text-[#666] text-xs leading-relaxed">
                                        All bakery orders require a minimum <strong>96 hours (4 days)</strong> lead time.
                                        Our team will review and confirm within 24–48 hours.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
}

// ---------- sub-components ----------

/** Generic flavor card grid with icons and color swatches */
function FlavorCardGrid({ label, items, value, onChange }: {
    label: string;
    items: { name: string; icon: string }[];
    value: string;
    onChange: (v: string) => void;
}) {
    return (
        <div>
            <label className="block text-xs font-black tracking-wider uppercase text-[#666] mb-3">{label}</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {items.map((f) => {
                    const selected = value === f.name;
                    const swatch = FLAVOR_SWATCHES[f.name];
                    return (
                        <button
                            key={f.name}
                            type="button"
                            onClick={() => onChange(f.name)}
                            className={`relative flex items-center gap-2.5 px-3 py-3 rounded-xl text-sm font-bold border-2 transition-all duration-300 ${selected
                                ? "border-[#A1AB74] bg-gradient-to-r from-[#A1AB74]/10 to-[#A1AB74]/5 text-[#1a1a1f] shadow-md shadow-[#A1AB74]/10"
                                : "border-[#e0ddd5] text-[#666] hover:border-[#d4a853]/50 hover:-translate-y-[2px] hover:shadow-sm"
                                }`}
                            style={{ transitionTimingFunction: "cubic-bezier(0.68, -0.55, 0.265, 1.55)" }}
                        >
                            {swatch ? (
                                <span
                                    className={`w-6 h-6 rounded-full shrink-0 border-2 transition-all duration-300 ${selected ? "border-[#A1AB74] ring-2 ring-[#A1AB74]/30 scale-110" : "border-[#e0ddd5]"}`}
                                    style={{ backgroundColor: swatch }}
                                />
                            ) : (
                                <span className="text-lg shrink-0">{f.icon}</span>
                            )}
                            <span className="text-left leading-tight">{f.name}</span>
                            {selected && (
                                <svg className="w-4 h-4 text-[#A1AB74] absolute top-2 right-2 animate-[scaleIn_0.3s_cubic-bezier(0.68,-0.55,0.265,1.55)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

function RadioRow({
    label,
    options,
    value,
    onChange,
    helpText,
}: {
    label: string;
    options: string[];
    value: string;
    onChange: (v: string) => void;
    helpText?: string;
}) {
    return (
        <div>
            <label className="block text-xs font-black tracking-wider uppercase text-[#666] mb-1">{label}</label>
            {helpText && <p className="text-xs text-[#999] mb-3">{helpText}</p>}
            <div className="flex flex-wrap gap-3">
                {options.map((o) => (
                    <button
                        key={o}
                        type="button"
                        onClick={() => onChange(o)}
                        className={`px-5 py-3 rounded-xl text-sm font-bold border-2 transition-all duration-300 ${value === o
                            ? "border-[#A1AB74] bg-[#A1AB74]/10 text-[#1a1a1f] scale-[1.03] shadow-sm"
                            : "border-[#e0ddd5] text-[#666] hover:border-[#d4a853]/50 hover:-translate-y-[1px]"
                            }`}
                        style={{ transitionTimingFunction: "cubic-bezier(0.68, -0.55, 0.265, 1.55)" }}
                    >
                        {o}
                    </button>
                ))}
            </div>
        </div>
    );
}

function QuantityPicker({
    label,
    value,
    onChange,
    max,
    pricePerUnit,
}: {
    label: string;
    value: number;
    onChange: (v: number) => void;
    max: number;
    pricePerUnit: string;
}) {
    return (
        <div>
            <label className="block text-xs font-black tracking-wider uppercase text-[#666] mb-3">{label}</label>
            <div className="flex items-center gap-4">
                <button
                    type="button"
                    disabled={value <= 1}
                    onClick={() => onChange(Math.max(1, value - 1))}
                    className="w-10 h-10 rounded-full border-2 border-[#e0ddd5] flex items-center justify-center text-lg font-bold text-[#666] hover:border-[#d4a853] hover:scale-110 disabled:opacity-30 transition-all duration-200"
                    style={{ transitionTimingFunction: "cubic-bezier(0.68, -0.55, 0.265, 1.55)" }}
                >
                    −
                </button>
                <span className="text-2xl font-black text-[#1a1a1f] w-10 text-center" key={value} style={{ animation: "pricePulse 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)", display: "inline-block" }}>{value}</span>
                <button
                    type="button"
                    disabled={value >= max}
                    onClick={() => onChange(Math.min(max, value + 1))}
                    className="w-10 h-10 rounded-full border-2 border-[#e0ddd5] flex items-center justify-center text-lg font-bold text-[#666] hover:border-[#d4a853] hover:scale-110 disabled:opacity-30 transition-all duration-200"
                    style={{ transitionTimingFunction: "cubic-bezier(0.68, -0.55, 0.265, 1.55)" }}
                >
                    +
                </button>
                <span className="text-sm text-[#999] ml-2">{pricePerUnit} per dozen</span>
            </div>
        </div>
    );
}

/** Ice cream cake add-ons: Topper (+$8.50) & Natural Frosting Color (+$10) */
function IceCreamAddOns({
    topper, setTopper, topperMessage, setTopperMessage,
    colorAccents, setColorAccents, frostingColor, setFrostingColor,
}: {
    topper: boolean; setTopper: (v: boolean) => void;
    topperMessage: string; setTopperMessage: (v: string) => void;
    colorAccents: boolean; setColorAccents: (v: boolean) => void;
    frostingColor: string; setFrostingColor: (v: string) => void;
}) {
    return (
        <div className="space-y-4">
            <label className="block text-xs font-black tracking-wider uppercase text-[#666]">Add-Ons</label>

            {/* Topper */}
            <label className="flex items-center gap-4 p-4 rounded-xl border-2 border-[#e0ddd5] cursor-pointer hover:border-[#d4a853]/50 transition-colors">
                <input type="checkbox" checked={topper} onChange={(e) => { setTopper(e.target.checked); if (!e.target.checked) setTopperMessage(""); }} className="w-5 h-5 rounded border-[#ccc] text-[#A1AB74] focus:ring-[#A1AB74]" />
                <div className="flex-1">
                    <p className="font-bold text-[#1a1a1f] text-sm">Cake Topper</p>
                    <p className="text-xs text-[#999]">Physical plastic topper with your message</p>
                </div>
                <span className="text-[#d4a853] font-black text-sm">+ $8.50</span>
            </label>
            {topper && (
                <div className="animate-[fadeSlideIn_0.3s_ease_both]">
                    <label className="block text-xs font-black tracking-wider uppercase text-[#666] mb-2">Choose Topper Message</label>
                    <select
                        value={topperMessage}
                        onChange={(e) => setTopperMessage(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl text-sm font-bold border-2 border-[#e0ddd5] bg-white text-[#1a1a1f] focus:border-[#A1AB74] focus:ring-1 focus:ring-[#A1AB74] focus:outline-none transition-colors"
                    >
                        <option value="">Select a message...</option>
                        {TOPPER_MESSAGES_IC.map((m) => (
                            <option key={m} value={m}>{m}</option>
                        ))}
                    </select>
                </div>
            )}

            {/* Natural Color */}
            <label className="flex items-center gap-4 p-4 rounded-xl border-2 border-[#e0ddd5] cursor-pointer hover:border-[#d4a853]/50 transition-colors">
                <input type="checkbox" checked={colorAccents} onChange={(e) => { setColorAccents(e.target.checked); if (!e.target.checked) setFrostingColor(""); }} className="w-5 h-5 rounded border-[#ccc] text-[#A1AB74] focus:ring-[#A1AB74]" />
                <div className="flex-1">
                    <p className="font-bold text-[#1a1a1f] text-sm">Natural Frosting Color</p>
                    <p className="text-xs text-[#999]">All-natural frosting colors (no artificial food coloring)</p>
                </div>
                <span className="text-[#d4a853] font-black text-sm">+ $10.00</span>
            </label>
            {colorAccents && (
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3 animate-[fadeSlideIn_0.3s_ease_both]">
                    {FROSTING_COLORS.map((c) => (
                        <button key={c.name} type="button" onClick={() => setFrostingColor(c.name)}
                            className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-300 ${frostingColor === c.name ? "border-[#A1AB74] bg-[#A1AB74]/10 scale-[1.05]" : "border-[#e0ddd5] hover:border-[#d4a853]/50 hover:-translate-y-[1px]"
                                }`}
                            style={{ transitionTimingFunction: "cubic-bezier(0.68, -0.55, 0.265, 1.55)" }}
                        >
                            <span className={`w-8 h-8 rounded-full border-2 transition-all ${frostingColor === c.name ? "border-[#A1AB74] ring-2 ring-[#A1AB74]/30" : "border-[#e0ddd5]"
                                }`} style={{ background: c.gradient }} />
                            <span className="text-[10px] font-bold text-[#666] leading-tight text-center">{c.label}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

/** Ice cream cake filling grid (no extra charge) */
function IceCreamFillingGrid({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    return (
        <div>
            <label className="block text-xs font-black tracking-wider uppercase text-[#666] mb-3">Filling</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {IC_FILLING_OPTIONS.map((f) => {
                    const selected = value === f.name;
                    return (
                        <button key={f.label} type="button" onClick={() => onChange(f.name)}
                            className={`flex items-center gap-2.5 px-3 py-3 rounded-xl text-sm font-bold border-2 transition-all duration-300 ${selected ? "border-[#A1AB74] bg-[#A1AB74]/10 text-[#1a1a1f]" : "border-[#e0ddd5] text-[#666] hover:border-[#d4a853]/50 hover:-translate-y-[1px]"
                                }`}
                            style={{ transitionTimingFunction: "cubic-bezier(0.68, -0.55, 0.265, 1.55)" }}
                        >
                            <span className="text-lg">{f.icon}</span>
                            <span>{f.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

/** Buttercream frosting grid with color swatches (Custom Cake & Cupcakes) */
function ButtercreamGrid({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    return (
        <div>
            <label className="block text-xs font-black tracking-wider uppercase text-[#666] mb-3">Buttercream Frosting *</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {BUTTERCREAM_FLAVORS.map((f) => {
                    const selected = value === f.name;
                    const swatch = BUTTERCREAM_SWATCHES[f.name];
                    return (
                        <button key={f.name} type="button" onClick={() => onChange(f.name)}
                            className={`relative flex items-center gap-2 px-3 py-3 rounded-xl text-sm font-bold border-2 transition-all duration-300 ${selected ? "border-[#A1AB74] bg-gradient-to-r from-[#A1AB74]/10 to-[#A1AB74]/5 text-[#1a1a1f] shadow-sm" : "border-[#e0ddd5] text-[#666] hover:border-[#d4a853]/50 hover:-translate-y-[1px]"
                                }`}
                            style={{ transitionTimingFunction: "cubic-bezier(0.68, -0.55, 0.265, 1.55)" }}
                        >
                            {swatch ? (
                                <span className={`w-5 h-5 rounded-full shrink-0 border-2 transition-all duration-300 ${selected ? "border-[#A1AB74] ring-2 ring-[#A1AB74]/30" : "border-[#e0ddd5]"}`} style={{ backgroundColor: swatch }} />
                            ) : (
                                <span className="text-base shrink-0">{f.icon}</span>
                            )}
                            <span className="text-left leading-tight">{f.name}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

/** Baked cake/cupcake filling toggle (+$15 cake / +$10/doz cupcakes) */
function BakedFillingToggle({
    filling, setFilling, fillingFlavor, setFillingFlavor, priceLabel,
}: {
    filling: boolean; setFilling: (v: boolean) => void;
    fillingFlavor: string; setFillingFlavor: (v: string) => void;
    priceLabel: string;
}) {
    return (
        <div>
            <label className="block text-xs font-black tracking-wider uppercase text-[#666] mb-3">Filling</label>
            <label className="flex items-center gap-4 p-4 rounded-xl border-2 border-[#e0ddd5] cursor-pointer hover:border-[#d4a853]/50 transition-colors mb-3">
                <input type="checkbox" checked={filling} onChange={(e) => { setFilling(e.target.checked); if (!e.target.checked) setFillingFlavor(""); }} className="w-5 h-5 rounded border-[#ccc] text-[#A1AB74] focus:ring-[#A1AB74]" />
                <div className="flex-1">
                    <p className="font-bold text-[#1a1a1f] text-sm">Add Cake Filling</p>
                </div>
                <span className="text-[#d4a853] font-black text-sm">{priceLabel}</span>
            </label>
            {filling && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 animate-[fadeSlideIn_0.3s_ease_both]">
                    {BAKED_FILLING_FLAVORS.map((f) => (
                        <button key={f.name} type="button" onClick={() => setFillingFlavor(f.name)}
                            className={`flex items-center gap-2 px-3 py-3 rounded-xl text-sm font-bold border-2 transition-all duration-300 ${fillingFlavor === f.name ? "border-[#A1AB74] bg-[#A1AB74]/10 text-[#1a1a1f] scale-[1.03]" : "border-[#e0ddd5] text-[#666] hover:border-[#d4a853]/50 hover:-translate-y-[1px]"
                                }`}
                            style={{ transitionTimingFunction: "cubic-bezier(0.68, -0.55, 0.265, 1.55)" }}
                        >
                            <span className="text-base">{f.icon}</span>
                            <span>{f.name}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

/** Baked cake topper selector (no extra charge) */
function BakedTopperGrid({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    return (
        <div>
            <label className="block text-xs font-black tracking-wider uppercase text-[#666] mb-3">Cake Topper</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {TOPPER_OPTIONS_BAKED.map((t) => {
                    const selected = value === t.name;
                    return (
                        <button key={t.label} type="button" onClick={() => onChange(t.name)}
                            className={`flex items-center gap-2.5 px-3 py-3 rounded-xl text-sm font-bold border-2 transition-all duration-300 ${selected ? "border-[#A1AB74] bg-[#A1AB74]/10 text-[#1a1a1f]" : "border-[#e0ddd5] text-[#666] hover:border-[#d4a853]/50 hover:-translate-y-[1px]"
                                }`}
                            style={{ transitionTimingFunction: "cubic-bezier(0.68, -0.55, 0.265, 1.55)" }}
                        >
                            <span className="text-lg">{t.icon}</span>
                            <span>{t.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

function SuccessScreen({ orderNumber, totalPriceCents, email }: { orderNumber: string; totalPriceCents: number; email: string }) {
    const confettiRef = useConfetti(true);
    return (
        <div className="min-h-screen" style={{ fontFamily: "'Space Grotesk', 'Poppins', sans-serif" }}>
            <style>{`
                @keyframes fadeSlideIn{0%{opacity:0;transform:translateY(12px)}100%{opacity:1;transform:none}}
                @keyframes scaleIn{0%{transform:scale(0)}60%{transform:scale(1.15)}100%{transform:scale(1)}}
                @keyframes pricePulse{0%{transform:scale(1)}40%{transform:scale(1.08)}100%{transform:scale(1)}}
                @keyframes successBounce{0%{opacity:0;transform:scale(0.3) translateY(30px)}50%{transform:scale(1.08) translateY(-5px)}100%{opacity:1;transform:none}}
                @keyframes floatEmoji{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-8px) scale(1.05)}}
            `}</style>
            <Navbar />
            <section className="bg-[#111118] text-white py-24 md:py-32 text-center relative overflow-hidden">
                <canvas ref={confettiRef} className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 10 }} />
                <div className="max-w-2xl mx-auto px-8 relative" style={{ zIndex: 20 }}>
                    <div className="text-6xl mb-6" style={{ animation: "floatEmoji 2.5s ease-in-out infinite" }}>🎉</div>
                    <h1 className="text-4xl md:text-5xl font-black mb-4" style={{ animation: "successBounce 0.6s cubic-bezier(0.68,-0.55,0.265,1.55) 0.2s both" }}>Order Submitted!</h1>
                    <p className="text-white/60 text-lg mb-2" style={{ animation: "fadeSlideIn 0.5s ease 0.4s both" }}>
                        Your order number is <span className="text-[#d4a853] font-black">{orderNumber}</span>
                    </p>
                    <p className="text-white/60 text-lg mb-6" style={{ animation: "fadeSlideIn 0.5s ease 0.5s both" }}>
                        Estimated total: <span className="text-white font-black">{formatCents(totalPriceCents)}</span>
                    </p>
                    <div className="bg-white/10 rounded-2xl p-6 text-left max-w-md mx-auto backdrop-blur-sm" style={{ animation: "fadeSlideIn 0.5s ease 0.6s both" }}>
                        <p className="text-white/80 text-sm leading-relaxed">
                            Our bakery team will review your order and reach out within <strong>24–48 hours</strong> to confirm details and arrange payment.
                            Please allow at least <strong>96 hours (4 days)</strong> lead time for all bakery orders.
                        </p>
                        <p className="text-white/60 text-sm mt-3">A confirmation email has been sent to <strong>{email}</strong>.</p>
                    </div>
                </div>
            </section>
            <section className="bg-[#f9f8f4] py-16">
                <div className="max-w-md mx-auto text-center px-8">
                    <a href="/bakery" className="inline-block bg-[#A1AB74] text-white px-8 py-4 rounded-full font-black text-sm hover:bg-[#8a9360] transition-all hover:scale-105" style={{ transitionTimingFunction: "cubic-bezier(0.68, -0.55, 0.265, 1.55)" }}>
                        Place Another Order
                    </a>
                </div>
            </section>
            <Footer />
        </div>
    );
}
