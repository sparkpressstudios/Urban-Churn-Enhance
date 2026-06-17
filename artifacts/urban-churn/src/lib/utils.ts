import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Business timezone — all admin dates display in Eastern */
const BUSINESS_TZ = "America/New_York";

/** Format a date in Eastern timezone for admin display */
export function formatEastern(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  return new Date(date).toLocaleString("en-US", { timeZone: BUSINESS_TZ, ...options });
}

const LOCAL_DATETIME_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

function easternParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour") % 24,
    minute: get("minute"),
    second: get("second"),
  };
}

/** Format a UTC instant for datetime-local inputs in Eastern Time. */
export function formatEasternDateTimeLocal(date: Date | string): string {
  const d = new Date(date);
  const p = easternParts(d);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

/** Parse datetime-local admin input as Eastern wall clock. */
export function parseEasternDateTimeLocal(value: string): Date {
  if (/[zZ]$|[+-]\d{2}:\d{2}$/.test(value)) return new Date(value);
  const match = value.match(LOCAL_DATETIME_RE);
  if (!match) return new Date(value);
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6] ?? "0");
  let utc = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  for (let i = 0; i < 4; i++) {
    const eastern = easternParts(utc);
    const targetMs = Date.UTC(year, month - 1, day, hour, minute, second);
    const actualMs = Date.UTC(eastern.year, eastern.month - 1, eastern.day, eastern.hour, eastern.minute, eastern.second);
    const diffMs = targetMs - actualMs;
    if (Math.abs(diffMs) < 1000) break;
    utc = new Date(utc.getTime() + diffMs);
  }
  return utc;
}

/** Format a date-only value in Eastern timezone */
export function formatEasternDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  let d: Date;
  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    // Date-only strings from the DB are UTC calendar dates.
    // Parsing at noon UTC keeps the display in the correct Eastern calendar day.
    d = new Date(date + "T12:00:00Z");
  } else {
    d = new Date(date);
  }
  return d.toLocaleDateString("en-US", { timeZone: BUSINESS_TZ, ...options });
}

// Tag display labels
export const TAG_LABELS: Record<string, string> = {
  classic: "Classic",
  limited: "Limited",
  seasonal: "Seasonal",
  "fan-favorite": "Fan Favorite",
  adventurous: "Adventurous",
  bestseller: "Bestseller",
  "coming-soon": "Coming Soon",
};

export const TAG_COLORS: Record<string, string> = {
  classic: "#4a9e7f",
  limited: "#d4a853",
  seasonal: "#d4a853",
  "fan-favorite": "#c2445a",
  adventurous: "#9b59b6",
  bestseller: "#b08040",
  "coming-soon": "#888",
};

export const TAG_CLASSES: Record<string, string> = {
  classic: "bg-green-100 text-green-700",
  limited: "bg-orange-100 text-orange-700",
  seasonal: "bg-yellow-100 text-yellow-700",
  "fan-favorite": "bg-pink-100 text-pink-700",
  adventurous: "bg-purple-100 text-purple-700",
  bestseller: "bg-amber-100 text-amber-700",
  "coming-soon": "bg-gray-100 text-gray-600",
};

type ApiHour = { dayOfWeek: number; openTime: string; closeTime: string; isClosed: boolean; setNumber?: number };

function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "pm" : "am";
  const hour = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return m === 0 ? `${hour}${period}` : `${hour}:${m.toString().padStart(2, "0")}${period}`;
}

export function formatHoursForDisplay(hours: ApiHour[]): Array<{ days: string; time: string }> {
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  // Deduplicate: keep only the last entry per (dayOfWeek, setNumber)
  const deduped = new Map<string, ApiHour>();
  for (const h of hours) {
    deduped.set(`${h.dayOfWeek}-${h.setNumber ?? 1}`, h);
  }

  // Group hours by day, collecting all sets per day
  const byDay = new Map<number, ApiHour[]>();
  for (const h of deduped.values()) {
    if (!byDay.has(h.dayOfWeek)) byDay.set(h.dayOfWeek, []);
    byDay.get(h.dayOfWeek)!.push(h);
  }

  // Build a time string per day (handles split hours)
  function dayTimeString(dayHours: ApiHour[]): { isClosed: boolean; timeStr: string } {
    const sorted = [...dayHours].sort((a, b) => (a.setNumber ?? 1) - (b.setNumber ?? 1));
    const closed = sorted.every(h => h.isClosed);
    if (closed) return { isClosed: true, timeStr: "Closed" };
    const open = sorted.filter(h => !h.isClosed);
    const timeStr = open.map(h => `${formatTime(h.openTime)} – ${formatTime(h.closeTime)}`).join(", ");
    return { isClosed: false, timeStr };
  }

  // Group consecutive days with identical time strings
  const sortedDays = [...byDay.keys()].sort((a, b) => a - b);
  const groups: Array<{ startDay: number; endDay: number; timeStr: string; isClosed: boolean }> = [];

  for (const day of sortedDays) {
    const { isClosed, timeStr } = dayTimeString(byDay.get(day)!);
    const last = groups[groups.length - 1];
    if (last && last.isClosed === isClosed && last.timeStr === timeStr && day === last.endDay + 1) {
      last.endDay = day;
    } else {
      groups.push({ startDay: day, endDay: day, timeStr, isClosed });
    }
  }

  return groups.map(g => {
    const days = g.startDay === g.endDay
      ? dayNames[g.startDay]
      : `${dayNames[g.startDay]} – ${dayNames[g.endDay]}`;
    return { days, time: g.timeStr };
  });
}

