import { Link } from "wouter";

const BASE = import.meta.env.BASE_URL;

export default function Footer() {
  return (
    <footer className="text-white py-14 relative overflow-hidden">
      <img src={`${BASE}images/uc-footer-bg.jpeg`} alt="" role="presentation" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-[#0d0d12]/80" />
      <div className="relative max-w-7xl mx-auto px-6 sm:px-8">

        {/* Top section: logo/tagline + nav columns */}
        <div className="flex flex-col md:flex-row items-start justify-between mb-10 gap-10">
          <div className="max-w-xs">
            <img src={`${BASE}images/uc-logo-black.png`} alt="Urban Churn" className="h-8 brightness-0 invert mb-4" />
            <p className="text-white text-sm leading-relaxed mb-5">Unique flavours, natural ingredients, nothing fake. Crafting ice cream inspired by cultures around the world.</p>
            <div className="flex gap-3">
              <a href="https://instagram.com/urbanchurn" target="_blank" rel="noopener noreferrer" className="text-white hover:text-white/80 text-xs font-medium transition-colors">Instagram</a>
              <span className="text-white/60">·</span>
              <a href="https://facebook.com/urbanchurn" target="_blank" rel="noopener noreferrer" className="text-white hover:text-white/80 text-xs font-medium transition-colors">Facebook</a>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 sm:gap-10 text-sm w-full md:w-auto">
            <div>
              <h4 className="font-black text-white uppercase text-xs tracking-wider mb-4">Explore</h4>
              <div className="space-y-2.5 text-white">
                <p><Link href="/" className="hover:text-white transition-colors">Home</Link></p>
                <p><Link href="/locations" className="hover:text-white transition-colors">Locations & Menu</Link></p>
                <p><Link href="/about" className="hover:text-white transition-colors">About</Link></p>
              </div>
            </div>
            <div>
              <h4 className="font-black text-white uppercase text-xs tracking-wider mb-4">Order</h4>
              <div className="space-y-2.5 text-white">
                <p><Link href="/pre-order" className="hover:text-white transition-colors">Pre-Order</Link></p>
                <p><Link href="/catering" className="hover:text-white transition-colors">Catering</Link></p>
                <p><Link href="/wholesale" className="hover:text-white transition-colors">Wholesale</Link></p>
                <p><Link href="/gift-cards" className="hover:text-white transition-colors">Gift Cards</Link></p>
                <p><a href="https://pintsforpurpose.urbanchurn.com" className="hover:text-white transition-colors">Fundraising</a></p>
              </div>
            </div>
            <div>
              <h4 className="font-black text-white uppercase text-xs tracking-wider mb-4">Company</h4>
              <div className="space-y-2.5 text-white">
                <p><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></p>
                <p><Link href="/careers" className="hover:text-white transition-colors">Careers</Link></p>
                <p><Link href="/terms" className="hover:text-white transition-colors">Terms & Conditions</Link></p>
                <p><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></p>
              </div>
            </div>
            <div>
              <h4 className="font-black text-white uppercase text-xs tracking-wider mb-4">Locations</h4>
              <div className="space-y-2.5 text-white">
                <p>Carlisle, PA</p>
                <p>Mechanicsburg, PA</p>
                <p>Harrisburg, PA</p>
                <p>Louise Drive</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom: copyright + contact */}
        <div className="border-t border-white/[0.04] pt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-white text-xs text-center sm:text-left">&copy; {new Date().getFullYear()} Urban Churn Craft Creamery · Central PA · All rights reserved.</p>
          <div className="flex gap-5 text-xs text-white justify-center sm:justify-end">
            <a href="tel:17178849396" className="hover:text-white/80 transition-colors">+1 (717) 884-9396</a>
            <span>·</span>
            <a href="mailto:contact@urbanchurn.com" className="hover:text-white/80 transition-colors">contact@urbanchurn.com</a>
          </div>
        </div>

        {/* SparkPress credit */}
        <div className="border-t border-white/[0.04] mt-5 pt-5 flex items-center justify-center sm:justify-start">
          <a
            href="https://sparkpressstudios.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col sm:flex-row items-center sm:items-center justify-center gap-2 sm:gap-3 opacity-50 hover:opacity-80 transition-opacity"
          >
            <span className="text-white text-xs">Website built by</span>
            <img src={`${BASE}images/sparkpress-studios-logo.png`} alt="SparkPress Studios" className="h-12 sm:h-9 brightness-0 invert" />
            <span className="text-white text-xs">Custom Web and App Development</span>
          </a>
        </div>

      </div>
    </footer>
  );
}
