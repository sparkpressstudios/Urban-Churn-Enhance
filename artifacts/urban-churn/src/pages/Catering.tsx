import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { Link } from "wouter";
import { api } from "@/lib/api";

const BASE = import.meta.env.BASE_URL;

export default function Catering() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    eventType: "",
    date: "",
    guestCount: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await api.submitCateringForm(form);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const WHY = [
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7" stroke="#A1AB74" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22V12" /><path d="M12 12C12 12 8 10 6 7c-1.5-2.5 0-6 3-6 1.5 0 2.5.8 3 2 .5-1.2 1.5-2 3-2 3 0 4.5 3.5 3 6-2 3-6 5-6 5z" />
        </svg>
      ),
      title: "Natural Ingredients",
      body: "No artificial flavoring or food coloring. We use local PA 16% butterfat dairy and natural ingredients prepared in-house.",
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7" stroke="#d4a853" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ),
      title: "Unique Experience",
      body: "We can churn custom flavors dedicated to your event, or choose from our 9 staple flavors. Something for every occasion.",
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7" stroke="#A1AB74" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="3" /><path d="M3 9h18M9 21V9" />
        </svg>
      ),
      title: "Equipment Rental",
      body: "Need a freezer or cooler? We can provide portable freezers or coolers with dry ice to keep product frozen anywhere.",
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7" stroke="#d4a853" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
      title: "Any Event Size",
      body: "Whether it's an intimate wedding dinner or a large corporate event, we scale our service to fit your needs.",
    },
  ];

  return (
    <div className="min-h-screen" style={{ fontFamily: "'Space Grotesk', 'Poppins', sans-serif" }}>
      <SEO
        title="Ice Cream Catering & Events | Urban Churn — Weddings, Corporate & More"
        description="Book Urban Churn for your next event. Craft ice cream catering for weddings, corporate events, school functions & private parties in Central PA. Custom flavors & equipment rental available."
        keywords="ice cream catering, event catering PA, wedding ice cream, corporate catering ice cream, party catering, custom ice cream flavors, Central PA catering, ice cream bar rental"
        canonical="/catering"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Service",
          name: "Urban Churn Ice Cream Catering",
          provider: { "@type": "Organization", name: "Urban Churn" },
          description: "Craft ice cream catering for weddings, corporate events, school functions, and private parties in Central Pennsylvania.",
          areaServed: { "@type": "State", name: "Pennsylvania" },
          serviceType: "Ice Cream Catering"
        }}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Catering", url: "/catering" },
        ]}
      />
      <Navbar />

      {/* Hero */}
      <section className="relative bg-[#111118] text-white overflow-hidden">
        <div className="absolute inset-0 opacity-50" style={{ backgroundImage: `url(${BASE}images/uc-september-193.jpg)`, backgroundSize: "cover", backgroundPosition: "center 40%" }}>
          <div className="absolute inset-0 bg-gradient-to-r from-[#111118] via-[#111118]/50 to-transparent" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-8 pt-36 pb-24 md:pt-44 md:pb-28">
          <p className="text-[#d4a853] text-sm font-black tracking-[0.2em] uppercase mb-4">Order Ice Cream For…</p>
          <h1 className="text-5xl md:text-7xl font-black leading-none tracking-tight mb-6">
            Catering<br />&amp; Events.
          </h1>
          <p className="text-white/60 text-lg md:text-xl max-w-xl leading-relaxed mb-8">
            We provide ice cream — both staple and unique flavours — for events of all types. Weddings, corporate events, school functions and more.
          </p>
          <a
            href="#catering-form"
            onClick={(e) => { e.preventDefault(); document.getElementById('catering-form')?.scrollIntoView({ behavior: 'smooth' }); }}
            className="bg-[#d4a853] text-white px-8 py-4 rounded-full font-black text-sm hover:bg-[#c09540] transition-colors inline-flex items-center gap-2"
          >
            📋 Request a Quote
          </a>
        </div>
      </section>

      {/* Why Urban Churn */}
      <section className="bg-[#f9f8f4] py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-8">
          <div className="text-center mb-14">
            <p className="text-[#d4a853] text-xs font-black tracking-[0.2em] uppercase mb-3">Why Choose Us</p>
            <h2 className="text-4xl md:text-5xl font-black text-[#1a1a1f]">Why use our ice cream?</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {WHY.map((w) => (
              <div key={w.title} className="bg-white rounded-2xl p-7 shadow-sm">
                <div className="mb-4">{w.icon}</div>
                <h3 className="font-black text-[#1a1a1f] text-lg mb-2">{w.title}</h3>
                <p className="text-[#666] text-sm leading-relaxed">{w.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Event types */}
      <section className="bg-[#f2f0e8] py-20 relative">
        <div className="absolute top-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 0 C480 60 960 60 1440 0 L1440 0 L0 0 Z" fill="#f9f8f4" />
          </svg>
        </div>
        <div className="max-w-7xl mx-auto px-8 pt-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-[#d4a853] text-xs font-black tracking-[0.2em] uppercase mb-4">What We Serve</p>
              <h2 className="text-4xl font-black text-[#1a1a1f] mb-6">Perfect for any occasion.</h2>
              <div className="space-y-4">
                {[
                  { icon: (<svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 mt-0.5 shrink-0" stroke="#d4a853" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>), label: "Weddings & Receptions", desc: "A sweet finale for your special day. Custom flavors available." },
                  { icon: (<svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 mt-0.5 shrink-0" stroke="#A1AB74" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /></svg>), label: "Corporate Events", desc: "Impress your team and clients with premium craft ice cream." },
                  { icon: (<svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 mt-0.5 shrink-0" stroke="#d4a853" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5-10-5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /></svg>), label: "School & Community Events", desc: "Seasonal flavors that delight students and families alike." },
                  { icon: (<svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 mt-0.5 shrink-0" stroke="#A1AB74" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>), label: "Private Parties", desc: "Birthdays, celebrations, backyard gatherings — we show up." },
                ].map((e) => (
                  <div key={e.label} className="flex gap-4 items-start bg-white rounded-xl p-5">
                    {e.icon}
                    <div>
                      <p className="font-black text-[#1a1a1f]">{e.label}</p>
                      <p className="text-[#555] text-sm mt-0.5">{e.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <img
                src={`${BASE}images/uc-september-193.jpg`}
                alt="Catering setup"
                className="rounded-2xl w-full object-cover aspect-[4/5] shadow-xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Enquiry Form */}
      <section id="catering-form" className="bg-[#f9f8f4] py-20 md:py-28 relative">
        <div className="absolute top-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 60 C480 0 960 0 1440 60 L1440 0 L0 0 Z" fill="#f2f0e8" />
          </svg>
        </div>
        <div className="max-w-3xl mx-auto px-8 pt-8">
          <div className="text-center mb-10">
            <p className="text-[#d4a853] text-xs font-black tracking-[0.2em] uppercase mb-3">Get Started</p>
            <h2 className="text-4xl font-black text-[#1a1a1f] mb-3">Event & Catering Request</h2>
            <p className="text-[#666]">Fill out the form below and we'll be in touch with flavour options, pricing and availability.</p>
          </div>

          {submitted ? (
            <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
              <div className="text-5xl mb-4">🎉</div>
              <h3 className="text-2xl font-black text-[#1a1a1f] mb-3">We got your request!</h3>
              <p className="text-[#666]">We'll reach out within 1–2 business days with details on flavour options, pricing and availability.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-8 md:p-10 shadow-sm space-y-6">
              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-black tracking-wider uppercase text-[#666] mb-2">First Name *</label>
                  <input
                    required
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    className="w-full border border-[#e0ddd5] rounded-xl px-4 py-3 text-[#1a1a1f] text-sm focus:outline-none focus:border-[#d4a853] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black tracking-wider uppercase text-[#666] mb-2">Last Name *</label>
                  <input
                    required
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    className="w-full border border-[#e0ddd5] rounded-xl px-4 py-3 text-[#1a1a1f] text-sm focus:outline-none focus:border-[#d4a853] transition-colors"
                  />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-black tracking-wider uppercase text-[#666] mb-2">Email *</label>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full border border-[#e0ddd5] rounded-xl px-4 py-3 text-[#1a1a1f] text-sm focus:outline-none focus:border-[#d4a853] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black tracking-wider uppercase text-[#666] mb-2">Phone</label>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full border border-[#e0ddd5] rounded-xl px-4 py-3 text-[#1a1a1f] text-sm focus:outline-none focus:border-[#d4a853] transition-colors"
                  />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-black tracking-wider uppercase text-[#666] mb-2">Type of Event *</label>
                  <select
                    required
                    value={form.eventType}
                    onChange={(e) => setForm({ ...form, eventType: e.target.value })}
                    className="w-full border border-[#e0ddd5] rounded-xl px-4 py-3 text-[#1a1a1f] text-sm focus:outline-none focus:border-[#d4a853] transition-colors"
                  >
                    <option value="">Select event type…</option>
                    <option>Wedding / Reception</option>
                    <option>Corporate Event</option>
                    <option>School / Community Event</option>
                    <option>Birthday Party</option>
                    <option>Private Gathering</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black tracking-wider uppercase text-[#666] mb-2">Estimated Guest Count</label>
                  <input
                    value={form.guestCount}
                    onChange={(e) => setForm({ ...form, guestCount: e.target.value })}
                    maxLength={20}
                    placeholder="e.g. 50–100"
                    className="w-full border border-[#e0ddd5] rounded-xl px-4 py-3 text-[#1a1a1f] text-sm focus:outline-none focus:border-[#d4a853] transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-black tracking-wider uppercase text-[#666] mb-2">Event Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full border border-[#e0ddd5] rounded-xl px-4 py-3 text-[#1a1a1f] text-sm focus:outline-none focus:border-[#d4a853] transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-black tracking-wider uppercase text-[#666] mb-2">Additional Details</label>
                <textarea
                  rows={4}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="Tell us more about your event, any flavor preferences, equipment needs, etc."
                  className="w-full border border-[#e0ddd5] rounded-xl px-4 py-3 text-[#1a1a1f] text-sm focus:outline-none focus:border-[#d4a853] transition-colors resize-none"
                />
              </div>
              {error && (
                <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#A1AB74] text-white py-4 rounded-full font-black text-sm hover:bg-[#8a9360] transition-colors disabled:opacity-50"
              >
                {submitting ? "Submitting…" : "Submit Catering Request →"}
              </button>
            </form>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
