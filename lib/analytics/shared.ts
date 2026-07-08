export type InsightsPeriod = "this_month" | "last_30_days" | "all_time";

function parseDate(dateStr: string): Date {
  return new Date(dateStr);
}

export function filterByPeriod<T>(
  items: T[],
  period: InsightsPeriod,
  getDate: (item: T) => string,
  now = new Date()
): T[] {
  if (period === "all_time") return items;

  if (period === "this_month") {
    const m = now.getMonth();
    const y = now.getFullYear();
    return items.filter((item) => {
      const d = parseDate(getDate(item));
      return d.getMonth() === m && d.getFullYear() === y;
    });
  }

  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - 30);
  return items.filter((item) => parseDate(getDate(item)) >= cutoff);
}
