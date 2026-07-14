import { filterFullyPaidSales } from "@/lib/analytics/shared";
import type { Purchase } from "@/lib/db/purchases";
import type { Sale } from "@/lib/db/sales";
import { getZonedParts } from "@/lib/timezone";

export type BusinessMonthTotals = {
  revenue: number;
  purchases: number;
  margin: number;
};

export type BusinessMonthSeries = BusinessMonthTotals & {
  key: string;
  label: string;
};

function docInMonth(dateStr: string, year: number, month: number): boolean {
  const parts = getZonedParts(dateStr);
  return parts.year === year && parts.month === month;
}

export function getMonthBusinessTotals(
  sales: Sale[],
  purchases: Purchase[],
  year: number,
  month: number
): BusinessMonthTotals {
  const revenue = filterFullyPaidSales(sales)
    .filter((s) => docInMonth(s.date, year, month))
    .reduce((sum, s) => sum + Number(s.total ?? 0), 0);
  const expense = purchases
    .filter((p) => (p.receipt_status ?? "received") === "received")
    .filter((p) => docInMonth(p.date, year, month))
    .reduce((sum, p) => sum + Number(p.total ?? 0), 0);
  return { revenue, purchases: expense, margin: revenue - expense };
}

export function getLastNMonthsBusinessTotals(
  sales: Sale[],
  purchases: Purchase[],
  n: number
): BusinessMonthSeries[] {
  const nowParts = getZonedParts(new Date());
  const result: BusinessMonthSeries[] = [];

  for (let i = n - 1; i >= 0; i--) {
    let month = nowParts.month - i;
    let year = nowParts.year;
    while (month < 1) {
      month += 12;
      year -= 1;
    }
    const totals = getMonthBusinessTotals(sales, purchases, year, month);
    const labelDate = new Date(Date.UTC(year, month - 1, 15, 12, 0, 0));
    result.push({
      key: `${year}-${String(month).padStart(2, "0")}`,
      label: labelDate.toLocaleDateString(undefined, {
        month: "short",
        year: "2-digit",
        timeZone: "America/El_Salvador",
      }),
      ...totals,
    });
  }

  return result;
}