export function formatHoursCompact(hours: ApiHour[]): string {
  const shortDays: Record<string, string> = {
    Sunday: "Sun", Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed",
    Thursday: "Thu", Friday: "Fri", Saturday: "Sat",
  };
  return formatHoursForDisplay(hours)
    .map(h => {
      const days = h.days.replace(/Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday/g, m => shortDays[m]);
      return `${days}: ${h.time}`;
    })
    .join("\n");
}

export function getOpenStatus(hours: ApiHour[]): { isOpen: boolean; label: string; closesAt?: string; opensAt?: string } {
  if (!hours || hours.length === 0) return { isOpen: false, label: "Hours unavailable" };

  // Deduplicate: keep only the last entry per (dayOfWeek, setNumber)
  const deduped = new Map<string, ApiHour>();
  for (const h of hours) {
    deduped.set(`${h.dayOfWeek}-${h.setNumber ?? 1}`, h);
  }
  const cleanHours = [...deduped.values()];

  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sunday
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Get all hour sets for today, sorted by setNumber
  const todaySets = cleanHours
    .filter(h => h.dayOfWeek === dayOfWeek)
    .sort((a, b) => (a.setNumber ?? 1) - (b.setNumber ?? 1));

  if (todaySets.length === 0 || todaySets.every(h => h.isClosed)) {
    // Find next open day
    for (let offset = 1; offset <= 7; offset++) {
      const nextDay = (dayOfWeek + offset) % 7;
      const nextSets = cleanHours.filter(h => h.dayOfWeek === nextDay && !h.isClosed)
        .sort((a, b) => (a.setNumber ?? 1) - (b.setNumber ?? 1));
      if (nextSets.length > 0) {
        return { isOpen: false, label: "Closed today", opensAt: `Opens ${dayNames[nextDay]} ${formatTime(nextSets[0].openTime)}` };
      }
    }
    return { isOpen: false, label: "Closed" };
  }

  const openSets = todaySets.filter(h => !h.isClosed);

  // Check if currently within any open set
  for (const set of openSets) {
    const [openH, openM] = set.openTime.split(":").map(Number);
    const [closeH, closeM] = set.closeTime.split(":").map(Number);
    const openMin = openH * 60 + openM;
    const closeMin = closeH * 60 + closeM;
    if (currentMinutes >= openMin && currentMinutes < closeMin) {
      return { isOpen: true, label: "Open now", closesAt: `Closes ${formatTime(set.closeTime)}` };
    }
  }

  // Not currently open — find next open window today
  for (const set of openSets) {
    const [openH, openM] = set.openTime.split(":").map(Number);
    const openMin = openH * 60 + openM;
    if (currentMinutes < openMin) {
      return { isOpen: false, label: "Closed", opensAt: `Opens ${formatTime(set.openTime)}` };
    }
  }

  // Past all today's hours — find next open day
  for (let offset = 1; offset <= 7; offset++) {
    const nextDay = (dayOfWeek + offset) % 7;
    const nextSets = cleanHours.filter(h => h.dayOfWeek === nextDay && !h.isClosed)
      .sort((a, b) => (a.setNumber ?? 1) - (b.setNumber ?? 1));
    if (nextSets.length > 0) {
      return { isOpen: false, label: "Closed", opensAt: `Opens ${offset === 1 ? "tomorrow" : dayNames[nextDay]} ${formatTime(nextSets[0].openTime)}` };
    }
  }
  return { isOpen: false, label: "Closed" };
}
