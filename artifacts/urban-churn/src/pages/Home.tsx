import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useRef, useState, useCallback } from "react";
import { motion, useScroll, useTransform, useMotionTemplate } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import HomeStoryScroll from "@/components/HomeStoryScroll";
import RotatingFlavoursShowcase from "@/components/RotatingFlavoursShowcase";
import { api } from "@/lib/api";
import { TAG_LABELS } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL;

const steps = [
  { num: "01", title: "Choose Flavors", desc: "Browse this week's limited batch drops and pick your favorites." },
  { num: "02", title: "Select Size", desc: "Pint, quart, or party sizes — mix and match." },
  { num: "03", title: "Pick Location", desc: "Choose Carlisle, Mechanicsburg, or Harrisburg." },
  { num: "04", title: "Pick Up", desc: "We hold orders up to 2 weeks. Don't forget!" },
];

function WaveDivider({ from, to, flip }: { from: string; to: string; flip?: boolean }) {
  return (
    <div className="relative" style={{ marginTop: -1, marginBottom: -1 }}>
      <svg viewBox="0 0 1440 80" preserveAspectRatio="none" className="w-full block" style={{ height: 60, transform: flip ? "scaleY(-1)" : undefined }}>
        <path d="M0,0 L0,40 Q360,80 720,40 Q1080,0 1440,40 L1440,0 Z" fill={from} />
        <path d="M0,40 Q360,80 720,40 Q1080,0 1440,40 L1440,80 L0,80 Z" fill={to} />
      </svg>
    </div>
  );
}

const PILLARS = [
  { title: "Unique Flavors", desc: "Seasonally rotating drops like Sauerkraut, Summer Corn, and Sweet Potato Casserole — flavors you won't find anywhere else." },
  { title: "Culturally Inspired", desc: "Affogatos, tiramisu sundaes, dulce de leche — inspired by flavor traditions from around the world." },
  { title: "Nothing Fake", desc: "Local PA dairy, natural ingredients, prepared in-house. No artificial colors or flavorings. Simple as that." },
];

