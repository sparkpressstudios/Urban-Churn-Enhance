import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatHoursForDisplay } from "@/lib/utils";
import { mergeLocations, type LocationInfo } from "@/lib/locations-data";

const BASE = import.meta.env.BASE_URL;

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const { data: apiLocations } = useQuery({ queryKey: ["public", "locations"], queryFn: () => api.getPublicLocations() });
  const locations: LocationInfo[] = mergeLocations(apiLocations);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await api.submitContactForm(form);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const QUICK_LINKS = [
    { label: "Pre-Order Ice Cream", href: "/pre-order", icon: (<svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 shrink-0" stroke="#A1AB74" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" /></svg>) },
    { label: "Catering & Events", href: "/catering", icon: (<svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 shrink-0" stroke="#d4a853" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>) },
    { label: "Wholesale / Sell", href: "/wholesale", icon: (<svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 shrink-0" stroke="#A1AB74" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /></svg>) },
    { label: "Fundraising", href: "/fundraising", icon: (<svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 shrink-0" stroke="#d4a853" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5-10-5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /></svg>) },
    { label: "We're Hiring", href: "/careers", icon: (<svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 shrink-0" stroke="#A1AB74" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /><line x1="12" y1="12" x2="12" y2="16" /><line x1="10" y1="14" x2="14" y2="14" /></svg>) },
  ];

  return (
    <div className="min-h-screen" style={{ fontFamily: "'Space Grotesk', 'Poppins', sans-serif" }}>
      <Navbar />
      <SEO
        title="Contact Us | Urban Churn — Get In Touch"
        description="Contact Urban Churn for questions, feedback, catering inquiries, or wholesale partnerships. Call 717-884-9396, email contact@urbanchurn.com, or fill out our contact form."
        keywords="contact Urban Churn, Urban Churn phone number, Urban Churn email, ice cream shop contact PA, customer service"
        canonical="/contact"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "ContactPage",
          name: "Contact Urban Churn",
          url: "https://urbanchurn.com/contact",
          mainEntity: {
            "@type": "Organization",
            name: "Urban Churn",
            telephone: "+1-717-884-9396",
            email: "contact@urbanchurn.com"
          }
        }}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Contact", url: "/contact" },
        ]}
      />
      {/* Hero */}
      <section className="bg-[#111118] text-white pt-36 pb-20 md:pt-48 md:pb-24 text-center relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={`${BASE}images/uc-contact-hero.jpg`} alt="Contact Urban Churn craft creamery" className="w-full h-full object-cover object-center" />
          <div className="absolute inset-0 bg-[#111118]/55" />
        </div>
        <div className="relative max-w-2xl mx-auto px-4 sm:px-8">
          <p className="text-[#d4a853] text-sm font-black tracking-[0.2em] uppercase mb-4">Reach Out</p>
          <h1 className="text-5xl md:text-6xl font-black leading-none tracking-tight mb-5">
            Let's talk.
          </h1>
          <p className="text-white/60 text-xl">Questions, ideas, feedback — we're easy to reach.</p>
        </div>
      </section>

      {/* Contact Grid */}
      <section className="bg-[#f9f8f4] py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-8">
          <div className="grid md:grid-cols-5 gap-12">

            {/* Left: info */}
            <div className="md:col-span-2 space-y-8">
              <div>
                <p className="text-xs font-black tracking-[0.2em] uppercase text-[#666] mb-4">Contact Info</p>
                <div className="space-y-4">
                  <a href="tel:17178849396" className="flex items-center gap-3 group">
                    <div className="w-10 h-10 rounded-xl bg-[#d4a853]/10 flex items-center justify-center text-lg shrink-0">📞</div>
                    <div>
                      <p className="text-xs text-[#666]">Phone</p>
                      <p className="font-black text-[#1a1a1f] group-hover:text-[#d4a853] transition-colors">+1 (717) 884-9396</p>
                    </div>
                  </a>
                  <a href="mailto:contact@urbanchurn.com" className="flex items-center gap-3 group">
                    <div className="w-10 h-10 rounded-xl bg-[#d4a853]/10 flex items-center justify-center text-lg shrink-0">✉️</div>
                    <div>
                      <p className="text-xs text-[#666]">Email</p>
                      <p className="font-black text-[#1a1a1f] group-hover:text-[#d4a853] transition-colors">contact@urbanchurn.com</p>
                    </div>
                  </a>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#d4a853]/10 flex items-center justify-center text-lg shrink-0">📍</div>
                    <div>
                      <p className="text-xs text-[#666]">Locations</p>
                      <p className="font-bold text-[#1a1a1f]">Carlisle · Mechanicsburg · Harrisburg · Louise Drive</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-black tracking-[0.2em] uppercase text-[#666] mb-4">Quick Links</p>
                <div className="space-y-2">
                  {QUICK_LINKS.map((l) => (
                    <Link key={l.label} href={l.href} className="flex items-center gap-3 text-sm font-medium text-[#444] hover:text-[#1a1a1f] hover:bg-white rounded-xl px-4 py-3 transition-colors">
                      {l.icon}
                      <span>{l.label}</span>
                    </Link>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-black tracking-[0.2em] uppercase text-[#666] mb-4">Follow Us</p>
                <div className="flex gap-3">
                  <a href="https://instagram.com/urbanchurn" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-white border border-[#e0ddd5] px-4 py-2.5 rounded-xl text-sm font-bold text-[#444] hover:border-[#d4a853] transition-colors">
                    Instagram
                  </a>
                  <a href="https://facebook.com/urbanchurn" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-white border border-[#e0ddd5] px-4 py-2.5 rounded-xl text-sm font-bold text-[#444] hover:border-[#d4a853] transition-colors">
                    Facebook
                  </a>
                </div>
              </div>
            </div>

            {/* Right: form */}
            <div className="md:col-span-3">
              {submitted ? (
                <div className="bg-white rounded-2xl p-12 text-center shadow-sm h-full flex flex-col items-center justify-center">
                  <div className="text-5xl mb-4">🍦</div>
                  <h3 className="text-2xl font-black text-[#1a1a1f] mb-3">Message sent!</h3>
                  <p className="text-[#666]">Thanks for reaching out. We'll get back to you as soon as we can — usually within 1–2 business days.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-8 md:p-10 shadow-sm space-y-5">
                  <div className="grid md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-black tracking-wider uppercase text-[#666] mb-2">Name *</label>
                      <input
                        required
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="w-full border border-[#e0ddd5] rounded-xl px-4 py-3 text-[#1a1a1f] text-sm focus:outline-none focus:border-[#d4a853] transition-colors"
                      />
                    </div>
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
                  </div>
                  <div>
                    <label className="block text-xs font-black tracking-wider uppercase text-[#666] mb-2">Subject</label>
                    <select
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      className="w-full border border-[#e0ddd5] rounded-xl px-4 py-3 text-[#1a1a1f] text-sm focus:outline-none focus:border-[#d4a853] transition-colors"
                    >
                      <option value="">Select a topic…</option>
                      <option>General Question</option>
                      <option>Pre-Order Help</option>
                      <option>Catering Enquiry</option>
                      <option>Wholesale</option>
                      <option>Fundraising</option>
                      <option>Careers</option>
                      <option>Feedback</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-black tracking-wider uppercase text-[#666] mb-2">Message *</label>
                    <textarea
                      required
                      rows={6}
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      placeholder="What's on your mind?"
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
                    {submitting ? "Sending…" : "Send Message →"}
                  </button>
                </form>
              )}
            </div>

          </div>
        </div>
      </section>

      {/* Hours */}
      <section className="bg-[#f2f0e8] py-16 relative">
        <div className="absolute top-0 left-0 right-0">
          <svg viewBox="0 0 1440 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 0 C480 40 960 40 1440 0 L1440 0 L0 0 Z" fill="#f9f8f4" />
          </svg>
        </div>
        <div className="max-w-7xl mx-auto px-8 pt-6">
          <p className="text-xs font-black tracking-[0.2em] uppercase text-[#666] mb-8 text-center">Shop Hours</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {locations.map((loc) => {
              const hours = formatHoursForDisplay(loc.hours);
              return (
                <div key={loc.name} className="bg-white rounded-2xl overflow-hidden shadow-sm">
                  <div className="h-1.5 w-full" style={{ background: loc.accentColor }} />
                  <div className="p-5">
                    <h3 className="font-black text-[#1a1a1f] mb-1">{loc.name}</h3>
                    <p className="text-[#666] text-xs mb-4">{loc.address}, {loc.city}, {loc.state} {loc.zip}</p>
                    <div className="bg-[#faf9f5] rounded-xl p-3">
                      {hours.map((h, i) => (
                        <div key={h.days} className={`flex justify-between py-1.5 ${i > 0 ? "border-t border-[#eeece5]" : ""}`}>
                          <span className="text-[#666] text-sm">{h.days}</span>
                          <span className="font-semibold text-[#1a1a1f] text-sm">{h.time}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="text-center mt-6">
            <Link href="/locations" className="text-[#1a1a1f]/60 font-bold text-sm hover:text-[#1a1a1f] transition-colors">
              View all locations &rarr;
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
