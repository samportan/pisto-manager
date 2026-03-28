"use client";

import Link from "next/link";
import { Landmark } from "lucide-react";
import { CreateAccountSheet } from "@/components/create-account-sheet";
import { useAccounts } from "@/hooks/useAccounts";
import { mockAccounts, mockNetWorth } from "@/lib/mock-data";
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
  const netWorth =
    list !== null
      ? list.filter((a) => a.is_active).reduce((s, a) => s + a.balance, 0)
      : mockNetWorth;

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
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Total net worth
        </p>
        <p className="mt-2 text-4xl font-bold tabular-nums text-primary">
          {useLive && isLoading ? "…" : formatMoney(netWorth)}
        </p>
        <div className="mt-4 h-1 w-16 rounded-full bg-accent" />
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
          list.map((acc) => (
            <li key={acc.id}>
              <Link
                href={`/dashboard/accounts/${acc.id}`}
                className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card px-5 py-4 transition-colors hover:border-secondary/50"
              >
                <span
                  className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-border bg-card"
                  style={{ borderColor: `${acc.color}55` }}
                >
                  <Landmark className="size-5 text-foreground" aria-hidden />
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
          ))
        ) : list && list.length === 0 ? (
          <li className="rounded-xl border border-dashed border-border bg-card/50 px-5 py-12 text-center text-sm text-muted-foreground">
            No accounts yet. Use{" "}
            <span className="font-medium text-foreground">Add account</span>{" "}
            to create one.
          </li>
        ) : (
          mockAccounts.map((acc) => (
            <li
              key={acc.id}
              className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card px-5 py-4"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-secondary/15 text-secondary">
                <Landmark className="size-5" aria-hidden />
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
          ))
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
