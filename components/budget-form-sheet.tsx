"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { Category } from "@/lib/db/categories";
import {
  BUDGET_PERIODS,
  type BudgetFormValues,
  type BudgetPeriod,
  type BudgetWithCategory,
} from "@/lib/db/budgets";

function startOfMonthISO(year: number, monthIndex: number): string {
  const m = String(monthIndex + 1).padStart(2, "0");
  return `${year}-${m}-01`;
}

function endOfMonthISO(year: number, monthIndex: number): string {
  const d = new Date(Date.UTC(year, monthIndex + 1, 0));
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

type BudgetFormSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: BudgetWithCategory | null;
  expenseCategories: Category[];
  viewYear: number;
  viewMonthIndex: number;
  onCreate: (values: BudgetFormValues) => Promise<unknown>;
  onUpdate: (id: string, values: BudgetFormValues) => Promise<unknown>;
  onDelete?: (id: string) => Promise<unknown>;
  isSaving: boolean;
  isDeleting?: boolean;
};

export function BudgetFormSheet({
  open,
  onOpenChange,
  editing,
  expenseCategories,
  viewYear,
  viewMonthIndex,
  onCreate,
  onUpdate,
  onDelete,
  isSaving,
  isDeleting = false,
}: BudgetFormSheetProps) {
  const [categoryId, setCategoryId] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [period, setPeriod] = React.useState<BudgetPeriod>("monthly");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    if (editing) {
      setCategoryId(editing.category_id);
      setAmount(String(editing.amount));
      setPeriod(editing.period);
      setStartDate(editing.start_date);
      setEndDate(editing.end_date);
    } else {
      const first = expenseCategories[0]?.id ?? "";
      setCategoryId(first);
      setAmount("");
      setPeriod("monthly");
      setStartDate(startOfMonthISO(viewYear, viewMonthIndex));
      setEndDate(endOfMonthISO(viewYear, viewMonthIndex));
    }
  }, [open, editing, expenseCategories, viewYear, viewMonthIndex]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const n = Number.parseFloat(amount);
    if (!Number.isFinite(n) || n < 0 || !categoryId || !startDate || !endDate) {
      return;
    }
    const values: BudgetFormValues = {
      category_id: categoryId,
      amount: n,
      period,
      start_date: startDate,
      end_date: endDate,
    };
    if (editing) {
      await onUpdate(editing.id, values);
    } else {
      await onCreate(values);
    }
    onOpenChange(false);
  }

  const isEdit = Boolean(editing);
  const disableSubmit =
    isSaving ||
    !categoryId ||
    expenseCategories.length === 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit budget" : "New budget"}</SheetTitle>
          <SheetDescription>
            Set a spending limit for a category over a date range.
          </SheetDescription>
        </SheetHeader>
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="flex flex-1 flex-col gap-4 px-4 pb-4"
        >
          <div className="space-y-2">
            <Label htmlFor="budget-category">Category</Label>
            <select
              id="budget-category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              disabled={isSaving || expenseCategories.length === 0}
              className="h-9 w-full rounded-lg border border-border bg-card/50 px-3 text-sm text-foreground outline-none transition-colors focus-visible:border-secondary focus-visible:ring-3 focus-visible:ring-secondary/30 disabled:opacity-50"
            >
              {expenseCategories.length === 0 ? (
                <option value="">No expense categories</option>
              ) : (
                expenseCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))
              )}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="budget-amount">Amount</Label>
            <Input
              id="budget-amount"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              disabled={isSaving}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="budget-period">Period</Label>
            <select
              id="budget-period"
              value={period}
              onChange={(e) => setPeriod(e.target.value as BudgetPeriod)}
              disabled={isSaving}
              className="h-9 w-full rounded-lg border border-border bg-card/50 px-3 text-sm text-foreground outline-none transition-colors focus-visible:border-secondary focus-visible:ring-3 focus-visible:ring-secondary/30 disabled:opacity-50"
            >
              {BUDGET_PERIODS.map((p) => (
                <option key={p} value={p}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="budget-start">Start</Label>
              <Input
                id="budget-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={isSaving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="budget-end">End</Label>
              <Input
                id="budget-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={isSaving}
              />
            </div>
          </div>
          <SheetFooter className="flex-row flex-wrap gap-2 sm:justify-between">
            {isEdit && onDelete && editing ? (
              <Button
                type="button"
                variant="destructive"
                disabled={isDeleting || isSaving}
                onClick={() => {
                  if (
                    typeof window !== "undefined" &&
                    window.confirm("Delete this budget?")
                  ) {
                    void onDelete(editing.id).then(() => onOpenChange(false));
                  }
                }}
              >
                {isDeleting ? "Deleting…" : "Delete"}
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={disableSubmit}>
                {isSaving ? "Saving…" : isEdit ? "Save" : "Create"}
              </Button>
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
