export function VariantD() {
  const flavors = [
    { name: "Mint Chip", desc: "Cool peppermint swirled with rich dark chocolate chips", price: "$7", tag: "Classic", img: "/__mockup/images/mint-chip.jpg" },
    { name: "Truly Strawberry", desc: "Fresh PA strawberries blended into our rich 16% butterfat base", price: "$7", tag: "Fan Favorite", img: "/__mockup/images/strawberry.jpg" },
    { name: "Classic Vanilla", desc: "Pure Madagascar vanilla bean in our signature cream base", price: "$7", tag: "Bestseller", img: "/__mockup/images/vanilla.jpg" },
    { name: "Chocolate", desc: "Rich Dutch-process cocoa in our premium butterfat base", price: "$7", tag: "Rich & Bold", img: "/__mockup/images/chocolate.jpg" },
    { name: "Mango Habanero", desc: "Tropical mango with a spicy habanero finish", price: "$8", tag: "Limited", img: "/__mockup/images/mango-habanero.jpg" },
    { name: "Sweet Potato Casserole", desc: "Brown butter, pecan, and marshmallow swirls", price: "$8", tag: "Seasonal", img: "/__mockup/images/sweet-potato.jpg" },
  ];

  const steps = [
    { num: "01", title: "Choose Flavours", desc: "Browse this week's limited batch drops and pick your favourites." },
    { num: "02", title: "Select Size", desc: "Pint, quart, or party sizes — mix and match." },
    { num: "03", title: "Pick Location", desc: "Choose Carlisle, Mechanicsburg, or Harrisburg." },
    { num: "04", title: "Pick Up", desc: "We hold orders up to 2 weeks. Don't forget!" },
  ];

  const WaveDivider = ({ from, to, flip }: { from: string; to: string; flip?: boolean }) => (
    <div className="relative" style={{ marginTop: -1, marginBottom: -1 }}>
      <svg viewBox="0 0 1440 80" preserveAspectRatio="none" className="w-full block" style={{ height: 60, transform: flip ? "scaleY(-1)" : undefined }}>
        <path d="M0,0 L0,40 Q360,80 720,40 Q1080,0 1440,40 L1440,0 Z" fill={from} />
        <path d="M0,40 Q360,80 720,40 Q1080,0 1440,40 L1440,80 L0,80 Z" fill={to} />
      </svg>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>

      {/* ═══════ DARK ZONE ═══════ */}
      <div className="text-white" style={{ background: "#111118" }}>

        <div className="bg-[#1a1a1f] text-white text-center py-3 relative overflow-hidden border-b border-white/[0.05]">
          <div className="absolute inset-0 bg-gradient-to-r from-white/[0.03] via-transparent to-white/[0.03]" />
          <span className="relative text-sm font-bold tracking-wider">
            &#127846; NEW DROP: Mango Habanero & Sweet Potato Casserole —{" "}
            <span className="text-white underline underline-offset-4 cursor-pointer font-black">PRE-ORDER NOW</span>
          </span>
        </div>

        <nav className="sticky top-0 z-50 border-b border-white/[0.06]" style={{ background: "#111118" }}>
          <div className="max-w-7xl mx-auto flex items-center justify-between px-8 py-4">
            <img src="/__mockup/images/uc-logo-black.png" alt="Urban Churn" className="h-8 brightness-0 invert" />
            <div className="flex items-center gap-8 text-sm font-medium">
              <span className="text-white font-bold border-b border-white/30 pb-0.5">Home</span>
              <span className="text-white/50 hover:text-white cursor-pointer transition-colors">Flavours</span>
              <span className="text-white/50 hover:text-white cursor-pointer transition-colors">Locations</span>
              <span className="text-white/50 hover:text-white cursor-pointer transition-colors">About</span>
              <span className="text-white/50 hover:text-white cursor-pointer transition-colors">Catering</span>
            </div>
            <button className="bg-[#A1AB74] text-white px-5 py-2.5 rounded-full text-sm font-black hover:bg-[#8a9360] transition-colors">
              &#128722; Pre-Order
            </button>
          </div>
        </nav>

        <section className="relative overflow-hidden">
          <div className="absolute top-0 right-1/3 w-[800px] h-[800px] bg-white/[0.02] rounded-full blur-[160px]" />
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-white/[0.01] rounded-full blur-[80px]" />

          <div className="relative max-w-7xl mx-auto px-8 py-16">
            <div className="flex items-center gap-12">
              <div className="flex-[1.25]">
                <div className="inline-flex items-center gap-2 mb-7">
                  <div className="w-6 h-px bg-white/30" />
                  <span className="text-white/40 text-[10px] font-black tracking-[0.3em] uppercase">Craft Creamery · Central PA</span>
                </div>
                <h1 className="text-[8rem] font-black leading-[0.82] tracking-tighter text-white">
                  WE<br />
                  <span className="text-[#d4a853]">SET</span><br />
                  THE<br />
                  BAR.
                </h1>
                <p className="text-lg text-white/35 font-medium leading-relaxed mt-7 max-w-[380px]">
                  Craft ice cream.{" "}
                  <span className="text-white/80 font-bold">Unique flavours.</span>{" "}
                  <span className="text-[#d4a853] font-bold">Nothing fake.</span>
                </p>
                <div className="flex items-center gap-4 mt-8">
                  <button className="group flex items-center gap-3 bg-[#A1AB74] text-white px-8 py-4 rounded-full font-black text-[15px] hover:bg-[#8a9360] transition-all hover:shadow-[0_0_40px_rgba(161,171,116,0.25)] hover:-translate-y-0.5">
                    &#127846; PRE-ORDER ICE CREAM
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                  </button>
                  <button className="flex items-center gap-2 border-2 border-white/15 text-white/50 px-7 py-4 rounded-full font-black text-[15px] hover:border-white/30 hover:text-white/80 transition-all">
                    &#128197; EVENTS
                  </button>
                </div>
              </div>
              <div className="flex-1 relative">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 relative rounded-3xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
                    <img src="/__mockup/images/mint-chip.jpg" alt="Mint Chip" className="w-full h-56 object-cover" />
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-5">
                      <span className="bg-white/90 backdrop-blur text-[#1c1c1a] text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">This Week</span>
                      <h3 className="text-white font-black text-xl mt-1.5">Mint Chip Pint</h3>
                    </div>
                  </div>
                  <div className="relative rounded-2xl overflow-hidden shadow-lg">
                    <img src="/__mockup/images/strawberry.jpg" alt="Strawberry" className="w-full h-40 object-cover" />
                    <div className="absolute bottom-2.5 left-2.5">
                      <span className="bg-white/90 backdrop-blur text-[10px] font-black px-2.5 py-1 rounded-full text-[#1c1c1a]">&#127827; Strawberry</span>
                    </div>
                  </div>
                  <div className="relative rounded-2xl overflow-hidden shadow-lg">
                    <img src="/__mockup/images/chocolate.jpg" alt="Chocolate" className="w-full h-40 object-cover" />
                    <div className="absolute bottom-2.5 left-2.5">
                      <span className="bg-white/90 backdrop-blur text-[10px] font-black px-2.5 py-1 rounded-full text-[#1c1c1a]">&#127851; Chocolate</span>
                    </div>
                  </div>
                </div>
                <div className="absolute -top-4 -left-8 bg-[#1c1c1a] text-white rounded-2xl p-4 shadow-2xl -rotate-6 z-10">
                  <p className="text-3xl font-black">$7</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider opacity-60">per pint</p>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-white/[0.05] py-3.5 overflow-hidden" style={{ background: "rgba(255,255,255,0.02)" }}>
            <div className="flex items-center gap-12 whitespace-nowrap">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-12 text-white/25 text-[11px] font-black tracking-[0.2em] uppercase">
                  <span>&#10038; Unique Flavours</span>
                  <span>&#10038; Natural Ingredients</span>
                  <span>&#10038; No Artificial Colors</span>
                  <span>&#10038; Local PA Dairy</span>
                  <span>&#10038; 16% Butterfat</span>
                  <span>&#10038; Weekly Limited Batches</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* ═══════ WAVE: dark → cream ═══════ */}
      <WaveDivider from="#111118" to="#f9f8f4" />

      {/* ═══════ LIGHT ZONE ═══════ */}

      {/* ─── EDITORIAL PHOTO MOMENT — uc-photo-6 full-bleed ─── */}
      <section className="relative" style={{ background: "#f9f8f4" }}>
        <div className="max-w-7xl mx-auto px-8 pt-8 pb-20">
          <div className="relative rounded-[2rem] overflow-hidden shadow-[0_20px_80px_rgba(0,0,0,0.08)]">
            <img src="/__mockup/images/uc-photo-6.jpg" alt="Fresh scoops with toppings" className="w-full h-[420px] object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#1c1c1a]/70 via-[#1c1c1a]/30 to-transparent" />
            <div className="absolute bottom-0 left-0 p-10 max-w-lg">
              <p className="text-white/60 text-xs font-bold tracking-widest uppercase mb-2">Our Promise</p>
              <h2 className="text-4xl font-black text-white leading-tight mb-3">Crafted with intention.</h2>
              <p className="text-white/60 text-sm leading-relaxed">
                We churn ice cream inspired by cultures from around the world using local PA 16% butterfat dairy and natural ingredients. No artificial colours or flavourings — ever.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── BRAND VALUES — minimal text, clean ─── */}
      <section style={{ background: "#f9f8f4" }}>
        <div className="max-w-7xl mx-auto px-8 pb-20">
          <div className="grid grid-cols-3 gap-12">
            {[
              { title: "Unique Flavours", desc: "Seasonally rotating drops like Sauerkraut, Summer Corn, and Sweet Potato Casserole — flavours you won't find anywhere else." },
              { title: "Culturally Inspired", desc: "Affogatos, tiramisu sundaes, dulce de leche — inspired by flavour traditions from around the world." },
              { title: "Nothing Fake", desc: "Local PA dairy, natural ingredients, prepared in-house. No artificial colours or flavourings. Simple as that." },
            ].map((f) => (
              <div key={f.title} className="flex items-start gap-3">
                <div className="w-1 h-8 bg-[#1c1c1a]/10 rounded-full shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-[#1c1c1a] text-sm mb-1.5">{f.title}</p>
                  <p className="text-[#1c1c1a]/40 text-sm leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SCOOPS PHOTO BLEED — full-width editorial ─── */}
      <section className="relative overflow-hidden" style={{ background: "#f2f0e8" }}>
        <div className="flex items-stretch">
          <div className="w-[45%] shrink-0">
            <img src="/__mockup/images/uc-photo-3.jpg" alt="Ice cream scoops" className="w-full h-full object-cover" style={{ minHeight: 480 }} />
          </div>
          <div className="flex-1 flex items-center px-16 py-20">
            <div>
              <p className="text-[#1c1c1a]/30 text-xs font-bold tracking-widest uppercase mb-4">Made with care</p>
              <h2 className="text-4xl font-black text-[#1c1c1a] leading-tight mb-6">Every scoop tells<br />a story.</h2>
              <p className="text-[#1c1c1a]/45 leading-relaxed mb-8 max-w-md">
                From our kitchen to your cone — we use local PA 16% butterfat dairy and real ingredients you can taste. Each batch is hand-churned in small quantities.
              </p>
              <div className="flex gap-3">
                <div className="bg-white rounded-xl p-3 shadow-sm border border-[#e8e5dc] w-28">
                  <img src="/__mockup/images/uc-photo-4.jpg" alt="Butter Brickle" className="w-full aspect-square object-cover rounded-lg" />
                  <p className="text-[#1c1c1a]/50 text-[9px] font-bold text-center mt-1.5 uppercase">Butter Brickle</p>
                </div>
                <div className="bg-white rounded-xl p-3 shadow-sm border border-[#e8e5dc] w-28">
                  <img src="/__mockup/images/uc-photo-5.jpg" alt="PB Cup" className="w-full aspect-square object-cover rounded-lg" />
                  <p className="text-[#1c1c1a]/50 text-[9px] font-bold text-center mt-1.5 uppercase">PB Cup</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ WAVE: #f2f0e8 → #f9f8f4 ═══════ */}
      <WaveDivider from="#f2f0e8" to="#f9f8f4" />

      {/* ─── FLAVORS — staggered cards ─── */}
      <section className="py-20" style={{ background: "#f9f8f4" }}>
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex justify-between items-end mb-12">
            <div>
              <p className="text-[#1c1c1a]/30 text-xs font-bold tracking-widest uppercase mb-2">This Week's Batch</p>
              <h2 className="text-4xl font-black text-[#1c1c1a]">Order for quick pickup</h2>
            </div>
            <span className="text-[#1c1c1a]/40 font-bold text-sm cursor-pointer hover:text-[#1c1c1a] transition-colors">View all flavours &rarr;</span>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {flavors.map((f, i) => (
              <div key={f.name} className={`bg-white rounded-2xl overflow-hidden border border-[#e8e5dc] hover:shadow-lg transition-all group cursor-pointer ${i % 3 === 1 ? "mt-6" : ""}`}>
                <div className="relative h-40 overflow-hidden">
                  <img src={f.img} alt={f.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-3 left-3">
                    <span className="text-[10px] font-black px-2.5 py-1 bg-white/90 backdrop-blur rounded-full text-[#1c1c1a]/60 uppercase tracking-wider">{f.tag}</span>
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="text-base font-bold text-[#1c1c1a] mb-1">{f.name}</h3>
                  <p className="text-xs text-[#1c1c1a]/35 leading-relaxed mb-3">{f.desc}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-black text-[#1c1c1a]">{f.price}</span>
                    <span className="text-xs text-[#1c1c1a]/25 font-bold opacity-0 group-hover:opacity-100 transition-opacity">Add to order &rarr;</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <button className="bg-[#A1AB74] text-white px-8 py-3.5 rounded-full font-bold text-sm hover:bg-[#8a9360] transition-all">
              Browse All Flavours
            </button>
          </div>
        </div>
      </section>

      {/* ═══════ WAVE: #f9f8f4 → #f2f0e8 ═══════ */}
      <WaveDivider from="#f9f8f4" to="#f2f0e8" />

      {/* ─── PRE-ORDER STEPS — clean flowing horizontal ─── */}
      <section className="py-20" style={{ background: "#f2f0e8" }}>
        <div className="max-w-7xl mx-auto px-8">
          <div className="text-center mb-14">
            <p className="text-[#1c1c1a]/30 text-xs font-bold tracking-widest uppercase mb-2">Simple Process</p>
            <h2 className="text-4xl font-black text-[#1c1c1a]">How pre-orders work</h2>
          </div>
          <div className="flex items-start gap-0">
            {steps.map((s, i) => {
              const offsets = [0, 24, 8, 32];
              return (
                <div key={s.num} className="flex-1 relative text-center px-4" style={{ marginTop: offsets[i] }}>
                  {i < 3 && (
                    <svg className="absolute left-[calc(50%+28px)] h-8" style={{ top: 16, width: "calc(100% - 44px)" }} viewBox="0 0 200 32" preserveAspectRatio="none">
                      <path d={`M0,${i % 2 === 0 ? 4 : 24} Q100,${i % 2 === 0 ? 28 : 0} 200,${i % 2 === 0 ? 18 : 10}`} fill="none" stroke="rgba(28,28,26,0.08)" strokeWidth="2" strokeDasharray="8 5" />
                    </svg>
                  )}
                  <div className="w-10 h-10 border-2 border-[#1c1c1a]/15 text-[#1c1c1a]/60 rounded-full flex items-center justify-center mx-auto mb-4 text-xs font-black bg-white/50">
                    {s.num}
                  </div>
                  <h3 className="text-sm font-bold text-[#1c1c1a] mb-1.5">{s.title}</h3>
                  <p className="text-xs text-[#1c1c1a]/35 leading-relaxed">{s.desc}</p>
                </div>
              );
            })}
          </div>
          <p className="text-center text-xs text-[#1c1c1a]/20 mt-10 max-w-md mx-auto">
            Orders held up to 2 weeks · Credit by week 3 · Nonrefundable after week 4
          </p>
          <div className="text-center mt-6">
            <button className="inline-flex items-center gap-3 bg-[#A1AB74] hover:bg-[#8a9360] text-white px-8 py-4 rounded-full font-black transition-all">
              Start Your Pre-Order
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </button>
          </div>
        </div>
      </section>

      {/* ═══════ WAVE: #f2f0e8 → #f9f8f4 ═══════ */}
      <WaveDivider from="#f2f0e8" to="#f9f8f4" />

      {/* ─── TESTIMONIALS — clean cream ─── */}
      <section className="py-20" style={{ background: "#f9f8f4" }}>
        <div className="max-w-7xl mx-auto px-8">
          <div className="text-center mb-14">
            <p className="text-[#1c1c1a]/30 text-xs font-bold tracking-widest uppercase mb-2">Word on the Street</p>
            <h2 className="text-4xl font-black text-[#1c1c1a]">Our fans say it best</h2>
          </div>
          <div className="grid grid-cols-3 gap-5">
            {[
              { quote: "The Mango Habanero is unlike anything I've ever tasted. It's brilliant.", author: "Sarah K.", loc: "Harrisburg, PA" },
              { quote: "Best craft ice cream in Pennsylvania, hands down. The pre-order system is so easy.", author: "Marcus T.", loc: "Carlisle, PA" },
              { quote: "I drove 30 minutes just for the Sweet Potato Casserole pint. Worth every mile.", author: "Jennifer L.", loc: "Mechanicsburg, PA" },
            ].map((t) => (
              <div key={t.author} className="relative rounded-2xl p-7 bg-white border border-[#e8e5dc]">
                <span className="absolute -top-4 left-6 text-[#1c1c1a]/[0.06] text-7xl font-black leading-none select-none">"</span>
                <div className="flex gap-0.5 mb-4 mt-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <svg key={i} className="w-3.5 h-3.5 fill-[#d4a853]" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  ))}
                </div>
                <p className="text-[#1c1c1a]/55 leading-relaxed italic text-sm mb-5">"{t.quote}"</p>
                <p className="font-bold text-[#1c1c1a] text-sm">{t.author}</p>
                <p className="text-xs text-[#1c1c1a]/25">{t.loc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── LOCATIONS — simple, warm ─── */}
      <section className="py-20" style={{ background: "#f2f0e8" }}>
        <div className="max-w-7xl mx-auto px-8">
          <div className="text-center mb-14">
            <p className="text-[#1c1c1a]/30 text-xs font-bold tracking-widest uppercase mb-2">Find Us</p>
            <h2 className="text-4xl font-black text-[#1c1c1a]">3 locations across Central PA</h2>
          </div>
          <div className="grid grid-cols-3 gap-5">
            {[
              { name: "Carlisle", addr: "258 Westminster Dr\nCarlisle, PA 17013", hrs: "Mon–Thu: 12–9pm\nFri–Sat: 12–10pm\nSun: 12–9pm" },
              { name: "Mechanicsburg", addr: "6391 Carlisle Pike\nMechanicsburg, PA 17050", hrs: "Mon–Thu: 12–9pm\nFri–Sat: 12–10pm\nSun: 12–9pm" },
              { name: "Harrisburg", addr: "1004 N 3rd St\nHarrisburg, PA 17102", hrs: "Mon–Fri: 12–9pm\nSaturday: Closed" },
            ].map((l) => (
              <div key={l.name} className="rounded-2xl p-7 bg-white border border-[#e8e5dc] hover:shadow-md transition-all group">
                <div className="w-9 h-9 bg-[#f2f0e8] rounded-xl flex items-center justify-center mb-5 text-[#1c1c1a]/40 group-hover:bg-[#1c1c1a] group-hover:text-white transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </div>
                <h3 className="text-lg font-black text-[#1c1c1a] mb-2">{l.name}</h3>
                <p className="text-sm text-[#1c1c1a]/40 whitespace-pre-line mb-3">{l.addr}</p>
                <p className="text-xs text-[#1c1c1a]/25 whitespace-pre-line mb-5">{l.hrs}</p>
                <span className="text-[#1c1c1a]/50 font-bold text-sm cursor-pointer hover:text-[#1c1c1a] transition-colors">Get directions &rarr;</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── EVENTS CTA — warm photo overlay ─── */}
      <section className="relative overflow-hidden" style={{ minHeight: 420 }}>
        <div className="absolute inset-0">
          <img src="/__mockup/images/uc-photo-1.jpg" alt="Events" className="w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(28,28,26,0.88) 0%, rgba(28,28,26,0.65) 50%, rgba(28,28,26,0.3) 100%)" }} />
        </div>
        <div className="relative max-w-7xl mx-auto px-8 py-28 flex items-center">
          <div className="max-w-xl">
            <p className="text-white/50 text-xs font-bold tracking-widest uppercase mb-3">Events & Catering</p>
            <h2 className="text-6xl font-black text-white leading-[0.95] mb-5">Make your<br />event<br />unforgettable</h2>
            <p className="text-white/50 leading-relaxed mb-8 text-[15px]">
              From corporate events to weddings and birthday parties — we bring the craft creamery experience to you. Custom flavours, branded service, and memories that last.
            </p>
            <button className="inline-flex items-center gap-3 bg-white text-[#1c1c1a] px-8 py-4 rounded-full font-black hover:bg-[#f9f8f4] transition-all shadow-xl">
              Request a Quote
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </button>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="text-white py-12" style={{ background: "#0d0d12" }}>
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex items-start justify-between mb-10">
            <div>
              <img src="/__mockup/images/uc-logo-black.png" alt="Urban Churn" className="h-8 brightness-0 invert opacity-50 mb-4" />
              <p className="text-white/25 text-sm max-w-xs leading-relaxed">Unique flavours, natural ingredients, nothing fake. Crafting ice cream inspired by cultures around the world.</p>
            </div>
            <div className="flex gap-16 text-sm">
              <div>
                <h4 className="font-black text-white/25 uppercase text-[10px] tracking-wider mb-4">Quick Links</h4>
                <div className="space-y-2.5 text-white/35">
                  <p className="hover:text-white cursor-pointer transition-colors">Pre-Order</p>
                  <p className="hover:text-white cursor-pointer transition-colors">Locations</p>
                  <p className="hover:text-white cursor-pointer transition-colors">About</p>
                  <p className="hover:text-white cursor-pointer transition-colors">Events</p>
                </div>
              </div>
              <div>
                <h4 className="font-black text-white/25 uppercase text-[10px] tracking-wider mb-4">Locations</h4>
                <div className="space-y-2.5 text-white/35">
                  <p>Carlisle, PA</p>
                  <p>Mechanicsburg, PA</p>
                  <p>Harrisburg, PA</p>
                </div>
              </div>
            </div>
          </div>
          <div className="border-t border-white/[0.04] pt-6 flex items-center justify-between">
            <p className="text-white/20 text-xs">&copy; 2026 Urban Churn Craft Creamery. All rights reserved.</p>
            <div className="flex gap-5 text-xs text-white/20">
              <span className="hover:text-white cursor-pointer">Privacy</span>
              <span className="hover:text-white cursor-pointer">Terms</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