function CraftedSection() {
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = (e.clientX - rect.left) / rect.width - 0.5;
    const cy = (e.clientY - rect.top) / rect.height - 0.5;
    setOffset({ x: cx * -20, y: cy * -20 });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setOffset({ x: 0, y: 0 });
  }, []);

  return (
    <section
      id="about"
      className="relative overflow-hidden"
      style={{ background: "#f9f8f4" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-24 sm:pt-36 pb-28 sm:pb-40">
        {/* Image card with parallax */}
        <div
          className="relative rounded-2xl sm:rounded-[2rem] overflow-hidden shadow-[0_20px_80px_rgba(0,0,0,0.10)]"
          style={{ minHeight: 380 }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Parallax background image */}
          <div
            className="absolute inset-[-30px] transition-transform duration-300 ease-out will-change-transform"
            style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(1.08)` }}
          >
            <img
              src={`${BASE}images/uc-crafted-bg.jpg`}
              alt="Fresh scoops with toppings"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#1c1c1a]/85 via-[#1c1c1a]/40 to-[#1c1c1a]/10" />

          {/* Text overlay on image */}
          <div className="relative z-10 flex flex-col justify-end h-full p-8 sm:p-14 lg:p-20" style={{ minHeight: 520 }}>
            <p className="text-[#d4a853] text-xs sm:text-sm font-black tracking-[0.2em] uppercase mb-3">Our Promise</p>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-[0.95] mb-5">
              Crafted with<br />intention.
            </h2>
            <p className="text-white text-base sm:text-lg leading-relaxed max-w-xl">
              We churn ice cream inspired by cultures from around the world using local PA 16% butterfat dairy and natural ingredients. No artificial colors or flavorings — ever.
            </p>
          </div>
        </div>

        {/* Three pillars — below the image */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-10 mt-14 sm:mt-16">
          {PILLARS.map((p) => (
            <div key={p.title} className="flex items-start gap-4">
              <div className="w-1 self-stretch rounded-full bg-[#d4a853]/40 shrink-0" />
              <div>
                <p className="font-black text-[#1c1c1a] text-lg sm:text-xl mb-1.5">{p.title}</p>
                <p className="text-[#1c1c1a]/60 text-sm sm:text-base leading-relaxed">{p.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home() {


  // Hero text-mask scroll: text zooms IN, reveals video, then fades to black
  const heroScrollRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: heroProgress } = useScroll({ target: heroScrollRef, offset: ["start start", "end end"] });
  // Phase 1 (0–0.20): text scales up, dark overlay fades revealing video through text
  const heroScale = useTransform(heroProgress, [0, 0.06, 0.14, 0.22], [1, 1.8, 6, 50]);
  const heroTextOpacity = useTransform(heroProgress, [0, 0.06, 0.14], [1, 0.6, 0]);
  const heroContentOpacity = useTransform(heroProgress, [0, 0.04], [1, 0]);
  const heroBgColor = useTransform(heroProgress, [0, 0.04, 0.18], ["rgba(17,17,24,0.55)", "rgba(17,17,24,0.55)", "rgba(17,17,24,0)"]);
  const heroBlur = useTransform(heroProgress, [0, 0.06, 0.18], [4, 2, 0]);
  // Phase 2: video fully visible until sticky releases and page scrolls naturally

  const { data: apiFlavours = [] } = useQuery({ queryKey: ["public", "flavours"], queryFn: () => api.getPublicFlavours() });
  const { data: rotatingFlavours = [] } = useQuery<any[]>({ queryKey: ["public", "rotating-flavours"], queryFn: () => api.getPublicRotatingFlavours() });

  // Pre-order feature slots — admin assigns heroPosition 1 (main), 2–5 (smaller cards)
  // Only show products that actually exist in the API with a set heroPosition
  const heroFlavours = apiFlavours
    .filter((f: any) => f.heroPosition)
    .sort((a: any, b: any) => a.heroPosition - b.heroPosition);
  const heroMain = heroFlavours.find((f: any) => f.heroPosition === 1);
  const heroSlots = heroFlavours.filter((f: any) => f.heroPosition >= 2 && f.heroPosition <= 5);
  // If no heroPosition products, fall back to first 5 real products from API
  const featuredFlavours = heroFlavours.length > 0 ? heroFlavours : apiFlavours.slice(0, 5);
  const featuredMain = heroMain ?? (featuredFlavours[0] as any);
  const featuredSmall = heroMain ? heroSlots : featuredFlavours.slice(1, 5) as any[];

  return (
    <div className="min-h-screen" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
      <SEO
        title="Urban Churn | Craft Ice Cream — Unique Flavors, Natural Ingredients"
        description="Urban Churn crafts super premium ice cream with 16% butterfat local PA dairy, no artificial colors or flavors. Pre-order limited batch flavors for pickup in Carlisle, Mechanicsburg & Harrisburg, PA."
        keywords="craft ice cream, premium ice cream, natural ingredients ice cream, no artificial colors, local PA dairy, pre-order ice cream, Urban Churn, Central PA ice cream, handcrafted ice cream, limited batch ice cream"
        canonical="/"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Urban Churn",
          url: "https://urbanchurn.com",
          logo: "https://urbanchurn.com/images/logo.png",
          description: "Craft ice cream creamery in Central PA — unique flavors, natural ingredients, no artificial colors or flavors. Super premium 16% butterfat ice cream made with local PA dairy.",
          foundingLocation: { "@type": "Place", name: "Carlisle, Pennsylvania" },
          areaServed: { "@type": "State", name: "Pennsylvania" },
          address: { "@type": "PostalAddress", streetAddress: "45 W High St", addressLocality: "Carlisle", addressRegion: "PA", postalCode: "17013", addressCountry: "US" },
          sameAs: ["https://facebook.com/urbanchurn", "https://instagram.com/urbanchurn", "https://twitter.com/urbanchurn"],
          contactPoint: { "@type": "ContactPoint", telephone: "+1-717-884-9396", contactType: "customer service", availableLanguage: "English" },
          hasOfferCatalog: {
            "@type": "OfferCatalog",
            name: "Urban Churn Ice Cream",
            itemListElement: [
              { "@type": "Offer", itemOffered: { "@type": "Product", name: "Craft Ice Cream Pints", description: "Limited batch craft ice cream pints available for pre-order" } },
              { "@type": "Offer", itemOffered: { "@type": "Service", name: "Ice Cream Catering", description: "Craft ice cream catering for weddings, corporate events, and parties" } },
              { "@type": "Offer", itemOffered: { "@type": "Product", name: "Custom Cakes", description: "Custom ice cream cakes and baked cakes" } }
            ]
          }
        }}
      />

      <div className="relative text-white bg-[#111118]">
        <Navbar />

        {/* Tall scroll-zone: user scrolls through this while sticky hero plays */}
        <div ref={heroScrollRef} className="relative" style={{ height: "240vh" }}>
          {/* Sticky container — stays pinned for the full scroll zone */}
          <div className="sticky top-0 h-screen overflow-hidden flex flex-col items-center justify-center" style={{ maxWidth: "100vw" }}>
            {/* Text-mask: video plays through the letterforms, text zooms in on scroll */}
            <div className="relative w-full flex-1 flex items-center justify-center overflow-hidden" style={{ isolation: "isolate" }}>
              <motion.video
                autoPlay
                loop
                muted
                playsInline
                style={{ filter: useMotionTemplate`blur(${heroBlur}px)` }}
                className="absolute inset-0 w-full h-full object-cover"
                poster={`${BASE}images/uc-photo-1.jpg`}
              >
                <source src={`${BASE}videos/hero-bg.mp4`} type="video/mp4" />
              </motion.video>
              {/* Full-screen dark overlay with text cutout — mix-blend-multiply makes white text transparent */}
              <motion.div
                style={{ backgroundColor: heroBgColor }}
                className="absolute inset-0 flex items-center justify-center pb-[18vh] sm:pb-[28vh] lg:pb-[22vh]"
              >
                <motion.h1
                  style={{ scale: heroScale, opacity: heroTextOpacity }}
                  className="text-[32vw] sm:text-[min(15vw,20vh)] lg:text-[min(18vw,24vh)] leading-[0.85] tracking-[-0.02em] text-white text-center font-black uppercase whitespace-nowrap"
                >
                  WE SET<br />THE BAR.
                </motion.h1>
              </motion.div>
            </div>

            {/* Tagline + CTAs — visible at start, fade out as zoom begins */}
            <motion.div
              style={{ opacity: heroContentOpacity }}
              className="absolute bottom-[120px] sm:bottom-[90px] lg:bottom-[110px] z-20 flex flex-col items-center text-center px-4 w-full"
            >
              <p className="text-sm sm:text-lg text-white/60 font-medium leading-relaxed max-w-md">
                Craft ice cream.{" "}
                <span className="text-white/80 font-bold">Unique flavors.</span>{" "}
                <span className="text-[#A1AB74] font-black">Nothing fake.</span>
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 mt-4 sm:mt-6 justify-center">
                <Link
                  href="/pre-order"
                  className="group flex items-center gap-3 bg-[#A1AB74] text-white px-8 py-4 rounded-full font-black text-[15px] hover:bg-[#8a9360] transition-all hover:shadow-[0_0_40px_rgba(161,171,116,0.25)] hover:-translate-y-0.5"
                >
                  &#127846; PRE-ORDER ICE CREAM
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                </Link>
                <Link
                  href="/events"
                  className="flex items-center gap-2 border-2 border-white/25 text-white/70 px-7 py-4 rounded-full font-black text-[15px] hover:border-white/40 hover:text-white/90 transition-all"
                >
                  &#128197; EVENTS
                </Link>
              </div>
            </motion.div>

            {/* Scroll cue — desktop/tablet only */}
            <div className="hidden sm:flex absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 z-30 flex-col items-center gap-3">
              <span className="text-[10px] sm:text-xs font-black tracking-[0.25em] uppercase text-white/50 [writing-mode:vertical-lr] rotate-180 mb-1">Scroll</span>
              <div className="w-1.5 sm:w-2 h-36 sm:h-48 rounded-full bg-white/15 overflow-hidden relative">
                <motion.div
                  style={{ scaleY: heroProgress }}
                  className="absolute top-0 left-0 w-full h-full bg-[#A1AB74]/70 origin-top rounded-full"
                />
              </div>
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white/50 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7" /></svg>
            </div>

            {/* Ticker bar — always visible at bottom of hero */}
            <div className="absolute bottom-0 left-0 right-0 z-20 border-t border-white/[0.05] py-3.5 overflow-hidden" style={{ background: "rgba(17,17,24,0.7)", backdropFilter: "blur(8px)" }}>
              <div className="ticker-track">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="ticker-content" aria-hidden={i > 0}>
                    <span>&#10038; Unique Flavors</span>
                    <span>&#10038; Natural Ingredients</span>
                    <span>&#10038; No Artificial Colors</span>
                    <span>&#10038; Local PA Dairy</span>
                    <span>&#10038; 16% Butterfat</span>
                    <span>&#10038; Weekly Limited Batches</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <CraftedSection />

      <HomeStoryScroll />

      {featuredFlavours.length > 0 && (
        <section id="flavors" className="relative z-10 py-24 sm:py-32 md:py-40" style={{ background: "#f9f8f4" }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-12 gap-4">
              <div>
                <p className="text-[#1c1c1a]/55 text-xs font-bold tracking-widest uppercase mb-2">This Week's Batch</p>
                <h2 className="text-3xl sm:text-4xl font-black text-[#1c1c1a]">Pre-Order Weekly Special Flavors<br /><span className="text-[#A1AB74] text-xl sm:text-2xl font-bold">(available only online)</span></h2>
              </div>
              <Link href="/pre-order" className="text-[#1c1c1a]/60 font-bold text-sm cursor-pointer hover:text-[#1c1c1a] transition-colors">
                View all products &rarr;
              </Link>
            </div>

            {/* 3-col grid: main card spans left col + full height; 4 smaller cards fill 2×2 on the right */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" style={{ gridTemplateRows: 'auto auto' }}>
              {featuredMain && (
                <Link href={`/pre-order/${featuredMain.slug}`} className="sm:row-span-2 relative rounded-3xl overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.12)] group cursor-pointer" style={{ minHeight: 420 }}>
                  {featuredMain.imageUrl ? (
                    <img src={featuredMain.imageUrl} alt={featuredMain.name} loading="lazy" className="w-full h-72 sm:h-full object-cover group-hover:scale-105 transition-transform duration-500" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.style.display = 'none'; }} />
                  ) : (
                    <div className="w-full h-72 sm:h-full bg-gradient-to-br from-[#d4a853]/20 to-[#A1AB74]/20 flex items-center justify-center">
                      <span className="text-6xl">{featuredMain.emoji || "🍦"}</span>
                    </div>
                  )}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                    <span className="bg-white/90 backdrop-blur text-[#1c1c1a] text-xs font-black px-2.5 py-1 rounded-full uppercase tracking-wider">{TAG_LABELS[featuredMain.tag] || featuredMain.tag || "This Week"}</span>
                    <h3 className="text-white font-black text-2xl mt-2">{featuredMain.name}</h3>
                  </div>
                  <div className="absolute top-4 right-4 bg-[#1c1c1a] text-white rounded-2xl px-3.5 py-2.5 shadow-2xl rotate-3 z-10">
                    <p className="text-2xl font-black leading-none">${Math.round(parseFloat(featuredMain.basePrice))}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wider opacity-60 mt-0.5">per pint</p>
                  </div>
                </Link>
              )}
              {featuredSmall.map((slot: any) => (
                <Link key={slot.id} href={`/pre-order/${slot.slug}`} className="relative rounded-2xl overflow-hidden shadow-md group cursor-pointer block">
                  {slot.imageUrl ? (
                    <img src={slot.imageUrl} alt={slot.name} loading="lazy" className="w-full h-48 sm:h-56 object-cover group-hover:scale-105 transition-transform duration-500" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.style.display = 'none'; }} />
                  ) : (
                    <div className="w-full h-48 sm:h-56 bg-gradient-to-br from-[#d4a853]/20 to-[#A1AB74]/20 flex items-center justify-center">
                      <span className="text-5xl">{slot.emoji || "🍦"}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                    <span className="bg-white/90 backdrop-blur text-xs font-black px-2.5 py-1 rounded-full text-[#1c1c1a] leading-none">{slot.name}</span>
                    <span className="bg-[#1c1c1a] text-white text-xs font-black px-2.5 py-1.5 rounded-xl shadow-lg leading-none">${Math.round(parseFloat(slot.basePrice))}</span>
                  </div>
                </Link>
              ))}
            </div>

            <div className="text-center mt-10">
              <Link href="/pre-order" className="inline-block bg-[#A1AB74] text-white px-8 py-3.5 rounded-full font-bold text-sm hover:bg-[#8a9360] transition-all">
                Browse All Products
              </Link>
            </div>
          </div>
        </section>
      )}



      {rotatingFlavours.length > 0 && (
        <div className="relative z-10">
          <RotatingFlavoursShowcase flavours={rotatingFlavours} />
        </div>
      )}



      <section className="relative z-10 py-48 sm:py-60" style={{ background: "#f9f8f4" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="text-center mb-14">
            <p className="text-[#1c1c1a]/55 text-xs font-bold tracking-widest uppercase mb-2">Word on the Street</p>
            <h2 className="text-3xl sm:text-4xl font-black text-[#1c1c1a]">Our fans say it best</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { quote: "The Mango Habanero is unlike anything I've ever tasted. It's brilliant.", author: "Sarah K.", loc: "Harrisburg, PA" },
              { quote: "Best craft ice cream in Pennsylvania, hands down. The pre-order system is so easy.", author: "Marcus T.", loc: "Carlisle, PA" },
              { quote: "I drove 30 minutes just for the Sweet Potato Casserole pint. Worth every mile.", author: "Jennifer L.", loc: "Mechanicsburg, PA" },
            ].map((t) => (
              <div key={t.author} className="relative rounded-2xl p-7 bg-white border border-[#e8e5dc]">
                <span className="absolute -top-4 left-6 text-[#1c1c1a]/[0.06] text-7xl font-black leading-none select-none">&ldquo;</span>
                <div className="flex gap-0.5 mb-4 mt-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <svg key={i} className="w-3.5 h-3.5 fill-[#d4a853]" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  ))}
                </div>
                <p className="text-[#1c1c1a]/55 leading-relaxed italic text-sm mb-5">&ldquo;{t.quote}&rdquo;</p>
                <p className="font-bold text-[#1c1c1a] text-sm">{t.author}</p>
                <p className="text-xs text-[#1c1c1a]/50">{t.loc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
