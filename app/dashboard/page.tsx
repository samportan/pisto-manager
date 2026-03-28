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
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
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

        <section className="mb-6 rounded-xl border border-border bg-card p-6">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Net worth
          </p>
          <p className="mt-2 text-4xl font-bold tabular-nums tracking-tight sm:text-5xl text-primary">
            {formatMoney(mockNetWorth)}
          </p>
          <div className="mt-4 h-1 w-16 rounded-full bg-accent"></div>
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
            <p className="mt-2 text-2xl font-bold tabular-nums text-foreground">
              {formatMoney(mockNetWorth)}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              All accounts
            </p>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-secondary/30"></div>
          </article>

          <article className="rounded-xl border border-border bg-card p-5 relative overflow-hidden group hover:border-accent/50 transition-colors">
            <div className="flex items-start justify-between gap-3 mb-4">
              <span className="flex size-10 items-center justify-center rounded-lg bg-accent/15 text-accent group-hover:bg-accent/25 transition-colors">
                <PiggyBank className="size-5" aria-hidden />
              </span>
            </div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Savings
            </p>
            <p className="mt-2 text-2xl font-bold tabular-nums text-foreground">
              {formatMoney(mockSavingsTotal)}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Goals & pots
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
            <p className="mt-2 text-2xl font-bold tabular-nums text-foreground">
              {formatMoney(mockSpendThisMonth)}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              March spending
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
          <ul className="divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
            {mockRecentTransactions.map((tx) => (
              <li
                key={tx.id}
                className="flex flex-wrap items-center gap-3 px-5 py-4 hover:bg-muted/40 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">{tx.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{tx.date}</span>
                    <Badge variant="secondary" className="font-normal bg-accent/20 text-accent-foreground hover:bg-accent/30">
                      {tx.category}
                    </Badge>
                    <span>{tx.account}</span>
                  </div>
                </div>
                <p
                  className={cn(
                    "shrink-0 text-sm font-bold tabular-nums",
                    tx.amount >= 0 ? "text-accent" : "text-destructive"
                  )}
                >
                  {tx.amount >= 0 ? "+" : ""}{formatMoney(tx.amount)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <Button
        size="icon-lg"
        className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] right-4 z-30 size-12 rounded-full md:bottom-8 md:right-8 bg-accent hover:bg-accent/90 text-accent-foreground shadow-md hover:shadow-lg transition-all"
        type="button"
        aria-label="Add transaction"
      >
        <Plus className="size-5" aria-hidden />
      </Button>
    </div>
  );
}
