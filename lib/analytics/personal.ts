import type { Transaction } from "@/lib/db/transactions";
import { getZonedParts, shiftCalendarMonth } from "@/lib/timezone";

export type MonthTotals = {
  income: number;
  expense: number;
  net: number;
};

export function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function getMonthTotals(
  transactions: Transaction[],
  year: number,
  month: number
): MonthTotals {
  let income = 0;
  let expense = 0;
  for (const tx of transactions) {
    const p = getZonedParts(tx.date);
    if (p.year !== year || p.month !== month) continue;
    const amount = Number(tx.amount);
    if (tx.type === "income") income += amount;
    else if (tx.type === "expense") expense += amount;
  }
  return { income, expense, net: income - expense };
}

export function getLastNMonthsTotals(
  transactions: Transaction[],
  n: number
): Array<{ key: string; label: string; income: number; expense: number; net: number }> {
  const nowParts = getZonedParts(new Date());
  const result: Array<{
    key: string;
    label: string;
    income: number;
    expense: number;
    net: number;
  }> = [];

  for (let i = n - 1; i >= 0; i--) {
    const m = shiftCalendarMonth(nowParts.year, nowParts.month, -i);
    const totals = getMonthTotals(transactions, m.year, m.month);
    const labelDate = new Date(Date.UTC(m.year, m.month - 1, 15, 12, 0, 0));
    result.push({
      key: monthKey(m.year, m.month),
      label: labelDate.toLocaleDateString(undefined, { month: "short", year: "2-digit" }),
      ...totals,
    });
  }
  return result;
}

export function getExpensesByCategory(
  transactions: Transaction[],
  categoryNames: Map<string, string>,
  year: number,
  month: number
): Array<{ categoryId: string; name: string; total: number }> {
  const byCat = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.type !== "expense" || !tx.category_id) continue;
    const p = getZonedParts(tx.date);
    if (p.year !== year || p.month !== month) continue;
    const id = tx.category_id;
    byCat.set(id, (byCat.get(id) ?? 0) + Number(tx.amount));
  }
  return [...byCat.entries()]
    .map(([categoryId, total]) => ({
      categoryId,
      name: categoryNames.get(categoryId) ?? "—",
      total,
    }))
    .sort((a, b) => b.total - a.total);
}

export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / Math.abs(previous)) * 100;
}
