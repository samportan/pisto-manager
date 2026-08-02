"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";
import { AddTransactionSheet } from "@/components/add-transaction-sheet";
import { EditTransactionSheet } from "@/components/edit-transaction-sheet";
import { TransactionListRow } from "@/components/transaction-list-row";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
import type { Transaction } from "@/lib/db/transactions";

function searchTokensFromQuery(q: string) {
  return q
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 0);
}

export function TransactionsView() {
  const [txOpen, setTxOpen] = React.useState(false);
  const [editTx, setEditTx] = React.useState<Transaction | null>(null);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [cursor, setCursor] = React.useState(() => {
    const n = new Date();
    return { year: n.getFullYear(), month: n.getMonth() };
  });
  const [search, setSearch] = React.useState("");

  const { accounts, isLoading: accountsLoading } = useAccounts();
  const { categories, isLoading: categoriesLoading } = useCategories();
  const searchTokens = React.useMemo(() => searchTokensFromQuery(search), [search]);
  const searchActive = searchTokens.length > 0;

  const monthRange = React.useMemo(() => {
    const from = new Date(cursor.year, cursor.month, 1);
    const to = new Date(cursor.year, cursor.month + 1, 0, 23, 59, 59, 999);
    return { from: from.toISOString(), to: to.toISOString() };
  }, [cursor.year, cursor.month]);

  const {
    transactions,
    isLoading: txLoading,
    deleteTransaction,
    isDeleting,
  } = useTransactions(searchActive ? { recentMonths: 60 } : monthRange);

  const live = isSupabaseConfigured();
  const loadingLists = live && (accountsLoading || categoriesLoading || txLoading);

  const monthTransactions = React.useMemo(() => {
    return transactions.filter((tx) =>
      inCalendarMonth(tx, cursor.year, cursor.month)
    );
  }, [transactions, cursor.year, cursor.month]);

  const baseTransactions = React.useMemo(() => {
    if (searchActive) return transactions;
    return monthTransactions;
  }, [searchActive, transactions, monthTransactions]);

  const txById = React.useMemo(() => {
    const m = new Map<string, Transaction>();
    for (const t of transactions) m.set(t.id, t);
    return m;
  }, [transactions]);

  React.useEffect(() => {
    if (editTx && !transactions.some((t) => t.id === editTx.id)) {
      setEditTx(null);
    }
  }, [transactions, editTx]);

  const rows = React.useMemo(() => {
    if (!live) return [];
    return transactionsToRows(baseTransactions, accounts, categories);
  }, [live, baseTransactions, accounts, categories]);

  const filteredRows = React.useMemo(() => {
    if (!searchActive) return rows;
    return rows.filter((r) =>
      searchTokens.every((tok) => r.searchText.includes(tok))
    );
  }, [rows, searchActive, searchTokens]);

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

  function openEdit(rowId: string) {
    const tx = txById.get(rowId);
    if (tx) setEditTx(tx);
  }

  return (
    <div className="flex-1">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Transactions
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Browse by month, or search across all dates. Edit or remove any row.
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

        <div className="relative mb-2">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            placeholder="Search title, account, category, amount, type, date…"
            className="h-10 pl-9 border-border rounded-lg"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={!live}
            aria-describedby="search-hint"
          />
        </div>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
          <p id="search-hint" className="text-xs text-muted-foreground">
            {live
              ? searchActive
                ? "Searching all dates. Use several words to narrow (all must match)."
                : "Showing this calendar month only. Type to search your full history."
              : "Configure Supabase to search your transactions."}
          </p>
          {live && searchActive ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => setSearch("")}>
              Clear search
            </Button>
          ) : null}
        </div>

        {searchActive && live ? (
          <p className="mb-4 text-sm text-muted-foreground">
            All dates · {filteredRows.length} result{filteredRows.length === 1 ? "" : "s"}
          </p>
        ) : null}

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
            {searchActive
              ? "No matches. Try fewer words or different spelling."
              : "No transactions this month."}
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
                    <TransactionListRow
                      key={row.id}
                      row={row}
                      showAvatar
                      onEdit={() => openEdit(row.id)}
                      onDelete={() => setDeleteId(row.id)}
                    />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>

      <AddTransactionSheet open={txOpen} onOpenChange={setTxOpen} />

      <EditTransactionSheet
        transaction={editTx}
        open={editTx != null}
        onOpenChange={(o) => {
          if (!o) setEditTx(null);
        }}
      />

      <ConfirmDialog
        open={deleteId != null}
        onOpenChange={(o) => {
          if (!o && !isDeleting) setDeleteId(null);
        }}
        title="Delete transaction?"
        description="Removed permanently. Net worth and budgets update on next refresh."
        confirmLabel="Delete"
        pendingLabel="Deleting…"
        variant="destructive"
        isPending={isDeleting}
        onConfirm={async () => {
          if (deleteId) await deleteTransaction(deleteId);
        }}
      />
    </div>
  );
}
