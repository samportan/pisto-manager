"use client";

import * as React from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil } from "lucide-react";
import { accountKeys } from "@/hooks/useAccounts";
import { getAccountTypeIcon } from "@/lib/account-type-icons";
import {
  ACCOUNT_TYPES,
  creditFieldsForAccountType,
  parseOptionalNumberInput,
  type Account,
  type AccountType,
  updateAccount,
} from "@/lib/db/accounts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const COLOR_SWATCHES = [
  "#1e3a5f",
  "#2563eb",
  "#0d9488",
  "#ca8a04",
  "#c2410c",
  "#64748b",
] as const;

function formatMoney(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(value);
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(new Date(iso));
}

function normalizeColor(hex: string) {
  const t = hex.trim().toLowerCase();
  return /^#[0-9a-f]{6}$/i.test(t) ? t : hex;
}

function displayColor(account: Account) {
  return account.color ?? "#64748b";
}

export function AccountDetailPanel({ account: initial }: { account: Account }) {
  const queryClient = useQueryClient();
  const [local, setLocal] = React.useState<Account>(initial);
  const [isEditing, setIsEditing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<AccountType>(ACCOUNT_TYPES[0]);
  const [balance, setBalance] = React.useState("");
  const [color, setColor] = React.useState("#0d9488");
  const [isActive, setIsActive] = React.useState(true);
  const [creditLimit, setCreditLimit] = React.useState("");
  const [creditApr, setCreditApr] = React.useState("");
  const [creditMinPay, setCreditMinPay] = React.useState("");
  const [billingCycle, setBillingCycle] = React.useState("");
  const [dueDate, setDueDate] = React.useState("");

  React.useEffect(() => {
    setLocal(initial);
  }, [initial]);

  function openEdit() {
    setName(local.name);
    setType(local.type);
    setBalance(String(local.balance));
    setColor(displayColor(local));
    setIsActive(local.is_active);
    setCreditLimit(
      local.credit_limit != null ? String(local.credit_limit) : ""
    );
    setCreditApr(
      local.interest_rate != null ? String(local.interest_rate) : ""
    );
    setCreditMinPay(
      local.minimum_payment != null ? String(local.minimum_payment) : ""
    );
    setBillingCycle(local.billing_cycle ?? "");
    setDueDate(local.due_date ? local.due_date.slice(0, 10) : "");
    setSaveError(null);
    setIsEditing(true);
  }

  function closeEdit() {
    setIsEditing(false);
    setSaveError(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      const parsed = parseFloat(balance);
      const balanceNum = Number.isFinite(parsed) ? parsed : local.balance;
      const credit = creditFieldsForAccountType(type, {
        credit_limit: parseOptionalNumberInput(creditLimit),
        interest_rate: parseOptionalNumberInput(creditApr),
        minimum_payment: parseOptionalNumberInput(creditMinPay),
        billing_cycle: billingCycle.trim() || null,
        due_date: dueDate || null,
      });
      const updated = await updateAccount(local.id, {
        name: name.trim(),
        type,
        balance: balanceNum,
        color: normalizeColor(color),
        is_active: isActive,
        ...credit,
      });
      if (updated) {
        setLocal(updated);
        void queryClient.invalidateQueries({
          queryKey: accountKeys.all(local.user_id),
        });
        setIsEditing(false);
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not save changes.");
    } finally {
      setSaving(false);
    }
  }

  const ViewTypeIcon = getAccountTypeIcon(local.type);
  const EditTypeIcon = getAccountTypeIcon(type);

  return (
    <div className="flex-1">
      <div className="mx-auto max-w-lg px-4 py-8 sm:px-6">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 mb-6 gap-1.5 text-muted-foreground hover:text-foreground"
          render={<Link href="/dashboard/accounts" />}
        >
          <ArrowLeft className="size-4" aria-hidden />
          Accounts
        </Button>

        {!isEditing ? (
          <>
            <header className="border-b border-border pb-8">
              <div className="flex items-start gap-4">
                <span
                  className="flex size-14 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-foreground"
                  style={{ borderColor: `${displayColor(local)}40` }}
                >
                  <ViewTypeIcon className="size-7" aria-hidden />
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-2xl font-bold tracking-tight text-foreground">
                        {local.name}
                      </h1>
                      <Badge variant={local.is_active ? "secondary" : "outline"}>
                        {local.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5 shrink-0"
                      onClick={openEdit}
                    >
                      <Pencil className="size-3.5" aria-hidden />
                      Edit
                    </Button>
                  </div>
                  <p className="mt-1 text-sm capitalize text-muted-foreground">
                    {local.type}
                  </p>
                </div>
              </div>
              <p className="mt-8 text-4xl font-bold tabular-nums tracking-tight text-foreground">
                {formatMoney(local.balance)}
              </p>
              {local.type === "credit" ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Available to spend (not counted in your money total)
                </p>
              ) : null}
              <div
                className="mt-3 h-1 w-12 rounded-full"
                style={{ backgroundColor: displayColor(local) }}
                aria-hidden
              />
            </header>

            {local.type === "credit" ? (
              <div className="mt-6 rounded-lg border border-border bg-muted/15 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Credit
                </p>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Credit limit</dt>
                    <dd className="font-medium tabular-nums text-foreground">
                      {local.credit_limit != null
                        ? formatMoney(local.credit_limit)
                        : "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">APR</dt>
                    <dd className="font-medium tabular-nums text-foreground">
                      {local.interest_rate != null
                        ? `${local.interest_rate}%`
                        : "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Minimum payment</dt>
                    <dd className="font-medium tabular-nums text-foreground">
                      {local.minimum_payment != null
                        ? formatMoney(local.minimum_payment)
                        : "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Billing cycle</dt>
                    <dd className="text-foreground">
                      {local.billing_cycle ?? "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Payment due</dt>
                    <dd className="text-foreground">
                      {local.due_date
                        ? formatDate(local.due_date)
                        : "—"}
                    </dd>
                  </div>
                </dl>
              </div>
            ) : null}

            <dl className="mt-8 space-y-5 text-sm">
              <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
                <dt className="text-muted-foreground">Color</dt>
                <dd className="flex items-center gap-2 font-medium text-foreground">
                  <span
                    className="size-6 rounded-md border border-border"
                    style={{ backgroundColor: displayColor(local) }}
                    title={displayColor(local)}
                  />
                  <span className="font-mono text-xs uppercase">
                    {displayColor(local)}
                  </span>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
                <dt className="text-muted-foreground">Account ID</dt>
                <dd className="max-w-[60%] truncate font-mono text-xs text-foreground">
                  {local.id}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
                <dt className="text-muted-foreground">Created</dt>
                <dd className="font-medium text-foreground">
                  {formatDate(local.created_at)}
                </dd>
              </div>
            </dl>
          </>
        ) : (
          <form
            onSubmit={handleSave}
            className="space-y-6 rounded-xl border border-border bg-card p-6"
          >
            <div className="flex items-center justify-between gap-3 border-b border-border pb-4">
              <div className="flex items-center gap-2">
                <span className="flex size-9 items-center justify-center rounded-lg border border-border bg-muted/40 text-foreground">
                  <EditTypeIcon className="size-5" aria-hidden />
                </span>
                <h2 className="text-lg font-semibold text-foreground">
                  Edit account
                </h2>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={closeEdit}
                disabled={saving}
              >
                Cancel
              </Button>
            </div>

            {saveError ? (
              <p className="text-sm text-destructive">{saveError}</p>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-type">Type</Label>
              <select
                id="edit-type"
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
              <Label htmlFor="edit-balance">
                {type === "credit" ? "Available to spend" : "Balance"}
              </Label>
              <Input
                id="edit-balance"
                type="number"
                inputMode="decimal"
                step="0.01"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
              />
            </div>

            {type === "credit" ? (
              <div className="space-y-4 rounded-lg border border-border bg-muted/20 p-4">
                <p className="text-sm font-medium text-foreground">Credit card</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="edit-credit-limit">Credit limit</Label>
                    <Input
                      id="edit-credit-limit"
                      inputMode="decimal"
                      value={creditLimit}
                      onChange={(e) => setCreditLimit(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-apr">APR (%)</Label>
                    <Input
                      id="edit-apr"
                      inputMode="decimal"
                      value={creditApr}
                      onChange={(e) => setCreditApr(e.target.value)}
                      placeholder="e.g. 19.99"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-min-pay">Minimum payment</Label>
                    <Input
                      id="edit-min-pay"
                      inputMode="decimal"
                      value={creditMinPay}
                      onChange={(e) => setCreditMinPay(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="edit-billing">Billing cycle</Label>
                    <Input
                      id="edit-billing"
                      value={billingCycle}
                      onChange={(e) => setBillingCycle(e.target.value)}
                      placeholder="e.g. Monthly"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="edit-due">Payment due date</Label>
                    <Input
                      id="edit-due"
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
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-9 w-14 cursor-pointer p-1"
                />
                <Input
                  aria-label="Color hex"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
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

            <div className="flex justify-end gap-2 pt-2">
              <Button type="submit" disabled={saving || !name.trim()}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
