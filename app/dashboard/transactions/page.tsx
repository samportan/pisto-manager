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
            className="h-10 pl-9 border-border rounded-lg"
            disabled
            aria-describedby="search-hint"
          />
          <p id="search-hint" className="mt-1 text-xs text-muted-foreground">
            Search enabled with live data.
          </p>
        </div>

        <div className="space-y-6">
          {mockTransactionsByDate.map((group) => (
            <section key={group.date}>
              <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground/70">
                {group.date}
              </h2>
              <ul className="divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
                {group.items.map((tx) => (
                  <li
                    key={tx.id}
                    className="flex flex-wrap items-center gap-3 px-5 py-4 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <span className="mt-1 flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary/15 text-xs font-bold text-secondary">
                        {tx.title.slice(0, 1).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">{tx.title}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="secondary" className="font-normal bg-accent/20 text-accent-foreground hover:bg-accent/30">
                            {tx.category}
                          </Badge>
                          <span>{tx.account}</span>
                        </div>
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
          ))}
        </div>
      </div>
    </div>
  );
}
