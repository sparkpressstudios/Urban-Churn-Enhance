/** Business timezone for Urban Churn pre-orders, pickups, and admin scheduling. */
export const BUSINESS_TZ = "America/New_York";

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

/** Parse admin datetime-local input as Eastern wall clock → UTC instant for DB storage. */
export function parseEasternDateTime(value: string): Date {
    if (!value) {
        throw new Error("Date value is required");
    }

    if (/[zZ]$|[+-]\d{2}:\d{2}$/.test(value)) {
        return new Date(value);
    }

    const match = value.match(LOCAL_DATETIME_RE);
    if (!match) {
        return new Date(value);
    }

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
        const actualMs = Date.UTC(
            eastern.year,
            eastern.month - 1,
            eastern.day,
            eastern.hour,
            eastern.minute,
            eastern.second,
        );
        const diffMs = targetMs - actualMs;
        if (Math.abs(diffMs) < 1000) break;
        utc = new Date(utc.getTime() + diffMs);
    }

    return utc;
}

/** Format a UTC instant for datetime-local inputs in Eastern Time. */
export function formatEasternDateTimeLocal(date: Date | string): string {
    const d = new Date(date);
    const p = easternParts(d);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

export function parsePreOrderDateInput(value: string): Date {
    return parseEasternDateTime(value);
}

/**
 * Recover dates saved before Eastern parsing: UTC components were stored as if
 * the admin's Eastern wall-clock input were UTC.
 */
export function recoverMisstoredEasternDate(stored: Date | string): Date {
    const d = new Date(stored);
    const pad = (n: number) => String(n).padStart(2, "0");
    const local = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
    return parseEasternDateTime(local);
}

export function formatEasternDateTime(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
    return new Date(date).toLocaleString("en-US", {
        timeZone: BUSINESS_TZ,
        weekday: "long",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
        ...options,
    });
}
