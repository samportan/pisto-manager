"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, Search, Trash2 } from "lucide-react";

import { AddExpenseSheet } from "@/components/business/add-expense-sheet";
import { DataTable } from "@/components/business/data-table";
import { PageHeader } from "@/components/business/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select-native";
import { useAppToast } from "@/hooks/useAppToast";
import { useExpenses } from "@/hooks/useExpenses";
import { useT } from "@/hooks/useTranslations";
import type { Expense, ExpenseCategory } from "@/lib/db/expenses";
import { formatMoneyDisplay } from "@/lib/format-money";
import { toZonedDateString } from "@/lib/timezone";

function categoryVariant(
  category: ExpenseCategory
): "secondary" | "outline" | "accent" {
  if (category === "operating") return "secondary";
  if (category === "financial") return "outline";
  return "accent";
}

export function ExpensesView() {
  const { t, intlLocale, currency } = useT();
  const toast = useAppToast();
  const fmt = (v: number) => formatMoneyDisplay(v, { currency, locale: intlLocale });
  const {
    expenses,
    createExpense,
    deleteExpense,
    isCreating,
    isDeleting,
    isLoading,
  } = useExpenses();
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState<ExpenseCategory | "all">(
    "all"
  );
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  const filtered = React.useMemo(() => {
    if (categoryFilter === "all") return expenses;
    return expenses.filter((e) => e.category === categoryFilter);
  }, [categoryFilter, expenses]);

  const columns = React.useMemo<ColumnDef<Expense>[]>(
    () => [
      {
        accessorKey: "date",
        header: t("business.date"),
        cell: ({ row }) => (
          <span className="tabular-nums text-sm">
            {toZonedDateString(row.original.date)}
          </span>
        ),
      },
      {
        accessorKey: "category",
        header: t("business.expenseCategoryLabel"),
        cell: ({ row }) => (
          <Badge variant={categoryVariant(row.original.category)}>
            {t(`business.expenseCategory.${row.original.category}`)}
          </Badge>
        ),
      },
      {
        accessorKey: "subcategory",
        header: t("business.expenseSubcategoryLabel"),
        cell: ({ row }) => (
          <span className="text-sm">
            {t(`business.expenseSubcategory.${row.original.subcategory}`)}
          </span>
        ),
      },
      {
        accessorKey: "amount",
        header: t("business.amount"),
        cell: ({ row }) => (
          <span className="font-medium tabular-nums">{fmt(row.original.amount)}</span>
        ),
      },
      {
        accessorKey: "payment_method",
        header: t("business.expensePaymentMethodLabel"),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {t(`business.expensePaymentMethod.${row.original.payment_method}`)}
          </span>
        ),
      },
      {
        id: "recurring",
        header: t("business.expenseRecurringShort"),
        cell: ({ row }) =>
          row.original.is_recurring ? (
            <Badge variant="outline">{t("common.yes")}</Badge>
          ) : (
            <span className="text-muted-foreground">{t("common.empty")}</span>
          ),
      },
      {
        id: "notes",
        accessorKey: "notes",
        header: t("business.notes"),
        cell: ({ row }) => (
          <span className="max-w-[10rem] truncate text-sm text-muted-foreground">
            {row.original.notes ?? t("common.empty")}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setDeleteId(row.original.id)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ),
      },
    ],
    [fmt, t]
  );

  return (
    <div className="flex-1">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <PageHeader
          title={t("business.expensesTitle")}
          description={t("business.expensesSubtitle")}
          actions={
            <Button
              type="button"
              size="sm"
              className="gap-1.5"
              onClick={() => setSheetOpen(true)}
            >
              <Plus className="size-4" aria-hidden />
              {t("business.newExpense")}
            </Button>
          }
        />

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1 space-y-1.5">
            <label htmlFor="expenses-search" className="text-xs text-muted-foreground">
              {t("common.search")}
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                id="expenses-search"
                type="search"
                placeholder={t("business.searchExpenses")}
                className="h-10 pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5 sm:w-56">
            <label
              htmlFor="expenses-category-filter"
              className="text-xs text-muted-foreground"
            >
              {t("business.expenseCategoryLabel")}
            </label>
            <NativeSelect
              id="expenses-category-filter"
              value={categoryFilter}
              onChange={(e) =>
                setCategoryFilter(e.target.value as ExpenseCategory | "all")
              }
            >
              <option value="all">{t("business.allCategories")}</option>
              <option value="operating">
                {t("business.expenseCategory.operating")}
              </option>
              <option value="financial">
                {t("business.expenseCategory.financial")}
              </option>
              <option value="personal">
                {t("business.expenseCategory.personal")}
              </option>
            </NativeSelect>
          </div>
        </div>

        <DataTable
          data={filtered}
          columns={columns}
          globalFilter={search}
          isLoading={isLoading}
          emptyLabel={
            expenses.length === 0
              ? t("business.noExpenses")
              : t("business.noExpensesMatch")
          }
        />
      </div>

      <AddExpenseSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        isSubmitting={isCreating}
        onSubmit={async (values) => {
          try {
            await createExpense(values);
            toast.success("toast.expenseSaved");
            setSheetOpen(false);
          } catch (e) {
            toast.errorFrom(e);
            throw e;
          }
        }}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => {
          if (!o && !isDeleting) setDeleteId(null);
        }}
        title={t("business.removeExpenseTitle")}
        description={t("business.removeExpenseDescription")}
        confirmLabel={t("business.remove")}
        pendingLabel={t("common.deleting")}
        variant="destructive"
        isPending={isDeleting}
        onConfirm={async () => {
          if (deleteId) {
            await deleteExpense(deleteId);
            toast.success("toast.expenseDeleted");
          }
        }}
        onError={(err) => toast.errorFrom(err, "delete")}
      />
    </div>
  );
}
