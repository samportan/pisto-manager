"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import { BudgetFormSheet } from "@/components/budget-form-sheet";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useBudgets } from "@/hooks/useBudgets";
import { useCategories } from "@/hooks/useCategories";
import { useTransactions } from "@/hooks/useTransactions";
import type { Transaction } from "@/lib/db/transactions";
import type { BudgetWithCategory } from "@/lib/db/budgets";

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function formatMonthLabel(year: number, monthIndex: number) {
  return new Date(Date.UTC(year, monthIndex, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** ISO `YYYY-MM-DD` lexicographic range overlap with [monthStart, monthEnd]. */
function budgetOverlapsMonth(
  startDate: string,
  endDate: string,
  year: number,
  monthIndex: number
): boolean {
  const pad = (n: number) => String(n).padStart(2, "0");
  const monthStart = `${year}-${pad(monthIndex + 1)}-01`;
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const monthEnd = `${year}-${pad(monthIndex + 1)}-${pad(lastDay)}`;
  return startDate <= monthEnd && endDate >= monthStart;
}

function sumExpenseForCategoryInMonth(
  transactions: Transaction[],
  categoryId: string,
  year: number,
  monthIndex: number
): number {
  const start = Date.UTC(year, monthIndex, 1, 0, 0, 0, 0);
  const end = Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999);
  return transactions
    .filter((t) => {
      if (t.type !== "expense" || t.category_id !== categoryId) return false;
      const ts = new Date(t.date).getTime();
      return ts >= start && ts <= end;
    })
    .reduce((s, t) => s + Number(t.amount), 0);
}

export function BudgetsView() {
  const now = new Date();
  const [y, setY] = React.useState(now.getFullYear());
  const [m, setM] = React.useState(now.getMonth());

  const {
    budgets,
    isLoading,
    createBudget,
    updateBudget,
    deleteBudget,
    isCreating,
    isUpdating,
    isDeleting,
  } = useBudgets();
  const { categories } = useCategories();
  const { transactions } = useTransactions();

  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<BudgetWithCategory | null>(null);

  const expenseCategories = React.useMemo(
    () => categories.filter((c) => c.type === "expense"),
    [categories]
  );

  const visibleBudgets = React.useMemo(
    () =>
      budgets.filter((b) =>
        budgetOverlapsMonth(b.start_date, b.end_date, y, m)
      ),
    [budgets, y, m]
  );

  const totalBudget = React.useMemo(
    () => visibleBudgets.reduce((s, b) => s + Number(b.amount), 0),
    [visibleBudgets]
  );

  const totalSpent = React.useMemo(() => {
    const ids = new Set(visibleBudgets.map((b) => b.category_id));
    let s = 0;
    for (const id of ids) {
      s += sumExpenseForCategoryInMonth(transactions, id, y, m);
    }
    return s;
  }, [visibleBudgets, transactions, y, m]);

  const overallPct =
    totalBudget > 0
      ? Math.min(100, Math.round((totalSpent / totalBudget) * 100))
      : 0;

  function shiftMonth(delta: number) {
    const d = new Date(Date.UTC(y, m + delta, 1));
    setY(d.getUTCFullYear());
    setM(d.getUTCMonth());
  }

  const isSaving = isCreating || isUpdating;

  return (
    <div className="flex-1">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Budgets</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Set and track spending limits by category.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon-sm"
              type="button"
              aria-label="Previous month"
              onClick={() => shiftMonth(-1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="min-w-[10rem] text-center text-sm font-medium tabular-nums">
              {formatMonthLabel(y, m)}
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              type="button"
              aria-label="Next month"
              onClick={() => shiftMonth(1)}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </header>

        <section className="mb-8 rounded-xl border border-border bg-card p-6">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            This month
          </p>
          <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-2xl font-bold tabular-nums text-foreground">
              {formatMoney(totalSpent)}
              <span className="text-base font-normal text-muted-foreground">
                {" "}
                / {formatMoney(totalBudget)}
              </span>
            </p>
            <span className="text-sm font-medium text-primary">
              {overallPct}% used
            </span>
          </div>
          <Progress value={overallPct} className="mt-4 h-2" />
        </section>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading budgets…</p>
        ) : visibleBudgets.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No budgets overlap this month. Add one or pick another month.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {visibleBudgets.map((row) => {
              const spent = sumExpenseForCategoryInMonth(
                transactions,
                row.category_id,
                y,
                m
              );
              const cap = Number(row.amount);
              const pct =
                cap > 0 ? Math.min(100, Math.round((spent / cap) * 100)) : 0;
              const isOverBudget = pct > 100;
              const label =
                row.categories?.name ?? "Category";
              return (
                <article
                  key={row.id}
                  className="group rounded-xl border border-border bg-card p-5 transition-colors hover:border-secondary/50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h2 className="font-semibold text-foreground">{label}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {formatMoney(spent)} of {formatMoney(cap)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <span
                        className={`text-sm font-bold tabular-nums ${isOverBudget ? "text-destructive" : "text-primary"}`}
                      >
                        {pct}%
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="opacity-70 group-hover:opacity-100"
                        aria-label={`Edit ${label}`}
                        onClick={() => {
                          setEditing(row);
                          setSheetOpen(true);
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                    </div>
                  </div>
                  <Progress value={pct} className="mt-4 h-2" />
                </article>
              );
            })}
          </div>
        )}

        <div className="mt-8 flex justify-end">
          <Button
            type="button"
            disabled={expenseCategories.length === 0}
            onClick={() => {
              setEditing(null);
              setSheetOpen(true);
            }}
          >
            Add budget
          </Button>
        </div>
      </div>

      <BudgetFormSheet
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) setEditing(null);
        }}
        editing={editing}
        expenseCategories={expenseCategories}
        viewYear={y}
        viewMonthIndex={m}
        onCreate={(values) => createBudget(values)}
        onUpdate={(id, values) => updateBudget(id, values)}
        onDelete={(id) => deleteBudget(id)}
        isSaving={isSaving}
        isDeleting={isDeleting}
      />
    </div>
  );
}
