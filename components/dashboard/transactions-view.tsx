"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";
import { AddTransactionSheet } from "@/components/add-transaction-sheet";
import { TransactionListRow } from "@/components/transaction-list-row";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAccounts } from "@/hooks/useAccounts";
import { useCategories } from "@/hooks/useCategories";
import { useTransactions } from "@/hooks/useTransactions";
import {
  formatMonthYear,
  groupRowsByDay,
  inCalendarMonth,
  transactionsToRows,
} from "@/lib/transaction-display";
import { isSupabaseConfigured } from "@/lib/supabase-config";

export function TransactionsView() {
  const [txOpen, setTxOpen] = React.useState(false);
  const [cursor, setCursor] = React.useState(() => {
    const n = new Date();
    return { year: n.getFullYear(), month: n.getMonth() };
  });
  const [search, setSearch] = React.useState("");

  const { accounts, isLoading: accountsLoading } = useAccounts();
  const { categories, isLoading: categoriesLoading } = useCategories();
  const { transactions, isLoading: txLoading } = useTransactions();

  const live = isSupabaseConfigured();
  const loadingLists = live && (accountsLoading || categoriesLoading || txLoading);

  const monthTransactions = React.useMemo(() => {
    return transactions.filter((tx) =>
      inCalendarMonth(tx, cursor.year, cursor.month)
    );
  }, [transactions, cursor.year, cursor.month]);

  const rows = React.useMemo(() => {
    if (!live) return [];
    return transactionsToRows(monthTransactions, accounts, categories);
  }, [live, monthTransactions, accounts, categories]);

  const filteredRows = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.categoryLabel.toLowerCase().includes(q) ||
        r.accountLabel.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const groups = React.useMemo(
    () => groupRowsByDay(filteredRows),
    [filteredRows]
  );

  function prevMonth() {
    setCursor((c) => {
      const d = new Date(c.year, c.month - 1, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }

  function nextMonth() {
    setCursor((c) => {
      const d = new Date(c.year, c.month + 1, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }

  const monthLabel = formatMonthYear(cursor.year, cursor.month);

  return (
    <div className="flex-1">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Transactions
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              View all your income and spending transactions.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              className="gap-1.5 shrink-0"
              onClick={() => setTxOpen(true)}
            >
              <Plus className="size-4" aria-hidden />
              Add transaction
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon-sm"
                type="button"
                aria-label="Previous month"
                onClick={prevMonth}
                disabled={!live}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="min-w-[10rem] text-center text-sm font-medium tabular-nums">
                {monthLabel}
              </span>
              <Button
                variant="outline"
                size="icon-sm"
                type="button"
                aria-label="Next month"
                onClick={nextMonth}
                disabled={!live}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </header>

        <div className="relative mb-6">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            placeholder="Search transactions…"
            className="h-10 pl-9 border-border rounded-lg"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={!live}
            aria-describedby="search-hint"
          />
          <p id="search-hint" className="mt-1 text-xs text-muted-foreground">
            {live
              ? "Filter by title, category, or account."
              : "Configure Supabase to search your transactions."}
          </p>
        </div>

        {!live ? (
          <p className="rounded-xl border border-dashed border-border bg-muted/20 px-5 py-12 text-center text-sm text-muted-foreground">
            Configure Supabase to load and search your transactions.
          </p>
        ) : loadingLists ? (
          <div className="space-y-6">
            <Skeleton className="h-4 w-40" />
            <ul className="divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
              {Array.from({ length: 6 }).map((_, i) => (
                <li key={i} className="flex items-start gap-3 px-5 py-4">
                  <Skeleton className="size-9 shrink-0 rounded-lg" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-4 w-56" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                  <Skeleton className="h-4 w-20 shrink-0" />
                </li>
              ))}
            </ul>
          </div>
        ) : groups.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-muted/20 px-5 py-12 text-center text-sm text-muted-foreground">
            {monthTransactions.length === 0
              ? "No transactions this month."
              : "No matches for your search."}
          </p>
        ) : (
          <div className="space-y-6">
            {groups.map((group) => (
              <section key={group.dateKey}>
                <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground/70">
                  {group.heading}
                </h2>
                <ul className="divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
                  {group.items.map((row) => (
                    <TransactionListRow key={row.id} row={row} showAvatar />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>

      <AddTransactionSheet open={txOpen} onOpenChange={setTxOpen} />
    </div>
  );
}
