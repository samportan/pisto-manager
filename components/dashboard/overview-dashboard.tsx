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
import { EditTransactionSheet } from "@/components/edit-transaction-sheet";
import {
  CategoryBreakdownChart,
  IncomeExpenseBarChart,
} from "@/components/dashboard/charts/overview-charts";
import { TransactionListRow } from "@/components/transaction-list-row";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAccounts } from "@/hooks/useAccounts";
import { useCategories } from "@/hooks/useCategories";
import { useFinancialSummary } from "@/hooks/useFinancialSummary";
import { useT } from "@/hooks/useTranslations";
import { useTransactions } from "@/hooks/useTransactions";
import {
  getExpensesByCategory,
  getLastNMonthsTotals,
  getMonthTotals,
  percentChange,
} from "@/lib/analytics/personal";
import { formatMoney } from "@/lib/format-money";
import { transactionsToRows } from "@/lib/transaction-display";
import { isSupabaseConfigured } from "@/lib/supabase-config";
import type { Transaction } from "@/lib/db/transactions";

function ChangeBadge({ value }: { value: number | null }) {
  const { t } = useT();
  if (value === null) return null;
  const up = value > 0;
  const down = value < 0;
  return (
    <span
      className={`text-xs font-medium tabular-nums ${
        up ? "text-destructive" : down ? "text-emerald-600" : "text-muted-foreground"
      }`}
    >
      {up ? "↑" : down ? "↓" : "—"} {Math.abs(value).toFixed(0)}% {t("dashboard.vsLastMonth")}
    </span>
  );
}

