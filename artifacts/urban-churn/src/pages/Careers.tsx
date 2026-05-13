import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import {
  Coffee,
  Calendar,
  Users,
  TrendingUp,
  Star,
  Heart,
  Award,
  Clock,
  Shield,
  Smile,
  DollarSign,
  Sun,
  Gift,
  Zap,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL;

const TYPE_LABELS: Record<string, string> = {
  part_time: "Part-Time",
  full_time: "Full-Time",
  seasonal: "Seasonal",
};

const ICON_MAP: Record<string, React.ElementType> = {
  coffee: Coffee,
  calendar: Calendar,
  users: Users,
  "trending-up": TrendingUp,
  star: Star,
  heart: Heart,
  award: Award,
  clock: Clock,
  shield: Shield,
  smile: Smile,
  "dollar-sign": DollarSign,
  sun: Sun,
  gift: Gift,
  zap: Zap,
};

export default function Careers() {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    about: "",
    location: "",
    why: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const { data: careersData } = useQuery<{
    jobs: Array<{ id: number; title: string; locations: string; type: string; description: string; highlights: string[] }>;
    benefits: Array<{ id: number; title: string; description: string; iconName: string; iconColor: string }>;
  }>({
    queryKey: ["public", "careers"],
    queryFn: () => api.getPublicCareers(),
  });

  const applyMutation = useMutation({
    mutationFn: (data: typeof form) => api.submitCareerApplication(data),
    onSuccess: () => setSubmitted(true),
  });

  const jobs = careersData?.jobs || [];
  const benefits = careersData?.benefits || [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyMutation.mutate(form);
  };

  return (
    <div className="min-h-screen" style={{ fontFamily: "'Space Grotesk', 'Poppins', sans-serif" }}>
      <SEO
        title="Careers | Urban Churn — Join Our Team"
        description="Join the Urban Churn team! View open positions at our Central PA ice cream shops. Part-time, full-time, and seasonal opportunities in Carlisle, Mechanicsburg & Harrisburg."
        keywords="Urban Churn jobs, ice cream shop jobs, hiring ice cream PA, part-time jobs Carlisle PA, ice cream careers, food service jobs Central PA"
        canonical="/careers"
        jsonLd={jobs.length > 0 ? jobs.map((job) => ({
          "@context": "https://schema.org",
          "@type": "JobPosting",
          title: job.title,
          description: job.description,
          employmentType: job.type === "full_time" ? "FULL_TIME" : job.type === "part_time" ? "PART_TIME" : "TEMPORARY",
          jobLocation: job.locations.split(",").map((loc: string) => ({
            "@type": "Place",
            address: {
              "@type": "PostalAddress",
              addressLocality: loc.trim(),
              addressRegion: "PA",
              addressCountry: "US",
            },
          })),
          hiringOrganization: {
            "@type": "Organization",
            name: "Urban Churn",
            sameAs: "https://urbanchurn.com",
            logo: "https://urbanchurn.com/images/logo.png",
          },
          datePosted: new Date().toISOString().split("T")[0],
        })) : undefined}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Careers", url: "/careers" },
        ]}
      />
      <Navbar />

      {/* Hero */}
      <section className="relative bg-[#111118] text-white overflow-hidden">
        <div className="absolute inset-0 opacity-50">
          <img src={`${BASE}images/uc-photo-2.jpg`} alt="Urban Churn team members crafting ice cream" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#111118] to-[#111118]/30" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-8 pt-36 pb-24 md:pt-44 md:pb-28">
          <p className="text-[#d4a853] text-sm font-black tracking-[0.2em] uppercase mb-4">Join The Team</p>
          <h1 className="text-5xl md:text-7xl font-black leading-none tracking-tight mb-6">
            We're hiring!
          </h1>
          <p className="text-white/60 text-xl max-w-xl leading-relaxed">
            Join a team that takes craft seriously, treats people well, and makes something genuinely delicious every day.
          </p>
        </div>
      </section>

      {/* Open Roles */}
      <section className="bg-[#f9f8f4] py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-8">
          <div className="text-center mb-14">
            <p className="text-[#d4a853] text-xs font-black tracking-[0.2em] uppercase mb-3">Open Positions</p>
            <h2 className="text-4xl md:text-5xl font-black text-[#1a1a1f]">Current openings.</h2>
          </div>
          {jobs.length === 0 ? (
            <p className="text-center text-[#666] text-lg">No open positions right now — check back soon!</p>
          ) : (
            <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {jobs.map((role) => (
                <div key={role.id} className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <h3 className="text-xl font-black text-[#1a1a1f] mb-1">{role.title}</h3>
                      <p className="text-[#666] text-sm">{role.locations.split(",").map(l => l.trim()).join(" · ")}</p>
                    </div>
                    <span className="bg-[#d4a853]/10 text-[#b08440] text-xs font-black px-3 py-1.5 rounded-full shrink-0">{TYPE_LABELS[role.type] || role.type}</span>
                  </div>
                  <p className="text-[#555] text-sm leading-relaxed mb-5">{role.description}</p>
                  <div className="space-y-2">
                    {(role.highlights || []).map((h) => (
                      <div key={h} className="flex items-center gap-2 text-sm text-[#444]">
                        <span className="text-[#d4a853]">✓</span>
                        <span>{h}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Why work here */}
      <section className="bg-[#f2f0e8] py-20 relative">
        <div className="absolute top-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 0 C480 60 960 60 1440 0 L1440 0 L0 0 Z" fill="#f9f8f4" />
          </svg>
        </div>
        <div className="max-w-7xl mx-auto px-8 pt-8">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-[#d4a853] text-xs font-black tracking-[0.2em] uppercase mb-4">Why Urban Churn</p>
              <h2 className="text-4xl font-black text-[#1a1a1f] mb-6">A team you'll<br />actually enjoy.</h2>
              <div className="space-y-5">
                {benefits.map((b) => {
                  const IconComponent = ICON_MAP[b.iconName] || Star;
                  return (
                    <div key={b.id} className="flex gap-4 items-start">
                      <IconComponent className="w-6 h-6 shrink-0 mt-0.5" stroke={b.iconColor} strokeWidth={2} />
                      <div>
                        <p className="font-black text-[#1a1a1f]">{b.title}</p>
                        <p className="text-[#555] text-sm mt-0.5">{b.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div>
              <img src={`${BASE}images/uc-photo-1.jpg`} alt="Urban Churn team" loading="lazy" className="rounded-2xl w-full object-cover aspect-[4/5] shadow-xl" />
            </div>
          </div>
        </div>
      </section>

      {/* Application Form */}
      <section className="bg-[#f9f8f4] py-20 md:py-28 relative">
        <div className="absolute top-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 60 C480 0 960 0 1440 60 L1440 0 L0 0 Z" fill="#f2f0e8" />
          </svg>
        </div>
        <div className="max-w-3xl mx-auto px-8 pt-8">
          <div className="text-center mb-10">
            <p className="text-[#d4a853] text-xs font-black tracking-[0.2em] uppercase mb-3">Apply Now</p>
            <h2 className="text-4xl font-black text-[#1a1a1f] mb-3">Interested in joining?</h2>
            <p className="text-[#666]">Fill out the form below and we'll reach out for a quick conversation.</p>
          </div>

          {submitted ? (
            <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
              <div className="text-5xl mb-4">🎉</div>
              <h3 className="text-2xl font-black text-[#1a1a1f] mb-3">Application received!</h3>
              <p className="text-[#666]">Thanks for your interest! We'll be in touch shortly for a quick chat.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-8 md:p-10 shadow-sm space-y-5">
              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-black tracking-wider uppercase text-[#666] mb-2">Full Name *</label>
                  <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full border border-[#e0ddd5] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#d4a853] transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-black tracking-wider uppercase text-[#666] mb-2">Phone *</label>
                  <input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full border border-[#e0ddd5] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#d4a853] transition-colors" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-black tracking-wider uppercase text-[#666] mb-2">Email *</label>
                <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full border border-[#e0ddd5] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#d4a853] transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-black tracking-wider uppercase text-[#666] mb-2">Which Location Are You Applying For? *</label>
                <select required value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className="w-full border border-[#e0ddd5] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#d4a853] transition-colors">
                  <option value="">Select location…</option>
                  <option>Mechanicsburg Retail</option>
                  <option>Carlisle Retail</option>
                  <option>Harrisburg Shop Retail</option>
                  <option>Rossmoyne (Mechanicsburg) Retail / Manufacturing</option>
                  <option>Cameron Street – Harrisburg Manufacturing</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-black tracking-wider uppercase text-[#666] mb-2">Tell us about yourself. What are your hobbies and interests? *</label>
                <textarea required rows={3} value={form.about} onChange={(e) => setForm({ ...form, about: e.target.value })}
                  className="w-full border border-[#e0ddd5] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#d4a853] transition-colors resize-none" />
              </div>
              <div>
                <label className="block text-xs font-black tracking-wider uppercase text-[#666] mb-2">Why are you interested in joining the team? *</label>
                <textarea required rows={3} value={form.why} onChange={(e) => setForm({ ...form, why: e.target.value })}
                  className="w-full border border-[#e0ddd5] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#d4a853] transition-colors resize-none" />
              </div>
              <button type="submit" disabled={applyMutation.isPending} className="w-full bg-[#A1AB74] text-white py-4 rounded-full font-black text-sm hover:bg-[#8a9360] transition-colors disabled:opacity-50">
                {applyMutation.isPending ? "Submitting..." : "Submit Application →"}
              </button>
            </form>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
