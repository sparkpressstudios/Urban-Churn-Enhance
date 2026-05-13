export function DarkArtisan() {
  return (
    <div className="min-h-screen bg-[#1a1a1f] text-white overflow-hidden" style={{ fontFamily: "'Poppins', sans-serif" }}>
      <div className="bg-[#A1AB74] text-white text-center py-2.5 text-sm font-medium tracking-wide">
        Limited Batch Pre-Orders — This Week Only
        <span className="ml-3 underline font-bold cursor-pointer hover:text-white/80">Order Now</span>
      </div>

      <nav className="flex items-center justify-between px-12 py-5 border-b border-white/5">
        <div className="flex items-center">
          <img src="/__mockup/images/uc-logo-black.png" alt="Urban Churn" className="h-10 brightness-0 invert" />
        </div>
        <div className="flex items-center gap-10 text-sm font-medium text-white/60">
          <span className="text-[#A1AB74] font-bold">Home</span>
          <span className="hover:text-white cursor-pointer transition-colors">Pre-Order</span>
          <span className="hover:text-white cursor-pointer transition-colors">Locations</span>
          <span className="hover:text-white cursor-pointer transition-colors">About</span>
          <span className="hover:text-white cursor-pointer transition-colors">Events</span>
          <span className="hover:text-white cursor-pointer transition-colors">Contact</span>
        </div>
        <button className="bg-[#A1AB74] text-white px-6 py-2.5 rounded-full text-sm font-bold hover:bg-[#8a9360] transition-colors">
          Pre-Order
        </button>
      </nav>

      <div className="relative">
        <div className="absolute top-20 right-1/4 w-[500px] h-[500px] bg-[#A1AB74]/15 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-1/4 w-[300px] h-[300px] bg-[#A1AB74]/8 rounded-full blur-[80px]" />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '48px 48px' }} />

        <div className="relative max-w-7xl mx-auto px-12 py-20 flex items-center gap-16 min-h-[calc(100vh-120px)]">
          <div className="flex-1">
            <div className="inline-flex items-center gap-2.5 bg-white/5 border border-white/10 rounded-full px-5 py-2 mb-8">
              <div className="w-2 h-2 bg-[#A1AB74] rounded-full animate-pulse" />
              <span className="text-[#A1AB74] text-xs font-semibold tracking-wider uppercase">Fresh batch every week</span>
            </div>

            <h1 className="text-7xl font-black leading-[0.9] tracking-tight mb-6">
              We Set<br />
              <span className="text-[#A1AB74]">The Bar</span><br />
              For Craft<br />
              Ice Cream.
            </h1>

            <p className="text-xl text-white/40 font-light mb-10 max-w-md leading-relaxed">
              Unique Flavours. <span className="text-white/70">Natural Ingredients.</span> Nothing Fake.
            </p>

            <div className="flex items-center gap-4 mb-12">
              <button className="group flex items-center gap-3 bg-[#A1AB74] hover:bg-[#8a9360] text-white px-8 py-4 rounded-full font-bold transition-all hover:shadow-[0_0_30px_rgba(161,171,116,0.3)]">
                Pre-Order Ice Cream
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </button>
              <button className="flex items-center gap-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white px-8 py-4 rounded-full font-medium transition-all">
                Events & Catering
              </button>
            </div>

            <div className="flex gap-10 pt-8 border-t border-white/5">
              <div>
                <p className="text-3xl font-black text-[#A1AB74]">3</p>
                <p className="text-sm text-white/40">PA Locations</p>
              </div>
              <div>
                <p className="text-3xl font-black text-[#A1AB74]">16%</p>
                <p className="text-sm text-white/40">Butterfat Dairy</p>
              </div>
              <div>
                <p className="text-3xl font-black text-[#A1AB74]">0</p>
                <p className="text-sm text-white/40">Artificial Colors</p>
              </div>
            </div>
          </div>

          <div className="flex-1 flex justify-center relative">
            <div className="relative">
              <div className="absolute inset-0 bg-[#A1AB74]/10 rounded-full blur-[60px] scale-110" />
              <div className="relative bg-white/5 backdrop-blur border border-white/10 rounded-[32px] p-8 max-w-sm">
                <div className="absolute -top-3 -right-3 bg-[#A1AB74] text-white text-xs font-bold px-3 py-1 rounded-full">Limited</div>
                <img src="/__mockup/images/mint-chip.jpg" alt="Mint Chip" className="w-full aspect-square object-cover rounded-2xl mb-6" />
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xs text-[#A1AB74] font-bold tracking-wider uppercase mb-1">This Week</p>
                    <h3 className="text-2xl font-black">Mint Chip</h3>
                    <p className="text-white/40 text-sm">Pint — Fresh churned</p>
                  </div>
                  <p className="text-3xl font-black text-[#A1AB74]">$7</p>
                </div>
              </div>

              <div className="absolute -left-16 top-1/3 bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-3 w-20">
                <img src="/__mockup/images/strawberry.jpg" alt="Strawberry" className="w-full aspect-square object-cover rounded-lg" />
              </div>
              <div className="absolute -right-12 bottom-1/4 bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-3 w-20">
                <img src="/__mockup/images/vanilla.jpg" alt="Vanilla" className="w-full aspect-square object-cover rounded-lg" />
              </div>
              <div className="absolute -left-10 bottom-8 bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-3 w-20">
                <img src="/__mockup/images/chocolate.jpg" alt="Chocolate" className="w-full aspect-square object-cover rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
