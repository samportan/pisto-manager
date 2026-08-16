"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import { PendingLabel } from "@/components/ui/pending-label";
import { NativeSelect } from "@/components/ui/select-native";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/hooks/useTranslations";
import type { Expense } from "@/lib/db/expenses";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_PAYMENT_METHODS,
  EXPENSE_SUBCATEGORIES_BY_CATEGORY,
  type ExpenseCategory,
  type ExpensePaymentMethod,
  type NewExpense,
} from "@/lib/db/expenses";
import { formatMoneyInputValue, parseMoneyInput } from "@/lib/money";
import { toZonedDateString } from "@/lib/timezone";

type ExpenseFormValues = Omit<NewExpense, "user_id" | "organization_id">;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ExpenseFormValues) => Promise<void>;
  isSubmitting?: boolean;
  expense?: Expense | null;
};

export function AddExpenseSheet({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  expense,
}: Props) {
  const { t } = useT();
  const isEdit = Boolean(expense);
  const [amount, setAmount] = React.useState("");
  const [date, setDate] = React.useState(() => toZonedDateString(new Date()));
  const [category, setCategory] = React.useState<ExpenseCategory>("operating");
  const [subcategory, setSubcategory] = React.useState<string>(
    EXPENSE_SUBCATEGORIES_BY_CATEGORY.operating[0]
  );
  const [paymentMethod, setPaymentMethod] =
    React.useState<ExpensePaymentMethod>("petty_cash");
  const [isRecurring, setIsRecurring] = React.useState(false);
  const [notes, setNotes] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const subcategories = EXPENSE_SUBCATEGORIES_BY_CATEGORY[category];

  React.useEffect(() => {
    if (!open) return;
    if (expense) {
      setAmount(formatMoneyInputValue(expense.amount));
      setDate(toZonedDateString(expense.date));
      setCategory(expense.category);
      setSubcategory(expense.subcategory);
      setPaymentMethod(expense.payment_method);
      setIsRecurring(expense.is_recurring);
      setNotes(expense.notes ?? "");
    } else {
      setAmount("");
      setDate(toZonedDateString(new Date()));
      setCategory("operating");
      setSubcategory(EXPENSE_SUBCATEGORIES_BY_CATEGORY.operating[0]);
      setPaymentMethod("petty_cash");
      setIsRecurring(false);
      setNotes("");
    }
    setError(null);
  }, [open, expense]);

  React.useEffect(() => {
    if (!subcategories.includes(subcategory)) {
      setSubcategory(subcategories[0]);
    }
  }, [category, subcategory, subcategories]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseMoneyInput(amount);
    if (parsed == null || parsed <= 0) {
      setError(t("business.expenseAmountRequired"));
      return;
    }
    if (!date) {
      setError(t("business.expenseDateRequired"));
      return;
    }
    setError(null);
    try {
      await onSubmit({
        amount: parsed,
        date: new Date(`${date}T12:00:00`).toISOString(),
        category,
        subcategory,
        payment_method: paymentMethod,
        is_recurring: isRecurring,
        notes: notes.trim() || null,
      });
      onOpenChange(false);
    } catch {
      // keep open
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!isSubmitting) onOpenChange(o);
      }}
    >
      <SheetContent side="right" className="w-full gap-0 overflow-hidden p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border px-4 py-4 text-left">
          <SheetTitle>
            {isEdit ? t("business.editExpenseTitle") : t("business.newExpenseTitle")}
          </SheetTitle>
          <SheetDescription>
            {isEdit
              ? t("business.editExpenseDescription")
              : t("business.newExpenseDescription")}
          </SheetDescription>
        </SheetHeader>
        <form
          onSubmit={(e) => {
            void handleSubmit(e);
          }}
          className="flex max-h-[calc(100dvh-6rem)] flex-col"
        >
          <div className="space-y-4 overflow-y-auto overscroll-contain px-4 py-6">
            <fieldset disabled={isSubmitting} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="expense-amount">{t("business.amount")}</Label>
                <MoneyInput
                  id="expense-amount"
                  value={amount}
                  onChange={setAmount}
                  required
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expense-date">{t("business.expensePaymentDate")}</Label>
                <Input
                  id="expense-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expense-category">{t("business.expenseCategoryLabel")}</Label>
                <NativeSelect
                  id="expense-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                >
                  {EXPENSE_CATEGORIES.map((key) => (
                    <option key={key} value={key}>
                      {t(`business.expenseCategory.${key}`)}
                    </option>
                  ))}
                </NativeSelect>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expense-subcategory">{t("business.expenseSubcategoryLabel")}</Label>
                <NativeSelect
                  id="expense-subcategory"
                  value={subcategory}
                  onChange={(e) => setSubcategory(e.target.value)}
                >
                  {subcategories.map((key) => (
                    <option key={key} value={key}>
                      {t(`business.expenseSubcategory.${key}`)}
                    </option>
                  ))}
                </NativeSelect>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expense-payment-method">
                  {t("business.expensePaymentMethodLabel")}
                </Label>
                <NativeSelect
                  id="expense-payment-method"
                  value={paymentMethod}
                  onChange={(e) =>
                    setPaymentMethod(e.target.value as ExpensePaymentMethod)
                  }
                >
                  {EXPENSE_PAYMENT_METHODS.map((key) => (
                    <option key={key} value={key}>
                      {t(`business.expensePaymentMethod.${key}`)}
                    </option>
                  ))}
                </NativeSelect>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="size-4 rounded border-border"
                />
                {t("business.expenseIsRecurring")}
              </label>

              <div className="space-y-2">
                <Label htmlFor="expense-notes">{t("business.expenseNotes")}</Label>
                <Textarea
                  id="expense-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t("business.expenseNotesPlaceholder")}
                  rows={3}
                />
              </div>

              {error ? <p className="text-sm text-destructive">{error}</p> : null}
            </fieldset>
          </div>
          <SheetFooter className="mt-auto border-t border-border bg-card/50 px-4 py-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <PendingLabel label={t("common.saving")} spinnerClassName="size-3.5" />
              ) : (
                t("business.saveExpense")
              )}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