export function OverviewDashboard() {
  const { t, intlLocale, currency } = useT();
  const fmt = (v: number) => formatMoney(v, { currency, locale: intlLocale });

  const [txOpen, setTxOpen] = React.useState(false);
  const [editTx, setEditTx] = React.useState<Transaction | null>(null);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  const { accounts, isLoading: accountsLoading } = useAccounts();
  const { categories, isLoading: categoriesLoading } = useCategories();
  const {
    transactions,
    isLoading: txLoading,
    deleteTransaction,
    isDeleting,
    deleteError,
  } = useTransactions({ recentMonths: 8 });
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

  const now = new Date();
  const thisMonth = getMonthTotals(transactions, now.getUTCFullYear(), now.getUTCMonth());
  const prevDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const lastMonth = getMonthTotals(
    transactions,
    prevDate.getUTCFullYear(),
    prevDate.getUTCMonth()
  );
  const spentChange = percentChange(thisMonth.expense, lastMonth.expense);

  const chartMonths = React.useMemo(
    () => getLastNMonthsTotals(transactions, 6),
    [transactions]
  );

  const categoryMap = React.useMemo(
    () => new Map(categories.map((c) => [c.id, c.name])),
    [categories]
  );

  const categoryBreakdown = React.useMemo(
    () =>
      getExpensesByCategory(
        transactions,
        categoryMap,
        now.getUTCFullYear(),
        now.getUTCMonth()
      ),
    [transactions, categoryMap, now]
  );

  const recentRows = React.useMemo(() => {
    if (!live) return [];
    return transactionsToRows(transactions, accounts, categories).slice(0, 10);
  }, [live, transactions, accounts, categories]);

  const txById = React.useMemo(
    () => new Map(transactions.map((tx) => [tx.id, tx])),
    [transactions]
  );

  return (
    <div className="relative flex-1">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <section className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {t("dashboard.title")}
            </h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              {live ? t("dashboard.subtitleLive") : t("dashboard.subtitleDemo")}
            </p>
          </div>
          <Button
            size="sm"
            className="hidden shrink-0 gap-1.5 sm:inline-flex"
            type="button"
            onClick={() => setTxOpen(true)}
          >
            <Plus className="size-4" aria-hidden />
            {t("dashboard.addTransaction")}
          </Button>
        </section>

        <section className="mb-6 rounded-xl border border-border bg-card p-6">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("dashboard.netWorth")}
          </p>
          {live && loadingMetrics ? (
            <Skeleton className="mt-2 h-12 w-48 max-w-full sm:h-14 sm:w-56" />
          ) : live && summary ? (
            <p className="mt-2 text-4xl font-bold tabular-nums tracking-tight sm:text-5xl text-primary">
              {fmt(summary.totalNetWorth)}
            </p>
          ) : (
            <p className="mt-2 text-4xl font-bold tabular-nums tracking-tight sm:text-5xl text-muted-foreground">
              —
            </p>
          )}
          <div className="mt-4 h-1 w-16 rounded-full bg-accent" />
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
                {t("common.retry")}
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
              {t("dashboard.balance")}
            </p>
            {live && loadingMetrics ? (
              <Skeleton className="mt-2 h-8 w-28" />
            ) : live && summary ? (
              <p className="mt-2 text-2xl font-bold tabular-nums text-foreground">
                {fmt(summary.totalBalanceExcludingCreditAndLoans)}
              </p>
            ) : (
              <p className="mt-2 text-2xl font-bold tabular-nums text-muted-foreground">—</p>
            )}
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              {t("dashboard.balanceHint")}
            </p>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-secondary/30" />
          </article>

          <article className="rounded-xl border border-border bg-card p-5 relative overflow-hidden group hover:border-accent/50 transition-colors">
            <div className="flex items-start justify-between gap-3 mb-4">
              <span className="flex size-10 items-center justify-center rounded-lg bg-accent/15 text-accent group-hover:bg-accent/25 transition-colors">
                <CreditCard className="size-5" aria-hidden />
              </span>
            </div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("dashboard.creditAndLoans")}
            </p>
            {live && loadingMetrics ? (
              <Skeleton className="mt-2 h-8 w-28" />
            ) : live && summary && creditAndLoansBalance !== null ? (
              <p className="mt-2 text-2xl font-bold tabular-nums text-foreground">
                {fmt(creditAndLoansBalance)}
              </p>
            ) : (
              <p className="mt-2 text-2xl font-bold tabular-nums text-muted-foreground">—</p>
            )}
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              {t("dashboard.creditAndLoansHint")}
            </p>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-accent" />
          </article>

          <article className="rounded-xl border border-border bg-card p-5 relative overflow-hidden group hover:border-primary/50 transition-colors">
            <div className="flex items-start justify-between gap-3 mb-4">
              <span className="flex size-10 items-center justify-center rounded-lg bg-primary/15 text-primary group-hover:bg-primary/25 transition-colors">
                <LayoutDashboard className="size-5" aria-hidden />
              </span>
            </div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("dashboard.spentThisMonth")}
            </p>
            {live && loadingMetrics ? (
              <Skeleton className="mt-2 h-8 w-28" />
            ) : live && summary ? (
              <div className="mt-2 flex flex-wrap items-baseline gap-2">
                <p className="text-2xl font-bold tabular-nums text-destructive">
                  {fmt(summary.totalSpentThisMonth)}
                </p>
                <ChangeBadge value={spentChange} />
              </div>
            ) : (
              <p className="mt-2 text-2xl font-bold tabular-nums text-muted-foreground">—</p>
            )}
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              {t("dashboard.spentThisMonthHint")}
            </p>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary/40" />
          </article>
        </section>

        {live && !loadingLists && transactions.length > 0 ? (
          <section className="mb-10 grid gap-4 lg:grid-cols-2">
            <article className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-base font-semibold">{t("dashboard.incomeVsExpense")}</h2>
              <p className="mt-1 text-xs text-muted-foreground">{t("dashboard.last6Months")}</p>
              <div className="mt-4">
                <IncomeExpenseBarChart data={chartMonths} />
              </div>
            </article>
            <article className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-base font-semibold">{t("dashboard.byCategory")}</h2>
              <p className="mt-1 text-xs text-muted-foreground">{t("dashboard.thisMonth")}</p>
              <div className="mt-4">
                <CategoryBreakdownChart data={categoryBreakdown} />
              </div>
            </article>
          </section>
        ) : null}

        <section>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold tracking-tight">
              {t("dashboard.recentTransactions")}
            </h2>
            <Link
              href="/dashboard/transactions"
              className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              {t("dashboard.viewAll")}
            </Link>
          </div>
          {deleteError ? (
            <p className="mb-3 text-sm text-destructive" role="alert">
              {deleteError.message}
            </p>
          ) : null}
          {!live ? (
            <p className="rounded-xl border border-dashed border-border bg-muted/20 px-5 py-8 text-center text-sm text-muted-foreground">
              {t("dashboard.configureSupabase")}
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
              {t("dashboard.noTransactions")}
            </p>
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
              {recentRows.map((row) => (
                <TransactionListRow
                  key={row.id}
                  row={row}
                  onEdit={() => {
                    const tx = txById.get(row.id);
                    if (tx) setEditTx(tx);
                  }}
                  onDelete={() => setDeleteId(row.id)}
                />
              ))}
            </ul>
          )}
        </section>
      </div>

      <Button
        size="icon-lg"
        className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] right-4 z-30 size-12 rounded-full md:bottom-8 md:right-8 bg-accent hover:bg-accent/90 text-accent-foreground shadow-md hover:shadow-lg transition-all"
        type="button"
        aria-label={t("dashboard.addTransaction")}
        onClick={() => setTxOpen(true)}
      >
        <Plus className="size-5" aria-hidden />
      </Button>

      <AddTransactionSheet open={txOpen} onOpenChange={setTxOpen} />
      <EditTransactionSheet
        transaction={editTx}
        open={editTx != null}
        onOpenChange={(o) => !o && setEditTx(null)}
      />
      <ConfirmDialog
        open={deleteId != null}
        onOpenChange={(o) => {
          if (!o && !isDeleting) setDeleteId(null);
        }}
        title={t("transactions.deleteTitle")}
        description={t("transactions.deleteDescription")}
        confirmLabel={t("common.delete")}
        pendingLabel={t("common.deleting")}
        variant="destructive"
        isPending={isDeleting}
        onConfirm={async () => {
          if (deleteId) await deleteTransaction(deleteId);
          setDeleteId(null);
        }}
      />
    </div>
  );
}
