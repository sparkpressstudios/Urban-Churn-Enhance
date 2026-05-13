import { useState, useMemo, useRef } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, Ticket, ChevronLeft, ChevronRight, Lock } from "lucide-react";

const BASE = import.meta.env.BASE_URL;

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
        weekday: "short",
        month: "short",
        day: "numeric",
    });
}

function formatDateGroupHeading(dateStr: string) {
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

export default function Events() {
    const [selectedDate, setSelectedDate] = useState<Date | undefined>();
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const listRef = useRef<HTMLDivElement>(null);

    const { data: events = [], isLoading, isError } = useQuery({
        queryKey: ["public", "events"],
        queryFn: () => api.getPublicEvents(),
    });

    // Dates that have events (for calendar dots)
    const eventDates = useMemo(() => {
        const dates = new Set<string>();
        events.forEach((e: any) => dates.add(e.eventDate));
        return dates;
    }, [events]);

    // Filter events
    const filteredEvents = useMemo(() => {
        let filtered = events;
        if (selectedCategory) {
            filtered = filtered.filter((e: any) => e.category === selectedCategory);
        }
        if (selectedDate) {
            const dateStr = selectedDate.toISOString().split("T")[0];
            filtered = filtered.filter((e: any) => e.eventDate === dateStr);
        }
        return filtered;
    }, [events, selectedCategory, selectedDate]);

    // Group by date
    const groupedEvents = useMemo(() => {
        const groups: Record<string, any[]> = {};
        filteredEvents.forEach((e: any) => {
            if (!groups[e.eventDate]) groups[e.eventDate] = [];
            groups[e.eventDate].push(e);
        });
        return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
    }, [filteredEvents]);

    const categories = Object.keys(CATEGORY_LABELS);

    const handleDateSelect = (date: Date | undefined) => {
        if (selectedDate && date && selectedDate.toDateString() === date.toDateString()) {
            setSelectedDate(undefined);
            return;
        }
        setSelectedDate(date);
        // Scroll to list
        setTimeout(() => {
            listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
    };

    return (
        <div className="min-h-screen" style={{ fontFamily: "'Space Grotesk', 'Poppins', sans-serif" }}>
            <SEO
                title="Events & Tastings | Urban Churn — Tickets & Calendar"
                description="Explore Urban Churn events — tastings, pop-ups, trivia nights, festivals & more in Central PA. Browse the calendar and grab your tickets before they sell out."
                keywords="Urban Churn events, ice cream tasting events, ice cream festival PA, trivia night, pop-up events, Central PA events, ice cream tickets"
                canonical="/events"
                breadcrumbs={[
                    { name: "Home", url: "/" },
                    { name: "Events", url: "/events" },
                ]}
            />
            <Navbar />

            {/* Hero */}
            <section className="bg-[#111118] text-white relative overflow-hidden">
                <div className="absolute inset-0">
                    <img src={`${BASE}images/uc-events-hero.jpg`} alt="Urban Churn events, tastings and ice cream experiences" className="w-full h-full object-cover object-center opacity-40" />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#111118] via-[#111118]/50 to-transparent" />
                </div>
                <div className="relative max-w-7xl mx-auto px-4 sm:px-8 pt-36 pb-20 md:pt-44 md:pb-24">
                    <p className="text-[#d4a853] text-sm font-black tracking-[0.2em] uppercase mb-4">Events & Experiences</p>
                    <h1 className="text-5xl md:text-7xl font-black leading-none tracking-tight mb-6">
                        Scoops, sounds<br />& good times.
                    </h1>
                    <p className="text-white/60 text-xl max-w-xl leading-relaxed">
                        Tastings, pop-ups, trivia nights, and more. Grab your tickets before they're gone.
                    </p>
                </div>
            </section>

            {/* Calendar + Event List */}
            <section className="bg-[#f9f8f4] pt-28 pb-20 md:pt-36 md:pb-28">
                <div className="max-w-7xl mx-auto px-4 sm:px-8">
                    <div className="grid lg:grid-cols-[360px_1fr] gap-10">
                        {/* Calendar Sidebar */}
                        <div className="lg:sticky lg:top-24 lg:self-start">
                            <div className="bg-white rounded-2xl shadow-sm p-6">
                                <h3 className="text-lg font-black text-[#1a1a1f] mb-4">Find Events</h3>
                                <Calendar
                                    mode="single"
                                    selected={selectedDate}
                                    onSelect={handleDateSelect}
                                    modifiers={{ hasEvent: (date: Date) => eventDates.has(date.toISOString().split("T")[0]) }}
                                    modifiersStyles={{
                                        hasEvent: {
                                            fontWeight: 900,
                                            position: "relative",
                                        },
                                    }}
                                    modifiersClassNames={{
                                        hasEvent: "event-dot-day",
                                    }}
                                    className="w-full"
                                />
                                {selectedDate && (
                                    <button
                                        onClick={() => setSelectedDate(undefined)}
                                        className="w-full mt-3 text-sm text-gray-500 hover:text-gray-700 underline"
                                    >
                                        Clear date filter
                                    </button>
                                )}

                                {/* Category Filters */}
                                <div className="mt-6 border-t pt-5">
                                    <p className="text-xs font-black text-gray-400 tracking-widest uppercase mb-3">Categories</p>
                                    <div className="flex flex-wrap gap-2">
                                        {categories.map((cat) => (
                                            <button
                                                key={cat}
                                                onClick={() =>
                                                    setSelectedCategory(
                                                        selectedCategory === cat ? null : cat,
                                                    )
                                                }
                                                className={`text-xs font-bold px-3 py-1.5 rounded-full transition-all ${selectedCategory === cat
                                                    ? "text-white"
                                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                                    }`}
                                                style={
                                                    selectedCategory === cat
                                                        ? { background: CATEGORY_COLORS[cat] }
                                                        : undefined
                                                }
                                            >
                                                {CATEGORY_LABELS[cat]}
                                            </button>
                                        ))}
                                        {selectedCategory && (
                                            <button
                                                onClick={() => setSelectedCategory(null)}
                                                className="text-xs text-gray-400 hover:text-gray-600 underline ml-1"
                                            >
                                                Clear
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Event List */}
                        <div ref={listRef}>
                            <div className="flex items-end justify-between mb-6">
                                <div>
                                    <p className="text-[#d4a853] text-xs font-black tracking-[0.2em] uppercase mb-2">Browse</p>
                                    <h2 className="text-3xl md:text-4xl font-black text-[#1a1a1f]">
                                        {selectedDate
                                            ? formatDateGroupHeading(selectedDate.toISOString().split("T")[0])
                                            : "All upcoming events."}
                                    </h2>
                                </div>
                                <span className="text-sm text-gray-400 font-medium">
                                    {filteredEvents.length} event{filteredEvents.length !== 1 ? "s" : ""}
                                </span>
                            </div>

                            {isLoading && (
                                <div className="flex justify-center py-20">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#A1AB74]" />
                                </div>
                            )}

                            {isError && (
                                <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
                                    <p className="text-5xl mb-4">⚠️</p>
                                    <p className="text-gray-500 text-lg">Failed to load events. Please try again later.</p>
                                </div>
                            )}

                            {!isLoading && filteredEvents.length === 0 && (
                                <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
                                    <p className="text-5xl mb-4">🎪</p>
                                    <p className="text-gray-500 text-lg">No events found{selectedDate ? " on this date" : ""}.</p>
                                    {(selectedDate || selectedCategory) && (
                                        <button
                                            onClick={() => {
                                                setSelectedDate(undefined);
                                                setSelectedCategory(null);
                                            }}
                                            className="mt-4 text-[#A1AB74] font-bold hover:underline"
                                        >
                                            Clear filters
                                        </button>
                                    )}
                                </div>
                            )}

                            {groupedEvents.map(([date, dateEvents]) => (
                                <div key={date} className="mb-8">
                                    {!selectedDate && (
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-2 h-2 rounded-full bg-[#A1AB74]" />
                                            <h3 className="text-sm font-black text-gray-400 tracking-widest uppercase">
                                                {formatDateGroupHeading(date)}
                                            </h3>
                                            <div className="flex-1 h-px bg-gray-200" />
                                        </div>
                                    )}

                                    <div className="space-y-4">
                                        {dateEvents.map((event: any) => (
                                            <Link key={event.id} href={`/events/${event.slug}`}>
                                                <div className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col md:flex-row">
                                                    {/* Image */}
                                                    <div className="md:w-72 relative overflow-hidden flex-shrink-0">
                                                        {event.imageUrl ? (
                                                            <img
                                                                src={event.imageUrl.startsWith("http") ? event.imageUrl : event.imageUrl.startsWith("/uploads") ? `/api${event.imageUrl}` : event.imageUrl}
                                                                alt={event.title}
                                                                loading="lazy"
                                                                className="w-full h-48 md:h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                            />
                                                        ) : (
                                                            <div
                                                                className="w-full h-48 md:h-full flex items-center justify-center text-5xl"
                                                                style={{ background: event.accentColor || "#A1AB74" }}
                                                            >
                                                                🎟️
                                                            </div>
                                                        )}
                                                        <span
                                                            className="absolute top-3 left-3 text-white text-xs font-black px-2.5 py-1 rounded-full"
                                                            style={{ background: CATEGORY_COLORS[event.category] || "#888" }}
                                                        >
                                                            {CATEGORY_LABELS[event.category] || "Event"}
                                                        </span>
                                                        {event.isPrivate && (
                                                            <span className="absolute top-3 right-3 bg-black/60 text-white text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                                                                <Lock className="w-3 h-3" /> Invite Only
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Content */}
                                                    <div className="flex-1 p-6 flex flex-col justify-between">
                                                        <div>
                                                            <h3 className="text-xl font-black text-[#1a1a1f] group-hover:text-[#A1AB74] transition-colors mb-2">
                                                                {event.title}
                                                            </h3>
                                                            {event.description && (
                                                                <p className="text-gray-500 text-sm line-clamp-2 mb-4">
                                                                    {event.description.replace(/<[^>]*>/g, '')}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center justify-between flex-wrap gap-3">
                                                            <div className="flex items-center gap-4 text-sm text-gray-500">
                                                                <span className="flex items-center gap-1.5">
                                                                    <Clock className="w-4 h-4" />
                                                                    {formatTime(event.startTime)}
                                                                    {event.endTime && ` – ${formatTime(event.endTime)}`}
                                                                </span>
                                                                <span className="flex items-center gap-1.5">
                                                                    <MapPin className="w-4 h-4" />
                                                                    {event.locationName || event.venueName || "TBA"}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                {event.soldOut ? (
                                                                    <Badge variant="destructive" className="font-black">
                                                                        Sold Out
                                                                    </Badge>
                                                                ) : (
                                                                    <>
                                                                        <span className="text-sm text-gray-400">
                                                                            {event.totalAvailable} tickets left
                                                                        </span>
                                                                        <span className="bg-[#A1AB74] text-white px-4 py-2 rounded-full text-sm font-black group-hover:bg-[#8a9360] transition-colors flex items-center gap-1.5">
                                                                            <Ticket className="w-4 h-4" />
                                                                            From ${(event.lowestPriceCents / 100).toFixed(2)}
                                                                        </span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* CSS for event dot indicator on calendar */}
            <style>{`
                .event-dot-day::after {
                    content: '';
                    position: absolute;
                    bottom: 2px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 5px;
                    height: 5px;
                    border-radius: 50%;
                    background: #A1AB74;
                }
            `}</style>

            <Footer />
        </div>
    );
}
