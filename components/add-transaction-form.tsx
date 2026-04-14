"use client";

import * as React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Account } from "@/lib/db/accounts";
import type { Category } from "@/lib/db/categories";
import {
  TRANSACTION_TYPES,
  type TransactionType,
  type NewTransactionFormValues,
} from "@/lib/db/transactions";

export type { NewTransactionFormValues };

function localDateTimeInputValue(d = new Date()) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function parseDateTimeToIso(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return new Date().toISOString();
  }
  return d.toISOString();
}

type AddTransactionFormProps = {
  id?: string;
  className?: string;
  accounts: Account[];
  categories: Category[];
  submitLabel?: string;
  submitDisabled?: boolean;
  onSubmit?: (values: NewTransactionFormValues) => void | Promise<void>;
  onCancel?: () => void;
  onManageCategories?: () => void;
};

export function AddTransactionForm({
  id = "add-transaction",
  className,
  accounts,
  categories,
  submitLabel = "Save",
  submitDisabled = false,
  onSubmit,
  onCancel,
  onManageCategories,
}: AddTransactionFormProps) {
  const [type, setType] = React.useState<TransactionType>("expense");
  const [amount, setAmount] = React.useState("");
  const [dateLocal, setDateLocal] = React.useState(() =>
    localDateTimeInputValue()
  );
  const [accountId, setAccountId] = React.useState("");
  const [destinationId, setDestinationId] = React.useState("");
  const [categoryId, setCategoryId] = React.useState("");
  const [description, setDescription] = React.useState("");

  const activeAccounts = React.useMemo(
    () => accounts.filter((a) => a.is_active),
    [accounts]
  );

  React.useEffect(() => {
    if (!accountId && activeAccounts.length > 0) {
      setAccountId(activeAccounts[0].id);
    }
  }, [accountId, activeAccounts]);

  const categoryTypeFilter: "income" | "expense" | null =
    type === "transfer" ? null : type;

  const filteredCategories = React.useMemo(() => {
    if (!categoryTypeFilter) return [];
    return categories.filter((c) => c.type === categoryTypeFilter);
  }, [categories, categoryTypeFilter]);

  React.useEffect(() => {
    if (type === "transfer") {
      setCategoryId("");
      return;
    }
    const stillValid = filteredCategories.some((c) => c.id === categoryId);
    if (!stillValid) {
      setCategoryId(filteredCategories[0]?.id ?? "");
    }
  }, [type, filteredCategories, categoryId]);

  const destinationChoices = React.useMemo(
    () => activeAccounts.filter((a) => a.id !== accountId),
    [activeAccounts, accountId]
  );

  React.useEffect(() => {
    if (type !== "transfer") {
      setDestinationId("");
      return;
    }
    const first = destinationChoices[0]?.id ?? "";
    if (!destinationChoices.some((a) => a.id === destinationId)) {
      setDestinationId(first);
    }
  }, [type, destinationChoices, destinationId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = Number.parseFloat(amount.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed <= 0) return;

    if (type === "transfer") {
      if (!destinationId || destinationId === accountId) return;
      const payload: NewTransactionFormValues = {
        account_id: accountId,
        category_id: null,
        type: "transfer",
        amount: parsed,
        date: parseDateTimeToIso(dateLocal),
        destination_account_id: destinationId,
        description: description.trim() || null,
      };
      await onSubmit?.(payload);
      return;
    }

    if (!categoryId) return;

    const payload: NewTransactionFormValues = {
      account_id: accountId,
      category_id: categoryId,
      type,
      amount: parsed,
      date: parseDateTimeToIso(dateLocal),
      destination_account_id: null,
      description: description.trim() || null,
    };
    await onSubmit?.(payload);
  }

  const canSubmit =
    activeAccounts.length > 0 &&
    (type === "transfer"
      ? destinationId && destinationId !== accountId
      : Boolean(categoryId));

  return (
    <form
      id={id}
      onSubmit={handleSubmit}
      className={cn("flex flex-col gap-5", className)}
    >
      <div className="space-y-2">
        <Label className="text-foreground">Type</Label>
        <div className="grid grid-cols-3 gap-1.5 rounded-lg border border-border p-1">
          {TRANSACTION_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={cn(
                "rounded-md py-2 text-xs font-medium transition-colors sm:text-sm",
                type === t
                  ? "bg-muted text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t === "income"
                ? "Income"
                : t === "expense"
                  ? "Expense"
                  : "Transfer"}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${id}-amount`}>Amount</Label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            $
          </span>
          <Input
            id={`${id}-amount`}
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            className="pl-7 tabular-nums"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            required
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Enter a positive amount; type sets whether it is income or spending.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${id}-date`}>Date & time</Label>
        <Input
          id={`${id}-date`}
          type="datetime-local"
          value={dateLocal}
          onChange={(e) => setDateLocal(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${id}-account`}>Account</Label>
        <select
          id={`${id}-account`}
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          disabled={activeAccounts.length === 0}
          className="h-9 w-full rounded-lg border border-border bg-card/50 px-3 text-sm text-foreground outline-none transition-colors focus-visible:border-secondary focus-visible:ring-3 focus-visible:ring-secondary/30 disabled:opacity-50"
        >
          {activeAccounts.length === 0 ? (
            <option value="">No active accounts</option>
          ) : (
            activeAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))
          )}
        </select>
      </div>

      {type === "transfer" ? (
        <div className="space-y-2">
          <Label htmlFor={`${id}-dest`}>To account</Label>
          <select
            id={`${id}-dest`}
            value={destinationId}
            onChange={(e) => setDestinationId(e.target.value)}
            disabled={destinationChoices.length === 0}
            className="h-9 w-full rounded-lg border border-border bg-card/50 px-3 text-sm text-foreground outline-none transition-colors focus-visible:border-secondary focus-visible:ring-3 focus-visible:ring-secondary/30 disabled:opacity-50"
          >
            {destinationChoices.length === 0 ? (
              <option value="">Add another account</option>
            ) : (
              destinationChoices.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))
            )}
          </select>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label htmlFor={`${id}-category`}>Category</Label>
            {onManageCategories ? (
              <button
                type="button"
                onClick={onManageCategories}
                className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
              >
                Manage categories
              </button>
            ) : null}
          </div>
          <select
            id={`${id}-category`}
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            disabled={filteredCategories.length === 0}
            className="h-9 w-full rounded-lg border border-border bg-card/50 px-3 text-sm text-foreground outline-none transition-colors focus-visible:border-secondary focus-visible:ring-3 focus-visible:ring-secondary/30 disabled:opacity-50"
          >
            {filteredCategories.length === 0 ? (
              <option value="">Create a category first</option>
            ) : (
              filteredCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))
            )}
          </select>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor={`${id}-desc`}>Description</Label>
        <textarea
          id={`${id}-desc`}
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional note"
          className="w-full min-h-[4.5rem] resize-y rounded-lg border border-border bg-card/50 px-3 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-secondary focus-visible:ring-3 focus-visible:ring-secondary/30 md:text-sm"
        />
      </div>

      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        <Button
          type="submit"
          disabled={submitDisabled || !canSubmit}
        >
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
