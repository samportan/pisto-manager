import Link from "next/link";
import { ArrowLeft, Landmark } from "lucide-react";
import type { Account } from "@/lib/db/accounts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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

export function AccountDetail({ account }: { account: Account }) {
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

        <header className="border-b border-border pb-8">
          <div className="flex items-start gap-4">
            <span
              className="flex size-14 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-foreground"
              style={{ borderColor: `${account.color}40` }}
            >
              <Landmark className="size-7" aria-hidden />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  {account.name}
                </h1>
                <Badge variant={account.is_active ? "secondary" : "outline"}>
                  {account.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
              <p className="mt-1 text-sm capitalize text-muted-foreground">
                {account.type}
              </p>
            </div>
          </div>
          <p className="mt-8 text-4xl font-bold tabular-nums tracking-tight text-foreground">
            {formatMoney(account.balance)}
          </p>
          <div
            className="mt-3 h-1 w-12 rounded-full"
            style={{ backgroundColor: account.color }}
            aria-hidden
          />
        </header>

        <dl className="mt-8 space-y-5 text-sm">
          <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
            <dt className="text-muted-foreground">Color</dt>
            <dd className="flex items-center gap-2 font-medium text-foreground">
              <span
                className="size-6 rounded-md border border-border"
                style={{ backgroundColor: account.color }}
                title={account.color}
              />
              <span className="font-mono text-xs uppercase">{account.color}</span>
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
            <dt className="text-muted-foreground">Account ID</dt>
            <dd className="max-w-[60%] truncate font-mono text-xs text-foreground">
              {account.id}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
            <dt className="text-muted-foreground">Created</dt>
            <dd className="font-medium text-foreground">
              {formatDate(account.created_at)}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
