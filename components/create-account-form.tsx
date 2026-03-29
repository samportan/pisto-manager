"use client";

import * as React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getAccountTypeIcon } from "@/lib/account-type-icons";
import {
  ACCOUNT_TYPES,
  creditFieldsForAccountType,
  parseOptionalNumberInput,
  type AccountType,
  type NewAccountFormValues,
} from "@/lib/db/accounts";

export type { NewAccountFormValues };

const COLOR_SWATCHES = [
  "#1e3a5f",
  "#2563eb",
  "#0d9488",
  "#ca8a04",
  "#c2410c",
  "#64748b",
] as const;

type CreateAccountFormProps = {
  id?: string;
  className?: string;
  submitLabel?: string;
  submitDisabled?: boolean;
  onSubmit?: (values: NewAccountFormValues) => void | Promise<void>;
  onCancel?: () => void;
};

export function CreateAccountForm({
  id = "create-account",
  className,
  submitLabel = "Create account",
  submitDisabled = false,
  onSubmit,
  onCancel,
}: CreateAccountFormProps) {
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<AccountType>(ACCOUNT_TYPES[0]);
  const [balance, setBalance] = React.useState("");
  const [color, setColor] = React.useState<string>(COLOR_SWATCHES[2]);
  const [isActive, setIsActive] = React.useState(true);
  const [creditLimit, setCreditLimit] = React.useState("");
  const [creditApr, setCreditApr] = React.useState("");
  const [creditMinPay, setCreditMinPay] = React.useState("");
  const [billingCycle, setBillingCycle] = React.useState("");
  const [dueDate, setDueDate] = React.useState("");

  const TypeIcon = getAccountTypeIcon(type);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseFloat(balance);
    const balanceNum = Number.isFinite(parsed) ? parsed : 0;
    const credit = creditFieldsForAccountType(type, {
      credit_limit: parseOptionalNumberInput(creditLimit),
      interest_rate: parseOptionalNumberInput(creditApr),
      minimum_payment: parseOptionalNumberInput(creditMinPay),
      billing_cycle: billingCycle.trim() || null,
      due_date: dueDate || null,
    });
    const payload: NewAccountFormValues = {
      name: name.trim(),
      type,
      balance: balanceNum,
      color,
      is_active: isActive,
      credit_limit: credit.credit_limit,
      interest_rate: credit.interest_rate,
      minimum_payment: credit.minimum_payment,
      billing_cycle: credit.billing_cycle,
      due_date: credit.due_date,
    };
    await onSubmit?.(payload);
  }

  return (
    <form
      id={id}
      onSubmit={handleSubmit}
      className={cn("flex flex-col gap-6", className)}
    >
      <div className="space-y-2">
        <Label htmlFor={`${id}-name`}>Name</Label>
        <Input
          id={`${id}-name`}
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Everyday checking"
          autoComplete="off"
          required
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor={`${id}-type`}>Type</Label>
          <TypeIcon className="size-4 text-muted-foreground" aria-hidden />
        </div>
        <select
          id={`${id}-type`}
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value as AccountType)}
          className="h-9 w-full rounded-lg border border-border bg-card/50 px-3 text-sm text-foreground outline-none transition-colors focus-visible:border-secondary focus-visible:ring-3 focus-visible:ring-secondary/30"
        >
          {ACCOUNT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t === "investment"
                ? "Investment"
                : t.charAt(0).toUpperCase() + t.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${id}-balance`}>
          {type === "credit" ? "Available to spend" : "Starting balance"}
        </Label>
        <Input
          id={`${id}-balance`}
          name="balance"
          type="number"
          inputMode="decimal"
          step="0.01"
          value={balance}
          onChange={(e) => setBalance(e.target.value)}
          placeholder="0.00"
        />
      </div>

      {type === "credit" ? (
        <div className="space-y-4 rounded-lg border border-border bg-muted/20 p-4">
          <p className="text-sm font-medium text-foreground">Credit card</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor={`${id}-credit-limit`}>Credit limit</Label>
              <Input
                id={`${id}-credit-limit`}
                inputMode="decimal"
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${id}-apr`}>APR (%)</Label>
              <Input
                id={`${id}-apr`}
                inputMode="decimal"
                value={creditApr}
                onChange={(e) => setCreditApr(e.target.value)}
                placeholder="e.g. 19.99"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${id}-min-pay`}>Minimum payment</Label>
              <Input
                id={`${id}-min-pay`}
                inputMode="decimal"
                value={creditMinPay}
                onChange={(e) => setCreditMinPay(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor={`${id}-billing`}>Billing cycle</Label>
              <Input
                id={`${id}-billing`}
                value={billingCycle}
                onChange={(e) => setBillingCycle(e.target.value)}
                placeholder="e.g. Monthly"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor={`${id}-due`}>Payment due date</Label>
              <Input
                id={`${id}-due`}
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>
        </div>
      ) : null}

      <div className="space-y-3">
        <Label>Color</Label>
        <div className="flex flex-wrap gap-2">
          {COLOR_SWATCHES.map((hex) => (
            <button
              key={hex}
              type="button"
              title={hex}
              onClick={() => setColor(hex)}
              className={cn(
                "size-9 rounded-lg border-2 transition-colors",
                color === hex
                  ? "border-foreground"
                  : "border-transparent ring-1 ring-border"
              )}
              style={{ backgroundColor: hex }}
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Input
            id={`${id}-color`}
            name="color"
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-9 w-14 cursor-pointer p-1"
          />
          <Input
            aria-label="Color hex"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            placeholder="#0d9488"
            className="font-mono text-xs uppercase"
          />
        </div>
      </div>

      <fieldset className="space-y-2 border-0 p-0">
        <legend className="mb-2 text-sm font-medium text-foreground">
          Status
        </legend>
        <div className="flex rounded-lg border border-border p-0.5">
          <button
            type="button"
            onClick={() => setIsActive(true)}
            className={cn(
              "flex-1 rounded-md py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Active
          </button>
          <button
            type="button"
            onClick={() => setIsActive(false)}
            className={cn(
              "flex-1 rounded-md py-2 text-sm font-medium transition-colors",
              !isActive
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Inactive
          </button>
        </div>
      </fieldset>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit" disabled={submitDisabled}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
