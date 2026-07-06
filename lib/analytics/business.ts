import type { Purchase } from "@/lib/db/purchases";
import type { Sale } from "@/lib/db/sales";

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
  const d = new Date(dateStr);
  return d.getMonth() === month && d.getFullYear() === year;
}

export function getMonthBusinessTotals(
  sales: Sale[],
  purchases: Purchase[],
  year: number,
  month: number
): BusinessMonthTotals {
  const revenue = sales
    .filter((s) => docInMonth(s.date, year, month))
    .reduce((sum, s) => sum + Number(s.total ?? 0), 0);
  const expense = purchases
    .filter((p) => docInMonth(p.date, year, month))
    .reduce((sum, p) => sum + Number(p.total ?? 0), 0);
  return { revenue, purchases: expense, margin: revenue - expense };
}

export function getLastNMonthsBusinessTotals(
  sales: Sale[],
  purchases: Purchase[],
  n: number
): BusinessMonthSeries[] {
  const now = new Date();
  const result: BusinessMonthSeries[] = [];

  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const totals = getMonthBusinessTotals(sales, purchases, d.getFullYear(), d.getMonth());
    result.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString(undefined, { month: "short", year: "2-digit" }),
      ...totals,
    });
  }

  return result;
}
