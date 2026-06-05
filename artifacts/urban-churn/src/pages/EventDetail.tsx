import { useState, useEffect, useRef, useMemo } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { MapPin, Clock, Calendar, Ticket, Minus, Plus, ArrowLeft, CheckCircle2, Copy, CalendarPlus, MessageCircleQuestion, Loader2, AlertTriangle, Check } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

const CATEGORY_LABELS: Record<string, string> = {
    tasting: "Tasting",
    festival: "Festival",
    pop_up: "Pop-Up",
    trivia: "Trivia",
    party: "Party",
    other: "Event",
};

const CATEGORY_COLORS: Record<string, string> = {
    tasting: "#d4a853",
    festival: "#A1AB74",
    pop_up: "#e87b35",
    trivia: "#6b8edb",
    party: "#c77dba",
    other: "#888",
};

function formatDate(dateStr: string) {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
    });
}

function formatTime(time: string) {
    const [h, m] = time.split(":");
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${m} ${ampm}`;
}

interface TicketSelection {
    ticketTypeId: number;
    quantity: number;
}

type PurchaseStep = "select" | "checkout" | "confirmation";

export default function EventDetail() {
    const params = useParams<{ slug: string }>();
    const { toast } = useToast();

    const [selections, setSelections] = useState<Record<number, number>>({});
    const [step, setStep] = useState<PurchaseStep>("select");
    const [customerName, setCustomerName] = useState("");
    const [customerEmail, setCustomerEmail] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [accountMode, setAccountMode] = useState<"guest" | "create" | "login">("guest");
    const [password, setPassword] = useState("");
    const [purchasedTickets, setPurchasedTickets] = useState<any>(null);
    const [emailStatus, setEmailStatus] = useState<{ hasAccount?: boolean; needsPasswordReset?: boolean } | null>(null);
    const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
    const [forgotPasswordSent, setForgotPasswordSent] = useState(false);
    const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const emailCheckRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Square Web Payments SDK
    const cardRef = useRef<any>(null);
    const cardContainerRef = useRef<HTMLDivElement>(null);
    const [squareReady, setSquareReady] = useState(false);
    const [paymentError, setPaymentError] = useState("");
    const [squareAppId, setSquareAppId] = useState<string | null>(null);

    // Question modal state
    const [questionOpen, setQuestionOpen] = useState(false);
    const [qName, setQName] = useState("");
    const [qEmail, setQEmail] = useState("");
    const [qMessage, setQMessage] = useState("");

    const { data: event, isLoading } = useQuery({
        queryKey: ["public", "event", params.slug],
        queryFn: () => api.getPublicEvent(params.slug!),
        enabled: !!params.slug,
    });

    const purchaseMutation = useMutation({
        mutationFn: (data: any) => api.purchaseTickets(event.id, data),
        onSuccess: (data) => {
            setPurchasedTickets(data);
            setStep("confirmation");
        },
        onError: (error: any) => {
            const code = error?.code || "";
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
                toast({
                    title: "Payment not completed",
                    description: error.message || "Your tickets were not purchased. Please try again.",
                    variant: "destructive",
                });
            } else {
                toast({ title: "Purchase Failed", description: error.message || "Something went wrong. Please try again.", variant: "destructive" });
            }
        },
    });

    // Load Square SDK and initialize card form when entering checkout
    useEffect(() => {
        if (step !== "checkout") return;

        let cancelled = false;

        (async () => {
            try {
                const data = await api.getSquareAppId(event?.locationId);
                if (cancelled || !data?.appId) return;
                setSquareAppId(data.appId);

                const env = data.environment || "sandbox";
                const sdkUrl = env === "production"
                    ? "https://web.squarecdn.com/v1/square.js"
                    : "https://sandbox.web.squarecdn.com/v1/square.js";

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
    }, [step, event?.locationId]);

    const questionMutation = useMutation({
        mutationFn: (data: { name: string; email: string; message: string }) =>
            api.submitEventQuestion(event.id, data),
        onSuccess: () => {
            setQuestionOpen(false);
            setQName("");
            setQEmail("");
            setQMessage("");
            toast({ title: "Question sent!", description: "We'll get back to you soon." });
        },
        onError: (error: any) => {
            toast({
                title: "Failed to send",
                description: error.message || "Please try again.",
                variant: "destructive",
            });
        },
    });

    function buildCalendarUrl(ev: any) {
        const dateStr = ev.eventDate.replace(/-/g, "");
        const start = dateStr + "T" + ev.startTime.replace(":", "") + "00";
        const end = ev.endTime
            ? dateStr + "T" + ev.endTime.replace(":", "") + "00"
            : dateStr + "T" + String(parseInt(ev.startTime) + 2).padStart(2, "0") + ev.startTime.slice(2).replace(":", "") + "00";
        const title = encodeURIComponent(ev.title);
        const location = encodeURIComponent(ev.venueAddress || ev.venueName || ev.locationName || "");
        const details = encodeURIComponent(ev.description || "");
        return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&location=${location}&details=${details}`;
    }

    const totalCents = useMemo(() => {
        if (!event) return 0;
        return event.ticketTypes.reduce((sum: number, tt: any) => {
            const qty = selections[tt.id] || 0;
            return sum + tt.priceCents * qty;
        }, 0);
    }, [event, selections]);

    const totalTickets = useMemo(
        () => Object.values(selections).reduce((sum, q) => sum + q, 0),
        [selections],
    );

    const updateQuantity = (ticketTypeId: number, delta: number) => {
        setSelections((prev) => {
            const current = prev[ticketTypeId] || 0;
            const newQty = Math.max(0, current + delta);
            const ticketType = event?.ticketTypes.find((tt: any) => tt.id === ticketTypeId);
            if (!ticketType) return prev;
            const maxAllowed = Math.min(ticketType.maxPerOrder, ticketType.available);
            return { ...prev, [ticketTypeId]: Math.min(newQty, maxAllowed) };
        });
    };

    // Check if email has an existing account (debounced on blur)
    const handleEmailBlur = () => {
        if (emailCheckRef.current) clearTimeout(emailCheckRef.current);
        const email = customerEmail.trim();
        if (!email || !/\S+@\S+\.\S+/.test(email)) {
            setEmailStatus(null);
            return;
        }
        emailCheckRef.current = setTimeout(async () => {
            try {
                const result = await api.customerCheckEmail(email);
                setEmailStatus(result);
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
        const email = customerEmail.trim();
        if (!email) return;
        setForgotPasswordLoading(true);
        try {
            await api.customerForgotPassword(email);
            setForgotPasswordSent(true);
            sessionStorage.setItem("uc-return-to-checkout", "1");
        } catch {
            setForgotPasswordSent(true);
            sessionStorage.setItem("uc-return-to-checkout", "1");
        } finally {
            setForgotPasswordLoading(false);
        }
    };

    const handlePurchase = async () => {
        if (!customerName.trim() || !customerEmail.trim()) {
            toast({
                title: "Missing Information",
                description: "Please enter your name and email address.",
                variant: "destructive",
            });
            return;
        }

        if (!agreedToTerms) {
            toast({
                title: "Terms Required",
                description: "Please agree to the Terms & Conditions and Privacy Policy before purchasing.",
                variant: "destructive",
            });
            return;
        }

        if (accountMode !== "guest" && (!password || password.length < 8)) {
            toast({
                title: "Password Required",
                description: accountMode === "create"
                    ? "Please enter a password (at least 8 characters) to create your account."
                    : "Please enter your password to sign in.",
                variant: "destructive",
            });
            return;
        }

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
            } catch {
                setPaymentError("Payment processing error. Please try again.");
                return;
            }
        }

        const items: TicketSelection[] = Object.entries(selections)
            .filter(([, qty]) => qty > 0)
            .map(([id, quantity]) => ({
                ticketTypeId: Number(id),
                quantity,
            }));

        purchaseMutation.mutate({
            customerName: customerName.trim(),
            customerEmail: customerEmail.trim(),
            customerPhone: customerPhone.trim(),
            items,
            sourceId,
            accountMode,
            password: accountMode !== "guest" ? password : undefined,
        });
    };

    if (isLoading) {
        return (
            <div className="min-h-screen" style={{ fontFamily: "'Space Grotesk', 'Poppins', sans-serif" }}>
                <Navbar />
                <div className="flex justify-center items-center py-40">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#A1AB74]" />
                </div>
                <Footer />
            </div>
        );
    }

    if (!event) {
        return (
            <div className="min-h-screen" style={{ fontFamily: "'Space Grotesk', 'Poppins', sans-serif" }}>
                <Navbar />
                <div className="text-center py-40">
                    <p className="text-5xl mb-4">🎪</p>
                    <h2 className="text-2xl font-black text-gray-800 mb-2">Event Not Found</h2>
                    <p className="text-gray-500 mb-6">This event may have ended or doesn't exist.</p>
                    <Link href="/events" className="text-[#A1AB74] font-bold hover:underline">
                        ← Back to Events
                    </Link>
                </div>
                <Footer />
            </div>
        );
    }

    // Confirmation View
    if (step === "confirmation" && purchasedTickets) {
        return (
            <div className="min-h-screen" style={{ fontFamily: "'Space Grotesk', 'Poppins', sans-serif" }}>
                <Navbar />
                <section className="bg-[#f9f8f4] py-20">
                    <div className="max-w-2xl mx-auto px-8 text-center">
                        <div className="bg-white rounded-3xl shadow-sm p-10">
                            <CheckCircle2 className="w-16 h-16 text-[#A1AB74] mx-auto mb-6" />
                            <h1 className="text-3xl font-black text-[#1a1a1f] mb-2">You're In! 🎉</h1>
                            <p className="text-gray-500 mb-8">
                                Your tickets for <strong>{event.title}</strong> have been confirmed.
                                A confirmation email has been sent to <strong>{customerEmail}</strong>.
                            </p>

                            <div className="bg-[#f9f8f4] rounded-2xl p-6 mb-8 text-left">
                                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                                    <Calendar className="w-4 h-4" />
                                    {formatDate(event.eventDate)}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                                    <Clock className="w-4 h-4" />
                                    {formatTime(event.startTime)}
                                    {event.endTime && ` – ${formatTime(event.endTime)}`}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                    <MapPin className="w-4 h-4" />
                                    {event.locationName || event.venueName || "TBA"}
                                </div>
                            </div>

                            <div className="text-left mb-8">
                                <h3 className="font-black text-sm text-gray-400 tracking-widest uppercase mb-4">Your Tickets</h3>
                                <div className="space-y-3">
                                    {purchasedTickets.tickets.map((ticket: any, i: number) => (
                                        <div key={i} className="bg-[#f9f8f4] rounded-xl p-4 flex items-center justify-between">
                                            <div>
                                                <p className="font-bold text-[#1a1a1f]">{ticket.ticketTypeName}</p>
                                                <p className="text-xs text-gray-400 font-mono mt-1">
                                                    {ticket.ticketCode.slice(0, 12).toUpperCase()}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(ticket.ticketCode);
                                                    toast({ title: "Copied!", description: "Ticket code copied to clipboard." });
                                                }}
                                                className="text-gray-400 hover:text-[#A1AB74] transition-colors"
                                            >
                                                <Copy className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-4 justify-center">
                                <Link href="/events" className="text-gray-500 font-bold hover:text-gray-700 transition-colors">
                                    ← Browse More Events
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>
                <Footer />
            </div>
        );
    }

    const allSoldOut = event.ticketTypes.every((tt: any) => tt.available <= 0);

    return (
        <div className="min-h-screen" style={{ fontFamily: "'Space Grotesk', 'Poppins', sans-serif" }}>
            <SEO
                title={`${event.title} | Urban Churn Events`}
                description={`${((event.description || `${event.title} — an Urban Churn event`).replace(/<[^>]*>/g, '')).slice(0, 140)} — Get tickets for this Urban Churn event in Central PA.`}
                keywords={`${event.title}, Urban Churn event, ${event.category || ''} event, ice cream event PA, event tickets`}
                canonical={`/events/${params.slug}`}
                ogImage={event.imageUrl ? (event.imageUrl.startsWith('http') ? event.imageUrl : event.imageUrl.startsWith('/uploads') ? `https://urbanchurn.com/api${event.imageUrl}` : `https://urbanchurn.com${event.imageUrl}`) : undefined}
                jsonLd={{
                    "@context": "https://schema.org",
                    "@type": "Event",
                    name: event.title,
                    description: (event.description || `${event.title} at Urban Churn`).replace(/<[^>]*>/g, ''),
                    startDate: `${event.eventDate}T${event.startTime || '00:00'}`,
                    ...(event.endTime ? { endDate: `${event.eventDate}T${event.endTime}` } : {}),
                    image: event.imageUrl ? (event.imageUrl.startsWith('http') ? event.imageUrl : event.imageUrl.startsWith('/uploads') ? `https://urbanchurn.com/api${event.imageUrl}` : `https://urbanchurn.com${event.imageUrl}`) : undefined,
                    location: {
                        "@type": "Place",
                        name: event.locationName || event.venueName || "Urban Churn",
                        ...(event.venueAddress ? { address: { "@type": "PostalAddress", streetAddress: event.venueAddress } } : {}),
                    },
                    organizer: { "@type": "Organization", name: "Urban Churn", url: "https://urbanchurn.com" },
                    eventStatus: "https://schema.org/EventScheduled",
                    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
                    ...(event.ticketTypes?.length ? {
                        offers: event.ticketTypes.map((tt: any) => ({
                            "@type": "Offer",
                            name: tt.name,
                            price: (tt.priceCents / 100).toFixed(2),
                            priceCurrency: "USD",
                            availability: tt.available > 0 ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
                            url: `https://urbanchurn.com/events/${params.slug}`,
                            validFrom: event.createdAt || event.eventDate,
                        }))
                    } : {}),
                }}
                breadcrumbs={[
                    { name: "Home", url: "/" },
                    { name: "Events", url: "/events" },
                    { name: event.title, url: `/events/${params.slug}` },
                ]}
            />
            <Navbar />

            {/* Hero Image */}
            <section className="relative h-[50vh] md:h-[60vh] overflow-hidden">
                {event.imageUrl ? (
                    <img
                        src={event.imageUrl.startsWith("http") ? event.imageUrl : event.imageUrl.startsWith("/uploads") ? `/api${event.imageUrl}` : event.imageUrl}
                        alt={event.title}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div
                        className="w-full h-full flex items-center justify-center text-9xl"
                        style={{ background: event.accentColor || "#A1AB74" }}
                    >
                        🎟️
                    </div>
                )}
                <div className="absolute inset-0 bg-[#111118]/50" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
                    <div className="max-w-7xl mx-auto">
                        <Link href="/events" className="inline-flex items-center gap-1 text-white/70 hover:text-white text-sm font-bold mb-4 transition-colors">
                            <ArrowLeft className="w-4 h-4" /> All Events
                        </Link>
                        <div className="flex items-center gap-3 mb-3">
                            <span
                                className="text-white text-xs font-black px-3 py-1.5 rounded-full"
                                style={{ background: CATEGORY_COLORS[event.category] || "#888" }}
                            >
                                {CATEGORY_LABELS[event.category] || "Event"}
                            </span>
                            {allSoldOut && (
                                <Badge variant="destructive" className="font-black">Sold Out</Badge>
                            )}
                        </div>
                        <h1 className="text-4xl md:text-6xl font-black text-white leading-tight">
                            {event.title}
                        </h1>
                    </div>
                </div>
            </section>

            {/* Content */}
            <section className="bg-[#f9f8f4] py-12 md:py-16">
                <div className="max-w-7xl mx-auto px-8">
                    <div className="grid lg:grid-cols-[1fr_380px] gap-10">
                        {/* Left: Details */}
                        <div>
                            {/* Event Info Cards */}
                            <div className="grid sm:grid-cols-3 gap-4 mb-10">
                                <div className="bg-white rounded-2xl p-5 shadow-sm">
                                    <Calendar className="w-5 h-5 text-[#A1AB74] mb-2" />
                                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Date</p>
                                    <p className="font-black text-[#1a1a1f]">{formatDate(event.eventDate)}</p>
                                </div>
                                <div className="bg-white rounded-2xl p-5 shadow-sm">
                                    <Clock className="w-5 h-5 text-[#A1AB74] mb-2" />
                                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Time</p>
                                    <p className="font-black text-[#1a1a1f]">
                                        {formatTime(event.startTime)}
                                        {event.endTime && ` – ${formatTime(event.endTime)}`}
                                    </p>
                                </div>
                                <div className="bg-white rounded-2xl p-5 shadow-sm">
                                    <MapPin className="w-5 h-5 text-[#A1AB74] mb-2" />
                                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Location</p>
                                    <p className="font-black text-[#1a1a1f]">
                                        {event.locationName || event.venueName || "TBA"}
                                    </p>
                                </div>
                            </div>

                            {/* Description */}
                            {event.description && (
                                <div className="bg-white rounded-2xl p-8 shadow-sm mb-8">
                                    <h2 className="text-xl font-black text-[#1a1a1f] mb-4">About This Event</h2>
                                    <div
                                        className="text-gray-600 leading-relaxed whitespace-pre-line break-words overflow-hidden [&_strong]:font-bold [&_strong]:text-[#1a1a1f]"
                                        dangerouslySetInnerHTML={{ __html: event.description }}
                                    />
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex flex-col sm:flex-row gap-3 mb-8">
                                <a
                                    href={buildCalendarUrl(event)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center gap-2 bg-white border-2 border-[#1a1a1f] text-[#1a1a1f] px-5 py-3 rounded-xl font-bold text-sm hover:bg-[#1a1a1f] hover:text-white transition-colors"
                                >
                                    <CalendarPlus className="w-4 h-4" />
                                    Add to Calendar
                                </a>
                                <button
                                    onClick={() => setQuestionOpen(true)}
                                    className="inline-flex items-center justify-center gap-2 bg-white border-2 border-[#A1AB74] text-[#A1AB74] px-5 py-3 rounded-xl font-bold text-sm hover:bg-[#A1AB74] hover:text-white transition-colors"
                                >
                                    <MessageCircleQuestion className="w-4 h-4" />
                                    Ask a Question
                                </button>
                            </div>
                        </div>

                        {/* Right: Ticket Selection / Checkout */}
                        <div className="lg:sticky lg:top-24 lg:self-start">
                            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                                {step === "select" && (
                                    <>
                                        <div className="p-6 border-b">
                                            <h3 className="text-lg font-black text-[#1a1a1f] flex items-center gap-2">
                                                <Ticket className="w-5 h-5 text-[#A1AB74]" />
                                                Select Tickets
                                            </h3>
                                        </div>

                                        <div className="p-6 space-y-4">
                                            {event.ticketTypes.map((tt: any) => {
                                                const qty = selections[tt.id] || 0;
                                                const maxAllowed = Math.min(tt.maxPerOrder, tt.available);
                                                const isSoldOut = tt.available <= 0;

                                                return (
                                                    <div key={tt.id} className={`rounded-xl border-2 p-4 transition-colors ${qty > 0 ? "border-[#A1AB74] bg-[#A1AB74]/5" : "border-gray-100"} ${isSoldOut ? "opacity-50" : ""}`}>
                                                        <div className="flex items-start justify-between mb-2">
                                                            <div>
                                                                <p className="font-black text-[#1a1a1f]">{tt.name}</p>
                                                                {tt.description && (
                                                                    <p className="text-xs text-gray-400 mt-1">{tt.description}</p>
                                                                )}
                                                            </div>
                                                            <p className="font-black text-[#1a1a1f] whitespace-nowrap ml-4">
                                                                ${(tt.priceCents / 100).toFixed(2)}
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center justify-between mt-3">
                                                            <p className="text-xs text-gray-400">
                                                                {isSoldOut
                                                                    ? "Sold out"
                                                                    : `${tt.available} available`}
                                                            </p>
                                                            {!isSoldOut && (
                                                                <div className="flex items-center gap-3">
                                                                    <button
                                                                        onClick={() => updateQuantity(tt.id, -1)}
                                                                        disabled={qty === 0}
                                                                        className="w-8 h-8 rounded-full border-2 border-gray-200 flex items-center justify-center text-gray-400 hover:border-[#A1AB74] hover:text-[#A1AB74] disabled:opacity-30 disabled:hover:border-gray-200 disabled:hover:text-gray-400 transition-colors"
                                                                    >
                                                                        <Minus className="w-4 h-4" />
                                                                    </button>
                                                                    <span className="w-8 text-center font-black text-[#1a1a1f]">{qty}</span>
                                                                    <button
                                                                        onClick={() => updateQuantity(tt.id, 1)}
                                                                        disabled={qty >= maxAllowed}
                                                                        className="w-8 h-8 rounded-full border-2 border-gray-200 flex items-center justify-center text-gray-400 hover:border-[#A1AB74] hover:text-[#A1AB74] disabled:opacity-30 disabled:hover:border-gray-200 disabled:hover:text-gray-400 transition-colors"
                                                                    >
                                                                        <Plus className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {totalTickets > 0 && (
                                            <div className="border-t p-6">
                                                <div className="flex items-center justify-between mb-4">
                                                    <span className="text-gray-500">
                                                        {totalTickets} ticket{totalTickets !== 1 ? "s" : ""}
                                                    </span>
                                                    <span className="text-xl font-black text-[#1a1a1f]">
                                                        ${(totalCents / 100).toFixed(2)}
                                                    </span>
                                                </div>
                                                <Button
                                                    onClick={() => setStep("checkout")}
                                                    className="w-full bg-[#A1AB74] hover:bg-[#8a9360] text-white font-black py-6 rounded-xl text-base"
                                                >
                                                    Continue to Checkout
                                                </Button>
                                            </div>
                                        )}
                                    </>
                                )}

                                {step === "checkout" && (
                                    <>
                                        <div className="p-6 border-b">
                                            <button
                                                onClick={() => setStep("select")}
                                                className="text-sm text-gray-400 hover:text-gray-600 font-bold mb-2 flex items-center gap-1"
                                            >
                                                <ArrowLeft className="w-3 h-3" /> Back
                                            </button>
                                            <h3 className="text-lg font-black text-[#1a1a1f]">Checkout</h3>
                                        </div>

                                        {/* Order Summary */}
                                        <div className="p-6 border-b bg-[#f9f8f4]">
                                            <p className="text-xs font-black text-gray-400 tracking-widest uppercase mb-3">Order Summary</p>
                                            {event.ticketTypes
                                                .filter((tt: any) => (selections[tt.id] || 0) > 0)
                                                .map((tt: any) => {
                                                    const qty = selections[tt.id];
                                                    return (
                                                        <div key={tt.id} className="flex justify-between text-sm mb-2">
                                                            <span className="text-gray-600">
                                                                {tt.name} × {qty}
                                                            </span>
                                                            <span className="font-bold">${((tt.priceCents * qty) / 100).toFixed(2)}</span>
                                                        </div>
                                                    );
                                                })}
                                            <div className="flex justify-between font-black text-[#1a1a1f] mt-3 pt-3 border-t">
                                                <span>Total</span>
                                                <span>${(totalCents / 100).toFixed(2)}</span>
                                            </div>
                                        </div>

                                        {/* Customer Info */}
                                        <div className="p-6 space-y-4">
                                            <div>
                                                <label className="text-xs font-black text-gray-400 tracking-wider uppercase block mb-1.5">
                                                    Full Name *
                                                </label>
                                                <Input
                                                    value={customerName}
                                                    onChange={(e) => setCustomerName(e.target.value)}
                                                    placeholder="John Doe"
                                                    className="rounded-xl"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-black text-gray-400 tracking-wider uppercase block mb-1.5">
                                                    Email Address *
                                                </label>
                                                <Input
                                                    type="email"
                                                    value={customerEmail}
                                                    onChange={(e) => { setCustomerEmail(e.target.value); setEmailStatus(null); }}
                                                    onBlur={handleEmailBlur}
                                                    placeholder="john@email.com"
                                                    className="rounded-xl"
                                                />

                                                {/* Migrated user banner */}
                                                {emailStatus?.needsPasswordReset && (
                                                    <div className="mt-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                                                        <p className="text-sm font-semibold text-amber-800 mb-1">Welcome back to Urban Churn!</p>
                                                        <p className="text-xs text-amber-700 mb-3">
                                                            We have a brand new website and ordering system. To access your account, you'll need to set a new password.
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
                                            <div>
                                                <label className="text-xs font-black text-gray-400 tracking-wider uppercase block mb-1.5">
                                                    Phone (Optional)
                                                </label>
                                                <Input
                                                    type="tel"
                                                    value={customerPhone}
                                                    onChange={(e) => setCustomerPhone(e.target.value)}
                                                    placeholder="(555) 123-4567"
                                                    className="rounded-xl"
                                                />
                                            </div>

                                            {/* Account mode */}
                                            <div>
                                                <label className="text-xs font-black text-gray-400 tracking-wider uppercase block mb-2">
                                                    Account
                                                </label>
                                                <div className="flex flex-col sm:flex-row gap-2">
                                                    {([
                                                        { value: "guest", label: "Continue as guest" },
                                                        { value: "create", label: "Create an account" },
                                                        { value: "login", label: "Sign in" },
                                                    ] as const).map((opt) => (
                                                        <button
                                                            key={opt.value}
                                                            type="button"
                                                            onClick={() => setAccountMode(opt.value)}
                                                            className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium border-2 transition-all ${accountMode === opt.value
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
                                            </div>

                                            {/* Password field (shown for create/login) */}
                                            {accountMode !== "guest" && (
                                                <div>
                                                    <label className="text-xs font-black text-gray-400 tracking-wider uppercase block mb-1.5">
                                                        Password *
                                                    </label>
                                                    <Input
                                                        type="password"
                                                        value={password}
                                                        onChange={(e) => setPassword(e.target.value)}
                                                        placeholder={accountMode === "create" ? "Create a password (min 8 characters)" : "Enter your password"}
                                                        className="rounded-xl"
                                                    />
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

                                            {/* Square Card Payment */}
                                            {squareAppId && (
                                                <div>
                                                    <label className="text-xs font-black text-gray-400 tracking-wider uppercase block mb-1.5">
                                                        Payment
                                                    </label>
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

                                            <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${agreedToTerms ? "border-[#A1AB74]/40 bg-[#A1AB74]/5" : "border-gray-200 bg-gray-50 hover:border-gray-300"}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={agreedToTerms}
                                                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                                                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#A1AB74] focus:ring-[#A1AB74] accent-[#A1AB74] shrink-0"
                                                />
                                                <span className="text-sm text-gray-600 leading-snug">
                                                    I agree to the <Link href="/terms" className="text-[#A1AB74] font-semibold hover:underline" target="_blank">Terms &amp; Conditions</Link> and <Link href="/privacy" className="text-[#A1AB74] font-semibold hover:underline" target="_blank">Privacy Policy</Link>.
                                                </span>
                                            </label>

                                            <Button
                                                onClick={handlePurchase}
                                                disabled={purchaseMutation.isPending || (squareAppId !== null && !squareReady)}
                                                className="w-full bg-[#A1AB74] hover:bg-[#8a9360] text-white font-black py-6 rounded-xl text-base"
                                            >
                                                {purchaseMutation.isPending
                                                    ? "Processing..."
                                                    : `Complete Purchase — $${(totalCents / 100).toFixed(2)}`}
                                            </Button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Ask a Question Modal */}
            <Dialog open={questionOpen} onOpenChange={setQuestionOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black">Ask a Question</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-gray-500 -mt-2">
                        Have a question about <strong>{event.title}</strong>? We'll get back to you as soon as we can.
                    </p>
                    <div className="space-y-4 pt-2">
                        <div>
                            <label className="text-xs font-bold text-gray-500 tracking-wider uppercase block mb-1.5">Your Name *</label>
                            <Input
                                value={qName}
                                onChange={(e) => setQName(e.target.value)}
                                placeholder="Jane Doe"
                                className="rounded-xl"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 tracking-wider uppercase block mb-1.5">Email Address *</label>
                            <Input
                                type="email"
                                value={qEmail}
                                onChange={(e) => setQEmail(e.target.value)}
                                placeholder="jane@email.com"
                                className="rounded-xl"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 tracking-wider uppercase block mb-1.5">Your Question *</label>
                            <Textarea
                                value={qMessage}
                                onChange={(e) => setQMessage(e.target.value)}
                                rows={4}
                                placeholder="What would you like to know?"
                                className="rounded-xl"
                            />
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <Button variant="outline" onClick={() => setQuestionOpen(false)} className="rounded-xl">
                                Cancel
                            </Button>
                            <Button
                                onClick={() => questionMutation.mutate({ name: qName.trim(), email: qEmail.trim(), message: qMessage.trim() })}
                                disabled={!qName.trim() || !qEmail.trim() || !qMessage.trim() || questionMutation.isPending}
                                className="bg-[#A1AB74] hover:bg-[#8a9360] text-white font-bold rounded-xl"
                            >
                                {questionMutation.isPending ? "Sending..." : "Send Question"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

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
                                We sent a password reset link to <strong>{customerEmail}</strong>.
                            </p>
                            <p className="text-gray-400 text-xs">
                                Your ticket selections are saved and will be waiting for you when you get back.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <p className="text-gray-600 text-sm">
                                We'll send a password reset link to your email. Your ticket selections will be saved while you reset your password.
                            </p>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <Input
                                    type="email"
                                    value={customerEmail}
                                    onChange={(e) => setCustomerEmail(e.target.value)}
                                    placeholder="john@email.com"
                                    className="rounded-xl"
                                />
                            </div>
                            <Button
                                onClick={handleForgotPassword}
                                disabled={forgotPasswordLoading || !customerEmail.trim()}
                                className="w-full bg-[#A1AB74] hover:bg-[#8a9360] text-white font-bold rounded-xl"
                            >
                                {forgotPasswordLoading ? "Sending..." : "Send Reset Link"}
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <Footer />
        </div>
    );
}
