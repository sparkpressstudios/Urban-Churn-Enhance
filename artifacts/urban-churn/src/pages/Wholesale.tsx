import { useState, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { Link } from "wouter";
import { api } from "@/lib/api";

const BASE = import.meta.env.BASE_URL;

const BENEFITS = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7" stroke="#A1AB74" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22V12" /><path d="M12 12C12 12 8 10 6 7c-1.5-2.5 0-6 3-6 1.5 0 2.5.8 3 2 .5-1.2 1.5-2 3-2 3 0 4.5 3.5 3 6-2 3-6 5-6 5z" />
      </svg>
    ),
    title: "Natural Ingredients",
    body: "No artificial flavoring or food coloring — ever. Your customers enjoy real fruit, real cream, and locally-sourced PA dairy with zero shortcuts.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7" stroke="#d4a853" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
    title: "Super Premium Quality",
    body: "16% butterfat all-natural local dairy, no high fructose corn syrup, no artificial color or flavoring. This is ice cream customers talk about.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7" stroke="#A1AB74" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    title: "Supporting Local",
    body: "We're PA Preferred certified — you get the best craft ice cream made with ingredients grown and produced right here in Pennsylvania.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7" stroke="#d4a853" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      </svg>
    ),
    title: "Unique Flavors",
    body: "Stand out. We churn flavors hard to find anywhere else. Want something exclusive to your brand? We may be able to create a custom flavor just for you.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7" stroke="#A1AB74" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </svg>
    ),
    title: "Retail Pints",
    body: "Offer our 9 signature branded pints for retail. Shelf-ready packaging, consistent supply, and margins that work for your business.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7" stroke="#d4a853" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8h1a4 4 0 0 1 0 8h-1" /><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" /><line x1="6" y1="1" x2="6" y2="4" /><line x1="10" y1="1" x2="10" y2="4" /><line x1="14" y1="1" x2="14" y2="4" />
      </svg>
    ),
    title: "Scoop Service",
    body: "Serve Urban Churn by the scoop at your café, restaurant or event venue. We supply in bulk containers with full flavor support.",
  },
];

const PINTS = [
  { name: "Mint Chip", img: "mint-chip.jpg" },
  { name: "Truly Strawberry", img: "strawberry.jpg" },
  { name: "Vanilla Bean", img: "vanilla.jpg" },
  { name: "Chocolate", img: "chocolate.jpg" },
  { name: "Mango Habanero", img: "mango-habanero.jpg" },
  { name: "Sweet Potato Casserole", img: "sweet-potato.jpg" },
];

