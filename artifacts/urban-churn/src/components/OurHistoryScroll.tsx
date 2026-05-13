import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);

const BASE = import.meta.env.BASE_URL;

const storyPanels = [
  {
    label: "Our Story",
    heading: (
      <>
        Family tradition
        <br />
        meets urban twist.
      </>
    ),
    body: "Craft ice cream rooted in memory, churned with intention — for Central PA and beyond.",
  },
  {
    label: "The Origin",
    heading: (
      <>
        Do you know what's
        <br />
        in your ice cream?
      </>
    ),
    body: (
      <>
        We do. <span className="font-black text-2xl">We set the bar</span> of
        churning premium ice cream by using natural ingredients with{" "}
        <strong className="font-black uppercase tracking-wide">
          NO artificial food coloring or flavors
        </strong>
        . That means no high fructose corn syrup, no artificial flavors and no
        artificial coloring like Yellow No. 6 or Red 40.
      </>
    ),
  },
  {
    label: "Our Dairy",
    heading: (
      <>
        <span className="text-[#d4a853]">16%</span> butterfat.
        <br />
        Grass-fed PA dairy.
      </>
    ),
    body: "We use locally sourced Pennsylvania 16% butterfat grass-fed dairy and blend in real fruit and natural flavors that we prepare in-house. As a PA Preferred certified creamery, every scoop you enjoy supports local farmers, local suppliers, and local families right here in the Commonwealth.",
    badgeImg: `${BASE}images/pa-preferred-logo-color.png`,
  },
  {
    label: "The Memory",
    heading: null,
    body: null,
    quote:
      "During childhood, family members would gather at my Great Grandmother's cottage to celebrate special events. My Great Uncle would bring his old wood churn, ice, salt and a dairy mix from his farm to make homemade ice cream. That memory is what drives every scoop we make today.",
  },
];

