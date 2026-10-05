import { useState } from "react";
import { Link } from "wouter";

const BASE = import.meta.env.BASE_URL;

function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("sending");
    setMessage("");

    try {
      const response = await fetch("/api/marketing/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, firstName, consent, website }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "We couldn't add you right now.");
      }

      setStatus("success");
      setMessage("You're on the list. Watch your inbox for the good stuff.");
      setEmail("");
      setFirstName("");
      setConsent(false);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "We couldn't add you right now.");
    }
  };

  return (
    <div className="mt-6">
      <p className="text-[#A1AB74] text-xs font-black uppercase tracking-[0.14em] mb-2">Get the Scoop</p>
      <p className="text-white/80 text-xs leading-relaxed mb-3">
        New flavours, events and occasional offers — straight from Urban Churn.
      </p>
      <form onSubmit={submit} className="space-y-2.5" aria-label="Join the Urban Churn email list">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <label className="sr-only" htmlFor="footer-first-name">First name</label>
          <input
            id="footer-first-name"
            type="text"
            autoComplete="given-name"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            placeholder="First name"
            className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2.5 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-[#A1AB74]"
          />
          <label className="sr-only" htmlFor="footer-email">Email address</label>
          <input
            id="footer-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email address"
            className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2.5 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-[#A1AB74]"
          />
        </div>

        <div className="absolute left-[-10000px] h-px w-px overflow-hidden" aria-hidden="true">
          <label htmlFor="footer-website">Website</label>
          <input
            id="footer-website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
          />
        </div>

        <label className="flex items-start gap-2 text-[11px] leading-relaxed text-white/70">
          <input
            type="checkbox"
            checked={consent}
            onChange={(event) => setConsent(event.target.checked)}
            required
            className="mt-0.5 h-4 w-4 rounded border-white/30 bg-black/30 accent-[#A1AB74]"
          />
          <span>
            Yes, send me Urban Churn flavour drops, events and offers. I can unsubscribe anytime.{" "}
            <Link href="/privacy" className="underline hover:text-white">Privacy policy</Link>.
          </span>
        </label>

        <button
          type="submit"
          disabled={status === "sending"}
          className="rounded-lg bg-[#A1AB74] px-4 py-2.5 text-xs font-black uppercase tracking-wide text-[#111118] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "sending" ? "Joining…" : "Join the List"}
        </button>

        <p
          className={`min-h-4 text-xs ${status === "error" ? "text-red-300" : "text-white/75"}`}
          aria-live="polite"
        >
          {message}
        </p>
      </form>
    </div>
  );
}

export default function Footer() {
  return (
    <footer className="text-white py-14 relative overflow-hidden">
      <img src={`${BASE}images/uc-footer-bg.jpeg`} alt="" role="presentation" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-[#0d0d12]/80" />
      <div className="relative max-w-7xl mx-auto px-6 sm:px-8">

        {/* Top section: logo/tagline + nav columns */}
        <div className="flex flex-col md:flex-row items-start justify-between mb-10 gap-10">
          <div className="max-w-md">
            <img src={`${BASE}images/uc-logo-black.png`} alt="Urban Churn" className="h-8 brightness-0 invert mb-4" />
            <p className="text-white text-sm leading-relaxed mb-5">Unique flavours, natural ingredients, nothing fake. Crafting ice cream inspired by cultures around the world.</p>
            <div className="flex gap-3">
              <a href="https://instagram.com/urbanchurn" target="_blank" rel="noopener noreferrer" className="text-white hover:text-white/80 text-xs font-medium transition-colors">Instagram</a>
              <span className="text-white/60">·</span>
              <a href="https://facebook.com/urbanchurn" target="_blank" rel="noopener noreferrer" className="text-white hover:text-white/80 text-xs font-medium transition-colors">Facebook</a>
            </div>
            <NewsletterSignup />
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
