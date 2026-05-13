export function RefinedA() {
  const flavors = [
    { name: "Mint Chip", desc: "Cool peppermint swirled with rich dark chocolate chips", price: "$7", tag: "Classic", tagClass: "bg-emerald-50 text-emerald-700", img: "/__mockup/images/mint-chip.jpg" },
    { name: "Truly Strawberry", desc: "Fresh PA strawberries blended into our rich 16% butterfat base", price: "$7", tag: "Fan Favorite", tagClass: "bg-pink-50 text-pink-700", img: "/__mockup/images/strawberry.jpg" },
    { name: "Classic Vanilla", desc: "Pure Madagascar vanilla bean in our signature cream base", price: "$7", tag: "Bestseller", tagClass: "bg-amber-50 text-amber-700", img: "/__mockup/images/vanilla.jpg" },
    { name: "Chocolate", desc: "Rich Dutch-process cocoa in our premium butterfat base", price: "$7", tag: "Rich & Bold", tagClass: "bg-stone-100 text-stone-700", img: "/__mockup/images/chocolate.jpg" },
    { name: "Mango Habanero", desc: "Tropical mango with a spicy habanero finish — dare you try it?", price: "$8", tag: "Limited", tagClass: "bg-orange-50 text-orange-700", img: "/__mockup/images/mango-habanero.jpg" },
    { name: "Sweet Potato Casserole", desc: "Southern-inspired with brown butter, pecan, and marshmallow swirls", price: "$8", tag: "Seasonal", tagClass: "bg-yellow-50 text-yellow-700", img: "/__mockup/images/sweet-potato.jpg" },
  ];

  const steps = [
    { num: "01", title: "Choose Flavours", desc: "Browse this week's limited batch drops and pick your favourites." },
    { num: "02", title: "Select Size", desc: "Pint, quart, or party sizes — mix and match as you like." },
    { num: "03", title: "Pick Location", desc: "Choose Carlisle, Mechanicsburg, or Harrisburg for pickup." },
    { num: "04", title: "Pick Up", desc: "We hold orders up to 2 weeks. Add the date to your calendar!" },
  ];

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Poppins', sans-serif" }}>
      {/* Announcement bar */}
      <div className="bg-[#A1AB74] text-white text-center py-2.5 text-sm font-medium tracking-wide">
        Limited Batch Pre-Orders — This Week Only
        <span className="ml-3 underline font-bold cursor-pointer">Order Now</span>
      </div>

      {/* Navbar */}
      <nav className="bg-white/95 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-8 py-3.5">
          <img src="/__mockup/images/uc-logo-black.png" alt="Urban Churn" className="h-9" />
          <div className="flex items-center gap-8 text-sm font-medium text-gray-500">
            <span className="text-[#A1AB74] font-semibold">Home</span>
            <span className="hover:text-gray-900 cursor-pointer transition-colors">Pre-Order</span>
            <span className="hover:text-gray-900 cursor-pointer transition-colors">Locations</span>
            <span className="hover:text-gray-900 cursor-pointer transition-colors">About</span>
            <span className="hover:text-gray-900 cursor-pointer transition-colors">Events</span>
          </div>
          <button className="bg-[#A1AB74] text-white px-5 py-2.5 rounded-full text-sm font-bold hover:bg-[#8a9360] transition-colors">
            Pre-Order
          </button>
        </div>
      </nav>

      {/* Hero — split layout with product */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-[#2A2B39] to-gray-900" />
        <div className="absolute top-1/4 right-1/3 w-[500px] h-[500px] bg-[#A1AB74]/12 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-1/4 w-[300px] h-[300px] bg-[#A1AB74]/6 rounded-full blur-[80px]" />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '48px 48px' }} />

        <div className="relative max-w-7xl mx-auto px-8 py-24 flex items-center gap-20">
          <div className="flex-1">
            <div className="inline-flex items-center gap-2.5 bg-white/5 border border-white/10 rounded-full px-5 py-2 mb-8">
              <div className="w-2 h-2 bg-[#A1AB74] rounded-full animate-pulse" />
              <span className="text-[#A1AB74] text-xs font-semibold tracking-wider uppercase">Now taking pre-orders</span>
            </div>
            <h1 className="text-[5.5rem] font-black text-white leading-[0.88] tracking-tight mb-6">
              We Set<br /><span className="text-[#A1AB74]">The Bar</span><br />For Craft<br />Ice Cream.
            </h1>
            <p className="text-xl text-white/40 font-light mb-10 max-w-md leading-relaxed">
              Unique Flavours. <span className="text-white/70 font-normal">Natural Ingredients.</span> Nothing Fake.
            </p>
            <div className="flex items-center gap-4">
              <button className="group flex items-center gap-3 bg-[#A1AB74] hover:bg-[#8a9360] text-white px-8 py-4 rounded-full font-bold transition-all hover:shadow-[0_0_30px_rgba(161,171,116,0.3)]">
                Pre-Order Ice Cream
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
              </button>
              <button className="flex items-center gap-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white px-8 py-4 rounded-full font-medium transition-all">
                Events & Catering
              </button>
            </div>
          </div>
          <div className="flex-1 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-[#A1AB74]/10 rounded-full blur-[60px] scale-125" />
              <div className="relative bg-white/5 backdrop-blur border border-white/10 rounded-[28px] p-7 max-w-[340px]">
                <div className="absolute -top-3 -right-3 bg-[#A1AB74] text-white text-[10px] font-bold px-3 py-1 rounded-full tracking-wide uppercase">This Week</div>
                <img src="/__mockup/images/mint-chip.jpg" alt="Mint Chip" className="w-full aspect-square object-cover rounded-2xl mb-5" />
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xs text-[#A1AB74] font-bold tracking-wider uppercase mb-0.5">Featured</p>
                    <h3 className="text-xl font-black text-white">Mint Chip</h3>
                    <p className="text-white/40 text-sm">Pint — Fresh churned</p>
                  </div>
                  <p className="text-2xl font-black text-[#A1AB74]">$7</p>
                </div>
              </div>
              <div className="absolute -left-14 top-1/4 bg-white/5 backdrop-blur border border-white/10 rounded-xl p-2.5 w-[72px]">
                <img src="/__mockup/images/strawberry.jpg" alt="Strawberry" className="w-full aspect-square object-cover rounded-lg" />
              </div>
              <div className="absolute -right-10 bottom-1/3 bg-white/5 backdrop-blur border border-white/10 rounded-xl p-2.5 w-[72px]">
                <img src="/__mockup/images/vanilla.jpg" alt="Vanilla" className="w-full aspect-square object-cover rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-[#faf8f3]">
        <div className="max-w-7xl mx-auto px-8">
          <div className="text-center mb-14">
            <span className="text-[#A1AB74] text-xs font-bold tracking-widest uppercase">Our Promise</span>
            <h2 className="text-4xl font-black text-gray-900 mt-2">Crafted with intention</h2>
          </div>
          <div className="grid grid-cols-3 gap-6">
            {[
              { title: "Unique Flavours", desc: "Seasonally rotating flavours like Sauerkraut, Summer Corn, Sweet Potato Casserole, and many more that push boundaries." },
              { title: "Culturally Inspired", desc: "Ice cream and desserts inspired by cultures worldwide — affogatos, tiramisu sundaes, dulce de leche and more." },
              { title: "Natural Ingredients", desc: "NO artificial flavouring or food colouring. Local PA 16% butterfat dairy and natural ingredients. Nothing fake, ever." },
            ].map((f) => (
              <div key={f.title} className="bg-white rounded-2xl p-7 border border-gray-100 hover:border-[#A1AB74]/20 hover:shadow-md transition-all group">
                <div className="w-11 h-11 bg-[#A1AB74]/10 rounded-xl flex items-center justify-center mb-5 text-[#A1AB74] group-hover:bg-[#A1AB74] group-hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Flavors with real images */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex justify-between items-end mb-14">
            <div>
              <span className="text-[#A1AB74] text-xs font-bold tracking-widest uppercase">This Week's Batch</span>
              <h2 className="text-4xl font-black text-gray-900 mt-2">Order for quick pickup</h2>
            </div>
            <span className="text-[#A1AB74] font-bold text-sm cursor-pointer hover:underline">View all flavours &rarr;</span>
          </div>
          <div className="grid grid-cols-3 gap-5">
            {flavors.map((f) => (
              <div key={f.name} className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all hover:-translate-y-1 group cursor-pointer">
                <div className="relative h-44 overflow-hidden">
                  <img src={f.img} alt={f.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-3 left-3">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${f.tagClass}`}>{f.tag}</span>
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{f.name}</h3>
                  <p className="text-gray-500 text-xs leading-relaxed mb-4">{f.desc}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-black text-gray-900">{f.price}</span>
                    <button className="flex items-center gap-1.5 bg-gray-900 text-white px-4 py-2 rounded-full text-xs font-bold hover:bg-[#A1AB74] transition-colors">
                      Order Now
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How pre-orders work */}
      <section className="py-20 bg-gray-900 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#A1AB74]/8 rounded-full blur-[100px]" />
        <div className="relative max-w-7xl mx-auto px-8">
          <div className="text-center mb-14">
            <span className="text-[#A1AB74] text-xs font-bold tracking-widest uppercase">Simple Process</span>
            <h2 className="text-4xl font-black text-white mt-2">How pre-orders work</h2>
            <p className="text-white/40 mt-3 max-w-md mx-auto text-sm">We hold your order up to 2 weeks. After 4 weeks without pickup, the order is nonrefundable.</p>
          </div>
          <div className="grid grid-cols-4 gap-5">
            {steps.map((s, i) => (
              <div key={s.num} className="relative">
                {i < 3 && <div className="hidden lg:block absolute top-7 left-full w-full h-px bg-gradient-to-r from-[#A1AB74]/40 to-transparent z-10" />}
                <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 hover:bg-white/[0.08] transition-colors">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 bg-[#A1AB74]/15 rounded-full flex items-center justify-center">
                      <span className="text-[#A1AB74] text-xs font-black">{s.num}</span>
                    </div>
                  </div>
                  <h3 className="text-base font-bold text-white mb-1.5">{s.title}</h3>
                  <p className="text-white/40 text-sm leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <button className="inline-flex items-center gap-3 bg-[#A1AB74] hover:bg-[#8a9360] text-white px-8 py-4 rounded-full font-bold transition-all">
              Start Your Pre-Order
            </button>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-[#faf8f3]">
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
              <div key={t.author} className="bg-white rounded-2xl p-7 border border-gray-100">
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <svg key={i} className="w-4 h-4 text-[#A1AB74] fill-[#A1AB74]" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                  ))}
                </div>
                <p className="text-gray-700 leading-relaxed italic mb-5 text-sm">"{t.quote}"</p>
                <div>
                  <p className="font-bold text-gray-900 text-sm">{t.author}</p>
                  <p className="text-xs text-gray-400">{t.loc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Locations */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-8">
          <div className="text-center mb-14">
            <span className="text-[#A1AB74] text-xs font-bold tracking-widest uppercase">Find Us</span>
            <h2 className="text-4xl font-black text-gray-900 mt-2">3 locations across Central PA</h2>
          </div>
          <div className="grid grid-cols-3 gap-5">
            {[
              { name: "Carlisle", addr: "258 Westminster Dr\nCarlisle, PA 17013", hrs: "Mon-Thu: 12-9pm\nFri-Sat: 12-10pm\nSun: 12-9pm" },
              { name: "Mechanicsburg", addr: "6391 Carlisle Pike\nMechanicsburg, PA 17050", hrs: "Mon-Thu: 12-9pm\nFri-Sat: 12-10pm\nSun: 12-9pm" },
              { name: "Harrisburg", addr: "1004 N 3rd St\nHarrisburg, PA 17102", hrs: "Mon-Fri: 12-9pm\nSaturday: Closed" },
            ].map((l) => (
              <div key={l.name} className="bg-gray-50 rounded-2xl p-7 border border-gray-100 hover:border-[#A1AB74]/20 transition-colors group">
                <div className="w-10 h-10 bg-[#A1AB74]/10 rounded-xl flex items-center justify-center mb-4 text-[#A1AB74] group-hover:bg-[#A1AB74] group-hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </div>
                <h3 className="text-lg font-black text-gray-900 mb-2">{l.name} Shop</h3>
                <p className="text-gray-500 text-sm whitespace-pre-line mb-3">{l.addr}</p>
                <p className="text-gray-400 text-xs whitespace-pre-line mb-4">{l.hrs}</p>
                <span className="text-[#A1AB74] font-bold text-sm cursor-pointer hover:underline">Get directions &rarr;</span>
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
          <p className="text-white/75 leading-relaxed mb-8">
            From corporate events to weddings and birthday parties — we bring the craft creamery experience to you.
          </p>
          <button className="inline-flex items-center gap-3 bg-white text-[#A1AB74] px-8 py-4 rounded-full font-bold hover:bg-gray-50 transition-all hover:shadow-xl">
            Request a Quote
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex items-center justify-between border-b border-white/10 pb-8 mb-8">
            <img src="/__mockup/images/uc-logo-black.png" alt="Urban Churn" className="h-8 brightness-0 invert opacity-80" />
            <p className="text-gray-500 text-sm">Unique flavours, natural ingredients, nothing fake.</p>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-gray-600 text-xs">&copy; 2026 Urban Churn Craft Creamery. All rights reserved.</p>
            <div className="flex gap-6 text-xs text-gray-500">
              <span className="hover:text-[#A1AB74] cursor-pointer">Privacy</span>
              <span className="hover:text-[#A1AB74] cursor-pointer">Terms</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
