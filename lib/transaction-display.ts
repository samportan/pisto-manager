import type { Account } from "@/lib/db/accounts";
import type { Category } from "@/lib/db/categories";
import type { Transaction } from "@/lib/db/transactions";

export type TransactionRow = {
  id: string;
  title: string;
  categoryLabel: string;
  accountLabel: string;
  dateLabel: string;
  dateKey: string;
  sortTime: number;
  signedAmount: number;
};

function accountMap(accounts: Account[]): Map<string, Account> {
  return new Map(accounts.map((a) => [a.id, a]));
}

function categoryMap(categories: Category[]): Map<string, Category> {
  return new Map(categories.map((c) => [c.id, c]));
}

export function transactionToRow(
  tx: Transaction,
  accounts: Account[],
  categories: Category[]
): TransactionRow {
  const am = accountMap(accounts);
  const cm = categoryMap(categories);
  const account = am.get(tx.account_id);
  const dest = tx.destination_account_id
    ? am.get(tx.destination_account_id)
    : undefined;
  const cat = tx.category_id ? cm.get(tx.category_id) : undefined;

  const desc = tx.description?.trim();
  let title: string;
  if (desc) {
    title = desc;
  } else if (tx.type === "transfer" && dest) {
    title = `Transfer → ${dest.name}`;
  } else if (cat) {
    title = cat.name;
  } else {
    title =
      tx.type === "transfer"
        ? "Transfer"
        : tx.type === "income"
          ? "Income"
          : "Expense";
  }

  const categoryLabel =
    tx.type === "transfer" ? "Transfer" : cat?.name ?? "—";

  const accountLabel =
    tx.type === "transfer" && dest
      ? `${account?.name ?? "Account"} → ${dest.name}`
      : account?.name ?? "—";

  const d = new Date(tx.date);
  const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const signedAmount =
    tx.type === "income" ? tx.amount : -tx.amount;

  return {
    id: tx.id,
    title,
    categoryLabel,
    accountLabel,
    dateLabel: d.toLocaleDateString(undefined, { dateStyle: "medium" }),
    dateKey,
    sortTime: d.getTime(),
    signedAmount,
  };
}

export function transactionsToRows(
  txs: Transaction[],
  accounts: Account[],
  categories: Category[]
): TransactionRow[] {
  return txs.map((tx) => transactionToRow(tx, accounts, categories));
}

export type DayGroup = {
  dateKey: string;
  heading: string;
  items: TransactionRow[];
};

export function groupRowsByDay(rows: TransactionRow[]): DayGroup[] {
  const byDay = new Map<string, TransactionRow[]>();
  for (const row of rows) {
    const list = byDay.get(row.dateKey);
    if (list) list.push(row);
    else byDay.set(row.dateKey, [row]);
  }
  const keys = [...byDay.keys()].sort((a, b) => b.localeCompare(a));
  return keys.map((dateKey) => {
    const items = (byDay.get(dateKey) ?? []).sort(
      (a, b) => b.sortTime - a.sortTime
    );
    const heading = new Date(`${dateKey}T12:00:00`).toLocaleDateString(
      undefined,
      {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }
    );
    return { dateKey, heading, items };
  });
}

export function inCalendarMonth(
  tx: Transaction,
  year: number,
  monthIndex: number
): boolean {
  const d = new Date(tx.date);
  return d.getFullYear() === year && d.getMonth() === monthIndex;
}

export function formatMonthYear(year: number, monthIndex: number): string {
  return new Date(year, monthIndex, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}
