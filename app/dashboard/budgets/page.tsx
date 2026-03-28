import type { Metadata } from "next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { mockBudgetCategories } from "@/lib/mock-data";

export const metadata: Metadata = {
  title: "Budgets",
  description: "Spending limits by category",
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export default function BudgetsPage() {
  const totalBudget = mockBudgetCategories.reduce((s, c) => s + c.budget, 0);
  const totalSpent = mockBudgetCategories.reduce((s, c) => s + c.spent, 0);
  const overallPct =
    totalBudget > 0 ? Math.min(100, Math.round((totalSpent / totalBudget) * 100)) : 0;

  return (
    <div className="relative flex-1">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-1/4 top-0 h-[18rem] w-[18rem] rounded-full bg-emerald-400/10 blur-3xl dark:bg-emerald-500/6" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Budgets
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Category limits for the month — static preview.
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

        <section className="mb-8 rounded-2xl border border-border bg-card/80 p-6 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            This month
          </p>
          <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-2xl font-semibold tabular-nums">
              {formatMoney(totalSpent)}
              <span className="text-base font-normal text-muted-foreground">
                {" "}
                / {formatMoney(totalBudget)}
              </span>
            </p>
            <span className="text-sm text-muted-foreground">{overallPct}% used</span>
          </div>
          <Progress value={overallPct} className="mt-4 h-2" />
        </section>

        <div className="grid gap-4 sm:grid-cols-2">
          {mockBudgetCategories.map((cat) => {
            const pct =
              cat.budget > 0
                ? Math.min(100, Math.round((cat.spent / cat.budget) * 100))
                : 0;
            return (
              <article
                key={cat.id}
                className="rounded-2xl border border-border bg-card/80 p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="font-medium">{cat.name}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatMoney(cat.spent)} of {formatMoney(cat.budget)}
                    </p>
                  </div>
                  <span className="text-sm font-medium tabular-nums text-muted-foreground">
                    {pct}%
                  </span>
                </div>
                <Progress value={pct} className="mt-4 h-2" />
              </article>
            );
          })}
        </div>

        <div className="mt-8 flex justify-end">
          <Button type="button" disabled>
            Add budget
          </Button>
        </div>
      </div>
    </div>
  );
}
