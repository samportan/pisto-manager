"use client";

import * as React from "react";
import Link from "next/link";
import {
  CreditCard,
  LayoutDashboard,
  Plus,
  Wallet,
} from "lucide-react";
import { AddTransactionSheet } from "@/components/add-transaction-sheet";
import { TransactionListRow } from "@/components/transaction-list-row";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAccounts } from "@/hooks/useAccounts";
import { useCategories } from "@/hooks/useCategories";
import { useFinancialSummary } from "@/hooks/useFinancialSummary";
import { useTransactions } from "@/hooks/useTransactions";
import { transactionsToRows } from "@/lib/transaction-display";
import { isSupabaseConfigured } from "@/lib/supabase-config";

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export function OverviewDashboard() {
  const [txOpen, setTxOpen] = React.useState(false);

  const { accounts, isLoading: accountsLoading } = useAccounts();
  const { categories, isLoading: categoriesLoading } = useCategories();
  const { transactions, isLoading: txLoading } = useTransactions();
  const {
    summary,
    isLoading: summaryLoading,
    error: summaryError,
    refetch: refetchSummary,
  } = useFinancialSummary();

  const live = isSupabaseConfigured();
  const loadingLists = live && (accountsLoading || categoriesLoading || txLoading);
  const loadingMetrics = live && summaryLoading;

  const creditAndLoansBalance = summary
    ? summary.totalNetWorth - summary.totalBalanceExcludingCreditAndLoans
    : null;

  const recentRows = React.useMemo(() => {
    if (!live) return [];
    return transactionsToRows(transactions, accounts, categories).slice(0, 10);
  }, [live, transactions, accounts, categories]);

  return (
    <div className="relative flex-1">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <section className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Overview
            </h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              {live
                ? "Snapshot of your money and latest activity."
                : "Snapshot of your money — connect Supabase for live data."}
            </p>
          </div>
          <Button
            size="sm"
            className="hidden shrink-0 gap-1.5 sm:inline-flex"
            type="button"
            onClick={() => setTxOpen(true)}
          >
            <Plus className="size-4" aria-hidden />
            Add transaction
          </Button>
        </section>

        <section className="mb-6 rounded-xl border border-border bg-card p-6">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Net worth
          </p>
          {live && loadingMetrics ? (
            <Skeleton className="mt-2 h-12 w-48 max-w-full sm:h-14 sm:w-56" />
          ) : live && summary ? (
            <p className="mt-2 text-4xl font-bold tabular-nums tracking-tight sm:text-5xl text-primary">
              {formatMoney(summary.totalNetWorth)}
            </p>
          ) : (
            <p className="mt-2 text-4xl font-bold tabular-nums tracking-tight sm:text-5xl text-muted-foreground">
              —
            </p>
          )}
          <div className="mt-4 h-1 w-16 rounded-full bg-accent"></div>
          {summaryError && live ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <p className="text-sm text-destructive" role="alert">
                {summaryError.message}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void refetchSummary()}
              >
                Retry
              </Button>
            </div>
          ) : null}
        </section>

        <section className="mb-10 grid gap-4 sm:grid-cols-3">
          <article className="rounded-xl border border-border bg-card p-5 relative overflow-hidden group hover:border-secondary/50 transition-colors">
            <div className="flex items-start justify-between gap-3 mb-4">
              <span className="flex size-10 items-center justify-center rounded-lg bg-secondary/15 text-secondary group-hover:bg-secondary/25 transition-colors">
                <Wallet className="size-5" aria-hidden />
              </span>
            </div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Balance
            </p>
            {live && loadingMetrics ? (
              <Skeleton className="mt-2 h-8 w-28" />
            ) : live && summary ? (
              <p className="mt-2 text-2xl font-bold tabular-nums text-foreground">
                {formatMoney(summary.totalBalanceExcludingCreditAndLoans)}
              </p>
            ) : (
              <p className="mt-2 text-2xl font-bold tabular-nums text-muted-foreground">
                —
              </p>
            )}
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              Excluding credit cards &amp; loans
            </p>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-secondary/30"></div>
          </article>

          <article className="rounded-xl border border-border bg-card p-5 relative overflow-hidden group hover:border-accent/50 transition-colors">
            <div className="flex items-start justify-between gap-3 mb-4">
              <span className="flex size-10 items-center justify-center rounded-lg bg-accent/15 text-accent group-hover:bg-accent/25 transition-colors">
                <CreditCard className="size-5" aria-hidden />
              </span>
            </div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Credit &amp; loans
            </p>
            {live && loadingMetrics ? (
              <Skeleton className="mt-2 h-8 w-28" />
            ) : live && summary && creditAndLoansBalance !== null ? (
              <p className="mt-2 text-2xl font-bold tabular-nums text-foreground">
                {formatMoney(creditAndLoansBalance)}
              </p>
            ) : (
              <p className="mt-2 text-2xl font-bold tabular-nums text-muted-foreground">
                —
              </p>
            )}
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              Balances on credit &amp; loan accounts
            </p>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-accent"></div>
          </article>

          <article className="rounded-xl border border-border bg-card p-5 relative overflow-hidden group hover:border-primary/50 transition-colors">
            <div className="flex items-start justify-between gap-3 mb-4">
              <span className="flex size-10 items-center justify-center rounded-lg bg-primary/15 text-primary group-hover:bg-primary/25 transition-colors">
                <LayoutDashboard className="size-5" aria-hidden />
              </span>
            </div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Spent this month
            </p>
            {live && loadingMetrics ? (
              <Skeleton className="mt-2 h-8 w-28" />
            ) : live && summary ? (
              <p className="mt-2 text-2xl font-bold tabular-nums text-destructive">
                {formatMoney(summary.totalSpentThisMonth)}
              </p>
            ) : (
              <p className="mt-2 text-2xl font-bold tabular-nums text-muted-foreground">
                —
              </p>
            )}
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              Expenses (UTC month)
            </p>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary/40"></div>
          </article>
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold tracking-tight">
              Recent transactions
            </h2>
            <Link
              href="/dashboard/transactions"
              className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              View all
            </Link>
          </div>
          {!live ? (
            <p className="rounded-xl border border-dashed border-border bg-muted/20 px-5 py-8 text-center text-sm text-muted-foreground">
              Configure Supabase to load your transactions here.
            </p>
          ) : loadingLists ? (
            <ul className="divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
              {Array.from({ length: 5 }).map((_, i) => (
                <li key={i} className="flex items-center gap-3 px-5 py-4">
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-4 w-16 shrink-0" />
                </li>
              ))}
            </ul>
          ) : recentRows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border bg-muted/20 px-5 py-8 text-center text-sm text-muted-foreground">
              No transactions yet. Add one with the button above.
            </p>
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
              {recentRows.map((row) => (
                <TransactionListRow key={row.id} row={row} />
              ))}
            </ul>
          )}
        </section>
      </div>

      <Button
        size="icon-lg"
        className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] right-4 z-30 size-12 rounded-full md:bottom-8 md:right-8 bg-accent hover:bg-accent/90 text-accent-foreground shadow-md hover:shadow-lg transition-all"
        type="button"
        aria-label="Add transaction"
        onClick={() => setTxOpen(true)}
      >
        <Plus className="size-5" aria-hidden />
      </Button>

      <AddTransactionSheet open={txOpen} onOpenChange={setTxOpen} />
    </div>
  );
}