export default function Wholesale() {
  const productLineSectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress: productLineProgress } = useScroll({ target: productLineSectionRef, offset: ["start end", "end start"] });
  const productLineParallaxY = useTransform(productLineProgress, [0, 1], ["-15%", "15%"]);

  const [form, setForm] = useState({
    businessName: "",
    contactName: "",
    email: "",
    phone: "",
    businessType: "",
    location: "",
    interest: "",
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
      await api.submitWholesaleForm(form);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ fontFamily: "'Space Grotesk', 'Poppins', sans-serif" }}>
      <SEO
        title="Wholesale Ice Cream | Urban Churn — Partner With Us"
        description="Partner with Urban Churn for wholesale craft ice cream. Scoop service and branded retail pints for restaurants, shops & scoop bars. PA Preferred certified, super premium quality."
        keywords="wholesale ice cream, ice cream distributor PA, B2B ice cream supplier, ice cream for restaurants, retail pints wholesale, scoop service, PA Preferred ice cream, bulk ice cream order"
        canonical="/wholesale"
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Wholesale", url: "/wholesale" },
        ]}
      />
      <Navbar />

      {/* Hero */}
      <section className="relative bg-[#111118] text-white overflow-hidden">
        <div className="absolute inset-0 opacity-50">
          <img src={`${BASE}images/uc-wholesale-hero.jpg`} alt="Urban Churn wholesale craft ice cream partnership" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#111118] via-[#111118]/50 to-transparent" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-8 pt-36 pb-24 md:pt-48 md:pb-32">
          <p className="text-[#d4a853] text-sm font-black tracking-[0.2em] uppercase mb-4">Partner With Us</p>
          <h1 className="text-5xl md:text-7xl font-black leading-none tracking-tight mb-6">
            Sell craft<br />ice cream.
          </h1>
          <p className="text-white/60 text-lg md:text-xl max-w-2xl leading-relaxed mb-10">
            Partner with Urban Churn and share the quality and taste of Super Premium ice cream with your customers. Available for scoop service or retail pints.
          </p>
          <div className="flex flex-wrap gap-4">
            <a href="#apply" className="bg-[#A1AB74] text-white px-8 py-4 rounded-full font-black hover:bg-[#8a9360] transition-colors">
              Apply to Partner →
            </a>
            <a href="#how-it-works" className="bg-white/10 text-white border border-white/20 px-8 py-4 rounded-full font-black hover:bg-white/20 transition-colors">
              How It Works
            </a>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="bg-[#f9f8f4] py-20 md:py-28" id="how-it-works">
        <div className="max-w-7xl mx-auto px-8">
          <div className="text-center mb-14">
            <p className="text-[#d4a853] text-xs font-black tracking-[0.2em] uppercase mb-3">Why Sell Our Ice Cream</p>
            <h2 className="text-4xl md:text-5xl font-black text-[#1a1a1f] mb-4">Built for your business.</h2>
            <p className="text-[#666] text-lg max-w-xl mx-auto">
              From independent cafés to specialty grocers and event venues, Urban Churn fits naturally into your offer.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {BENEFITS.map((b) => (
              <div key={b.title} className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow">
                <div className="mb-4">{b.icon}</div>
                <h3 className="font-black text-[#1a1a1f] text-lg mb-3">{b.title}</h3>
                <p className="text-[#666] text-sm leading-relaxed">{b.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Product line */}
      <section ref={productLineSectionRef} className="text-white py-20 relative overflow-hidden">
        <motion.div className="absolute inset-0 scale-[1.3]" style={{ y: productLineParallaxY }}>
          <img src={`${BASE}images/uc-october-026.jpg`} alt="Urban Churn wholesale ice cream for restaurants and retailers" className="absolute inset-0 w-full h-full object-cover object-center" />
        </motion.div>
        <div className="absolute inset-0 bg-[#111118]/70" />
        <div className="absolute top-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 0 C480 60 960 60 1440 0 L1440 0 L0 0 Z" fill="#f9f8f4" />
          </svg>
        </div>
        <div className="relative max-w-5xl mx-auto px-8 pt-8 pb-8 text-center">
          <p className="text-[#A1AB74] text-xs font-black tracking-[0.2em] uppercase mb-4">Partner With Us</p>
          <h2 className="text-4xl md:text-5xl font-black mb-6 leading-tight">Sell Craft Ice Cream.</h2>
          <p className="text-white text-lg md:text-xl leading-relaxed max-w-3xl mx-auto mb-6">
            We set the bar for churning craft ice cream. Partner with us and share the quality and taste of Super Premium ice cream with your customers. We offer ice cream to be scooped or sold through retail with our 9 different flavoured pints.
          </p>
          <p className="text-white text-base leading-relaxed max-w-2xl mx-auto mb-10">
            Want to offer something truly unique for your customers? We may be able to churn a custom flavour exclusively for your restaurant, retail shop, or scoop bar — something no one else can offer.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#contact" className="inline-flex bg-[#A1AB74] text-white px-8 py-4 rounded-full font-black text-sm hover:bg-[#8a9360] transition-colors">Become a Partner →</a>
            <a href="#contact" className="inline-flex border border-white/30 text-white px-8 py-4 rounded-full font-black text-sm hover:border-white/60 transition-colors">Ask About Custom Flavours</a>
          </div>
        </div>
      </section>

      {/* PA Preferred callout */}
      <section className="bg-[#f2f0e8] py-16">
        <div className="max-w-5xl mx-auto px-8">
          <div className="bg-white rounded-2xl p-10 md:p-14 flex flex-col md:flex-row items-center gap-10 shadow-sm">
            <img src={`${BASE}images/pa-preferred-logo.png`} alt="PA Preferred Certified" className="w-32 shrink-0" />
            <div>
              <p className="text-[#d4a853] text-xs font-black tracking-[0.2em] uppercase mb-2">PA Preferred Certified</p>
              <h3 className="text-2xl md:text-3xl font-black text-[#1a1a1f] mb-3">
                The best ice cream made with Pennsylvania ingredients.
              </h3>
              <p className="text-[#666] leading-relaxed">
                Urban Churn is registered as PA Preferred — a state certification that means our ingredients are grown and produced here in Pennsylvania. When you stock Urban Churn, you're selling local to your local customers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Application Form */}
      <section className="bg-[#f9f8f4] py-20 md:py-28" id="apply">
        <div className="max-w-3xl mx-auto px-8">
          <div className="text-center mb-10">
            <p className="text-[#d4a853] text-xs font-black tracking-[0.2em] uppercase mb-3">Get Started</p>
            <h2 className="text-4xl font-black text-[#1a1a1f] mb-3">Wholesale Application</h2>
            <p className="text-[#666]">Fill out the form and we'll be in touch with pricing, minimum orders, and next steps.</p>
          </div>

          {submitted ? (
            <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
              <div className="text-5xl mb-4">🤝</div>
              <h3 className="text-2xl font-black text-[#1a1a1f] mb-3">Application received!</h3>
              <p className="text-[#666]">We'll review your application and reach out within 2–3 business days with details on pricing, minimum orders, and onboarding.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-8 md:p-10 shadow-sm space-y-6">
              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-black tracking-wider uppercase text-[#666] mb-2">Business Name *</label>
                  <input
                    required
                    value={form.businessName}
                    onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                    className="w-full border border-[#e0ddd5] rounded-xl px-4 py-3 text-[#1a1a1f] text-sm focus:outline-none focus:border-[#d4a853] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black tracking-wider uppercase text-[#666] mb-2">Contact Name *</label>
                  <input
                    required
                    value={form.contactName}
                    onChange={(e) => setForm({ ...form, contactName: e.target.value })}
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
                  <label className="block text-xs font-black tracking-wider uppercase text-[#666] mb-2">Phone *</label>
                  <input
                    required
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full border border-[#e0ddd5] rounded-xl px-4 py-3 text-[#1a1a1f] text-sm focus:outline-none focus:border-[#d4a853] transition-colors"
                  />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-black tracking-wider uppercase text-[#666] mb-2">Business Type *</label>
                  <select
                    required
                    value={form.businessType}
                    onChange={(e) => setForm({ ...form, businessType: e.target.value })}
                    className="w-full border border-[#e0ddd5] rounded-xl px-4 py-3 text-[#1a1a1f] text-sm focus:outline-none focus:border-[#d4a853] transition-colors"
                  >
                    <option value="">Select type…</option>
                    <option>Café / Coffee Shop</option>
                    <option>Restaurant / Bar</option>
                    <option>Grocery / Specialty Food Store</option>
                    <option>Event Venue</option>
                    <option>Food Truck</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black tracking-wider uppercase text-[#666] mb-2">Business Location *</label>
                  <input
                    required
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    placeholder="City, State"
                    className="w-full border border-[#e0ddd5] rounded-xl px-4 py-3 text-[#1a1a1f] text-sm focus:outline-none focus:border-[#d4a853] transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-black tracking-wider uppercase text-[#666] mb-2">What are you interested in?</label>
                <div className="grid grid-cols-2 gap-3">
                  {["Retail Pints", "Scoop Service (Bulk)", "Custom Flavor", "All Options"].map((opt) => (
                    <label key={opt} className="flex items-center gap-3 bg-[#f9f8f4] rounded-xl px-4 py-3 cursor-pointer hover:bg-[#f2f0e8] transition-colors">
                      <input
                        type="radio"
                        name="interest"
                        value={opt}
                        checked={form.interest === opt}
                        onChange={(e) => setForm({ ...form, interest: e.target.value })}
                        className="accent-[#A1AB74]"
                      />
                      <span className="text-sm font-medium text-[#333]">{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-black tracking-wider uppercase text-[#666] mb-2">Tell Us More</label>
                <textarea
                  rows={4}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="Tell us about your business, volume needs, or any questions about our wholesale programme."
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
                {submitting ? "Submitting…" : "Submit Wholesale Application →"}
              </button>
              <p className="text-center text-[#aaa] text-xs">We'll review your application and respond within 2–3 business days.</p>
            </form>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
