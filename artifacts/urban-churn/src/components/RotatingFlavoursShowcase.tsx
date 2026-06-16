import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import OptimizedImage from "@/components/OptimizedImage";

gsap.registerPlugin(ScrollTrigger);

const BASE = import.meta.env.BASE_URL;

interface Flavour {
  id: number;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
}

/* ─── Main export ─── */
export default function RotatingFlavoursShowcase({
  flavours,
}: {
  flavours: Flavour[];
  dark?: boolean;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const activeRef = useRef(0);
  const setActiveRef = useRef<(index: number) => void>(() => { });

  useGSAP(() => {
    if (!sectionRef.current) return;
    const mm = gsap.matchMedia();

    mm.add("(min-width: 1024px)", () => {
      const n = flavours.length;
      if (n === 0) return;

      setActive(0, true);

      // Pin the inner section; wrapper stays stable in React's DOM tree
      ScrollTrigger.create({
        trigger: sectionRef.current,
        pin: true,
        pinSpacing: true,
        scrub: false,
        start: "top top",
        end: () => `+=${n * window.innerHeight * 0.5}`,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const idx = Math.min(n - 1, Math.floor(self.progress * n));
          setActive(idx);
        },
      });
    });

    setActiveRef.current = (index: number) => setActive(index);

    function setActive(index: number, force?: boolean) {
      if (!force && activeRef.current === index) return;
      activeRef.current = index;

      // Animate rows
      rowRefs.current.forEach((row, i) => {
        if (!row) return;
        const num = row.querySelector(".row-num");
        const name = row.querySelector(".row-name");
        const desc = row.querySelector(".row-desc");
        const arrow = row.querySelector(".row-arrow");
        const isActive = i === index;

        gsap.to(row, { backgroundColor: isActive ? "rgba(255,255,255,0.06)" : "transparent", duration: 0.35 });
        if (num) gsap.to(num, { color: isActive ? "#d4a853" : "rgba(255,255,255,0.7)", duration: 0.3 });
        if (name) gsap.to(name, { color: isActive ? "#ffffff" : "rgba(255,255,255,0.85)", duration: 0.35 });
        if (desc) gsap.to(desc, { height: isActive ? "auto" : 0, opacity: isActive ? 1 : 0, marginTop: isActive ? 8 : 0, duration: 0.4, ease: "power2.inOut" });
        if (arrow) gsap.to(arrow, { opacity: isActive ? 1 : 0, x: isActive ? 0 : -8, duration: 0.3 });
      });

      // Animate image — crossfade via clip-path
      if (!imageRef.current) return;
      const imgs = imageRef.current.querySelectorAll<HTMLDivElement>(".img-slide");
      imgs.forEach((img, i) => {
        if (i === index) {
          gsap.fromTo(img,
            { clipPath: "inset(100% 0% 0% 0% round 16px)" },
            { clipPath: "inset(0% 0% 0% 0% round 16px)", duration: 0.6, ease: "power3.inOut", zIndex: 2 },
          );
        } else {
          gsap.to(img, { clipPath: "inset(0% 0% 100% 0% round 16px)", duration: 0.5, ease: "power3.inOut", zIndex: 1 });
        }
      });
    }

    return () => mm.revert();
  }, { scope: wrapperRef, dependencies: [flavours] });

  return (
    <div ref={wrapperRef}>
      <div ref={sectionRef} className="relative w-full lg:min-h-screen" style={{ background: "#111118" }}>
        {/* Background image + overlay */}
        <div className="absolute inset-0">
          <OptimizedImage src="uc-rotating-bg.jpg" alt="Rotating seasonal ice cream flavors" className="w-full h-full object-cover object-bottom" />
          <div className="absolute inset-0 bg-[#111118]/60" />
        </div>

        <div className="relative z-10 flex flex-col max-w-7xl mx-auto px-4 sm:px-8 py-10 lg:pt-16 lg:pb-14">
          {/* Section header */}
          <div className="text-center mb-8 lg:mb-10 flex-shrink-0">
            <p className="text-[#d4a853] text-sm font-black tracking-[0.2em] uppercase mb-3">Updated Monthly</p>
            <h2 className="text-3xl lg:text-5xl font-black text-white mb-3 leading-tight">This Month's Rotating Scoop Flavors</h2>
            <p className="text-white/45 text-base lg:text-lg max-w-2xl mx-auto leading-relaxed">
              We change our rotating scoop flavors every month across all of our shops. Stop in and try something new — these won't last long!
            </p>
          </div>

          {/* ─── Desktop: vertical list + image ─── */}
          <div className="hidden lg:flex gap-10 lg:gap-16 items-start">
            {/* Left: flavour list */}
            <div className="w-1/2 overflow-y-auto scrollbar-none">
              {flavours.map((flavour, i) => (
                <div
                  key={flavour.id}
                  ref={(el) => { rowRefs.current[i] = el; }}
                  className="border-b border-white/10 rounded-lg cursor-pointer relative"
                  onClick={() => setActiveRef.current(i)}
                >
                  <div className="flex items-start gap-4 py-6 px-5">
                    <span className="row-num font-mono text-sm font-bold pt-1.5 w-7 flex-shrink-0 select-none text-white/70">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h3 className="row-name text-2xl lg:text-3xl font-black leading-tight text-white">
                        {flavour.name}
                      </h3>
                      {flavour.description && (
                        <p className="row-desc text-base lg:text-lg leading-relaxed text-white/70 overflow-hidden" style={{ height: 0, opacity: 0, marginTop: 0 }}>
                          {flavour.description}
                        </p>
                      )}
                    </div>
                    <div className="row-arrow flex-shrink-0 pt-1.5 opacity-0">
                      <svg className="w-5 h-5 text-[#d4a853]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Right: image panel */}
            <div className="w-1/2 flex items-center">
              <div ref={imageRef} className="w-full">
                <div className="relative w-full aspect-[3/4] max-h-[65vh] rounded-2xl overflow-hidden bg-gradient-to-br from-[#d4a853]/10 to-[#A1AB74]/10">
                  {flavours.map((flavour, i) => (
                    <div
                      key={flavour.id}
                      className="img-slide absolute inset-0"
                      style={{ clipPath: i === 0 ? "inset(0% 0% 0% 0% round 16px)" : "inset(100% 0% 0% 0% round 16px)", zIndex: i === 0 ? 2 : 1 }}
                    >
                      {flavour.imageUrl ? (
                        <img
                          src={flavour.imageUrl}
                          alt={flavour.name}
                          className="w-full h-full object-cover"
                          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.style.display = "none"; }}
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-[#d4a853]/20 to-[#A1AB74]/20 flex items-center justify-center">
                          <span className="text-8xl">🍦</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>


        </div>

        {/* ─── Mobile: stacked cards ─── */}
        <div className="lg:hidden relative z-10 px-4 pb-12 pt-2">
          <div className="space-y-3">
            {flavours.map((flavour, i) => (
              <div key={flavour.id} className="rounded-xl overflow-hidden bg-white/[0.06] border border-white/10">
                {flavour.imageUrl && (
                  <div className="w-full aspect-[16/9] overflow-hidden">
                    <img src={flavour.imageUrl} alt={flavour.name} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.style.display = "none"; }} />
                  </div>
                )}
                <div className="px-4 py-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-mono text-xs font-bold">{String(i + 1).padStart(2, "0")}</span>
                    <h3 className="text-white font-black text-lg leading-tight">{flavour.name}</h3>
                  </div>
                  {flavour.description && (
                    <p className="text-white text-sm leading-relaxed mt-1">{flavour.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
