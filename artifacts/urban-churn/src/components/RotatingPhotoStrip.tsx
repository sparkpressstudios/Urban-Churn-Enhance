import { useCallback, useEffect, useRef, useState } from "react";

// All available photos from the lib/video folder + existing uc-photos
const ALL_PHOTOS = [
  "uc-photo-1.jpg",
  "uc-photo-2.jpg",
  "uc-photo-3.jpg",
  "uc-photo-5.jpg",
  "uc-photo-6.jpg",
  "uc-110.jpg",
  "uc-jan-023.jpg",
  "uc-october-026.jpg",
  "uc-september-193.jpg",
  "uc-pints-021.jpg",
  "uc-pints-open.jpg",
  "uc-social-1.jpg",
  "uc-social-2.jpg",
  "uc-social-3.jpg",
  "uc-social-4.jpg",
];

// Fisher-Yates shuffle
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Random ms between min and max seconds
function randMs(minSec: number, maxSec: number) {
  return (minSec + Math.random() * (maxSec - minSec)) * 1000;
}

const BASE = import.meta.env.BASE_URL;
const FADE_MS = 1200;

// Transition effects for each slot
type TransitionEffect = "fade" | "zoom-fade" | "slide-up" | "blur-fade";
const EFFECTS: TransitionEffect[] = ["fade", "zoom-fade", "slide-up", "blur-fade"];

function pickEffect(): TransitionEffect {
  return EFFECTS[Math.floor(Math.random() * EFFECTS.length)];
}

// Per-slot state: current visible image + optional incoming image during crossfade
interface SlotState {
  current: string;
  next: string | null; // non-null during crossfade
  effect: TransitionEffect;
}

export default function RotatingPhotoStrip() {
  const pool = useRef<string[]>([]);

  // Pick a photo not currently shown in any slot
  const pickNext = useCallback((excluding: string[]): string => {
    if (pool.current.length === 0) pool.current = shuffle(ALL_PHOTOS);
    const idx = pool.current.findIndex((p) => !excluding.includes(p));
    if (idx === -1) {
      pool.current = shuffle(ALL_PHOTOS);
      return pool.current.find((p) => !excluding.includes(p)) ?? ALL_PHOTOS[0];
    }
    return pool.current.splice(idx, 1)[0];
  }, []);

  const [slots, setSlots] = useState<SlotState[]>(() => {
    const imgs = shuffle(ALL_PHOTOS).slice(0, 4);
    return imgs.map((img) => ({ current: img, next: null, effect: "fade" as TransitionEffect }));
  });

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const scheduleSlot = useCallback((slotIdx: number, delayMs: number) => {
    const t = setTimeout(() => {
      // Start crossfade: pick next image excluding all currently shown
      setSlots((prev) => {
        const excluding = prev.map((s) => s.next ?? s.current);
        const next = pickNext(excluding);
        const effect = pickEffect();
        const updated = prev.map((s, i) =>
          i === slotIdx ? { ...s, next, effect } : s
        );
        return updated;
      });

      // After fade completes, commit and schedule next rotation for this slot
      const commit = setTimeout(() => {
        setSlots((prev) =>
          prev.map((s, i) =>
            i === slotIdx ? { current: s.next ?? s.current, next: null, effect: s.effect } : s
          )
        );
        scheduleSlot(slotIdx, randMs(8, 16));
      }, FADE_MS);

      timers.current.push(commit);
    }, delayMs);

    timers.current.push(t);
  }, [pickNext]);

  useEffect(() => {
    // Stagger initial delays randomly so no two slots fire at the same time
    const initialDelays = [
      randMs(2, 4),
      randMs(9, 13),
      randMs(6, 9),
      randMs(13, 17),
    ];
    initialDelays.forEach((delay, i) => scheduleSlot(i, delay));

    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, [scheduleSlot]);

  const offsets = ["md:mt-0", "md:mt-8", "md:mt-3", "md:mt-10"];

  // Build inline styles for each effect type
  function getOutgoingStyle(slot: SlotState): React.CSSProperties {
    const isTransitioning = !!slot.next;
    const dur = `${FADE_MS}ms`;
    const base: React.CSSProperties = { transitionDuration: dur, transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)" };

    switch (slot.effect) {
      case "zoom-fade":
        return { ...base, transitionProperty: "opacity, transform", opacity: isTransitioning ? 0 : 1, transform: isTransitioning ? "scale(1.15)" : "scale(1)" };
      case "slide-up":
        return { ...base, transitionProperty: "opacity, transform", opacity: isTransitioning ? 0 : 1, transform: isTransitioning ? "translateY(-8%)" : "translateY(0)" };
      case "blur-fade":
        return { ...base, transitionProperty: "opacity, filter", opacity: isTransitioning ? 0 : 1, filter: isTransitioning ? "blur(8px)" : "blur(0px)" };
      case "fade":
      default:
        return { ...base, transitionProperty: "opacity", opacity: isTransitioning ? 0 : 1 };
    }
  }

  function getIncomingStyle(slot: SlotState): React.CSSProperties {
    const dur = `${FADE_MS}ms`;
    const base: React.CSSProperties = { transitionDuration: dur, transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)" };

    switch (slot.effect) {
      case "zoom-fade":
        return { ...base, transitionProperty: "opacity, transform", opacity: 1, transform: "scale(1)" };
      case "slide-up":
        return { ...base, transitionProperty: "opacity, transform", opacity: 1, transform: "translateY(0)" };
      case "blur-fade":
        return { ...base, transitionProperty: "opacity, filter", opacity: 1, filter: "blur(0px)" };
      case "fade":
      default:
        return { ...base, transitionProperty: "opacity", opacity: 1 };
    }
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {slots.map((slot, i) => (
        <div key={i} className={`relative rounded-2xl overflow-hidden aspect-square w-full shadow-lg ${offsets[i]}`}>
          {/* Outgoing image */}
          <img
            src={`${BASE}images/${slot.current}`}
            alt="Urban Churn"
            className="absolute inset-0 w-full h-full object-cover"
            style={getOutgoingStyle(slot)}
          />
          {/* Incoming image */}
          {slot.next && (
            <img
              src={`${BASE}images/${slot.next}`}
              alt="Urban Churn"
              className="absolute inset-0 w-full h-full object-cover"
              style={getIncomingStyle(slot)}
            />
          )}
          {/* Subtle overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/15 to-transparent pointer-events-none" />
        </div>
      ))}
    </div>
  );
}
