import type { Metadata } from "next";
import { Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mockAccounts, mockNetWorth } from "@/lib/mock-data";

export const metadata: Metadata = {
  title: "Accounts",
  description: "Balances by account",
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export default function AccountsPage() {
  return (
    <div className="flex-1">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            Accounts
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            View and manage all your linked accounts.
          </p>
        </header>

        <section className="mb-8 rounded-xl border border-border bg-card p-6">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Total net worth
          </p>
          <p className="mt-2 text-4xl font-bold tabular-nums text-primary">
            {formatMoney(mockNetWorth)}
          </p>
          <div className="mt-4 h-1 w-16 rounded-full bg-accent"></div>
        </section>

        <div className="space-y-3">
          {mockAccounts.map((acc) => (
            <li
              key={acc.id}
              className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card px-5 py-4 hover:border-secondary/50 transition-colors group"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-secondary/15 text-secondary group-hover:bg-secondary/25 transition-colors">
                <Landmark className="size-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-foreground">{acc.name}</p>
                <p className="text-sm text-muted-foreground">
                  {acc.institution} · {acc.type}
                </p>
              </div>
              <p className="text-lg font-bold tabular-nums text-foreground">
                {formatMoney(acc.balance)}
              </p>
            </li>
          ))}
        </div>

        <div className="mt-8 flex justify-end">
          <Button type="button" disabled className="bg-muted text-foreground">
            Add account
          </Button>
        </div>
      </div>
    </div>
  );
}
