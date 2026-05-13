import { Gift, ArrowRight } from "lucide-react";
import { Link } from "wouter";

const BASE = import.meta.env.BASE_URL;

export default function GiftCardSection() {
  return (
    <div className="rounded-2xl relative overflow-hidden">
      <img src={`${BASE}images/uc-pints-bg.jpg`} alt="" role="presentation" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-[#111118]/75" />
      <div className="relative p-6 md:p-8 text-white">
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-[#A1AB74]/10 blur-[60px]" />
        <div className="relative flex flex-col md:flex-row items-center gap-6">
          <div className="w-16 h-16 md:w-20 md:h-20 bg-[#A1AB74]/20 rounded-2xl flex items-center justify-center shrink-0">
            <Gift className="w-8 h-8 md:w-10 md:h-10 text-[#A1AB74]" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-xl font-bold mb-1">Give the Gift of Ice Cream</h3>
            <p className="text-white/60 text-sm">
              Send a digital gift card — from $5 to $500. Delivered instantly by email and redeemable at all locations.
            </p>
          </div>
          <Link href="/gift-cards">
            <button className="bg-[#A1AB74] hover:bg-[#8a9463] text-white font-bold px-6 py-3 rounded-xl transition-colors flex items-center gap-2 shrink-0">
              Buy a Gift Card <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
