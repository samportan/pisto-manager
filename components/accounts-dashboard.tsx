"use client";

import Link from "next/link";
import { CreateAccountSheet } from "@/components/create-account-sheet";
import { useAccounts } from "@/hooks/useAccounts";
import { getAccountTypeIcon } from "@/lib/account-type-icons";
import {
  summarizeAccountsNetWorth,
  type Account,
} from "@/lib/db/accounts";
import { mockAccounts } from "@/lib/mock-data";
import { isSupabaseConfigured } from "@/lib/supabase-config";

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export function AccountsDashboard() {
  const {
    accounts,
    isLoading,
    isSessionReady,
    error,
    createAccount,
    isCreating,
    createError,
  } = useAccounts();

  const useLive = isSupabaseConfigured() && isSessionReady;
  const list = useLive ? accounts : null;

  const demoSummary = summarizeAccountsNetWorth(
    mockAccounts.map((a) => ({
      type: a.type as Account["type"],
      balance: a.balance,
      is_active: true,
    }))
  );

  const summary =
    list !== null
      ? summarizeAccountsNetWorth(list)
      : demoSummary;

  return (
    <>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Accounts</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            View and manage all your linked accounts.
          </p>
        </div>
        <CreateAccountSheet
          disabled={!isSupabaseConfigured()}
          onCreate={
            isSupabaseConfigured()
              ? async (values) => {
                  await createAccount(values);
                }
              : undefined
          }
          isSubmitting={isCreating}
        />
      </header>

      <section className="mb-8 rounded-xl border border-border bg-card p-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Your money
            </p>
            <p className="mt-2 text-4xl font-bold tabular-nums text-primary">
              {useLive && isLoading ? "…" : formatMoney(summary.netWorth)}
            </p>
            <p className="mt-2 max-w-md text-xs leading-relaxed text-muted-foreground">
              Cash, bank, and investment balances only. Credit card balances in
              Pisto are treated as how much you can still spend against the
              limit, so they are not added to or subtracted from this total.
            </p>
          </div>
          <div className="w-full max-w-sm space-y-3 rounded-lg border border-border/80 bg-muted/20 px-4 py-3 text-sm sm:shrink-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Breakdown
            </p>
            <dl className="space-y-2.5">
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-muted-foreground">Cash &amp; bank</dt>
                <dd className="font-semibold tabular-nums text-foreground">
                  {useLive && isLoading ? "…" : formatMoney(summary.cashAndBank)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-muted-foreground">Investments</dt>
                <dd className="font-semibold tabular-nums text-foreground">
                  {useLive && isLoading ? "…" : formatMoney(summary.investments)}
                </dd>
              </div>
              <div className="border-t border-border pt-2.5">
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-muted-foreground">
                    Available on credit cards
                  </dt>
                  <dd className="font-semibold tabular-nums text-secondary">
                    {useLive && isLoading
                      ? "…"
                      : formatMoney(summary.creditAvailable)}
                  </dd>
                </div>
                <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
                  Sum of balances on credit-type accounts (spending power, not
                  net worth).
                </p>
              </div>
            </dl>
          </div>
        </div>
        <div className="mt-6 h-1 w-16 rounded-full bg-accent" />
      </section>

      {useLive && error ? (
        <p className="mb-4 text-sm text-destructive">{error.message}</p>
      ) : null}

      <ul className="space-y-3">
        {useLive && isLoading ? (
          <li className="rounded-xl border border-border bg-card px-5 py-8 text-center text-sm text-muted-foreground">
            Loading accounts…
          </li>
        ) : list && list.length > 0 ? (
          list.map((acc) => {
            const AccountIcon = getAccountTypeIcon(acc.type);
            return (
            <li key={acc.id}>
              <Link
                href={`/dashboard/accounts/${acc.id}`}
                className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card px-5 py-4 transition-colors hover:border-secondary/50"
              >
                <span
                  className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-border bg-card"
                  style={{
                    borderColor: `${acc.color ?? "#64748b"}55`,
                  }}
                >
                  <AccountIcon className="size-5 text-foreground" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground">{acc.name}</p>
                  <p className="text-sm capitalize text-muted-foreground">
                    {acc.type}
                    {!acc.is_active ? " · inactive" : ""}
                  </p>
                </div>
                <p className="text-lg font-bold tabular-nums text-foreground">
                  {formatMoney(acc.balance)}
                </p>
              </Link>
            </li>
            );
          })
        ) : list && list.length === 0 ? (
          <li className="rounded-xl border border-dashed border-border bg-card/50 px-5 py-12 text-center text-sm text-muted-foreground">
            No accounts yet. Use{" "}
            <span className="font-medium text-foreground">Add account</span>{" "}
            to create one.
          </li>
        ) : (
          mockAccounts.map((acc) => {
            const AccountIcon = getAccountTypeIcon(acc.type);
            return (
            <li
              key={acc.id}
              className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card px-5 py-4"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-secondary/15 text-secondary">
                <AccountIcon className="size-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-foreground">{acc.name}</p>
                <p className="text-sm text-muted-foreground">
                  {acc.institution} ·{" "}
                  <span className="capitalize">{acc.type}</span>
                </p>
              </div>
              <p className="text-lg font-bold tabular-nums text-foreground">
                {formatMoney(acc.balance)}
              </p>
            </li>
            );
          })
        )}
      </ul>

      {!useLive && (
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Demo data shown. Configure Supabase and sign in to load your accounts.
        </p>
      )}

      {createError ? (
        <p className="mt-4 text-center text-sm text-destructive">
          {createError.message}
        </p>
      ) : null}
    </>
  );
}
