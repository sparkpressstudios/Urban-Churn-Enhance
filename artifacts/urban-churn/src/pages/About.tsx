import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import OurHistoryScroll from "@/components/OurHistoryScroll";
import { Link } from "wouter";

const BASE = import.meta.env.BASE_URL;

export default function About() {
  const promiseSectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: promiseScrollProgress } = useScroll({ target: promiseSectionRef, offset: ["start end", "end start"] });
  const promiseParallaxY = useTransform(promiseScrollProgress, [0, 1], ["-15%", "15%"]);

  const ctaSectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress: ctaScrollProgress } = useScroll({ target: ctaSectionRef, offset: ["start end", "end start"] });
  const ctaParallaxY = useTransform(ctaScrollProgress, [0, 1], ["-15%", "15%"]);

  return (
    <div className="min-h-screen" style={{ fontFamily: "'Space Grotesk', 'Poppins', sans-serif" }}>
      <SEO
        title="Our Story | Urban Churn — Family Tradition Meets Urban Twist"
        description="Learn about Urban Churn's story — craft ice cream rooted in family tradition, using 16% butterfat grass-fed PA dairy with no artificial ingredients. Culturally inspired sundaes & desserts."
        keywords="Urban Churn story, craft ice cream about, super premium ice cream, natural ingredients, PA Preferred certified, grass-fed dairy ice cream, homemade ice cream, artisanal creamery"
        canonical="/about"
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Our Story", url: "/about" },
        ]}
      />
      <Navbar />

      {/* Immersive scrollytelling hero + origin story */}
      <OurHistoryScroll />

      {/* Values */}
      <section ref={promiseSectionRef} className="py-40 sm:py-80 md:py-[30rem] relative overflow-hidden">
        <motion.div className="absolute inset-0 scale-[1.3]" style={{ y: promiseParallaxY }}>
          <img src={`${BASE}images/_PSK0263.jpg`} alt="Urban Churn craft ice cream production with natural ingredients" className="absolute inset-0 w-full h-full object-cover" />
        </motion.div>
        <div className="absolute inset-0 bg-[#111118]/50" />
        <div className="absolute top-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 0 C480 60 960 60 1440 0 L1440 0 L0 0 Z" fill="#111118" />
          </svg>
        </div>
        <div className="relative max-w-7xl mx-auto px-8 pt-8">
          <div className="text-center mb-16">
            <p className="text-[#A1AB74] text-xs font-black tracking-[0.2em] uppercase mb-3">What We Stand For</p>
            <h2 className="text-4xl md:text-5xl font-black text-white">The Urban Churn promise.</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7" stroke="#A1AB74" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a7 7 0 0 1 7 7c0 4-3 7-7 10C9 16 5 13 5 9a7 7 0 0 1 7-7z" />
                    <path d="M12 6v4l2 2" />
                  </svg>
                ),
                title: "No Artificial Anything",
                body: "We never use artificial coloring or flavoring. No Yellow No. 6, no Red 40, no high fructose corn syrup. What you taste is real.",
              },
              {
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7" stroke="#d4a853" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 2h8l1 6H7L8 2z" />
                    <path d="M7 8c0 5 2.5 9 5 11 2.5-2 5-6 5-11" />
                  </svg>
                ),
                title: "Local PA Dairy",
                body: "Our base is locally sourced Pennsylvania 16% butterfat grass-fed dairy — richer, creamier, and better for the region we call home.",
              },
              {
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7" stroke="#A1AB74" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" />
                  </svg>
                ),
                title: "Inspired By The World",
                body: "From Baklava Ice Cream Sandwiches to Tiramisu Sundaes and Bourbon Banana Splits, our menu draws from cultures around the globe.",
              },
              {
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7" stroke="#d4a853" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                ),
                title: "Community First",
                body: "We're PA Preferred certified. When you buy Urban Churn, you're supporting local farmers, local suppliers, and local families.",
              },
              {
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7" stroke="#A1AB74" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                ),
                title: "Seasonal Menus",
                body: "Our dessert menu changes with the seasons to keep things fresh, unexpected, and delicious. There's always something new to discover.",
              },
              {
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7" stroke="#d4a853" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                ),
                title: "Super Premium Quality",
                body: "Our ice cream qualifies as 'Super Premium' — a designation earned through ingredient quality, butterfat content, and craftsmanship.",
              },
            ].map((v) => (
              <div key={v.title} className="bg-white rounded-2xl p-8 shadow-sm">
                <div className="mb-4">{v.icon}</div>
                <h3 className="font-black text-[#1a1a1f] text-lg mb-3">{v.title}</h3>
                <p className="text-[#555] text-sm leading-relaxed">{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Desserts section */}
      <section className="bg-[#f9f8f4] py-40 md:py-56 relative">
        <div className="max-w-7xl mx-auto px-8">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="relative">
              <img
                src={`${BASE}images/uc-110.jpg`}
                alt="Urban Churn sundaes"
                className="rounded-2xl w-full object-cover aspect-square shadow-xl"
              />
            </div>
            <div>
              <p className="text-[#d4a853] text-xs font-black tracking-[0.2em] uppercase mb-4">Beyond The Scoop</p>
              <h2 className="text-4xl md:text-5xl font-black leading-tight text-[#1a1a1f] mb-6">
                Sundaes & desserts<br />from around the world.
              </h2>
              <p className="text-[#444] text-lg leading-relaxed mb-6">
                Urban Churn is not your typical ice cream shop. Instead of a plain hot fudge sundae, we offer desserts like Lemon Bar Sundaes, Bourbon Banana Splits, Baklava Ice Cream Sandwiches, Tiramisu Sundaes and more.
              </p>
              <p className="text-[#666] text-base leading-relaxed mb-8">
                Our menu changes with the seasons to keep things fresh — so every visit is a new experience.
              </p>
              <Link href="/locations" className="inline-flex bg-[#A1AB74] text-white px-7 py-3.5 rounded-full font-black text-sm hover:bg-[#8a9360] transition-colors">
                Browse All Flavours →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section ref={ctaSectionRef} className="relative text-white py-24 text-center overflow-hidden">
        <motion.div className="absolute inset-0 scale-[1.3]" style={{ y: ctaParallaxY }}>
          <img src={`${BASE}images/uc-about-cta-bg.jpg`} alt="Urban Churn craft creamery experience" loading="lazy" className="w-full h-full object-cover" />
        </motion.div>
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative max-w-2xl mx-auto px-8">
          <h2 className="text-4xl md:text-5xl font-black mb-4">Ready to taste<br />the difference?</h2>
          <p className="text-white/70 text-lg mb-10">Visit any of our 4 Central PA locations or place a pre-order online.</p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/locations" className="bg-white/10 text-white border border-white/20 px-7 py-3.5 rounded-full font-black text-sm hover:bg-white/20 transition-colors">
              Find a Location
            </Link>
            <Link href="/pre-order" className="bg-[#A1AB74] text-white px-7 py-3.5 rounded-full font-black text-sm hover:bg-[#8a9360] transition-colors">
              Pre-Order Now
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