export default function OurHistoryScroll() {
  const containerRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const scrollCueRef = useRef<HTMLDivElement>(null);
  const scrollBarRef = useRef<HTMLDivElement>(null);
  const panelRefs = useRef<(HTMLDivElement | null)[]>([]);

  useGSAP(
    () => {
      const container = containerRef.current;
      const bg = bgRef.current;
      if (!container || !bg) return;

      const mm = gsap.matchMedia();

      // ── Desktop: pinned background + scrubbed panel timeline ──
      mm.add("(min-width: 768px)", () => {
        // Pin the background for the entire scroll distance
        ScrollTrigger.create({
          trigger: container,
          start: "top top",
          end: "bottom bottom",
          pin: bg,
          pinSpacing: false,
        });

        // Subtle parallax zoom on the background image
        const bgImg = bg.querySelector("img");
        if (bgImg) {
          gsap.fromTo(
            bgImg,
            { scale: 1 },
            {
              scale: 1.15,
              ease: "none",
              scrollTrigger: {
                trigger: container,
                start: "top top",
                end: "bottom bottom",
                scrub: true,
              },
            },
          );
        }

        // Animate each panel in and out (skip panel 0 — it's the hero, visible on load)
        panelRefs.current.forEach((panel, i) => {
          if (!panel || i === 0) return;
          const isLast = i === panelRefs.current.length - 1;

          // Fade in
          gsap.fromTo(
            panel,
            { autoAlpha: 0, y: 60 },
            {
              autoAlpha: 1,
              y: 0,
              ease: "power2.out",
              scrollTrigger: {
                trigger: panel,
                start: "top 80%",
                end: "top 30%",
                scrub: 0.5,
              },
            },
          );

          // Fade out (skip for the last panel)
          if (!isLast) {
            gsap.to(panel, {
              autoAlpha: 0,
              y: -40,
              ease: "power2.in",
              scrollTrigger: {
                trigger: panel,
                start: "bottom 40%",
                end: "bottom 10%",
                scrub: 0.5,
              },
            });
          }
        });

        // Fade out the hero panel (panel 0) as user scrolls
        const heroPanel = panelRefs.current[0];
        if (heroPanel) {
          gsap.to(heroPanel, {
            autoAlpha: 0,
            y: -40,
            ease: "power2.in",
            scrollTrigger: {
              trigger: heroPanel,
              start: "bottom 60%",
              end: "bottom 20%",
              scrub: 0.5,
            },
          });
        }

        // Show/hide scroll cue while in this section (it's fixed positioned)
        if (scrollCueRef.current) {
          ScrollTrigger.create({
            trigger: container,
            start: "top top",
            end: "bottom bottom",
            onLeave: () => gsap.to(scrollCueRef.current, { autoAlpha: 0, duration: 0.3 }),
            onEnterBack: () => gsap.to(scrollCueRef.current, { autoAlpha: 1, duration: 0.3 }),
          });
        }

        // Animate scroll progress bar fill
        if (scrollBarRef.current) {
          gsap.to(scrollBarRef.current, {
            scaleY: 1,
            ease: "none",
            scrollTrigger: {
              trigger: container,
              start: "top top",
              end: "bottom bottom",
              scrub: true,
            },
          });
        }
      });

      // ── Mobile: pin background + scrubbed panel animations (same feel as desktop) ──
      mm.add("(max-width: 767px)", () => {
        // Pin the background for the entire scroll distance
        ScrollTrigger.create({
          trigger: container,
          start: "top top",
          end: "bottom bottom",
          pin: bg,
          pinSpacing: false,
        });

        // Animate each panel in and out (skip panel 0 — it's the hero, visible on load)
        panelRefs.current.forEach((panel, i) => {
          if (!panel || i === 0) return;
          const isLast = i === panelRefs.current.length - 1;

          // Fade in
          gsap.fromTo(
            panel,
            { autoAlpha: 0, y: 40 },
            {
              autoAlpha: 1,
              y: 0,
              ease: "power2.out",
              scrollTrigger: {
                trigger: panel,
                start: "top 85%",
                end: "top 40%",
                scrub: 0.5,
              },
            },
          );

          // Fade out (skip for the last panel)
          if (!isLast) {
            gsap.to(panel, {
              autoAlpha: 0,
              y: -30,
              ease: "power2.in",
              scrollTrigger: {
                trigger: panel,
                start: "bottom 45%",
                end: "bottom 15%",
                scrub: 0.5,
              },
            });
          }
        });

        // Fade out the hero panel (panel 0) as user scrolls
        const heroPanel = panelRefs.current[0];
        if (heroPanel) {
          gsap.to(heroPanel, {
            autoAlpha: 0,
            y: -30,
            ease: "power2.in",
            scrollTrigger: {
              trigger: heroPanel,
              start: "bottom 65%",
              end: "bottom 25%",
              scrub: 0.5,
            },
          });
        }

        // Show/hide scroll cue while in this section
        if (scrollCueRef.current) {
          ScrollTrigger.create({
            trigger: container,
            start: "top top",
            end: "bottom bottom",
            onLeave: () => gsap.to(scrollCueRef.current, { autoAlpha: 0, duration: 0.3 }),
            onEnterBack: () => gsap.to(scrollCueRef.current, { autoAlpha: 1, duration: 0.3 }),
          });
        }

        // Animate scroll progress bar fill
        if (scrollBarRef.current) {
          gsap.to(scrollBarRef.current, {
            scaleY: 1,
            ease: "none",
            scrollTrigger: {
              trigger: container,
              start: "top top",
              end: "bottom bottom",
              scrub: true,
            },
          });
        }
      });
    },
    { scope: containerRef },
  );

  return (
    <section
      ref={containerRef}
      className="relative bg-[#111118]"
    >
      {/* ── Background layer (pinned by GSAP on desktop) ── */}
      <div
        ref={bgRef}
        className="absolute top-0 left-0 w-full h-screen overflow-hidden z-0"
      >
        <img
          src={`${BASE}images/uc-history.jpg`}
          alt="Urban Churn origin story — handcrafted ice cream tradition"
          className="w-full h-full object-cover scale-[1.05]"
        />
        {/* Gradient overlays for text readability */}
        <div className="absolute inset-0 bg-black/50" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#111118] via-transparent to-[#111118]/40" />
      </div>

      {/* ── Vertical scroll cue (right side, matches homepage hero) ── */}
      <div ref={scrollCueRef} className="fixed right-4 sm:right-8 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-3 pointer-events-none">
        <span className="text-[10px] sm:text-xs font-black tracking-[0.25em] uppercase text-white/50 [writing-mode:vertical-lr] rotate-180 mb-1">Scroll</span>
        <div className="w-1.5 sm:w-2 h-36 sm:h-48 rounded-full bg-white/15 overflow-hidden relative">
          <div ref={scrollBarRef} className="absolute top-0 left-0 w-full h-full bg-[#A1AB74]/70 origin-top rounded-full" style={{ transform: 'scaleY(0)' }} />
        </div>
        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white/50 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7" /></svg>
      </div>

      {/* ── Scrolling text panels ── */}
      <div className="relative z-10">
        {storyPanels.map((panel, i) => (
          <div
            key={i}
            ref={(el) => {
              panelRefs.current[i] = el;
            }}
            className={`min-h-screen flex items-center justify-center px-6 sm:px-8 relative${i === 0 ? '' : ' invisible'}`}
          >
            <div className="max-w-2xl mx-auto text-center">
              {/* Label */}
              {panel.label && (
                <p className="text-[#d4a853] text-xs sm:text-sm font-black tracking-[0.2em] uppercase mb-4">
                  {panel.label}
                </p>
              )}

              {/* Heading */}
              {panel.heading && (
                <h2 className="text-4xl sm:text-5xl md:text-7xl font-black leading-none tracking-tight text-white mb-6">
                  {panel.heading}
                </h2>
              )}

              {/* Body */}
              {panel.body && (
                <p className="text-white/70 text-base sm:text-lg md:text-xl leading-relaxed">
                  {panel.body}
                </p>
              )}

              {/* Badge image */}
              {panel.badgeImg && (
                <img src={panel.badgeImg} alt="PA Preferred" className="h-14 sm:h-18 w-auto mx-auto mt-8 opacity-90" />
              )}

              {/* Quote (panel 4) */}
              {panel.quote && (
                <blockquote className="border-l-4 border-[#d4a853]/60 pl-6 text-left">
                  <p className="text-white/80 text-lg sm:text-xl md:text-2xl leading-relaxed italic font-light">
                    "{panel.quote}"
                  </p>
                </blockquote>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
