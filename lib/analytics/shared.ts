import {
  calendarMonthKey,
  getZonedParts,
  isSameZonedMonth,
  shiftCalendarMonth,
  subtractZonedDays,
  toZonedDateString,
} from "@/lib/timezone";

export const NAMED_INSIGHTS_PERIODS = [
  "today",
  "this_month",
  "last_month",
  "last_30_days",
  "all_time",
] as const;

export type NamedInsightsPeriod = (typeof NAMED_INSIGHTS_PERIODS)[number];
export type CalendarMonthPeriod = `${number}-${string}`;
export type InsightsPeriod = NamedInsightsPeriod | CalendarMonthPeriod;

const CALENDAR_MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export function isCalendarMonthPeriod(period: string): period is CalendarMonthPeriod {
  return CALENDAR_MONTH_RE.test(period);
}

export function isNamedInsightsPeriod(period: string): period is NamedInsightsPeriod {
  return (NAMED_INSIGHTS_PERIODS as readonly string[]).includes(period);
}

export type CalendarMonth = { year: number; month: number };

export function insightsPeriodToMonth(
  period: InsightsPeriod,
  now = new Date()
): CalendarMonth | null {
  const parts = getZonedParts(now);
  if (period === "this_month" || period === "today") {
    return { year: parts.year, month: parts.month };
  }
  if (period === "last_month") {
    return shiftCalendarMonth(parts.year, parts.month, -1);
  }
  if (isCalendarMonthPeriod(period)) {
    const [year, month] = period.split("-").map(Number);
    return { year, month };
  }
  return null;
}

export function monthToInsightsPeriod(
  year: number,
  month: number,
  now = new Date()
): InsightsPeriod {
  const parts = getZonedParts(now);
  if (year === parts.year && month === parts.month) return "this_month";
  const last = shiftCalendarMonth(parts.year, parts.month, -1);
  if (year === last.year && month === last.month) return "last_month";
  return calendarMonthKey(year, month) as CalendarMonthPeriod;
}

export type HasPaymentStatus = {
  payment_status?: string | null;
};

/** KPI helpers only count docs paid in full (excludes credit/partial). */
export function isFullyPaid(doc: HasPaymentStatus): boolean {
  return (doc.payment_status ?? "paid") === "paid";
}

export function filterFullyPaid<T extends HasPaymentStatus>(items: T[]): T[] {
  return items.filter(isFullyPaid);
}

export const isFullyPaidSale = isFullyPaid;
export const filterFullyPaidSales = filterFullyPaid;

export function filterByPeriod<T>(
  items: T[],
  period: InsightsPeriod,
  getDate: (item: T) => string,
  now = new Date()
): T[] {
  if (period === "all_time") return items;

  if (period === "today") {
    const today = toZonedDateString(now);
    return items.filter((item) => toZonedDateString(getDate(item)) === today);
  }

  if (period === "this_month") {
    return items.filter((item) => isSameZonedMonth(getDate(item), now));
  }

  const month = insightsPeriodToMonth(period, now);
  if (month && (period === "last_month" || isCalendarMonthPeriod(period))) {
    return items.filter((item) => {
      const parts = getZonedParts(getDate(item));
      return parts.year === month.year && parts.month === month.month;
    });
  }

  const cutoff = subtractZonedDays(toZonedDateString(now), 30);
  return items.filter((item) => toZonedDateString(getDate(item)) >= cutoff);
}
