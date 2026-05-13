export function RefinedB() {
  const flavors = [
    { name: "Mint Chip", desc: "Cool peppermint swirled with rich dark chocolate chips", price: "$7", tag: "Classic", img: "/__mockup/images/mint-chip.jpg" },
    { name: "Truly Strawberry", desc: "Fresh PA strawberries blended into our rich 16% butterfat base", price: "$7", tag: "Fan Favorite", img: "/__mockup/images/strawberry.jpg" },
    { name: "Classic Vanilla", desc: "Pure Madagascar vanilla bean in our signature cream base", price: "$7", tag: "Bestseller", img: "/__mockup/images/vanilla.jpg" },
    { name: "Chocolate", desc: "Rich Dutch-process cocoa in our premium butterfat base", price: "$7", tag: "Rich & Bold", img: "/__mockup/images/chocolate.jpg" },
    { name: "Mango Habanero", desc: "Tropical mango with a spicy habanero finish", price: "$8", tag: "Limited", img: "/__mockup/images/mango-habanero.jpg" },
    { name: "Sweet Potato Casserole", desc: "Brown butter, pecan, and marshmallow swirls", price: "$8", tag: "Seasonal", img: "/__mockup/images/sweet-potato.jpg" },
  ];

  const steps = [
    { num: "1", title: "Choose Flavours", desc: "Browse this week's limited batch drops." },
    { num: "2", title: "Select Size", desc: "Pint, quart, or party sizes." },
    { num: "3", title: "Pick Location", desc: "Carlisle, Mechanicsburg, or Harrisburg." },
    { num: "4", title: "Pick Up", desc: "We hold orders up to 2 weeks." },
  ];

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Poppins', sans-serif" }}>
      {/* Slim announcement */}
      <div className="bg-[#2A2B39] text-white text-center py-2 text-xs tracking-wider uppercase font-medium">
        <span className="text-[#A1AB74]">&#10038;</span>{" "}
        Pre-Order This Week's Limited Batch{" "}
        <span className="text-[#A1AB74]">&#10038;</span>
      </div>

      {/* Navbar — cleaner weight */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-8 py-4">
          <img src="/__mockup/images/uc-logo-black.png" alt="Urban Churn" className="h-10" />
          <div className="flex items-center gap-9 text-[13px] font-medium text-gray-400">
            <span className="text-gray-900 font-semibold">Home</span>
            <span className="hover:text-gray-900 cursor-pointer transition-colors">Pre-Order</span>
            <span className="hover:text-gray-900 cursor-pointer transition-colors">Locations</span>
            <span className="hover:text-gray-900 cursor-pointer transition-colors">About</span>
            <span className="hover:text-gray-900 cursor-pointer transition-colors">Events</span>
            <span className="hover:text-gray-900 cursor-pointer transition-colors">Contact</span>
          </div>
          <button className="bg-[#A1AB74] text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-[#8a9360] transition-colors">
            Pre-Order Now
          </button>
        </div>
      </nav>

      {/* Hero — editorial asymmetric */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a1b26] via-[#22232f] to-[#1a1b26]" />
        <div className="absolute top-1/3 left-1/3 w-[600px] h-[600px] bg-[#A1AB74]/10 rounded-full blur-[150px]" />

        <div className="relative max-w-7xl mx-auto px-8">
          <div className="grid grid-cols-12 gap-8 items-center min-h-[600px] py-20">
            {/* Left: content — 7 cols */}
            <div className="col-span-7">
              <div className="inline-flex items-center gap-2 mb-8">
                <div className="w-8 h-px bg-[#A1AB74]" />
                <span className="text-[#A1AB74] text-xs font-bold tracking-[0.2em] uppercase">Craft Creamery — Central PA</span>
              </div>

              <h1 className="text-[4.5rem] font-black text-white leading-[0.92] tracking-tight mb-6" style={{ fontFamily: "'Playfair Display', serif" }}>
                Unique Flavours.<br />
                <span className="text-[#A1AB74]">Natural</span> Ingredients.<br />
                Nothing Fake.
              </h1>

              <p className="text-lg text-white/35 font-light mb-10 max-w-lg leading-relaxed">
                We churn ice cream inspired by cultures from around the world using local PA 16% butterfat dairy and natural ingredients — no artificial colours or flavourings.
              </p>

              <div className="flex items-center gap-4 mb-14">
                <button className="group flex items-center gap-3 bg-[#A1AB74] hover:bg-[#8a9360] text-white px-8 py-4 rounded-full font-bold text-[15px] transition-all hover:shadow-[0_0_30px_rgba(161,171,116,0.25)]">
                  Pre-Order Ice Cream
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                </button>
                <button className="flex items-center gap-2 text-white/50 hover:text-white/80 font-medium transition-colors">
                  Events & Catering
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                </button>
              </div>

              {/* Inline stats */}
              <div className="flex items-center gap-8 border-t border-white/[0.06] pt-8">
                {[
                  { val: "3", label: "PA Locations" },
                  { val: "16%", label: "Butterfat Dairy" },
                  { val: "0", label: "Artificial Colors" },
                ].map((s) => (
                  <div key={s.label}>
                    <p className="text-2xl font-black text-[#A1AB74]">{s.val}</p>
                    <p className="text-xs text-white/30 font-medium">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: product showcase — 5 cols */}
            <div className="col-span-5 relative">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 relative rounded-2xl overflow-hidden">
                  <img src="/__mockup/images/mint-chip.jpg" alt="Mint Chip" className="w-full h-56 object-cover" />
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                    <span className="bg-[#A1AB74] text-white text-[10px] font-bold px-2.5 py-1 rounded-full tracking-wider uppercase">This Week</span>
                    <h3 className="text-white font-black text-lg mt-1">Mint Chip — $7</h3>
                  </div>
                </div>
                <div className="relative rounded-xl overflow-hidden">
                  <img src="/__mockup/images/strawberry.jpg" alt="Strawberry" className="w-full h-36 object-cover" />
                  <div className="absolute bottom-2 left-2">
                    <span className="bg-white/90 backdrop-blur text-[10px] font-bold px-2 py-1 rounded-full">Strawberry</span>
                  </div>
                </div>
                <div className="relative rounded-xl overflow-hidden">
                  <img src="/__mockup/images/chocolate.jpg" alt="Chocolate" className="w-full h-36 object-cover" />
                  <div className="absolute bottom-2 left-2">
                    <span className="bg-white/90 backdrop-blur text-[10px] font-bold px-2 py-1 rounded-full">Chocolate</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features — horizontal strip */}
      <section className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-8 py-6 flex items-center justify-between">
          {[
            { text: "100% Natural Ingredients" },
            { text: "Local PA 16% Butterfat" },
            { text: "Culturally Inspired Flavours" },
            { text: "Weekly Limited Batches" },
          ].map((f) => (
            <div key={f.text} className="flex items-center gap-2.5">
              <div className="w-1.5 h-1.5 bg-[#A1AB74] rounded-full" />
              <span className="text-xs font-semibold text-gray-400 tracking-wide">{f.text}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Flavors — clean card grid with images */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex justify-between items-end mb-14">
            <div>
              <span className="text-[#A1AB74] text-xs font-bold tracking-widest uppercase">This Week's Batch</span>
              <h2 className="text-4xl font-black text-gray-900 mt-2">Order for quick pickup</h2>
            </div>
            <span className="text-[#A1AB74] font-bold text-sm cursor-pointer">View all flavours &rarr;</span>
          </div>

          <div className="grid grid-cols-2 gap-5">
            {flavors.map((f) => (
              <div key={f.name} className="flex items-center gap-5 bg-gray-50 rounded-2xl p-4 hover:bg-white hover:shadow-md hover:border-[#A1AB74]/10 border border-transparent transition-all group cursor-pointer">
                <img src={f.img} alt={f.name} className="w-28 h-28 object-cover rounded-xl shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-[#A1AB74]/10 text-[#A1AB74] rounded-full">{f.tag}</span>
                  </div>
                  <h3 className="text-base font-bold text-gray-900 mb-0.5">{f.name}</h3>
                  <p className="text-xs text-gray-400 leading-relaxed mb-2 line-clamp-2">{f.desc}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-black text-gray-900">{f.price}</span>
                    <button className="text-xs text-[#A1AB74] font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                      Add to order &rarr;
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <button className="bg-gray-900 text-white px-8 py-3.5 rounded-full font-bold text-sm hover:bg-[#A1AB74] transition-colors">
              Browse All Flavours
            </button>
          </div>
        </div>
      </section>

      {/* How pre-orders work — inline steps */}
      <section className="py-20 bg-[#faf8f3]">
        <div className="max-w-7xl mx-auto px-8">
          <div className="text-center mb-14">
            <span className="text-[#A1AB74] text-xs font-bold tracking-widest uppercase">Simple Process</span>
            <h2 className="text-4xl font-black text-gray-900 mt-2">How pre-orders work</h2>
          </div>
          <div className="flex items-start gap-0">
            {steps.map((s, i) => (
              <div key={s.num} className="flex-1 relative text-center px-6">
                {i < 3 && (
                  <div className="absolute top-5 left-[calc(50%+20px)] right-[-20px] h-px bg-[#A1AB74]/20" />
                )}
                <div className="w-10 h-10 bg-[#A1AB74] text-white rounded-full flex items-center justify-center mx-auto mb-4 text-sm font-black">
                  {s.num}
                </div>
                <h3 className="text-sm font-bold text-gray-900 mb-1">{s.title}</h3>
                <p className="text-xs text-gray-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-gray-400 mt-8 max-w-md mx-auto">
            We hold your order up to 2 weeks. After 4 weeks without pickup, the order is nonrefundable.
          </p>
          <div className="text-center mt-8">
            <button className="inline-flex items-center gap-3 bg-[#A1AB74] hover:bg-[#8a9360] text-white px-8 py-4 rounded-full font-bold transition-all">
              Start Your Pre-Order
            </button>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-8">
          <div className="text-center mb-14">
            <span className="text-[#A1AB74] text-xs font-bold tracking-widest uppercase">Word on the Street</span>
            <h2 className="text-4xl font-black text-gray-900 mt-2">Our fans say it best</h2>
          </div>
          <div className="grid grid-cols-3 gap-5">
            {[
              { quote: "The Mango Habanero is unlike anything I've ever tasted. It's brilliant.", author: "Sarah K.", loc: "Harrisburg, PA" },
              { quote: "Best craft ice cream in Pennsylvania, hands down. The pre-order system is so easy.", author: "Marcus T.", loc: "Carlisle, PA" },
              { quote: "I drove 30 minutes just for the Sweet Potato Casserole pint. Worth every mile.", author: "Jennifer L.", loc: "Mechanicsburg, PA" },
            ].map((t) => (
              <div key={t.author} className="bg-[#faf8f3] rounded-2xl p-7">
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <svg key={i} className="w-3.5 h-3.5 text-[#A1AB74] fill-[#A1AB74]" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                  ))}
                </div>
                <p className="text-gray-600 leading-relaxed italic text-sm mb-5">"{t.quote}"</p>
                <p className="font-bold text-gray-900 text-sm">{t.author}</p>
                <p className="text-xs text-gray-400">{t.loc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Locations */}
      <section className="py-20 bg-[#faf8f3]">
        <div className="max-w-7xl mx-auto px-8">
          <div className="text-center mb-14">
            <span className="text-[#A1AB74] text-xs font-bold tracking-widest uppercase">Find Us</span>
            <h2 className="text-4xl font-black text-gray-900 mt-2">3 locations across Central PA</h2>
          </div>
          <div className="grid grid-cols-3 gap-5">
            {[
              { name: "Carlisle", addr: "258 Westminster Dr, Carlisle, PA 17013", hrs: "Mon-Thu: 12-9pm | Fri-Sat: 12-10pm | Sun: 12-9pm" },
              { name: "Mechanicsburg", addr: "6391 Carlisle Pike, Mechanicsburg, PA 17050", hrs: "Mon-Thu: 12-9pm | Fri-Sat: 12-10pm | Sun: 12-9pm" },
              { name: "Harrisburg", addr: "1004 N 3rd St, Harrisburg, PA 17102", hrs: "Mon-Fri: 12-9pm | Saturday: Closed" },
            ].map((l) => (
              <div key={l.name} className="bg-white rounded-2xl p-7 border border-gray-100 hover:border-[#A1AB74]/20 transition-colors">
                <h3 className="text-lg font-black text-gray-900 mb-2">{l.name}</h3>
                <p className="text-sm text-gray-500 mb-2">{l.addr}</p>
                <p className="text-xs text-gray-400 mb-4">{l.hrs}</p>
                <span className="text-[#A1AB74] font-bold text-sm cursor-pointer">Get directions &rarr;</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Events CTA */}
      <section className="py-20 bg-[#A1AB74] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-[100px]" />
        <div className="relative max-w-2xl mx-auto px-8 text-center">
          <span className="text-white/60 text-xs font-bold tracking-widest uppercase">Events & Catering</span>
          <h2 className="text-4xl font-black text-white mt-2 mb-5">Make your event unforgettable</h2>
          <p className="text-white/70 leading-relaxed mb-8 text-[15px]">
            From corporate events to weddings and birthday parties — we bring the craft creamery experience to you.
          </p>
          <button className="bg-white text-[#A1AB74] px-8 py-4 rounded-full font-bold hover:bg-gray-50 transition-all hover:shadow-xl">
            Request a Quote
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#1a1b26] text-white py-12">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex items-start justify-between mb-10">
            <div>
              <img src="/__mockup/images/uc-logo-black.png" alt="Urban Churn" className="h-8 brightness-0 invert opacity-70 mb-3" />
              <p className="text-gray-500 text-sm max-w-xs">Unique flavours, natural ingredients, nothing fake. Crafting ice cream inspired by cultures around the world.</p>
            </div>
            <div className="flex gap-16 text-sm">
              <div>
                <h4 className="font-bold text-white/60 uppercase text-xs tracking-wider mb-3">Quick Links</h4>
                <div className="space-y-2 text-gray-500">
                  <p className="hover:text-[#A1AB74] cursor-pointer">Pre-Order</p>
                  <p className="hover:text-[#A1AB74] cursor-pointer">Locations</p>
                  <p className="hover:text-[#A1AB74] cursor-pointer">About</p>
                  <p className="hover:text-[#A1AB74] cursor-pointer">Events</p>
                </div>
              </div>
              <div>
                <h4 className="font-bold text-white/60 uppercase text-xs tracking-wider mb-3">Locations</h4>
                <div className="space-y-2 text-gray-500">
                  <p>Carlisle, PA</p>
                  <p>Mechanicsburg, PA</p>
                  <p>Harrisburg, PA</p>
                </div>
              </div>
            </div>
          </div>
          <div className="border-t border-white/[0.06] pt-6 flex items-center justify-between">
            <p className="text-gray-600 text-xs">&copy; 2026 Urban Churn Craft Creamery</p>
            <div className="flex gap-5 text-xs text-gray-500">
              <span className="hover:text-[#A1AB74] cursor-pointer">Privacy</span>
              <span className="hover:text-[#A1AB74] cursor-pointer">Terms</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
