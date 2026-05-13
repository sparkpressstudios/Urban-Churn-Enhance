export function CreamOlive() {
  const flavors = [
    { name: "Mint Chip", price: "$7", tag: "Classic", img: "/__mockup/images/mint-chip.jpg" },
    { name: "Truly Strawberry", price: "$7", tag: "Fan Favorite", img: "/__mockup/images/strawberry.jpg" },
    { name: "Classic Vanilla", price: "$7", tag: "Bestseller", img: "/__mockup/images/vanilla.jpg" },
    { name: "Chocolate", price: "$7", tag: "Rich & Bold", img: "/__mockup/images/chocolate.jpg" },
  ];

  return (
    <div className="min-h-screen bg-[#faf8f3] text-[#2A2B39] overflow-hidden" style={{ fontFamily: "'Poppins', sans-serif" }}>
      <div className="bg-[#2A2B39] text-white text-center py-2.5 text-xs tracking-wider uppercase font-medium">
        <span className="text-[#A1AB74]">&#10038;</span> Pre-Order This Week's Limited Batch <span className="text-[#A1AB74]">&#10038;</span>
      </div>

      <nav className="bg-white border-b border-[#e8e4da]">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-8 py-4">
          <img src="/__mockup/images/uc-logo-black.png" alt="Urban Churn" className="h-9" />
          <div className="flex items-center gap-8 text-sm font-medium text-[#2A2B39]/60">
            <span className="text-[#A1AB74] font-bold border-b-2 border-[#A1AB74] pb-0.5">Home</span>
            <span className="hover:text-[#2A2B39] cursor-pointer transition-colors">Pre-Order</span>
            <span className="hover:text-[#2A2B39] cursor-pointer transition-colors">Locations</span>
            <span className="hover:text-[#2A2B39] cursor-pointer transition-colors">About</span>
            <span className="hover:text-[#2A2B39] cursor-pointer transition-colors">Events</span>
          </div>
          <button className="bg-[#A1AB74] text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-[#8a9360] transition-colors shadow-sm">
            Pre-Order Now
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-8 py-16">
        <div className="grid grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-[#A1AB74]/10 rounded-full px-4 py-1.5 mb-6">
              <div className="w-1.5 h-1.5 bg-[#A1AB74] rounded-full" />
              <span className="text-[#A1AB74] text-xs font-bold tracking-wider uppercase">Craft Creamery — Central PA</span>
            </div>

            <h1 className="text-6xl font-black leading-[1.05] tracking-tight mb-6 text-[#2A2B39]" style={{ fontFamily: "'Playfair Display', serif" }}>
              Unique Flavours.<br />
              <span className="text-[#A1AB74]">Natural</span> Ingredients.<br />
              Nothing Fake.
            </h1>

            <p className="text-lg text-[#2A2B39]/50 leading-relaxed mb-8 max-w-md">
              We churn ice cream inspired by cultures from around the world using local PA 16% butterfat dairy and natural ingredients — no artificial colours or flavourings.
            </p>

            <div className="flex items-center gap-4 mb-10">
              <button className="flex items-center gap-2 bg-[#2A2B39] text-white px-7 py-3.5 rounded-lg font-bold text-sm hover:bg-[#3a3b49] transition-colors shadow-md">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                Pre-Order Ice Cream
              </button>
              <button className="flex items-center gap-2 text-[#2A2B39]/70 border border-[#2A2B39]/20 px-7 py-3.5 rounded-lg font-medium text-sm hover:border-[#A1AB74] hover:text-[#A1AB74] transition-colors">
                Request Catering
              </button>
            </div>

            <div className="flex gap-3">
              {["Carlisle", "Mechanicsburg", "Harrisburg"].map((loc) => (
                <span key={loc} className="px-3 py-1 bg-white border border-[#e8e4da] rounded-full text-xs font-medium text-[#2A2B39]/60">
                  &#x1F4CD; {loc}
                </span>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="bg-white rounded-3xl border border-[#e8e4da] p-6 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-bold text-[#2A2B39]/60 uppercase tracking-wider">This Week's Batch</h3>
                <span className="text-xs text-[#A1AB74] font-bold cursor-pointer hover:underline">View All &rarr;</span>
              </div>

              <div className="space-y-4">
                {flavors.map((f) => (
                  <div key={f.name} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-[#faf8f3] transition-colors group cursor-pointer border border-transparent hover:border-[#e8e4da]">
                    <img src={f.img} alt={f.name} className="w-20 h-20 object-cover rounded-xl" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-[#A1AB74]/10 text-[#A1AB74] rounded-full">{f.tag}</span>
                      </div>
                      <p className="font-bold text-[#2A2B39]">{f.name}</p>
                      <p className="text-xs text-[#2A2B39]/40">Pint — Fresh churned weekly</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-black text-[#2A2B39]">{f.price}</p>
                      <button className="text-xs text-[#A1AB74] font-bold opacity-0 group-hover:opacity-100 transition-opacity">Add to cart</button>
                    </div>
                  </div>
                ))}
              </div>

              <button className="w-full mt-4 bg-[#A1AB74] text-white py-3 rounded-xl font-bold text-sm hover:bg-[#8a9360] transition-colors">
                Browse All Flavours
              </button>
            </div>

            <div className="absolute -top-4 -right-4 w-24 h-24 bg-[#A1AB74]/10 rounded-full blur-xl" />
            <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-[#A1AB74]/5 rounded-full blur-lg" />
          </div>
        </div>
      </div>

      <div className="border-t border-[#e8e4da] bg-white">
        <div className="max-w-7xl mx-auto px-8 py-6 flex items-center justify-between">
          {[
            { icon: "\ud83c\udf3f", text: "100% Natural Ingredients" },
            { icon: "\ud83d\udc04", text: "Local PA 16% Butterfat" },
            { icon: "\ud83c\udf0d", text: "Culturally Inspired Flavours" },
            { icon: "\ud83d\udce6", text: "Weekly Limited Batches" },
          ].map((item) => (
            <div key={item.text} className="flex items-center gap-2.5">
              <span className="text-lg">{item.icon}</span>
              <span className="text-xs font-medium text-[#2A2B39]/50">{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
