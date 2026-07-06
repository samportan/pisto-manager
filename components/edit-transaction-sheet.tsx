"use client";

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { AddTransactionForm } from "@/components/add-transaction-form";
import { ManageCategoriesPanel } from "@/components/manage-categories-panel";
import { useAccounts } from "@/hooks/useAccounts";
import { useCategories } from "@/hooks/useCategories";
import { useTransactions } from "@/hooks/useTransactions";
import { isSupabaseConfigured } from "@/lib/supabase-config";
import {
  transactionToFormValues,
  type Transaction,
} from "@/lib/db/transactions";

type SheetMode = "transaction" | "categories";

type EditTransactionSheetProps = {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function EditTransactionSheet({
  transaction,
  open,
  onOpenChange,
}: EditTransactionSheetProps) {
  const [mode, setMode] = React.useState<SheetMode>("transaction");
  const [formKey, setFormKey] = React.useState(0);

  const {
    accounts,
    isLoading: accountsLoading,
    isSessionReady,
  } = useAccounts();

  const {
    categories,
    isLoading: categoriesLoading,
    createCategory,
    isCreating: isCreatingCategory,
    createError: categoryCreateError,
  } = useCategories();

  const {
    updateTransaction,
    isUpdating,
    updateError,
  } = useTransactions();

  React.useEffect(() => {
    if (open) {
      setMode("transaction");
      setFormKey((k) => k + 1);
    }
  }, [open, transaction?.id]);

  const live = isSupabaseConfigured() && isSessionReady;
  const listAccounts = live ? accounts : [];
  const listCategories = live ? categories : [];

  const disabled = !isSupabaseConfigured();
  const submitting = isUpdating || isCreatingCategory;

  const defaultValues = React.useMemo(
    () => (transaction ? transactionToFormValues(transaction) : null),
    [transaction]
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 overflow-hidden p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b border-border px-4 py-4 text-left shrink-0">
          <SheetTitle>
            {mode === "transaction" ? "Edit transaction" : "Categories"}
          </SheetTitle>
          <SheetDescription>
            {mode === "transaction"
              ? "Update amount, accounts, category, or time."
              : "Create income and expense categories for your transactions."}
          </SheetDescription>
        </SheetHeader>
        <div className="max-h-[calc(100dvh-8rem)] overflow-y-auto overscroll-contain px-4 py-6">
          {accountsLoading || categoriesLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : mode === "categories" ? (
            <ManageCategoriesPanel
              categories={listCategories}
              onBack={() => setMode("transaction")}
              disabled={disabled}
              isSubmitting={isCreatingCategory}
              onCreate={async (values) => {
                if (disabled) return;
                try {
                  await createCategory(values);
                } catch {
                  // keep open
                }
              }}
            />
          ) : transaction ? (
            <AddTransactionForm
              key={`${transaction.id}-${formKey}`}
              id="edit-transaction-sheet"
              accounts={listAccounts}
              categories={listCategories}
              defaultValues={defaultValues}
              submitLabel={isUpdating ? "Saving…" : "Save changes"}
              submitDisabled={disabled || submitting}
              onManageCategories={() => setMode("categories")}
              onCancel={() => onOpenChange(false)}
              onSubmit={async (values) => {
                if (disabled || !transaction) return;
                try {
                  await updateTransaction(transaction.id, values);
                  onOpenChange(false);
                } catch {
                  // keep open
                }
              }}
            />
          ) : null}

          {disabled ? (
            <p className="mt-4 text-xs text-muted-foreground">
              Connect Supabase in your environment to save transactions.
            </p>
          ) : null}

          {updateError && mode === "transaction" ? (
            <p className="mt-4 text-sm text-destructive" role="alert">
              {updateError.message}
            </p>
          ) : null}
          {categoryCreateError && mode === "categories" ? (
            <p className="mt-4 text-sm text-destructive" role="alert">
              {categoryCreateError.message}
            </p>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
