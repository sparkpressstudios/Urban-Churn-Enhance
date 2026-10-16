import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import OptimizedImage from "@/components/OptimizedImage";
import RotatingPhotoStrip from "@/components/RotatingPhotoStrip";
import RotatingFlavoursShowcase from "@/components/RotatingFlavoursShowcase";
import { Link } from "wouter";
import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatHoursForDisplay, getOpenStatus } from "@/lib/utils";
import { mergeLocations, type LocationInfo, type VendorCategory } from "@/lib/locations-data";

const CATEGORY_LABELS: Record<VendorCategory, string> = {
  scoop_shop: "Scoop Shops",
  grocery: "Grocery",
  restaurant: "Restaurants",
  cafe: "Cafés",
  market: "Markets",
  other: "Other",
};
const CATEGORY_ORDER: VendorCategory[] = ["scoop_shop", "grocery", "restaurant", "cafe", "market", "other"];

const BASE = import.meta.env.BASE_URL;

const fallbackImages = [
  `${BASE}images/uc-photo-1.jpg`,
  `${BASE}images/uc-photo-2.jpg`,
  `${BASE}images/uc-photo-3.jpg`,
  `${BASE}images/uc-photo-5.jpg`,
];

function HoursRow({ days, time, hasBorder }: { days: string; time: string; hasBorder: boolean }) {
  const [open, setOpen] = useState(false);
  const isClosed = time === "Closed";

  return (
    <div className={hasBorder ? "border-t border-[#eeece5]" : ""}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 text-left cursor-pointer hover:bg-[#f3f1ea] transition-colors"
        type="button"
      >
        <span className="text-[#666] text-xs font-medium">{days}</span>
        <span className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${isClosed ? "bg-red-400" : "bg-green-400"}`} />
          <svg
            className={`w-3.5 h-3.5 text-[#999] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>
      <div
        className="grid transition-all duration-200 ease-in-out"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="px-3.5 pb-2.5">
            <span className={`text-sm font-semibold ${isClosed ? "text-red-400" : "text-[#1a1a1f]"}`}>
              {time}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Locations() {
  const { data: apiLocations } = useQuery({ queryKey: ["public", "locations"], queryFn: () => api.getPublicLocations() });
  const { data: rotatingFlavours = [] } = useQuery<any[]>({ queryKey: ["public", "rotating-flavours"], queryFn: () => api.getPublicRotatingFlavours() });
  const [menuModal, setMenuModal] = useState<{ name: string; url: string } | null>(null);

  const locations: LocationInfo[] = mergeLocations(apiLocations);
  const shopLocations = locations.filter(l => l.type !== "vendor");
  const vendorLocations = locations.filter(l => l.type === "vendor");

  const [vendorCategory, setVendorCategory] = useState<VendorCategory | "all">("all");
  const availableCategories = CATEGORY_ORDER.filter(c => vendorLocations.some(v => v.vendorCategory === c));
  const filteredVendors = vendorCategory === "all"
    ? vendorLocations
    : vendorLocations.filter(v => v.vendorCategory === vendorCategory);

  return (
    <div className="min-h-screen" style={{ fontFamily: "'Space Grotesk', 'Poppins', sans-serif" }}>
      <SEO
        title="Locations & Hours | Urban Churn — Central PA Ice Cream Shops"
        description="Visit Urban Churn in Carlisle, Mechanicsburg, or Harrisburg, PA. See store hours, get directions, and view our live menu. Can't make it in? Pre-order online for pickup."
        keywords="Urban Churn locations, ice cream shop Carlisle PA, ice cream Mechanicsburg PA, ice cream Harrisburg PA, Central PA ice cream shop, ice cream near me, store hours"
        canonical="/locations"
        jsonLd={[
          { "@context": "https://schema.org", "@type": "IceCreamShop", name: "Urban Churn — Carlisle", image: "https://urbanchurn.com/images/uc-locations-hero.jpg", address: { "@type": "PostalAddress", streetAddress: "45 W High St", addressLocality: "Carlisle", addressRegion: "PA", postalCode: "17013", addressCountry: "US" }, geo: { "@type": "GeoCoordinates", latitude: 40.2015, longitude: -77.1886 }, telephone: "+1-717-884-9396", url: "https://urbanchurn.com/locations", priceRange: "$$", servesCuisine: "Ice Cream", menu: "https://urbanchurn.com/pre-order", hasMap: "https://maps.google.com/?q=Urban+Churn+Carlisle+PA", openingHoursSpecification: [{ "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], opens: "12:00", closes: "21:00" }, { "@type": "OpeningHoursSpecification", dayOfWeek: ["Saturday", "Sunday"], opens: "12:00", closes: "21:00" }] },
          { "@context": "https://schema.org", "@type": "IceCreamShop", name: "Urban Churn — Mechanicsburg", image: "https://urbanchurn.com/images/uc-locations-hero.jpg", address: { "@type": "PostalAddress", addressLocality: "Mechanicsburg", addressRegion: "PA", addressCountry: "US" }, geo: { "@type": "GeoCoordinates", latitude: 40.2143, longitude: -76.9991 }, telephone: "+1-717-884-9396", url: "https://urbanchurn.com/locations", priceRange: "$$", servesCuisine: "Ice Cream", menu: "https://urbanchurn.com/pre-order" },
          { "@context": "https://schema.org", "@type": "IceCreamShop", name: "Urban Churn — Harrisburg", image: "https://urbanchurn.com/images/uc-locations-hero.jpg", address: { "@type": "PostalAddress", addressLocality: "Harrisburg", addressRegion: "PA", addressCountry: "US" }, geo: { "@type": "GeoCoordinates", latitude: 40.2732, longitude: -76.8867 }, telephone: "+1-717-884-9396", url: "https://urbanchurn.com/locations", priceRange: "$$", servesCuisine: "Ice Cream", menu: "https://urbanchurn.com/pre-order" }
        ]}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Locations", url: "/locations" },
        ]}
      />
      <Navbar />

      {/* Hero */}
      <section className="bg-[#111118] text-white pt-36 pb-20 md:pt-44 md:pb-24 relative overflow-hidden">
        <div className="absolute inset-0 opacity-40">
          <OptimizedImage src="uc-locations-hero.jpg" alt="Urban Churn ice cream shop locations in Central Pennsylvania" className="w-full h-full object-cover object-center" />
          <div className="absolute inset-0 bg-[#111118]/40" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-8">
          <p className="text-[#d4a853] text-sm font-black tracking-[0.2em] uppercase mb-4">Locations</p>
          <h1 className="text-5xl md:text-7xl font-black leading-none tracking-tight mb-6">
            {apiLocations?.length || 4} locations across<br />Central PA.
          </h1>
          <p className="text-white/60 text-xl max-w-xl leading-relaxed mb-8">
            Carlisle, Mechanicsburg, and Harrisburg. See our live menu and hours at each shop.
          </p>
          <div className="flex flex-wrap gap-4">
            <a
              href="#locations"
              onClick={(e) => { e.preventDefault(); document.getElementById('locations')?.scrollIntoView({ behavior: 'smooth' }); }}
              className="bg-[#d4a853] text-white px-8 py-4 rounded-full font-black text-sm hover:bg-[#c09540] transition-colors inline-flex items-center gap-2"
            >
              📍 View Locations & Menu
            </a>
            {rotatingFlavours.length > 0 && (
              <a
                href="#rotating-flavours"
                onClick={(e) => { e.preventDefault(); document.getElementById('rotating-flavours')?.scrollIntoView({ behavior: 'smooth' }); }}
                className="bg-white/10 backdrop-blur border border-white/20 text-white px-8 py-4 rounded-full font-black text-sm hover:bg-white/20 transition-colors inline-flex items-center gap-2"
              >
                🍦 This Month's Flavours
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Location Cards */}
      <section id="locations" className="bg-[#f9f8f4] py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-8">
          {/* Our Shops */}
          <h2 className="text-3xl font-black text-[#1a1a1f] mb-8">Our Shops</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {shopLocations.map((loc, idx) => {
              const hours = loc.hideHours ? [] : formatHoursForDisplay(loc.hours);
              const status = loc.hideHours ? null : getOpenStatus(loc.hours);
              const img = fallbackImages[idx % fallbackImages.length];
              return (
                <div key={loc.name} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow group">
                  {/* Photo header */}
                  <div className="relative h-44 overflow-hidden">
                    <img src={img} alt={loc.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    {status && (
                      <div className="absolute top-3 right-3">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full backdrop-blur ${status.isOpen ? "bg-green-500/90 text-white" : "bg-white/90 text-[#1a1a1f]"}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${status.isOpen ? "bg-white animate-pulse" : "bg-gray-400"}`} />
                          {status.label}
                        </span>
                      </div>
                    )}
                    <div className="absolute bottom-3 left-4">
                      <h2 className="text-lg font-black text-white drop-shadow-lg">{loc.name}</h2>
                    </div>
                    <div className="absolute top-3 left-3">
                      <div className="w-2 h-8 rounded-full" style={{ background: loc.accentColor }} />
                    </div>
                  </div>

                  <div className="p-5">
                    {/* Address */}
                    <p className="text-[#555] text-sm leading-relaxed mb-1">{loc.address}</p>
                    <p className="text-[#555] text-sm mb-4">{loc.city}, {loc.state} {loc.zip}</p>

                    {/* Status detail */}
                    {status && (status.closesAt || status.opensAt) && (
                      <p className="text-xs text-[#888] mb-4">{status.closesAt || status.opensAt}</p>
                    )}

                    {/* Hours accordion */}
                    {hours.length > 0 && (
                      <div className="bg-[#faf9f5] rounded-xl mb-5 overflow-hidden">
                        {hours.map((h, i) => (
                          <HoursRow key={h.days} days={h.days} time={h.time} hasBorder={i > 0} />
                        ))}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                      {loc.menuUrl && (
                        <button
                          onClick={() => setMenuModal({ name: loc.name, url: loc.menuUrl })}
                          className="flex items-center gap-2 justify-center bg-[#d4a853] text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-[#c09540] transition-colors cursor-pointer"
                        >
                          🍦 View Flavor Menu
                        </button>
                      )}
                      <div className="flex gap-2">
                        <a
                          href={loc.mapUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 flex items-center gap-2 justify-center border border-[#e0ddd5] text-[#1a1a1f] px-3 py-2.5 rounded-xl font-bold text-sm hover:bg-[#f2f0e8] transition-colors"
                        >
                          📍 Directions
                        </a>
                        <a
                          href={`tel:${loc.phone.replace(/-/g, "")}`}
                          className="flex items-center gap-2 justify-center border border-[#e0ddd5] text-[#1a1a1f] px-3 py-2.5 rounded-xl font-bold text-sm hover:bg-[#f2f0e8] transition-colors"
                        >
                          📞 Call
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Partner Vendors */}
          {vendorLocations.length > 0 && (
            <div className="mt-20">
              <h2 className="text-3xl font-black text-[#1a1a1f] mb-3">Partner Vendors</h2>
              <p className="text-[#888] text-sm mb-6">Find our ice cream at these partner locations too.</p>

              {availableCategories.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-8">
                  <button
                    type="button"
                    onClick={() => setVendorCategory("all")}
                    className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-colors ${vendorCategory === "all" ? "bg-purple-600 text-white" : "bg-white border border-purple-200 text-purple-700 hover:bg-purple-50"}`}
                  >
                    All ({vendorLocations.length})
                  </button>
                  {availableCategories.map((c) => {
                    const count = vendorLocations.filter(v => v.vendorCategory === c).length;
                    const active = vendorCategory === c;
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setVendorCategory(c)}
                        className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-colors ${active ? "bg-purple-600 text-white" : "bg-white border border-purple-200 text-purple-700 hover:bg-purple-50"}`}
                      >
                        {CATEGORY_LABELS[c]} ({count})
                      </button>
                    );
                  })}
                </div>
              )}

              {filteredVendors.length === 0 ? (
                <p className="text-[#888] text-sm italic">No vendors in this category yet.</p>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredVendors.map((loc) => {
                    const hours = loc.hideHours ? [] : formatHoursForDisplay(loc.hours);
                    const status = loc.hideHours ? null : getOpenStatus(loc.hours);
                    return (
                      <div key={loc.name} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow border border-purple-100">
                        <div className="p-5">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-black text-lg">
                              {loc.name.charAt(0)}
                            </div>
                            <div>
                              <h3 className="font-black text-[#1a1a1f]">{loc.name}</h3>
                              <span className="text-xs text-purple-600 font-bold uppercase tracking-wider">
                                {loc.vendorCategory ? CATEGORY_LABELS[loc.vendorCategory] : "Partner Vendor"}
                              </span>
                            </div>
                            {status && (
                              <span className={`ml-auto inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full ${status.isOpen ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${status.isOpen ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
                                {status.label}
                              </span>
                            )}
                          </div>
                          <p className="text-[#555] text-sm leading-relaxed mb-1">{loc.address}</p>
                          <p className="text-[#555] text-sm mb-4">{loc.city}, {loc.state} {loc.zip}</p>

                          {hours.length > 0 && (
                            <div className="bg-[#faf9f5] rounded-xl mb-4 overflow-hidden">
                              {hours.map((h, i) => (
                                <HoursRow key={h.days} days={h.days} time={h.time} hasBorder={i > 0} />
                              ))}
                            </div>
                          )}

                          <div className="flex gap-2">
                            {loc.mapUrl && (
                              <a
                                href={loc.mapUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 flex items-center gap-2 justify-center border border-[#e0ddd5] text-[#1a1a1f] px-3 py-2.5 rounded-xl font-bold text-sm hover:bg-[#f2f0e8] transition-colors"
                              >
                                📍 Directions
                              </a>
                            )}
                            {loc.phone && (
                              <a
                                href={`tel:${loc.phone.replace(/-/g, "")}`}
                                className="flex items-center gap-2 justify-center border border-[#e0ddd5] text-[#1a1a1f] px-3 py-2.5 rounded-xl font-bold text-sm hover:bg-[#f2f0e8] transition-colors"
                              >
                                📞 Call
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* This Month's Rotating Scoop Flavours */}
      {rotatingFlavours.length > 0 && (
        <RotatingFlavoursShowcase flavours={rotatingFlavours} />
      )}

      {/* Photo Strip */}
      <section className="bg-[#f2f0e8] py-20 relative">
        <div className="absolute top-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 0 C480 60 960 60 1440 0 L1440 0 L0 0 Z" fill="#f9f8f4" />
          </svg>
        </div>
        <div className="max-w-7xl mx-auto px-8 pt-8">
          <RotatingPhotoStrip />
        </div>
      </section>

      {/* Pre-order note */}
      <section className="relative text-white py-24 text-center overflow-hidden">
        <div className="absolute inset-0">
          <img src={`${BASE}images/uc-pints-open.jpg`} alt="Urban Churn ice cream pints ready for pickup" className="w-full h-full object-cover object-center" />
          <div className="absolute inset-0 bg-[#111118]/70" />
        </div>
        <div className="relative max-w-2xl mx-auto px-8">
          <h3 className="text-3xl md:text-4xl font-black mb-3">Can't make it in? Pre-order online.</h3>
          <p className="text-white/60 mb-8">Pick a flavor, choose your location, and we'll have it ready for you.</p>
          <Link href="/pre-order" className="bg-[#A1AB74] text-white px-8 py-4 rounded-full font-black hover:bg-[#8a9360] transition-colors">
            Pre-Order Now
          </Link>
        </div>
      </section>

      <Footer />

      {/* Flavor Menu Lightbox */}
      {menuModal && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 py-3 md:px-6 md:py-4 shrink-0">
            <p className="text-white/80 text-sm md:text-base font-bold truncate pr-4">
              {menuModal.name} <span className="text-white/40 font-normal">— Flavor Menu</span>
            </p>
            <button
              onClick={() => setMenuModal(null)}
              className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white text-lg cursor-pointer"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          {/* Full-bleed iframe */}
          <div className="flex-1 min-h-0">
            <iframe
              src={menuModal.url}
              className="w-full h-full border-0"
              title={`${menuModal.name} flavor menu`}
              allow="autoplay"
            />
          </div>
        </div>
      )}
    </div>
  );
}
