import {
  isSameZonedMonth,
  subtractZonedDays,
  toZonedDateString,
} from "@/lib/timezone";

export type InsightsPeriod = "today" | "this_month" | "last_30_days" | "all_time";

export type HasPaymentStatus = {
  payment_status?: string | null;
};

/** Revenue/KPI helpers only count sales collected in full (excludes fiado/partial). */
export function isFullyPaidSale(sale: HasPaymentStatus): boolean {
  return (sale.payment_status ?? "paid") === "paid";
}

export function filterFullyPaidSales<T extends HasPaymentStatus>(sales: T[]): T[] {
  return sales.filter(isFullyPaidSale);
}

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

  const cutoff = subtractZonedDays(toZonedDateString(now), 30);
  return items.filter((item) => toZonedDateString(getDate(item)) >= cutoff);
}
