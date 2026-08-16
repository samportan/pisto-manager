/** Business reporting timezone (El Salvador, UTC-6, no DST). */
export const BUSINESS_TIMEZONE = "America/El_Salvador";

const zonedDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: BUSINESS_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const zonedPartsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: BUSINESS_TIMEZONE,
  year: "numeric",
  month: "numeric",
  day: "numeric",
});

function toDate(value: Date | string): Date {
  return typeof value === "string" ? new Date(value) : value;
}

export function toZonedDateString(value: Date | string): string {
  return zonedDateFormatter.format(toDate(value));
}

export function getZonedParts(value: Date | string): {
  year: number;
  month: number;
  day: number;
} {
  const parts = zonedPartsFormatter.formatToParts(toDate(value));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  return { year: get("year"), month: get("month"), day: get("day") };
}

export function isSameZonedDay(
  dateStr: string,
  ref: Date | string = new Date()
): boolean {
  return toZonedDateString(dateStr) === toZonedDateString(ref);
}

export function isSameZonedMonth(
  dateStr: string,
  ref: Date | string = new Date()
): boolean {
  const a = getZonedParts(dateStr);
  const b = getZonedParts(ref);
  return a.year === b.year && a.month === b.month;
}

export function subtractZonedDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const utc = Date.UTC(y, m - 1, d - days, 12, 0, 0);
  return toZonedDateString(new Date(utc));
}

export function shiftCalendarMonth(
  year: number,
  month: number,
  delta: number
): { year: number; month: number } {
  const d = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

export function formatZonedMonthYear(
  year: number,
  month: number,
  locale = "es-SV"
): string {
  return new Date(Date.UTC(year, month - 1, 15, 12, 0, 0)).toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
    timeZone: BUSINESS_TIMEZONE,
  });
}

export function calendarMonthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

/** Midnight local → UTC ISO (El Salvador is always UTC-6). */
export function localDayStartUtcIso(localDateStr: string): string {
  const [y, m, d] = localDateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 6, 0, 0, 0)).toISOString();
}

/** End of local day → UTC ISO. */
export function localDayEndUtcIso(localDateStr: string): string {
  const [y, m, d] = localDateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1, 5, 59, 59, 999)).toISOString();
}

export function formatDateForExport(value: string): string {
  return toZonedDateString(value);
}
