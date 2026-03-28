import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  LayoutDashboard,
  PiggyBank,
  Plus,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  mockNetWorth,
  mockRecentTransactions,
  mockSavingsTotal,
  mockSpendThisMonth,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Overview",
  description: "Your Pisto overview",
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export default function DashboardPage() {
  return (
    <div className="relative flex-1">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-1/4 top-0 h-[24rem] w-[24rem] rounded-full bg-violet-400/12 blur-3xl dark:bg-violet-500/8" />
        <div className="absolute -right-1/4 bottom-0 h-[20rem] w-[20rem] rounded-full bg-emerald-400/10 blur-3xl dark:bg-emerald-500/6" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <section className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Overview
            </h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Snapshot of your money — static preview until data is connected.
            </p>
          </div>
          <Button
            size="sm"
            className="hidden shrink-0 gap-1.5 sm:inline-flex"
            type="button"
          >
            <Plus className="size-4" aria-hidden />
            Add transaction
          </Button>
        </section>

        <section className="mb-6 rounded-2xl border border-border bg-card/80 p-6 shadow-sm backdrop-blur-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Net worth
          </p>
          <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight sm:text-4xl">
            {formatMoney(mockNetWorth)}
          </p>
        </section>

        <section className="mb-10 grid gap-4 sm:grid-cols-3">
          <article className="rounded-2xl border border-border bg-card/80 p-5 shadow-sm backdrop-blur-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="flex size-9 items-center justify-center rounded-lg bg-violet-500/10 text-violet-700 dark:text-violet-300">
                <Wallet className="size-4" aria-hidden />
              </span>
              <ArrowUpRight className="size-4 text-muted-foreground" aria-hidden />
            </div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Balance (all accounts)
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {formatMoney(mockNetWorth)}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Demo total across linked accounts.
            </p>
          </article>

          <article className="rounded-2xl border border-border bg-card/80 p-5 shadow-sm backdrop-blur-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                <PiggyBank className="size-4" aria-hidden />
              </span>
              <ArrowUpRight className="size-4 text-muted-foreground" aria-hidden />
            </div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Savings
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {formatMoney(mockSavingsTotal)}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Goals and pots (sample).
            </p>
          </article>

          <article className="rounded-2xl border border-border bg-card/80 p-5 shadow-sm backdrop-blur-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="flex size-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-800 dark:text-amber-200">
                <LayoutDashboard className="size-4" aria-hidden />
              </span>
              <ArrowUpRight className="size-4 text-muted-foreground" aria-hidden />
            </div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              This month spent
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {formatMoney(mockSpendThisMonth)}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Rolling demo spend for March.
            </p>
          </article>
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold tracking-tight">
              Recent transactions
            </h2>
            <Link
              href="/dashboard/transactions"
              className="text-sm font-medium text-primary hover:underline"
            >
              See all
            </Link>
          </div>
          <ul className="divide-y divide-border rounded-2xl border border-border bg-card/80">
            {mockRecentTransactions.map((tx) => (
              <li
                key={tx.id}
                className="flex flex-wrap items-center gap-3 px-4 py-3 first:rounded-t-2xl last:rounded-b-2xl"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{tx.title}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{tx.date}</span>
                    <Badge variant="secondary" className="font-normal">
                      {tx.category}
                    </Badge>
                    <span>{tx.account}</span>
                  </div>
                </div>
                <p
                  className={cn(
                    "shrink-0 text-sm font-semibold tabular-nums",
                    tx.amount >= 0 ? "text-emerald-600 dark:text-emerald-400" : ""
                  )}
                >
                  {formatMoney(tx.amount)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <Button
        size="icon-lg"
        className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] right-4 z-30 size-12 rounded-full shadow-lg md:bottom-8 md:right-8"
        type="button"
        aria-label="Add transaction"
      >
        <Plus className="size-5" aria-hidden />
      </Button>
    </div>
  );
}
