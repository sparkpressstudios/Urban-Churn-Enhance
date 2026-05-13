import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { api } from "@/lib/api";

const BASE = import.meta.env.BASE_URL;

export default function Fundraising() {
  const [students, setStudents] = useState(200);
  const [pintsPerStudent, setPintsPerStudent] = useState(5);
  const [pricePerPint, setPricePerPint] = useState(8.75);

  const totalPints = students * pintsPerStudent;
  const grossRevenue = totalPints * pricePerPint;
  const schoolProfit = grossRevenue * 0.35;

  const [form, setForm] = useState({
    orgName: "",
    contactName: "",
    email: "",
    phone: "",
    orgType: "",
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
      await api.submitFundraisingForm(form);
      setSubmitted(true);
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ fontFamily: "'Space Grotesk', 'Poppins', sans-serif" }}>
      <SEO
        title="Ice Cream Fundraiser Programs | Urban Churn — Schools & Nonprofits"
        description="Raise money with ice cream! Urban Churn offers Pints for Purpose (35% profit for schools) and Scoop for Funds (30% profit for nonprofits). No upfront costs, marketing materials included."
        keywords="ice cream fundraiser, school fundraiser, nonprofit fundraising, community fundraiser PA, fundraiser programs, Pints for Purpose, easy fundraiser ideas"
        canonical="/fundraising"
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Fundraising", url: "/fundraising" },
        ]}
      />
      <Navbar />

      {/* Hero */}
      <section className="bg-[#111118] text-white pt-36 pb-20 md:pt-44 md:pb-24 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-40">
          <img src={`${BASE}images/uc-photo-2.jpg`} alt="Urban Churn ice cream fundraiser programs for schools and nonprofits" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-[#111118]/40" />
        </div>
        <div className="relative max-w-3xl mx-auto px-4 sm:px-8">
          <p className="text-[#d4a853] text-sm font-black tracking-[0.2em] uppercase mb-4">Community</p>
          <h1 className="text-5xl md:text-7xl font-black leading-none tracking-tight mb-6">
            Fundraise<br />with ice cream.
          </h1>
          <p className="text-white/60 text-xl leading-relaxed">
            Two programmes to help schools, nonprofits and community organizations raise money — while sharing something delicious.
          </p>
        </div>
      </section>

      {/* Programme cards */}
      <section className="bg-[#f9f8f4] py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-8">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Pints for Purpose */}
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
              <div className="bg-[#d4a853] p-8 text-white">
                <p className="text-sm font-black tracking-wider uppercase opacity-80 mb-2">Programme 1</p>
                <h2 className="text-3xl font-black mb-2">Pints for Purpose</h2>
                <p className="opacity-80">School fundraising with 35% profit margins on every pint sold.</p>
              </div>
              <div className="p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-[#d4a853] text-white text-2xl font-black rounded-full w-14 h-14 flex items-center justify-center shrink-0">35%</div>
                  <p className="text-[#444] font-medium">profit on every pint sold, returned to your school.</p>
                </div>
                <ul className="space-y-3 mb-8">
                  {[
                    "No upfront costs or minimum orders",
                    "Provided marketing materials",
                    "Natural quality ice cream parents trust",
                    "Seasonally rotating craft flavors",
                    "Keep funds local — support PA farmers",
                  ].map((pt) => (
                    <li key={pt} className="flex items-start gap-2 text-sm text-[#555]">
                      <span className="text-[#d4a853] font-black mt-0.5">✓</span>
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
                <div className="border border-[#e0ddd5] rounded-xl p-5 bg-[#faf9f5]">
                  <p className="text-xs font-black tracking-wider uppercase text-[#666] mb-3">How It Works</p>
                  <div className="space-y-3">
                    {[
                      { n: "1", t: "Register your school with us (free)" },
                      { n: "2", t: "Share the fundraiser with families" },
                      { n: "3", t: "Students collect orders" },
                      { n: "4", t: "We deliver — you receive 35% profit" },
                    ].map((s) => (
                      <div key={s.n} className="flex items-center gap-3 text-sm text-[#444]">
                        <span className="w-6 h-6 rounded-full bg-[#d4a853] text-white text-xs font-black flex items-center justify-center shrink-0">{s.n}</span>
                        <span>{s.t}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Scoop for Funds */}
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
              <div className="bg-[#A1AB74] p-8 text-white">
                <p className="text-sm font-black tracking-wider uppercase opacity-80 mb-2">Programme 2</p>
                <h2 className="text-3xl font-black mb-2">Scoop for Funds</h2>
                <p className="opacity-80">Nonprofits and organizations sell pre-orders of scoops, milkshakes and sundaes.</p>
              </div>
              <div className="p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-[#A1AB74] text-white text-2xl font-black rounded-full w-14 h-14 flex items-center justify-center shrink-0">30%</div>
                  <p className="text-[#444] font-medium">profit of all sales, paid via check or ACH after the campaign.</p>
                </div>
                <ul className="space-y-3 mb-8">
                  {[
                    "Open to nonprofits and 501(c)3 organizations",
                    "Custom landing page created within 1 week",
                    "Supporters pre-order and redeem at any store",
                    "Urban Churn promotes your campaign",
                    "Full report provided at campaign end",
                  ].map((pt) => (
                    <li key={pt} className="flex items-start gap-2 text-sm text-[#555]">
                      <span className="text-[#A1AB74] font-black mt-0.5">✓</span>
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
                <div className="border border-[#e0ddd5] rounded-xl p-5 bg-[#faf9f5]">
                  <p className="text-xs font-black tracking-wider uppercase text-[#666] mb-3">How It Works</p>
                  <div className="space-y-3">
                    {[
                      { n: "1", t: "Submit application for approval" },
                      { n: "2", t: "We create your custom campaign page" },
                      { n: "3", t: "Promote to your supporters" },
                      { n: "4", t: "Supporters redeem at any Urban Churn shop" },
                      { n: "5", t: "Receive 30% profit + full report" },
                    ].map((s) => (
                      <div key={s.n} className="flex items-center gap-3 text-sm text-[#444]">
                        <span className="w-6 h-6 rounded-full bg-[#A1AB74] text-white text-xs font-black flex items-center justify-center shrink-0">{s.n}</span>
                        <span>{s.t}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Calculator */}
      <section className="bg-[#f2f0e8] py-20 relative">
        <div className="absolute top-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 0 C480 60 960 60 1440 0 L1440 0 L0 0 Z" fill="#f9f8f4" />
          </svg>
        </div>
        <div className="max-w-3xl mx-auto px-8 pt-8">
          <div className="text-center mb-10">
            <p className="text-[#d4a853] text-xs font-black tracking-[0.2em] uppercase mb-3">Pints for Purpose</p>
            <h2 className="text-4xl font-black text-[#1a1a1f]">Calculate your fundraising.</h2>
          </div>
          <div className="bg-white rounded-2xl p-8 shadow-sm">
            <div className="space-y-6 mb-8">
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-xs font-black tracking-wider uppercase text-[#666]">Number of Students</label>
                  <span className="text-[#1a1a1f] font-black">{students.toLocaleString()}</span>
                </div>
                <input type="range" min={10} max={2000} step={10} value={students} onChange={(e) => setStudents(Number(e.target.value))} className="w-full accent-[#d4a853]" />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-xs font-black tracking-wider uppercase text-[#666]">Avg Pints per Student</label>
                  <span className="text-[#1a1a1f] font-black">{pintsPerStudent}</span>
                </div>
                <input type="range" min={1} max={20} step={1} value={pintsPerStudent} onChange={(e) => setPintsPerStudent(Number(e.target.value))} className="w-full accent-[#d4a853]" />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-xs font-black tracking-wider uppercase text-[#666]">Price per Pint ($)</label>
                  <span className="text-[#1a1a1f] font-black">${pricePerPint.toFixed(2)}</span>
                </div>
                <input type="range" min={7} max={15} step={0.25} value={pricePerPint} onChange={(e) => setPricePerPint(Number(e.target.value))} className="w-full accent-[#d4a853]" />
              </div>
            </div>
            <div className="bg-[#f9f8f4] rounded-xl p-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-black text-[#1a1a1f]">{totalPints.toLocaleString()}</p>
                <p className="text-xs text-[#666] font-medium mt-1">Total Pints</p>
              </div>
              <div>
                <p className="text-2xl font-black text-[#1a1a1f]">${grossRevenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                <p className="text-xs text-[#666] font-medium mt-1">Gross Revenue</p>
              </div>
              <div className="bg-[#d4a853] rounded-xl p-4">
                <p className="text-2xl font-black text-white">${schoolProfit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                <p className="text-xs text-white/80 font-medium mt-1">School Profit (35%)</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Application form */}
      <section className="bg-[#f9f8f4] py-20 md:py-28 relative">
        <div className="absolute top-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 60 C480 0 960 0 1440 60 L1440 0 L0 0 Z" fill="#f2f0e8" />
          </svg>
        </div>
        <div className="max-w-3xl mx-auto px-8 pt-8">
          <div className="text-center mb-10">
            <p className="text-[#d4a853] text-xs font-black tracking-[0.2em] uppercase mb-3">Apply Now</p>
            <h2 className="text-4xl font-black text-[#1a1a1f] mb-3">Ready to get started?</h2>
            <p className="text-[#666]">Submit your organization's details and we'll reach out within 2 business days.</p>
          </div>

          {submitted ? (
            <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
              <div className="text-5xl mb-4">🏫</div>
              <h3 className="text-2xl font-black text-[#1a1a1f] mb-3">Application received!</h3>
              <p className="text-[#666]">We'll review your application and be in touch within 2 business days with next steps.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-8 md:p-10 shadow-sm space-y-5">
              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-black tracking-wider uppercase text-[#666] mb-2">Organization Name *</label>
                  <input required value={form.orgName} onChange={(e) => setForm({ ...form, orgName: e.target.value })}
                    className="w-full border border-[#e0ddd5] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#d4a853] transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-black tracking-wider uppercase text-[#666] mb-2">Contact Name *</label>
                  <input required value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                    className="w-full border border-[#e0ddd5] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#d4a853] transition-colors" />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-black tracking-wider uppercase text-[#666] mb-2">Email *</label>
                  <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full border border-[#e0ddd5] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#d4a853] transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-black tracking-wider uppercase text-[#666] mb-2">Phone</label>
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full border border-[#e0ddd5] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#d4a853] transition-colors" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-black tracking-wider uppercase text-[#666] mb-2">Programme Interest *</label>
                <select required value={form.orgType} onChange={(e) => setForm({ ...form, orgType: e.target.value })}
                  className="w-full border border-[#e0ddd5] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#d4a853] transition-colors">
                  <option value="">Select programme…</option>
                  <option>Pints for Purpose (School Fundraiser — 35%)</option>
                  <option>Scoop for Funds (Nonprofit Pre-Order — 30%)</option>
                  <option>Not Sure — Tell Me More</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-black tracking-wider uppercase text-[#666] mb-2">Tell Us About Your Organization</label>
                <textarea rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="School name, grade levels, nonprofit mission, campaign goals, etc."
                  className="w-full border border-[#e0ddd5] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#d4a853] transition-colors resize-none" />
              </div>
              <button type="submit" disabled={submitting} className="w-full bg-[#A1AB74] text-white py-4 rounded-full font-black text-sm hover:bg-[#8a9360] transition-colors disabled:opacity-50">
                {submitting ? "Submitting..." : "Submit Application →"}
              </button>
              {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            </form>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
