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

type SheetMode = "transaction" | "categories";

type AddTransactionSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AddTransactionSheet({
  open,
  onOpenChange,
}: AddTransactionSheetProps) {
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
    createTransaction,
    isCreating: isCreatingTx,
    createError: txCreateError,
  } = useTransactions();

  React.useEffect(() => {
    if (open) {
      setMode("transaction");
      setFormKey((k) => k + 1);
    }
  }, [open]);

  const live =
    isSupabaseConfigured() && isSessionReady;
  const listAccounts = live ? accounts : [];
  const listCategories = live ? categories : [];

  const disabled = !isSupabaseConfigured();
  const submitting = isCreatingTx || isCreatingCategory;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 overflow-hidden p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b border-border px-4 py-4 text-left shrink-0">
          <SheetTitle>
            {mode === "transaction" ? "New transaction" : "Categories"}
          </SheetTitle>
          <SheetDescription>
            {mode === "transaction"
              ? "Amount, account, category, and time — aligned with your data model."
              : "Create income and expense categories for your transactions."}
          </SheetDescription>
        </SheetHeader>
        <div className="overflow-y-auto overscroll-contain px-4 py-6 max-h-[calc(100dvh-8rem)]">
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
                  // keep panel open
                }
              }}
            />
          ) : (
            <AddTransactionForm
              key={formKey}
              id="add-transaction-sheet"
              accounts={listAccounts}
              categories={listCategories}
              submitLabel={isCreatingTx ? "Saving…" : "Save transaction"}
              submitDisabled={disabled || submitting}
              onManageCategories={() => setMode("categories")}
              onCancel={() => onOpenChange(false)}
              onSubmit={async (values) => {
                if (disabled) return;
                try {
                  await createTransaction(values);
                  onOpenChange(false);
                } catch {
                  // keep sheet open
                }
              }}
            />
          )}

          {disabled ? (
            <p className="mt-4 text-xs text-muted-foreground">
              Connect Supabase in your environment to save transactions and
              categories.
            </p>
          ) : null}

          {txCreateError && mode === "transaction" ? (
            <p className="mt-4 text-sm text-destructive" role="alert">
              {txCreateError.message}
            </p>
          ) : null}
          {categoryCreateError && mode === "categories" ? (
            <p
              className="mt-4 text-sm text-destructive"
              role="alert"
            >
              {categoryCreateError.message}
            </p>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
