import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

const BASE = import.meta.env.BASE_URL;
const CART_STORAGE_KEY = "uc-cart";

function getCartCount(): number {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return 0;
    const { items } = JSON.parse(raw);
    return Array.isArray(items) ? items.reduce((s: number, i: any) => s + (i.quantity ?? 1), 0) : 0;
  } catch {
    return 0;
  }
}

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [location, navigate] = useLocation();
  const menuRef = useRef<HTMLDivElement>(null);

  // Pages without a dark hero need the navbar to start in its dark/scrolled state
  const needsDarkNav = /^\/pre-order\/.+/.test(location) || location === "/404" || location === "/gift-cards";
  const isHome = location === "/";
  // On non-home pages, start with white (light) text over dark hero; on scroll, switch to dark text
  const useLight = !scrolled && !needsDarkNav;
  const [cartCount, setCartCount] = useState(getCartCount);

  const { data: announcement } = useQuery({
    queryKey: ["public", "announcement"],
    queryFn: () => api.getPublicAnnouncement(),
    staleTime: 60_000,
  });

  const openCart = useCallback(() => {
    if (location !== "/pre-order") {
      sessionStorage.setItem("uc-open-cart", "1");
      navigate("/pre-order");
    } else {
      window.dispatchEvent(new CustomEvent("uc-open-cart"));
    }
  }, [location, navigate]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  useEffect(() => {
    const sync = () => setCartCount(getCartCount());
    window.addEventListener("uc-cart-update", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("uc-cart-update", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close menu on route change
  useEffect(() => {
    setIsOpen(false);
  }, [location]);

  const navLinks = [
    { label: "Home", href: "/" },
    { label: "Locations", href: "/locations" },
    { label: "About", href: "/about" },
    { label: "Events", href: "/events" },
    { label: "Catering", href: "/catering" },
    { label: "Bakery", href: "/bakery" },
    { label: "Wholesale", href: "/wholesale" },
    { label: "Contact", href: "/contact" },
  ];

  return (
    <>
      {/* SVG gooey filter — desktop only */}
      <svg className="hidden lg:block" style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }} aria-hidden="true">
        <defs>
          <filter id="gooey-drip" x="-30%" y="-10%" width="160%" height="600%" colorInterpolationFilters="sRGB">
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
            <feColorMatrix in="blur" mode="matrix"
              values="1 0 0 0 0
                      0 1 0 0 0
                      0 0 1 0 0
                      0 0 0 22 -11"
              result="goo" />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>

      {/* ─── Announcement bar (desktop + mobile, hides on scroll) ─── */}
      {announcement?.enabled && announcement.text && (
        <div className={`fixed top-0 left-0 right-0 z-[51] transition-all duration-300 ${scrolled || needsDarkNav ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100'}`}>
          <div className="bg-black/30 text-white text-center py-2.5 relative overflow-hidden border-b border-white/[0.05]">
            <div className="absolute inset-0 bg-gradient-to-r from-white/[0.03] via-transparent to-white/[0.03]" />
            <span className="relative text-sm font-bold tracking-wider">
              &#127846;{" "}
              {announcement.link ? (
                <>
                  {announcement.linkText ? (
                    <>{announcement.text}{" "}
                      <Link href={announcement.link} className="text-white underline underline-offset-4 font-black hover:text-white/80 transition-colors">
                        {announcement.linkText}
                      </Link>
                    </>
                  ) : (
                    <Link href={announcement.link} className="text-white underline underline-offset-4 font-black hover:text-white/80 transition-colors">
                      {announcement.text}
                    </Link>
                  )}
                </>
              ) : (
                announcement.text
              )}
            </span>
          </div>
        </div>
      )}

      {/* ─── Top navigation bar ─── */}
      <nav className={`fixed left-0 right-0 z-50 border-b transition-all duration-300 ${needsDarkNav ? 'top-0 backdrop-blur-xl bg-white/95 border-black/[0.08] shadow-lg shadow-black/5' : scrolled ? 'top-0 backdrop-blur-xl bg-white/90 border-black/[0.08] shadow-lg shadow-black/5' : announcement?.enabled && announcement.text ? 'top-[41px] bg-transparent border-transparent' : 'top-0 bg-transparent border-transparent'}`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/">
            <img src={`${BASE}images/uc-logo-black.png`} alt="Urban Churn" className={`h-11 transition-all duration-300 ${useLight ? 'brightness-0 invert' : ''}`} />
          </Link>

          {/* Desktop nav links */}
          <div className="hidden lg:flex items-center gap-5 xl:gap-7 text-[15px] font-semibold">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className={
                  location === link.href
                    ? `${useLight ? 'text-white' : 'text-black'} font-bold border-b ${useLight ? 'border-white/50' : 'border-black/50'} pb-0.5 transition-colors duration-300`
                    : `${useLight ? 'text-white/70 hover:text-white' : 'text-black/60 hover:text-black'} cursor-pointer transition-colors duration-300`
                }
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop right actions */}
          <div className="hidden lg:flex items-center gap-3">
            <div className="drip-btn-wrapper relative" style={{ overflow: 'visible', filter: 'url(#gooey-drip)' }}>
              <Link href="/pre-order" className="flex items-center bg-[#A1AB74] text-white px-5 py-2.5 rounded-full text-sm font-black hover:bg-[#8a9360] transition-colors">
                Pre-Order Ice Cream
              </Link>
              <span className="drip-drop" aria-hidden="true" style={{ left: '22%', animationDelay: '0s' }} />
              <span className="drip-drop" aria-hidden="true" style={{ left: '50%', animationDelay: '0.75s' }} />
              <span className="drip-drop" aria-hidden="true" style={{ left: '74%', animationDelay: '1.5s' }} />
            </div>
            <Link href="/account" className={`relative flex items-center justify-center w-10 h-10 rounded-full transition-colors duration-300 ${useLight ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-black/5 hover:bg-black/10 text-black'}`} aria-label="My Account">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </Link>
            <button onClick={openCart} className={`relative flex items-center justify-center w-10 h-10 rounded-full transition-colors duration-300 ${useLight ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-black/5 hover:bg-black/10 text-black'}`} aria-label="Open cart">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" strokeLinecap="round" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 10a4 4 0 01-8 0" />
              </svg>
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#A1AB74] text-white text-[10px] font-black flex items-center justify-center leading-none">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            className={`lg:hidden p-2 transition-colors duration-300 ${useLight ? 'text-white' : 'text-black'}`}
            onClick={() => setIsOpen(!isOpen)}
            aria-label={isOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isOpen}
          >
            {isOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            )}
          </button>
        </div>
      </nav>

      {/* ─── Full-screen Mobile Menu Overlay ─── */}
      <div
        className={`lg:hidden fixed inset-0 z-[60] transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />

        {/* Slide-in panel */}
        <div
          ref={menuRef}
          className={`absolute top-0 right-0 h-full w-full max-w-[340px] bg-[#1c1c1a] shadow-2xl shadow-black/50 transition-transform duration-300 ease-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        >
          {/* Menu header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08]">
            <span className="text-white/40 text-xs font-bold uppercase tracking-[0.2em]">Menu</span>
            <button
              onClick={() => setIsOpen(false)}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-white"
              aria-label="Close menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          {/* Navigation links */}
          <div className="flex-1 overflow-y-auto py-2">
            {navLinks.map((link, i) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center justify-between px-6 py-4 border-b border-white/[0.04] transition-colors ${location === link.href
                  ? "text-white font-bold bg-white/[0.04]"
                  : "text-white/70 hover:text-white hover:bg-white/[0.04]"
                  }`}
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <span className="text-[15px]">{link.label}</span>
                {location === link.href && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#A1AB74]" />
                )}
              </Link>
            ))}
          </div>

          {/* Menu footer: Cart, Account, CTA */}
          <div className="p-5 border-t border-white/[0.08] space-y-3">
            <div className="flex gap-3">
              <button
                onClick={() => { setIsOpen(false); openCart(); }}
                className="flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl text-sm font-bold transition-colors relative"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
                </svg>
                Cart
                {cartCount > 0 && (
                  <span className="absolute top-1.5 right-3 min-w-[18px] h-[18px] px-1 rounded-full bg-[#A1AB74] text-white text-[10px] font-black flex items-center justify-center leading-none">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </button>
              <Link
                href="/account"
                onClick={() => setIsOpen(false)}
                className="flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl text-sm font-bold transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Account
              </Link>
            </div>
            <Link
              href="/pre-order"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-center gap-2 bg-[#A1AB74] text-white w-full py-3.5 rounded-xl text-sm font-black hover:bg-[#8a9360] transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" strokeLinecap="round" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 10a4 4 0 01-8 0" />
              </svg>
              Pre-Order Ice Cream
            </Link>
          </div>
        </div>
      </div>


    </>
  );
}
