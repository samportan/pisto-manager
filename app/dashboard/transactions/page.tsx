import type { Metadata } from "next";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { mockTransactionsByDate } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Transactions",
  description: "Income and spending",
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export default function TransactionsPage() {
  return (
    <div className="relative flex-1">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-1/4 top-0 h-[20rem] w-[20rem] rounded-full bg-violet-400/10 blur-3xl dark:bg-violet-500/6" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Transactions
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Demo list grouped by date — connect Supabase to sync live data.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon-sm"
              type="button"
              aria-label="Previous month"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="min-w-[10rem] text-center text-sm font-medium tabular-nums">
              March 2026
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              type="button"
              aria-label="Next month"
            >
              <ChevronRight className="size-4" />
            </Button>
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
            className="h-10 pl-9"
            disabled
            aria-describedby="search-hint"
          />
          <p id="search-hint" className="mt-1 text-xs text-muted-foreground">
            Search will be enabled when data is wired up.
          </p>
        </div>

        <div className="space-y-8">
          {mockTransactionsByDate.map((group) => (
            <section key={group.date}>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {group.date}
              </h2>
              <ul className="divide-y divide-border rounded-2xl border border-border bg-card/80">
                {group.items.map((tx) => (
                  <li
                    key={tx.id}
                    className="flex flex-wrap items-center gap-3 px-4 py-3 first:rounded-t-2xl last:rounded-b-2xl"
                  >
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                        {tx.title.slice(0, 1)}
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium">{tx.title}</p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="secondary" className="font-normal">
                            {tx.category}
                          </Badge>
                          <span>{tx.account}</span>
                        </div>
                      </div>
                    </div>
                    <p
                      className={cn(
                        "shrink-0 text-sm font-semibold tabular-nums",
                        tx.amount >= 0 && "text-emerald-600 dark:text-emerald-400"
                      )}
                    >
                      {formatMoney(tx.amount)}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
