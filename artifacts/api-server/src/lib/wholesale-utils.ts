/** Minimum calendar date (YYYY-MM-DD) that satisfies N business days from today (Mon–Fri). */
export function getMinBusinessDate(businessDays: number, fromDate: Date = new Date()): string {
    const start = new Date(fromDate);
    start.setHours(0, 0, 0, 0);
    let counted = 0;
    const cursor = new Date(start);
    while (counted < businessDays) {
        cursor.setDate(cursor.getDate() + 1);
        const day = cursor.getDay();
        if (day !== 0 && day !== 6) counted++;
    }
    return cursor.toISOString().split("T")[0]!;
}

export function isDateBeforeMinBusinessDays(
    dateStr: string,
    businessDays: number,
    fromDate: Date = new Date(),
): boolean {
    const requested = new Date(dateStr + "T00:00:00");
    const min = new Date(getMinBusinessDate(businessDays, fromDate) + "T00:00:00");
    return requested < min;
}
