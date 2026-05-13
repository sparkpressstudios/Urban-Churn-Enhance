import { useRef } from "react";
import { Link } from "wouter";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);

const BASE = import.meta.env.BASE_URL;

/**
 * Compact scrollytelling "Our Story" section for the homepage.
 * Uses uc-history.jpg as a pinned background with 2 text panels
 * that animate in/out on scroll. Includes wave dividers to blend
 * seamlessly with surrounding #f9f8f4 sections.
 */
export default function HomeStoryScroll() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const panelRefs = useRef<(HTMLDivElement | null)[]>([]);

  useGSAP(
    () => {
      const section = sectionRef.current;
      if (!section) return;

      const mm = gsap.matchMedia();

      const setupPinned = () => {
        const panels = panelRefs.current.filter(Boolean) as HTMLDivElement[];
        const n = panels.length;
        if (n === 0) return;

        // Pin the section; each panel gets 1 viewport height of scroll
        ScrollTrigger.create({
          trigger: section,
          pin: true,
          pinSpacing: true,
          start: "top top",
          end: () => `+=${n * window.innerHeight}`,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            const progress = self.progress * n;
            panels.forEach((panel, i) => {
              // Each panel occupies one "slot" of progress
              const panelProgress = progress - i;
              if (panelProgress < -0.3) {
                // Upcoming: below center, invisible
                gsap.set(panel, { y: 60, autoAlpha: 0 });
              } else if (panelProgress < 0.2) {
                // Entering: fade in and slide to center
                const t = Math.max(0, (panelProgress + 0.3) / 0.5);
                gsap.set(panel, { y: 60 * (1 - t), autoAlpha: t });
              } else if (panelProgress < 0.7) {
                // Centered: fully visible
                gsap.set(panel, { y: 0, autoAlpha: 1 });
              } else if (panelProgress < 1.1) {
                // Exiting: slide up and fade out
                const t = (panelProgress - 0.7) / 0.4;
                gsap.set(panel, { y: -60 * t, autoAlpha: 1 - t });
              } else {
                // Gone: above center
                gsap.set(panel, { y: -60, autoAlpha: 0 });
              }
            });
          },
        });

        // Subtle background zoom
        const bgImg = section.querySelector(".story-bg-img");
        if (bgImg) {
          gsap.fromTo(bgImg, { scale: 1.05 }, {
            scale: 1.18,
            ease: "none",
            scrollTrigger: {
              trigger: section,
              start: "top top",
              end: () => `+=${n * window.innerHeight}`,
              scrub: true,
            },
          });
        }

        // Initialize: show first, hide rest
        panels.forEach((panel, i) => {
          gsap.set(panel, { y: i === 0 ? 0 : 60, autoAlpha: i === 0 ? 1 : 0 });
        });
      };

      mm.add("(min-width: 768px)", setupPinned);
      mm.add("(max-width: 767px)", setupPinned);
    },
    { scope: wrapperRef },
  );

  return (
    <div ref={wrapperRef}>
      <section ref={sectionRef} className="relative h-screen overflow-hidden bg-[#111118]">
        {/* Background image */}
        <div className="absolute inset-0 overflow-hidden z-0">
          <img
            src={`${BASE}images/uc-history.jpg`}
            alt="The Urban Churn story — craft ice cream heritage"
            className="story-bg-img w-full h-full object-cover scale-[1.05]"
          />
          <div className="absolute inset-0 bg-black/50" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#111118]/80 via-transparent to-[#111118]/40" />
        </div>

        {/* Centered text area — panels stack in place */}
        <div className="relative z-10 h-full flex items-center justify-center px-6 sm:px-8">
          <div className="max-w-2xl mx-auto text-center relative">
            {/* Panel 1 */}
            <div ref={(el) => { panelRefs.current[0] = el; }} className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-[#A1AB74] text-xs sm:text-sm font-black tracking-[0.2em] uppercase mb-4">Our Story</p>
              <h2 className="text-4xl sm:text-5xl md:text-6xl font-black leading-none tracking-tight text-white mb-6">
                Every scoop tells<br />a story.
              </h2>
              <p className="text-white text-base sm:text-lg md:text-xl leading-relaxed max-w-xl mx-auto">
                What started as a family passion for bold, unexpected flavors became Urban Churn — a small-batch ice cream shop rooted in Harrisburg, PA.
              </p>
            </div>

            {/* Panel 2 */}
            <div ref={(el) => { panelRefs.current[1] = el; }} className="absolute inset-0 flex flex-col items-center justify-center" style={{ opacity: 0 }}>
              <p className="text-white text-base sm:text-lg md:text-xl leading-relaxed max-w-xl mx-auto mb-10">
                We draw inspiration from cultures around the world and churn every batch by hand using local 16% butterfat dairy and real ingredients you can taste. No artificial colors. No artificial flavorings. Just honest ice cream, made with intention.
              </p>
              <Link
                href="/about"
                className="inline-flex items-center gap-2 bg-white/10 text-white border border-white/20 px-7 py-3.5 rounded-full font-black text-sm hover:bg-white/20 transition-colors"
              >
                Learn our story &rarr;
              </Link>
            </div>

            {/* Invisible spacer so the container has dimensions */}
            <div className="invisible">
              <p className="text-xs sm:text-sm font-black tracking-[0.2em] uppercase mb-4">&nbsp;</p>
              <h2 className="text-4xl sm:text-5xl md:text-6xl font-black leading-none tracking-tight mb-6">
                Every scoop tells<br />a story.
              </h2>
              <p className="text-base sm:text-lg md:text-xl leading-relaxed max-w-xl mx-auto">&nbsp;</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
