import type { Transaction } from "@/lib/db/transactions";

export type MonthTotals = {
  income: number;
  expense: number;
  net: number;
};

export function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function getMonthTotals(
  transactions: Transaction[],
  year: number,
  month: number
): MonthTotals {
  let income = 0;
  let expense = 0;
  for (const tx of transactions) {
    const d = new Date(tx.date);
    if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month) continue;
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
  const now = new Date();
  const result: Array<{
    key: string;
    label: string;
    income: number;
    expense: number;
    net: number;
  }> = [];

  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const totals = getMonthTotals(transactions, d.getUTCFullYear(), d.getUTCMonth());
    result.push({
      key: monthKey(d),
      label: d.toLocaleDateString(undefined, { month: "short", year: "2-digit" }),
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
    const d = new Date(tx.date);
    if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month) continue;
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
