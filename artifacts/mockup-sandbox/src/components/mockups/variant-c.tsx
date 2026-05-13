export function BoldPlayful() {
  return (
    <div className="min-h-screen bg-white text-[#1a1a1f] overflow-hidden" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
      <div className="bg-[#1a1a1f] text-white text-center py-3 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#A1AB74]/20 via-transparent to-[#A1AB74]/20" />
        <span className="relative text-sm font-bold tracking-wider">
          &#127846; NEW DROP: Mango Habanero & Sweet Potato Casserole — <span className="text-[#A1AB74] underline underline-offset-4 cursor-pointer">PRE-ORDER NOW</span>
        </span>
      </div>

      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-8 py-3">
          <img src="/__mockup/images/uc-logo-black.png" alt="Urban Churn" className="h-8" />
          <div className="flex items-center gap-7 text-sm font-medium">
            <span className="text-[#A1AB74] font-bold">Home</span>
            <span className="text-gray-400 hover:text-gray-900 cursor-pointer transition-colors">Flavours</span>
            <span className="text-gray-400 hover:text-gray-900 cursor-pointer transition-colors">Locations</span>
            <span className="text-gray-400 hover:text-gray-900 cursor-pointer transition-colors">About</span>
            <span className="text-gray-400 hover:text-gray-900 cursor-pointer transition-colors">Catering</span>
          </div>
          <button className="bg-[#1a1a1f] text-white px-5 py-2 rounded-full text-sm font-bold hover:bg-[#A1AB74] transition-colors">
            &#128722; Order
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-8 pt-12 pb-4">
        <div className="relative">
          <div className="flex items-start gap-8">
            <div className="flex-[1.3] pt-4">
              <h1 className="text-[7rem] font-black leading-[0.85] tracking-tighter text-[#1a1a1f]">
                WE<br />
                <span className="text-[#A1AB74]">SET</span><br />
                THE<br />
                BAR.
              </h1>
              <div className="mt-6 ml-1">
                <p className="text-lg text-gray-400 font-medium">
                  Craft ice cream. <span className="text-[#1a1a1f] font-bold">Unique flavours.</span>{" "}
                  <span className="text-[#A1AB74] font-bold">Nothing fake.</span>
                </p>
              </div>
            </div>

            <div className="flex-1 relative">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 relative rounded-3xl overflow-hidden shadow-lg">
                  <img src="/__mockup/images/mint-chip.jpg" alt="Mint Chip" className="w-full h-48 object-cover" />
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-5">
                    <span className="bg-[#A1AB74] text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">This Week</span>
                    <h3 className="text-white font-black text-xl mt-1">Mint Chip Pint</h3>
                  </div>
                </div>

                <div className="relative rounded-2xl overflow-hidden shadow-md">
                  <img src="/__mockup/images/strawberry.jpg" alt="Strawberry" className="w-full h-32 object-cover" />
                  <div className="absolute bottom-2 left-2">
                    <span className="bg-white/90 backdrop-blur text-[10px] font-black px-2 py-1 rounded-full text-[#1a1a1f]">&#127827; Strawberry</span>
                  </div>
                </div>
                <div className="relative rounded-2xl overflow-hidden shadow-md">
                  <img src="/__mockup/images/chocolate.jpg" alt="Chocolate" className="w-full h-32 object-cover" />
                  <div className="absolute bottom-2 left-2">
                    <span className="bg-white/90 backdrop-blur text-[10px] font-black px-2 py-1 rounded-full text-[#1a1a1f]">&#127851; Chocolate</span>
                  </div>
                </div>
              </div>

              <div className="absolute -left-6 top-8 bg-[#A1AB74] text-white rounded-2xl p-4 shadow-lg -rotate-6">
                <p className="text-3xl font-black">$7</p>
                <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">per pint</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-8">
            <button className="group flex items-center gap-3 bg-[#A1AB74] text-white px-8 py-4 rounded-full font-black text-base hover:bg-[#8a9360] transition-all hover:shadow-[0_0_40px_rgba(161,171,116,0.3)] hover:-translate-y-0.5">
              &#127846; PRE-ORDER ICE CREAM
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>
            <button className="flex items-center gap-2 border-2 border-[#1a1a1f] text-[#1a1a1f] px-8 py-4 rounded-full font-black text-base hover:bg-[#1a1a1f] hover:text-white transition-all">
              &#128197; EVENTS & CATERING
            </button>
            <div className="ml-auto flex items-center gap-4">
              {["Carlisle", "Mechanicsburg", "Harrisburg"].map((loc) => (
                <span key={loc} className="text-xs font-bold text-gray-400 uppercase tracking-wider">&#x1F4CD;{loc}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#1a1a1f] mt-4 py-4 overflow-hidden">
        <div className="flex items-center gap-12 whitespace-nowrap">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-12 text-white/40 text-sm font-bold tracking-widest uppercase">
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
    </div>
  );
}
