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
    <div className="relative flex-1">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-1/4 bottom-0 h-[22rem] w-[22rem] rounded-full bg-violet-400/10 blur-3xl dark:bg-violet-500/6" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Accounts
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Demo accounts — replace with Supabase-backed balances later.
          </p>
        </header>

        <section className="mb-8 rounded-2xl border border-border bg-card/80 p-6 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Net worth
          </p>
          <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight sm:text-4xl">
            {formatMoney(mockNetWorth)}
          </p>
        </section>

        <ul className="space-y-3">
          {mockAccounts.map((acc) => (
            <li
              key={acc.id}
              className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-card/80 px-4 py-4 shadow-sm"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                <Landmark className="size-5 text-muted-foreground" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{acc.name}</p>
                <p className="text-sm text-muted-foreground">
                  {acc.institution} · {acc.type}
                </p>
              </div>
              <p className="text-lg font-semibold tabular-nums">
                {formatMoney(acc.balance)}
              </p>
            </li>
          ))}
        </ul>

        <div className="mt-8 flex justify-end">
          <Button type="button" disabled>
            Add account
          </Button>
        </div>
      </div>
    </div>
  );
}
